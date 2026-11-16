/** Куб и построение плоского сечения по трём заданным точкам на рёбрах. */

const CFG_LABELS = {
  cross: 'AA₁, AB, C₁D₁ (4–6 углов)',
  front: 'AA₁, BB₁, C₁D₁ (4–5 углов)',
  corner: 'AA₁, AB, AD (треугольник)',
};

export default {
  id: 'cube-section',
  category: 'sections',
  title: 'Сечение куба по трём точкам',
  shortTitle: 'Сечение куба',
  subtitle: 'Стереометрия · метод следов и параллельных прямых',
  description: 'Живое построение сечения плоскостью (PQR): от 3 точек к 3–6-угольнику и истинной форме в 2D.',
  tags: ['куб', 'сечение', 'метод следов', 'параллельные грани', 'егэ'],
  previewSvg: `<svg viewBox="0 0 100 100" width="96" height="96" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round">
    <rect x="20" y="30" width="46" height="46" opacity=".6"/>
    <polygon points="20,30 36,16 82,16 66,30" opacity=".45"/>
    <polyline points="82,16 82,62 66,76" opacity=".6"/>
    <polygon points="20,53 43,76 74,58 82,36 59,16 28,33" stroke="#fbbf24" fill="rgba(251,191,36,0.24)"/>
  </svg>`,

  params: [
    {
      key: 'cfg',
      label: 'Положение точек P, Q, R',
      type: 'select',
      default: 'cross',
      options: [
        { value: 'cross', label: CFG_LABELS.cross },
        { value: 'front', label: CFG_LABELS.front },
        { value: 'corner', label: CFG_LABELS.corner },
      ],
    },
    { key: 'a', label: 'Ребро a', type: 'range', min: 2, max: 10, step: 0.2, default: 6 },
    { key: 't1', label: 'Точка P (AA₁)', type: 'range', min: 0.1, max: 0.9, step: 0.05, default: 0.5 },
    { key: 't2', label: 'Точка Q', type: 'range', min: 0.1, max: 0.9, step: 0.05, default: 0.5 },
    { key: 't3', label: 'Точка R', type: 'range', min: 0.1, max: 0.9, step: 0.05, default: 0.5 },
  ],
  presets: [
    { id: 'hex', label: 'Правильный шестиугольник', values: { cfg: 'cross', a: 6, t1: 0.5, t2: 0.5, t3: 0.5 } },
    { id: 'pent', label: 'Пятиугольник', values: { cfg: 'cross', a: 6, t1: 0.75, t2: 0.25, t3: 0.75 } },
    { id: 'trap', label: 'Трапеция', values: { cfg: 'front', a: 6, t1: 0.3, t2: 0.3, t3: 0.5 } },
    { id: 'tri', label: 'Равносторонний треугольник', values: { cfg: 'corner', a: 6, t1: 0.65, t2: 0.65, t3: 0.65 } },
  ],
  summarizeParams: (p) => `a=${Number(p.a).toFixed(0)}`,

  layers: [
    { key: 'f', color: '#9aa0aa', label: 'Рёбра и вершины куба', step: 0 },
    { key: 'pts', color: '#f59e0b', label: 'Исходные точки P, Q, R', step: 0 },
    { key: 'pq', color: '#3b82f6', label: 'Отрезок PQ в передней грани', step: 1 },
    { key: 'par', color: '#ec4899', label: 'Параллельное построение (или след в основании)', step: 2 },
    { key: 'x', color: '#eab308', label: 'Многоугольник сечения', step: 3 },
  ],

  steps: [
    { title: 'Три точки на рёбрах', text: 'Отмечаем заданные точки P, Q и R, не лежащие на одной прямой — они однозначно задают секущую плоскость.' },
    { title: 'Соединение в общей грани', text: 'Точки P и Q лежат в одной передней грани AA₁B₁B — проводим отрезок PQ.' },
    { title: 'Переход на другие грани', text: 'Параллельные грани (передняя и задняя, верхняя и нижняя) пересекаются плоскостью по параллельным прямым.' },
    { title: 'Многоугольник сечения', text: 'Соединяем точки пересечения со всеми задетыми рёбрами куба и получаем выпуклый многоугольник.' },
  ],

  calcAriaLabel: 'Расчёт параметров сечения куба',
  diagramAriaLabel: 'Истинная форма многоугольника сечения в 2D',
  diagramLayerKey: 'x',

  cameraDefaults: {
    position: [5.5, 3.9, 5.8],
    target: [0, 1.0, 0],
    fitRadius: 2.5,
  },

  solve(p = {}) {
    const cfg = p?.cfg || 'cross';
    const a = Math.max(0.5, Number(p?.a ?? 6));
    const t1 = Number(p?.t1 ?? 0.5);
    const t2 = Number(p?.t2 ?? 0.5);
    const t3 = Number(p?.t3 ?? 0.5);
    const s = a / 2;
    const P = [-s, t1 * a, s];
    const Q = cfg === 'front' ? [s, t2 * a, s] : [-s + t2 * a, 0, s];
    const R = cfg === 'corner' ? [-s, 0, s - t3 * a] : [s - t3 * a, a, -s];

    const sub = (u, v) => [u[0] - v[0], u[1] - v[1], u[2] - v[2]];
    const dot = (u, v) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
    const cross = (u, v) => [
      u[1] * v[2] - u[2] * v[1],
      u[2] * v[0] - u[0] * v[2],
      u[0] * v[1] - u[1] * v[0],
    ];

    const nRaw = cross(sub(Q, P), sub(R, P));
    const nLen = Math.hypot(...nRaw) || 1;
    const n = nRaw.map((v) => v / nLen);

    const cubeVerts = [
      [-s, 0, s], [s, 0, s], [s, 0, -s], [-s, 0, -s],
      [-s, a, s], [s, a, s], [s, a, -s], [-s, a, -s],
    ];
    const cubeEdges = [
      [0, 1], [1, 2], [2, 3], [3, 0],
      [4, 5], [5, 6], [6, 7], [7, 4],
      [0, 4], [1, 5], [2, 6], [3, 7],
    ];

    const hits = [];
    for (const [i, j] of cubeEdges) {
      const u = cubeVerts[i];
      const v = cubeVerts[j];
      const du = dot(n, sub(u, P));
      const dv = dot(n, sub(v, P));
      if (Math.abs(du) < 1e-6) hits.push(u);
      if (Math.abs(dv) < 1e-6) hits.push(v);
      if (du * dv < -1e-9) {
        const t = du / (du - dv);
        hits.push([u[0] + t * (v[0] - u[0]), u[1] + t * (v[1] - u[1]), u[2] + t * (v[2] - u[2])]);
      }
    }

    const verts = [];
    for (const hPt of hits) {
      if (!verts.some((q) => Math.hypot(hPt[0] - q[0], hPt[1] - q[1], hPt[2] - q[2]) < 1e-4 * a)) {
        verts.push(hPt);
      }
    }

    const centroid = [0, 0, 0];
    verts.forEach((v) => {
      centroid[0] += v[0];
      centroid[1] += v[1];
      centroid[2] += v[2];
    });
    if (verts.length) {
      centroid[0] /= verts.length;
      centroid[1] /= verts.length;
      centroid[2] /= verts.length;
    }

    const ref = Math.abs(n[0]) < 0.8 ? [1, 0, 0] : [0, 1, 0];
    const e1Raw = cross(ref, n);
    const e1Len = Math.hypot(...e1Raw) || 1;
    const e1 = e1Raw.map((v) => v / e1Len);
    const e2 = cross(n, e1);

    const projected = verts
      .map((v) => {
        const d = sub(v, centroid);
        return { p: v, x: dot(d, e1), y: dot(d, e2) };
      })
      .sort((a1, a2) => Math.atan2(a1.y, a1.x) - Math.atan2(a2.y, a2.x));

    let perimeter = 0;
    let area2 = 0;
    for (let i = 0; i < projected.length; i++) {
      const c = projected[i];
      const nx = projected[(i + 1) % projected.length];
      perimeter += Math.hypot(nx.x - c.x, nx.y - c.y);
      area2 += c.x * nx.y - nx.x * c.y;
    }
    const area = Math.abs(area2) / 2;

    return { a, cfg, P, Q, R, verts: projected.map((o) => o.p), pts2d: projected, perimeter, area };
  },

  getCalcRows(m) {
    const names = { 3: 'треугольник', 4: 'четырёхугольник', 5: 'пятиугольник', 6: 'шестиугольник' };
    return [
      ['Тип сечения', `${m.verts.length}-уг. (${names[m.verts.length] || ''})`],
      ['Периметр сечения P', m.perimeter],
      ['Площадь сечения S', m.area],
      ['Площадь грани куба a²', m.a * m.a],
      ['Доля площади (S / a²)', m.area / (m.a * m.a)],
    ];
  },

  renderDiagram(m) {
    if (!m.pts2d || m.pts2d.length < 3) return null;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    m.pts2d.forEach((pt) => {
      minX = Math.min(minX, pt.x);
      maxX = Math.max(maxX, pt.x);
      minY = Math.min(minY, pt.y);
      maxY = Math.max(maxY, pt.y);
    });
    const span = Math.max(0.1, maxX - minX, maxY - minY);
    const k = 148 / span;
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const X = (x) => 100 + (x - cx) * k;
    const Y = (y) => 100 - (y - cy) * k;

    const polyPoints = m.pts2d.map((pt) => `${X(pt.x).toFixed(1)},${Y(pt.y).toFixed(1)}`).join(' ');
    const dots = m.pts2d
      .map((pt) => `<circle cx="${X(pt.x).toFixed(1)}" cy="${Y(pt.y).toFixed(1)}" r="3.5" fill="#eab308"/>`)
      .join('');
    return (
      `<svg role="img" aria-label="Истинная форма сечения" viewBox="0 0 200 200" style="display:block;width:100%;height:auto">` +
      `<line x1="16" y1="100" x2="184" y2="100" stroke="#9aa2b1" stroke-width="0.9" stroke-dasharray="3 3" opacity="0.4"/>` +
      `<line x1="100" y1="14" x2="100" y2="176" stroke="#9aa2b1" stroke-width="0.9" stroke-dasharray="3 3" opacity="0.4"/>` +
      `<polygon points="${polyPoints}" fill="rgba(251,191,36,.24)" stroke="#eab308" stroke-width="2.8" stroke-linejoin="round"/>` +
      dots +
      `<text x="100" y="191" text-anchor="middle" font-size="11" font-weight="600" fill="currentColor">S = ${m.area.toFixed(2)} · P = ${m.perimeter.toFixed(2)}</text>` +
      '</svg>'
    );
  },

  build(api, opts = {}) {
    const m = opts.solved || this.solve(opts.params);
    const G = opts.groups;
    const { V, seg, dashedSeg, dot, tri, polygon, label } = api;
    const a = m.a;
    const s = a / 2;
    const k = 1.9 / a;
    const v = ([x, y, z]) => V(x * k, y * k, z * k);

    const A = v([-s, 0, s]), B = v([s, 0, s]), C = v([s, 0, -s]), D = v([-s, 0, -s]);
    const A1 = v([-s, a, s]), B1 = v([s, a, s]), C1 = v([s, a, -s]), D1 = v([-s, a, -s]);
    const edges = [
      [A, B], [B, C], [C, D], [D, A],
      [A1, B1], [B1, C1], [C1, D1], [D1, A1],
      [A, A1], [B, B1], [C, C1], [D, D1],
    ];
    edges.forEach(([u, w]) => seg(G.f, u, w, 0.015, 0xcbd5e1));

    const cubeQuad = (p1, p2, p3, p4) => tri([p1, p2, p3, p1, p3, p4], 0x7dd3fc, 0.065, { roughness: 0.14, clearcoat: 0.78 });
    [
      [A, B, C, D], [A1, B1, C1, D1],
      [A, B, B1, A1], [B, C, C1, B1],
      [C, D, D1, C1], [D, A, A1, D1],
    ].forEach((f) => G.f.add(cubeQuad(...f)));

    [
      ['A', A, [-0.18, -0.16, 0.16]], ['B', B, [0.18, -0.16, 0.16]],
      ['C', C, [0.18, -0.16, -0.16]], ['D', D, [-0.18, -0.16, -0.16]],
      ['A₁', A1, [-0.18, 0.18, 0.16]], ['B₁', B1, [0.18, 0.18, 0.16]],
      ['C₁', C1, [0.18, 0.18, -0.16]], ['D₁', D1, [-0.18, 0.18, -0.16]],
    ].forEach(([name, pt, off]) => {
      dot(G.f, pt, 0xe2e8f0, 0.034, { role: 'wireframe' });
      label(name, pt.clone().add(V(...off)), G.f, { scale: 0.44 });
    });

    const P = v(m.P);
    const Q = v(m.Q);
    const R = v(m.R);
    dot(G.pts, P, 0xf59e0b, 0.068);
    dot(G.pts, Q, 0xf59e0b, 0.068);
    dot(G.pts, R, 0xf59e0b, 0.068);
    label('P', P.clone().add(V(-0.22, 0.12, 0.18)), G.pts, { color: '#fbbf24' });
    label('Q', Q.clone().add(V(0.16, -0.18, 0.22)), G.pts, { color: '#fbbf24' });
    label('R', R.clone().add(V(-0.18, 0.22, -0.2)), G.pts, { color: '#fbbf24' });

    seg(G.pq, P, Q, 0.025, 0x3b82f6);

    // Строим параллельный отрезок/след для шага 3
    if (m.cfg === 'corner') {
      seg(G.par, Q, R, 0.023, 0xec4899);
      seg(G.par, R, P, 0.023, 0xec4899);
    } else {
      const backRaw = m.verts.filter((pt) => Math.abs(pt[2] + s) < 1e-4 * a).map(v);
      if (backRaw.length >= 2) {
        seg(G.par, backRaw[0], backRaw[backRaw.length - 1], 0.023, 0xec4899);
      }
      const bottomRaw = m.verts.filter((pt) => Math.abs(pt[1]) < 1e-4 * a).map(v);
      if (bottomRaw.length >= 2) {
        dashedSeg(G.par, bottomRaw[0], bottomRaw[bottomRaw.length - 1], 0.018, 0xec4899);
      }
    }

    const secVerts = m.verts.map(v);
    for (let i = 0; i < secVerts.length; i++) {
      const u = secVerts[i];
      const w = secVerts[(i + 1) % secVerts.length];
      seg(G.x, u, w, 0.026, 0xfbbf24);
      dot(G.x, u, 0xf59e0b, 0.056);
    }
    polygon(G.x, secVerts, 0xfbbf24, 0.28, { roughness: 0.18, clearcoat: 0.6 });

    return { target: [0, a * k * 0.5, 0], fitRadius: 2.4, groundY: 0,
      measurement: { scale: 1 / k, unit: 'ед.', points: [
        ...[['A', A], ['B', B], ['C', C], ['D', D], ['A₁', A1], ['B₁', B1], ['C₁', C1], ['D₁', D1]].map(([name, p]) => ({ name, position: p.toArray(), layer: 'f' })),
        ...[['P', P], ['Q', Q], ['R', R]].map(([name, p]) => ({ name, position: p.toArray(), layer: 'pts' })),
      ] },
    };
  },
};
