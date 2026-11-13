/** Снэпы урока (построения и паузы симуляций), миниатюры, сравнение, localStorage и экспорт/импорт JSON. */

import { blobToDataUrl, dataUrlToBlob, revokeThumbUrl } from './storage-db.js';
import {
  VALID_INK_COLORS,
  isSafeThumbDataUrl,
  sanitizeSnapshot,
  sanitizeStrokes,
} from './dom-utils.js';

const STORAGE_KEY = 'teacher-board-session-v1';

export function sameSnapshot(a, b) {
  if (!a || !b || a.modelId !== b.modelId) return false;
  if ((a.step ?? 0) !== (b.step ?? 0)) return false;

  const tA = a.simTime ?? null;
  const tB = b.simTime ?? null;
  if ((tA === null) !== (tB === null)) return false;
  if (tA !== null && Math.abs(tA - tB) > 1e-4) return false;

  if (Boolean(a.simState) !== Boolean(b.simState)) return false;
  if (a.simState && b.simState) {
    if (JSON.stringify(a.simState) !== JSON.stringify(b.simState)) return false;
  }

  if (!Array.isArray(a.visible) || !Array.isArray(b.visible) || a.visible.length !== b.visible.length) return false;
  if (a.visible.some((v, i) => v !== b.visible[i])) return false;

  const keysA = Object.keys(a.params || {});
  const keysB = Object.keys(b.params || {});
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    const va = a.params[key];
    const vb = b.params[key];
    if (typeof va === 'number' && typeof vb === 'number') {
      if (Math.abs(va - vb) > 1e-6) return false;
    } else if (va !== vb) {
      return false;
    }
  }

  const distance = Math.hypot(...a.camera.position);
  const positionTolerance = Math.max(0.002, distance * 0.001);
  const close = (x, y, t) => x.every((v, i) => Math.abs(v - y[i]) <= t);
  return (
    close(a.camera.position, b.camera.position, positionTolerance) &&
    close(a.camera.target, b.camera.target, positionTolerance) &&
    close(a.camera.quaternion, b.camera.quaternion, 0.002) &&
    Math.abs((a.camera.zoom || 1) - (b.camera.zoom || 1)) <= 0.002
  );
}

export function strokeLabel(n) {
  return `${n} ${n % 10 === 1 && n % 100 !== 11 ? 'штрих' : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? 'штриха' : 'штрихов'}`;
}

export function updateThumbnail({ s, mode, selectedSnapId, board, scene3d, root, REF_H }) {
  if (!s || mode !== 'ink' || s.id !== selectedSnapId) return;
  board.restoreCamera(s.snapshot, false);
  scene3d.renderer.render(scene3d.scene, scene3d.camera);

  const m0 = board.getBoardMetrics(s.snapshot, false);
  const c = document.createElement('canvas');
  c.width = 320;
  c.height = 208;
  const x = c.getContext('2d');
  const stageEl = root.querySelector('.tb-scene-stage');
  const stageBg = stageEl ? getComputedStyle(stageEl).backgroundColor : '';
  const rootBg = getComputedStyle(root).backgroundColor;
  x.fillStyle =
    stageBg && stageBg !== 'rgba(0, 0, 0, 0)' && stageBg !== 'transparent'
      ? stageBg
      : rootBg && rootBg !== 'rgba(0, 0, 0, 0)' && rootBg !== 'transparent'
        ? rootBg
        : '#141415';
  x.fillRect(0, 0, c.width, c.height);

  const scale = Math.min(c.width / m0.w, c.height / m0.H);
  const w = m0.w * scale;
  const H = m0.H * scale;
  const ox = (c.width - w) / 2;
  const oy = (c.height - H) / 2;
  x.drawImage(scene3d.renderer.domElement, ox, oy, w, H);

  s.strokes.forEach((stroke) => {
    x.beginPath();
    stroke.points.forEach((p, i) => {
      const px = ox + (p[0] - m0.vx) * m0.fitW * scale;
      const py = oy + (p[1] - m0.vy) * m0.fitH * scale;
      i ? x.lineTo(px, py) : x.moveTo(px, py);
    });
    const safeColor = VALID_INK_COLORS.has(stroke.color) ? stroke.color : 'blue';
    const swatchEl = safeColor !== 'graphite' ? root.querySelector(`[data-color="${safeColor}"] span`) : null;
    x.strokeStyle =
      safeColor === 'graphite'
        ? getComputedStyle(root).color
        : swatchEl
          ? getComputedStyle(swatchEl).backgroundColor
          : '#38bdf8';
    x.lineWidth = Math.max(0.8, stroke.width * (m0.fitH / REF_H) * scale);
    x.lineCap = x.lineJoin = 'round';
    x.stroke();
  });

  let dataUrl = c.toDataURL('image/webp', 0.85);
  if (!dataUrl || !dataUrl.startsWith('data:image/webp')) {
    dataUrl = c.toDataURL('image/png');
  }
  revokeThumbUrl(s);
  s.thumbnail = dataUrl;
  s.thumbBlob = dataUrlToBlob(dataUrl);
  const img = root.querySelector(`[data-snap-id="${s.id}"] img`);
  if (img) img.src = s.thumbnail;
  board.restoreCamera(s.snapshot, true);
}

