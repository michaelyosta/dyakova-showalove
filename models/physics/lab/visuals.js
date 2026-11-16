/** Shared apparatus primitives. Geometry is schematic; counters give actual turns. */
export function wire(api, group, points, color, radius = 0.022) {
  const { THREE, V } = api;
  const vectors = points.map(p => Array.isArray(p) ? V(...p) : p);
  const curve = new THREE.CatmullRomCurve3(vectors, false, 'centripetal');
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.min(1000, Math.max(64, points.length * 2)), radius, 6, false),
    new THREE.MeshStandardMaterial({ color, metalness: 0.35, roughness: 0.32 }));
  mesh.userData.exportTintRole = 'preserve'; group.add(mesh);
  return curve;
}
export function coil(api, group, { axis = 'x', center = [0, 1, 0], radius = 0.52, length = 0.9, turns = 200, color = 0xd97706 }) {
  const { V } = api;
  const displayed = Math.min(36, Math.max(8, Math.round(Math.sqrt(turns) * 1.25)));
  const points = [];
  for (let i = 0; i <= displayed * 20; i++) {
    const u = i / (displayed * 20), theta = u * displayed * Math.PI * 2;
    const a = (u - 0.5) * length, b = radius * Math.cos(theta), c = radius * Math.sin(theta);
    points.push(axis === 'x' ? V(center[0] + a, center[1] + b, center[2] + c) : V(center[0] + b, center[1] + a, center[2] + c));
  }
  // One continuous wire, not disconnected rings.
  const curve = wire(api, group, points, color, 0.026);
  return { curve, start: points[0], end: points.at(-1) };
}
export function chargeMarkers(api, group, curve, color, count = 12) {
  const markers = Array.from({ length: count }, (_, i) => api.dot(group, api.V(0, 0, 0), color, 0.036, { unlit: true, role: 'preserve' }));
  const direction = api.arrow(group, color, 0.014, 0.055, 0.14);
  return { curve, markers, direction };
}
export function updateCharges(api, handle, displacement, current) {
  if (!handle) return;
  handle.markers.forEach((m, i) => {
    m.visible = Math.abs(current || 0) > 1e-7;
    const u = ((i / handle.markers.length + displacement) % 1 + 1) % 1;
    m.position.copy(handle.curve.getPoint(u));
  });
  const u = 0.3, p = handle.curve.getPoint(u), tangent = handle.curve.getTangent(u);
  api.updateArrow(handle.direction, p, tangent.multiplyScalar(Math.abs(current || 0) > 1e-7 ? Math.sign(current) * 0.35 : 0));
}
export function readout(api, group, position, color = '#e2e8f0', width = 1.25) {
  const { THREE, V } = api;
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const map = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map, depthTest: false, depthWrite: false, toneMapped: false });
  material.addEventListener('dispose', () => map.dispose());
  const sprite = new THREE.Sprite(material); sprite.position.copy(V(...position)); sprite.scale.set(width, width / 4, 1);
  sprite.renderOrder = 11; sprite.userData.exportTintRole = 'preserve'; group.add(sprite);
  let last = '';
  return { set(text) {
    if (last === text) return; last = text;
    ctx.clearRect(0, 0, 512, 128); ctx.fillStyle = '#111827'; ctx.fillRect(2, 2, 508, 124);
    ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.strokeRect(3, 3, 506, 122);
    ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `600 ${Math.min(46, Math.floor(750 / Math.max(1, text.length)))}px system-ui`; ctx.fillText(text, 256, 65);
    map.needsUpdate = true;
  } };
}
export function galvanometer(api, group, center) {
  const { THREE, V } = api;
  api.studioBox(group, 1.25, 0.85, 0.3, center, 0x1e293b, { edgeColor: 0x64748b });
  const origin = V(center[0], center[1] - 0.22, center[2] + 0.18);
  for (let i = -4; i <= 4; i++) {
    const a = i * 0.23;
    api.seg(group, origin.clone().add(V(Math.sin(a) * 0.53, Math.cos(a) * 0.53, 0)), origin.clone().add(V(Math.sin(a) * 0.58, Math.cos(a) * 0.58, 0)), 0.009, 0xcbd5e1);
  }
  api.label('−      0      +', V(center[0], center[1] + 0.23, center[2] + 0.2), group, { scale: 0.6 });
  const needle = new THREE.Group(); needle.position.copy(origin); group.add(needle);
  api.seg(needle, V(0, 0, 0), V(0, 0.48, 0), 0.014, 0xfb7185);
  return { needle, text: readout(api, group, [center[0], center[1] - 0.55, center[2]], '#fbbf24', 1.4) };
}

export function scopeSvg({ traces, time, title = 'Осциллограф', note = '', span = 1, units = 'В' }) {
  const W = 620, H = 182, left = 57, right = 603, top = 33, bottom = 148, middle = (top + bottom) / 2;
  const max = Math.max(0.01, ...traces.flatMap(t => t.values.map(p => Math.abs(p[1])))) * 1.12;
  const start = time - span, X = t => left + (t - start) / span * (right - left), Y = v => middle - v / max * (bottom - top) / 2;
  const paths = traces.map(tr => `<path d="${tr.values.map(([t, v], i) => `${i ? 'L' : 'M'}${X(t).toFixed(1)},${Y(v).toFixed(1)}`).join(' ')}" stroke="${tr.color}" stroke-width="2.4" fill="none"/>`).join('');
  const grid = [0, 0.25, 0.5, 0.75, 1].map(f => `<path d="M${left + f * (right - left)} ${top}V${bottom}" stroke="#334155" stroke-width=".6"/>`).join('');
  return `<svg role="img" aria-label="${title}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" rx="10" fill="#0f172a"/>
    <text x="14" y="20" fill="#e2e8f0" font-size="12">${title}</text>
    ${traces.map((tr, i) => `<text x="${340 + i * 125}" y="20" fill="${tr.color}" font-size="12">${tr.label}</text>`).join('')}
    ${grid}<path d="M${left} ${top}V${bottom}H${right}M${left} ${middle}H${right}" stroke="#64748b" fill="none"/>
    <text x="4" y="${top + 8}" fill="#94a3b8" font-size="10">+${fmtScope(max)} ${units}</text><text x="26" y="${middle + 4}" fill="#94a3b8" font-size="10">0</text>
    <text x="4" y="${bottom}" fill="#94a3b8" font-size="10">−${fmtScope(max)}</text>${paths}
    <text x="${left}" y="171" fill="#94a3b8" font-size="10">${note || `${span.toFixed(3)} с · окно до t = ${time.toFixed(3)} с`}</text></svg>`;
}
const fmtScope = v => v < 0.1 ? v.toPrecision(2) : v.toFixed(1);
