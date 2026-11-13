/** Разрыв снаряда и разлёт осколков: визуализация взрыва и закона сохранения импульса. */

function explodeVectors(count, m1, m2, m3, jExp) {
  if (count === '2') {
    const dir = [0.74, 0.36, 0.568];
    const norm = Math.hypot(...dir);
    const u = dir.map((v) => v / norm);
    return [
      { m: m1, dv: u.map((c) => (jExp / m1) * c), col: 0x38bdf8, label: 'p₁' },
      { m: m2, dv: u.map((c) => -(jExp / m2) * c), col: 0x22c55e, label: 'p₂' },
    ];
  }
  const d1 = [0.76, 0.35, 0.547];
  const n1 = Math.hypot(...d1);
  const u1 = d1.map((v) => v / n1);
  const d2 = [-0.65, -0.32, 0.689];
  const n2 = Math.hypot(...d2);
  const u2 = d2.map((v) => v / n2);
  const dv1 = u1.map((c) => (jExp / m1) * c);
  const dv2 = u2.map((c) => (jExp / m2) * c);
  const dv3 = [0, 1, 2].map((i) => -(m1 * dv1[i] + m2 * dv2[i]) / m3);
  return [
    { m: m1, dv: dv1, col: 0x38bdf8, label: 'p₁' },
    { m: m2, dv: dv2, col: 0x22c55e, label: 'p₂' },
    { m: m3, dv: dv3, col: 0xec4899, label: 'p₃' },
  ];
}

function buildSparkSeeds() {
  const arr = [];
  for (let i = 0; i < 42; i++) {
    const phi = i * 2.3999632;
    const cosT = 1 - (2 * (i + 0.5)) / 42;
    const sinT = Math.sqrt(Math.max(0, 1 - cosT * cosT));
    const sp = 3.2 + (i % 5) * 1.1;
    arr.push({ dx: sinT * Math.cos(phi) * sp, dy: cosT * sp, dz: sinT * Math.sin(phi) * sp });
  }
  return arr;
}
const SPARKS = buildSparkSeeds();

