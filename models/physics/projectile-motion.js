/** Бросок тела под углом к горизонту: баллистика, 3D-векторы скорости/ускорения, траектория и график энергий. */

function kinematicsAt(t, p) {
  const rad = (p.deg * Math.PI) / 180;
  const vx0 = p.v0 * Math.cos(rad);
  const vy0 = p.v0 * Math.sin(rad);
  const g = p.g;
  const k = p.kDrag;

  if (k < 1e-4) {
    return {
      x: vx0 * t,
      y: p.h0 + vy0 * t - 0.5 * g * t * t,
      vx: vx0,
      vy: vy0 - g * t,
    };
  }
  const vt = g / k;
  const e = Math.exp(-k * t);
  const w = (1 - e) / k;
  return {
    x: vx0 * w,
    y: p.h0 + (vy0 + vt) * w - vt * t,
    vx: vx0 * e,
    vy: (vy0 + vt) * e - vt,
  };
}

function findLandingTime(p) {
  const rad = (p.deg * Math.PI) / 180;
  const vy0 = p.v0 * Math.sin(rad);
  if (p.kDrag < 1e-4) {
    return (vy0 + Math.sqrt(vy0 * vy0 + 2 * p.g * p.h0)) / p.g;
  }
  let lo = 0;
  let hi = 0.25;
  while (hi < 45 && kinematicsAt(hi, p).y > 0) {
    lo = hi;
    hi += 0.25;
  }
  for (let i = 0; i < 28; i++) {
    const mid = (lo + hi) * 0.5;
    if (kinematicsAt(mid, p).y > 0) lo = mid;
    else hi = mid;
  }
  return (lo + hi) * 0.5;
}

