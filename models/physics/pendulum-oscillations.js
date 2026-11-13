/** Гармонические и затухающие колебания: математический (нитяной) и пружинный маятники. */

const G_CONST = 9.81;

function evalOscillator(t, p) {
  const omega0 = p.type === 'math' ? Math.sqrt(G_CONST / p.L) : Math.sqrt(p.k / p.m);
  const beta = Math.min(p.beta, omega0 * 0.75);
  const omegaD = Math.sqrt(Math.max(1e-4, omega0 * omega0 - beta * beta));
  const amp0 = p.type === 'math' ? (p.deg0 * Math.PI) / 180 : p.x0;

  const env = Math.exp(-beta * t);
  const cosD = Math.cos(omegaD * t);
  const sinD = Math.sin(omegaD * t);

  const q = amp0 * env * (cosD + (beta / omegaD) * sinD);
  const qDot = -amp0 * env * ((omega0 * omega0) / omegaD) * sinD;

  // Пересчёт линейных координат в малоугловом гармоническом приближении
  const xLin = p.type === 'math' ? p.L * Math.sin(q) : q;
  const vLin = p.type === 'math' ? p.L * qDot : qDot;
  const ep =
    p.type === 'math'
      ? 0.5 * p.m * G_CONST * p.L * q * q
      : 0.5 * p.k * q * q;
  const ek = 0.5 * p.m * vLin * vLin;
  const e0 =
    p.type === 'math'
      ? 0.5 * p.m * G_CONST * p.L * amp0 * amp0
      : 0.5 * p.k * amp0 * amp0;

  return { omega0, omegaD, beta, T: (2 * Math.PI) / omegaD, amp0, q, qDot, xLin, vLin, ek, ep, e0 };
}

