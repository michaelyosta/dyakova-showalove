/** Высокочёткий экспортёр снэпов (PNG и страницы для PDF) с охватом всей доски и тёмной/светлой темой. */

import { REF_H } from './board-view.js';
import { mergeParamsFor, parseSafeSvgElement } from './dom-utils.js';
import { createSimRunner } from './sim-runner.js';

const THEMES = {
  dark: {
    bg: '#141415',
    panel: '#19191b',
    border: '#2c2c31',
    fg: '#ededed',
    muted: '#a1a1a6',
    blue: '#38bdf8',
    pillBg: '#232327',
    grid: 'rgba(237, 237, 237, 0.14)',
    ink: {
      graphite: '#ededed',
      blue: '#38bdf8',
      red: '#f87171',
    },
  },
  light: {
    bg: '#f8fafc',
    panel: '#ffffff',
    border: '#cbd5e1',
    fg: '#0f172a',
    muted: '#475569',
    blue: '#0284c7',
    pillBg: '#f1f5f9',
    grid: 'rgba(15, 23, 42, 0.14)',
    ink: {
      graphite: '#0f172a',
      blue: '#0284c7',
      red: '#dc2626',
    },
  },
};

export function computeSnapUnionRect(snap) {
  let u0 = 0;
  let u1 = 1;
  let v0 = 0;
  let v1 = 1;
  const strokes = snap?.strokes || [];
  if (strokes.length) {
    let su0 = Infinity;
    let su1 = -Infinity;
    let sv0 = Infinity;
    let sv1 = -Infinity;
    for (const st of strokes) {
      for (const pt of st.points || []) {
        const u = pt[0];
        const v = pt[1];
        if (u < su0) su0 = u;
        if (u > su1) su1 = u;
        if (v < sv0) sv0 = v;
        if (v > sv1) sv1 = v;
      }
    }
    if (Number.isFinite(su0)) {
      const pad = 0.045;
      u0 = Math.min(0, su0 - pad);
      u1 = Math.max(1, su1 + pad);
      v0 = Math.min(0, sv0 - pad);
      v1 = Math.max(1, sv1 + pad);
    }
  }
  const maxSpan = 5.0;
  if (u1 - u0 > maxSpan) {
    const cu = (u0 + u1) * 0.5;
    u0 = cu - maxSpan * 0.5;
    u1 = cu + maxSpan * 0.5;
  }
  if (v1 - v0 > maxSpan) {
    const cv = (v0 + v1) * 0.5;
    v0 = cv - maxSpan * 0.5;
    v1 = cv + maxSpan * 0.5;
  }
  return { u0, u1, v0, v1, dU: Math.max(0.1, u1 - u0), dV: Math.max(0.1, v1 - v0) };
}

