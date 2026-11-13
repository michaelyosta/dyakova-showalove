/** Whiteboard mode zoom/pan, camera sync, vector grid, and SVG stroke controller. */

export const MIN_ZOOM = 0.4;
export const MAX_ZOOM = 6;
export const REF_H = 1000;

export function createBoardView({
  root,
  el,
  ink,
  camera,
  ctl,
  getMode,
  getTool,
  getColor,
  getStylusOnly,
  getSelectedSnap,
  onStrokeComplete,
  onUndo,
  onUpdateCounts,
  onViewChange,
}) {
  const boardView = { zoom: 1, cx: 0.5, cy: 0.5 };
  const activeTouches = new Map();
  let gesture = null;

  function cloneStrokes(strokes) {
    return typeof structuredClone === 'function'
      ? structuredClone(strokes || [])
      : JSON.parse(JSON.stringify(strokes || []));
  }

  function pointToSegDist(px, py, ax, ay, bx, by) {
    const dx = bx - ax;
    const dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    if (lenSq < 1e-8) return Math.hypot(px - ax, py - ay);
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
    return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
  }

  function strokeToPathD(stroke, refW, refH) {
    return stroke.points
      .map((p, i) => (i ? 'L' : 'M') + (p[0] * refW).toFixed(1) + ',' + (p[1] * refH).toFixed(1))
      .join(' ');
  }

  function createStrokePathEl(stroke, refW, refH) {
    const NS = 'http://www.w3.org/2000/svg';
    const path = document.createElementNS(NS, 'path');
    const d = strokeToPathD(stroke, refW, refH);
    Object.entries({
      d,
      fill: 'none',
      stroke: stroke.color === 'graphite' ? 'var(--tb-fg)' : `var(--tb-${stroke.color})`,
      'stroke-width': stroke.width,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
    }).forEach(([k, v]) => path.setAttribute(k, v));
    return { path, d };
  }

  const isDefaultBoardView = () =>
    Math.abs(boardView.zoom - 1) < 0.005 &&
    Math.abs(boardView.cx - 0.5) < 0.005 &&
    Math.abs(boardView.cy - 0.5) < 0.005;

  function getBoardMetrics(snapshot, useBoardView = true) {
    const w = el.clientWidth || 1;
    const H = el.clientHeight || 1;
    const r0 = (snapshot && snapshot.ratio) || w / H;
    const fitH = w / H >= r0 ? H : w / r0;
    const fitW = fitH * r0;
    const bv = useBoardView ? boardView : { zoom: 1, cx: 0.5, cy: 0.5 };
    const spanU = w / (fitW * bv.zoom);
    const spanV = H / (fitH * bv.zoom);
    const vx = bv.cx - spanU / 2;
    const vy = bv.cy - spanV / 2;
    return { w, H, r0, fitW, fitH, bv, spanU, spanV, vx, vy, refW: REF_H * r0, refH: REF_H };
  }

  function clampBoardView() {
    boardView.zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, boardView.zoom));
    boardView.cx = Math.max(-1.5, Math.min(2.5, boardView.cx));
    boardView.cy = Math.max(-1.5, Math.min(2.5, boardView.cy));
  }

  function resetBoardView() {
    boardView.zoom = 1;
    boardView.cx = 0.5;
    boardView.cy = 0.5;
  }

  function clearGesture() {
    gesture = null;
    activeTouches.clear();
  }

  function settle() {
    const damping = ctl.enableDamping;
    ctl.enableDamping = false;
    ctl.update();
    ctl.enableDamping = damping;
  }

  function captureSnapshot({ modelId, params, step, visible }) {
    return {
      modelId,
      params: { ...params },
      step,
      visible: [...visible],
      camera: {
        position: camera.position.toArray(),
        quaternion: camera.quaternion.toArray(),
        target: ctl.target.toArray(),
        up: camera.up.toArray(),
        zoom: camera.zoom,
        fov: camera.fov,
        near: camera.near,
        far: camera.far,
        aspect: camera.aspect,
        view: camera.view ? { ...camera.view } : null,
      },
      ratio: (el.clientWidth || 1) / (el.clientHeight || 1),
    };
  }

  function restoreCamera(snapshot, useBoardView = true) {
    const c = snapshot.camera;
    settle();
    camera.position.fromArray(c.position);
    ctl.target.fromArray(c.target);
    camera.up.fromArray(c.up);
    camera.zoom = c.zoom;
    camera.fov = c.fov;
    camera.near = c.near;
    camera.far = c.far;
    camera.aspect = c.aspect;

    const m = getBoardMetrics(snapshot, useBoardView);
    if (
      (c.view && c.view.enabled) ||
      Math.abs(m.bv.zoom - 1) > 1e-4 ||
      Math.abs(m.vx) > 1e-4 ||
      Math.abs(m.vy) > 1e-4 ||
      Math.abs(m.spanU - 1) > 1e-4 ||
      Math.abs(m.spanV - 1) > 1e-4
    ) {
      const baseLeft = c.view && c.view.enabled ? c.view.offsetX / c.view.fullWidth : 0;
      const baseTop = c.view && c.view.enabled ? c.view.offsetY / c.view.fullHeight : 0;
      const baseW = c.view && c.view.enabled ? c.view.width / c.view.fullWidth : 1;
      const baseH = c.view && c.view.enabled ? c.view.height / c.view.fullHeight : 1;
      const fullW = (m.fitW * m.bv.zoom) / baseW;
      const fullH = (m.fitH * m.bv.zoom) / baseH;
      camera.setViewOffset(
        fullW,
        fullH,
        (baseLeft + m.vx * baseW) * fullW,
        (baseTop + m.vy * baseH) * fullH,
        m.w,
        m.H
      );
    } else {
      camera.clearViewOffset();
    }
    camera.updateProjectionMatrix();
    settle();
    camera.quaternion.fromArray(c.quaternion);
    camera.updateMatrixWorld();
  }

  function syncInkViewBox() {
    const w = el.clientWidth;
    const H = el.clientHeight;
    if (!w || !H) return;
    const s = getSelectedSnap();
    const m = getBoardMetrics(s ? s.snapshot : null, true);
    ink.setAttribute(
      'viewBox',
      `${(m.vx * m.refW).toFixed(2)} ${(m.vy * m.refH).toFixed(2)} ${(m.spanU * m.refW).toFixed(2)} ${(m.spanV * m.refH).toFixed(2)}`
    );
    const dot = ink.querySelector('#tb-grid-dot');
    if (dot) {
      dot.setAttribute('r', Math.min(3.5, Math.max(0.7, 1.35 / Math.sqrt(boardView.zoom))).toFixed(2));
    }
  }

  function syncZoomUI() {
    const isInk = getMode() === 'ink';
    const z = boardView.zoom;
    const zOut = root.querySelector('[data-action=zoom-out]');
    const zReset = root.querySelector('[data-action=zoom-reset]');
    const zIn = root.querySelector('[data-action=zoom-in]');
    if (zOut) zOut.disabled = !isInk || z <= MIN_ZOOM + 0.001;
    if (zReset) {
      zReset.disabled = !isInk || isDefaultBoardView();
      zReset.textContent = `${Math.round(z * 100)}%`;
    }
    if (zIn) zIn.disabled = !isInk || z >= MAX_ZOOM - 0.001;
    ink.style.cursor = isInk
      ? getTool() === 'pan'
        ? gesture && gesture.kind === 'pan'
          ? 'grabbing'
          : 'grab'
        : 'crosshair'
      : '';
  }

  function applyBoardView() {
    const s = getSelectedSnap();
    if (getMode() === 'ink' && s) restoreCamera(s.snapshot, true);
    syncInkViewBox();
    syncZoomUI();
    onViewChange?.();
  }

  function zoomAt(nextZoom, sx, sy) {
    const s = getSelectedSnap();
    const m0 = getBoardMetrics(s ? s.snapshot : null, true);
    const ux = m0.vx + sx * m0.spanU;
    const uy = m0.vy + sy * m0.spanV;
    boardView.zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, nextZoom));
    const spanU1 = m0.w / (m0.fitW * boardView.zoom);
    const spanV1 = m0.H / (m0.fitH * boardView.zoom);
    boardView.cx = ux - (sx - 0.5) * spanU1;
    boardView.cy = uy - (sy - 0.5) * spanV1;
    clampBoardView();
    applyBoardView();
  }

  function syncHistoryButtons(s) {
    const isInk = getMode() === 'ink';
    const undoBtn = root.querySelector('[data-action=undo]');
    const redoBtn = root.querySelector('[data-action=redo]');
    const clearBtn = root.querySelector('[data-action=clear-strokes]');
    if (undoBtn) undoBtn.disabled = !isInk || !s || !s.history?.length;
    if (redoBtn) redoBtn.disabled = !isInk || !s || !s.redoHistory?.length;
    if (clearBtn) clearBtn.disabled = !isInk || !s || !s.strokes?.length;
  }

  function redrawInk() {
    const s = getSelectedSnap();
    const m = getBoardMetrics(s ? s.snapshot : null, true);
    const NS = 'http://www.w3.org/2000/svg';
    syncInkViewBox();
    ink.replaceChildren();

    if (getMode() === 'ink' && s) {
      const defs = document.createElementNS(NS, 'defs');
      const pat = document.createElementNS(NS, 'pattern');
      const dot = document.createElementNS(NS, 'circle');
      const rect = document.createElementNS(NS, 'rect');
      Object.entries({ id: 'tb-grid', width: 40, height: 40, patternUnits: 'userSpaceOnUse' }).forEach(
        ([k, v]) => pat.setAttribute(k, v)
      );
      Object.entries({
        id: 'tb-grid-dot',
        cx: 20,
        cy: 20,
        r: Math.min(3.5, Math.max(0.7, 1.35 / Math.sqrt(boardView.zoom))).toFixed(2),
        fill: 'currentColor',
        'fill-opacity': '.16',
      }).forEach(([k, v]) => dot.setAttribute(k, v));
      pat.append(dot);
      defs.append(pat);
      ink.append(defs);

      Object.entries({
        x: (-4 * m.refW).toFixed(1),
        y: (-4 * m.refH).toFixed(1),
        width: (9 * m.refW).toFixed(1),
        height: (9 * m.refH).toFixed(1),
        fill: 'url(#tb-grid)',
        'pointer-events': 'all',
      }).forEach(([k, v]) => rect.setAttribute(k, v));
      ink.append(rect);

      s.strokes.forEach((stroke) => {
        const { path } = createStrokePathEl(stroke, m.refW, m.refH);
        ink.append(path);
      });
    }

    syncHistoryButtons(s);
    onUpdateCounts();
  }

  const point = (e) => {
    const s = getSelectedSnap();
    const m = getBoardMetrics(s ? s.snapshot : null, true);
    const b = el.getBoundingClientRect();
    return [
      m.vx + ((e.clientX - b.left) / b.width) * m.spanU,
      m.vy + ((e.clientY - b.top) / b.height) * m.spanV,
    ];
  };

  function pushHistory(s, snapshotStrokes = cloneStrokes(s.strokes)) {
    s.history.push(snapshotStrokes);
    if (s.history.length > 100) s.history.shift();
    s.redoHistory = [];
  }

  function eraseAtPoint(s, p, radius, pendingEraseSnapshot) {
    if (!s || !s.strokes.length) return false;
    const m = getBoardMetrics(s.snapshot, true);
    const sx = m.fitW * boardView.zoom;
    const sy = m.fitH * boardView.zoom;
    const px = p[0] * sx;
    const py = p[1] * sy;
    let erased = false;
    for (let i = s.strokes.length - 1; i >= 0; i--) {
      const pts = s.strokes[i].points;
      if (!pts || !pts.length) continue;
      let hit = false;
      if (pts.length === 1) {
        hit = Math.hypot(px - pts[0][0] * sx, py - pts[0][1] * sy) < radius;
      } else {
        for (let j = 0; j < pts.length - 1; j++) {
          if (pointToSegDist(px, py, pts[j][0] * sx, pts[j][1] * sy, pts[j + 1][0] * sx, pts[j + 1][1] * sy) < radius) {
            hit = true;
            break;
          }
        }
      }
      if (hit) {
        if (!erased && pendingEraseSnapshot) {
          pushHistory(s, pendingEraseSnapshot);
        }
        s.strokes.splice(i, 1);
        erased = true;
      }
    }
    if (erased) redrawInk();
    return erased;
  }

  function startPinch() {
    const pts = [...activeTouches.values()];
    const s = getSelectedSnap();
    if (pts.length < 2 || !s) return;
    const b = el.getBoundingClientRect();
    if (!b.width || !b.height) return;
    const m = getBoardMetrics(s.snapshot, true);
    const p1 = pts[0];
    const p2 = pts[1];
    const dist = Math.max(10, Math.hypot(p2.x - p1.x, p2.y - p1.y));
    const mx = (p1.x + p2.x) / 2;
    const my = (p1.y + p2.y) / 2;
    const sx = (mx - b.left) / b.width;
    const sy = (my - b.top) / b.height;
    gesture = {
      kind: 'pinch',
      startDist: dist,
      startZoom: boardView.zoom,
      ux: m.vx + sx * m.spanU,
      uy: m.vy + sy * m.spanV,
    };
    syncZoomUI();
  }

  el.addEventListener(
    'wheel',
    (e) => {
      if (getMode() !== 'ink' || !getSelectedSnap()) return;
      e.preventDefault();
      const b = el.getBoundingClientRect();
      if (!b.width || !b.height) return;
      const sx = Math.max(0, Math.min(1, (e.clientX - b.left) / b.width));
      const sy = Math.max(0, Math.min(1, (e.clientY - b.top) / b.height));
      const factor = Math.exp(-e.deltaY * (e.deltaMode === 1 ? 0.06 : 0.0025));
      zoomAt(boardView.zoom * factor, sx, sy);
    },
    { passive: false }
  );

  ink.addEventListener('contextmenu', (e) => {
    if (getMode() === 'ink') e.preventDefault();
  });

  ink.addEventListener('pointerdown', (e) => {
    if (getMode() !== 'ink') return;
    const s = getSelectedSnap();
    if (!s) return;
    if (e.pointerType === 'touch') {
      // Palm rejection: никогда не прерываем активный штрих стилуса случайным касанием ладонью
      if (gesture && gesture.kind === 'draw' && gesture.pointerType === 'pen') return;
      e.preventDefault();
      activeTouches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (activeTouches.size >= 2) {
        try {
          ink.setPointerCapture(e.pointerId);
        } catch {}
        if (gesture && gesture.kind === 'draw' && gesture.pointerType === 'touch') {
          if (performance.now() - gesture.startedAt < 260 || gesture.moved < 24) {
            if (gesture.pushedHistory && s.history.length) {
              s.strokes = s.history.pop();
              redrawInk();
            }
          } else if (gesture.pushedHistory) {
            onStrokeComplete(s);
          }
        }
        startPinch();
        return;
      }
      if (getStylusOnly() && getTool() !== 'pan') return;
    }
    if (gesture && gesture.kind === 'pinch') return;
    if (!e.isPrimary && e.pointerType === 'touch') return;
    const panTrigger = getTool() === 'pan' || e.button === 1 || e.button === 2 || e.shiftKey;
    e.preventDefault();
    ink.setPointerCapture(e.pointerId);
    if (panTrigger) {
      gesture = { kind: 'pan', id: e.pointerId, snapId: s.id, lastX: e.clientX, lastY: e.clientY };
      syncZoomUI();
      return;
    }
    const p = point(e);
    const m = getBoardMetrics(s.snapshot, true);
    const tool = getTool();
    gesture = {
      kind: 'draw',
      tool,
      id: e.pointerId,
      snapId: s.id,
      pointerType: e.pointerType,
      startedAt: performance.now(),
      startX: e.clientX,
      startY: e.clientY,
      moved: 0,
      radius: e.pointerType === 'touch' ? 28 : 20,
      pushedHistory: false,
    };
    if (tool === 'pen') {
      pushHistory(s);
      gesture.pushedHistory = true;
      const stroke = {
        points: [p, [p[0] + 0.0001, p[1] + 0.0001]],
        color: getColor(),
        width: Math.max(0.8, (2.8 * REF_H) / (m.fitH * boardView.zoom)),
      };
      s.strokes.push(stroke);
      gesture.stroke = stroke;
      gesture.refW = m.refW;
      gesture.refH = m.refH;
      const { path, d } = createStrokePathEl(stroke, m.refW, m.refH);
      gesture.pathEl = path;
      gesture.pathD = d;
      ink.append(path);
      syncHistoryButtons(s);
      onUpdateCounts();
    } else {
      gesture.preEraseSnapshot = cloneStrokes(s.strokes);
      if (eraseAtPoint(s, p, gesture.radius, gesture.preEraseSnapshot)) {
        gesture.pushedHistory = true;
        gesture.preEraseSnapshot = null;
      }
    }
  });

  ink.addEventListener('pointermove', (e) => {
    if (getMode() !== 'ink') return;
    if (e.pointerType === 'touch' && activeTouches.has(e.pointerId)) {
      activeTouches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (gesture && gesture.kind === 'pinch' && activeTouches.size >= 2) {
        e.preventDefault();
        const s = getSelectedSnap();
        if (!s) return;
        const pts = [...activeTouches.values()];
        const p1 = pts[0];
        const p2 = pts[1];
        const b = el.getBoundingClientRect();
        if (!b.width || !b.height) return;
        const m0 = getBoardMetrics(s.snapshot, true);
        const dist = Math.max(10, Math.hypot(p2.x - p1.x, p2.y - p1.y));
        const mx = (p1.x + p2.x) / 2;
        const my = (p1.y + p2.y) / 2;
        const sx = (mx - b.left) / b.width;
        const sy = (my - b.top) / b.height;
        boardView.zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, gesture.startZoom * (dist / gesture.startDist)));
        const spanU = b.width / (m0.fitW * boardView.zoom);
        const spanV = b.height / (m0.fitH * boardView.zoom);
        boardView.cx = gesture.ux - (sx - 0.5) * spanU;
        boardView.cy = gesture.uy - (sy - 0.5) * spanV;
        clampBoardView();
        applyBoardView();
        return;
      }
    }
    const activeSnap = getSelectedSnap();
    if (!gesture || !activeSnap || gesture.id !== e.pointerId || gesture.snapId !== activeSnap.id) return;
    e.preventDefault();
    if (gesture.kind === 'pan') {
      const m = getBoardMetrics(activeSnap.snapshot, true);
      boardView.cx -= (e.clientX - gesture.lastX) / (m.fitW * boardView.zoom);
      boardView.cy -= (e.clientY - gesture.lastY) / (m.fitH * boardView.zoom);
      gesture.lastX = e.clientX;
      gesture.lastY = e.clientY;
      clampBoardView();
      applyBoardView();
      return;
    }
    if (gesture.kind !== 'draw') return;
    gesture.moved = Math.max(gesture.moved, Math.hypot(e.clientX - gesture.startX, e.clientY - gesture.startY));
    if (gesture.tool === 'eraser') {
      const p = point(e);
      if (eraseAtPoint(activeSnap, p, gesture.radius, gesture.pushedHistory ? null : gesture.preEraseSnapshot)) {
        gesture.pushedHistory = true;
        gesture.preEraseSnapshot = null;
      }
    } else if (gesture.stroke) {
      const events = typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents() : [e];
      const list = events.length ? events : [e];
      let appended = '';
      for (const v of list) {
        const pt = point(v);
        gesture.stroke.points.push(pt);
        appended += ` L${(pt[0] * gesture.refW).toFixed(1)},${(pt[1] * gesture.refH).toFixed(1)}`;
      }
      if (gesture.pathEl && appended) {
        gesture.pathD += appended;
        gesture.pathEl.setAttribute('d', gesture.pathD);
      } else {
        redrawInk();
      }
    }
  });

  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((type) =>
    ink.addEventListener(type, (e) => {
      if (e.pointerType === 'touch') activeTouches.delete(e.pointerId);
      if (!gesture) return;
      if (gesture.kind === 'pinch') {
        if (activeTouches.size < 2) {
          gesture = null;
          syncZoomUI();
        }
        return;
      }
      if (gesture.id === e.pointerId) {
        const shouldCommit = gesture.kind === 'draw' && gesture.pushedHistory;
        gesture = null;
        syncZoomUI();
        if (shouldCommit) {
          const s = getSelectedSnap();
          if (s) onStrokeComplete(s);
        }
      }
    })
  );

  ['pointerup', 'pointercancel'].forEach((type) =>
    window.addEventListener(type, (e) => {
      if (e.pointerType === 'touch') {
        activeTouches.delete(e.pointerId);
        if (gesture && gesture.kind === 'pinch' && activeTouches.size < 2) {
          gesture = null;
          syncZoomUI();
        }
      }
    })
  );

  root.querySelector('[data-action=zoom-in]').onclick = () => {
    if (getMode() !== 'ink') return;
    const next = boardView.zoom * 1.4;
    zoomAt(boardView.zoom < 0.98 && next > 0.95 && next < 1.05 ? 1 : next, 0.5, 0.5);
  };
  root.querySelector('[data-action=zoom-out]').onclick = () => {
    if (getMode() !== 'ink') return;
    const next = boardView.zoom / 1.4;
    zoomAt(boardView.zoom > 1.02 && next > 0.95 && next < 1.05 ? 1 : next, 0.5, 0.5);
  };
  root.querySelector('[data-action=zoom-reset]').onclick = () => {
    if (getMode() !== 'ink') return;
    resetBoardView();
    applyBoardView();
  };
  const undoBtn = root.querySelector('[data-action=undo]');
  if (undoBtn) {
    undoBtn.onclick = () => {
      const s = getSelectedSnap();
      if (s && s.history.length) {
        if (!Array.isArray(s.redoHistory)) s.redoHistory = [];
        s.redoHistory.push(cloneStrokes(s.strokes));
        if (s.redoHistory.length > 100) s.redoHistory.shift();
        s.strokes = s.history.pop();
        redrawInk();
        onUndo(s);
      }
    };
  }
  const redoBtn = root.querySelector('[data-action=redo]');
  if (redoBtn) {
    redoBtn.onclick = () => {
      const s = getSelectedSnap();
      if (s && s.redoHistory?.length) {
        s.history.push(cloneStrokes(s.strokes));
        if (s.history.length > 100) s.history.shift();
        s.strokes = s.redoHistory.pop();
        redrawInk();
        onUndo(s);
      }
    };
  }
  const clearBtn = root.querySelector('[data-action=clear-strokes]');
  if (clearBtn) {
    clearBtn.onclick = () => {
      const s = getSelectedSnap();
      if (s && s.strokes?.length) {
        pushHistory(s);
        s.strokes = [];
        redrawInk();
        onUndo(s);
      }
    };
  }

  return {
    getBoardMetrics,
    captureSnapshot,
    restoreCamera,
    resetBoardView,
    applyBoardView,
    syncInkViewBox,
    syncZoomUI,
    redrawInk,
    settle,
    clearGesture,
  };
}
