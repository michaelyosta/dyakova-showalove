/** Правильная n-угольная пирамида и вписанный шар. */

const DEFAULT_H = 6 * Math.sqrt(2 / 3);

export default {
  id: 'pyramid-inscribed-sphere',
  category: 'combinations',
  title: 'Правильная пирамида и вписанный шар',
  shortTitle: 'Пирамида · вписанный шар',
  subtitle: 'Стереометрия · комбинации тел',
  description: 'Радиус вписанного шара r = ρh / (ρ + l), точки касания на апофемах и сечение SOM.',
  tags: ['пирамида', 'вписанный шар', 'апофема', 'тетраэдр', 'егэ'],
  previewSvg: `<svg viewBox="0 0 100 100" width="96" height="96" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round">
    <polygon points="50,12 18,74 54,84 84,68" fill="rgba(56,189,248,0.12)" stroke="#94a3b8"/>
    <line x1="50" y1="12" x2="54" y2="84"/>
    <circle cx="51" cy="56" r="18" stroke="#38bdf8" fill="rgba(56,189,248,0.22)"/>
    <line x1="50" y1="12" x2="51" y2="75" stroke="#f87171" stroke-dasharray="3 2"/>
  </svg>`,

  params: [
    { key: 'n', label: 'Сторон n', type: 'range', min: 3, max: 8, step: 1, default: 3, format: (v) => String(v) },
    { key: 'a', label: 'Сторона a', type: 'range', min: 1, max: 12, step: 0.1, default: 6 },
    { key: 'h', label: 'Высота h', type: 'range', min: 1, max: 12, step: 0.1, default: DEFAULT_H },
  ],
  presets: [
    { id: 'reg', label: 'Правильный тетраэдр', values: { n: 3, a: 6, h: DEFAULT_H } },
  ],
  summarizeParams: (p) => `n=${p.n}`,

  layers: [
    { key: 'f', color: '#9aa0aa', label: 'Грани и рёбра', step: 0 },
    { key: 'cc', color: '#a855f7', label: 'Радиус описанной окружности основания R = OA', step: 1 },
    { key: 'ic', color: '#ec4899', label: 'Радиус вписанной окружности основания ρ = OM', step: 1 },
    { key: 'h', color: '#ef4444', label: 'Высота h = SO', step: 2 },
    { key: 'a', color: '#3b82f6', label: 'Апофемы l = SM', step: 3 },
    { key: 's', color: '#7dd3fc', label: 'Вписанный шар', step: 4 },
    { key: 'r', color: '#22c55e', label: 'Радиус шара r = IT', step: 5 },
    { key: 't', color: '#f59e0b', label: 'Точки касания O, T', step: 5 },
    { key: 'x', color: '#eab308', label: 'Сечение плоскостью SOM', step: 6 },
  ],

  steps: [
    { title: 'Пирамида', text: 'В основании правильный n-угольник, вершина S проецируется в его центр O.' },
    { title: 'Окружности основания', text: 'R = OA — радиус описанной окружности, ρ = OM — вписанной (M — середина стороны основания).' },
    { title: 'Высота', text: 'Высота h = SO перпендикулярна основанию.' },
    { title: 'Апофемы', text: 'Апофема l = SM — высота боковой грани. Так как OM ⟂ AB, то и SM ⟂ AB, а l² = h² + ρ².' },
    { title: 'Вписанный шар', text: 'Центр шара I лежит на высоте: он равноудалён от основания и всех боковых граней.' },
    { title: 'Радиус и точки касания', text: 'Шар касается основания в точке O, а боковых граней — в точках T на апофемах. Радиус IT перпендикулярен грани, IO = IT = r.' },
    { title: 'Сечение SOM', text: 'В плоскости SOM шар даёт окружность, касающуюся OM в точке O и SM в точке T. Касательные из M равны: MT = MO = ρ. Центр I лежит на биссектрисе угла SMO, откуда r = ρh / (ρ + l).' },
    { title: 'Проверка', text: 'Объём V = Sосн·h/3, S — площадь полной поверхности. Должно получиться r = 3V / S.' },
  ],

  calcAriaLabel: 'Расчёт параметров пирамиды и вписанного шара',
  diagramAriaLabel: 'Сечение SOM: окружность касается OM в O и SM в T',
  diagramLayerKey: 'x',

  cameraDefaults: {
    position: [5.4, 3.4, 5.6],
    target: [0, 1.0, 0],
    fitRadius: 2.5,
  },

  solve(p = {}) {
    const n = Math.max(3, Math.round(Number(p?.n ?? 3)));
    const a = Math.max(0.2, Number(p?.a ?? 6));
    const h = Math.max(0.2, Number(p?.h ?? DEFAULT_H));
    const R = a / (2 * Math.sin(Math.PI / n));
    const rho = a / (2 * Math.tan(Math.PI / n));
    const l = Math.hypot(h, rho);
    const r = (rho * h) / (rho + l);
    const Sb = (n * a * rho) / 2;
    const Sf = Sb + (n * a * l) / 2;
    return { n, a, h, R, rho, l, r, Sf, vol: (Sb * h) / 3 };
  },

  getCalcRows(m) {
    return [
      ['R — радиус описанной окружности основания', m.R],
      ['ρ — радиус вписанной окружности основания', m.rho],
      ['l — апофема, √(h² + ρ²)', m.l],
      ['r — радиус шара, ρh / (ρ + l)', m.r],
      ['V — объём', m.vol],
      ['S — площадь полной поверхности', m.Sf],
      ['3V / S', (3 * m.vol) / m.Sf],
      ['h / r', m.h / m.r],
    ];
  },

  renderDiagram(m) {
    const k = 152 / Math.max(m.h, m.rho + m.r);
    const X = (x) => 22 + k * (x + m.r);
    const Y = (y) => 182 - k * y;
    const Tx = m.rho - (m.rho * m.rho) / m.l;
    const Ty = (m.rho * m.h) / m.l;
    const ln = (x1, y1, x2, y2, c) =>
      `<line x1="${X(x1)}" y1="${Y(y1)}" x2="${X(x2)}" y2="${Y(y2)}" stroke="${c}" stroke-width="2.8" stroke-linecap="round"/>`;
    const dt = (x, y, c = '#f59e0b') => `<circle cx="${X(x)}" cy="${Y(y)}" r="4.2" fill="${c}"/>`;
    const tx = (x, y, s, dx = 5, dy = -5) =>
      `<text x="${X(x) + dx}" y="${Y(y) + dy}" font-size="12" font-weight="700" fill="currentColor">${s}</text>`;
    const raSize = 8;
    const raO = `<polyline points="${X(0)},${Y(0) - raSize} ${X(0) + raSize},${Y(0) - raSize} ${X(0) + raSize},${Y(0)}" fill="none" stroke="#ef4444" stroke-width="1.3" opacity="0.8"/>`;
    const ux = -m.h / m.l;
    const uy = -m.rho / m.l;
    const vx = m.rho / m.l;
    const vy = -m.h / m.l;
    const tx0 = X(Tx);
    const ty0 = Y(Ty);
    const raT = `<polyline points="${tx0 + ux * raSize},${ty0 - uy * raSize} ${tx0 + (ux + vx) * raSize},${ty0 - (uy + vy) * raSize} ${tx0 + vx * raSize},${ty0 - vy * raSize}" fill="none" stroke="#22c55e" stroke-width="1.3" opacity="0.85"/>`;
    return (
      `<svg role="img" aria-label="Сечение SOM: окружность касается OM в O и SM в T" viewBox="0 0 200 200" style="display:block;width:100%;height:auto">` +
      `<circle cx="${X(0)}" cy="${Y(m.r)}" r="${k * m.r}" fill="rgba(56,189,248,.22)" stroke="#38bdf8" stroke-width="2"/>` +
      raO +
      raT +
      ln(0, 0, m.rho, 0, '#ec4899') +
      ln(0, 0, 0, m.h, '#ef4444') +
      ln(m.rho, 0, 0, m.h, '#3b82f6') +
      ln(0, m.r, Tx, Ty, '#22c55e') +
      dt(0, 0) +
      dt(Tx, Ty) +
      dt(0, m.r, '#22c55e') +
      tx(0, m.h, 'S', 5, 2) +
      tx(0, 0, 'O', -14, 12) +
      tx(m.rho, 0, 'M', 5, 4) +
      tx(0, m.r, 'I', -14, 4) +
      tx(Tx, Ty, 'T', 5, -4) +
      '</svg>'
    );
  },

  build(api, opts = {}) {
    const m = opts.solved || this.solve(opts.params);
    const G = opts.groups;
    const { V, mid, seg, dot, ring, tri, label, sphere, rightAngleMark } = api;
    const n = m.n;
    const k = 1.8 / Math.max(m.R, m.h * 0.7);
    const v = (x, y, z) => V(x * k, y * k, z * k);
    const pol = (d, i) => {
      const t = (2 * Math.PI * i) / n;
      return v(d * Math.cos(t), 0, d * Math.sin(t));
    };

    const Sv = v(0, m.h, 0);
    const O = v(0, 0, 0);
    const I = v(0, m.r, 0);
    const A = [...Array(n)].map((_, i) => pol(m.R, i));
    const M = A.map((_, i) => pol(m.rho, i + 0.5));
    const T = M.map((p) => p.clone().lerp(Sv, m.rho / m.l));

    const pts = [];
    A.forEach((p, i) => {
      const q = A[(i + 1) % n];
      seg(G.f, p, q, 0.015, 0xcbd5e1);
      seg(G.f, Sv, p, 0.015, 0xcbd5e1);
      dot(G.f, p, 0xe2e8f0, 0.036, { role: 'wireframe' });
      label('ABCDEFGH'[i], p.clone().multiplyScalar(1.14).add(V(0, -0.04, 0)), G.f);
      pts.push(p, q, Sv, O, p, q);
    });
    dot(G.f, Sv, 0xe2e8f0, 0.04, { role: 'wireframe' });
    label('S', Sv.clone().add(V(0, 0.26, 0)), G.f);
    label('O', O.clone().add(V(-0.16, -0.24, -0.16)), G.f);
    G.f.add(tri(pts, 0x7dd3fc, 0.09, { roughness: 0.14, clearcoat: 0.78 }));

    ring(G.cc, m.R * k, 0xa855f7, 0.013);
    ring(G.ic, m.rho * k, 0xec4899, 0.013);
    A.forEach((p) => seg(G.cc, O, p, 0.02, 0xa855f7));
    M.forEach((p) => seg(G.ic, O, p, 0.02, 0xec4899));
    label('R', mid(O, A[0]).add(V(0, 0.17, 0)), G.cc);
    label('ρ', mid(O, M[0]).add(V(0, 0.17, 0)), G.ic);

    seg(G.h, Sv, O, 0.028, 0xef4444);
    rightAngleMark(G.h, O, Sv.clone().sub(O), M[0].clone().sub(O), 0.16, 0xef4444, 0.009);
    label('h', mid(Sv, I).add(V(0.24, 0.04, 0.22)), G.h, { color: '#f87171' });

    M.forEach((p) => seg(G.a, Sv, p, 0.022, 0x3b82f6));
    label('l', mid(Sv, M[0]).add(V(0.22, 0.1, 0.2)), G.a, { color: '#93c5fd' });

    sphere(G.s, I, m.r * k, 0x38bdf8, 0.28, { roughness: 0.1, clearcoat: 0.94 });
    ring(G.s, m.r * k, 0x7dd3fc, 0.008, { center: I, opacity: 0.42 });
    label('I', I.clone().add(V(-0.24, 0.06, -0.22)), G.s, { color: '#7dd3fc' });

    T.forEach((p) => {
      seg(G.r, I, p, 0.022, 0x22c55e);
      dot(G.t, p, 0xf59e0b, 0.065);
    });
    rightAngleMark(G.r, T[0], I.clone().sub(T[0]), Sv.clone().sub(M[0]), 0.14, 0x22c55e, 0.009);
    dot(G.t, O, 0xf59e0b, 0.068);
    dot(G.r, I, 0x22c55e, 0.052);
    label('r', mid(I, T[0]).add(V(0, 0.18, 0)), G.r, { color: '#6ee7b7' });
    label('T', T[0].clone().add(T[0].clone().sub(I).normalize().multiplyScalar(0.26)), G.t, { color: '#fbbf24' });

    G.x.add(tri([Sv, O, M[0]], 0xfbbf24, 0.24, { roughness: 0.18 }));
    const th = Math.PI / n;
    ring(G.x, m.r * k, 0x38bdf8, 0.012, { center: I, normal: V(-Math.sin(th), 0, Math.cos(th)) });

    return { target: [0, m.h * k * 0.42, 0], fitRadius: 2.5, groundY: 0,
      measurement: { scale: 1 / k, unit: 'ед.', points: [
        { name: 'S', position: Sv.toArray(), layer: 'f' }, { name: 'O', position: O.toArray(), layer: 'f' },
        ...A.map((p, i) => ({ name: 'ABCDEFGH'[i], position: p.toArray(), layer: 'f' })),
        ...M.map((p, i) => ({ name: `M${i + 1}`, position: p.toArray(), layer: 'a' })),
        { name: 'I', position: I.toArray(), layer: 's' },
        ...T.map((p, i) => ({ name: `T${i + 1}`, position: p.toArray(), layer: 't' })),
      ] },
    };
  },
};
