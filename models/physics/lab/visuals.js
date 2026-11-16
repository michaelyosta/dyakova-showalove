/** Shared 3D apparatus primitives, meters, bench oscilloscope, focus halo, and spatial 3D callout slides. */

const DARK_THEME = {
  bg: '#0c1322',
  panel: '#111b2e',
  card: '#162238',
  border: '#334155',
  accent: '#38bdf8',
  formulaBg: 'rgba(56, 189, 248, 0.14)',
  formulaText: '#7dd3fc',
  text: '#f1f5f9',
  muted: '#94a3b8',
  warnBg: 'rgba(245, 158, 11, 0.16)',
  warnBorder: '#f59e0b',
  warnText: '#fde68a',
  okBg: 'rgba(34, 197, 94, 0.18)',
  okBorder: '#22c55e',
  okText: '#bbf7d0',
  grid: '#26354d',
  axis: '#64748b',
};

const LIGHT_THEME = {
  bg: '#ffffff',
  panel: '#f8fafc',
  card: '#f1f5f9',
  border: '#cbd5e1',
  accent: '#0284c7',
  formulaBg: 'rgba(2, 132, 199, 0.10)',
  formulaText: '#0369a1',
  text: '#0f172a',
  muted: '#475569',
  warnBg: 'rgba(217, 119, 6, 0.12)',
  warnBorder: '#b45309',
  warnText: '#92400e',
  okBg: 'rgba(22, 163, 74, 0.12)',
  okBorder: '#15803d',
  okText: '#14532d',
  grid: '#e2e8f0',
  axis: '#64748b',
};

const LIGHT_READOUT_COLOR = {
  '#e2e8f0': '#0f172a',
  '#ffffff': '#0f172a',
  '#fbbf24': '#b45309',
  '#fdba74': '#c2410c',
  '#fed7aa': '#c2410c',
  '#67e8f9': '#0369a1',
  '#7dd3fc': '#0284c7',
  '#a5f3fc': '#0284c7',
  '#c4b5fd': '#6d28d9',
  '#fca5a5': '#b91c1c',
};

function roundRectPath(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w * 0.5, h * 0.5);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

function wrapLines(ctx, text, maxW, maxLines = 10) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean);
  const lines = [];
  let cur = '';
  for (const w of words) {
    const cand = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(cand).width <= maxW) {
      cur = cand;
    } else {
      if (cur) lines.push(cur);
      cur = w;
      if (lines.length >= maxLines - 1) break;
    }
  }
  if (cur && lines.length < maxLines) lines.push(cur);
  return lines;
}

function getSceneTheme(api, group) {
  let obj = group;
  while (obj?.parent) obj = obj.parent;
  return obj?.userData?.tbTheme === 'light' ? 'light' : 'dark';
}

function setupCanvasTexture(THREE, canvas) {
  const map = new THREE.CanvasTexture(canvas);
  if ('encoding' in map && THREE.sRGBEncoding !== undefined) {
    map.encoding = THREE.sRGBEncoding;
  }
  map.minFilter = THREE.LinearFilter;
  map.magFilter = THREE.LinearFilter;
  map.anisotropy = 4;
  return map;
}

export function wire(api, group, points, color, radius = 0.022) {
  const { THREE, V } = api;
  const vectors = points.map((p) => (Array.isArray(p) ? V(...p) : p));
  const curve = new THREE.CatmullRomCurve3(vectors, false, 'centripetal');
  const mesh = new THREE.Mesh(
    new THREE.TubeGeometry(curve, Math.min(1000, Math.max(64, points.length * 2)), radius, 6, false),
    new THREE.MeshStandardMaterial({ color, metalness: 0.35, roughness: 0.32 })
  );
  mesh.userData.exportTintRole = 'preserve';
  group.add(mesh);
  return curve;
}

export function coil(api, group, { axis = 'x', center = [0, 1, 0], radius = 0.52, length = 0.9, turns = 200, color = 0xd97706 }) {
  const { V } = api;
  const displayed = Math.min(36, Math.max(8, Math.round(Math.sqrt(turns) * 1.25)));
  const points = [];
  for (let i = 0; i <= displayed * 20; i++) {
    const u = i / (displayed * 20);
    const theta = u * displayed * Math.PI * 2;
    const a = (u - 0.5) * length;
    const b = radius * Math.cos(theta);
    const c = radius * Math.sin(theta);
    points.push(
      axis === 'x'
        ? V(center[0] + a, center[1] + b, center[2] + c)
        : V(center[0] + b, center[1] + a, center[2] + c)
    );
  }
  const curve = wire(api, group, points, color, 0.025);
  return { curve, start: points[0], end: points.at(-1), displayed };
}