export default {
  id: 'impulse-explosion',
  kind: 'simulation',
  subject: 'physics',
  category: 'mechanics',
  title: 'Разрыв снаряда и закон импульса',
  shortTitle: 'Разрыв · закон импульса',
  subtitle: 'Физика · законы сохранения',
  description: 'Разлёт 2 или 3 осколков в воздухе: вспышка разрыва, движение центра масс и сумма векторов импульса.',
  tags: ['взрыв', 'разрыв', 'импульс', 'осколки', 'центр масс', 'физика'],
  previewSvg: `<svg viewBox="0 0 100 100" width="96" height="96" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
    <path d="M16 78 Q38 40 50 34" stroke="#94a3b8" stroke-dasharray="3 3"/>
    <circle cx="50" cy="34" r="10" stroke="#fbbf24" stroke-width="1.2" opacity=".45"/>
    <circle cx="50" cy="34" r="4.5" fill="#fde047" stroke="#f87171"/>
    <path d="M50 34 Q68 22 86 70" stroke="#38bdf8"/>
    <path d="M50 34 Q54 52 56 80" stroke="#34d399"/>
    <path d="M50 34 Q38 30 22 72" stroke="#f87171"/>
  </svg>`,

  params: [
    {
      key: 'count',
      label: 'Число осколков',
      type: 'select',
      default: '2',
      options: [
        { value: '2', label: '2 осколка (противоположно)' },
        { value: '3', label: '3 осколка (пространственный разлёт)' },
      ],
    },
    { key: 'v0', label: 'Скорость v₀', type: 'range', min: 6, max: 20, step: 0.5, default: 12, format: (v) => `${v.toFixed(1)} м/с` },
    { key: 'deg', label: 'Угол α', type: 'range', min: 30, max: 85, step: 1, default: 64, format: (v) => `${Math.round(v)}°` },
    { key: 'm1', label: 'Масса m₁', type: 'range', min: 1, max: 6, step: 0.5, default: 2, format: (v) => `${v.toFixed(1)} кг` },
    { key: 'm2', label: 'Масса m₂', type: 'range', min: 1, max: 6, step: 0.5, default: 3, format: (v) => `${v.toFixed(1)} кг` },
    { key: 'm3', label: 'Масса m₃', type: 'range', min: 1, max: 6, step: 0.5, default: 2, format: (v) => `${v.toFixed(1)} кг`, visibleIf: (p) => p.count === '3' },
    { key: 'jExp', label: 'Импульс взрыва', type: 'range', min: 4, max: 24, step: 1, default: 14, format: (v) => `${Math.round(v)} Н·с` },
    { key: 'tFrac', label: 'Момент разрыва', type: 'range', min: 0.25, max: 0.72, step: 0.02, default: 0.44, format: (v) => `${Math.round(v * 100)}%` },
  ],
  presets: [
    { id: 'mid-2', label: 'Разрыв на 2 части в верхней точке', values: { count: '2', v0: 12, deg: 64, m1: 2, m2: 3, jExp: 14, tFrac: 0.5 } },
    { id: 'tri-3d', label: 'Разрыв на 3 осколка в 3D', values: { count: '3', v0: 13, deg: 68, m1: 2, m2: 2.5, m3: 1.5, jExp: 12, tFrac: 0.44 } },
  ],
  summarizeParams: (p) => `${p.count} оск., J=${Math.round(p.jExp)}`,

  playback: { loop: false, canScrub: true, defaultSpeed: 1 },
  getDuration(p) {
    const g = 9.8;
    const rad = (p.deg * Math.PI) / 180;
    const vx0 = p.v0 * Math.cos(rad);
    const vy0 = p.v0 * Math.sin(rad);
    const t0 = (2 * vy0) / g;
    const tExp = p.tFrac * t0;
    const yExp = vy0 * tExp - 0.5 * g * tExp * tExp;
    const vyExp = vy0 - g * tExp;
    const frags = explodeVectors(p.count, p.m1, p.m2, p.m3 || 2, p.jExp);
    let maxT = t0;
    frags.forEach((f) => {
      const vyi = vyExp + f.dv[1];
      const dtLand = (vyi + Math.sqrt(Math.max(0, vyi * vyi + 2 * g * Math.max(0, yExp)))) / g;
      maxT = Math.max(maxT, tExp + dtLand);
    });
    return Math.max(0.8, maxT);
  },

  layers: [
    { key: 'env', color: '#9aa0aa', label: 'Площадка и траектория центра масс', step: 0 },
    { key: 'body', color: '#f59e0b', label: 'Снаряд / осколки и вспышка взрыва', step: 0 },
    { key: 'vec', color: '#22c55e', label: 'Векторы импульсов p₀ и pᵢ', step: 0 },
    { key: 'x', color: '#eab308', label: 'Сравнение импульсов |Σpᵢ| и энергии', step: 0 },
  ],

  calcAriaLabel: 'Закон сохранения импульса при разрыве',
  diagramAriaLabel: 'Диаграмма импульсов до и после разрыва',
  diagramLayerKey: 'x',

  cameraDefaults: {
    position: [2.4, 2.7, 6.2],
    target: [0, 0.9, 0],
    fitRadius: 2.7,
  },

  evaluateAt(t, p) {
    const g = 9.8;
    const rad = (p.deg * Math.PI) / 180;
    const vx0 = p.v0 * Math.cos(rad);
    const vy0 = p.v0 * Math.sin(rad);
    const tBaseFlight = (2 * vy0) / g;
    const tExp = p.tFrac * tBaseFlight;
    const xExp = vx0 * tExp;
    const yExp = vy0 * tExp - 0.5 * g * tExp * tExp;
    const vyExp = vy0 - g * tExp;

    const frags = explodeVectors(p.count, p.m1, p.m2, p.m3 || 2, p.jExp);
    const totalM = frags.reduce((acc, f) => acc + f.m, 0);

    const fragResults = frags.map((f) => {
      const vx = vx0 + f.dv[0];
      const vyi = vyExp + f.dv[1];
      const vz = f.dv[2];
      const dtLand = (vyi + Math.sqrt(Math.max(0, vyi * vyi + 2 * g * Math.max(0, yExp)))) / g;
      const tEnd = tExp + dtLand;
      if (t < tExp) {
        return { ...f, pos: [vx0 * t, Math.max(0, vy0 * t - 0.5 * g * t * t), 0], vel: [vx0, vy0 - g * t, 0], landed: false, tEnd };
      }
      const tau = Math.min(t - tExp, dtLand);
      const landed = t >= tEnd - 1e-4;
      const curVy = landed ? 0 : vyi - g * tau;
      return {
        ...f,
        pos: [xExp + vx * tau, landed ? 0 : Math.max(0, yExp + vyi * tau - 0.5 * g * tau * tau), vz * tau],
        vel: landed ? [0, 0, 0] : [vx, curVy, vz],
        landed,
        tEnd,
        trailPts: buildArc(xExp, yExp, 0, vx, vyi, vz, g, tau, 22),
      };
    });

    const duration = Math.max(tBaseFlight, ...fragResults.map((f) => f.tEnd));
    const tc = Math.max(0, Math.min(t, duration));
    const exploded = tc >= tExp;
    const cmPos = [vx0 * Math.min(tc, tBaseFlight), Math.max(0, vy0 * Math.min(tc, tBaseFlight) - 0.5 * g * Math.min(tc, tBaseFlight) ** 2), 0];

    // Суммарный импульс в текущий момент (пока в воздухе все части)
    const pBefore = [totalM * vx0, totalM * vyExp, 0];
    const sumP = [0, 0, 0];
    let ekSum = 0;
    fragResults.forEach((f) => {
      sumP[0] += f.m * f.vel[0];
      sumP[1] += f.m * f.vel[1];
      sumP[2] += f.m * f.vel[2];
      ekSum += 0.5 * f.m * (f.vel[0] ** 2 + f.vel[1] ** 2 + f.vel[2] ** 2);
    });
    const ekBefore = 0.5 * totalM * (vx0 * vx0 + vyExp * vyExp);
    const allInAir = exploded && fragResults.every((f) => !f.landed);
    const pSumMag = Math.hypot(...sumP);
    const pExpMag = Math.hypot(...pBefore);

    // Масштабирование для 3D-сцены
    let maxH = (vy0 * vy0) / (2 * g);
    let minX = 0, maxX = vx0 * tBaseFlight, maxAbsZ = 1;
    fragResults.forEach((f) => {
      const vyAfter = vyExp + f.dv[1];
      const hPeak = yExp + (vyAfter > 0 ? (vyAfter * vyAfter) / (2 * g) : 0);
      maxH = Math.max(maxH, hPeak);
      minX = Math.min(minX, xExp + (vx0 + f.dv[0]) * (f.tEnd - tExp));
      maxX = Math.max(maxX, xExp + (vx0 + f.dv[0]) * (f.tEnd - tExp));
      maxAbsZ = Math.max(maxAbsZ, Math.abs(f.dv[2] * (f.tEnd - tExp)));
    });

    return {
      t: tc,
      duration,
      tExp,
      exploded,
      xExp,
      yExp,
      totalM,
      cmPos,
      cmTraj: buildArc(0, 0, 0, vx0, vy0, 0, g, tBaseFlight, 36),
      fragResults,
      pBefore,
      pExpMag,
      sumP,
      pSumMag,
      ekBefore,
      ekSum,
      allInAir,
      minX,
      maxX,
      maxH,
      maxAbsZ,
      sparksTau: exploded ? tc - tExp : -1,
    };
  },

  getCalcRows(m) {
    const dEk = m.exploded ? m.ekSum - m.ekBefore : 0;
    return [
      ['Время / разрыв', `${m.t.toFixed(2)} с (tвзр=${m.tExp.toFixed(2)} с)`],
      ['Статус', m.exploded ? 'После разрыва' : 'До разрыва (полёт M)'],
      ['|p₀| (в момент tвзр)', `${m.pExpMag.toFixed(1)} кг·м/с`],
      ['|Σpᵢ| сейчас', m.allInAir || !m.exploded ? `${m.pSumMag.toFixed(1)} кг·м/с` : `${m.pSumMag.toFixed(1)} (удар о землю)`],
      ['ΣEk осколков', `${m.ekSum.toFixed(0)} Дж${m.exploded ? ` (+${Math.max(0, dEk).toFixed(0)})` : ''}`],
    ];
  },

  renderDiagram(m) {
    // 2D-диаграмма векторов импульсов осколков, их суммы Σp и исходного импульса p0
    const scale = 54 / Math.max(8, m.pExpMag, ...m.fragResults.map((f) => Math.hypot(f.m * f.vel[0], f.m * f.vel[1])));
    const ox = 50;
    const oy = 114;
    const vecArrow = (x1, y1, x2, y2, col, w = 2.6, dash = '') => {
      const dx = x2 - x1;
      const dy = y2 - y1;
      const len = Math.hypot(dx, dy);
      if (len < 3) return '';
      const ux = dx / len;
      const uy = dy / len;
      const hs = Math.min(7, len * 0.35);
      const ax = x2 - ux * hs;
      const ay = y2 - uy * hs;
      const px = -uy * hs * 0.45;
      const py = ux * hs * 0.45;
      return (
        `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${ax.toFixed(1)}" y2="${ay.toFixed(1)}" stroke="${col}" stroke-width="${w}" stroke-linecap="round"${dash ? ` stroke-dasharray="${dash}"` : ''}/>` +
        `<polygon points="${x2.toFixed(1)},${y2.toFixed(1)} ${(ax + px).toFixed(1)},${(ay + py).toFixed(1)} ${(ax - px).toFixed(1)},${(ay - py).toFixed(1)}" fill="${col}"/>`
      );
    };

    const arrows = m.exploded
      ? m.fragResults
          .map((f) => {
            const x2 = ox + f.m * f.vel[0] * scale;
            const y2 = oy - f.m * f.vel[1] * scale;
            const col = '#' + f.col.toString(16).padStart(6, '0');
            return vecArrow(ox, oy, x2, y2, col, 2.6);
          })
          .join('')
      : vecArrow(ox, oy, ox + m.sumP[0] * scale, oy - m.sumP[1] * scale, '#f59e0b', 3.2);

    const p0x = ox + m.pBefore[0] * scale;
    const p0y = oy - m.pBefore[1] * scale;
    const sumX = ox + m.sumP[0] * scale;
    const sumY = oy - m.sumP[1] * scale;
    return (
      `<svg role="img" aria-label="Векторы импульсов" viewBox="0 0 200 200" style="display:block;width:100%;height:auto">` +
      `<line x1="14" y1="164" x2="186" y2="164" stroke="currentColor" stroke-opacity=".3" stroke-width="1.2"/>` +
      vecArrow(ox, oy, p0x, p0y, '#eab308', 2.0, '4 3') +
      (m.exploded ? vecArrow(ox, oy, sumX, sumY, '#fbbf24', 1.8) : '') +
      arrows +
      `<circle cx="${ox}" cy="${oy}" r="4" fill="#ef4444"/>` +
      `<text x="16" y="184" font-size="10.2" fill="currentColor">${
        m.exploded
          ? m.allInAir
            ? 'p₀(tвзр) — пунктир · Σpᵢ(t) меняется под g'
            : 'Осколки упали · импульс передан земле'
          : 'До разрыва: целое тело M'
      }</text>` +
      '</svg>'
    );
  },

  build(api, opts = {}) {
    const m = opts.solved || this.evaluateAt(0, { count: '3', v0: 15, deg: 58, tExp: 1.0, totalM: 6, jExp: 26, g: 9.81 });
    const G = opts.groups;
    const { V, seg, dot, ring, studioBox, trail, updateTrail, arrow, sphere, instancedSpheres } = api;
    const spanX = Math.max(4, m.maxX - m.minX);
    const kScale = 3.4 / Math.max(spanX, m.maxH * 1.35, m.maxAbsZ * 1.4);
    const ox = -0.5 * (m.maxX + m.minX) * kScale;
    const mapV = (pt) => V(ox + pt[0] * kScale, pt[1] * kScale, pt[2] * kScale);

    const pw = Math.max(2.4, spanX * kScale * 0.65);
    const pd = Math.max(1.4, m.maxAbsZ * kScale * 1.1);
    studioBox(G.env, pw * 2, 0.05, pd * 2, [0, -0.025, 0], 0x1e293b, {
      metalness: 0.35,
      roughness: 0.5,
      edgeColor: 0x475569,
      edgeOpacity: 0.5,
    });
    seg(G.env, V(-pw, 0.002, 0), V(pw, 0.002, 0), 0.01, 0x64748b);

    const cmTrail = trail(G.env, m.cmTraj.length, 0x9aa2b1, 0.48);
    updateTrail(cmTrail, m.cmTraj.map(mapV));
    const cmDot = dot(G.env, mapV(m.cmPos), 0xeab308, 0.056, { opacity: 0.85 });
    dot(G.env, mapV([m.xExp, m.yExp, 0]), 0xef4444, 0.048);

    const shellDot = dot(G.body, mapV(m.cmPos), 0xf59e0b, 0.115, {
      metalness: 0.32,
      roughness: 0.18,
      clearcoat: 0.9,
      role: 'preserve',
    });
    const shockSphere = sphere(G.body, mapV([m.xExp, m.yExp, 0]), 0.5, 0xfef08a, 0.28, {
      roughness: 0.25,
      role: 'preserve',
    });
    shockSphere.visible = false;
    const shockRing = ring(G.body, 0.5, 0xf97316, 0.018, {
      center: mapV([m.xExp, m.yExp, 0]),
      opacity: 0.7,
      role: 'preserve',
    });
    if (shockRing) shockRing.visible = false;

    const fragMeshes = m.fragResults.map((f) => ({
      mesh: dot(G.body, mapV(f.pos), f.col, 0.068 + f.m * 0.01, { role: 'preserve', metalness: 0.25, roughness: 0.2 }),
      trail: trail(G.body, 28, f.col, 0.88),
      arrow: arrow(G.vec, f.col, 0.018, 0.05, 0.14),
    }));
    const totalPArrow = arrow(G.vec, 0xf59e0b, 0.02, 0.055, 0.16);
    const sparksMesh = instancedSpheres(G.body, SPARKS.length, 0.044, 0xfef08a, { unlit: true, perInstanceColor: true });

    return {
      target: [0, m.maxH * kScale * 0.42, 0],
      fitRadius: 2.6,
      groundY: -0.004,
      handles: { kScale, ox, cmDot, shellDot, shockSphere, shockRing, fragMeshes, totalPArrow, sparksMesh },
    };
  },

  updateScene(api, { solved: m, handles }) {
    if (!handles || !m) return;
    const { V, updateTrail, updateArrow, updateInstanced } = api;
    const { kScale, ox, cmDot, shellDot, shockSphere, shockRing, fragMeshes, totalPArrow, sparksMesh } = handles;
    const mapV = (pt) => V(ox + pt[0] * kScale, pt[1] * kScale, pt[2] * kScale);

    cmDot.position.copy(mapV(m.cmPos));
    shellDot.visible = !m.exploded;
    if (!m.exploded) shellDot.position.copy(mapV(m.cmPos));

    const pScale = 0.75 / Math.max(8, m.pExpMag);
    updateArrow(totalPArrow, mapV(m.cmPos), m.exploded ? [0, 0, 0] : [m.sumP[0] * pScale, m.sumP[1] * pScale, m.sumP[2] * pScale], 0.03);

    fragMeshes.forEach((fm, idx) => {
      const f = m.fragResults[idx];
      fm.mesh.visible = m.exploded;
      if (m.exploded && f) {
        const pos = mapV(f.pos);
        fm.mesh.position.copy(pos);
        updateTrail(fm.trail, (f.trailPts || []).map(mapV));
        updateArrow(fm.arrow, pos, [f.m * f.vel[0] * pScale, f.m * f.vel[1] * pScale, f.m * f.vel[2] * pScale], 0.03);
      } else {
        updateTrail(fm.trail, []);
        updateArrow(fm.arrow, [0, 0, 0], [0, 0, 0], 1);
      }
    });

    if (m.sparksTau >= 0 && m.sparksTau < 0.45) {
      const u = m.sparksTau / 0.45;
      const sc = 0.18 + u * 1.45;
      shockSphere.visible = true;
      shockSphere.scale.setScalar(sc);
      shockSphere.material.opacity = (1 - u) * 0.36;
      if (shockRing) {
        shockRing.visible = true;
        shockRing.scale.setScalar(sc * 1.18);
        shockRing.material.opacity = (1 - u) * 0.78;
      }
    } else {
      shockSphere.visible = false;
      if (shockRing) shockRing.visible = false;
    }

    if (m.sparksTau >= 0 && m.sparksTau < 0.75) {
      const tau = m.sparksTau;
      const fade = 1 - tau / 0.75;
      updateInstanced(sparksMesh, SPARKS.length, (i) => {
        const sp = SPARKS[i];
        return {
          x: ox + (m.xExp + sp.dx * tau) * kScale,
          y: Math.max(0.02, (m.yExp + sp.dy * tau - 4.9 * tau * tau) * kScale),
          z: sp.dz * tau * kScale,
          s: fade * 1.25,
          color: fade > 0.6 ? 0xfef08a : fade > 0.3 ? 0xfb923c : 0xef4444,
        };
      });
    } else {
      updateInstanced(sparksMesh, 0, () => ({ x: 0, y: 0, z: 0 }));
    }
  },
};

function buildArc(x0, y0, z0, vx, vy, vz, g, dur, n) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const dt = (dur * i) / n;
    out.push([x0 + vx * dt, Math.max(0, y0 + vy * dt - 0.5 * g * dt * dt), z0 + vz * dt]);
  }
  return out;
}