export function renderSnapsList({
  listEl,
  root,
  snaps,
  mode,
  selectedSnapId,
  editingSnapId = null,
  modelsById,
  getLoadedScene,
  onSelect,
  onDelete,
  onStartRename,
  onCommitRename,
  onCancelRename,
}) {
  listEl.replaceChildren();
  if (!snaps.length) {
    const p = document.createElement('p');
    p.className = 'tb-snaps-empty';
    p.textContent = 'Пока нет снэпов';
    listEl.append(p);
    return;
  }

  const distinctModels = new Set(snaps.map((s) => s.snapshot.modelId));
  const showModelTag = distinctModels.size > 1;

  snaps.forEach((s) => {
    const item = document.createElement('div');
    item.className = 'tb-snap-item';

    const entry = modelsById.get(s.snapshot.modelId);
    const loaded = getLoadedScene ? getLoadedScene(s.snapshot.modelId) : null;
    const mdl = loaded || entry;
    const modelName = mdl ? mdl.shortTitle || mdl.title : s.snapshot.modelId;
    const isSim = (mdl?.kind || s.snapshot.kind) === 'simulation' || typeof s.snapshot.simTime === 'number';
    const frameTag = isSim
      ? `t = ${Number(s.snapshot.simTime ?? 0).toFixed(2)} с`
      : `Шаг ${(s.snapshot.step ?? 0) + 1}`;

    if (editingSnapId === s.id) {
      const form = document.createElement('form');
      form.className = 'tb-snap-rename-form';
      const inp = document.createElement('input');
      inp.type = 'text';
      inp.value = s.name;
      inp.maxLength = 60;
      inp.setAttribute('aria-label', `Новое имя для ${s.name}`);
      const okBtn = document.createElement('button');
      okBtn.type = 'submit';
      okBtn.innerHTML = '<i data-lucide="check" aria-hidden="true"></i>';
      okBtn.setAttribute('aria-label', 'Сохранить название снэпа');
      const noBtn = document.createElement('button');
      noBtn.type = 'button';
      noBtn.innerHTML = '<i data-lucide="x" aria-hidden="true"></i>';
      noBtn.setAttribute('aria-label', 'Отменить переименование снэпа');
      noBtn.onclick = () => onCancelRename?.();
      inp.addEventListener('keydown', (ev) => {
        if (ev.key === 'Escape') {
          ev.preventDefault();
          ev.stopPropagation();
          onCancelRename?.();
        }
      });
      form.onsubmit = (ev) => {
        ev.preventDefault();
        onCommitRename?.(s.id, inp.value.trim());
      };
      form.append(inp, okBtn, noBtn);
      item.append(form);
      listEl.append(item);
      setTimeout(() => {
        inp.focus();
        inp.select();
      }, 0);
      return;
    }

    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tb-snap';
    b.dataset.snapId = s.id;

    b.setAttribute('aria-pressed', String(mode === 'ink' && s.id === selectedSnapId));
    b.setAttribute(
      'aria-label',
      `${s.name} · ${modelName} · ${frameTag} · ${strokeLabel(s.strokes.length)}`
    );

    const img = document.createElement('img');
    img.alt = `Ракурс ${s.name.toLowerCase()}`;
    const thumbSrc = isSafeThumbDataUrl(s.thumbnail) ? s.thumbnail : s.thumbnailUrl || '';
    img.hidden = !thumbSrc;
    img.onerror = () => {
      img.hidden = true;
    };
    if (thumbSrc) img.src = thumbSrc;

    const title = document.createElement('span');
    title.className = 'tb-snap-label';
    title.textContent = `${s.name} · ${frameTag}`;

    b.append(img, title);

    if (showModelTag || mdl) {
      const mTag = document.createElement('span');
      mTag.className = 'tb-snap-model';
      mTag.textContent = modelName;
      b.append(mTag);
    }

    const meta = document.createElement('span');
    meta.className = 'tb-snap-meta';
    meta.dataset.snapCount = s.id;
    meta.textContent = formatSnapMeta(s, mdl);
    b.append(meta);
    b.onclick = () => onSelect(s.id);

    const cardActions = document.createElement('div');
    cardActions.className = 'tb-snap-actions';

    if (onStartRename) {
      const ren = document.createElement('button');
      ren.type = 'button';
      ren.className = 'tb-snap-ren';
      ren.setAttribute('aria-label', `Переименовать ${s.name}`);
      ren.title = 'Переименовать снэп';
      ren.innerHTML = '<i data-lucide="pencil" aria-hidden="true"></i>';
      ren.onclick = (ev) => {
        ev.stopPropagation();
        onStartRename(s.id);
      };
      cardActions.append(ren);
    }

    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'tb-snap-del';
    del.setAttribute('aria-label', `Удалить ${s.name}`);
    del.title = 'Удалить снэп';
    del.innerHTML = '<i data-lucide="x" aria-hidden="true"></i>';
    del.onclick = (ev) => {
      ev.stopPropagation();
      onDelete(s.id);
    };
    cardActions.append(del);

    item.append(b, cardActions);
    listEl.append(item);
  });

  globalThis.lucide?.createIcons({ attrs: { width: 16, height: 16, 'stroke-width': 1.5 }, root: listEl });
}

