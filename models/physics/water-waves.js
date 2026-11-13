/** Волны на поверхности воды: круговая волна, интерференция двух источников и стоячая волна. */

const TANK_SIZE = 4.6;
const WAVE_C = 1.65;

function sampleWaveHeight(x, z, t, p) {
  const omega = 2 * Math.PI * p.freq;
  const k = omega / WAVE_C;

  if (p.mode === 'standing') {
    const kx = (Math.PI * 3) / TANK_SIZE;
    const y = p.amp * Math.cos(kx * x) * Math.cos(omega * t);
    return { y, norm: p.amp > 1e-4 ? y / p.amp : 0 };
  }

  const singleWave = (sx, sz) => {
    const r = Math.hypot(x - sx, z - sz);
    const front = WAVE_C * t;
    if (t < 0.001 || r > front + 0.15) return 0;
    const env = Math.min(1, Math.max(0, (front - r) * 3.5));
    const atten = 1 / (1 + p.damp * r * 1.4);
    return p.amp * atten * env * Math.sin(k * r - omega * t);
  };

  if (p.mode === 'single') {
    const y = singleWave(0, 0);
    return { y, norm: p.amp > 1e-4 ? y / p.amp : 0 };
  }

  const d = p.sep * 0.5;
  const y = 0.68 * (singleWave(-d, 0) + singleWave(d, 0));
  return { y, norm: p.amp > 1e-4 ? y / (1.36 * p.amp) : 0 };
}

