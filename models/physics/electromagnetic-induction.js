import { inductionReading, inductionProgram, inductionCheckpoint, fmt } from './lab/electromagnetism.js';
import { coil, wire, chargeMarkers, updateCharges, readout, galvanometer, scopeSvg } from './lab/visuals.js';

const stages = [
  { title: 'Магнит неподвижен', text: 'Поток Φ может быть ненулевым, но он не меняется: dΦ/dt = 0. Поэтому ε = 0 и стрелка гальванометра на нуле.' },
  { title: 'Вводим полюс N', text: 'Поток через катушку растёт. Знак минус в ε = −N·dΦ/dt задаёт ток, поле которого препятствует росту потока: катушка отталкивает приближающийся полюс.' },
  { title: 'Остановили магнит внутри', text: 'Магнитное поле осталось. Изменение потока прекратилось, ЭДС и ток стали нулевыми. Само наличие магнита не поддерживает ток.' },
  { title: 'Вынимаем магнит', text: 'Поток убывает. ЭДС и ток меняют знак: поле катушки поддерживает убывающий поток, притягивая удаляющийся магнит. Это закон Ленца.' },
  { title: 'Переворачиваем магнит', text: 'При повороте меняется проекция магнитного момента на ось катушки, а значит и поток. Даже без поступательного движения во время переворота возможна ЭДС.' },
  { title: 'Вводим полюс S', text: 'При той же скорости, но противоположной ориентации магнита, поток и ЭДС имеют противоположный знак. Увеличение N или скорости увеличивает |ε|.' },
  { title: 'Снова остановились', text: 'После остановки поток постоянен и ЭДС равна нулю. Разомкните цепь в свободной лаборатории: при движении ЭДС останется, а ток исчезнет.' },
];
const reading = (s, p) => inductionReading({ x: s.x, velocity: s.velocity, angle: s.angle, angularVelocity: s.angularVelocity,
  turns: p.turns, resistance: p.resistance, closed: p.labMode !== 'free' || p.circuit === 'closed' });
const stepSample = p => inductionProgram(inductionCheckpoint(p.lessonStep, p.speed / 100), p.speed / 100);

