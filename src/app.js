/** Главный контроллер «Доски учителя»: проекты IndexedDB, 3D-построения, симуляции и HD-экспорт PNG/PDF. */

import {
  SUBJECTS,
  CATEGORIES,
  SCENE_INDEX,
  DEFAULT_SCENE_ID,
  CATALOG_BY_ID,
  getLoadedScene,
  loadSceneModule,
} from '../models/registry.js';
import { mergeParamsFor, sanitizeCamera } from './dom-utils.js';
import { createGeomApi } from './geom-helpers.js';
import * as scene3dMod from './scene3d.js';
import { createTeachingTools } from './teaching-tools.js';
import { createBoardView, REF_H } from './board-view.js';
import { createPanelController } from './ui-panel.js';
import { createCatalogUI } from './ui-catalog.js';
import { createSimRunner } from './sim-runner.js';
import {
  createProjectStorage,
  makeSnapId,
  revokeThumbUrl,
  DEFAULT_EXPORT_PREFS,
} from './storage-db.js';
import { createProjectsUI } from './ui-projects.js';
import { createExportUI } from './ui-export.js';
import {
  renderSnapToCanvas,
  canvasToBlob,
  canvasToJpegPage,
  deliverBlob,
} from './snap-exporter.js';
import { buildPdfFromJpegPages } from './pdf-writer.js';
import {
  sameSnapshot,
  updateThumbnail,
  renderSnapsList,
  formatSnapMeta,
  buildLessonPayload,
  parseLessonPayload,
} from './snaps.js';

const root = document.getElementById('teacher-board-concept');
const el = root.querySelector('[data-ref="c"]');
const stage = el.parentElement;
const ink = root.querySelector('[data-ref="ink"]');
const notesEl = root.querySelector('#tb-explanation');
const snapsListEl = root.querySelector('[data-ref="snaps"]');
const modelTitleEl = root.querySelector('[data-ref="model-title"]');
const modelSubtitleEl = root.querySelector('[data-ref="model-subtitle"]');
const projectTitleEl = root.querySelector('[data-ref="active-project-title"]');
const bannerEl = root.querySelector('[data-ref="app-banner"]');
const bannerTextEl = root.querySelector('[data-ref="app-banner-text"]');
const bannerDismissBtn = root.querySelector('[data-action="dismiss-banner"]');

function showBanner(msg, isError = false) {
  if (!bannerEl || !bannerTextEl) return;
  bannerTextEl.textContent = msg;
  bannerEl.dataset.tone = isError ? 'error' : 'info';
  bannerEl.hidden = false;
}

function hideBanner() {
  if (bannerEl) bannerEl.hidden = true;
}

bannerDismissBtn?.addEventListener('click', hideBanner);

const safeSlug = (str, fallback = 'teacher-board') =>
  String(str || '')
    .trim()
    .replace(/[^\p{L}\p{N}\-_ ]+/gu, '')
    .replace(/\s+/g, '-')
    .slice(0, 48) || fallback;