export function chargeMarkers(api, group, curve, color, count = 12) {
  const markers = Array.from({ length: count }, () =>
    api.dot(group, api.V(0, 0, 0), color, 0.036, { unlit: true, role: 'preserve' })
  );
  const direction = api.arrow(group, color, 0.014, 0.055, 0.14);
  return { curve, markers, direction };
}

export function updateCharges(api, handle, displacement, current) {
  if (!handle) return;
  const active = Math.abs(current || 0) > 1e-7;
  handle.markers.forEach((m, i) => {
    m.visible = active;
    const u = ((i / handle.markers.length + displacement) % 1 + 1) % 1;
    m.position.copy(handle.curve.getPoint(u));
  });
  const u = 0.3;
  const p = handle.curve.getPoint(u);
  const tangent = handle.curve.getTangent(u);
  api.updateArrow(handle.direction, p, tangent.multiplyScalar(active ? Math.sign(current) * 0.35 : 0));
}

export function readout(api, group, position, color = '#e2e8f0', width = 1.25) {
  const { THREE, V } = api;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const map = setupCanvasTexture(THREE, canvas);
  const material = new THREE.SpriteMaterial({
    map,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
  material.addEventListener('dispose', () => map.dispose());
  const sprite = new THREE.Sprite(material);
  sprite.position.copy(V(...position));
  sprite.scale.set(width, width / 4, 1);
  sprite.renderOrder = 11;
  sprite.userData.exportTintRole = 'preserve';
  group.add(sprite);

  let lastText = '';
  let lastTheme = '';
  function draw(text, theme = getSceneTheme(api, group)) {
    lastText = text;
    lastTheme = theme;
    const isLight = theme === 'light';
    const fg = isLight ? LIGHT_READOUT_COLOR[String(color).toLowerCase()] || '#0f172a' : color;
    ctx.clearRect(0, 0, 512, 128);
    roundRectPath(ctx, 6, 8, 500, 112, 22);
    ctx.fillStyle = isLight ? 'rgba(255, 255, 255, 0.96)' : 'rgba(13, 19, 34, 0.92)';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = fg;
    ctx.stroke();
    ctx.fillStyle = fg;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `700 ${Math.min(46, Math.floor(730 / Math.max(1, text.length)))}px system-ui, -apple-system, sans-serif`;
    ctx.fillText(text, 256, 65);
    map.needsUpdate = true;
  }

  sprite.userData.onExportTheme = (t) => {
    if (lastText) draw(lastText, t);
  };

  return {
    sprite,
    set(text) {
      const th = getSceneTheme(api, group);
      if (lastText === text && lastTheme === th) return;
      draw(text, th);
    },
  };
}

export function galvanometer(api, group, center) {
  const { THREE, V } = api;
  api.studioBox(group, 1.24, 0.9, 0.28, center, 0x1e293b, { edgeColor: 0x64748b });

  const faceCanvas = document.createElement('canvas');
  faceCanvas.width = 512;
  faceCanvas.height = 360;
  const fCtx = faceCanvas.getContext('2d');
  const faceMap = setupCanvasTexture(THREE, faceCanvas);
  const faceMat = new THREE.MeshBasicMaterial({ map: faceMap, toneMapped: false });
  faceMat.addEventListener('dispose', () => faceMap.dispose());
  const face = new THREE.Mesh(new THREE.PlaneGeometry(1.12, 0.78), faceMat);
  face.position.set(center[0], center[1] + 0.01, center[2] + 0.146);
  face.userData.exportTintRole = 'preserve';
  group.add(face);

  let lastRangeLabel = '±1 мА';
  let lastFaceTheme = '';
  function drawFace(rangeLabel, theme = getSceneTheme(api, group)) {
    lastRangeLabel = rangeLabel;
    lastFaceTheme = theme;
    const isLight = theme === 'light';
    fCtx.clearRect(0, 0, 512, 360);
    fCtx.fillStyle = isLight ? '#f8fafc' : '#0f172a';
    fCtx.fillRect(0, 0, 512, 360);
    fCtx.strokeStyle = isLight ? '#94a3b8' : '#334155';
    fCtx.lineWidth = 6;
    fCtx.strokeRect(4, 4, 504, 352);

    const cx = 256;
    const cy = 278;
    const r = 190;
    fCtx.strokeStyle = isLight ? '#64748b' : '#475569';
    fCtx.lineWidth = 4;
    fCtx.beginPath();
    fCtx.arc(cx, cy, r, -Math.PI * 0.5 - 0.94, -Math.PI * 0.5 + 0.94);
    fCtx.stroke();

    for (let i = -4; i <= 4; i++) {
      const a = -Math.PI * 0.5 + i * 0.23;
      const inner = i === 0 ? r - 24 : r - 16;
      fCtx.strokeStyle = i === 0 ? (isLight ? '#0284c7' : '#38bdf8') : (isLight ? '#334155' : '#cbd5e1');
      fCtx.lineWidth = i === 0 ? 5 : 3;
      fCtx.beginPath();
      fCtx.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
      fCtx.lineTo(cx + Math.cos(a) * (r + 12), cy + Math.sin(a) * (r + 12));
      fCtx.stroke();
    }

    fCtx.fillStyle = isLight ? '#b91c1c' : '#fca5a5';
    fCtx.font = '700 40px system-ui, sans-serif';
    fCtx.textAlign = 'center';
    fCtx.textBaseline = 'middle';
    fCtx.fillText('−', 94, 134);
    fCtx.fillStyle = isLight ? '#0f172a' : '#e2e8f0';
    fCtx.fillText('0', cx, 52);
    fCtx.fillStyle = isLight ? '#15803d' : '#86efac';
    fCtx.fillText('+', 418, 134);

    fCtx.fillStyle = isLight ? '#475569' : '#94a3b8';
    fCtx.font = '600 24px system-ui, sans-serif';
    fCtx.fillText('ГАЛЬВАНОМЕТР', cx, 206);
    fCtx.fillStyle = isLight ? '#b45309' : '#fbbf24';
    fCtx.font = '700 26px system-ui, sans-serif';
    fCtx.fillText(rangeLabel, cx, 322);
    faceMap.needsUpdate = true;
  }

  face.userData.onExportTheme = (t) => drawFace(lastRangeLabel, t);
  drawFace('±1 мА', getSceneTheme(api, group));

  const origin = V(center[0], center[1] - 0.22, center[2] + 0.162);
  api.dot(group, origin, 0xe2e8f0, 0.03, { role: 'preserve' });
  const needle = new THREE.Group();
  needle.position.copy(origin);
  group.add(needle);
  api.seg(needle, V(0, 0, 0), V(0, 0.42, 0), 0.015, 0xfb7185, { role: 'preserve', unlit: true });

  const text = readout(api, group, [center[0], center[1] - 0.62, center[2] + 0.14], '#fbbf24', 1.06);
  return {
    needle,
    text,
    setRange(rangeLabel) {
      const th = getSceneTheme(api, group);
      if (lastRangeLabel !== rangeLabel || lastFaceTheme !== th) {
        drawFace(rangeLabel, th);
      }
    },
  };
}

const fmtTick = (v) => {
  const a = Math.abs(v);
  if (a < 1e-6) return '0';
  if (a < 0.1) return v.toPrecision(2);
  if (a < 10) return v.toFixed(1);
  return v.toFixed(0);
};

export function drawOscilloscopeCanvas(ctx, x, y, w, h, opts) {
  const {
    traces = [],
    time = 0,
    span = 1,
    units = 'В',
    title = 'Осциллограф',
    note = '',
    splitScale = false,
    theme = 'dark',
    compact = false,
  } = opts || {};
  const pal = theme === 'light' ? LIGHT_THEME : DARK_THEME;
  const padL = splitScale && traces.length > 1 ? (compact ? 68 : 74) : compact ? 70 : 78;
  const padR = splitScale && traces.length > 1 ? (compact ? 68 : 74) : compact ? 12 : 20;
  const padT = compact ? 36 : 46;
  const padB = compact ? 26 : 34;
  const gx = x + padL;
  const gy = y + padT;
  const gw = Math.max(40, w - padL - padR);
  const gh = Math.max(36, h - padT - padB);
  const midY = gy + gh / 2;

  roundRectPath(ctx, x, y, w, h, 12);
  ctx.fillStyle = pal.panel;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = pal.border;
  ctx.stroke();

  ctx.fillStyle = pal.text;
  ctx.font = compact ? '700 20px system-ui, sans-serif' : '700 20px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, x + 12, y + (compact ? 19 : 23), w - 140);

  let lx = x + w - 12;
  ctx.textAlign = 'right';
  ctx.font = compact ? '700 18px system-ui, sans-serif' : '600 18px system-ui, sans-serif';
  for (let i = traces.length - 1; i >= 0; i--) {
    const tr = traces[i];
    const lbl = tr.label || '';
    const color = theme === 'light' ? LIGHT_READOUT_COLOR[String(tr.color).toLowerCase()] || tr.color : tr.color;
    ctx.fillStyle = color;
    ctx.fillText(lbl, lx, y + (compact ? 19 : 23));
    lx -= ctx.measureText(lbl).width + 14;
  }

  ctx.strokeStyle = pal.grid;
  ctx.lineWidth = 1.2;
  for (let i = 0; i <= 4; i++) {
    const px = gx + (gw * i) / 4;
    ctx.beginPath();
    ctx.moveTo(px, gy);
    ctx.lineTo(px, gy + gh);
    ctx.stroke();
  }
  ctx.strokeStyle = pal.axis;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(gx, gy);
  ctx.lineTo(gx, gy + gh);
  ctx.moveTo(gx, midY);
  ctx.lineTo(gx + gw, midY);
  ctx.stroke();

  const sharedMax =
    Math.max(0.01, ...traces.flatMap((t) => (t.values || []).map((p) => Math.abs(p[1])))) * 1.12;
  const maxes = traces.map((tr) =>
    splitScale && traces.length > 1
      ? Math.max(0.01, ...(tr.values || []).map((p) => Math.abs(p[1]))) * 1.14
      : sharedMax
  );

  const start = time - span;
  const mapX = (t) => gx + ((t - start) / Math.max(1e-9, span)) * gw;

  ctx.font = compact ? '600 18px system-ui, sans-serif' : '600 16px system-ui, sans-serif';
  const leftColor = splitScale && traces.length > 1
    ? (theme === 'light' ? LIGHT_READOUT_COLOR[String(traces[0].color).toLowerCase()] || traces[0].color : traces[0].color)
    : pal.muted;
  ctx.fillStyle = leftColor;
  ctx.textAlign = 'right';
  ctx.fillText(`+${fmtTick(maxes[0])} ${units}`, gx - 6, gy + 8);
  ctx.fillStyle = pal.muted;
  ctx.fillText('0', gx - 6, midY);
  ctx.fillStyle = leftColor;
  ctx.fillText(`−${fmtTick(maxes[0])}`, gx - 6, gy + gh - 6);

  if (splitScale && traces.length > 1) {
    const rc = theme === 'light' ? LIGHT_READOUT_COLOR[String(traces[1].color).toLowerCase()] || traces[1].color : traces[1].color;
    ctx.fillStyle = rc;
    ctx.textAlign = 'left';
    ctx.fillText(`+${fmtTick(maxes[1])} ${units}`, gx + gw + 6, gy + 8);
    ctx.fillText(`−${fmtTick(maxes[1])}`, gx + gw + 6, gy + gh - 6);
  }

  traces.forEach((tr, idx) => {
    const pts = tr.values || [];
    if (!pts.length) return;
    const m = maxes[idx];
    const mapY = (v) => midY - (v / m) * (gh * 0.48);
    const col = theme === 'light' ? LIGHT_READOUT_COLOR[String(tr.color).toLowerCase()] || tr.color : tr.color;
    ctx.save();
    ctx.beginPath();
    ctx.rect(gx, gy, gw, gh);
    ctx.clip();
    ctx.strokeStyle = col;
    ctx.lineWidth = 3.2;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    pts.forEach(([t, v], i) => {
      const px = mapX(t);
      const py = mapY(v);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.stroke();
    const last = pts.at(-1);
    if (last) {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(mapX(last[0]), mapY(last[1]), 4.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  });

  if (note) {
    ctx.fillStyle = pal.muted;
    ctx.font = compact ? '500 17px system-ui, sans-serif' : '500 16px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(note, gx, y + h - 12, gw + padR - 10);
  }
}

export function scopeSvg({ traces, time, title = 'Осциллограф', note = '', span = 1, units = 'В' }) {
  const W = 620;
  const H = 182;
  const left = 57;
  const right = 603;
  const top = 33;
  const bottom = 148;
  const middle = (top + bottom) / 2;
  const max = Math.max(0.01, ...traces.flatMap((t) => t.values.map((p) => Math.abs(p[1])))) * 1.12;
  const start = time - span;
  const X = (t) => left + ((t - start) / span) * (right - left);
  const Y = (v) => middle - (v / max) * ((bottom - top) / 2);
  const paths = traces
    .map(
      (tr) =>
        `<path d="${tr.values
          .map(([t, v], i) => `${i ? 'L' : 'M'}${X(t).toFixed(1)},${Y(v).toFixed(1)}`)
          .join(' ')}" stroke="${tr.color}" stroke-width="2.4" fill="none"/>`
    )
    .join('');
  const grid = [0, 0.25, 0.5, 0.75, 1]
    .map((f) => `<path d="M${left + f * (right - left)} ${top}V${bottom}" stroke="#334155" stroke-width=".6"/>`)
    .join('');
  return `<svg role="img" aria-label="${title}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" rx="10" fill="#0f172a"/>
    <text x="14" y="20" fill="#e2e8f0" font-size="12">${title}</text>
    ${traces.map((tr, i) => `<text x="${340 + i * 125}" y="20" fill="${tr.color}" font-size="12">${tr.label}</text>`).join('')}
    ${grid}<path d="M${left} ${top}V${bottom}H${right}M${left} ${middle}H${right}" stroke="#64748b" fill="none"/>
    <text x="4" y="${top + 8}" fill="#94a3b8" font-size="10">+${fmtTick(max)} ${units}</text><text x="26" y="${middle + 4}" fill="#94a3b8" font-size="10">0</text>
    <text x="4" y="${bottom}" fill="#94a3b8" font-size="10">−${fmtTick(max)}</text>${paths}
    <text x="${left}" y="171" fill="#94a3b8" font-size="10">${note || `${span.toFixed(3)} с · окно до t = ${time.toFixed(3)} с`}</text></svg>`;
}

/** Render crisp HiDPI oscilloscope plots onto a compact HUD overlay canvas. */
export function paintOscilloscopeOverlay(canvas, payload) {
  if (!canvas || !payload) return;
  const scopes = payload.scopes || [];
  const CW = 540;
  const CH = scopes.length > 1 ? 304 : 184;
  const sig = `${scopes.length}|${payload.signature || ''}`;
  if (canvas.width !== CW || canvas.height !== CH) {
    canvas.width = CW;
    canvas.height = CH;
    canvas._tbScopeSig = '';
  }
  if (sig === canvas._tbScopeSig) return;
  canvas._tbScopeSig = sig;

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, CW, CH);
  if (scopes.length === 1) {
    drawOscilloscopeCanvas(ctx, 0, 0, CW, CH, { ...scopes[0], compact: true });
  } else if (scopes.length >= 2) {
    const gap = 8;
    const sh = Math.floor((CH - gap) / 2);
    drawOscilloscopeCanvas(ctx, 0, 0, CW, sh, { ...scopes[0], compact: true });
    drawOscilloscopeCanvas(ctx, 0, sh + gap, CW, sh, { ...scopes[1], compact: true });
  }
}

/** Smoothly animated 3D focus ring around the active part highlighted by a presentation slide. */
export function focusHighlight3D(api, group) {
  const { THREE } = api;
  const root = new THREE.Group();
  root.visible = false;
  group.add(root);

  const innerMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.9, toneMapped: false });
  const outerMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.34, toneMapped: false });
  const inner = new THREE.Mesh(new THREE.TorusGeometry(1, 0.022, 12, 48), innerMat);
  const outer = new THREE.Mesh(new THREE.TorusGeometry(1.13, 0.012, 10, 48), outerMat);
  inner.userData.exportTintRole = 'preserve';
  outer.userData.exportTintRole = 'preserve';
  root.add(inner, outer);

  const curPos = new THREE.Vector3();
  const dstPos = new THREE.Vector3();
  let curRad = 0.65;
  let dstRad = 0.65;
  let pulse = 0;

  root.onBeforeRender = (_r, _s, cam) => {
    if (!cam) return;
    root.quaternion.copy(cam.quaternion);
    root.updateMatrixWorld(true);
  };

  return {
    root,
    setTarget(anchor, radius = 0.68, colorHex = 0x38bdf8, show = true) {
      root.visible = show;
      if (!show || !anchor) return;
      if (curPos.lengthSq() === 0 && dstPos.lengthSq() === 0) {
        curPos.set(...anchor);
        curRad = radius;
        root.position.copy(curPos);
        inner.scale.setScalar(curRad);
        outer.scale.setScalar(curRad);
      }
      dstPos.set(...anchor);
      dstRad = radius;
      innerMat.color.setHex(colorHex);
      outerMat.color.setHex(colorHex);
    },
    tick(dt) {
      if (!root.visible) return false;
      const moveD = curPos.distanceTo(dstPos);
      const k = Math.min(1, dt * 8);
      curPos.lerp(dstPos, k);
      curRad += (dstRad - curRad) * k;
      pulse = (pulse + dt * 2.2) % (Math.PI * 2);
      const breathe = 1 + Math.sin(pulse) * 0.035;
      root.position.copy(curPos);
      inner.scale.setScalar(curRad * breathe);
      outer.scale.setScalar(curRad * (1 + (breathe - 1) * 1.4));
      return moveD > 0.008 || Math.abs(dstRad - curRad) > 0.005;
    },
  };
}

/** Spatial 3D callout card with 3D leader arrow tethered directly to the highlighted apparatus part. */
export function spatialCallout3D(api, group) {
  const { THREE } = api;
  const root = new THREE.Group();
  root.visible = false;
  group.add(root);

  const cardRoot = new THREE.Group();
  root.add(cardRoot);

  const CARD_W = 1.98;
  const CARD_H = 1.06;
  const CW = 1024;
  const CH = 550;
  const canvas = document.createElement('canvas');
  canvas.width = CW;
  canvas.height = CH;
  const ctx = canvas.getContext('2d');
  const tex = setupCanvasTexture(THREE, canvas);
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false, toneMapped: false });
  mat.addEventListener('dispose', () => tex.dispose());
  const cardMesh = new THREE.Mesh(new THREE.PlaneGeometry(CARD_W, CARD_H), mat);
  cardMesh.renderOrder = 14;
  cardMesh.userData.exportTintRole = 'preserve';
  cardRoot.add(cardMesh);

  // 3D leader arrow shaft + cone + target bead connecting card edge cleanly to focused part rim
  const leaderMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.96, depthTest: false, toneMapped: false });
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1, 12), leaderMat);
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.082, 0.23, 16), leaderMat);
  const tipBead = new THREE.Mesh(new THREE.SphereGeometry(0.048, 12, 12), leaderMat);
  shaft.userData.exportTintRole = 'preserve';
  cone.userData.exportTintRole = 'preserve';
  tipBead.userData.exportTintRole = 'preserve';
  shaft.renderOrder = 13;
  cone.renderOrder = 13;
  tipBead.renderOrder = 13;
  root.add(shaft, cone, tipBead);

  const UP = new THREE.Vector3(0, 1, 0);
  const curCard = new THREE.Vector3();
  const dstCard = new THREE.Vector3();
  const curAnchor = new THREE.Vector3();
  const dstAnchor = new THREE.Vector3();
  const invQuat = new THREE.Quaternion();
  const localDir = new THREE.Vector3();
  let curHalo = 0.65;
  let dstHalo = 0.65;
  let curOpacity = 1;
  let transTime = 1;
  let lastKey = '';
  let lastSig = '';
  let lastPayload = null;
  let hitZones = [];

  function syncLeader() {
    const start = curCard.clone();
    const anchor = curAnchor.clone();
    const raw = anchor.clone().sub(start);
    const fullLen = raw.length();
    if (fullLen < 0.35) {
      shaft.visible = false;
      cone.visible = false;
      tipBead.visible = false;
      return;
    }
    const dir = raw.clone().normalize();
    // Compute exact exit point on the camera-aligned card rectangle boundary.
    invQuat.copy(cardRoot.quaternion).invert();
    localDir.copy(dir).applyQuaternion(invQuat);
    const halfW = CARD_W * cardMesh.scale.x * 0.5;
    const halfH = CARD_H * cardMesh.scale.y * 0.5;
    const tx = Math.abs(localDir.x) > 1e-4 ? halfW / Math.abs(localDir.x) : 1e9;
    const ty = Math.abs(localDir.y) > 1e-4 ? halfH / Math.abs(localDir.y) : 1e9;
    const cardExit = Math.min(fullLen * 0.65, Math.min(tx, ty) + 0.04);

    // Stop arrow tip cleanly on the outer focus halo rim so the pointer stands out unobstructed.
    const rimPullback = Math.min(Math.max(0.18, fullLen - cardExit - 0.34), Math.max(0.24, curHalo * 0.72));
    const end = anchor.clone().addScaledVector(dir, -Math.max(0.16, rimPullback));
    const from = start.clone().addScaledVector(dir, cardExit);
    const vec = end.clone().sub(from);
    const total = vec.length();
    if (total < 0.14) {
      shaft.visible = false;
      cone.visible = false;
      tipBead.visible = true;
      tipBead.position.copy(end);
      return;
    }

    const coneLen = 0.23;
    const stemLen = Math.max(0.02, total - coneLen);
    shaft.visible = total > coneLen + 0.04;
    cone.visible = true;
    tipBead.visible = true;

    if (shaft.visible) {
      shaft.scale.set(1, stemLen, 1);
      shaft.position.copy(from).addScaledVector(dir, stemLen * 0.5);
      shaft.quaternion.setFromUnitVectors(UP, dir);
    }
    cone.position.copy(end).addScaledVector(dir, -coneLen * 0.5);
    cone.quaternion.setFromUnitVectors(UP, dir);
    tipBead.position.copy(end);
  }

  cardMesh.onBeforeRender = (_r, _s, cam) => {
    if (!cam) return;
    cardRoot.quaternion.copy(cam.quaternion);
    cardRoot.updateMatrixWorld(true);
    syncLeader();
  };

  function paint(payload, theme = getSceneTheme(api, group)) {
    lastPayload = payload;
    const pal = theme === 'light' ? LIGHT_THEME : DARK_THEME;
    const accent = theme === 'light' ? LIGHT_READOUT_COLOR[payload.accentHex] || pal.accent : payload.accentHex || pal.accent;
    hitZones = [];

    ctx.clearRect(0, 0, CW, CH);
    roundRectPath(ctx, 4, 4, CW - 8, CH - 8, 26);
    ctx.fillStyle = theme === 'light' ? 'rgba(255, 255, 255, 0.96)' : 'rgba(11, 18, 33, 0.93)';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = accent;
    ctx.stroke();

    // Header pill + slide nav arrows
    roundRectPath(ctx, 22, 20, 250, 44, 12);
    ctx.fillStyle = theme === 'light' ? '#e0f2fe' : 'rgba(56, 189, 248, 0.16)';
    ctx.fill();
    ctx.fillStyle = accent;
    ctx.font = '700 22px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(payload.badge || 'СЛАЙД', 147, 42, 230);

    if (payload.nav) {
      const drawNav = (nx, sym, enabled, act) => {
        roundRectPath(ctx, nx, 20, 56, 44, 12);
        ctx.fillStyle = pal.card;
        ctx.fill();
        ctx.strokeStyle = enabled ? accent : pal.border;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = enabled ? pal.text : pal.muted;
        ctx.font = '700 28px system-ui, sans-serif';
        ctx.fillText(sym, nx + 28, 41);
        if (enabled) hitZones.push({ x: nx, y: 20, w: 56, h: 44, action: act });
      };
      drawNav(CW - 142, '‹', payload.nav.canPrev, payload.nav.prevAction);
      drawNav(CW - 76, '›', payload.nav.canNext, payload.nav.nextAction);
    }

    if (payload.quiz) {
      const q = payload.quiz;
      ctx.fillStyle = pal.text;
      ctx.font = '700 27px system-ui, sans-serif';
      ctx.textAlign = 'left';
      const qLines = wrapLines(ctx, `${q.index + 1}. ${q.question}`, CW - 56, 2);
      qLines.forEach((l, i) => ctx.fillText(l, 28, 96 + i * 34));

      let oy = 98 + qLines.length * 36 + 8;
      q.options.forEach((opt, i) => {
        const selected = q.selected === i;
        const ok = i === q.answer;
        const oh = 68;
        roundRectPath(ctx, 26, oy, CW - 52, oh, 14);
        ctx.fillStyle = selected ? (ok ? pal.okBg : pal.warnBg) : pal.card;
        ctx.fill();
        ctx.strokeStyle = selected ? (ok ? pal.okBorder : pal.warnBorder) : pal.border;
        ctx.lineWidth = selected ? 3 : 2;
        ctx.stroke();

        const letter = ['А', 'Б', 'В'][i] || String(i + 1);
        ctx.fillStyle = selected ? (ok ? pal.okBorder : pal.warnBorder) : accent;
        ctx.font = '700 24px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(letter, 58, oy + oh / 2);

        ctx.fillStyle = pal.text;
        ctx.font = '600 23px system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(opt, 90, oy + oh / 2, CW - 134);
        hitZones.push({ x: 26, y: oy, w: CW - 52, h: oh, action: { type: 'quizAnswer', qIndex: q.index, optIndex: i } });
        oy += oh + 12;
      });

      if (q.selected >= 0) {
        const ok = q.selected === q.answer;
        roundRectPath(ctx, 26, oy + 4, CW - 52, CH - oy - 22, 12);
        ctx.fillStyle = ok ? pal.okBg : pal.warnBg;
        ctx.fill();
        ctx.fillStyle = ok ? pal.okText : pal.warnText;
        ctx.font = '600 22px system-ui, sans-serif';
        wrapLines(ctx, `${ok ? 'Верно.' : 'Попробуйте ещё.'} ${q.explanation}`, CW - 84, 3).forEach((l, li) =>
          ctx.fillText(l, 42, oy + 28 + li * 28)
        );
      }
      tex.needsUpdate = true;
      return;
    }

    // Title
    ctx.fillStyle = pal.text;
    ctx.font = '700 36px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(payload.title || '', 28, 100, payload.nav ? CW - 190 : CW - 56);

    // Highlighted Formula Pill
    if (payload.formula) {
      roundRectPath(ctx, 26, 134, CW - 52, 74, 14);
      ctx.fillStyle = pal.formulaBg;
      ctx.fill();
      ctx.strokeStyle = accent;
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.fillStyle = theme === 'light' ? pal.formulaText : accent;
      ctx.font = '700 38px system-ui, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(payload.formula, CW / 2, 172, CW - 84);
    }

    // Concise insight explanation
    ctx.fillStyle = pal.text;
    ctx.font = '500 31px system-ui, sans-serif';
    ctx.textAlign = 'left';
    const expY = payload.formula ? 244 : 162;
    wrapLines(ctx, payload.explanation || '', CW - 60, 4).forEach((l, i) => ctx.fillText(l, 30, expY + i * 42));

    // Bottom focused live metric bar
    if (payload.metric) {
      roundRectPath(ctx, 26, CH - 84, CW - 52, 60, 14);
      ctx.fillStyle = pal.card;
      ctx.fill();
      ctx.strokeStyle = pal.border;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = pal.muted;
      ctx.font = '600 24px system-ui, sans-serif';
      ctx.fillText(payload.metricLabel || 'Показания', 46, CH - 54);
      ctx.fillStyle = theme === 'light' ? '#b45309' : '#fef3c7';
      ctx.font = '700 30px system-ui, monospace';
      ctx.textAlign = 'right';
      ctx.fillText(payload.metric, CW - 46, CH - 54, CW - 280);
    }
    tex.needsUpdate = true;
  }

  cardMesh.userData.onCanvasClick = (uv) => {
    if (!uv || !hitZones.length) return null;
    const px = uv.x * CW;
    const py = (1 - uv.y) * CH;
    const hit = hitZones.find((z) => px >= z.x && px <= z.x + z.w && py >= z.y && py <= z.y + z.h);
    return hit ? hit.action : null;
  };
  cardMesh.userData.onExportTheme = (t) => {
    if (lastPayload) paint(lastPayload, t);
  };

  return {
    root,
    update(payload) {
      const show = Boolean(payload && payload.visible !== false);
      root.visible = show;
      if (!show) {
        lastKey = '';
        return;
      }

      const th = getSceneTheme(api, group);
      const isQuiz = Boolean(payload.quiz);
      cardMesh.scale.set(isQuiz ? 1.08 : 1, isQuiz ? 1.18 : 1, 1);

      const nextCard = payload.cardPos || [0, 2.05, 0];
      const nextAnchor = payload.anchorPos || [0, 1.0, 0];
      const nextHalo = payload.haloRadius ?? 0.65;
      const key = payload.slideKey || '';

      if (!lastKey || !key) {
        curCard.set(...nextCard);
        curAnchor.set(...nextAnchor);
        curHalo = nextHalo;
        cardRoot.position.copy(curCard);
      }
      dstCard.set(...nextCard);
      dstAnchor.set(...nextAnchor);
      dstHalo = nextHalo;

      const accentNum = typeof payload.accent === 'number' ? payload.accent : 0x38bdf8;
      leaderMat.color.setHex(accentNum);

      if (lastKey && key && key !== lastKey) {
        const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        transTime = reduced ? 1 : 0;
      }
      lastKey = key;

      const sig = `${key}|${th}|${payload.signature || ''}`;
      if (sig !== lastSig) {
        lastSig = sig;
        paint(payload, th);
      }
      syncLeader();
    },
    tick(dt) {
      if (!root.visible) return false;
      const moveD = curCard.distanceTo(dstCard) + curAnchor.distanceTo(dstAnchor) + Math.abs(dstHalo - curHalo);
      const k = Math.min(1, dt * 8.5);
      curCard.lerp(dstCard, k);
      curAnchor.lerp(dstAnchor, k);
      curHalo += (dstHalo - curHalo) * k;
      cardRoot.position.copy(curCard);

      if (transTime < 1) {
        transTime = Math.min(1, transTime + dt / 0.34);
      }
      curOpacity = 0.25 + 0.75 * (1 - Math.pow(1 - transTime, 2));
      mat.opacity = curOpacity;
      leaderMat.opacity = 0.92 * curOpacity;
      syncLeader();
      return moveD > 0.008 || transTime < 1;
    },
  };
}
