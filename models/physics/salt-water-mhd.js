/** Annular electrolyte: radial conventional current × vertical B → azimuthal body force.
 * Model: uniform B and conductivity, rigid-body mean rotation, linear viscous drag.
 * Sources: https://doi.org/10.1088/0143-0807/30/3/004
 * https://repository.upenn.edu/bitstreams/623aef71-bd39-414d-8b76-d8fbd3dd7ac3/download
 */
const INNER = 0.006, OUTER = 0.06, DEPTH = 0.012, DENSITY = 1000;
const MASS = DENSITY * Math.PI * (OUTER ** 2 - INNER ** 2) * DEPTH;
const INERTIA = MASS * (OUTER ** 2 + INNER ** 2) / 2;
const DRAG = 1.2; // s⁻¹, illustrative bulk viscous damping, not a calibrated fluid solver.
const SCALE = 30; // metres → scene coordinates
const WATER_Y = 0.45;
const colors = { current: 0xfbbf24, field: 0x38bdf8, force: 0xfb7185, water: 0x22d3ee };

export function mhdForcing(p) {
  const currentSign = p.battery === 'center-minus' ? -1 : 1;
  const fieldSign = p.magnet === 'south-up' ? -1 : 1;
  const current = (p.power === 'off' ? 0 : Number(p.current)) * currentSign;
  const field = Number(p.field) * fieldSign;
  const radius = (INNER + OUTER) / 2;
  const j = current / (2 * Math.PI * radius * DEPTH);
  const forceDensity = j * field;
  // theta grows from +x towards +z: clockwise when viewed from above (+y).
  const torque = current * field * (OUTER ** 2 - INNER ** 2) / 2;
  return { current, field, j, forceDensity, torque, targetOmega: torque / (INERTIA * DRAG), currentSign, fieldSign };
}

const direction = n => Math.abs(n) < 1e-5 ? 'нет' : n > 0 ? 'по часовой ↻' : 'против часовой ↺';
const signed = (n, digits = 3) => `${n > 0 ? '+' : ''}${n.toFixed(digits)}`;