try {
  const geomApi = createGeomApi(window.THREE);
  const scene3d = scene3dMod.createSceneController({ THREE: window.THREE, el, geomApi });
  const simRunner = createSimRunner();
  const storage = createProjectStorage({ catalogById: CATALOG_BY_ID, defaultModelId: DEFAULT_SCENE_ID });

  const teacher = { mode: 'model', tool: 'pen', color: 'blue', notes: false, stylusOnly: false };
  const snaps = [];
  let selectedSnapId = null;
  let nextSnapId = 1;
  let savedPanelCollapsed = null;
  let currentModel = null;
  let params = {};
  let st = 0;
  let visible = [];
  let solved = {};
  let persistTimer = null;
  let persistChain = Promise.resolve();
  let exportQueue = Promise.resolve();
  let loadSeq = 0;
  let snapSeq = 0;
  let editingSnapId = null;
  let renderDirty = true;
  let lastModelCamera = null;
  let exportEnv = null;

  let activeProject = null;
  let allProjects = [];
  let exportPrefs = { ...DEFAULT_EXPORT_PREFS };

  const selectedSnap = () => snaps.find((s) => s.id === selectedSnapId) || null;
  const isSimScene = () => currentModel?.kind === 'simulation';
  const markDirty = () => {
    renderDirty = true;
  };

  scene3d.ctl.addEventListener('change', () => {
    markDirty();
    if (teacher.mode === 'model' && currentModel) {
      lastModelCamera = board.captureSnapshot({
        modelId: currentModel.id,
        params,
        step: st,
        visible,
      }).camera;
    }
  });

  scene3d.setContextHandlers?.({
    onLost: () => {
      showBanner('Графический контекст WebGL приостановлен — ожидание восстановления', true);
    },
    onRestored: () => {
      hideBanner();
      if (currentModel) {
        rebuildCurrent();
        fitAll();
      }
      markDirty();
    },
  });

  function applyPanelCollapsed(collapsed, save = false) {
    if (save && savedPanelCollapsed === null) {
      savedPanelCollapsed = root.getAttribute('data-panel-collapsed') === 'true';
    }
    root.setAttribute('data-panel-collapsed', collapsed ? 'true' : 'false');
    const btn = root.querySelector('[data-action=toggle-panel]');
    if (btn) btn.setAttribute('aria-pressed', collapsed ? 'false' : 'true');
  }

  function applySnapsCollapsed(collapsed) {
    root.setAttribute('data-snaps-collapsed', collapsed ? 'true' : 'false');
    const btn = root.querySelector('[data-action=toggle-snaps]');
    if (btn) btn.setAttribute('aria-pressed', collapsed ? 'false' : 'true');
  }

  function syncProjectTitleUI() {
    if (projectTitleEl && activeProject) {
      projectTitleEl.textContent = activeProject.title;
      projectTitleEl.title = activeProject.title;
    }
    const openProjBtn = root.querySelector('[data-action="open-projects"]');
    if (openProjBtn && activeProject) {
      openProjBtn.title = `Проекты · ${activeProject.title}`;
    }
  }

  function syncActiveProjectRecord() {
    if (!activeProject || !currentModel) return;
    if (teacher.mode === 'model') {
      lastModelCamera = board.captureSnapshot({
        modelId: currentModel.id,
        params,
        step: st,
        visible,
      }).camera;
    }
    activeProject.activeState = {
      modelId: currentModel.id,
      params: { ...params },
      step: st,
      visible: [...visible],
      camera: lastModelCamera || activeProject.activeState?.camera || null,
      activeSim: isSimScene() ? simRunner.captureSimSnapshot() : null,
    };
    activeProject.nextSnapId = nextSnapId;
  }

  function persistNow() {
    clearTimeout(persistTimer);
    if (!activeProject || !currentModel) return persistChain;
    syncActiveProjectRecord();
    const projSnapshot = { ...activeProject, snapIds: snaps.map((s) => s.id) };
    const snapsSnapshot = [...snaps];
    persistChain = persistChain
      .then(async () => {
        const saved = await storage.saveProjectBundle(projSnapshot, snapsSnapshot);
        if (saved && activeProject && activeProject.id === saved.id) {
          activeProject.updatedAt = saved.updatedAt;
          activeProject.coverBlob = saved.coverBlob;
          activeProject.revision = saved.revision;
        }
        hideBanner();
        allProjects = await storage.listProjects();
        projectsUI.updateData(allProjects, activeProject?.id);
      })
      .catch((err) => {
        if (err?.code === 'CONCURRENT_TAB_WRITE') {
          showBanner(
            'Урок был изменён в другой вкладке. Переключите или обновите страницу, чтобы избежать перезаписи.',
            true
          );
        } else {
          showBanner(`Не удалось сохранить проект: ${err?.message || 'ошибка хранилища'}`, true);
        }
      });
    return persistChain;
  }

  function schedulePersist() {
    clearTimeout(persistTimer);
    persistTimer = setTimeout(() => {
      persistNow();
    }, 250);
  }

  function updateSnapCounts() {
    root.querySelectorAll('[data-snap-count]').forEach((node) => {
      const s = snaps.find((x) => x.id === node.dataset.snapCount);
      if (s) {
        const mdl = getLoadedScene(s.snapshot.modelId) || CATALOG_BY_ID.get(s.snapshot.modelId);
        node.textContent = formatSnapMeta(s, mdl);
      }
    });
  }

  const board = createBoardView({
    root,
    el,
    ink,
    camera: scene3d.camera,
    ctl: scene3d.ctl,
    getMode: () => teacher.mode,
    getTool: () => teacher.tool,
    getColor: () => teacher.color,
    getStylusOnly: () => teacher.stylusOnly,
    getSelectedSnap: selectedSnap,
    onStrokeComplete: (s) => {
      updateThumbnail({
        s,
        mode: teacher.mode,
        selectedSnapId,
        board,
        scene3d,
        root,
        REF_H,
      });
      renderSnaps();
      persistNow();
    },
    onUndo: (s) => {
      updateThumbnail({
        s,
        mode: teacher.mode,
        selectedSnapId,
        board,
        scene3d,
        root,
        REF_H,
      });
      renderSnaps();
      persistNow();
    },
    onUpdateCounts: updateSnapCounts,
    onViewChange: markDirty,
  });

  const teachingTools = createTeachingTools({
    root, el, camera: scene3d.camera, ctl: scene3d.ctl,
    getMode: () => teacher.mode,
    getMeta: scene3d.getModelMeta,
    getGroups: () => scene3d.groups,
    onActivate: () => { board.clearGesture(); markDirty(); },
  });

  function fitAll() {
    scene3d.fit({
      mode: teacher.mode,
      snap: selectedSnap(),
      restoreCamera: board.restoreCamera,
      redrawInk: board.redrawInk,
    });
    markDirty();
  }

  function renderSnaps() {
    renderSnapsList({
      listEl: snapsListEl,
      root,
      snaps,
      mode: teacher.mode,
      selectedSnapId,
      editingSnapId,
      modelsById: CATALOG_BY_ID,
      getLoadedScene,
      onSelect: selectSnap,
      onDelete: deleteSnap,
      onStartRename: (id) => {
        editingSnapId = id;
        renderSnaps();
      },
      onCommitRename: (id, nextName) => {
        const s = snaps.find((x) => x.id === id);
        const trimmed = String(nextName || '').trim();
        if (s && trimmed) {
          s.name = trimmed;
          editingSnapId = null;
          renderTeacher();
          persistNow();
        } else {
          editingSnapId = null;
          renderSnaps();
        }
      },
      onCancelRename: () => {
        editingSnapId = null;
        renderSnaps();
      },
    });
  }

  function renderTeacher() {
    root.dataset.mode = teacher.mode;
    ink.style.pointerEvents = teacher.mode === 'ink' ? 'all' : 'none';
    scene3d.ctl.enabled = teacher.mode === 'model';
    root.querySelectorAll('[data-mode]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === teacher.mode)));
    root.querySelectorAll('[data-tool]').forEach((b) => {
      b.setAttribute('aria-pressed', String(b.dataset.tool === teacher.tool));
      b.disabled = teacher.mode !== 'ink';
    });
    root.querySelectorAll('[data-color]').forEach((b) => {
      b.setAttribute('aria-pressed', String(b.dataset.color === teacher.color));
      b.disabled = teacher.mode !== 'ink' || teacher.tool === 'pan';
    });
    const stylusBtn = root.querySelector('[data-action=stylus-only]');
    if (stylusBtn) {
      stylusBtn.setAttribute('aria-pressed', String(teacher.stylusOnly));
      stylusBtn.disabled = teacher.mode !== 'ink';
    }
    const resetCamBtn = root.querySelector('[data-action=reset-camera]');
    if (resetCamBtn) resetCamBtn.disabled = teacher.mode !== 'model' || !currentModel;
    root.querySelector('[data-action=notes]').setAttribute('aria-pressed', String(teacher.notes));
    root.querySelector('.tb-notes').hidden = !teacher.notes;
    const s = selectedSnap();
    const snapTitle = s?.name || 'Снэп';
    notesEl.disabled = teacher.mode !== 'ink' || !s;
    const modeStatusEl = root.querySelector('.tb-mode-status');
    if (modeStatusEl) {
      modeStatusEl.textContent =
        teacher.mode === 'model'
          ? 'Вращение и масштаб'
          : isSimScene()
            ? `${snapTitle} · кадр зафиксирован`
            : `${snapTitle} · ракурс закреплён`;
    }
    const sceneStatusEl = root.querySelector('.tb-scene-status');
    if (sceneStatusEl) {
      sceneStatusEl.textContent =
        teacher.mode === 'model'
          ? isSimScene()
            ? 'Симуляция · можно вращать и запускать'
            : 'Модель · можно вращать'
          : `${snapTitle} · ${teacher.stylusOnly ? 'перо · 2 пальца — масштаб' : 'палец или перо · 2 пальца — масштаб'}`;
    }

    board.redrawInk();
    board.syncZoomUI();
    teachingTools.sync();
    renderSnaps();
    markDirty();
  }

  function saveNotes() {
    const s = selectedSnap();
    if (s && teacher.mode === 'ink') s.notes = notesEl.value;
  }

  function exitInkToModelUiOnly() {
    board.clearGesture();
    board.resetBoardView();
    teacher.mode = 'model';
    root.dataset.mode = 'model';
    scene3d.ctl.enabled = true;
    notesEl.value = '';
    if (savedPanelCollapsed !== null) {
      applyPanelCollapsed(savedPanelCollapsed, false);
      savedPanelCollapsed = null;
    }
  }

  function enterModel() {
    saveNotes();
    exitInkToModelUiOnly();
    renderTeacher();
    fitAll();
    persistNow();
  }

  function beforeStateChange() {
    if (teacher.mode === 'ink') enterModel();
    board.clearGesture();
  }

  function syncDynamicFrame() {
    const info = simRunner.getState();
    solved = info.solved;
    scene3d.updateDynamic(currentModel, params, solved, info.simState, info.simTime);
    panel.syncPlayer(info);
    panel.syncValues(currentModel, params, solved, scene3d.groups);
    markDirty();
  }

  function pauseSimulationIfActive() {
    if (!isSimScene()) return;
    simRunner.pause();
    panel.syncPlayer(simRunner.getState());
  }

  const panel = createPanelController({
    root,
    onParamChange: (key, value) => {
      if (!currentModel) return;
      beforeStateChange();
      params[key] = value;
      rebuildCurrent();
      schedulePersist();
    },
    onPresetSelect: (presetValues) => {
      if (!currentModel) return;
      beforeStateChange();
      params = mergeParamsFor(currentModel, { ...params, ...presetValues });
      rebuildCurrent();
      schedulePersist();
    },
    onLayerToggle: (idx, key, checked) => {
      if (!currentModel) return;
      beforeStateChange();
      visible[idx] = checked;
      if (scene3d.groups[key]) scene3d.groups[key].visible = checked;
      panel.syncDiagram(currentModel, params, solved, scene3d.groups);
      renderTeacher();
      fitAll();
      schedulePersist();
    },
    onStepGo: (deltaOrIndex, relative = false) => {
      if (!currentModel) return;
      beforeStateChange();
      const target = relative ? st + deltaOrIndex : deltaOrIndex;
      goStep(target);
    },
    onPlayerAction: ({ type, value }) => {
      if (!isSimScene()) return;
      if (teacher.mode === 'ink') beforeStateChange();
      else board.clearGesture();

      if (type === 'play') {
        simRunner.togglePlay();
        panel.syncPlayer(simRunner.getState());
        if (!simRunner.getState().playing) schedulePersist();
        return;
      }
      if (type === 'speed') {
        simRunner.cycleSpeed();
        panel.syncPlayer(simRunner.getState());
        return;
      }
      if (type === 'reset') {
        simRunner.reset();
        syncDynamicFrame();
        fitAll();
        schedulePersist();
        return;
      }
      if (type === 'back') {
        simRunner.stepBy(-0.05);
        syncDynamicFrame();
        fitAll();
        schedulePersist();
        return;
      }
      if (type === 'fwd') {
        simRunner.stepBy(0.05);
        syncDynamicFrame();
        fitAll();
        schedulePersist();
        return;
      }
      if (type === 'scrub') {
        simRunner.pause();
        simRunner.seek(Number(value));
        syncDynamicFrame();
        fitAll();
        schedulePersist();
      }
    },
  });

  function rebuildCurrent() {
    if (!currentModel) return;
    teachingTools.reset();
    if (isSimScene()) {
      solved = simRunner.updateParams(params);
      const info = simRunner.getState();
      scene3d.rebuild(currentModel, params, solved, info.simState, info.simTime);
      panel.syncPlayer(info);
    } else {
      solved = currentModel.solve(params);
      scene3d.rebuild(currentModel, params, solved);
    }
    panel.syncValues(currentModel, params, solved, scene3d.groups);
    renderTeacher();
    fitAll();
  }

  function applyVisibilityFromStep(stepIndex) {
    visible = (currentModel.layers || []).map((layer) => {
      const show = stepIndex >= (layer.step ?? 0);
      if (scene3d.groups[layer.key]) scene3d.groups[layer.key].visible = show;
      return show;
    });
  }

  function goStep(k) {
    const steps = currentModel.steps || [];
    const maxStep = Math.max(0, steps.length - 1);
    st = Math.max(0, Math.min(maxStep, k));
    applyVisibilityFromStep(st);
    panel.updateSteps(currentModel, st);
    panel.syncLayers(visible);
    panel.syncDiagram(currentModel, params, solved, scene3d.groups);
    renderTeacher();
    fitAll();
    schedulePersist();
  }

  async function loadModel(modelId, opts = {}) {
    const mySeq = ++loadSeq;
    const model = await loadSceneModule(modelId);
    if (mySeq !== loadSeq) return null;

    const modelChanged = !currentModel || currentModel.id !== model.id || opts.forceSchema;
    teachingTools.reset();
    currentModel = model;

    params = mergeParamsFor(model, opts.params);
    const steps = model.steps || [];
    const maxStep = Math.max(0, steps.length - 1);
    st = Math.max(0, Math.min(maxStep, typeof opts.step === 'number' ? opts.step : 0));

    if (Array.isArray(opts.visible) && opts.visible.length === (model.layers || []).length) {
      visible = opts.visible.map(Boolean);
    } else {
      visible = (model.layers || []).map((layer) => st >= (layer.step ?? 0));
    }

    modelTitleEl.textContent = model.title;
    modelSubtitleEl.textContent = model.subtitle || 'Доска учителя';
    document.title = activeProject ? `${model.title} · ${activeProject.title}` : `${model.title} — Доска учителя`;

    if (modelChanged) {
      scene3d.setLayers(model.layers);
      panel.renderModelSchema(model, params, visible);
      panel.setBottomBarKind(model);
    } else {
      panel.setBottomBarKind(model);
      panel.syncLayers(visible);
    }

    (model.layers || []).forEach((layer, i) => {
      if (scene3d.groups[layer.key]) scene3d.groups[layer.key].visible = visible[i];
    });

    if (opts.resetCam !== false) {
      scene3d.resetCamera(model, true);
    }

    if (model.kind === 'simulation') {
      solved = simRunner.initSimulation(model, params, opts.sim || {});
      const info = simRunner.getState();
      scene3d.rebuild(model, params, solved, info.simState, info.simTime);
      panel.syncPlayer(info);
    } else {
      simRunner.pause();
      solved = model.solve(params);
      scene3d.rebuild(model, params, solved);
      panel.updateSteps(model, st);
    }

    panel.syncValues(model, params, solved, scene3d.groups);
    panel.syncLayers(visible);

    if (opts.render !== false) {
      renderTeacher();
      fitAll();
    }
    markDirty();
    return model;
  }

  function buildFullSnapshot() {
    const base = board.captureSnapshot({
      modelId: currentModel.id,
      params,
      step: st,
      visible,
    });
    const simSnap = isSimScene() ? simRunner.captureSimSnapshot() : null;
    return {
      ...base,
      kind: currentModel.kind || 'geometry',
      paramSummary: currentModel.summarizeParams ? currentModel.summarizeParams(params) : '',
      simTime: simSnap ? simSnap.simTime : null,
      simSeed: simSnap ? simSnap.simSeed : null,
      simState: simSnap ? simSnap.simState : null,
    };
  }

  function createSnap() {
    if (!currentModel) return null;
    teachingTools.reset();
    saveNotes();
    pauseSimulationIfActive();
    scene3d.ctl.autoRotate = false;
    board.settle();
    board.clearGesture();
    board.resetBoardView();

    const snapshot = buildFullSnapshot();
    const number = nextSnapId++;
    const s = {
      id: makeSnapId(),
      name: `Снэп ${number}`,
      createdAt: Date.now(),
      snapshot,
      strokes: [],
      history: [],
      redoHistory: [],
      notes: '',
      thumbBlob: null,
      thumbnail: '',
      thumbnailUrl: '',
    };
    snaps.push(s);
    selectedSnapId = s.id;
    editingSnapId = null;
    notesEl.value = '';
    teacher.mode = 'ink';
    root.dataset.mode = 'ink';
    scene3d.ctl.enabled = false;
    applyPanelCollapsed(true, true);
    fitAll();
    updateThumbnail({
      s,
      mode: teacher.mode,
      selectedSnapId,
      board,
      scene3d,
      root,
      REF_H,
    });
    renderTeacher();
    persistNow();
    return s;
  }

  function setMode(mode) {
    if (!currentModel) return;
    teachingTools.reset();
    board.clearGesture();
    if (mode === 'model') {
      enterModel();
      return;
    }
    if (teacher.mode === 'ink') return;
    pauseSimulationIfActive();
    scene3d.ctl.autoRotate = false;
    board.settle();
    board.resetBoardView();

    const s = selectedSnap();
    const current = buildFullSnapshot();
    if (s && sameSnapshot(s.snapshot, current)) {
      teacher.mode = 'ink';
      root.dataset.mode = 'ink';
      scene3d.ctl.enabled = false;
      notesEl.value = s.notes || '';
      applyPanelCollapsed(true, true);
      renderTeacher();
      fitAll();
      persistNow();
    } else {
      createSnap();
    }
  }

  async function selectSnap(id) {
    const s = snaps.find((x) => x.id === id);
    if (!s) return;
    const mySnapSeq = ++snapSeq;
    saveNotes();
    pauseSimulationIfActive();
    board.clearGesture();
    board.resetBoardView();
    scene3d.ctl.autoRotate = false;
    board.settle();

    let loaded = null;
    try {
      loaded = await loadModel(s.snapshot.modelId, {
        params: s.snapshot.params,
        step: s.snapshot.step,
        visible: s.snapshot.visible,
        sim:
          typeof s.snapshot.simTime === 'number' || s.snapshot.simState
            ? {
                simTime: s.snapshot.simTime,
                simSeed: s.snapshot.simSeed,
                simState: s.snapshot.simState,
              }
            : undefined,
        resetCam: false,
        render: false,
      });
    } catch (err) {
      showBanner(`Не удалось открыть снэп «${s.name}»: ${err?.message || 'ошибка загрузки'}`, true);
      return;
    }

    if (!loaded || mySnapSeq !== snapSeq) return;
    selectedSnapId = id;
    editingSnapId = null;
    teacher.mode = 'ink';
    root.dataset.mode = 'ink';
    scene3d.ctl.enabled = false;
    notesEl.value = s.notes || '';
    applyPanelCollapsed(true, true);
    renderTeacher();
    fitAll();
    persistNow();
  }

  function deleteSnap(id) {
    const idx = snaps.findIndex((s) => s.id === id);
    if (idx === -1) return;
    revokeThumbUrl(snaps[idx]);
    snaps.splice(idx, 1);
    if (selectedSnapId === id) {
      if (teacher.mode === 'ink' && snaps.length) {
        const next = snaps[Math.min(idx, snaps.length - 1)];
        selectedSnapId = null;
        selectSnap(next.id);
        return;
      }
      selectedSnapId = null;
      if (teacher.mode === 'ink') {
        enterModel();
        return;
      }
    }
    renderSnaps();
    persistNow();
  }

  function clearAllSnaps() {
    snaps.forEach(revokeThumbUrl);
    snaps.length = 0;
    selectedSnapId = null;
    nextSnapId = 1;
    if (teacher.mode === 'ink') {
      enterModel();
    } else {
      renderSnaps();
      persistNow();
    }
  }

  async function applyProjectData(project, loadedSnaps, resetCamOnEmpty = true) {
    snaps.forEach(revokeThumbUrl);
    snaps.length = 0;
    snaps.push(...loadedSnaps);
    activeProject = project;
    selectedSnapId = null;
    editingSnapId = null;
    lastModelCamera = null;
    nextSnapId = project.nextSnapId || snaps.length + 1;

    exitInkToModelUiOnly();
    syncProjectTitleUI();

    const st0 = project.activeState || {};
    const savedCam = sanitizeCamera(st0.camera);
    const shouldResetCam = resetCamOnEmpty || !st0.modelId || !savedCam;
    await loadModel(st0.modelId || DEFAULT_SCENE_ID, {
      params: st0.params,
      step: st0.step ?? 0,
      visible: st0.visible,
      sim: st0.activeSim || undefined,
      resetCam: shouldResetCam,
      forceSchema: true,
      render: true,
    });
    if (!shouldResetCam && savedCam) {
      board.restoreCamera({ camera: savedCam, ratio: (el.clientWidth || 1) / (el.clientHeight || 1) }, false);
      lastModelCamera = savedCam;
    }
    allProjects = await storage.listProjects();
    projectsUI.updateData(allProjects, activeProject.id);
    fitAll();
  }

  async function handleExportLesson() {
    if (!currentModel) return '';
    saveNotes();
    const payload = await buildLessonPayload({
      projectTitle: activeProject?.title || '',
      modelId: currentModel.id,
      params,
      step: st,
      visible,
      activeSim: isSimScene() ? simRunner.captureSimSnapshot() : null,
      nextSnapId,
      snaps,
    });
    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    await deliverBlob({
      blob,
      filename: `${safeSlug(activeProject?.title, 'teacher-board-lesson')}.json`,
      preferShare: false,
    });
    return `Экспортировано: ${snaps.length} сн.`;
  }

  async function handleImportLesson(rawText) {
    const parsed = parseLessonPayload(rawText, CATALOG_BY_ID);
    if (
      snaps.length > 0 &&
      !window.confirm(`Заменить текущие снэпы (${snaps.length}) уроком из файла?`)
    ) {
      return null;
    }
    if (teacher.mode === 'ink') exitInkToModelUiOnly();
    else saveNotes();
    pauseSimulationIfActive();
    board.clearGesture();

    snaps.forEach(revokeThumbUrl);
    snaps.length = 0;
    parsed.snaps.forEach((s) => {
      snaps.push({
        ...s,
        id: makeSnapId(),
        createdAt: Date.now(),
        thumbBlob: null,
      });
    });
    selectedSnapId = null;
    nextSnapId = parsed.nextSnapId;

    await loadModel(parsed.modelId || DEFAULT_SCENE_ID, {
      params: parsed.params,
      step: parsed.step,
      visible: parsed.visible,
      sim: parsed.activeSim || undefined,
      resetCam: true,
      forceSchema: true,
      render: true,
    });
    renderSnaps();
    await persistNow();
    return snaps.length;
  }

  function getExportEnv() {
    if (exportEnv) return exportEnv;
    const THREE = window.THREE;
    const expGeomApi = createGeomApi(THREE);
    const expScene = new THREE.Scene();
    const expRoot = new THREE.Group();
    expScene.add(expRoot);
    const expRenderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
    });
    scene3dMod.configureRenderer?.(THREE, expRenderer);
    const expStudio = scene3dMod.createStudioEnvironment
      ? scene3dMod.createStudioEnvironment(THREE, expScene, expRenderer)
      : null;
    if (!expStudio) {
      expScene.add(new THREE.AmbientLight(0xffffff, 0.74));
      const dl = new THREE.DirectionalLight(0xffffff, 0.8);
      dl.position.set(4, 7, 5);
      expScene.add(dl);
    } else {
      expRenderer.domElement.addEventListener('webglcontextrestored', () => {
        expStudio.rebuildEnvironment?.();
      });
    }
    const expCamera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    const expCtl = { target: new THREE.Vector3(), enableDamping: false };
    let expGroups = {};
    exportEnv = {
      geomApi: expGeomApi,
      scene: expScene,
      camera: expCamera,
      renderer: expRenderer,
      studio: expStudio,
      ctl: expCtl,
      groups: expGroups,
      setTheme(theme) {
        expStudio?.setTheme?.(theme);
      },
      setLayers(layers) {
        expGeomApi.clearGroup(expRoot);
        expGroups = {};
        exportEnv.groups = expGroups;
        (layers || []).forEach((layer) => {
          const g = new THREE.Group();
          g.visible = layer.visible !== false;
          expRoot.add(g);
          expGroups[layer.key] = g;
        });
      },
      rebuild(mdl, p, solvedData, simState = null, simTime = 0) {
        Object.values(expGroups).forEach(expGeomApi.clearGroup);
        const meta =
          mdl.build(expGeomApi, {
            params: p,
            solved: solvedData,
            groups: expGroups,
            scene: expScene,
            simState,
            simTime,
          }) || {};
        expStudio?.applyModelMeta?.(meta);
        if (typeof mdl.updateScene === 'function') {
          mdl.updateScene(expGeomApi, {
            params: p,
            solved: solvedData,
            groups: expGroups,
            handles: meta.handles || null,
            simState,
            simTime,
          });
        }
        return meta;
      },
      dispose() {
        expGeomApi.clearGroup(expRoot);
        expStudio?.dispose?.();
        expGeomApi.dispose?.();
        expRenderer.dispose();
      },
    };
    return exportEnv;
  }

  async function runIsolatedExportTask(fn) {
    const task = exportQueue.then(async () => {
      if (!currentModel) return null;
      saveNotes();
      const env = getExportEnv();
      return fn(env);
    });
    exportQueue = task.catch(() => {});
    return task;
  }

  const projectsUI = createProjectsUI({
    root,
    catalogById: CATALOG_BY_ID,
    onSelectProject: async (projectId) => {
      await persistNow();
      const loaded = await storage.loadProject(projectId);
      if (!loaded) return;
      await storage.setActiveProjectId(loaded.project.id);
      await applyProjectData(loaded.project, loaded.snaps, false);
    },
    onCreateProject: async (title) => {
      await persistNow();
      const res = await storage.createProject({
        title,
        modelId: currentModel?.id || DEFAULT_SCENE_ID,
      });
      await applyProjectData(res.project, res.snaps, true);
    },
    onRenameProject: async (projectId, newTitle) => {
      await storage.renameProject(projectId, newTitle);
      if (activeProject && activeProject.id === projectId) {
        activeProject.title = newTitle;
        syncProjectTitleUI();
      }
      allProjects = await storage.listProjects();
      projectsUI.updateData(allProjects, activeProject?.id);
    },
    onDuplicateProject: async (sourceId) => {
      await persistNow();
      const dup = await storage.duplicateProject(sourceId);
      if (!dup) return;
      await applyProjectData(dup.project, dup.snaps, false);
    },
    onDeleteProject: async (projectId) => {
      if (activeProject && activeProject.id === projectId) {
        clearTimeout(persistTimer);
        await persistChain;
        const next = await storage.deleteProject(projectId);
        await applyProjectData(next.project, next.snaps, true);
      } else {
        await persistChain;
        await storage.deleteProject(projectId);
        allProjects = await storage.listProjects();
        projectsUI.updateData(allProjects, activeProject?.id);
      }
    },
    onImportProjectFile: async (rawText, filename) => {
      await persistNow();
      const parsed = parseLessonPayload(rawText, CATALOG_BY_ID);
      const fallbackTitle = filename ? filename.replace(/\.json$/i, '') : 'Импорт урока';
      const created = await storage.createProject({
        title: parsed.projectTitle || fallbackTitle,
        modelId: parsed.modelId || DEFAULT_SCENE_ID,
        activeState: {
          modelId: parsed.modelId || DEFAULT_SCENE_ID,
          params: parsed.params,
          step: parsed.step,
          visible: parsed.visible,
          activeSim: parsed.activeSim || null,
        },
        initialSnaps: parsed.snaps,
        nextSnapId: parsed.nextSnapId,
      });
      await applyProjectData(created.project, created.snaps, true);
      return true;
    },
  });

  const exportUI = createExportUI({
    root,
    initialPrefs: exportPrefs,
    onPrefsChange: (next) => {
      exportPrefs = { ...next };
      storage.saveExportPrefs(exportPrefs).catch(() => {});
    },
    onRenderPreview: async (snap, prefs) =>
      runIsolatedExportTask(async (env) => {
        const res = await renderSnapToCanvas({
          snap,
          projectTitle: activeProject?.title || '',
          scene3d: env,
          geomApi: env.geomApi,
          loadSceneModule,
          options: { ...prefs, maxLongEdge: 960 },
        });
        const scaleBack = 2240 / Math.max(res.stageWidth || res.width, res.stageHeight || res.height);
        const blob = await canvasToBlob(res.canvas, 'image/jpeg', 0.9);
        res.canvas.width = res.canvas.height = 0;
        return {
          blobUrl: URL.createObjectURL(blob),
          fullWidth: Math.round(res.width * scaleBack),
          fullHeight: Math.round(res.height * scaleBack),
        };
      }),
    onExportPng: async (snap, prefs, preferShare) => {
      const blob = await runIsolatedExportTask(async (env) => {
        const res = await renderSnapToCanvas({
          snap,
          projectTitle: activeProject?.title || '',
          scene3d: env,
          geomApi: env.geomApi,
          loadSceneModule,
          options: { ...prefs, maxLongEdge: 2240 },
        });
        try {
          return await canvasToBlob(res.canvas, 'image/png', 0.95);
        } finally {
          res.canvas.width = res.canvas.height = 0;
        }
      });
      const fname = `${safeSlug(activeProject?.title, 'lesson')}-${safeSlug(snap.name, 'snap')}.png`;
      return deliverBlob({
        blob,
        filename: fname,
        title: `${activeProject?.title || 'Доска учителя'} · ${snap.name}`,
        text: snap.notes || snap.name,
        preferShare,
      });
    },
    onExportPdf: async (prefs, preferShare, onProgress) => {
      const pdfBlob = await runIsolatedExportTask(async (env) => {
        const pages = [];
        for (let i = 0; i < snaps.length; i++) {
          onProgress?.(`Страница ${i + 1} из ${snaps.length}`);
          const res = await renderSnapToCanvas({
            snap: snaps[i],
            projectTitle: activeProject?.title || '',
            scene3d: env,
            geomApi: env.geomApi,
            loadSceneModule,
            options: { ...prefs, maxLongEdge: 2100 },
          });
          try {
            pages.push(await canvasToJpegPage(res.canvas, 0.92));
          } finally {
            res.canvas.width = res.canvas.height = 0;
          }
        }
        onProgress?.('Упаковка PDF');
        return buildPdfFromJpegPages(pages);
      });
      const fname = `${safeSlug(activeProject?.title, 'teacher-board-lesson')}.pdf`;
      return deliverBlob({
        blob: pdfBlob,
        filename: fname,
        title: `${activeProject?.title || 'Урок'} · конспект (${snaps.length} стр.)`,
        preferShare,
      });
    },
  });

  const catalog = createCatalogUI({
    root,
    subjects: SUBJECTS,
    categories: CATEGORIES,
    models: SCENE_INDEX,
    onSelectModel: async (modelId) => {
      if (teacher.mode === 'ink') enterModel();
      board.clearGesture();
      await loadModel(modelId, { resetCam: true, render: true });
      persistNow();
    },
    onClearSnaps: clearAllSnaps,
    onExportLesson: handleExportLesson,
    onImportLesson: handleImportLesson,
  });

  // События панели инструментов и шапки
  root.querySelector('[data-action="open-catalog"]').onclick = () => {
    if (!currentModel) return;
    catalog.open(currentModel.id, snaps.length);
  };
  root.querySelector('[data-action="open-projects"]')?.addEventListener('click', async () => {
    await persistNow();
    allProjects = await storage.listProjects();
    projectsUI.open(allProjects, activeProject?.id);
  });
  root.querySelector('[data-action="open-export"]')?.addEventListener('click', () => {
    saveNotes();
    pauseSimulationIfActive();
    exportUI.open({
      projectTitle: activeProject?.title || 'Текущий проект',
      snaps,
      activeSnapId: selectedSnapId,
    });
  });

  root.querySelectorAll('[data-mode]').forEach((b) => (b.onclick = () => setMode(b.dataset.mode)));
  root.querySelectorAll('[data-tool]').forEach(
    (b) =>
      (b.onclick = () => {
        teachingTools.reset();
        teacher.tool = b.dataset.tool;
        renderTeacher();
      })
  );
  root.querySelectorAll('[data-color]').forEach(
    (b) =>
      (b.onclick = () => {
        teacher.color = b.dataset.color;
        renderTeacher();
      })
  );
  root.querySelector('[data-action=notes]').onclick = () => {
    teacher.notes = !teacher.notes;
    renderTeacher();
    setTimeout(fitAll, 0);
  };
  root.querySelector('[data-action=stylus-only]').onclick = () => {
    teacher.stylusOnly = !teacher.stylusOnly;
    renderTeacher();
  };
  root.querySelector('[data-action=reset-camera]')?.addEventListener('click', () => {
    if (!currentModel || teacher.mode !== 'model') return;
    teachingTools.reset();
    scene3d.resetCamera(currentModel, true);
    fitAll();
    schedulePersist();
  });
  root.querySelector('[data-action=new-snap]').onclick = () => createSnap();
  notesEl.addEventListener('input', () => {
    saveNotes();
    schedulePersist();
  });

  const panelToggle = root.querySelector('[data-action=toggle-panel]');
  if (panelToggle) {
    panelToggle.onclick = () => {
      const collapsed = root.getAttribute('data-panel-collapsed') === 'true';
      applyPanelCollapsed(!collapsed, false);
      fitAll();
    };
  }
  const snapsToggle = root.querySelector('[data-action=toggle-snaps]');
  if (snapsToggle) {
    snapsToggle.onclick = () => {
      const collapsed = root.getAttribute('data-snaps-collapsed') === 'true';
      applySnapsCollapsed(!collapsed);
      fitAll();
    };
  }

  const fsBtn = root.querySelector('[data-action=fullscreen]');
  if (fsBtn) {
    if (!document.fullscreenEnabled && !document.webkitFullscreenEnabled) {
      fsBtn.hidden = true;
    } else {
      const syncFs = () => {
        const active = !!(document.fullscreenElement || document.webkitFullscreenElement);
        fsBtn.setAttribute('aria-pressed', String(active));
        const lbl = fsBtn.querySelector('.tb-btn-label');
        if (lbl) lbl.textContent = active ? 'Обычный экран' : 'Во весь экран';
      };
      fsBtn.onclick = () => {
        const active = document.fullscreenElement || document.webkitFullscreenElement;
        if (active) {
          (document.exitFullscreen || document.webkitExitFullscreen).call(document).catch(() => {});
        } else {
          const elFs = document.documentElement;
          (elFs.requestFullscreen || elFs.webkitRequestFullscreen).call(elFs).catch(() => {});
        }
      };
      document.addEventListener('fullscreenchange', syncFs);
      document.addEventListener('webkitfullscreenchange', syncFs);
      syncFs();
    }
  }

  document.addEventListener('keydown', (e) => {
    if (
      !root.isConnected ||
      !currentModel ||
      catalog.isOpen() ||
      projectsUI.isOpen() ||
      exportUI.isOpen() ||
      e.target.matches('input,textarea,select,[contenteditable=true]') ||
      e.ctrlKey ||
      e.altKey ||
      e.metaKey
    ) {
      return;
    }
    if (isSimScene()) {
      if (e.code === 'Space' && !e.target.matches('button,a')) {
        e.preventDefault();
        if (teacher.mode === 'ink') enterModel();
        simRunner.togglePlay();
        const info = simRunner.getState();
        panel.syncPlayer(info);
        if (!info.playing) schedulePersist();
        markDirty();
        return;
      }
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        beforeStateChange();
        simRunner.stepBy(0.05);
        syncDynamicFrame();
        schedulePersist();
        return;
      }
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        if (currentModel.playback?.canScrub) {
          beforeStateChange();
          simRunner.stepBy(-0.05);
          syncDynamicFrame();
          schedulePersist();
        }
      }
      return;
    }

    if (e.key === 'ArrowRight' || e.key === 'PageDown') {
      e.preventDefault();
      beforeStateChange();
      goStep(st + 1);
    }
    if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
      e.preventDefault();
      beforeStateChange();
      goStep(st - 1);
    }
  });

  let syncChan = null;
  if (typeof BroadcastChannel === 'function') {
    try {
      syncChan = new BroadcastChannel('teacher-board-sync');
      syncChan.addEventListener('message', async (ev) => {
        const msg = ev.data;
        if (!msg || msg.tabId === storage.tabId) return;
        allProjects = await storage.listProjects().catch(() => allProjects);
        projectsUI.updateData(allProjects, activeProject?.id);
        if (msg.projectId && msg.projectId === activeProject?.id && (msg.revision || 0) > (activeProject.revision || 0)) {
          showBanner('Открытый урок обновлён в другой вкладке. Переключите проект или обновите страницу.', false);
        }
      });
    } catch {}
  }

  window.addEventListener('pagehide', () => {
    persistNow();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') persistNow();
  });

  new ResizeObserver(() => {
    fitAll();
  }).observe(stage);

  const urlModelId = new URLSearchParams(window.location.search).get('model');
  const hasDeepLinkModel = Boolean(urlModelId && CATALOG_BY_ID.has(urlModelId));

  // Инициализация IndexedDB и восстановление активного проекта
  storage
    .init()
    .then(async (res) => {
      allProjects = res.projects;
      exportPrefs = res.exportPrefs || { ...DEFAULT_EXPORT_PREFS };
      exportUI.setPrefs(exportPrefs);
      await applyProjectData(res.activeProject, res.activeSnaps, false);
      if (hasDeepLinkModel && currentModel?.id !== urlModelId) {
        await loadModel(urlModelId, { resetCam: true, forceSchema: true, render: true });
        persistNow();
      }
    })
    .catch(async (err) => {
      showBanner(`Хранилище проектов недоступно (${err.message}). Изменения работают только в памяти.`, true);
      try {
        await loadModel(hasDeepLinkModel ? urlModelId : DEFAULT_SCENE_ID, { resetCam: true, render: true });
      } catch {}
    });

  let lastLoopTs = performance.now();
  let lastUiSyncTs = 0;

  (function loop(now = performance.now()) {
    if (!root.isConnected) {
      syncChan?.close();
      storage?.dispose?.();
      exportEnv?.dispose?.();
      teachingTools.dispose();
      scene3d.dispose();
      return;
    }
    requestAnimationFrame(loop);

    const dt = Math.max(0, (now - lastLoopTs) / 1000);
    lastLoopTs = now;

    if (currentModel && isSimScene() && teacher.mode === 'model') {
      const updated = simRunner.tick(dt);
      if (updated) {
        const info = simRunner.getState();
        solved = info.solved;
        scene3d.updateDynamic(currentModel, params, solved, info.simState, info.simTime);
        panel.syncPlayer(info);
        if (!info.playing || now - lastUiSyncTs >= 65) {
          lastUiSyncTs = now;
          panel.syncValues(currentModel, params, solved, scene3d.groups);
        }
        if (!info.playing) {
          persistNow();
        }
        renderDirty = true;
      }
    }

    if (teacher.mode === 'model') {
      if (scene3d.ctl.update() || scene3d.ctl.autoRotate) {
        renderDirty = true;
      }
    }

    teachingTools.tick(now);

    if (renderDirty) {
      scene3d.renderFrame(false);
      renderDirty = false;
    }
  })();
} catch (e) {
  showBanner(`Не удалось запустить 3D-сцену: ${e?.message || 'ошибка инициализации WebGL'}`, true);
}
