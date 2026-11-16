import { transformerReading, TAU, fmt } from './lab/electromagnetism.js';
import {
  coil,
  wire,
  chargeMarkers,
  updateCharges,
  readout,
  paintOscilloscopeOverlay,
  focusHighlight3D,
  spatialCallout3D,
} from './lab/visuals.js';

const APP_Z = 0.1;
const CAM_OVERVIEW = { position: [0.3, 2.35, 6.0], target: [-0.1, 1.05, 0.15] };
const CAM_VIEWS = {
  overview: CAM_OVERVIEW,
  apparatus: { position: [-0.1, 2.05, 4.75], target: [-0.1, 1.05, 0.15] },
};

const stages = [
  {
    title: 'Первичная обмотка и ток AC',
    formula: 'u₁(t) = U₁√2 · sin(ωt)',
    text: 'Переменный источник задаёт ток в обмотке N₁. В реальной схеме виден ток намагничивания I₀.',
    patch: { source: 'ac', model: 'real', load: 'open' },
    phase: 0.125,
    anchor: [-0.85, 1.07, APP_Z],
    cardPos: [0.85, 2.24, 0.12],
    haloRadius: 0.68,
    accent: 0xfb923c,
    accentHex: '#fb923c',
    camera: { position: [-1.85, 2.25, 6.25], target: [-0.08, 1.34, 0.15] },
  },
  {
    title: 'Магнитный поток в сердечнике',
    formula: 'Φ = B·S = Φ_max  ⇒  ε₂ = 0',
    text: 'В этом кадре поток в сердечнике максимален, но dΦ/dt = 0 — мгновенная ЭДС во вторичной равна нулю.',
    patch: { source: 'ac', model: 'real', load: 'open' },
    phase: 0,
    anchor: [0.35, 1.88, APP_Z],
    cardPos: [-1.52, 2.25, 0.15],
    haloRadius: 0.58,
    accent: 0xc084fc,
    accentHex: '#c084fc',
    camera: { position: [0.42, 2.3, 6.45], target: [-0.42, 1.38, 0.1] },
  },
  {
    title: 'ЭДС на холостом ходу',
    formula: 'ε₂(t) = −N₂ · (dΦ / dt)',
    text: 'Поток проходит через ноль и меняется быстрее всего — вольтметр показывает пик напряжения при I₂ = 0.',
    patch: { source: 'ac', model: 'real', load: 'open' },
    phase: 0.25,
    anchor: [1.55, 0.85, 0.48],
    cardPos: [-0.25, 2.18, 0.15],
    haloRadius: 0.68,
    accent: 0x38bdf8,
    accentHex: '#38bdf8',
    camera: { position: [2.4, 2.12, 6.05], target: [0.58, 1.3, 0.25] },
  },
  {
    title: 'Передача энергии через поле',
    formula: 'P_вх = P_нагр + I₁²R₁ + I₂²R₂ + P_серд',
    text: 'Обмотки гальванически изолированы: нагрузка R берёт мощность через переменное магнитное поле сердечника.',
    patch: { source: 'ac', model: 'real', load: 'closed' },
    phase: 0.25,
    anchor: [0.0, 1.08, APP_Z],
    cardPos: [-1.58, 2.28, 0.12],
    haloRadius: 0.72,
    accent: 0x22c55e,
    accentHex: '#22c55e',
    camera: { position: [0.95, 2.3, 6.6], target: [-0.52, 1.36, 0.05] },
  },
  {
    title: 'Повышаем 220 → 380 В',
    formula: 'U₂ / U₁ = N₂ / N₁ = 380 / 220',
    text: 'Больше витков во вторичной цепи (N₂ > N₁) дают суммарно большее выходное напряжение (1 В на виток).',
    patch: { source: 'ac', model: 'ideal', voltage: 220, n1: 220, n2: 380, load: 'closed' },
    phase: 0.25,
    anchor: [0.85, 1.12, APP_Z],
    cardPos: [-0.95, 2.26, 0.12],
    haloRadius: 0.68,
    accent: 0x38bdf8,
    accentHex: '#38bdf8',
    camera: { position: [1.95, 2.2, 6.25], target: [-0.02, 1.36, 0.1] },
  },
  {
    title: 'Понижаем 220 → 12 В',
    formula: 'U₁ · I₁ ≈ U₂ · I₂  ⇒  I₂ > I₁',
    text: 'При снижении напряжения до 12 В вторичный ток возрастает во столько же раз, сохраняя баланс мощности.',
    patch: { source: 'ac', model: 'ideal', voltage: 220, n1: 550, n2: 30, load: 'closed' },
    phase: 0.25,
    anchor: [1.45, 0.98, 0.42],
    cardPos: [-0.38, 2.22, 0.15],
    haloRadius: 0.66,
    accent: 0xfbbf24,
    accentHex: '#fbbf24',
    camera: { position: [2.2, 2.15, 6.1], target: [0.42, 1.32, 0.15] },
  },
  {
    title: 'Постоянное напряжение DC',
    formula: 'I₁ = const  ⇒  dΦ/dt = 0  ⇒  U₂ = 0',
    text: 'Постоянный поток не индуцирует ЭДС на выходе. В реальной обмотке ток греет медь; в идеальной — неопределён.',
    patch: { source: 'dc', load: 'closed' },
    phase: 0,
    anchor: [-1.98, 1.02, 0.55],
    cardPos: [-0.08, 2.18, 0.2],
    haloRadius: 0.64,
    accent: 0xf87171,
    accentHex: '#f87171',
    camera: { position: [-1.45, 2.18, 6.25], target: [-0.72, 1.32, 0.25] },
  },
];