export default {
  id: 'salt-water-mhd', kind: 'simulation', subject: 'physics', category: 'electromagnetism',
  title: 'Солёная вода в магнитном поле', shortTitle: 'Вращение солёной воды',
  subtitle: 'Физика · ток, магнитное поле и сила Лоренца',
  description: 'Блюдце, гвоздь и кольцевой электрод. Меняйте полярность батарейки и магнита, наблюдайте ток, поле, силу и реверс вращения.',
  tags: ['магнит', 'соль', 'вода', 'ток', 'лоренц', 'ампер', 'электромагнетизм'],
  params: [
    { key: 'battery', label: 'Полярность батарейки', type: 'select', default: 'center-plus', options: [
      { value: 'center-plus', label: 'Гвоздь + / кольцо −' }, { value: 'center-minus', label: 'Гвоздь − / кольцо +' },
    ] },
    { key: 'magnet', label: 'Полюс магнита к воде', type: 'select', default: 'north-up', options: [
      { value: 'north-up', label: 'N сверху · B вверх ↑' }, { value: 'south-up', label: 'S сверху · B вниз ↓' },
    ] },
    { key: 'power', label: 'Цепь', type: 'select', default: 'on', options: [
      { value: 'on', label: 'Замкнута' }, { value: 'off', label: 'Разомкнута · ток выключен' },
    ] },
    { key: 'current', label: 'Сила тока |I|', type: 'range', min: 0, max: 1, step: 0.05, default: 0.35, format: v => `${v.toFixed(2)} А` },
    { key: 'field', label: 'Индукция |B|', type: 'range', min: 0, max: 0.8, step: 0.05, default: 0.35, format: v => `${v.toFixed(2)} Тл` },
  ],
  presets: [
    { id: 'normal', label: 'Исходная полярность', values: { battery: 'center-plus', magnet: 'north-up', power: 'on' } },
    { id: 'both', label: 'Перевернуть оба → тот же ход', values: { battery: 'center-minus', magnet: 'south-up', power: 'on' } },
  ],
  summarizeParams: p => `I=${p.current.toFixed(2)} А · ${p.magnet === 'north-up' ? 'N' : 'S'} к воде`,
  playback: { duration: null, loop: false, canScrub: false, defaultSpeed: 1, dtFixed: 1 / 120 },
  layers: [
    { key: 'vessel', color: '#94a3b8', label: 'Блюдце, гвоздь, кольцо и батарейка', step: 0 },
    { key: 'water', color: '#22d3ee', label: 'Вода и частицы-индикаторы движения', step: 0 },
    { key: 'magnet', color: '#a78bfa', label: 'Магнит под блюдцем · N / S', step: 0 },
    { key: 'current', color: '#fbbf24', label: 'Ток I: от + к − через раствор', step: 0 },
    { key: 'field', color: '#38bdf8', label: 'Магнитное поле B', step: 0 },
    { key: 'force', color: '#fb7185', label: 'Сила на жидкость f = j × B', step: 0 },
    { key: 'x', color: '#eab308', label: 'Вид сверху и объяснение', step: 0 },
  ],
  help: 'Пуск — наблюдать движение. Переключите батарейку или магнит: сила изменится сразу, вода — с инерцией. Жёлтый — ток, голубой — поле, розовый — сила. Длины стрелок условные. В растворе ток переносят ионы Na⁺ и Cl⁻; частицы на воде — маркеры потока. Модель не учитывает неоднородность поля, электролиз и обратную ЭДС.',
  calcAriaLabel: 'Ток, поле, сила и вращение воды',
  diagramAriaLabel: 'Вид сверху: радиальный ток и касательная сила', diagramLayerKey: 'x',
  cameraDefaults: { position: [5.2, 6.7, 7], target: [0.35, 0.1, 0], fitRadius: 3.1 },

  initState() { return { theta: 0, omega: 0 }; },
  onParamsChange() { return true; }, // Preserve inertia through a polarity change or an open circuit.
  stepState(s, dt, p) {
    const target = mhdForcing(p).targetOmega;
    const decay = Math.exp(-DRAG * dt);
    // Exact solution of dω/dt = torque/inertia − DRAG·ω over this step.
    s.theta += target * dt + (s.omega - target) * (1 - decay) / DRAG;
    s.omega = target + (s.omega - target) * decay;
  },
  solveState(s, p, t) { return { t, ...s, ...mhdForcing(p) }; },
  serializeState(s) { return { theta: s.theta, omega: s.omega }; },
  deserializeState(s) {
    return Number.isFinite(s?.theta) && Number.isFinite(s?.omega) ? { theta: s.theta, omega: s.omega } : null;
  },
  getCalcRows(m) {
    return [
      ['Ток через раствор', Math.abs(m.current) < 1e-8 ? '0 А · цепь без тока' : `${Math.abs(m.current).toFixed(2)} А · ${m.current > 0 ? 'гвоздь → кольцо' : 'кольцо → гвоздь'}`],
      ['Поле B', `${Math.abs(m.field).toFixed(2)} Тл · ${m.field >= 0 ? 'вверх ↑' : 'вниз ↓'}`],
      ['Сила f = j × B', `${Math.abs(m.forceDensity).toFixed(2)} Н/м³ · ${direction(m.torque)}`],
      ['Момент силы |τ|', `${(Math.abs(m.torque) * 1000).toFixed(3)} мН·м`],
      ['Вращение воды (вид сверху)', direction(m.omega)],
      ['Угловая скорость ω', `${signed(m.omega, 2)} рад/с`],
      ['Геометрия опыта', 'Радиусы 0,6 / 6 см · слой 1,2 см'],
      ['Условная модель', 'Однородное B · среднее вращение · вязкое торможение'],
    ];
  },
  renderDiagram(m) {
    const out = m.current >= 0, up = m.field >= 0;
    const x1 = out ? 111 : 164, x2 = out ? 164 : 111;
    const forceDown = m.torque > 0;
    const fy1 = forceDown ? 90 : 132, fy2 = forceDown ? 132 : 90;
    const arrow = (x1, y1, x2, y2, color) => {
      const a = Math.atan2(y2 - y1, x2 - x1), l = 7;
      return `<path d="M${x1} ${y1} L${x2} ${y2} M${x2-l*Math.cos(a-0.5)} ${y2-l*Math.sin(a-0.5)} L${x2} ${y2} L${x2-l*Math.cos(a+0.5)} ${y2-l*Math.sin(a+0.5)}" stroke="${color}" stroke-width="2.6" fill="none"/>`;
    };
    return `<svg role="img" aria-label="Вид сверху: ток, поле и сила" viewBox="0 0 240 254">
      <text x="120" y="18" text-anchor="middle" fill="currentColor" font-size="12" font-weight="600">Вид сверху</text>
      <circle cx="105" cy="105" r="70" fill="#22d3ee" fill-opacity=".08" stroke="#94a3b8" stroke-width="5"/>
      <circle cx="105" cy="105" r="7" fill="#cbd5e1"/>
      <text x="102" y="91" fill="currentColor" font-size="13">${out ? '+' : '−'}</text>
      <text x="177" y="109" fill="currentColor" font-size="13">${out ? '−' : '+'}</text>
      ${Math.abs(m.current) > 1e-8 ? arrow(x1, 105, x2, 105, '#fbbf24') : ''}
      ${Math.abs(m.torque) > 1e-10 ? arrow(143, fy1, 143, fy2, '#fb7185') : ''}
      <text x="131" y="97" fill="#fbbf24" font-size="12">I</text>
      <text x="151" y="144" fill="#fb7185" font-size="12">f</text>
      <circle cx="70" cy="85" r="11" fill="none" stroke="#38bdf8" stroke-width="1.7"/>
      ${Math.abs(m.field) < 1e-8 ? '' : up ? '<circle cx="70" cy="85" r="2.5" fill="#38bdf8"/>' : '<path d="M64 79 L76 91 M76 79 L64 91" stroke="#38bdf8" stroke-width="2"/>'}
      <text x="19" y="198" fill="#38bdf8" font-size="12">B: ${Math.abs(m.field) < 1e-8 ? '0 · поля нет' : up ? '⊙ к наблюдателю' : '⊗ от наблюдателя'}</text>
      <text x="19" y="218" fill="#fbbf24" font-size="12">I — условный ток от + к −</text>
      <text x="19" y="238" fill="#fb7185" font-size="12">f = j × B · ${direction(m.torque)}</text>
    </svg>`;
  },
  build(api, { groups: G, solved: m }) {
    const { THREE, V, ring, cylinderShell, studioBox, seg, label, dot, arrow } = api;
    const R = OUTER * SCALE, r = INNER * SCALE;
    // Transparent ceramic/glass dish; a dark magnet is visibly below its bottom.
    cylinderShell(G.vessel, R + 0.16, R + 0.12, 0.10, [0, 0.02, 0], 0xcbd5e1, 0.25, { roughness: 0.2 });
    ring(G.vessel, R + 0.08, 0x94a3b8, 0.035, { center: [0, WATER_Y + 0.09, 0] });
    const wall = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.09, R + 0.09, 0.5, 80, 1, true), new THREE.MeshPhysicalMaterial({ color: 0x94a3b8, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false }));
    wall.position.y = 0.25; G.vessel.add(wall);
    cylinderShell(G.water, R - 0.03, R - 0.03, DEPTH * SCALE, [0, 0.09 + DEPTH * SCALE / 2, 0], 0x0891b2, 0.22, { roughness: 0.18 });
    ring(G.vessel, R, 0xcbd5e1, 0.045, { center: [0, WATER_Y, 0] });
    cylinderShell(G.vessel, r, r, 0.78, [0, 0.43, 0], 0x94a3b8, 1, { metal: true });
    cylinderShell(G.vessel, r * 1.45, r * 1.45, 0.07, [0, 0.84, 0], 0xcbd5e1, 1, { metal: true });
    label('Гвоздь', V(-0.22, 1.07, 0), G.vessel, { scale: 0.46 });
    label('Кольцо', V(-1.75, 0.72, 0), G.vessel, { scale: 0.46 });
    label('NaCl + H₂O', V(0, 0.36, 2.05), G.water, { scale: 0.6, color: '#67e8f9' });

    const northUp = m.fieldSign > 0;
    cylinderShell(G.magnet, 1.56, 1.56, 0.22, [0, -0.22, 0], northUp ? 0xef4444 : 0x2563eb, 1, { roughness: 0.6 });
    cylinderShell(G.magnet, 1.56, 1.56, 0.22, [0, -0.44, 0], northUp ? 0x2563eb : 0xef4444, 1, { roughness: 0.6 });
    label(northUp ? 'N ↑' : 'S ↑', V(0, -0.23, 1.65), G.magnet, { color: northUp ? '#fca5a5' : '#93c5fd', scale: 0.55 });
    label(northUp ? 'S' : 'N', V(0, -0.52, 1.62), G.magnet, { scale: 0.42 });
    // Battery and two separate conductors to the central and ring electrodes.
    studioBox(G.vessel, 0.82, 0.58, 1.2, [2.7, 0.24, 0], 0x334155, { edgeColor: 0x94a3b8 });
    const centerPlus = m.currentSign > 0;
    label('Батарейка', V(2.7, 0.94, 0), G.vessel, { scale: 0.68 });
    label(centerPlus ? '+' : '−', V(2.7, 0.65, -0.38), G.vessel, { color: centerPlus ? '#fca5a5' : '#93c5fd', scale: 0.44 });
    label(centerPlus ? '−' : '+', V(2.7, 0.65, 0.38), G.vessel, { color: centerPlus ? '#93c5fd' : '#fca5a5', scale: 0.44 });
    const wire = (pts, color) => pts.slice(1).forEach((p, i) => seg(G.vessel, V(...pts[i]), V(...p), 0.023, color));
    wire([[2.7, 0.55, -0.38], [2.2, 1.16, -0.7], [0, 1.16, -0.7], [0, 0.8, 0]], centerPlus ? 0xef4444 : 0x3b82f6);
    wire([[2.7, 0.55, 0.38], [2.35, 0.64, 0.85], [R, WATER_Y, 0]], centerPlus ? 0x3b82f6 : 0xef4444);
    label(Math.abs(m.current) < 1e-8 ? 'I = 0' : (centerPlus ? 'Гвоздь +' : 'Гвоздь −'), V(0.45, 0.85, 0), G.vessel, { scale: 0.5 });

    const currentArrows = [], fieldArrows = [], forceArrows = [], particles = [];
    for (let i = 0; i < 6; i++) {
      const theta = i * Math.PI / 3;
      currentArrows.push({ theta, handle: arrow(G.current, colors.current, 0.021, 0.065, 0.17) });
      fieldArrows.push({ theta, handle: arrow(G.field, colors.field, 0.018, 0.055, 0.15) });
      forceArrows.push({ theta, handle: arrow(G.force, colors.force, 0.025, 0.075, 0.18) });
    }
    for (let i = 0; i < 48; i++) {
      const radius = 0.38 + (R - 0.55) * Math.sqrt((i + 0.5) / 48);
      const theta = i * 2.3999632297;
      const mesh = dot(G.water, V(0, 0, 0), i % 3 ? 0x67e8f9 : 0xffffff, 0.022 + (i % 3) * 0.005, { role: 'preserve' });
      particles.push({ radius, theta, mesh });
    }
    label('I', V(0.82, 0.63, 0), G.current, { color: '#fbbf24', scale: 0.45 });
    label('B', V(1.17, 1.46, 0), G.field, { color: '#38bdf8', scale: 0.45 });
    label('f = j × B', V(1.35, 0.85, 0.75), G.force, { color: '#fb7185', scale: 0.68 });
    return { target: [0.4, 0.15, 0], fitRadius: 3.1, groundY: -0.6, gridRadius: 3.7,
      handles: { currentArrows, fieldArrows, forceArrows, particles },
    };
  },
  updateScene(api, { solved: m, handles }) {
    if (!m || !handles) return;
    const { updateArrow } = api;
    for (const { theta, handle } of handles.currentArrows) {
      const c = Math.cos(theta), s = Math.sin(theta), out = m.currentSign > 0;
      const radius = out ? 0.43 : 1.5;
      const len = Math.abs(m.current) > 1e-8 ? (out ? 1 : -1) * 0.95 : 0;
      updateArrow(handle, [radius * c, WATER_Y + 0.1, radius * s], [len * c, 0, len * s]);
    }
    for (const { theta, handle } of handles.fieldArrows) {
      const len = Math.abs(m.field) > 1e-8 ? m.fieldSign * 0.96 : 0;
      updateArrow(handle, [1.12 * Math.cos(theta), m.fieldSign > 0 ? 0.18 : 1.14, 1.12 * Math.sin(theta)], [0, len, 0]);
    }
    for (const { theta, handle } of handles.forceArrows) {
      const len = Math.abs(m.torque) > 1e-10 ? Math.sign(m.torque) * 0.66 : 0;
      updateArrow(handle, [1.46 * Math.cos(theta), WATER_Y + 0.16, 1.46 * Math.sin(theta)], [-Math.sin(theta) * len, 0, Math.cos(theta) * len]);
    }
    for (const { radius, theta, mesh } of handles.particles) {
      mesh.position.set(radius * Math.cos(theta + m.theta), WATER_Y + 0.025, radius * Math.sin(theta + m.theta));
    }
  },
};
