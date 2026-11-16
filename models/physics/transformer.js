import { transformerReading, TAU, CORE_AREA, fmt } from './lab/electromagnetism.js';
import { coil, wire, chargeMarkers, updateCharges, readout, scopeSvg } from './lab/visuals.js';

const stages = [
  { title: 'Первичная обмотка и источник', text: 'Переменное напряжение создаёт переменный ток. В реальном режиме виден ток намагничивания даже при разомкнутой вторичной цепи.', patch: { source: 'ac', model: 'real', load: 'open' }, phase: 0.125 },
  { title: 'Магнитный поток', text: 'В этом кадре поток максимален, но dΦ/dt = 0: мгновенная ЭДС вторичной обмотки равна нулю. Поле B измеряется в теслах, поток Φ = ∫B·dS — в веберах.', patch: { source: 'ac', model: 'real', load: 'open' }, phase: 0 },
  { title: 'ЭДС без тока нагрузки', text: 'Поток проходит через ноль и меняется быстрее всего. Во вторичной обмотке возникает максимальная ЭДС. Разрыв цепи не даёт току течь, но вольтметр показывает напряжение.', patch: { source: 'ac', model: 'real', load: 'open' }, phase: 0.25 },
  { title: 'Подключаем нагрузку', text: 'Во вторичной цепи появляется ток. Первичная потребляет дополнительную мощность. Обмотки электрически изолированы: энергию передаёт электромагнитное поле.', patch: { source: 'ac', model: 'real', load: 'closed' }, phase: 0.25 },
  { title: 'Повышаем 220 → 380 В', text: 'В идеальном режиме при N₁ = 220 и N₂ = 380 получаем U₂ = 220·380/220 = 380 В. У каждого витка одинаковая ЭДС, поэтому больше витков дают большее напряжение.', patch: { source: 'ac', model: 'ideal', voltage: 220, n1: 220, n2: 380, load: 'closed' }, phase: 0.25 },
  { title: 'Понижаем 220 → 12 В', text: 'При N₁ = 550 и N₂ = 30 получаем U₂ = 220·30/550 = 12 В. Напряжения и токи приборов — действующие значения (RMS), мгновенные значения меняются по синусоиде.', patch: { source: 'ac', model: 'ideal', voltage: 220, n1: 550, n2: 30, load: 'closed' }, phase: 0.25 },
  { title: 'Постоянное напряжение', text: 'В установившемся режиме постоянный поток не создаёт ЭДС во вторичной обмотке. У идеальной первичной обмотки нет корректного установившегося режима от DC. У реальной ток ограничивается сопротивлением и вызывает нагрев. Переходный процесс включения и насыщение здесь не моделируются.', patch: { source: 'dc', load: 'closed' }, phase: 0 },
];
export function transformerFrame(p, t) {
  let stage = p.lessonStep, sampleT = t, config = p;
  if (p.labMode === 'demo') stage = [0, 2, 3, 4, 5, 6][Math.floor(t * p.frequency / 3) % 6];
  if (p.labMode !== 'free') {
    config = { ...p, ...stages[stage].patch };
    if (p.labMode === 'steps') {
      const vp = transformerReading(config, 0).vp;
      sampleT = (stages[stage].phase - (vp ? Math.atan2(vp.im, vp.re) / TAU : 0)) / p.frequency;
    }
  }
  return { ...transformerReading(config, sampleT), config, stage, sampleT };
}
export default {
  id: 'transformer', kind: 'simulation', subject: 'physics', category: 'electromagnetism',
  title: 'Лаборатория трансформатора', shortTitle: 'Повышающий и понижающий трансформатор',
  subtitle: 'Физика · напряжение, витки и передача энергии',
  description: 'Изменяйте число витков, напряжение и нагрузку. Измеряйте U и I, наблюдайте поток и сравнивайте идеальную модель с потерями.',
  tags: ['трансформатор', 'индукция', 'витки', 'напряжение', 'переменный ток', 'энергия'],
  params: [
    { key: 'labMode', label: 'Режим лаборатории', type: 'select', default: 'free', visibleIf: () => false, options: [{ value: 'free', label: 'Свободная лаборатория' }, { value: 'demo', label: 'Демонстрация' }, { value: 'steps', label: 'Пошаговое объяснение' }] },
    { key: 'lessonStep', label: 'Этап', type: 'range', min: 0, max: 6, step: 1, default: 0, visibleIf: () => false },
    { key: 'voltage', label: 'U₁ · действующее напряжение, В', type: 'range', min: 0, max: 240, step: 1, default: 220, exact: true },
    { key: 'n1', label: 'Первичная обмотка N₁', type: 'range', min: 20, max: 1200, step: 1, default: 550, exact: true, format: v => `${v} витков` },
    { key: 'n2', label: 'Вторичная обмотка N₂', type: 'range', min: 10, max: 1200, step: 1, default: 30, exact: true, format: v => `${v} витков` },
    { key: 'frequency', label: 'Частота f', type: 'range', min: 10, max: 100, step: 1, default: 50, exact: true, format: v => `${v} Гц` },
    { key: 'resistance', label: 'Нагрузка R', type: 'range', min: 10, max: 1000, step: 1, default: 100, exact: true, format: v => `${v} Ом` },
    { key: 'load', label: 'Вторичная цепь', type: 'select', default: 'closed', options: [{ value: 'closed', label: 'Нагрузка подключена' }, { value: 'open', label: 'Холостой ход · цепь разомкнута' }] },
    { key: 'model', label: 'Модель устройства', type: 'select', default: 'ideal', options: [{ value: 'ideal', label: 'Идеальная · без потерь' }, { value: 'real', label: 'Реальная · линейная с потерями' }] },
    { key: 'source', label: 'Источник питания', type: 'select', default: 'ac', options: [{ value: 'ac', label: 'Переменное напряжение AC' }, { value: 'dc', label: 'Постоянное DC · установившийся режим' }] },
    { key: 'timeView', label: 'Наблюдение', type: 'select', default: 'slow', options: [{ value: 'slow', label: 'Замедлено в 100 раз' }, { value: 'real', label: 'Физическое время · без замедления' }] },
  ],
  presets: [
    { id: 'up', label: '220 → 380 В', values: { labMode: 'free', model: 'ideal', source: 'ac', voltage: 220, n1: 220, n2: 380, load: 'closed' } },
    { id: 'down', label: '220 → 12 В', values: { labMode: 'free', model: 'ideal', source: 'ac', voltage: 220, n1: 550, n2: 30, load: 'closed' } },
    { id: 'loss', label: 'Сравнить: с потерями', values: { labMode: 'free', model: 'real', source: 'ac' } },
  ],
  playback: { duration: null, canScrub: true, defaultSpeed: 1 },
  getTimeScale: p => p.labMode === 'steps' ? 0 : p.timeView === 'slow' ? 0.01 : 1,
  getStepSize: p => 1 / (p.frequency * 16),
  layers: [
    { key: 'core', label: 'Ферромагнитный сердечник', color: '#64748b', step: 0 },
    { key: 'primary', label: 'Первичная цепь · медная', color: '#fb923c', step: 0 },
    { key: 'secondary', label: 'Вторичная цепь · голубая', color: '#38bdf8', step: 0 },
    { key: 'field', label: 'Поток Φ в сердечнике', color: '#c084fc', step: 0 },
    { key: 'current', label: 'Условные заряды и стрелки токов', color: '#fbbf24', step: 0 },
    { key: 'labels', label: 'Приборы и счётчики витков', color: '#e2e8f0', step: 0 },
  ],
  cameraDefaults: { position: [5.8, 4.3, 8.5], target: [0, 1.1, 0], fitRadius: 4.1 },
  help: 'U и I на приборах — действующие значения; графики показывают мгновенные. Длины стрелок условные. Витки нарисованы сокращённо, точное число указано счётчиком. Реальный режим — линейная схема с R₁, R₂, L намагничивания и потерями в сердечнике, без насыщения и потоков рассеяния. При B > 1,6 Тл численные прогнозы реального устройства ненадёжны. DC: только установившийся режим; бросок тока при включении не моделируется.',
  summarizeParams: p => `N₁=${p.n1} / N₂=${p.n2} · U₁=${p.voltage} В`,
  evaluateAt(t, p) { return transformerFrame(p, t); },
  getCalcRows(m) { return [
    ['U₁ / U₂ · RMS', `${fmt(m.U1)} / ${fmt(m.U2)} В`], ['I₁ / I₂ · RMS', `${fmt(m.I1, 4)} / ${fmt(m.I2, 4)} А`],
    ['N₂ / N₁', fmt(m.ratio, 5)], ['ЭДС вторичной ε₂(t)', `${fmt(m.e2, 3)} В`],
    ['Поток Φ(t)', `${fmt(m.flux === null ? null : m.flux * 1000, 3)} мВб`],
    ['B, амплитуда · S = 30 см²', `${fmt(m.bPeak, 3)} Тл`],
    ['Pвход / Pнагрузки', `${fmt(m.inputPower)} / ${fmt(m.outputPower)} Вт`],
    ['Потери: медь / сердечник', `${fmt(m.copperLoss)} / ${fmt(m.coreLoss)} Вт`],
    ['КПД η', `${fmt(m.efficiency * 100, 2)} %`],
  ]; },
  lab: {
    steps: stages,
    lockedControls: ['voltage', 'n1', 'n2', 'model', 'source', 'load'],
    displayParams: m => m.config,
    explanation(m, p) {
      if (p.labMode !== 'free') return stages[m.stage];
      if (m.dc) return stages[6];
      return { title: m.ratio > 1 ? 'Повышающий трансформатор' : m.ratio < 1 ? 'Понижающий трансформатор' : 'Разделительный трансформатор 1:1',
        text: `N₁ = ${m.config.n1}, N₂ = ${m.config.n2}. ${m.real ? 'Сопротивления обмоток снижают напряжение под нагрузкой, а потери увеличивают потребление.' : 'U₂/U₁ = N₂/N₁; при нагрузке U₁I₁ = U₂I₂. Увеличение напряжения сопровождается уменьшением выходного тока относительно входного.'} ${!m.closed ? 'Нагрузка отключена: I₂ = 0, напряжение U₂ остаётся.' : ''}` };
    },
    readings: m => [['Вольтметры · RMS', `${fmt(m.U1)} → ${fmt(m.U2)} В`], ['Амперметры · RMS', `${fmt(m.I1, 3)} / ${fmt(m.I2, 3)} А`], ['Счётчики витков', `${m.config.n1} / ${m.config.n2}`], ['Мощность нагрузки', `${fmt(m.outputPower)} Вт`]],
    notice(m, p) {
      if (p.labMode !== 'free') return 'В учебном сценарии параметры и положения выбираются автоматически. Показания ниже относятся к текущему этапу. Для своего опыта выберите «Свободная лаборатория».';
      if (m.dc) return 'DC: U₂ = 0 после переходного процесса. Ток идеальной первичной обмотки не определён; реальный режим показывает большой ток и нагрев. Насыщение не рассчитывается.';
      if (m.real && m.bPeak > 1.6) return 'B превышает условный предел 1,6 Тл: сердечник может насыщаться. Текущая линейная модель не описывает этот режим; увеличьте N₁ или частоту, либо уменьшите U₁.';
      return `${p.timeView === 'slow' ? 'Время замедлено ×100; частота и показания рассчитаны в физических единицах.' : 'Физическое время: на экране возможна стробоскопическая картина. Для изучения фаз выберите замедление.'} Точки обозначают условные положительные заряды. В AC они колеблются, не переходя между обмотками.`;
    },
    chart(m) {
      const p = m.config, period = 1 / p.frequency, span = 2 * period;
      const samples = Array.from({ length: 241 }, (_, i) => transformerReading(p, m.sampleT - span + span * i / 240));
      return scopeSvg({ title: 'Осциллограф · мгновенные напряжения', time: m.sampleT, span,
        traces: [{ label: 'u₁, В', color: '#fb923c', values: samples.map(r => [r.t, r.u1]) }, { label: 'u₂, В', color: '#38bdf8', values: samples.map(r => [r.t, r.u2]) }],
        note: `Развёртка ${fmt(span * 1000, 1)} мс · ${p.frequency} Гц · одна шкала, В` });
    },
    footnote: 'Зарядные устройства обычно используют импульсный источник: сетевое напряжение выпрямляется, преобразуется в высокочастотные импульсы, затем энергия передаётся через небольшой трансформатор и снова выпрямляется. Эта установка показывает низкочастотный трансформатор, а не полную схему зарядного устройства.',
    questions: [
      { question: 'Почему трансформатор не преобразует DC непрерывно?', options: ['У постоянного тока нет зарядов', 'После переходного процесса поток постоянен', 'Нужно больше витков'], answer: 1, explanation: 'При dΦ/dt = 0 индуцированная ЭДС равна нулю. При включении DC возможен краткий переходный процесс.' },
      { question: 'При повышении напряжения идеальным трансформатором ток во вторичной относительно первичного…', options: ['Уменьшается во столько же раз', 'Возрастает во столько же раз', 'Не меняется'], answer: 0, explanation: 'При нагрузке U₁I₁ = U₂I₂, поэтому I₂/I₁ = U₁/U₂. При фиксированном R изменение витков также меняет мощность, потребляемую от источника.' },
      { question: 'Почему трансформатор не создаёт дополнительную энергию?', options: ['Напряжение всегда уменьшается', 'Выходная мощность не больше входной', 'Ток перетекает через сердечник'], answer: 1, explanation: 'У идеального устройства входная и выходная мощности равны. У реального часть входной мощности превращается в тепло.' },
    ],
  },
  build(api, { groups: G, solved: m }) {
    const { V, studioBox, label, arrow } = api, p = m.config;
    // Closed magnetic path; the two electrical paths remain disjoint.
    studioBox(G.core, 4, 0.12, 2.6, [0, 0, 0], 0x1e293b);
    for (const x of [-1.05, 1.05]) studioBox(G.core, 0.5, 2.2, 0.5, [x, 1.4, 0], 0x64748b, { edgeColor: 0x94a3b8 });
    for (const y of [0.35, 2.45]) studioBox(G.core, 2.6, 0.45, 0.5, [0, y, 0], 0x64748b, { edgeColor: 0x94a3b8 });
    for (let z = -0.2; z <= 0.2; z += 0.08) for (const y of [0.35, 2.45]) api.seg(G.core, V(-1.2, y, z), V(1.2, y, z), 0.006, 0x94a3b8);
    const primary = coil(api, G.primary, { axis: 'y', center: [-1.05, 1.4, 0], radius: 0.46, length: 1.45, turns: p.n1, color: 0xfb923c });
    const secondary = coil(api, G.secondary, { axis: 'y', center: [1.05, 1.4, 0], radius: 0.46, length: 1.45, turns: p.n2, color: 0x38bdf8 });
    const lead1 = wire(api, G.primary, [primary.end, [-2, 2.1, 0], [-2.6, 1.4, 0.8], [-2.6, 0.45, 0.8], [-1.8, 0.3, 0.5], primary.start], 0xfb923c);
    // An actual visible switch gap for the open secondary.
    const lead2 = wire(api, G.secondary, [secondary.end, [2, 2.1, 0], [2.7, 1.4, 0.8], [2.7, 0.7, 0.8]], 0x38bdf8);
    wire(api, G.secondary, [[2.7, 0.4, 0.8], [1.8, 0.3, 0.5], secondary.start], 0x38bdf8);
    api.seg(G.secondary, V(2.7, 0.4, 0.8), V(p.load === 'closed' ? 2.7 : 3, 0.7, 0.8), 0.025, 0xfbbf24);
    studioBox(G.primary, 0.8, 0.7, 0.4, [-2.6, 1.25, 0.8], 0x334155, { edgeColor: 0xfb923c });
    label(p.source === 'dc' ? 'DC ⎓' : 'AC ∿', V(-2.6, 1.35, 1.06), G.primary, { color: '#fed7aa', scale: 0.7 });
    studioBox(G.secondary, 0.75, 0.6, 0.4, [2.7, 1.2, 0.8], 0x334155, { edgeColor: 0x38bdf8 });
    label(`R = ${p.resistance} Ом`, V(2.7, 1.35, 1.06), G.secondary, { color: '#7dd3fc', scale: 0.9 });
    const n1 = readout(api, G.labels, [-1.2, 2.95, 0], '#fdba74', 1.8), n2 = readout(api, G.labels, [1.2, 2.95, 0], '#7dd3fc', 1.8);
    n1.set(`N₁ = ${p.n1}`); n2.set(`N₂ = ${p.n2}`);
    const voltage1 = readout(api, G.labels, [-1.9, 0.12, 1.5], '#fdba74', 1.9);
    const voltage2 = readout(api, G.labels, [1.9, 0.12, 1.5], '#7dd3fc', 1.9);
    const current1 = readout(api, G.labels, [-2.2, 2.25, 0.8], '#fbbf24', 1.8);
    const current2 = readout(api, G.labels, [2.2, 2.25, 0.8], '#fbbf24', 1.8);
    label('Электрическая изоляция', V(0, 0.68, 0.8), G.labels, { scale: 1.1 });
    const fieldArrows = [
      { pos: [-1.05, 0.7, 0], dir: [0, 1.4, 0] }, { pos: [-0.7, 2.45, 0], dir: [1.4, 0, 0] },
      { pos: [1.05, 2.1, 0], dir: [0, -1.4, 0] }, { pos: [0.7, 0.35, 0], dir: [-1.4, 0, 0] },
    ].map(a => ({ ...a, handle: arrow(G.field, 0xc084fc, 0.035, 0.1, 0.22) }));
    label('Φ(t)', V(0, 2.6, 0.6), G.field, { color: '#e9d5ff', scale: 0.65 });
    return { target: [0, 1.25, 0], fitRadius: 4.1, groundY: -0.1, handles: {
      primary: [chargeMarkers(api, G.current, primary.curve, 0xfbbf24), chargeMarkers(api, G.current, lead1, 0xfbbf24)],
      secondary: [chargeMarkers(api, G.current, secondary.curve, 0xa5f3fc), chargeMarkers(api, G.current, lead2, 0xa5f3fc, 6)],
      fieldArrows, voltage1, voltage2, current1, current2, configKey: `${p.n1}/${p.n2}/${p.source}/${p.load}/${p.resistance}`,
    } };
  },
  updateScene(api, opts) {
    const { solved: m, handles: h, groups } = opts;
    if (!h) return;
    const p = m.config, key = `${p.n1}/${p.n2}/${p.source}/${p.load}/${p.resistance}`;
    // Automatic scenarios can change winding geometry without a schema rebuild.
    if (key !== h.configKey) {
      Object.values(groups).forEach(api.clearGroup);
      const next = this.build(api, opts).handles; Object.assign(h, next);
    }
    h.voltage1.set(`V₁: ${fmt(m.U1)} В RMS`); h.voltage2.set(`V₂: ${fmt(m.U2)} В RMS`);
    h.current1.set(`A₁: ${fmt(m.I1, 3)} А RMS`); h.current2.set(`A₂: ${fmt(m.I2, 3)} А RMS`);
    const displacement = m.dc ? m.t * 0.2 : m.I1 > 1e-12 ? 0.075 * (-m.i1Phasor.re * Math.cos(m.phase) + m.i1Phasor.im * Math.sin(m.phase)) / m.I1 : 0;
    h.primary.forEach(c => updateCharges(api, c, displacement, m.i1));
    // Identical winding handedness on opposite core legs: load ampere-turns oppose each other.
    const secondaryDisplacement = m.dc || m.E2 < 1e-12 ? 0 : -0.075 * (m.vp.re * Math.cos(m.phase) - m.vp.im * Math.sin(m.phase)) / Math.hypot(m.vp.re, m.vp.im);
    h.secondary.forEach(c => updateCharges(api, c, secondaryDisplacement, m.i2));
    const strength = !m.dc && m.fluxPeak > 1e-12 ? m.flux / m.fluxPeak : 0;
    for (const a of h.fieldArrows) {
      const dir = a.dir.map(v => v * strength), pos = a.pos.map((v, i) => v + (strength < 0 ? a.dir[i] : 0));
      api.updateArrow(a.handle, pos, dir);
    }
  },
};