function darkenNeutralWireframesForLight(scene, geomApi) {
  const LABEL_LIGHT_MAP = {
    '#ffffff': '#0f172a',
    '#ededed': '#0f172a',
    '#e9eaee': '#0f172a',
    '#e2e8f0': '#0f172a',
    '#cbd5e1': '#334155',
    '#fbbf24': '#b45309',
    '#fde047': '#a16207',
    '#f59e0b': '#b45309',
    '#f97316': '#c2410c',
    '#f87171': '#b91c1c',
    '#ef8e89': '#b91c1c',
    '#ef4444': '#b91c1c',
    '#93c5fd': '#1d4ed8',
    '#60a5fa': '#1d4ed8',
    '#3b82f6': '#1d4ed8',
    '#38bdf8': '#0369a1',
    '#7dd3fc': '#0284c7',
    '#6ee7b7': '#047857',
    '#22c55e': '#15803d',
    '#ec4899': '#be185d',
    '#a855f7': '#7e22ce',
    '#c084fc': '#7e22ce',
  };
  scene.traverse((obj) => {
    const role = obj.userData?.exportTintRole;
    if (role === 'preserve') return;
    if (role === 'label' && obj.isSprite && geomApi?.setLabelAppearance) {
      const orig = String(obj.userData?.labelOpts?.color || '#ffffff').toLowerCase();
      const lightColor = LABEL_LIGHT_MAP[orig] || '#0f172a';
      geomApi.setLabelAppearance(obj, lightColor, '#ffffff');
      return;
    }
    const mat = obj.material;
    if (!mat) return;
    const mats = Array.isArray(mat) ? mat : [mat];
    for (const m of mats) {
      if (!m || !m.color) continue;
      // Не затемняем per-instance / vertex color материалы (огонь, молекулы, тепловая шкала)
      if (m.vertexColors || (obj.isInstancedMesh && obj.instanceColor)) continue;
      if (role === 'studio-grid') {
        const kind = obj.userData?.studioGridKind;
        if (kind === 'major') {
          m.color.setHex(0x0284c7);
          if (m.transparent) m.opacity = Math.max(0.3, m.opacity || 0.3);
        } else if (kind === 'rim') {
          m.color.setHex(0x64748b);
          if (m.transparent) m.opacity = Math.max(0.28, m.opacity || 0.28);
        } else {
          m.color.setHex(0x94a3b8);
          if (m.transparent) m.opacity = Math.max(0.24, m.opacity || 0.24);
        }
        continue;
      }
      if (role === 'water-wire') {
        m.color.setHex(0x0284c7);
        if (m.transparent) m.opacity = Math.max(0.28, m.opacity || 0.28);
        continue;
      }
      if (m.emissive && m.emissiveIntensity) {
        m.emissiveIntensity *= 0.45;
      }
      const r = m.color.r;
      const g = m.color.g;
      const b = m.color.b;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      // Светло-серые каркасные рёбра делаем чёткими графитовыми на светлом листе
      if (max - min < 0.14 && max > 0.45) {
        if (role === 'fill' && m.transparent && m.opacity < 0.45) {
          m.color.setHex(0x64748b);
          m.opacity = Math.max(0.16, m.opacity);
        } else {
          m.color.setHex(0x475569);
        }
      } else if ((role === 'wireframe' || role === 'accent') && max > 0.78) {
        m.color.multiplyScalar(0.76);
      }
    }
  });
}

const SVG_LIGHT_COLORS = [
  ['#ffffff', '#0f172a'],
  ['#ededed', '#0f172a'],
  ['#e9eaee', '#0f172a'],
  ['#f8fafc', '#0f172a'],
  ['#e2e8f0', '#334155'],
  ['#cbd5e1', '#475569'],
  ['#eab308', '#b45309'],
  ['#fbbf24', '#b45309'],
  ['#fde047', '#a16207'],
  ['#f59e0b', '#b45309'],
  ['#f97316', '#c2410c'],
  ['#38bdf8', '#0284c7'],
  ['#7dd3fc', '#0284c7'],
  ['#0ea5e9', '#0369a1'],
  ['#93c5fd', '#1d4ed8'],
  ['#60a5fa', '#1d4ed8'],
  ['#3b82f6', '#1d4ed8'],
  ['#e0f2fe', '#0369a1'],
  ['#f87171', '#b91c1c'],
  ['#ef8e89', '#b91c1c'],
  ['#ef4444', '#b91c1c'],
  ['#6ee7b7', '#047857'],
  ['#34d399', '#047857'],
  ['#22c55e', '#15803d'],
  ['#10b981', '#047857'],
  ['#ec4899', '#be185d'],
  ['#f472b6', '#be185d'],
  ['#a855f7', '#7e22ce'],
  ['#c084fc', '#7e22ce'],
  ['#a1a1a6', '#475569'],
  ['#9aa2b1', '#475569'],
  ['#94a3b8', '#475569'],
];

const SVG_RGBA_LIGHT_RE = [
  [/rgba\(\s*255\s*,\s*255\s*,\s*255\s*,([^)]+)\)/gi, 'rgba(15,23,42,$1)'],
  [/rgba\(\s*233\s*,\s*234\s*,\s*238\s*,([^)]+)\)/gi, 'rgba(15,23,42,$1)'],
  [/rgba\(\s*125\s*,\s*211\s*,\s*252\s*,([^)]+)\)/gi, 'rgba(2,132,199,$1)'],
  [/rgba\(\s*56\s*,\s*189\s*,\s*248\s*,([^)]+)\)/gi, 'rgba(2,132,199,$1)'],
  [/rgba\(\s*251\s*,\s*191\s*,\s*36\s*,([^)]+)\)/gi, 'rgba(180,83,9,$1)'],
  [/rgba\(\s*148\s*,\s*163\s*,\s*184\s*,([^)]+)\)/gi, 'rgba(71,85,105,$1)'],
];