const questions = [
  {
    question: 'Почему трансформатор не преобразует постоянный ток (DC) непрерывно?',
    options: ['У постоянного тока нет зарядов', 'После переходного процесса поток постоянен', 'Нужно больше витков'],
    answer: 1,
    explanation: 'При dΦ/dt = 0 индуцированная ЭДС равна нулю. При включении DC возможен только краткий переходный импульс.',
    anchor: [-1.98, 1.02, 0.55],
    cardPos: [0.05, 2.2, 0.2],
    camera: { position: [-1.4, 2.15, 6.35], target: [-0.65, 1.32, 0.25] },
  },
  {
    question: 'При повышении напряжения идеальным трансформатором ток во вторичной относительно первичного…',
    options: ['Уменьшается во столько же раз', 'Возрастает во столько же раз', 'Не меняется'],
    answer: 0,
    explanation: 'При нагрузке U₁I₁ = U₂I₂, поэтому I₂/I₁ = U₁/U₂. При фиксированном R изменение витков также меняет мощность от источника.',
    anchor: [0.85, 1.07, APP_Z],
    cardPos: [-1.08, 2.24, 0.12],
    camera: { position: [1.95, 2.18, 6.4], target: [-0.05, 1.34, 0.1] },
  },
  {
    question: 'Почему трансформатор не создаёт дополнительную энергию?',
    options: ['Напряжение всегда уменьшается', 'Выходная мощность не больше входной', 'Ток перетекает через сердечник'],
    answer: 1,
    explanation: 'У идеального устройства входная и выходная мощности равны. У реального часть входной мощности уходит в нагрев меди и сердечника.',
    anchor: [0.0, 1.08, APP_Z],
    cardPos: [-1.72, 2.34, 0.12],
    camera: { position: [0.95, 2.28, 6.65], target: [-0.52, 1.36, 0.05] },
  },
];

export function transformerFrame(p, t) {
  let stage = p.lessonStep;
  let sampleT = t;
  let config = p;
  if (p.labMode === 'demo') {
    const demoRealSec = p.timeView === 'slow' ? t * 100 : t;
    stage = [0, 2, 3, 4, 5, 6][Math.floor(demoRealSec / 4.5) % 6];
  }
  if (p.labMode === 'demo' || p.labMode === 'steps') {
    config = { ...p, ...stages[stage].patch };
    if (p.labMode === 'steps') {
      const vp = transformerReading(config, 0).vp;
      sampleT = (stages[stage].phase - (vp ? Math.atan2(vp.im, vp.re) / TAU : 0)) / p.frequency;
    }
  }
  return { ...transformerReading(config, sampleT), config, stage, sampleT };
}

