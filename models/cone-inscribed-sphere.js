/** Конус и вписанный шар. */

const EQ_H = 4 * Math.sqrt(3);

export default {
  id: 'cone-inscribed-sphere',
  category: 'combinations',
  title: 'Конус и вписанный шар',
  shortTitle: 'Конус · вписанный шар',
  subtitle: 'Стереометрия · тела вращения',
  description: 'Касание конуса по окружности, осевое сечение SAB и радиус шара r = Rh / (R + l).',
  tags: ['конус', 'шар', 'образующая', 'тела вращения', 'егэ'],
  previewSvg: `<svg viewBox="0 0 100 100" width="96" height="96" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round">
    <polygon points="50,14 18,76 82,76" fill="rgba(148,163,184,0.14)"/>
    <ellipse cx="50" cy="76" rx="32" ry="9" stroke="#a855f7"/>
    <circle cx="50" cy="56" r="20" stroke="#38bdf8" fill="rgba(56,189,248,0.22)"/>
    <line x1="50" y1="14" x2="50" y2="76" stroke="#f87171" stroke-dasharray="3 2"/>
  </svg>`,

  params: [
    { key: 'R', label: 'Радиус R', type: 'range', min: 1, max: 10, step: 0.1, default: 4 },
    { key: 'h', label: 'Высота h', type: 'range', min: 1.5, max: 12, step: 0.1, default: 6 },
  ],
  presets: [
    { id: 'eq-cone', label: 'Равносторонний конус (l = 2R)', values: { R: 4, h: EQ_H } },
  ],
  summarizeParams: (p) => `R=${Number(p.R).toFixed(1)}, h=${Number(p.h).toFixed(1)}`,

  layers: [
    { key: 'f', color: '#9aa0aa', label: 'Поверхность конуса и основание', step: 0 },
    { key: 'h', color: '#ef4444', label: 'Высота конуса h = SO', step: 1 },
    { key: 'gen', color: '#3b82f6', label: 'Образующие SA, SB (l)', step: 1 },
    { key: 's', color: '#7dd3fc', label: 'Вписанный шар (центр I)', step: 2 },
    { key: 't', color: '#f59e0b', label: 'Окружность и точки касания O, T', step: 3 },
    { key: 'r', color: '#22c55e', label: 'Радиусы шара IO = IT = r', step: 3 },
    { key: 'x', color: '#eab308', label: 'Осевое сечение SAB', step: 4 },
  ],

  steps: [
    { title: 'Конус', text: 'Прямой круговой конус с центром основания O, радиусом R = OA и вершиной S.' },
    { title: 'Ось и образующая', text: 'Высота SO = h перпендикулярна основанию, образующая l = SA = √(R² + h²).' },
    { title: 'Вписанный шар', text: 'Шар касается основания в точке O, а боковой поверхности — по окружности, плоскость которой параллельна основанию.' },
    { title: 'Радиус вписанного шара', text: 'Центр шара I лежит на оси SO, радиусы IO = IT = r перпендикулярны плоскости основания и образующей SA.' },
    { title: 'Осевое сечение SAB', text: 'В равнобедренном треугольнике SAB вписана окружность радиуса r: r = R·h / (R + l).' },
  ],

  calcAriaLabel: 'Расчёт параметров конуса и вписанного шара',
  diagramAriaLabel: 'Осевое сечение конуса SAB с вписанной окружностью',
  diagramLayerKey: 'x',

  cameraDefaults: {
    position: [5.2, 3.3, 5.4],
    target: [0, 0.9, 0],
    fitRadius: 2.5,
  },

  solve(p = {}) {
    const R = Math.max(0.2, Number(p?.R ?? 4));
    const h = Math.max(0.2, Number(p?.h ?? 6));
    const l = Math.hypot(R, h);
    const r = (R * h) / (R + l);
    const rTang = R * (1 - R / l);
    const yTang = (R * h) / l;
    const Vcone = (Math.PI * R * R * h) / 3;
    const Vsph = (4 / 3) * Math.PI * r * r * r;
    return { R, h, l, r, rTang, yTang, Vcone, Vsph };
  },

  getCalcRows(m) {
    return [
      ['l — образующая, √(R² + h²)', m.l],
      ['r — радиус шара, Rh / (R + l)', m.r],
      ['rкас — радиус окр. касания', m.rTang],
      ['Vконуса', m.Vcone],
      ['Vшара', m.Vsph],
      ['Vшара / Vконуса', m.Vsph / m.Vcone],
    ];
  },

  renderDiagram(m) {
    const k = 152 / Math.max(m.h, 2 * m.R);
    const X = (x) => 100 + x * k;
    const Y = (y) => 182 - y * k;
    const Tx = m.rTang;
    const Ty = m.yTang;
    const ln = (x1, y1, x2, y2, c) =>
      `<line x1="${X(x1)}" y1="${Y(y1)}" x2="${X(x2)}" y2="${Y(y2)}" stroke="${c}" stroke-width="2.8" stroke-linecap="round"/>`;
    const dt = (x, y, c) => `<circle cx="${X(x)}" cy="${Y(y)}" r="4" fill="${c}"/>`;
    const tx = (x, y, s, dx = 5, dy = -4) =>
      `<text x="${X(x) + dx}" y="${Y(y) + dy}" font-size="12" font-weight="700" fill="currentColor">${s}</text>`;
    const raSize = 8;
    const raO = `<polyline points="${X(0)},${Y(0) - raSize} ${X(0) + raSize},${Y(0) - raSize} ${X(0) + raSize},${Y(0)}" fill="none" stroke="#ef4444" stroke-width="1.3" opacity="0.8"/>`;
    const ux = -m.h / m.l;
    const uy = -m.R / m.l;
    const vx = m.R / m.l;
    const vy = -m.h / m.l;
    const tx0 = X(Tx);
    const ty0 = Y(Ty);
    const raT = `<polyline points="${tx0 + ux * raSize},${ty0 - uy * raSize} ${tx0 + (ux + vx) * raSize},${ty0 - (uy + vy) * raSize} ${tx0 + vx * raSize},${ty0 - vy * raSize}" fill="none" stroke="#22c55e" stroke-width="1.3" opacity="0.85"/>`;

    return (
      `<svg role="img" aria-label="Осевое сечение SAB" viewBox="0 0 200 200" style="display:block;width:100%;height:auto">` +
      `<circle cx="${X(0)}" cy="${Y(m.r)}" r="${k * m.r}" fill="rgba(56,189,248,.22)" stroke="#38bdf8" stroke-width="2"/>` +
      raO +
      raT +
      ln(-m.R, 0, m.R, 0, '#a855f7') +
      ln(0, 0, 0, m.h, '#ef4444') +
      ln(-m.R, 0, 0, m.h, '#3b82f6') +
      ln(m.R, 0, 0, m.h, '#3b82f6') +
      ln(0, m.r, Tx, Ty, '#22c55e') +
      dt(0, 0, '#f59e0b') +
      dt(Tx, Ty, '#f59e0b') +
      dt(0, m.r, '#22c55e') +
      tx(0, m.h, 'S', 4, -2) +
      tx(-m.R, 0, 'B', -14, 4) +
      tx(m.R, 0, 'A', 4, 4) +
      tx(0, 0, 'O', 4, 13) +
      tx(0, m.r, 'I', -14, 4) +
      tx(Tx, Ty, 'T', 5, -3) +
      '</svg>'
    );
  },

  build(api, opts = {}) {
    const m = opts.solved || this.solve(opts.params);
    const G = opts.groups;
    const { V, mid, seg, dot, ring, tri, label, sphere, coneShell, rightAngleMark } = api;
    const k = 1.8 / Math.max(m.R, m.h * 0.72);
    const v = (x, y, z) => V(x * k, y * k, z * k);

    const Sv = v(0, m.h, 0);
    const O = v(0, 0, 0);
    const A = v(m.R, 0, 0);
    const B = v(-m.R, 0, 0);
    const I = v(0, m.r, 0);
    const Ta = v(m.rTang, m.yTang, 0);
    const Tb = v(-m.rTang, m.yTang, 0);

    coneShell(G.f, m.R * k, m.h * k, 0, 0x7dd3fc, 0.11, { roughness: 0.14, clearcoat: 0.85 });
    ring(G.f, m.R * k, 0xa855f7, 0.015);
    // Тонкие направляющие сечения конуса усиливают восприятие кривизны поверхности
    ring(G.f, m.R * k * 0.66, 0x94a3b8, 0.006, { center: v(0, m.h * 0.34, 0), opacity: 0.25 });
    ring(G.f, m.R * k * 0.33, 0x94a3b8, 0.006, { center: v(0, m.h * 0.67, 0), opacity: 0.22 });
    seg(G.f, B, A, 0.016, 0xa855f7);
    dot(G.f, Sv, 0xe2e8f0, 0.04, { role: 'wireframe' });
    dot(G.f, A, 0xe2e8f0, 0.036, { role: 'wireframe' });
    dot(G.f, B, 0xe2e8f0, 0.036, { role: 'wireframe' });
    label('S', Sv.clone().add(V(0, 0.24, 0)), G.f);
    label('A', A.clone().add(V(0.2, -0.04, 0)), G.f);
    label('B', B.clone().add(V(-0.22, -0.04, 0)), G.f);
    label('O', O.clone().add(V(-0.18, -0.22, 0.14)), G.f);

    seg(G.h, Sv, O, 0.028, 0xef4444);
    rightAngleMark(G.h, O, Sv.clone().sub(O), A.clone().sub(O), 0.16, 0xef4444, 0.009);
    label('h', mid(Sv, I).add(V(0.2, 0.04, 0.18)), G.h, { color: '#f87171' });

    seg(G.gen, Sv, A, 0.022, 0x3b82f6);
    seg(G.gen, Sv, B, 0.022, 0x3b82f6);
    label('l', mid(Sv, A).add(V(0.2, 0.12, 0)), G.gen, { color: '#93c5fd' });

    sphere(G.s, I, m.r * k, 0x38bdf8, 0.28, { roughness: 0.1, clearcoat: 0.94 });
    ring(G.s, m.r * k, 0x7dd3fc, 0.008, { center: I, opacity: 0.4 });
    dot(G.s, I, 0x22c55e, 0.048);
    label('I', I.clone().add(V(-0.24, 0.08, -0.2)), G.s, { color: '#7dd3fc' });

    ring(G.t, m.rTang * k, 0xf59e0b, 0.014, { center: v(0, m.yTang, 0) });
    dot(G.t, O, 0xf59e0b, 0.065);
    dot(G.t, Ta, 0xf59e0b, 0.065);
    dot(G.t, Tb, 0xf59e0b, 0.065);
    label('T', Ta.clone().add(V(0.24, 0.1, 0)), G.t, { color: '#fbbf24' });

    seg(G.r, I, O, 0.022, 0x22c55e);
    seg(G.r, I, Ta, 0.022, 0x22c55e);
    rightAngleMark(G.r, Ta, I.clone().sub(Ta), Sv.clone().sub(A), 0.14, 0x22c55e, 0.009);
    label('r', mid(I, Ta).add(V(0, 0.18, 0)), G.r, { color: '#6ee7b7' });

    G.x.add(tri([Sv, B, A], 0xfbbf24, 0.22, { roughness: 0.18 }));
    ring(G.x, m.r * k, 0x38bdf8, 0.012, { center: I, normal: V(0, 0, 1) });

    return { target: [0, m.h * k * 0.42, 0], fitRadius: 2.5, groundY: 0 };
  },
};