function normalizeSvgColorsForLight(svgEl) {
  const replaceColors = (val) => {
    let out = val;
    for (const [darkC, lightC] of SVG_LIGHT_COLORS) {
      out = out.replace(new RegExp(darkC, 'gi'), lightC);
    }
    for (const [re, rep] of SVG_RGBA_LIGHT_RE) {
      out = out.replace(re, rep);
    }
    return out;
  };
  const nodes = [svgEl, ...svgEl.querySelectorAll('*')];
  for (const el of nodes) {
    for (const attr of ['fill', 'stroke', 'color', 'stop-color', 'style']) {
      if (el.hasAttribute(attr)) {
        el.setAttribute(attr, replaceColors(el.getAttribute(attr)));
      }
    }
  }
}

function rasterizeDiagramSvg(svgMarkup, sizePx, fgColor, themeKey) {
  if (!svgMarkup) return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const svgEl = parseSafeSvgElement(svgMarkup);
      if (!svgEl) {
        resolve(null);
        return;
      }
      if (themeKey === 'light') {
        normalizeSvgColorsForLight(svgEl);
      }
      svgEl.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      svgEl.setAttribute('width', String(sizePx));
      svgEl.setAttribute('height', String(sizePx));
      svgEl.setAttribute(
        'style',
        `display:block;color:${fgColor};font-family:system-ui,-apple-system,sans-serif;`
      );
      const xml = new XMLSerializer().serializeToString(svgEl);
      const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`;
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = url;
    } catch {
      resolve(null);
    }
  });
}

function fitTextWithEllipsis(ctx, text, maxWidth) {
  const s = String(text || '');
  if (maxWidth <= 0 || ctx.measureText(s).width <= maxWidth) return s;
  let lo = 0;
  let hi = s.length;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (ctx.measureText(`${s.slice(0, mid)}…`).width <= maxWidth) lo = mid;
    else hi = mid - 1;
  }
  return lo > 0 ? `${s.slice(0, lo)}…` : '…';
}

function wrapParagraphs(ctx, text, maxWidth) {
  const lines = [];
  const paragraphs = String(text || '').replace(/\r/g, '').split('\n');
  for (const para of paragraphs) {
    const trimmed = para.trimEnd();
    if (!trimmed) {
      lines.push('');
      continue;
    }
    const words = trimmed.split(/\s+/);
    let current = '';
    for (const w of words) {
      const cand = current ? `${current} ${w}` : w;
      if (ctx.measureText(cand).width <= maxWidth) {
        current = cand;
      } else {
        if (current) lines.push(current);
        // Длинные неделимые слова аккуратно дробим по ширине
        if (ctx.measureText(w).width > maxWidth) {
          let chunk = '';
          for (const ch of w) {
            if (ctx.measureText(chunk + ch).width > maxWidth && chunk) {
              lines.push(chunk);
              chunk = ch;
            } else {
              chunk += ch;
            }
          }
          current = chunk;
        } else {
          current = w;
        }
      }
    }
    if (current) lines.push(current);
  }
  return lines;
}

function drawRoundedRect(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w * 0.5, h * 0.5);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

/**
 * Рендерит один снэп в чистовой HD-холст.
 * Предполагает, что вызывающий код восстановит текущую сцену после серии рендеров.
 */
export async function renderSnapToCanvas({
  snap,
  projectTitle,
  scene3d,
  geomApi,
  loadSceneModule,
  options = {},
}) {
  const themeKey = options.theme === 'light' ? 'light' : 'dark';
  const pal = THEMES[themeKey];
  const includeGrid = options.includeGrid !== false;
  const includeDiagram = options.includeDiagram !== false;
  const includeCalc = options.includeCalc !== false;
  const includeNotes = options.includeNotes !== false;

  const gl = scene3d.renderer?.getContext?.();
  const vpDims = gl?.getParameter?.(gl.MAX_VIEWPORT_DIMS);
  const rbSize = gl?.getParameter?.(gl.MAX_RENDERBUFFER_SIZE);
  const hwMax = Math.min(
    vpDims ? Math.min(vpDims[0], vpDims[1]) : 2560,
    rbSize || 2560,
    2560
  );
  const maxLongEdge = Math.max(480, Math.min(hwMax, options.maxLongEdge || 2200));

  if (!snap?.snapshot?.modelId) {
    throw new Error('Некорректный снимок сцены для экспорта');
  }
  const model = await loadSceneModule(snap.snapshot.modelId);
  const p = mergeParamsFor(model, snap.snapshot.params);
  const isSim = model.kind === 'simulation';

  let solved;
  let simState = null;
  let simTime = 0;
  if (isSim) {
    const tmpRunner = createSimRunner();
    solved = tmpRunner.initSimulation(model, p, {
      simTime: snap.snapshot.simTime ?? 0,
      seed: snap.snapshot.simSeed ?? 1337,
      simState: snap.snapshot.simState || null,
    });
    const st = tmpRunner.getState();
    simState = st.simState;
    simTime = st.simTime;
  } else {
    solved = model.solve(p);
  }

  scene3d.setLayers(model.layers || []);
  const visArr = Array.isArray(snap.snapshot.visible)
    ? snap.snapshot.visible
    : (model.layers || []).map((layer) => (snap.snapshot.step ?? 0) >= (layer.step ?? 0));
  scene3d.setTheme?.(themeKey);
  scene3d.studio?.setTheme?.(themeKey);
  scene3d.rebuild(model, p, solved, simState, simTime);
  scene3d.setTheme?.(themeKey);
  scene3d.studio?.setTheme?.(themeKey);
  (model.layers || []).forEach((layer, i) => {
    if (scene3d.groups[layer.key]) scene3d.groups[layer.key].visible = !!visArr[i];
  });
  if (themeKey === 'light') {
    darkenNeutralWireframesForLight(scene3d.scene, geomApi);
  }

  const rect = computeSnapUnionRect(snap);
  const r0 = snap.snapshot.ratio || 16 / 10;
  const rectAspect = (rect.dU * r0) / rect.dV;

  // Единый пропорциональный pxScale сохраняет соотношение сторон без искажения viewOffset и толщин
  let rawW = rectAspect >= 1 ? maxLongEdge : maxLongEdge * rectAspect;
  let rawH = rectAspect >= 1 ? maxLongEdge / rectAspect : maxLongEdge;
  const minShort = 420;
  if (Math.min(rawW, rawH) < minShort) {
    const up = minShort / Math.min(rawW, rawH);
    rawW *= up;
    rawH *= up;
  }
  if (Math.max(rawW, rawH) > hwMax) {
    const down = hwMax / Math.max(rawW, rawH);
    rawW *= down;
    rawH *= down;
  }
  const stageW = Math.max(240, Math.round(rawW));
  const stageH = Math.max(240, Math.round(rawH));

  // Камера с точным viewOffset под весь охват доски и безопасными значениями по умолчанию
  const camDef = model.cameraDefaults || {};
  const c = snap.snapshot.camera || {};
  const camPos = Array.isArray(c.position) ? c.position : camDef.position || [5.4, 3.4, 5.6];
  const camTgt = Array.isArray(c.target) ? c.target : camDef.target || [0, 0.6, 0];
  const camUp = Array.isArray(c.up) ? c.up : [0, 1, 0];
  if (scene3d.ctl) scene3d.ctl.enableDamping = false;
  scene3d.camera.position.fromArray(camPos);
  scene3d.ctl?.target?.fromArray?.(camTgt);
  scene3d.camera.up.fromArray(camUp);
  scene3d.camera.zoom = c.zoom || 1;
  scene3d.camera.fov = c.fov || 38;
  scene3d.camera.near = c.near || 0.1;
  scene3d.camera.far = c.far || 100;
  scene3d.camera.aspect = c.aspect || r0;

  const fitH = stageH / rect.dV;
  const fitW = stageW / rect.dU;
  const baseLeft = c.view && c.view.enabled ? c.view.offsetX / c.view.fullWidth : 0;
  const baseTop = c.view && c.view.enabled ? c.view.offsetY / c.view.fullHeight : 0;
  const baseW = c.view && c.view.enabled ? c.view.width / c.view.fullWidth : 1;
  const baseH = c.view && c.view.enabled ? c.view.height / c.view.fullHeight : 1;
  const fullW = fitW / baseW;
  const fullH = fitH / baseH;

  scene3d.camera.setViewOffset(
    fullW,
    fullH,
    (baseLeft + rect.u0 * baseW) * fullW,
    (baseTop + rect.v0 * baseH) * fullH,
    stageW,
    stageH
  );
  scene3d.camera.updateProjectionMatrix();
  if (Array.isArray(c.quaternion)) {
    scene3d.camera.quaternion.fromArray(c.quaternion);
  } else {
    scene3d.camera.lookAt(camTgt[0], camTgt[1], camTgt[2]);
  }
  scene3d.camera.updateMatrixWorld();

  scene3d.renderer.setPixelRatio(1);
  scene3d.renderer.setSize(stageW, stageH, false);
  scene3d.renderer.render(scene3d.scene, scene3d.camera);
  scene3d.camera.clearViewOffset();

  // Немедленно забираем WebGL-буфер в offscreen 2D-холст
  const stage2d = document.createElement('canvas');
  stage2d.width = stageW;
  stage2d.height = stageH;
  const stCtx = stage2d.getContext('2d');
  stCtx.drawImage(scene3d.renderer.domElement, 0, 0, stageW, stageH);

  // Асинхронная растеризация 2D-чертежа при необходимости
  let diagramImg = null;
  const diagramLayerVisible = !model.diagramLayerKey || !!scene3d.groups[model.diagramLayerKey]?.visible;
  if (includeDiagram && diagramLayerVisible && typeof model.renderDiagram === 'function') {
    const svgStr = model.renderDiagram(solved, p);
    const diagSize = Math.round(Math.min(360, Math.max(180, stageW * 0.165)));
    diagramImg = await rasterizeDiagramSvg(svgStr, diagSize * 2, pal.fg, themeKey);
  }

  // Расчёт шапки, переносимых чипов расчётов и подвала
  const scaleK = Math.max(0.55, stageW / 1600);
  const padX = Math.round(32 * scaleK);
  const headerH = Math.round(84 * scaleK);
  const maxContentW = stageW - padX * 2;

  const measureCanvas = document.createElement('canvas');
  const mCtx = measureCanvas.getContext('2d');

  const calcRows = includeCalc && typeof model.getCalcRows === 'function' ? model.getCalcRows(solved, p) : [];
  const calcChips = calcRows.map(([k, v]) => `${k}: ${typeof v === 'number' ? v.toFixed(2) : v}`);
  const chipFont = Math.round(16 * scaleK);
  const chipPadX = Math.round(18 * scaleK);
  const chipGapX = Math.round(8 * scaleK);
  const chipH = Math.round(28 * scaleK);
  const chipRowGap = Math.round(8 * scaleK);
  mCtx.font = `500 ${chipFont}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;

  const chipRows = [];
  if (calcChips.length) {
    let curRow = [];
    let curW = 0;
    for (const label of calcChips) {
      const clipped = fitTextWithEllipsis(mCtx, label, maxContentW - chipPadX);
      const cw = mCtx.measureText(clipped).width + chipPadX;
      if (curRow.length && curW + chipGapX + cw > maxContentW) {
        chipRows.push(curRow);
        curRow = [{ label: clipped, cw }];
        curW = cw;
      } else {
        curRow.push({ label: clipped, cw });
        curW += (curRow.length > 1 ? chipGapX : 0) + cw;
      }
    }
    if (curRow.length) chipRows.push(curRow);
  }
  const calcH = chipRows.length
    ? Math.round(10 * scaleK) + chipRows.length * chipH + Math.max(0, chipRows.length - 1) * chipRowGap + Math.round(12 * scaleK)
    : 0;

  const notesText = includeNotes ? (snap.notes || '').trim() : '';
  const notesFontSize = Math.round(23 * scaleK);
  const notesLineH = Math.round(33 * scaleK);
  mCtx.font = `400 ${notesFontSize}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
  const noteLines = notesText ? wrapParagraphs(mCtx, notesText, maxContentW) : [];
  const notesH = noteLines.length ? Math.round(48 * scaleK) + noteLines.length * notesLineH : 0;
  measureCanvas.width = measureCanvas.height = 0;

  const totalH = headerH + calcH + stageH + notesH;
  const out = document.createElement('canvas');
  out.width = stageW;
  out.height = totalH;
  const ctx = out.getContext('2d');

  // Общий фон
  ctx.fillStyle = pal.bg;
  ctx.fillRect(0, 0, stageW, totalH);

  // Шапка
  ctx.fillStyle = pal.panel;
  ctx.fillRect(0, 0, stageW, headerH + calcH);

  const titleSize = Math.round(27 * scaleK);
  const subSize = Math.round(18 * scaleK);
  ctx.fillStyle = pal.fg;
  ctx.font = `600 ${titleSize}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
  ctx.textBaseline = 'middle';
  ctx.fillText(fitTextWithEllipsis(ctx, model.title || 'Сцена', maxContentW), padX, headerH * 0.37);

  const frameLabel = isSim
    ? `${snap.name} · t = ${Number(simTime || 0).toFixed(2)} с`
    : `${snap.name} · Шаг ${(snap.snapshot.step ?? 0) + 1}`;
  const subParts = [projectTitle, model.subtitle, frameLabel].filter(Boolean).join('  ·  ');
  ctx.fillStyle = pal.muted;
  ctx.font = `400 ${subSize}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
  ctx.fillText(fitTextWithEllipsis(ctx, subParts, maxContentW), padX, headerH * 0.74);

  if (chipRows.length) {
    ctx.font = `500 ${chipFont}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
    let cy = headerH + Math.round(6 * scaleK);
    for (const row of chipRows) {
      let cx = padX;
      for (const chip of row) {
        ctx.fillStyle = pal.pillBg;
        drawRoundedRect(ctx, cx, cy, chip.cw, chipH, Math.round(7 * scaleK));
        ctx.fill();
        ctx.strokeStyle = pal.border;
        ctx.lineWidth = Math.max(1, scaleK);
        ctx.stroke();
        ctx.fillStyle = pal.fg;
        ctx.fillText(chip.label, cx + Math.round(9 * scaleK), cy + chipH * 0.52);
        cx += chip.cw + chipGapX;
      }
      cy += chipH + chipRowGap;
    }
  }

  ctx.strokeStyle = pal.border;
  ctx.lineWidth = Math.max(1, scaleK);
  ctx.beginPath();
  ctx.moveTo(0, headerH + calcH);
  ctx.lineTo(stageW, headerH + calcH);
  ctx.stroke();

  const stageTop = headerH + calcH;

  // Сетка точек доски в пространстве [u, v]
  if (includeGrid) {
    const refW = REF_H * r0;
    const stepU = 40 / refW;
    const stepV = 40 / REF_H;
    const startI = Math.floor((rect.u0 * refW) / 40);
    const endI = Math.ceil((rect.u1 * refW) / 40);
    const startJ = Math.floor((rect.v0 * REF_H) / 40);
    const endJ = Math.ceil((rect.v1 * REF_H) / 40);
    const dotR = Math.max(1.1, 1.45 * (fitH / REF_H));
    ctx.fillStyle = pal.grid;
    for (let i = startI; i <= endI; i++) {
      const u = (i + 0.5) * stepU;
      const px = ((u - rect.u0) / rect.dU) * stageW;
      if (px < 0 || px > stageW) continue;
      for (let j = startJ; j <= endJ; j++) {
        const v = (j + 0.5) * stepV;
        const py = stageTop + ((v - rect.v0) / rect.dV) * stageH;
        if (py < stageTop || py > stageTop + stageH) continue;
        ctx.beginPath();
        ctx.arc(px, py, dotR, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // 3D-сцена
  ctx.drawImage(stage2d, 0, stageTop, stageW, stageH);
  stage2d.width = stage2d.height = 0;

  // Векторный чертёж в правом верхнем углу сцены
  if (diagramImg) {
    const cardSize = Math.round(Math.min(340, Math.max(170, stageW * 0.165)));
    const cardPad = Math.round(10 * scaleK);
    const margin = Math.round(18 * scaleK);
    const boxX = stageW - cardSize - margin;
    const boxY = stageTop + margin;
    ctx.fillStyle = pal.panel;
    drawRoundedRect(ctx, boxX, boxY, cardSize, cardSize, Math.round(12 * scaleK));
    ctx.fill();
    ctx.strokeStyle = pal.border;
    ctx.lineWidth = Math.max(1.2, 1.4 * scaleK);
    ctx.stroke();
    ctx.drawImage(diagramImg, boxX + cardPad, boxY + cardPad, cardSize - cardPad * 2, cardSize - cardPad * 2);
  }

  // Рукописные штрихи учителя поверх всей области
  const widthScale = fitH / REF_H;
  for (const st of snap.strokes || []) {
    if (!st.points || !st.points.length) continue;
    ctx.beginPath();
    st.points.forEach((pt, idx) => {
      const px = ((pt[0] - rect.u0) / rect.dU) * stageW;
      const py = stageTop + ((pt[1] - rect.v0) / rect.dV) * stageH;
      if (idx === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.strokeStyle = pal.ink[st.color] || pal.ink.graphite;
    ctx.lineWidth = Math.max(1.2, (st.width || 3) * widthScale);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  }

  // Блок заметок под кадром
  if (notesH > 0) {
    const footTop = stageTop + stageH;
    ctx.fillStyle = pal.panel;
    ctx.fillRect(0, footTop, stageW, notesH);
    ctx.strokeStyle = pal.border;
    ctx.lineWidth = Math.max(1, scaleK);
    ctx.beginPath();
    ctx.moveTo(0, footTop);
    ctx.lineTo(stageW, footTop);
    ctx.stroke();

    ctx.fillStyle = pal.muted;
    ctx.font = `600 ${Math.round(17 * scaleK)}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
    ctx.fillText('Объяснение / заметки:', padX, footTop + Math.round(22 * scaleK));

    ctx.fillStyle = pal.fg;
    ctx.font = `400 ${notesFontSize}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
    noteLines.forEach((line, i) => {
      ctx.fillText(line, padX, footTop + Math.round(52 * scaleK) + i * notesLineH);
    });
  }

  return {
    canvas: out,
    width: out.width,
    height: out.height,
    stageWidth: stageW,
    stageHeight: stageH,
  };
}

export function canvasToBlob(canvas, type = 'image/png', quality = 0.92) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Не удалось сформировать изображение'))),
      type,
      quality
    );
  });
}

export async function canvasToJpegPage(canvas, quality = 0.92) {
  const blob = await canvasToBlob(canvas, 'image/jpeg', quality);
  const buf = await blob.arrayBuffer();
  return {
    jpegBytes: new Uint8Array(buf),
    widthPx: canvas.width,
    heightPx: canvas.height,
  };
}

export function canShareFiles(sampleType = 'image/png') {
  try {
    if (typeof navigator === 'undefined' || !navigator.canShare || !navigator.share) return false;
    const f = new File([new Uint8Array([1])], `test.${sampleType.includes('pdf') ? 'pdf' : 'png'}`, { type: sampleType });
    return navigator.canShare({ files: [f] });
  } catch {
    return false;
  }
}

export async function deliverBlob({ blob, filename, title, text, preferShare = false }) {
  if (preferShare && navigator.share && navigator.canShare) {
    const file = new File([blob], filename, { type: blob.type || 'application/octet-stream' });
    if (navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title, text });
      return 'shared';
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
  return 'downloaded';
}