export function formatSnapMeta(s, model) {
  const summary = model?.summarizeParams
    ? model.summarizeParams(s.snapshot.params)
    : (s.snapshot.paramSummary || '');
  return summary ? `${summary} · ${strokeLabel(s.strokes.length)}` : strokeLabel(s.strokes.length);
}

function serializeSnaps(snaps) {
  return snaps.map((s) => ({
    id: s.id,
    name: s.name,
    snapshot: s.snapshot,
    strokes: s.strokes,
    notes: s.notes || '',
    thumbnail: s.thumbnail || '',
  }));
}

export function sanitizeSnaps(rawSnaps, catalogById) {
  if (!Array.isArray(rawSnaps)) return [];
  return rawSnaps
    .map((s) => {
      if (!s || !s.id) return null;
      const snapshot = sanitizeSnapshot(s.snapshot, catalogById);
      if (!snapshot) return null;
      const thumb = isSafeThumbDataUrl(s.thumbnail) ? s.thumbnail.trim() : '';
      return {
        id: String(s.id).slice(0, 64),
        name: String(s.name || s.id).slice(0, 80),
        snapshot,
        strokes: sanitizeStrokes(s.strokes),
        history: [],
        redoHistory: [],
        notes: typeof s.notes === 'string' ? s.notes : '',
        thumbnail: thumb,
      };
    })
    .filter(Boolean);
}

export function saveSession({ modelId, params, step, visible, activeSim, nextSnapId, snaps }) {
  try {
    const payload = {
      version: 1,
      modelId,
      params,
      step,
      visible,
      activeSim: activeSim || null,
      nextSnapId,
      snaps: serializeSnaps(snaps),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Игнорируем переполнение квоты или запрет storage в приватном режиме
  }
}

export function loadSession(catalogById) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || data.version !== 1) return null;
    const validSnaps = sanitizeSnaps(data.snaps, catalogById);
    return {
      modelId: catalogById.has(data.modelId) ? data.modelId : null,
      params: data.params && typeof data.params === 'object' ? data.params : null,
      step: typeof data.step === 'number' ? data.step : 0,
      visible: Array.isArray(data.visible) ? data.visible : null,
      activeSim: data.activeSim && typeof data.activeSim === 'object' ? data.activeSim : null,
      nextSnapId: typeof data.nextSnapId === 'number' ? data.nextSnapId : validSnaps.length + 1,
      snaps: validSnaps,
    };
  } catch {
    return null;
  }
}

export async function buildLessonPayload({ projectTitle, modelId, params, step, visible, activeSim, nextSnapId, snaps }) {
  const serializedSnaps = await Promise.all(
    snaps.map(async (s) => ({
      id: s.id,
      name: s.name,
      snapshot: s.snapshot,
      strokes: s.strokes,
      notes: s.notes || '',
      thumbnail: s.thumbnail || (s.thumbBlob ? await blobToDataUrl(s.thumbBlob) : ''),
    }))
  );
  return {
    format: 'teacher-board-lesson',
    version: 1,
    projectTitle: projectTitle || '',
    exportedAt: new Date().toISOString(),
    modelId,
    params,
    step,
    visible,
    activeSim: activeSim || null,
    nextSnapId,
    snaps: serializedSnaps,
  };
}

export function parseLessonPayload(rawText, catalogById) {
  let data;
  try {
    data = JSON.parse(rawText);
  } catch {
    throw new Error('Файл не содержит корректный JSON');
  }
  if (!data || data.format !== 'teacher-board-lesson' || data.version !== 1) {
    throw new Error('Неподдерживаемый формат файла урока');
  }
  const validSnaps = sanitizeSnaps(data.snaps, catalogById);
  const validModel = data.modelId && catalogById.has(data.modelId) ? data.modelId : validSnaps[0]?.snapshot.modelId;
  if (!validModel && !validSnaps.length) {
    throw new Error('В файле нет поддерживаемых сцен');
  }
  return {
    projectTitle: typeof data.projectTitle === 'string' ? data.projectTitle : '',
    modelId: validModel || null,
    params: data.params && typeof data.params === 'object' ? data.params : null,
    step: typeof data.step === 'number' ? data.step : 0,
    visible: Array.isArray(data.visible) ? data.visible : null,
    activeSim: data.activeSim && typeof data.activeSim === 'object' ? data.activeSim : null,
    nextSnapId: typeof data.nextSnapId === 'number' ? data.nextSnapId : validSnaps.length + 1,
    snaps: validSnaps,
  };
}