export default {
  id: 'electromagnetic-induction', kind: 'simulation', subject: 'physics', category: 'electromagnetism',
  title: 'Лаборатория Фарадея: магнит и катушка', shortTitle: 'Электромагнитная индукция',
  subtitle: 'Физика · закон Фарадея и правило Ленца',
  description: 'Перемещайте и переворачивайте магнит. Измеряйте поток, ЭДС и ток; сравнивайте скорость и количество витков.',
  tags: ['индукция', 'фарадей', 'ленц', 'катушка', 'магнит', 'гальванометр'],
  params: [
    { key: 'labMode', label: 'Режим лаборатории', type: 'select', default: 'free', visibleIf: () => false, options: [
      { value: 'free', label: 'Свободная лаборатория' }, { value: 'demo', label: 'Демонстрация' }, { value: 'steps', label: 'Пошаговое объяснение' }] },
    { key: 'lessonStep', label: 'Этап', type: 'range', min: 0, max: 6, step: 1, default: 0, visibleIf: () => false },
    { key: 'target', label: 'Куда переместить магнит, см', type: 'range', min: -14, max: 14, step: 0.5, default: -12, exact: true, visibleIf: p => p.labMode === 'free' },
    { key: 'motion', label: 'Движение магнита', type: 'select', default: 'move', visibleIf: p => p.labMode === 'free', options: [{ value: 'move', label: 'Двигаться к выбранной цели' }, { value: 'hold', label: 'Удерживать неподвижно' }] },
    { key: 'speed', label: 'Скорость движения', type: 'range', min: 1, max: 20, step: 1, default: 4, format: v => `${v} см/с`, exact: true },
    { key: 'polarity', label: 'Ориентация магнита', type: 'select', default: 'north', visibleIf: p => p.labMode === 'free', options: [
      { value: 'north', label: 'N направлен вправо →' }, { value: 'south', label: 'S направлен вправо →' }] },
    { key: 'turns', label: 'Витков N', type: 'range', min: 20, max: 800, step: 10, default: 200, format: v => String(v), exact: true },
    { key: 'resistance', label: 'Сопротивление цепи R', type: 'range', min: 5, max: 100, step: 1, default: 20, format: v => `${v} Ом`, exact: true },
    { key: 'circuit', label: 'Цепь', type: 'select', default: 'closed', visibleIf: p => p.labMode === 'free', options: [
      { value: 'closed', label: 'Замкнута · гальванометр подключён' }, { value: 'open', label: 'Разомкнута · измеряем ЭДС без тока' }] },
  ],
  presets: [
    { id: 'insert', label: 'Ввести к центру →', values: { labMode: 'free', motion: 'move', target: 0 } },
    { id: 'withdraw', label: '← Вынуть магнит', values: { labMode: 'free', motion: 'move', target: -12 } },
    { id: 'pass', label: 'Пройти насквозь →', values: { labMode: 'free', motion: 'move', target: 12 } },
  ],
  playback: { duration: null, canScrub: false, dtFixed: 1 / 240, defaultSpeed: 1 },
  getTimeScale: p => p.labMode === 'steps' ? 0 : 1,
  getStepSize: () => 0.05,
  layers: [
    { key: 'apparatus', label: 'Катушка, провода и приборы', color: '#d97706', step: 0 },
    { key: 'magnet', label: 'Постоянный магнит N / S', color: '#f87171', step: 0 },
    { key: 'field', label: 'Линии поля магнита (схема)', color: '#38bdf8', step: 0 },
    { key: 'current', label: 'Условные заряды и направление тока', color: '#fbbf24', step: 0 },
    { key: 'induced', label: 'Поле катушки по правилу Ленца', color: '#a78bfa', step: 0 },
  ],
  help: 'Задайте положение-цель и нажмите «Пуск»: магнит движется с выбранной скоростью. «Пауза» фиксирует момент; шаг вперёд — 0,05 с. R — полное заданное сопротивление. Катушка тонкая, радиус 4 см; магнит — точечный диполь. Самоиндукция и механика стрелки не учитываются. Число нарисованных витков сокращено; точное N указано счётчиком. Частицы обозначают условные положительные заряды, а не движение электронов.',
  cameraDefaults: { position: [5, 3.5, 7.6], target: [0, 0.8, 0], fitRadius: 3.7 },
  summarizeParams: p => `N=${p.turns} · ${p.speed} см/с`,
  initState(p) { return { x: -0.12, velocity: 0, angle: p.polarity === 'south' ? Math.PI : 0, angularVelocity: 0, t: 0, charge: 0, history: [], mode: p.labMode, stage: 0 }; },
  onParamsChange(s, p) {
    if (s.mode !== p.labMode) { s.t = 0; s.history = []; s.mode = p.labMode; }
    if (p.labMode === 'steps') Object.assign(s, stepSample(p));
    if (p.labMode === 'free' && Math.abs(p.target / 100 - s.x) < 1e-8) s.velocity = 0;
    if (p.labMode === 'free' && p.motion === 'hold') { s.velocity = 0; s.angularVelocity = 0; }
    return true;
  },
  stepState(s, dt, p) {
    if (p.labMode === 'steps') return;
    s.t += dt;
    if (p.labMode === 'demo') Object.assign(s, inductionProgram(s.t, p.speed / 100));
    else if (p.motion === 'hold') { s.velocity = 0; s.angularVelocity = 0; }
    else {
      const delta = p.target / 100 - s.x, travel = Math.min(Math.abs(delta), p.speed / 100 * dt);
      s.velocity = travel > 1e-10 ? Math.sign(delta) * p.speed / 100 : 0;
      s.x += Math.sign(delta) * travel;
      const turn = (p.polarity === 'south' ? Math.PI : 0) - s.angle;
      s.angularVelocity = Math.abs(turn) > 1e-8 ? Math.sign(turn) * Math.PI : 0;
      s.angle += Math.sign(turn) * Math.min(Math.abs(turn), Math.PI * dt);
      if (Math.abs(p.target / 100 - s.x) < 1e-10) s.velocity = 0;
      if (Math.abs((p.polarity === 'south' ? Math.PI : 0) - s.angle) < 1e-10) s.angularVelocity = 0;
    }
    const r = reading(s, p); s.charge += r.current * dt * 5;
    if (!s.history.length || s.t - s.history.at(-1)[0] >= 0.04 - 1e-8) {
      s.history.push([s.t, r.emf, r.flux, r.current]); if (s.history.length > 220) s.history.shift();
    }
  },
  solveState(s, p) {
    const a = p.labMode === 'steps' ? stepSample(p) : s;
    const t = p.labMode === 'steps' ? inductionCheckpoint(p.lessonStep, p.speed / 100) : s.t;
    return { ...reading(a, p), t, charge: s.charge, history: s.history, stage: a.stage ?? 0 };
  },
  serializeState(s) { return { ...s, history: s.history.map(a => [...a]) }; },
  deserializeState(s, p) {
    if (!s || !['x', 'velocity', 'angle', 'angularVelocity', 't', 'charge'].every(k => Number.isFinite(s[k])) || Math.abs(s.x) > 0.15 || s.t < 0) return null;
    return { x: s.x, velocity: s.velocity, angle: s.angle, angularVelocity: s.angularVelocity, t: s.t, charge: s.charge, mode: p.labMode,
      stage: Number.isInteger(s.stage) && s.stage >= 0 && s.stage < stages.length ? s.stage : 0,
      history: Array.isArray(s.history) ? s.history.filter(a => Array.isArray(a) && a.length === 4 && a.every(Number.isFinite)).slice(-220).map(a => [...a]) : [] };
  },
  getCalcRows(m, p) { return [
    ['Магнит x / v', `${fmt(m.x * 100, 1)} см / ${fmt(m.velocity * 100, 1)} см/с`],
    ['Поток Φ через один виток', `${fmt(m.flux * 1e6, 3)} мкВб`],
    ['Скорость изменения dΦ/dt', `${fmt(m.dFlux * 1e6, 2)} мкВб/с`],
    ['ЭДС ε = −N·dΦ/dt', `${fmt(m.emf, 4)} В`],
    ['Гальванометр I = ε/R', `${fmt(m.current * 1000, 3)} мА`],
    ['Поле B, среднее по площади', `${fmt(m.bAverage * 1000, 3)} мТл`],
    ['Витки / сопротивление', `${p.turns} / ${p.resistance} Ом`],
  ]; },
  lab: {
    steps: stages,
    notice(m, p) { return p.labMode !== 'free' ? 'Учебный сценарий: цепь замкнута, движение и поворот заданы автоматически. «Пауза» фиксирует момент; в режиме «По шагам» переходите кнопками этапов.' : ''; },
    actions: [{ id: 'stop', label: 'Остановить магнит', patch: () => ({ motion: 'hold' }) }],
    explanation(m, p) {
      if (p.labMode !== 'free') return stages[p.labMode === 'steps' ? p.lessonStep : m.stage];
      return Math.abs(m.emf) < 1e-8 ? stages[0] : { title: p.circuit === 'open' ? 'ЭДС есть, цепь разомкнута' : 'Поток меняется — есть индукция',
        text: p.circuit === 'open' ? 'Вольтметр показывает ЭДС, но ток I = 0: для тока нужна замкнутая цепь.' : `Поле индуцированного тока направлено ${m.current > 0 ? 'вправо →' : 'влево ←'} и противодействует изменению потока, а не самому полю магнита.` };
    },
    readings: (m, p) => [['Вольтметр · ε', `${fmt(m.emf * 1000, 3)} мВ`], ['Гальванометр · I', `${fmt(m.current * 1000, 2)} мА`], ['Поток · Φ', `${fmt(m.flux * 1e6, 2)} мкВб`], ['Счётчик витков', `N = ${p.turns}`]],
    chart(m, p) {
      let data = m.history;
      if (p.labMode === 'steps') data = Array.from({ length: 161 }, (_, i) => {
        const t = Math.max(0, m.t - 5) + i / 160 * Math.min(5, m.t);
        const r = reading(inductionProgram(t, p.speed / 100), p); return [t, r.emf, r.flux];
      });
      const emfPlot = scopeSvg({ title: 'Осциллограф · индуцированная ЭДС', time: Math.max(5, m.t), span: 5,
        traces: [{ label: 'ε, В', color: '#fbbf24', values: data.filter(a => a[0] >= m.t - 5).map(a => [a[0], a[1]]) }],
        note: 'Последние 5 с · пауза сохраняет мгновенное показание' });
      const fluxPlot = scopeSvg({ title: 'Магнитный поток через один виток', units: 'мкВб', time: Math.max(5, m.t), span: 5,
        traces: [{ label: 'Φ, мкВб', color: '#38bdf8', values: data.filter(a => a[0] >= m.t - 5).map(a => [a[0], a[2] * 1e6]) }],
        note: 'ε определяется наклоном графика Φ(t), а не высотой кривой' });
      return `<svg role="img" aria-label="Графики ЭДС и магнитного потока" viewBox="0 0 620 364">${emfPlot.replace('<svg ', '<svg y="0" width="620" height="182" ')}${fluxPlot.replace('<svg ', '<svg y="182" width="620" height="182" ')}</svg>`;
    },
    questions: [
      { question: 'Почему неподвижный магнит не вызывает постоянного отклонения стрелки?', options: ['Поток не меняется, dΦ/dt = 0', 'У магнита исчезает поле', 'В катушке нет зарядов'], answer: 0, explanation: 'ЭДС определяется изменением потока, а не его величиной. Магнитное поле при этом сохраняется.' },
      { question: 'Что произойдёт с ЭДС при удвоении числа витков при том же движении?', options: ['Уменьшится вдвое', 'Увеличится вдвое', 'Не изменится'], answer: 1, explanation: 'ε = −N·dΦ/dt. При неизменном потоке на виток ЭДС пропорциональна N.' },
      { question: 'Можно ли получить ЭДС при разомкнутой цепи?', options: ['Нет, без тока ЭДС невозможна', 'Да, но тока через разрыв не будет', 'Да, и ток станет бесконечным'], answer: 1, explanation: 'ЭДС и сила тока — разные величины. На выводах появляется напряжение, но замкнутого пути для тока нет.' },
    ],
  },
  build(api, { groups: G, solved: m, params: p }) {
    const { THREE, V, studioBox, label, arrow } = api;
    studioBox(G.apparatus, 6.2, 0.12, 3.0, [0, -0.02, 0], 0x1e293b, { edgeColor: 0x475569 });
    const c = coil(api, G.apparatus, { center: [0, 1.25, 0], radius: 0.62, length: 0.75, turns: p.turns });
    studioBox(G.apparatus, 0.9, 0.25, 1.25, [0, 0.3, 0], 0x475569);
    label(`N = ${p.turns} витков`, V(0, 2.2, 0), G.apparatus, { color: '#fdba74', scale: 0.85 });
    label('Радиус 4 см', V(0, 0.15, -0.95), G.apparatus, { scale: 0.6 });
    const g = galvanometer(api, G.apparatus, [1.85, 0.7, 1]);
    const lead = wire(api, G.apparatus, [c.end, [1.1, 0.6, -0.8], [2.4, 0.15, -0.6], [2.4, 0.35, 1], [1.2, 0.35, 1], [-0.45, 0.25, 1]], 0x38bdf8);
    wire(api, G.apparatus, [[-0.95, 0.25, 1], c.start], 0x38bdf8);
    api.seg(G.apparatus, V(-0.95, 0.25, 1), V(-0.45, m.closed ? 0.25 : 0.65, 1), 0.024, 0xfbbf24);
    // The open switch is shown separately; no charge markers are drawn when open.
    studioBox(G.apparatus, 0.42, 0.07, 0.22, [-0.7, 0.17, 1], 0x64748b);
    label(m.closed ? 'Цепь замкнута' : 'Разрыв: I = 0', V(-0.8, 0.55, 1.3), G.apparatus, { color: '#fbbf24', scale: 0.75 });
    const magnet = new THREE.Group(); G.magnet.add(magnet);
    studioBox(magnet, 0.48, 0.34, 0.34, [0.24, 0, 0], 0xef4444);
    studioBox(magnet, 0.48, 0.34, 0.34, [-0.24, 0, 0], 0x2563eb);
    label('N', V(0.29, 0.32, 0), magnet, { color: '#fca5a5', scale: 0.5 }); label('S', V(-0.29, 0.32, 0), magnet, { color: '#93c5fd', scale: 0.5 });
    const field = new THREE.Group(); G.field.add(field);
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2;
      const rad = 0.7;
      wire(api, field, [[0.48, 0, 0], [0.5, rad * Math.cos(a), rad * Math.sin(a)], [-0.5, rad * Math.cos(a), rad * Math.sin(a)], [-0.48, 0, 0], [0.48, 0, 0]], 0x38bdf8, 0.009);
      const ah = arrow(field, 0x38bdf8, 0.012, 0.04, 0.11);
      api.updateArrow(ah, [0.12, rad * Math.cos(a), rad * Math.sin(a)], [-0.3, 0, 0]);
    }
    const fluxArrow = arrow(G.induced, 0xa78bfa, 0.026, 0.075, 0.22);
    label('B катушки · Ленц', V(0, 2.65, 0), G.induced, { color: '#c4b5fd', scale: 0.85 });
    const meter = readout(api, G.apparatus, [-1.9, 0.25, 0.9], '#67e8f9', 1.6);
    return { target: [0, 0.9, 0], fitRadius: 3.7, groundY: -0.1,
      handles: { magnet, field, g, meter, fluxArrow, charges: [chargeMarkers(api, G.current, c.curve, 0xfbbf24, 14), chargeMarkers(api, G.current, lead, 0xfbbf24, 12)] } };
  },
  updateScene(api, { solved: m, handles: h }) {
    if (!h) return;
    for (const g of [h.magnet, h.field]) { g.position.set(m.x * 18, 1.25, 0); g.rotation.z = m.angle; }
    const range = 10 ** Math.ceil(Math.log10(Math.max(Math.abs(m.current) * 1.2, 0.00025)));
    h.g.needle.rotation.z = -m.current / range * 0.92;
    h.g.text.set(`G ±${fmt(range * 1000, 1)}: ${fmt(m.current * 1000, 3)} мА`); h.meter.set(`ε = ${fmt(m.emf * 1000, 3)} мВ`);
    h.charges.forEach(c => updateCharges(api, c, m.charge, m.current));
    api.updateArrow(h.fluxArrow, [-0.7 * Math.sign(m.current), 2.4, 0], [Math.abs(m.current) > 1e-8 ? 1.4 * Math.sign(m.current) : 0, 0, 0]);
  },
};