export default {
  id: 'projectile-motion',
  kind: 'simulation',
  subject: 'physics',
  category: 'mechanics',
  title: 'Бросок тела под углом к горизонту',
  shortTitle: 'Бросок под углом',
  subtitle: 'Физика · баллистика',
  description: 'Траектория с учётом сопротивления воздуха, векторы v, vx, vy, g и график энергий в реальном времени.',
  tags: ['баллистика', 'парабола', 'скорость', 'ускорение', 'физика', 'егэ'],
  previewSvg: `<svg viewBox="0 0 100 100" width="96" height="96" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
    <line x1="12" y1="80" x2="88" y2="80" stroke="#64748b"/>
    <path d="M16 74 Q50 14 84 80" stroke="#38bdf8" stroke-dasharray="4 3"/>
    <circle cx="44" cy="39" r="5" fill="#fbbf24" stroke="none"/>
    <line x1="44" y1="39" x2="64" y2="29" stroke="#34d399" stroke-width="2.4"/>
    <line x1="44" y1="39" x2="44" y2="57" stroke="#f87171" stroke-width="2.2"/>
  </svg>`,

  params: [
    { key: 'v0', label: 'Скорость v₀', type: 'range', min: 4, max: 28, step: 0.5, default: 16, format: (v) => `${v.toFixed(1)} м/с` },
    { key: 'deg', label: 'Угол α', type: 'range', min: 5, max: 85, step: 1, default: 50, format: (v) => `${Math.round(v)}°` },
    { key: 'h0', label: 'Высота h₀', type: 'range', min: 0, max: 15, step: 0.5, default: 2, format: (v) => `${v.toFixed(1)} м` },
    { key: 'g', label: 'Ускорение g', type: 'range', min: 1.6, max: 20, step: 0.2, default: 9.8, format: (v) => `${v.toFixed(1)}` },
    { key: 'kDrag', label: 'Сопрот. k/m', type: 'range', min: 0, max: 0.5, step: 0.02, default: 0, format: (v) => `${v.toFixed(2)}` },
  ],
  presets: [
    { id: 'opt-45', label: 'Дальность под 45° (h₀ = 0)', values: { v0: 16, deg: 45, h0: 0, g: 9.8, kDrag: 0 } },
    { id: 'tower-drag', label: 'С башни с сопротивлением', values: { v0: 18, deg: 35, h0: 8, g: 9.8, kDrag: 0.16 } },
    { id: 'moon', label: 'На Луне (g = 1.6 м/с²)', values: { v0: 10, deg: 45, h0: 0, g: 1.6, kDrag: 0 } },
  ],
  summarizeParams: (p) => `v₀=${p.v0}, α=${Math.round(p.deg)}°`,

  playback: { loop: false, canScrub: true, defaultSpeed: 1 },
  getDuration: (p) => Math.max(0.4, findLandingTime(p)),

  layers: [
    { key: 'env', color: '#9aa0aa', label: 'Поверхность и точка старта', step: 0 },
    { key: 'full', color: '#38bdf8', label: 'Расчётная траектория', step: 0 },
    { key: 'ball', color: '#f59e0b', label: 'Тело и пройденный путь', step: 0 },
    { key: 'vel', color: '#22c55e', label: 'Вектор скорости v и проекции vx, vy', step: 0 },
    { key: 'acc', color: '#ef4444', label: 'Вектор ускорения g', step: 0 },
    { key: 'x', color: '#eab308', label: 'График y(x) и энергий', step: 0 },
  ],

  calcAriaLabel: 'Мгновенные параметры полёта тела',
  diagramAriaLabel: 'График траектории y(x) и соотношение энергий',
  diagramLayerKey: 'x',

  cameraDefaults: {
    position: [0.3, 2.3, 6.2],
    target: [0, 0.8, 0],
    fitRadius: 2.6,
  },

  evaluateAt(t, p) {
    const tLand = Math.max(0.2, findLandingTime(p));
    const tc = Math.max(0, Math.min(t, tLand));
    const landed = t >= tLand - 1e-4;
    const end = kinematicsAt(tLand, p);
    const cur = landed ? { ...end, y: 0 } : kinematicsAt(tc, p);

    let maxH = p.h0;
    const fullPts = [];
    const N = 48;
    for (let i = 0; i <= N; i++) {
      const ti = (tLand * i) / N;
      const st = kinematicsAt(ti, p);
      if (st.y > maxH) maxH = st.y;
      fullPts.push([st.x, Math.max(0, st.y)]);
    }

    const trailPts = [];
    const M = 40;
    for (let i = 0; i <= M; i++) {
      const ti = (tc * i) / M;
      const st = kinematicsAt(ti, p);
      trailPts.push([st.x, Math.max(0, st.y)]);
    }

    const speed = Math.hypot(cur.vx, cur.vy);
    const ek = 0.5 * speed * speed; // на единицу массы (Дж/кг)
    const ep = p.g * Math.max(0, cur.y);
    const e0 = 0.5 * p.v0 * p.v0 + p.g * p.h0;

    return {
      t: tc,
      tLand,
      landed,
      x: cur.x,
      y: Math.max(0, cur.y),
      vx: cur.vx,
      vy: cur.vy,
      speed,
      range: end.x,
      maxH,
      ek,
      ep,
      e0,
      fullPts,
      trailPts,
      g: p.g,
      h0: p.h0,
    };
  },

  getCalcRows(m) {
    return [
      ['Время полёта t', `${m.t.toFixed(2)} / ${m.tLand.toFixed(2)} с`],
      ['Координата x', `${m.x.toFixed(2)} м (L=${m.range.toFixed(1)})`],
      ['Высота y', `${m.y.toFixed(2)} м (H=${m.maxH.toFixed(1)})`],
      ['Скорость v', `${m.speed.toFixed(2)} м/с`],
      ['vx / vy', `${m.vx.toFixed(1)} / ${m.vy.toFixed(1)} м/с`],
      ['Ek / Ep (Дж/кг)', `${m.ek.toFixed(0)} / ${m.ep.toFixed(0)}`],
    ];
  },

  renderDiagram(m) {
    const spanX = Math.max(1, m.range);
    const spanY = Math.max(1, m.maxH);
    const scale = Math.min(164 / spanX, 118 / spanY);
    const ox = 16;
    const oy = 148;
    const X = (x) => ox + x * scale;
    const Y = (y) => oy - y * scale;

    const fullD = m.fullPts
      .map((pt, i) => `${i ? 'L' : 'M'}${X(pt[0]).toFixed(1)},${Y(pt[1]).toFixed(1)}`)
      .join(' ');
    const doneD = m.trailPts
      .map((pt, i) => `${i ? 'L' : 'M'}${X(pt[0]).toFixed(1)},${Y(pt[1]).toFixed(1)}`)
      .join(' ');

    const bx = X(m.x);
    const by = Y(m.y);
    const wK = Math.min(140, (m.ek / Math.max(1, m.e0)) * 140);
    const wP = Math.min(140, (m.ep / Math.max(1, m.e0)) * 140);

    return (
      `<svg role="img" aria-label="Траектория y(x) и энергии" viewBox="0 0 200 200" style="display:block;width:100%;height:auto">` +
      `<line x1="12" y1="${oy}" x2="188" y2="${oy}" stroke="currentColor" stroke-opacity=".35" stroke-width="1.5"/>` +
      `<line x1="${ox}" y1="16" x2="${ox}" y2="${oy}" stroke="currentColor" stroke-opacity=".35" stroke-width="1.5"/>` +
      `<line x1="${bx.toFixed(1)}" y1="${by.toFixed(1)}" x2="${bx.toFixed(1)}" y2="${oy}" stroke="#9aa2b1" stroke-opacity=".45" stroke-dasharray="2.5 2.5" stroke-width="1.2"/>` +
      `<path d="${fullD}" fill="none" stroke="#38bdf8" stroke-opacity=".42" stroke-width="2" stroke-dasharray="4 3"/>` +
      `<path d="${doneD}" fill="none" stroke="#f59e0b" stroke-width="2.8" stroke-linecap="round"/>` +
      `<circle cx="${bx.toFixed(1)}" cy="${by.toFixed(1)}" r="4.5" fill="#f59e0b"/>` +
      `<text x="16" y="168" font-size="10.5" font-weight="600" fill="#3b82f6">Ek</text><rect x="38" y="160" width="${wK.toFixed(1)}" height="8" rx="2" fill="#3b82f6"/>` +
      `<text x="16" y="184" font-size="10.5" font-weight="600" fill="#22c55e">Ep</text><rect x="38" y="176" width="${wP.toFixed(1)}" height="8" rx="2" fill="#22c55e"/>` +
      '</svg>'
    );
  },

  build(api, opts = {}) {
    const m = opts.solved || this.evaluateAt(0, { v0: 16, deg: 48, h0: 0, g: 9.81, kDrag: 0.04 });
    const p = opts.params || {};
    const G = opts.groups;
    const { V, seg, dot, ring, studioBox, cylinderShell, arcSeg, trail, updateTrail, arrow } = api;
    const kScale = 3.5 / Math.max(4, m.range, m.maxH * 1.45);
    const ox = -m.range * kScale * 0.5;
    const mapPt = (x, y) => V(ox + x * kScale, y * kScale, 0);

    // Лабораторная разгонная платформа и мерная рейка
    const pw = Math.max(2.3, m.range * kScale * 0.65);
    const pd = 1.25;
    studioBox(G.env, pw * 2, 0.05, pd * 2, [0, -0.025, 0], 0x1e293b, {
      metalness: 0.35,
      roughness: 0.5,
      edgeColor: 0x475569,
      edgeOpacity: 0.5,
    });
    seg(G.env, V(-pw, 0.002, 0), V(pw, 0.002, 0), 0.011, 0x94a3b8);
    for (let x = -Math.floor(pw * 2) / 2; x <= pw; x += 0.5) {
      seg(G.env, V(x, 0.002, -pd), V(x, 0.002, pd), 0.005, 0x475569);
    }
    if (m.h0 > 0.05) {
      const hPhys = m.h0 * kScale;
      cylinderShell(G.env, 0.045, 0.06, hPhys, [ox, hPhys * 0.5, 0], 0x94a3b8, 1, { metal: true });
    }
    dot(G.env, mapPt(0, m.h0), 0xcbd5e1, 0.055, { role: 'wireframe' });
    dot(G.env, mapPt(m.range, 0), 0x38bdf8, 0.055);
    ring(G.env, 0.12, 0x38bdf8, 0.01, { center: mapPt(m.range, 0), opacity: 0.65 });

    const degRad = ((p.deg ?? 48) * Math.PI) / 180;
    if (degRad > 0.04) {
      arcSeg(G.env, mapPt(0, m.h0), V(1, 0, 0), V(0, 1, 0), 0.34, 0, degRad, 0.009, 0x38bdf8, 16, { opacity: 0.7 });
    }

    // Полная расчётная траектория
    const fullTrail = trail(G.full, m.fullPts.length, 0x38bdf8, 0.52);
    updateTrail(fullTrail, m.fullPts.map(([x, y]) => mapPt(x, y)));

    // Динамический след, проекция высоты на землю и снаряд
    const liveTrail = trail(G.ball, m.trailPts.length + 2, 0xf59e0b, 0.95);
    const dropTrail = trail(G.ball, 2, 0x94a3b8, 0.45);
    const dropShadow = dot(G.ball, mapPt(m.x, 0), 0x64748b, 0.04, { opacity: 0.55 });
    const ballMesh = dot(G.ball, mapPt(m.x, m.y), 0xf59e0b, 0.095, {
      metalness: 0.3,
      roughness: 0.16,
      clearcoat: 0.9,
      role: 'preserve',
    });

    // 3D-векторы
    const vVec = arrow(G.vel, 0x22c55e, 0.02, 0.055, 0.16);
    const vxVec = arrow(G.vel, 0x3b82f6, 0.013, 0.04, 0.12);
    const vyVec = arrow(G.vel, 0x3b82f6, 0.013, 0.04, 0.12);
    const gVec = arrow(G.acc, 0xef4444, 0.018, 0.052, 0.15);

    return {
      target: [0, m.maxH * kScale * 0.42, 0],
      fitRadius: 2.55,
      groundY: -0.004,
      handles: { kScale, ox, fullTrail, liveTrail, dropTrail, dropShadow, ballMesh, vVec, vxVec, vyVec, gVec, v0Max: Math.hypot(m.vx, m.vy) || 10 },
    };
  },

  updateScene(api, { solved: m, params, handles }) {
    if (!handles || !m) return;
    const { V, updateTrail, updateArrow } = api;
    const { kScale, ox, liveTrail, dropTrail, dropShadow, ballMesh, vVec, vxVec, vyVec, gVec } = handles;
    const pos = V(ox + m.x * kScale, m.y * kScale, 0);
    ballMesh.position.copy(pos);
    dropShadow.position.set(pos.x, 0.006, 0);
    updateTrail(dropTrail, [pos, V(pos.x, 0.006, 0)]);
    updateTrail(liveTrail, m.trailPts.map(([x, y]) => V(ox + x * kScale, y * kScale, 0)));

    const vScale = 0.85 / Math.max(4, params?.v0 ?? 16);
    updateArrow(vVec, pos, [m.vx * vScale, m.vy * vScale, 0], 0.03);
    updateArrow(vxVec, pos, [m.vx * vScale, 0, 0], 0.03);
    updateArrow(vyVec, pos, [0, m.vy * vScale, 0], 0.03);
    const gLen = Math.min(0.85, Math.max(0.25, (params?.g ?? 9.81) * 0.055));
    updateArrow(gVec, pos, [0, -gLen, 0], 0.03);
  },
};