export default {
  id: 'water-waves',
  kind: 'simulation',
  subject: 'physics',
  category: 'waves',
  title: 'Волны на воде и интерференция',
  shortTitle: 'Волны и интерференция',
  subtitle: 'Физика · колебания и волны',
  description: 'Распространение круговых волн, интерференция двух когерентных источников, стоячая волна и движение поплавка.',
  tags: ['вода', 'волны', 'интерференция', 'стоячая волна', 'частота', 'физика'],
  previewSvg: `<svg viewBox="0 0 100 100" width="96" height="96" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
    <path d="M12 52 Q24 34 36 52 T60 52 T88 52" stroke="#38bdf8" stroke-width="2.6"/>
    <path d="M12 66 Q24 54 36 66 T60 66 T88 66" stroke="#3b82f6" opacity=".6"/>
    <circle cx="48" cy="43" r="4.5" fill="#fbbf24" stroke="none"/>
  </svg>`,

  params: [
    {
      key: 'mode',
      label: 'Режим волн',
      type: 'select',
      default: 'double',
      options: [
        { value: 'double', label: 'Интерференция (2 источника)' },
        { value: 'single', label: 'Круговые волны от капли' },
        { value: 'standing', label: 'Стоячая волна' },
      ],
    },
    { key: 'freq', label: 'Частота f', type: 'range', min: 0.6, max: 3.0, step: 0.1, default: 1.5, format: (v) => `${v.toFixed(1)} Гц` },
    { key: 'amp', label: 'Амплитуда A', type: 'range', min: 0.08, max: 0.55, step: 0.02, default: 0.3, format: (v) => `${v.toFixed(2)} м` },
    { key: 'sep', label: 'Расстояние d', type: 'range', min: 0.8, max: 3.4, step: 0.1, default: 2.0, format: (v) => `${v.toFixed(1)} м`, visibleIf: (p) => p.mode === 'double' },
    { key: 'damp', label: 'Затухание', type: 'range', min: 0, max: 0.4, step: 0.02, default: 0.08, format: (v) => `${v.toFixed(2)}`, visibleIf: (p) => p.mode !== 'standing' },
  ],
  presets: [
    { id: 'interf', label: 'Интерференция 2 источников', values: { mode: 'double', freq: 1.5, amp: 0.3, sep: 2.0, damp: 0.08 } },
    { id: 'drop', label: 'Круги на воде', values: { mode: 'single', freq: 1.4, amp: 0.36, damp: 0.12 } },
    { id: 'stand', label: 'Стоячая волна', values: { mode: 'standing', freq: 1.4, amp: 0.34, damp: 0 } },
  ],
  summarizeParams: (p) => `f=${p.freq.toFixed(1)} Гц`,

  playback: { duration: 12.0, loop: true, canScrub: true, defaultSpeed: 1 },
  getDuration: (p) => {
    const T = 1 / Math.max(0.2, p.freq || 1.4);
    return Math.max(6, Math.round(12 / T) * T);
  },

  layers: [
    { key: 'water', color: '#38bdf8', label: 'Поверхность воды (сетка)', step: 0 },
    { key: 'src', color: '#a855f7', label: 'Источники колебаний', step: 0 },
    { key: 'buoy', color: '#f59e0b', label: 'Пробный поплавок и вектор v_y', step: 0 },
    { key: 'x', color: '#eab308', label: 'Срез профиля волны y(x)', step: 0 },
  ],

  calcAriaLabel: 'Волновые характеристики',
  diagramAriaLabel: 'Мгновенный профиль волны вдоль оси X',
  diagramLayerKey: 'x',

  cameraDefaults: {
    position: [4.2, 3.45, 5.0],
    target: [0, -0.08, 0],
    fitRadius: 2.95,
  },

  evaluateAt(t, p) {
    const lambda = p.mode === 'standing' ? (2 * TANK_SIZE) / 3 : WAVE_C / p.freq;
    const T = 1 / p.freq;
    const bx = 0.85;
    const bz = 0.65;
    const cur = sampleWaveHeight(bx, bz, t, p);
    const curEps = sampleWaveHeight(bx, bz, t + 0.01, p);
    const vyBuoy = (curEps.y - cur.y) / 0.01;

    const slicePts = [];
    for (let i = 0; i <= 60; i++) {
      const x = -TANK_SIZE / 2 + (TANK_SIZE * i) / 60;
      slicePts.push([x, sampleWaveHeight(x, 0, t, p).y]);
    }

    return { t, lambda, T, bx, bz, buoyY: cur.y, vyBuoy, slicePts, mode: p.mode, amp: p.amp, sep: p.sep };
  },

  getCalcRows(m) {
    return [
      ['Время t', `${m.t.toFixed(2)} с`],
      ['Длина волны λ = c/f', `${m.lambda.toFixed(2)} м`],
      ['Период T = 1/f', `${m.T.toFixed(2)} с`],
      ['Высота поплавка y', `${m.buoyY.toFixed(2)} м`],
      ['Скорость поплавка vy', `${m.vyBuoy.toFixed(2)} м/с`],
    ];
  },

  renderDiagram(m) {
    const sx = 172 / TANK_SIZE;
    const sy = 54 / Math.max(0.2, m.amp * 1.4);
    const ox = 100;
    const oy = 92;
    const d = m.slicePts
      .map((pt, i) => `${i ? 'L' : 'M'}${(ox + pt[0] * sx).toFixed(1)},${(oy - pt[1] * sy).toFixed(1)}`)
      .join(' ');
    const envY = Math.min(54, m.amp * sy);
    return (
      `<svg role="img" aria-label="Срез профиля волны y(x)" viewBox="0 0 200 200" style="display:block;width:100%;height:auto">` +
      `<line x1="14" y1="${(oy - envY).toFixed(1)}" x2="186" y2="${(oy - envY).toFixed(1)}" stroke="currentColor" stroke-opacity=".14" stroke-dasharray="3 3"/>` +
      `<line x1="14" y1="${(oy + envY).toFixed(1)}" x2="186" y2="${(oy + envY).toFixed(1)}" stroke="currentColor" stroke-opacity=".14" stroke-dasharray="3 3"/>` +
      `<line x1="14" y1="${oy}" x2="186" y2="${oy}" stroke="currentColor" stroke-opacity=".35" stroke-width="1.4"/>` +
      `<path d="${d}" fill="none" stroke="#38bdf8" stroke-width="2.6" stroke-linejoin="round"/>` +
      `<text x="100" y="176" text-anchor="middle" font-size="11" font-weight="600" fill="currentColor">λ = ${m.lambda.toFixed(2)} м · T = ${m.T.toFixed(2)} с</text>` +
      '</svg>'
    );
  },

  build(api, opts = {}) {
    const m = opts.solved || this.evaluateAt(0, { mode: 'double', freq: 1.5, amp: 0.3, sep: 2.0, damp: 0.08 });
    const p = opts.params || {};
    const G = opts.groups;
    const { THREE, V, seg, ring, dot, studioBox, cylinderShell, waveGrid, arrow } = api;
    const half = TANK_SIZE / 2;
    const botY = -0.58;
    const rimY = 0.42;

    // Лабораторный аквариумный волновой лоток на тёмном матовом основании (y = -0.62)
    studioBox(G.water, TANK_SIZE + 0.08, 0.06, TANK_SIZE + 0.08, [0, botY, 0], 0x070b14, {
      metalness: 0.06,
      roughness: 0.9,
      edgeColor: 0x334155,
      edgeOpacity: 0.55,
    });
    const wallH = rimY - (botY + 0.03);
    const wallY = botY + 0.03 + wallH / 2;
    const wallMat = new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.06,
      roughness: 0.14,
      clearcoat: 0.5,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    [
      [0, wallY, -half, TANK_SIZE, wallH, 0.014],
      [0, wallY, half, TANK_SIZE, wallH, 0.014],
      [-half, wallY, 0, 0.014, wallH, TANK_SIZE],
      [half, wallY, 0, 0.014, wallH, TANK_SIZE],
    ].forEach(([wx, wy, wz, ww, wh, wd]) => {
      const pane = new THREE.Mesh(new THREE.BoxGeometry(ww, wh, wd), wallMat);
      pane.position.set(wx, wy, wz);
      pane.userData.exportTintRole = 'fill';
      G.water.add(pane);
    });
    const corners = [
      [-half, -half],
      [half, -half],
      [half, half],
      [-half, half],
    ];
    for (let i = 0; i < 4; i++) {
      const [x1, z1] = corners[i];
      const [x2, z2] = corners[(i + 1) % 4];
      seg(G.water, V(x1, botY + 0.03, z1), V(x1, rimY, z1), 0.018, 0x475569);
      seg(G.water, V(x1, rimY, z1), V(x2, rimY, z2), 0.015, 0x64748b);
    }

    const gridHandle = waveGrid(G.water, 44, 44, TANK_SIZE, TANK_SIZE, {
      opacity: 0.88,
      roughness: 0.24,
      metalness: 0.04,
      clearcoat: 0.4,
      envMapIntensity: 0.65,
      wireColor: 0x38bdf8,
      wireOpacity: 0.09,
    });

    // Подвесные осцилляторы-дипперы источников колебаний с опорными стойками на бортик лотка
    const dippers = [];
    const sep = p.sep ?? m.sep ?? 2.0;
    const srcCoords =
      m.mode === 'single' ? [[0, 0]] : m.mode === 'double' ? [[-sep * 0.5, 0], [sep * 0.5, 0]] : [];
    if (srcCoords.length) {
      seg(G.src, V(-half, rimY, 0), V(-half, 0.68, 0), 0.016, 0x64748b);
      seg(G.src, V(half, rimY, 0), V(half, 0.68, 0), 0.016, 0x64748b);
      dot(G.src, V(-half, rimY, 0), 0x475569, 0.036);
      dot(G.src, V(half, rimY, 0), 0x475569, 0.036);
      seg(G.src, V(-half, 0.68, 0), V(half, 0.68, 0), 0.016, 0x64748b);
      srcCoords.forEach(([sx, sz]) => {
        const stem = cylinderShell(G.src, 0.018, 0.018, 0.55, [sx, 0.36, sz], 0xcbd5e1, 1, { metal: true });
        const tip = dot(G.src, V(sx, 0.08, sz), 0xa855f7, 0.075, {
          metalness: 0.2,
          roughness: 0.2,
          clearcoat: 0.9,
          role: 'preserve',
        });
        dippers.push({ sx, sz, stem, tip });
      });
    }

    const buoyGroup = new THREE.Group();
    const buoyBall = dot(buoyGroup, V(0, 0, 0), 0xf97316, 0.1, {
      metalness: 0.14,
      roughness: 0.22,
      clearcoat: 0.8,
      role: 'preserve',
    });
    ring(buoyGroup, 0.104, 0x0f172a, 0.014, { center: [0, 0, 0], role: 'preserve' });
    const buoyMast = cylinderShell(buoyGroup, 0.012, 0.016, 0.24, [0, 0.14, 0], 0x1e293b, 1, {
      metal: true,
      role: 'preserve',
    });
    dot(buoyGroup, V(0, 0.27, 0), 0xef4444, 0.042, { role: 'preserve' });
    buoyGroup.position.set(m.bx, m.buoyY + 0.08, m.bz);
    G.buoy.add(buoyGroup);

    const buoyArrow = arrow(G.buoy, 0xf59e0b, 0.018, 0.05, 0.14);

    return {
      target: [0, -0.08, 0],
      fitRadius: 2.95,
      groundY: -0.62,
      gridRadius: 3.8,
      handles: { gridHandle, dippers, buoyGroup, buoyBall, buoyArrow },
    };
  },

  updateScene(api, { solved: m, params, handles }) {
    if (!handles || !m) return;
    const { updateWaveGrid, updateArrow } = api;
    const { gridHandle, dippers, buoyGroup, buoyArrow } = handles;

    updateWaveGrid(gridHandle, (x, z) => {
      const { y, norm } = sampleWaveHeight(x, z, m.t, params);
      const u = Math.max(-1, Math.min(1, norm));
      // Впадина -> глубокий индиго-синий, спокойная -> кобальт, гребень -> насыщенный лазурный
      if (u < 0) {
        const d = -u;
        return {
          y,
          r: 0.04 - d * 0.025,
          g: 0.24 - d * 0.17,
          b: 0.62 - d * 0.36,
        };
      }
      return {
        y,
        r: 0.04 + u * 0.18,
        g: 0.24 + u * 0.48,
        b: 0.62 + u * 0.34,
      };
    });

    const omega = 2 * Math.PI * (params?.freq ?? 1.5);
    const driveY = (params?.amp ?? 0.3) * 0.65 * Math.sin(-omega * m.t);
    dippers?.forEach((d) => {
      d.tip.position.y = 0.08 + driveY;
      d.stem.position.y = 0.36 + driveY * 0.5;
    });

    buoyGroup.position.set(m.bx, m.buoyY + 0.08, m.bz);
    updateArrow(buoyArrow, buoyGroup.position, [0, m.vyBuoy * 0.22, 0], 0.025);
  },
};
