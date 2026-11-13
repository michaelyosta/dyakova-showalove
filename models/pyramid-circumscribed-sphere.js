/** Правильная n-угольная пирамида и описанный шар. */

const TETRA_H = 6 * Math.sqrt(2 / 3);

export default {
  id: 'pyramid-circumscribed-sphere',
  category: 'combinations',
  title: 'Правильная пирамида и описанный шар',
  shortTitle: 'Пирамида · описанный шар',
  subtitle: 'Стереометрия · комбинации тел',
  description: 'Центр шара Q на оси высоты (внутри пирамиды, в основании O или под ним) и радиус Rш = (h² + R²) / (2h).',
  tags: ['пирамида', 'описанный шар', 'радиус сферы', 'тетраэдр', 'егэ'],
  previewSvg: `<svg viewBox="0 0 100 100" width="96" height="96" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round">
    <circle cx="50" cy="52" r="36" stroke="#38bdf8" fill="rgba(56,189,248,0.12)"/>
    <polygon points="50,16 18,68 54,84 82,66" fill="rgba(148,163,184,0.16)"/>
    <line x1="50" y1="16" x2="54" y2="84"/>
    <line x1="50" y1="16" x2="50" y2="70" stroke="#f87171" stroke-dasharray="3 2"/>
    <circle cx="50" cy="52" r="3" fill="#34d399"/>
  </svg>`,

  params: [
    { key: 'n', label: 'Сторон n', type: 'range', min: 3, max: 8, step: 1, default: 4, format: (v) => String(v) },
    { key: 'a', label: 'Сторона a', type: 'range', min: 1, max: 12, step: 0.1, default: 6 },
    { key: 'h', label: 'Высота h', type: 'range', min: 1, max: 12, step: 0.1, default: 6 },
  ],
  presets: [
    { id: 'reg-tetra', label: 'Правильный тетраэдр', values: { n: 3, a: 6, h: TETRA_H } },
    { id: 'flat-pyr', label: 'Низкая пирамида (Q ниже O)', values: { n: 4, a: 8, h: 3 } },
  ],
  summarizeParams: (p) => `n=${p.n}`,

  layers: [
    { key: 'f', color: '#9aa0aa', label: 'Грани и рёбра пирамиды', step: 0 },
    { key: 'cc', color: '#a855f7', label: 'Описанная окружность основания (R = OA)', step: 1 },
    { key: 'h', color: '#ef4444', label: 'Высота и ось SO (с продолжением)', step: 2 },
    { key: 's', color: '#7dd3fc', label: 'Описанный шар (центр Q)', step: 3 },
    { key: 'r', color: '#22c55e', label: 'Радиусы шара QS, QA и высота QK', step: 4 },
    { key: 'x', color: '#eab308', label: 'Сечение плоскостью SOA', step: 5 },
  ],

  steps: [
    { title: 'Пирамида', text: 'Вершины основания A, B, ... лежат на окружности радиуса R с центром O.' },
    { title: 'Центр в плоскости основания', text: 'Описанная вокруг основания окружность имеет радиус R = a / (2·sin(π/n)).' },
    { title: 'Положение центра Q', text: 'Центр Q описанного шара равноудалён от всех вершин, значит лежит на прямой SO на высоте yQ = (h² − R²) / (2h).' },
    { title: 'Описанный шар', text: 'Шар проходит через вершину S и все вершины основания. При h < R центр Q опускается ниже основания.' },
    { title: 'Формула радиуса', text: 'В прямоугольном треугольнике QOA: Rш² = R² + yQ², откуда Rш = (h² + R²) / (2h) = b² / (2h), где K — середина ребра SA и QK ⟂ SA.' },
    { title: 'Проверка в сечении SOA', text: 'В плоскости SOA треугольник QSA равнобедренный (QS = QA = Rш), а окружность с центром Q проходит через S и A.' },
  ],

  calcAriaLabel: 'Расчёт параметров пирамиды и описанного шара',
  diagramAriaLabel: 'Сечение SOA: описанная окружность с центром Q проходит через S и A',
  diagramLayerKey: 'x',

  cameraDefaults: {
    position: [6.0, 3.6, 6.2],
    target: [0, 0.8, 0],
    fitRadius: 2.8,
  },

  solve(p = {}) {
    const n = Math.max(3, Math.round(Number(p?.n ?? 4)));
    const a = Math.max(0.2, Number(p?.a ?? 6));
    const h = Math.max(0.2, Number(p?.h ?? 6));
    const R = a / (2 * Math.sin(Math.PI / n));
    const b = Math.hypot(h, R);
    const yQ = (h * h - R * R) / (2 * h);
    const Rs = (h * h + R * R) / (2 * h);
    return { n, a, h, R, b, yQ, Rs };
  },

  getCalcRows(m) {
    const posText = m.yQ > 0.02 ? 'выше O' : m.yQ < -0.02 ? 'ниже O' : 'в точке O';
    return [
      ['R — радиус окр. основания', m.R],
      ['b = SA — боковое ребро', m.b],
      ['yQ — коорд. центра Q (по оси OS)', `${m.yQ.toFixed(2)} (${posText})`],
      ['Rш — радиус описанного шара', m.Rs],
      ['h + |yQ| / сравнение Rш', (m.b * m.b) / (2 * m.h)],
    ];
  },

  renderDiagram(m) {
    const minY = Math.min(0, m.yQ - m.Rs);
    const maxY = Math.max(m.h, m.yQ + m.Rs);
    const minX = -Math.max(m.Rs, m.R * 0.35);
    const maxX = Math.max(m.R, m.Rs);
    const spanX = Math.max(0.1, maxX - minX);
    const spanY = Math.max(0.1, maxY - minY);
    const k = 148 / Math.max(spanX * 1.12, spanY * 1.12);
    const ox = 102 - (minX + maxX) * 0.5 * k;
    const oy = 100 + (minY + maxY) * 0.5 * k;
    const X = (x) => ox + x * k;
    const Y = (y) => oy - y * k;

    const Kx = m.R / 2;
    const Ky = m.h / 2;
    const ln = (x1, y1, x2, y2, c, dash = '') =>
      `<line x1="${X(x1)}" y1="${Y(y1)}" x2="${X(x2)}" y2="${Y(y2)}" stroke="${c}" stroke-width="2.6" stroke-linecap="round"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`;
    const dt = (x, y, c) => `<circle cx="${X(x)}" cy="${Y(y)}" r="3.8" fill="${c}"/>`;
    const tx = (x, y, s, dx = 5, dy = -4) => {
      const px = Math.max(12, Math.min(188, X(x) + dx));
      const py = Math.max(14, Math.min(190, Y(y) + dy));
      return `<text x="${px}" y="${py}" font-size="12" font-weight="700" fill="currentColor">${s}</text>`;
    };

    const raSize = 7;
    const raO = `<polyline points="${X(0)},${Y(0) - raSize} ${X(0) + raSize},${Y(0) - raSize} ${X(0) + raSize},${Y(0)}" fill="none" stroke="#ef4444" stroke-width="1.2" opacity="0.8"/>`;

    return (
      `<svg role="img" aria-label="Сечение SOA и описанная окружность" viewBox="0 0 200 200" style="display:block;width:100%;height:auto">` +
      `<circle cx="${X(0)}" cy="${Y(m.yQ)}" r="${k * m.Rs}" fill="rgba(56,189,248,.16)" stroke="#38bdf8" stroke-width="2"/>` +
      raO +
      (m.yQ < 0 ? ln(0, 0, 0, m.yQ, '#ef4444', '4 3') : '') +
      ln(0, 0, m.R, 0, '#a855f7') +
      ln(0, 0, 0, m.h, '#ef4444') +
      ln(0, m.h, m.R, 0, '#9aa2b1') +
      ln(0, m.yQ, m.R, 0, '#22c55e') +
      ln(0, m.yQ, Kx, Ky, '#f59e0b', '3 3') +
      dt(0, m.h, '#9aa2b1') +
      dt(m.R, 0, '#9aa2b1') +
      dt(0, 0, '#f59e0b') +
      dt(0, m.yQ, '#22c55e') +
      dt(Kx, Ky, '#f59e0b') +
      tx(0, m.h, 'S', 5, 4) +
      tx(0, 0, 'O', -16, 4) +
      tx(m.R, 0, 'A', 5, 5) +
      tx(0, m.yQ, 'Q', -16, m.yQ < 0 ? 12 : 4) +
      tx(Kx, Ky, 'K', 5, -3) +
      '</svg>'
    );
  },

  build(api, opts = {}) {
    const m = opts.solved || this.solve(opts.params);
    const G = opts.groups;
    const { V, mid, seg, dashedSeg, dot, ring, tri, label, sphere, rightAngleMark } = api;
    const n = m.n;
    const scaleRef = Math.max(m.Rs, m.R, m.h * 0.7);
    const k = 1.65 / Math.max(0.5, scaleRef);
    const v = (x, y, z) => V(x * k, y * k, z * k);
    const pol = (d, i) => {
      const t = (2 * Math.PI * i) / n;
      return v(d * Math.cos(t), 0, d * Math.sin(t));
    };

    const Sv = v(0, m.h, 0);
    const O = v(0, 0, 0);
    const Q = v(0, m.yQ, 0);
    const A = [...Array(n)].map((_, i) => pol(m.R, i));
    const K = mid(Sv, A[0]);

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
    label('S', Sv.clone().add(V(0, 0.24, 0)), G.f);
    label('O', O.clone().add(V(-0.22, -0.2, 0.16)), G.f);
    G.f.add(tri(pts, 0x7dd3fc, 0.085, { roughness: 0.14, clearcoat: 0.78 }));

    ring(G.cc, m.R * k, 0xa855f7, 0.014);
    seg(G.cc, O, A[0], 0.02, 0xa855f7);
    label('R', mid(O, A[0]).add(V(0, 0.15, 0)), G.cc);

    seg(G.h, Sv, O, 0.028, 0xef4444);
    rightAngleMark(G.h, O, Sv.clone().sub(O), A[0].clone().sub(O), 0.16, 0xef4444, 0.009);
    if (m.yQ < -0.01) dashedSeg(G.h, O, Q, 0.02, 0xef4444, 0.1, 0.07);
    label('h', mid(Sv, O).add(V(0.22, 0.05, 0.2)), G.h, { color: '#f87171' });

    sphere(G.s, Q, m.Rs * k, 0x38bdf8, 0.2, { roughness: 0.1, clearcoat: 0.94 });
    ring(G.s, m.Rs * k, 0x7dd3fc, 0.008, { center: Q, opacity: 0.36 });
    dot(G.s, Q, 0x22c55e, 0.056);
    label('Q', Q.clone().add(V(0.26, -0.06, 0.24)), G.s, { color: '#6ee7b7' });

    seg(G.r, Q, Sv, 0.022, 0x22c55e);
    seg(G.r, Q, A[0], 0.022, 0x22c55e);
    dashedSeg(G.r, Q, K, 0.017, 0xf59e0b, 0.09, 0.06);
    rightAngleMark(G.r, K, Q.clone().sub(K), Sv.clone().sub(A[0]), 0.14, 0xf59e0b, 0.009);
    dot(G.r, K, 0xf59e0b, 0.052);
    label('Rш', mid(Q, A[0]).add(V(0, 0.18, 0)), G.r, { color: '#6ee7b7' });
    label('K', K.clone().add(V(0.2, 0.12, 0.14)), G.r, { color: '#fbbf24' });

    G.x.add(tri([Sv, O, A[0]], 0xfbbf24, 0.24, { roughness: 0.18 }));
    ring(G.x, m.Rs * k, 0x38bdf8, 0.012, { center: Q, normal: V(0, 0, 1) });

    const midY = (Math.max(m.h, m.yQ + m.Rs * 0.4) + Math.min(0, m.yQ - m.Rs * 0.4)) * k * 0.45;
    return { target: [0, midY, 0], fitRadius: 2.8, groundY: 0 };
  },
};
