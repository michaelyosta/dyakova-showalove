/** Локальное хранилище проектов и снэпов на IndexedDB с миграцией из localStorage и persist-квотой. */

import { isSafeThumbDataUrl, sanitizeSnapshot, sanitizeStrokes } from './dom-utils.js';

const DB_NAME = 'teacher-board-db';
const DB_VERSION = 1;
const LEGACY_LS_KEY = 'teacher-board-session-v1';

export const DEFAULT_EXPORT_PREFS = {
  theme: 'dark',
  includeGrid: true,
  includeDiagram: true,
  includeCalc: true,
  includeNotes: true,
};

const makeId = (prefix) => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID().slice(0, 12)}`;
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
};

const TAB_ID = makeId('tab');

export const makeProjectId = () => makeId('proj');
export const makeSnapId = () => makeId('snap');

export function dataUrlToBlob(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) return null;
  const comma = dataUrl.indexOf(',');
  if (comma === -1) return null;
  const meta = dataUrl.slice(5, comma);
  const b64 = dataUrl.slice(comma + 1);
  const mime = meta.split(';')[0] || 'image/png';
  try {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  } catch {
    return null;
  }
}

export function blobToDataUrl(blob) {
  if (!blob) return Promise.resolve('');
  return new Promise((resolve) => {
    const r = new FileReader();
    r.onload = () => resolve(typeof r.result === 'string' ? r.result : '');
    r.onerror = () => resolve('');
    r.readAsDataURL(blob);
  });
}

export function attachThumbUrl(snap) {
  if (!snap) return snap;
  if (!snap.thumbnail && snap.thumbBlob instanceof Blob) {
    snap.thumbnailUrl = URL.createObjectURL(snap.thumbBlob);
  }
  return snap;
}

export function revokeThumbUrl(snap) {
  if (snap?.thumbnailUrl && snap.thumbnailUrl.startsWith('blob:')) {
    try {
      URL.revokeObjectURL(snap.thumbnailUrl);
    } catch {}
    snap.thumbnailUrl = '';
  }
}

function reqPromise(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('IndexedDB request failed'));
  });
}

function txDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('IndexedDB transaction failed'));
    tx.onabort = () => reject(tx.error || new Error('IndexedDB transaction aborted'));
  });
}

function openDb(onVersionChange) {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB недоступен'));
  }
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('projects')) {
        db.createObjectStore('projects', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('snaps')) {
        const snapStore = db.createObjectStore('snaps', { keyPath: 'id' });
        snapStore.createIndex('by_project', 'projectId', { unique: false });
      }
      if (!db.objectStoreNames.contains('app_meta')) {
        db.createObjectStore('app_meta', { keyPath: 'key' });
      }
    };
    req.onsuccess = () => {
      const conn = req.result;
      conn.onversionchange = () => {
        try {
          conn.close();
        } catch {}
        onVersionChange?.();
      };
      resolve(conn);
    };
    req.onerror = () => reject(req.error || new Error('Не удалось открыть IndexedDB'));
  });
}

function serializeSnapRecord(projectId, s) {
  const thumbBlob = s.thumbBlob instanceof Blob ? s.thumbBlob : dataUrlToBlob(s.thumbnail);
  return {
    id: s.id,
    projectId,
    name: s.name || s.id,
    createdAt: typeof s.createdAt === 'number' ? s.createdAt : Date.now(),
    snapshot: s.snapshot,
    strokes: Array.isArray(s.strokes) ? s.strokes : [],
    notes: typeof s.notes === 'string' ? s.notes : '',
    thumbBlob: thumbBlob || null,
  };
}

function hydrateSnapRecord(rec) {
  const s = {
    id: rec.id,
    name: rec.name || rec.id,
    createdAt: rec.createdAt || Date.now(),
    snapshot: rec.snapshot,
    strokes: Array.isArray(rec.strokes) ? rec.strokes : [],
    history: [],
    redoHistory: [],
    notes: typeof rec.notes === 'string' ? rec.notes : '',
    thumbBlob: rec.thumbBlob instanceof Blob ? rec.thumbBlob : null,
    thumbnail: '',
    thumbnailUrl: '',
  };
  return attachThumbUrl(s);
}

function defaultProjectRecord({ id, title, modelId, activeState }) {
  const now = Date.now();
  return {
    id: id || makeProjectId(),
    title: title || 'Мой урок',
    createdAt: now,
    updatedAt: now,
    activeState: activeState || {
      modelId,
      params: null,
      step: 0,
      visible: null,
      activeSim: null,
    },
    snapIds: [],
    nextSnapId: 1,
    coverBlob: null,
  };
}

function createMemoryFallback({ defaultModelId }) {
  const memProjects = new Map();
  const memSnaps = new Map();
  let activeId = null;
  let exportPrefs = { ...DEFAULT_EXPORT_PREFS };

  const hydrateListFor = (proj) =>
    (proj?.snapIds || [])
      .map((sid) => memSnaps.get(sid))
      .filter(Boolean)
      .map((rec) => hydrateSnapRecord(structuredClone(rec)));

  const init = async () => {
    const p = defaultProjectRecord({ title: 'Текущий урок', modelId: defaultModelId });
    memProjects.set(p.id, p);
    activeId = p.id;
    return {
      projects: [p],
      activeProject: p,
      activeSnaps: [],
      exportPrefs,
    };
  };

  return {
    init,
    listProjects: async () => [...memProjects.values()].sort((a, b) => b.updatedAt - a.updatedAt),
    loadProject: async (id) => {
      const p = memProjects.get(id);
      if (!p) return null;
      return { project: p, snaps: hydrateListFor(p) };
    },
    saveProjectBundle: async (project, snaps) => {
      const cleanProject = {
        ...project,
        revision: (project.revision || 0) + 1,
        lastWriter: TAB_ID,
        updatedAt: Date.now(),
        snapIds: snaps.map((s) => s.id),
        coverBlob: snaps.length ? snaps[snaps.length - 1].thumbBlob || null : null,
      };
      const keep = new Set(cleanProject.snapIds);
      for (const [sid, rec] of memSnaps.entries()) {
        if (rec.projectId === cleanProject.id && !keep.has(sid)) memSnaps.delete(sid);
      }
      memProjects.set(cleanProject.id, cleanProject);
      for (const s of snaps) memSnaps.set(s.id, serializeSnapRecord(cleanProject.id, s));
      return cleanProject;
    },
    createProject: async ({ title, modelId, activeState, initialSnaps = [], nextSnapId }) => {
      const p = defaultProjectRecord({ title, modelId, activeState });
      const snaps = initialSnaps.map((s) => {
        const rec = serializeSnapRecord(p.id, { ...s, id: makeSnapId() });
        memSnaps.set(rec.id, rec);
        return hydrateSnapRecord(rec);
      });
      p.snapIds = snaps.map((s) => s.id);
      p.nextSnapId = typeof nextSnapId === 'number' ? nextSnapId : snaps.length + 1;
      p.revision = 1;
      p.lastWriter = TAB_ID;
      memProjects.set(p.id, p);
      activeId = p.id;
      return { project: p, snaps };
    },
    duplicateProject: async (sourceId, newTitle) => {
      const src = memProjects.get(sourceId);
      if (!src) return null;
      const now = Date.now();
      const p = {
        ...structuredClone(src),
        id: makeProjectId(),
        title: (newTitle && String(newTitle).trim()) || `${src.title} (копия)`,
        createdAt: now,
        updatedAt: now,
        revision: 1,
        lastWriter: TAB_ID,
      };
      const cloned = [];
      p.snapIds = (src.snapIds || []).map((sid) => {
        const orig = memSnaps.get(sid);
        if (!orig) return null;
        const nid = makeSnapId();
        const rec = { ...structuredClone(orig), id: nid, projectId: p.id, thumbBlob: orig.thumbBlob };
        memSnaps.set(nid, rec);
        cloned.push(hydrateSnapRecord(rec));
        return nid;
      }).filter(Boolean);
      memProjects.set(p.id, p);
      activeId = p.id;
      return { project: p, snaps: cloned };
    },
    renameProject: async (id, title) => {
      const p = memProjects.get(id);
      if (p) {
        p.title = String(title || '').trim() || p.title;
        p.updatedAt = Date.now();
      }
      return p;
    },
    deleteProject: async (id) => {
      memProjects.delete(id);
      for (const [sid, rec] of memSnaps.entries()) {
        if (rec.projectId === id) memSnaps.delete(sid);
      }
      if (!memProjects.size) {
        const p = defaultProjectRecord({ title: 'Новый урок', modelId: defaultModelId });
        memProjects.set(p.id, p);
        activeId = p.id;
        return { project: p, snaps: [] };
      }
      const next = [...memProjects.values()].sort((a, b) => b.updatedAt - a.updatedAt)[0];
      activeId = next.id;
      return { project: next, snaps: hydrateListFor(next) };
    },
    setActiveProjectId: async (id) => {
      activeId = id;
    },
    getExportPrefs: async () => exportPrefs,
    saveExportPrefs: async (prefs) => {
      exportPrefs = { ...DEFAULT_EXPORT_PREFS, ...prefs };
    },
  };
}

export function createProjectStorage({ catalogById, defaultModelId, onRemoteChange }) {
  let db = null;
  let fallback = null;
  const bc = typeof BroadcastChannel === 'function' ? new BroadcastChannel('teacher-board-sync') : null;
  if (bc) {
    bc.onmessage = (ev) => {
      if (ev.data && ev.data.tabId !== TAB_ID) {
        onRemoteChange?.(ev.data);
      }
    };
  }

  function notifyPeers(kind, projectId = null, revision = null) {
    try {
      bc?.postMessage({ kind, projectId, revision, tabId: TAB_ID, ts: Date.now() });
    } catch {}
  }

  async function ensureDb() {
    if (db) return db;
    if (fallback) return null;
    try {
      db = await openDb(() => {
        db = null;
      });
      return db;
    } catch {
      fallback = createMemoryFallback({ defaultModelId });
      return null;
    }
  }

  async function getMeta(key) {
    const conn = await ensureDb();
    if (!conn) return null;
    const tx = conn.transaction('app_meta', 'readonly');
    const res = await reqPromise(tx.objectStore('app_meta').get(key));
    return res ? res.value : null;
  }

  async function setMeta(key, value) {
    const conn = await ensureDb();
    if (!conn) return;
    const tx = conn.transaction('app_meta', 'readwrite');
    tx.objectStore('app_meta').put({ key, value });
    await txDone(tx);
  }

  async function listProjects() {
    const conn = await ensureDb();
    if (!conn) return fallback.listProjects();
    const tx = conn.transaction('projects', 'readonly');
    const all = await reqPromise(tx.objectStore('projects').getAll());
    return all.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  }

  async function loadProject(projectId) {
    const conn = await ensureDb();
    if (!conn) return fallback.loadProject(projectId);
    const tx = conn.transaction(['projects', 'snaps'], 'readonly');
    const project = await reqPromise(tx.objectStore('projects').get(projectId));
    if (!project) return null;
    const rawSnaps = await reqPromise(tx.objectStore('snaps').index('by_project').getAll(projectId));
    const byId = new Map(rawSnaps.map((r) => [r.id, r]));
    const ordered = [];
    for (const sid of project.snapIds || []) {
      const rec = byId.get(sid);
      if (rec && rec.snapshot && catalogById.has(rec.snapshot.modelId)) {
        ordered.push(hydrateSnapRecord(rec));
        byId.delete(sid);
      }
    }
    for (const rec of byId.values()) {
      if (rec && rec.snapshot && catalogById.has(rec.snapshot.modelId)) {
        ordered.push(hydrateSnapRecord(rec));
      }
    }
    return { project, snaps: ordered };
  }

  async function saveProjectBundle(project, snaps) {
    const conn = await ensureDb();
    if (!conn) return fallback.saveProjectBundle(project, snaps);

    const lastWithThumb = [...snaps].reverse().find((s) => s.thumbBlob instanceof Blob || s.thumbnail);
    const coverBlob = lastWithThumb
      ? lastWithThumb.thumbBlob instanceof Blob
        ? lastWithThumb.thumbBlob
        : dataUrlToBlob(lastWithThumb.thumbnail)
      : null;

    const tx = conn.transaction(['projects', 'snaps'], 'readwrite');
    const projStore = tx.objectStore('projects');
    const existingProj = await reqPromise(projStore.get(project.id));
    if (
      existingProj &&
      existingProj.lastWriter &&
      existingProj.lastWriter !== TAB_ID &&
      (existingProj.revision || 0) > (project.revision || 0)
    ) {
      tx.abort();
      const err = new Error('Проект был изменён в другой вкладке');
      err.code = 'CONCURRENT_TAB_WRITE';
      throw err;
    }

    const cleanProject = {
      ...project,
      revision: Math.max(project.revision || 0, existingProj?.revision || 0) + 1,
      lastWriter: TAB_ID,
      updatedAt: Date.now(),
      snapIds: snaps.map((s) => s.id),
      coverBlob: coverBlob || null,
    };

    const snapStore = tx.objectStore('snaps');
    const existingKeys = await reqPromise(snapStore.index('by_project').getAllKeys(cleanProject.id));
    const keepSet = new Set(cleanProject.snapIds);
    for (const k of existingKeys) {
      if (!keepSet.has(k)) snapStore.delete(k);
    }
    for (const s of snaps) {
      const rec = serializeSnapRecord(cleanProject.id, s);
      s.thumbBlob = rec.thumbBlob;
      snapStore.put(rec);
    }
    projStore.put(cleanProject);
    await txDone(tx);
    notifyPeers('project-saved', cleanProject.id, cleanProject.revision);
    return cleanProject;
  }

  async function createProject({ title, modelId, activeState, initialSnaps = [], nextSnapId }) {
    const conn = await ensureDb();
    if (!conn) return fallback.createProject({ title, modelId, activeState, initialSnaps, nextSnapId });

    const snaps = initialSnaps.map((s) => ({
      ...s,
      id: makeSnapId(),
      history: [],
      redoHistory: [],
      thumbBlob: s.thumbBlob instanceof Blob ? s.thumbBlob : dataUrlToBlob(s.thumbnail),
    }));
    snaps.forEach(attachThumbUrl);

    const project = defaultProjectRecord({
      title,
      modelId: modelId || defaultModelId,
      activeState,
    });
    project.snapIds = snaps.map((s) => s.id);
    project.nextSnapId = typeof nextSnapId === 'number' ? nextSnapId : snaps.length + 1;

    await saveProjectBundle(project, snaps);
    await setMeta('activeProjectId', project.id);
    return { project, snaps };
  }

  async function duplicateProject(sourceId, newTitle) {
    const conn = await ensureDb();
    if (!conn) return fallback.duplicateProject(sourceId, newTitle);

    const srcData = await loadProject(sourceId);
    if (!srcData) return null;
    const { project: src, snaps: srcSnaps } = srcData;
    const now = Date.now();
    const copyProject = {
      id: makeProjectId(),
      title: newTitle || `${src.title} (копия)`,
      createdAt: now,
      updatedAt: now,
      activeState: src.activeState ? structuredClone(src.activeState) : null,
      snapIds: [],
      nextSnapId: src.nextSnapId || srcSnaps.length + 1,
      coverBlob: src.coverBlob || null,
    };

    const copiedSnaps = srcSnaps.map((s) => {
      const cloned = {
        id: makeSnapId(),
        name: s.name,
        createdAt: now,
        snapshot: structuredClone(s.snapshot),
        strokes: structuredClone(s.strokes || []),
        history: [],
        redoHistory: [],
        notes: s.notes || '',
        thumbBlob: s.thumbBlob instanceof Blob ? s.thumbBlob : dataUrlToBlob(s.thumbnail),
        thumbnail: s.thumbnail || '',
        thumbnailUrl: '',
      };
      return attachThumbUrl(cloned);
    });
    copyProject.snapIds = copiedSnaps.map((s) => s.id);

    await saveProjectBundle(copyProject, copiedSnaps);
    await setMeta('activeProjectId', copyProject.id);
    return { project: copyProject, snaps: copiedSnaps };
  }

  async function renameProject(projectId, title) {
    const conn = await ensureDb();
    if (!conn) return fallback.renameProject(projectId, title);
    const tx = conn.transaction('projects', 'readwrite');
    const store = tx.objectStore('projects');
    const p = await reqPromise(store.get(projectId));
    if (!p) return null;
    p.title = title.trim() || p.title;
    p.updatedAt = Date.now();
    p.revision = (p.revision || 0) + 1;
    p.lastWriter = TAB_ID;
    store.put(p);
    await txDone(tx);
    notifyPeers('project-renamed', p.id, p.revision);
    return p;
  }

  async function deleteProject(projectId) {
    const conn = await ensureDb();
    if (!conn) return fallback.deleteProject(projectId);
    const tx = conn.transaction(['projects', 'snaps'], 'readwrite');
    const snapKeys = await reqPromise(tx.objectStore('snaps').index('by_project').getAllKeys(projectId));
    for (const k of snapKeys) tx.objectStore('snaps').delete(k);
    tx.objectStore('projects').delete(projectId);
    await txDone(tx);
    notifyPeers('project-deleted', projectId);

    let remaining = await listProjects();
    if (!remaining.length) {
      const created = await createProject({
        title: 'Новый урок',
        modelId: defaultModelId,
      });
      return created;
    }
    const next = await loadProject(remaining[0].id);
    await setMeta('activeProjectId', next.project.id);
    return next;
  }

  async function migrateFromLegacyLocalStorage() {
    const migrated = await getMeta('migratedLocalStorageV1');
    if (migrated) return null;
    let legacy = null;
    try {
      const raw = localStorage.getItem(LEGACY_LS_KEY);
      if (raw) legacy = JSON.parse(raw);
    } catch {
      legacy = null;
    }
    await setMeta('migratedLocalStorageV1', true);
    if (!legacy || legacy.version !== 1) return null;

    const validSnaps = Array.isArray(legacy.snaps)
      ? legacy.snaps
          .map((s) => {
            const snapshot = sanitizeSnapshot(s?.snapshot, catalogById);
            if (!snapshot) return null;
            const thumbStr = isSafeThumbDataUrl(s.thumbnail) ? s.thumbnail.trim() : '';
            return {
              id: makeSnapId(),
              name: String(s.name || 'Снэп').slice(0, 80),
              snapshot,
              strokes: sanitizeStrokes(s.strokes),
              notes: typeof s.notes === 'string' ? s.notes : '',
              thumbBlob: dataUrlToBlob(thumbStr),
              thumbnail: thumbStr,
            };
          })
          .filter(Boolean)
      : [];

    const activeState = {
      modelId: legacy.modelId && catalogById.has(legacy.modelId) ? legacy.modelId : defaultModelId,
      params: legacy.params || null,
      step: typeof legacy.step === 'number' ? legacy.step : 0,
      visible: Array.isArray(legacy.visible) ? legacy.visible : null,
      activeSim: legacy.activeSim || null,
    };

    const res = await createProject({
      title: 'Текущий урок',
      modelId: activeState.modelId,
      activeState,
      initialSnaps: validSnaps,
      nextSnapId: typeof legacy.nextSnapId === 'number' ? legacy.nextSnapId : validSnaps.length + 1,
    });
    return res;
  }

  async function init() {
    try {
      navigator.storage?.persist?.().catch(() => {});
    } catch {}

    const conn = await ensureDb();
    if (!conn) return fallback.init();

    let projects = await listProjects();
    if (!projects.length) {
      const migrated = await migrateFromLegacyLocalStorage();
      if (migrated) {
        projects = await listProjects();
        const exportPrefs = await getExportPrefs();
        return {
          projects,
          activeProject: migrated.project,
          activeSnaps: migrated.snaps,
          exportPrefs,
        };
      }
      const initial = await createProject({
        title: 'Мой первый урок',
        modelId: defaultModelId,
      });
      projects = await listProjects();
      const exportPrefs = await getExportPrefs();
      return {
        projects,
        activeProject: initial.project,
        activeSnaps: initial.snaps,
        exportPrefs,
      };
    }

    await migrateFromLegacyLocalStorage().catch(() => null);
    projects = await listProjects();
    const activeId = await getMeta('activeProjectId');
    const targetId = projects.some((p) => p.id === activeId) ? activeId : projects[0].id;
    const loaded = await loadProject(targetId);
    const exportPrefs = await getExportPrefs();
    return {
      projects,
      activeProject: loaded.project,
      activeSnaps: loaded.snaps,
      exportPrefs,
    };
  }

  async function getExportPrefs() {
    const conn = await ensureDb();
    if (!conn) return fallback.getExportPrefs();
    const saved = await getMeta('exportPrefs');
    return saved && typeof saved === 'object' ? { ...DEFAULT_EXPORT_PREFS, ...saved } : { ...DEFAULT_EXPORT_PREFS };
  }

  async function saveExportPrefs(prefs) {
    const conn = await ensureDb();
    if (!conn) return fallback.saveExportPrefs(prefs);
    await setMeta('exportPrefs', { ...DEFAULT_EXPORT_PREFS, ...prefs });
  }

  return {
    init,
    listProjects,
    loadProject,
    saveProjectBundle,
    createProject,
    duplicateProject,
    renameProject,
    deleteProject,
    setActiveProjectId: async (id) => {
      const conn = await ensureDb();
      if (!conn) return fallback.setActiveProjectId(id);
      await setMeta('activeProjectId', id);
    },
    getExportPrefs,
    saveExportPrefs,
    dispose: () => {
      try {
        bc?.close();
      } catch {}
      db?.close();
      db = null;
    },
    tabId: TAB_ID,
  };
}