const turnDensity = (turns) => Math.min(36, Math.max(8, Math.round(Math.sqrt(turns) * 1.25)));

function scopePayload(m, p) {
  const cfg = m.config;
  const period = 1 / cfg.frequency;
  const span = 2 * period;
  const samples = Array.from({ length: 241 }, (_, i) => transformerReading(cfg, m.sampleT - span + (span * i) / 240));
  const useSplit = p.scopeScale !== 'shared' && !m.dc && (Math.abs(m.ratio - 1) > 0.25 || m.U2 < m.U1 * 0.4);
  const scopeNote = m.dc
    ? 'Установившийся DC (f = 0 Гц) · переменной ЭДС нет'
    : `Развёртка ${fmt(span * 1000, 1)} мс · ${cfg.frequency} Гц · ${useSplit ? 'разд. шкала (u₁ лев., u₂ прав.)' : 'общая шкала'}`;

  let warningBanner = '';
  if (m.dc) warningBanner = 'DC: U₂ = 0 после переходного процесса';
  else if (m.bPeak > 1.6) warningBanner = `B = ${fmt(m.bPeak, 2)} Тл > 1,6 Тл: линейное приближение превышено`;

  return {
    summaryPills: [
      { text: `${fmt(m.U1)}→${fmt(m.U2)} В`, color: '#7dd3fc' },
      { text: `${fmt(m.I1, 2)}/${fmt(m.I2, 2)} А`, color: '#fbbf24' },
      { text: `P=${fmt(m.outputPower)} Вт`, color: '#c4b5fd' },
    ],
    warningBanner,
    scopes: [
      {
        title: 'Осциллограф · мгновенные напряжения',
        units: 'В',
        time: m.sampleT,
        span,
        splitScale: useSplit,
        traces: [
          { label: 'u₁, В', color: '#fb923c', values: samples.map((r) => [r.t, r.u1]) },
          { label: 'u₂, В', color: '#38bdf8', values: samples.map((r) => [r.t, r.u2]) },
        ],
        note: scopeNote,
      },
    ],
    signature: `${p.scopeScale}|${cfg.voltage}|${cfg.n1}|${cfg.n2}|${cfg.frequency}|${cfg.resistance}|${cfg.load}|${cfg.model}|${cfg.source}|${m.sampleT.toFixed(5)}`,
  };
}

function calloutPayload(m, p) {
  if (p.labMode === 'free') {
    return { visible: false };
  }
  if (p.labMode === 'quiz') {
    const q = questions[p.quizIndex] || questions[0];
    return {
      visible: true,
      slideKey: `tr-quiz-${p.quizIndex}`,
      badge: `ВОПРОС ${p.quizIndex + 1} / ${questions.length}`,
      anchorPos: q.anchor,
      cardPos: q.cardPos,
      haloRadius: 0.75,
      accent: 0x38bdf8,
      accentHex: '#38bdf8',
      nav: {
        canPrev: p.quizIndex > 0,
        canNext: p.quizIndex < questions.length - 1,
        prevAction: { type: 'quizNav', delta: -1 },
        nextAction: { type: 'quizNav', delta: 1 },
      },
      quiz: {
        index: p.quizIndex,
        question: q.question,
        options: q.options,
        answer: q.answer,
        explanation: q.explanation,
        selected: p.quizAnswer,
      },
      signature: `q|${p.quizIndex}|${p.quizAnswer}`,
    };
  }

  const idx = m.stage || 0;
  const st = stages[idx] || stages[0];
  return {
    visible: true,
    slideKey: p.labMode === 'steps' ? `tr-step-${idx}` : `tr-demo-${idx}`,
    badge: p.labMode === 'steps' ? `СЛАЙД ${idx + 1} / ${stages.length}` : `ДЕМО · ${idx + 1} / ${stages.length}`,
    title: st.title,
    formula: st.formula,
    explanation: st.text,
    metricLabel: `Витки ${m.config.n1}/${m.config.n2}`,
    metric: `${fmt(m.U1)}→${fmt(m.U2)} В · I₂=${fmt(m.I2, 2)} А`,
    anchorPos: st.anchor,
    cardPos: st.cardPos,
    haloRadius: st.haloRadius,
    accent: st.accent,
    accentHex: st.accentHex,
    nav:
      p.labMode === 'steps'
        ? {
            canPrev: idx > 0,
            canNext: idx < stages.length - 1,
            prevAction: { type: 'step', delta: -1 },
            nextAction: { type: 'step', delta: 1 },
          }
        : null,
    signature: `s|${idx}|${m.config.voltage}|${m.config.n1}|${m.config.n2}|${m.config.load}|${m.sampleT.toFixed(4)}`,
  };
}