export default {
  id: 'pendulum-oscillations',
  kind: 'simulation',
  subject: 'physics',
  category: 'mechanics',
  title: 'Колебания маятников и фазовый портрет',
  shortTitle: 'Колебания маятника',
  subtitle: 'Физика · гармонические колебания',
  description: 'Нитяной и пружинный маятники с затуханием, векторы скорости/силы, энергии Ek/Ep и фазовый портрет (x, v).',
  tags: ['маятник', 'пружина', 'колебания', 'период', 'энергия', 'фазовый портрет', 'физика'],
  previewSvg: `<svg viewBox="0 0 100 100" width="96" height="96" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
    <line x1="25" y1="16" x2="75" y2="16" stroke="#94a3b8"/>
    <line x1="50" y1="16" x2="50" y2="82" stroke="#64748b" stroke-dasharray="3 3" opacity=".55"/>
    <line x1="50" y1="16" x2="70" y2="66" stroke="currentColor"/>
    <circle cx="70" cy="66" r="7.5" fill="#fbbf24" stroke="none"/>
    <path d="M30 66 A38 38 0 0 0 70 66" stroke="#38bdf8" stroke-dasharray="3 2"/>
  </svg>`,

  params: [
    {
      key: 'type',
      label: 'Тип маятника',
      type: 'select',
      default: 'math',
      options: [
        { value: 'math', label: 'Математический (нить L)' },
        { value: 'spring', label: 'Пружинный (жёсткость k)' },
      ],
    },
    { key: 'L', label: 'Длина L', type: 'range', min: 0.6, max: 4.0, step: 0.1, default: 2.0, format: (v) => `${v.toFixed(1)} м`, visibleIf: (p) => p.type === 'math' },
    { key: 'k', label: 'Жёсткость k', type: 'range', min: 5, max: 40, step: 1, default: 16, format: (v) => `${Math.round(v)} Н/м`, visibleIf: (p) => p.type === 'spring' },
    { key: 'm', label: 'Масса m', type: 'range', min: 0.5, max: 5.0, step: 0.5, default: 1.5, format: (v) => `${v.toFixed(1)} кг` },
    { key: 'deg0', label: 'Угол φ₀', type: 'range', min: 10, max: 55, step: 1, default: 36, format: (v) => `${Math.round(v)}°`, visibleIf: (p) => p.type === 'math' },
    { key: 'x0', label: 'Смещение x₀', type: 'range', min: 0.15, max: 0.9, step: 0.05, default: 0.55, format: (v) => `${v.toFixed(2)} м`, visibleIf: (p) => p.type === 'spring' },
    { key: 'beta', label: 'Затухание β', type: 'range', min: 0, max: 0.35, step: 0.02, default: 0.04, format: (v) => `${v.toFixed(2)} с⁻¹` },
  ],
  presets: [
    { id: 'ideal-math', label: 'Нитяной (без затухания)', values: { type: 'math', L: 2.0, m: 1.5, deg0: 38, beta: 0 } },
    { id: 'damped-spring', label: 'Пружинный с затуханием', values: { type: 'spring', k: 16, m: 1.5, x0: 0.65, beta: 0.14 } },
  ],
  summarizeParams: (p) => (p.type === 'math' ? `L=${p.L.toFixed(1)} м` : `k=${Math.round(p.k)} Н/м`),

  playback: { duration: 15.0, loop: true, canScrub: true, defaultSpeed: 1 },

  layers: [
    { key: 'frame', color: '#9aa0aa', label: 'Опора, равновесие и дуга/пружина', step: 0 },
    { key: 'bob', color: '#f59e0b', label: 'Груз m и след', step: 0 },
    { key: 'vec', color: '#22c55e', label: 'Векторы скорости v и возвращающей силы F', step: 0 },
    { key: 'x', color: '#eab308', label: 'Фазовый портрет и энергии', step: 0 },
  ],

  calcAriaLabel: 'Параметры колебаний маятника',
  diagramAriaLabel: 'Фазовый портрет и энергии колебаний',
  diagramLayerKey: 'x',

  cameraDefaults: {
    position: [0.4, 1.5, 5.2],
    target: [0, 1.15, 0],
    fitRadius: 2.3,
  },

  evaluateAt(t, p) {
    const cur = evalOscillator(t, p);
    const phasePts = [];
    const windowSpan = Math.min(t, Math.max(cur.T * 2.2, 2.0));
    const tStart = Math.max(0, t - windowSpan);
    const samples = 96;
    for (let i = 0; i <= samples; i++) {
      const ti = tStart + (windowSpan * i) / samples;
      const ev = evalOscillator(ti, p);
      phasePts.push([ev.q, ev.qDot]);
    }
    return { t, ...cur, type: p.type, L: p.L, m: p.m, phasePts };
  },

  getCalcRows(m) {
    return [
      ['Время t', `${m.t.toFixed(2)} с`],
      ['Период T', `${m.T.toFixed(2)} с (ω₀=${m.omega0.toFixed(2)})`],
      [m.type === 'math' ? 'Угол φ' : 'Смещение x', m.type === 'math' ? `${((m.q * 180) / Math.PI).toFixed(1)}°` : `${m.q.toFixed(2)} м`],
      ['Скорость v', `${m.vLin.toFixed(2)} м/с`],
      ['Ek / Ep', `${m.ek.toFixed(2)} / ${m.ep.toFixed(2)} Дж`],
      ['Потеря энергии Q', `${Math.max(0, m.e0 - m.ek - m.ep).toFixed(2)} Дж`],
    ];
  },

  renderDiagram(m) {
    const maxQ = Math.max(0.1, m.amp0);
    const maxV = Math.max(0.1, m.amp0 * m.omega0);
    const cx = 100;
    const cy = 78;
    const rx = 64 / maxQ;
    const ry = 54 / maxV;
    const pathD = m.phasePts
      .map((pt, i) => `${i ? 'L' : 'M'}${(cx + pt[0] * rx).toFixed(1)},${(cy - pt[1] * ry).toFixed(1)}`)
      .join(' ');
    const curX = cx + m.q * rx;
    const curY = cy - m.qDot * ry;

    const eRef = Math.max(0.01, m.e0);
    const wK = Math.min(136, (m.ek / eRef) * 136);
    const wP = Math.min(136, (m.ep / eRef) * 136);

    return (
      `<svg role="img" aria-label="Фазовый портрет (q, q')" viewBox="0 0 200 200" style="display:block;width:100%;height:auto">` +
      `<ellipse cx="${cx}" cy="${cy}" rx="64" ry="54" fill="none" stroke="currentColor" stroke-opacity=".1" stroke-dasharray="3 3"/>` +
      `<line x1="20" y1="${cy}" x2="180" y2="${cy}" stroke="currentColor" stroke-opacity=".32" stroke-width="1.2"/>` +
      `<line x1="${cx}" y1="16" x2="${cx}" y2="140" stroke="currentColor" stroke-opacity=".32" stroke-width="1.2"/>` +
      `<text x="176" y="${cy - 5}" text-anchor="end" font-size="9.5" fill="currentColor" opacity=".65">${m.type === 'math' ? 'φ' : 'x'}</text>` +
      `<text x="${cx + 5}" y="22" font-size="9.5" fill="currentColor" opacity=".65">v</text>` +
      `<path d="${pathD}" fill="none" stroke="#38bdf8" stroke-width="2.2"/>` +
      `<circle cx="${curX.toFixed(1)}" cy="${curY.toFixed(1)}" r="4.2" fill="#f59e0b"/>` +
      `<text x="16" y="164" font-size="10.5" fill="#22c55e">Ek</text><rect x="38" y="156" width="${wK.toFixed(1)}" height="8" rx="2" fill="#22c55e"/>` +
      `<text x="16" y="180" font-size="10.5" fill="#3b82f6">Ep</text><rect x="38" y="172" width="${wP.toFixed(1)}" height="8" rx="2" fill="#3b82f6"/>` +
      '</svg>'
    );
  },

  build(api, opts = {}) {
    const m = opts.solved || this.evaluateAt(0, { type: 'math', L: 2, k: 16, m: 1.5, deg0: 36, x0: 0.55, beta: 0.04 });
    const G = opts.groups;
    const { V, seg, dashedSeg, dot, cylinderShell, studioBox, coilSpring, arcSeg, trail, arrow, THREE } = api;
    const topY = 2.4;

    // Лабораторный штатив на опорной плите (y = 0)
    const standX = -1.1;
    studioBox(G.frame, 0.96, 0.06, 0.68, [standX + 0.15, 0.03, 0], 0x1e293b, {
      metalness: 0.22,
      roughness: 0.62,
      edgeColor: 0x475569,
      edgeOpacity: 0.45,
    });
    cylinderShell(G.frame, 0.032, 0.036, topY + 0.08, [standX, (topY + 0.08) / 2, 0], 0x94a3b8, 1, { metal: true });
    cylinderShell(G.frame, 0.055, 0.055, 0.1, [standX, topY, 0], 0x475569, 1, { metal: true });
    seg(G.frame, V(standX, topY, 0), V(0.14, topY, 0), 0.026, 0xcbd5e1, { metalness: 0.68, roughness: 0.28 });
    dashedSeg(G.frame, V(0, topY, 0), V(0, 0.14, 0), 0.006, 0x475569);
    dot(G.frame, V(0, topY, 0), 0xe2e8f0, 0.048, { role: 'wireframe', metalness: 0.6 });

    const visualL = m.type === 'math' ? Math.min(2.15, 0.75 + (m.L || 2) * 0.35) : 1.25;
    let rodMesh = null;
    let springHandle = null;
    let arcPoints = null;

    if (m.type === 'math') {
      const geo = new THREE.CylinderGeometry(0.016, 0.016, 1, 12);
      rodMesh = new THREE.Mesh(
        geo,
        new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.72, roughness: 0.26 })
      );
      rodMesh.userData.exportTintRole = 'wireframe';
      G.frame.add(rodMesh);

      const maxAng = Math.max(0.1, m.amp0 || 0.6);
      arcSeg(
        G.frame,
        V(0, topY, 0),
        V(0, -1, 0),
        V(1, 0, 0),
        Math.min(0.62, visualL * 0.38),
        -maxAng,
        maxAng,
        0.009,
        0x38bdf8,
        28,
        { opacity: 0.65, role: 'accent' }
      );
      arcPoints = trail(G.bob, 40, 0xfbbf24, 0.45);
    } else {
      springHandle = coilSpring(G.frame, { turns: 11, steps: 96, coilRad: 0.12, wireRad: 0.017, col: 0x7dd3fc });
      // Муфта на стойке штатива со стрелкой уровня равновесия пружины
      const eqY = topY - visualL;
      cylinderShell(G.frame, 0.05, 0.05, 0.07, [standX, eqY, 0], 0x475569, 1, { metal: true });
      seg(G.frame, V(standX, eqY, 0), V(-0.28, eqY, 0), 0.012, 0x38bdf8);
      dot(G.frame, V(-0.28, eqY, 0), 0x38bdf8, 0.024, { role: 'accent' });
    }

    const bobRadius = 0.095 + (m.m || 1.5) * 0.018;
    const bobDot = dot(G.bob, V(0, topY - visualL, 0), 0xf59e0b, bobRadius, {
      metalness: 0.35,
      roughness: 0.16,
      clearcoat: 0.92,
      role: 'preserve',
    });
    const vArrow = arrow(G.vec, 0x22c55e, 0.018, 0.052, 0.15);
    const fArrow = arrow(G.vec, 0xef4444, 0.018, 0.052, 0.15);

    return {
      target: [0, 1.15, 0],
      fitRadius: 2.35,
      groundY: 0,
      handles: { topY, visualL, rodMesh, springHandle, arcPoints, bobDot, vArrow, fArrow },
    };
  },

  updateScene(api, { solved: m, params, handles }) {
    if (!handles || !m) return;
    const { V, updateCoilSpring, updateTrail, updateArrow } = api;
    const { topY, visualL, rodMesh, springHandle, arcPoints, bobDot, vArrow, fArrow } = handles;

    if (m.type === 'math') {
      const bx = visualL * Math.sin(m.q);
      const by = topY - visualL * Math.cos(m.q);
      bobDot.position.set(bx, by, 0);

      if (rodMesh) {
        const dir = V(bx, by - topY, 0);
        rodMesh.scale.set(1, dir.length(), 1);
        rodMesh.position.set(bx / 2, (topY + by) / 2, 0);
        rodMesh.quaternion.setFromUnitVectors(V(0, 1, 0), dir.normalize());
      }

      if (arcPoints && Array.isArray(m.phasePts)) {
        // Короткий след текущей дуги качания в 3D
        const pts3d = m.phasePts.slice(-36).map(([q]) => V(visualL * Math.sin(q), topY - visualL * Math.cos(q), 0));
        updateTrail(arcPoints, pts3d);
      }

      const vMag = m.qDot * visualL * 0.28;
      updateArrow(vArrow, bobDot.position, [Math.cos(m.q) * vMag, Math.sin(m.q) * vMag, 0], 0.03);
      const fMag = -Math.sin(m.q) * 0.75;
      updateArrow(fArrow, bobDot.position, [Math.cos(m.q) * fMag, Math.sin(m.q) * fMag, 0], 0.03);
    } else {
      const yBob = topY - visualL - m.q * 0.85;
      bobDot.position.set(0, yBob, 0);

      if (springHandle) {
        updateCoilSpring(springHandle, [0, topY, 0], [0, yBob, 0]);
      }

      updateArrow(vArrow, bobDot.position, [0, -m.vLin * 0.35, 0], 0.03);
      updateArrow(fArrow, bobDot.position, [0, m.q * 0.95, 0], 0.03);
    }
  },
};