export default {
  id: 'transformer',
  kind: 'simulation',
  subject: 'physics',
  category: 'electromagnetism',
  title: 'Лаборатория трансформатора',
  shortTitle: 'Повышающий и понижающий трансформатор',
  subtitle: 'Физика · напряжение, витки и передача энергии',
  description: 'Изменяйте число витков, напряжение и нагрузку. Измеряйте U и I, наблюдайте поток и сравнивайте идеальную модель с потерями.',
  tags: ['трансформатор', 'индукция', 'витки', 'напряжение', 'переменный ток', 'энергия'],
  params: [
    {
      key: 'labMode',
      label: 'Режим лаборатории',
      type: 'select',
      default: 'free',
      visibleIf: () => false,
      options: [
        { value: 'free', label: 'Свободная лаборатория' },
        { value: 'demo', label: 'Демонстрация' },
        { value: 'steps', label: 'Презентация (по слайдам)' },
        { value: 'quiz', label: 'Проверка понимания' },
      ],
    },
    { key: 'lessonStep', label: 'Слайд', type: 'range', min: 0, max: 6, step: 1, default: 0, visibleIf: () => false },
    { key: 'quizIndex', label: 'Вопрос', type: 'range', min: 0, max: 2, step: 1, default: 0, visibleIf: () => false },
    { key: 'quizAnswer', label: 'Ответ', type: 'range', min: -1, max: 2, step: 1, default: -1, visibleIf: () => false },
    {
      key: 'scopeScale',
      label: 'Шкала осциллографа',
      type: 'select',
      default: 'auto',
      visibleIf: () => false,
      options: [
        { value: 'auto', label: 'Раздельная (u₁ лев., u₂ прав.)' },
        { value: 'shared', label: 'Общая (В)' },
      ],
    },
    { key: 'voltage', label: 'U₁ · действующее напряжение, В', type: 'range', min: 0, max: 240, step: 1, default: 220, exact: true },
    { key: 'n1', label: 'Первичная обмотка N₁', type: 'range', min: 20, max: 1200, step: 1, default: 550, exact: true, format: (v) => `${v} витков` },
    { key: 'n2', label: 'Вторичная обмотка N₂', type: 'range', min: 10, max: 1200, step: 1, default: 30, exact: true, format: (v) => `${v} витков` },
    { key: 'frequency', label: 'Частота f', type: 'range', min: 10, max: 100, step: 1, default: 50, exact: true, format: (v) => `${v} Гц` },
    { key: 'resistance', label: 'Нагрузка R', type: 'range', min: 10, max: 1000, step: 1, default: 100, exact: true, format: (v) => `${v} Ом` },
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
  getTimeScale: (p) => (p.labMode === 'steps' || p.labMode === 'quiz' ? 0 : p.timeView === 'slow' ? 0.01 : 1),
  getStepSize: (p) => 1 / (p.frequency * 16),
  steps: stages,
  layers: [
    { key: 'core', label: 'Ферромагнитный сердечник · прозрачный срез', color: '#64748b', step: 0 },
    { key: 'primary', label: 'Первичная цепь · медная', color: '#fb923c', step: 0 },
    { key: 'secondary', label: 'Вторичная цепь · голубая', color: '#38bdf8', step: 0 },
    { key: 'field', label: 'Поток Φ в сердечнике', color: '#c084fc', step: 0 },
    { key: 'current', label: 'Условные заряды и стрелки токов', color: '#fbbf24', step: 0 },
    { key: 'labels', label: 'Приборы, осциллограф и 3D-выноски', color: '#e2e8f0', step: 0 },
  ],
  cameraDefaults: { ...CAM_OVERVIEW, fitRadius: 2.55 },
  help: 'В режиме «Презентация» камера выделяет и показывает конкретный узел модели со стрелками и формулой. Осциллограф отображается поверх сцены и может быть свёрнут. Схемы зарядок используют импульсные ВЧ-трансформаторы.',
  summarizeParams: (p) => `N₁=${p.n1} / N₂=${p.n2} · U₁=${p.voltage} В`,
  evaluateAt(t, p) {
    return transformerFrame(p, t);
  },
  getScopeOverlay(m, p) {
    const payload = scopePayload(m, p);
    return { ...payload, draw: (canvas) => paintOscilloscopeOverlay(canvas, payload) };
  },
  getCalcRows(m) {
    return [
      ['U₁ / U₂ · RMS', `${fmt(m.U1)} / ${fmt(m.U2)} В`],
      ['I₁ / I₂ · RMS', `${fmt(m.I1, 4)} / ${fmt(m.I2, 4)} А`],
      ['N₂ / N₁', fmt(m.ratio, 5)],
      ['ЭДС вторичной ε₂(t)', `${fmt(m.e2, 3)} В`],
      ['Поток Φ(t)', `${fmt(m.flux === null ? null : m.flux * 1000, 3)} мВб`],
      ['B, амплитуда · S = 30 см²', `${fmt(m.bPeak, 3)} Тл`],
      ['Pвход / Pнагрузки', `${fmt(m.inputPower)} / ${fmt(m.outputPower)} Вт`],
      ['Потери: медь / сердечник', `${fmt(m.copperLoss)} / ${fmt(m.coreLoss)} Вт`],
      ['КПД η', `${fmt(m.efficiency * 100, 2)} %`],
    ];
  },
  lab: {
    steps: stages,
    questions,
    lockedControls: ['voltage', 'n1', 'n2', 'model', 'source', 'load'],
    displayParams: (m) => m.config,
    actions: (m, p) =>
      m.dc || p.labMode === 'quiz' || p.labMode === 'steps'
        ? []
        : [
            {
              id: 'toggleScale',
              label: p.scopeScale === 'shared' ? 'Шкала: Общая' : 'Шкала: Авто u₂',
              pressed: p.scopeScale !== 'shared',
              patch: (_, cur) => ({ scopeScale: cur.scopeScale === 'shared' ? 'auto' : 'shared' }),
            },
          ],
    cameraViews: CAM_VIEWS,
    getSlideCamera(p, stageIndex) {
      if (p.labMode === 'quiz') return (questions[p.quizIndex] || questions[0]).camera;
      if (p.labMode === 'steps' || p.labMode === 'demo') return stages[stageIndex ?? p.lessonStep]?.camera || CAM_OVERVIEW;
      return CAM_OVERVIEW;
    },
  },
  build(api, { groups: G, solved: m }) {
    const { THREE, V, studioBox, label, arrow } = api;
    const p = m.config;

    studioBox(G.core, 5.0, 0.12, 2.5, [-0.15, -0.02, 0.1], 0x1e293b, { edgeColor: 0x475569 });
    for (const x of [-0.85, 0.85]) {
      studioBox(G.core, 0.44, 1.85, 0.44, [x, 1.07, APP_Z], 0x64748b, { edgeColor: 0x94a3b8, opacity: 0.35 });
    }
    for (const y of [0.24, 1.9]) {
      studioBox(G.core, 2.14, 0.4, 0.44, [0, y, APP_Z], 0x64748b, { edgeColor: 0x94a3b8, opacity: 0.35 });
    }
    for (let z = APP_Z - 0.16; z <= APP_Z + 0.16; z += 0.08) {
      for (const y of [0.24, 1.9]) api.seg(G.core, V(-0.96, y, z), V(0.96, y, z), 0.006, 0x94a3b8);
    }

    const primaryCoilGrp = new THREE.Group();
    const secondaryCoilGrp = new THREE.Group();
    const primaryChargeGrp = new THREE.Group();
    const secondaryChargeGrp = new THREE.Group();
    G.primary.add(primaryCoilGrp);
    G.secondary.add(secondaryCoilGrp);
    G.current.add(primaryChargeGrp, secondaryChargeGrp);

    let lead1;
    let lead2;
    let primaryCharges = [];
    let secondaryCharges = [];
    let builtN1 = 0;
    let builtN2 = 0;

    function rebuildCoils(cfg) {
      api.clearGroup(primaryCoilGrp);
      api.clearGroup(secondaryCoilGrp);
      api.clearGroup(primaryChargeGrp);
      api.clearGroup(secondaryChargeGrp);

      const c1 = coil(api, primaryCoilGrp, { axis: 'y', center: [-0.85, 1.07, APP_Z], radius: 0.41, length: 1.18, turns: cfg.n1, color: 0xfb923c });
      const c2 = coil(api, secondaryCoilGrp, { axis: 'y', center: [0.85, 1.07, APP_Z], radius: 0.41, length: 1.18, turns: cfg.n2, color: 0x38bdf8 });

      lead1 = wire(api, primaryCoilGrp, [c1.end, [-1.5, 1.65, APP_Z], [-1.98, 1.15, APP_Z + 0.48], [-1.98, 0.42, APP_Z + 0.48], [-1.4, 0.28, APP_Z + 0.35], c1.start], 0xfb923c);
      lead2 = wire(api, secondaryCoilGrp, [c2.end, [1.35, 1.65, APP_Z], [1.68, 1.15, APP_Z + 0.45], [1.68, 0.68, APP_Z + 0.45]], 0x38bdf8);
      wire(api, secondaryCoilGrp, [[1.68, 0.38, APP_Z + 0.45], [1.3, 0.28, APP_Z + 0.35], c2.start], 0x38bdf8);

      primaryCharges = [chargeMarkers(api, primaryChargeGrp, c1.curve, 0xfbbf24), chargeMarkers(api, primaryChargeGrp, lead1, 0xfbbf24)];
      secondaryCharges = [chargeMarkers(api, secondaryChargeGrp, c2.curve, 0xa5f3fc), chargeMarkers(api, secondaryChargeGrp, lead2, 0xa5f3fc, 6)];
      builtN1 = turnDensity(cfg.n1);
      builtN2 = turnDensity(cfg.n2);
    }

    rebuildCoils(p);

    const switchPivot = new THREE.Group();
    switchPivot.position.set(1.68, 0.38, APP_Z + 0.45);
    api.seg(switchPivot, V(0, 0, 0), V(0, 0.3, 0), 0.025, 0xfbbf24);
    G.secondary.add(switchPivot);

    studioBox(G.primary, 0.72, 0.62, 0.36, [-1.98, 1.02, APP_Z + 0.48], 0x334155, { edgeColor: 0xfb923c });
    studioBox(G.secondary, 0.7, 0.56, 0.36, [1.68, 0.98, APP_Z + 0.45], 0x334155, { edgeColor: 0x38bdf8 });

    const sourceBadge = readout(api, G.primary, [-1.98, 1.02, APP_Z + 0.74], '#fed7aa', 0.68);
    const loadBadge = readout(api, G.secondary, [1.68, 0.98, APP_Z + 0.72], '#7dd3fc', 0.84);

    const n1Badge = readout(api, G.labels, [-0.85, 2.34, APP_Z], '#fdba74', 1.1);
    const n2Badge = readout(api, G.labels, [0.85, 2.34, APP_Z], '#7dd3fc', 1.1);
    const current1 = readout(api, G.labels, [-1.95, 1.66, APP_Z + 0.48], '#fbbf24', 1.38);
    const voltage1 = readout(api, G.labels, [-1.95, 0.22, APP_Z + 0.78], '#fdba74', 1.38);
    const current2 = readout(api, G.labels, [1.68, 1.66, APP_Z + 0.45], '#fbbf24', 1.32);
    const voltage2 = readout(api, G.labels, [1.68, 0.22, APP_Z + 0.74], '#7dd3fc', 1.32);
    const isoLabel = label('Электрическая изоляция', V(0, 0.12, APP_Z + 0.9), G.labels, { scale: 0.48 });

    const fieldArrows = [
      { pos: [-0.85, 0.5, APP_Z], dir: [0, 1.1, 0] },
      { pos: [-0.55, 1.9, APP_Z], dir: [1.1, 0, 0] },
      { pos: [0.85, 1.6, APP_Z], dir: [0, -1.1, 0] },
      { pos: [0.55, 0.24, APP_Z], dir: [-1.1, 0, 0] },
    ].map((a) => ({ ...a, handle: arrow(G.field, 0xc084fc, 0.032, 0.09, 0.2) }));
    const phiLabel = label('Φ(t)', V(0, 1.48, APP_Z + 0.2), G.field, { color: '#e9d5ff', scale: 0.46 });

    const focusHalo = focusHighlight3D(api, G.labels);
    const callout = spatialCallout3D(api, G.labels);
    const secondarySprites = [
      sourceBadge.sprite,
      loadBadge.sprite,
      n1Badge.sprite,
      n2Badge.sprite,
      current1.sprite,
      voltage1.sprite,
      current2.sprite,
      voltage2.sprite,
      isoLabel,
      phiLabel,
    ];

    return {
      fitRadius: 2.55,
      groundY: -0.08,
      handles: {
        rebuildCoils,
        getBuiltDensity: () => [builtN1, builtN2],
        getCharges: () => [primaryCharges, secondaryCharges],
        switchPivot,
        sourceBadge,
        loadBadge,
        n1Badge,
        n2Badge,
        voltage1,
        voltage2,
        current1,
        current2,
        fieldArrows,
        focusHalo,
        callout,
        secondarySprites,
      },
    };
  },
  updateScene(api, { params: p, solved: m, handles: h }) {
    if (!h) return;
    const isGuided = p.labMode === 'steps' || p.labMode === 'quiz';
    h.secondarySprites?.forEach((s) => {
      if (s) s.visible = !isGuided;
    });
    const cfg = m.config;
    const [b1, b2] = h.getBuiltDensity();
    if (turnDensity(cfg.n1) !== b1 || turnDensity(cfg.n2) !== b2) {
      h.rebuildCoils(cfg);
    }

    h.switchPivot.rotation.z = cfg.load === 'closed' ? 0 : -0.68;
    h.sourceBadge.set(cfg.source === 'dc' ? 'DC ⎓' : 'AC ∿');
    h.loadBadge.set(`R = ${cfg.resistance} Ом`);
    h.n1Badge.set(`N₁ = ${cfg.n1}`);
    h.n2Badge.set(`N₂ = ${cfg.n2}`);
    h.voltage1.set(`V₁: ${fmt(m.U1)} В`);
    h.voltage2.set(`V₂: ${fmt(m.U2)} В`);
    h.current1.set(`A₁: ${fmt(m.I1, 3)} А`);
    h.current2.set(`A₂: ${fmt(m.I2, 3)} А`);

    const [primaryCharges, secondaryCharges] = h.getCharges();
    const displacement = m.dc
      ? m.t * 0.2
      : m.I1 > 1e-12
        ? (0.075 * (-m.i1Phasor.re * Math.cos(m.phase) + m.i1Phasor.im * Math.sin(m.phase))) / m.I1
        : 0;
    primaryCharges.forEach((c) => updateCharges(api, c, displacement, m.i1));
    const secondaryDisplacement =
      m.dc || m.E2 < 1e-12
        ? 0
        : (-0.075 * (m.vp.re * Math.cos(m.phase) - m.vp.im * Math.sin(m.phase))) / Math.hypot(m.vp.re, m.vp.im);
    secondaryCharges.forEach((c) => updateCharges(api, c, secondaryDisplacement, m.i2));

    const strength = !m.dc && m.fluxPeak > 1e-12 ? m.flux / m.fluxPeak : 0;
    for (const a of h.fieldArrows) {
      const dir = a.dir.map((v) => v * strength);
      const pos = a.pos.map((v, i) => v + (strength < 0 ? a.dir[i] : 0));
      api.updateArrow(a.handle, pos, dir);
    }

    const cp = calloutPayload(m, p);
    h.callout.update(cp);
    h.focusHalo.setTarget(cp.anchorPos, cp.haloRadius, cp.accent, cp.visible);
  },
  tickVisual(dt, { handles: h }) {
    const a = h?.callout?.tick(dt) || false;
    const b = h?.focusHalo?.tick(dt) || false;
    return a || b;
  },
};
