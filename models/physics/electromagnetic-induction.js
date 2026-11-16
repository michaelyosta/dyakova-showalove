import { inductionReading, inductionProgram, inductionCheckpoint, fmt } from './lab/electromagnetism.js';
import {
  coil,
  wire,
  chargeMarkers,
  updateCharges,
  readout,
  galvanometer,
  paintOscilloscopeOverlay,
  focusHighlight3D,
  spatialCallout3D,
} from './lab/visuals.js';

const APP_Z = 0.1;
const CAM_OVERVIEW = { position: [0.22, 2.25, 5.7], target: [-0.08, 0.9, 0.15] };
const CAM_VIEWS = {
  overview: CAM_OVERVIEW,
  apparatus: { position: [-0.25, 1.92, 4.45], target: [-0.12, 0.88, 0.2] },
};

const stages = [
  {
    title: 'Магнит неподвижен',
    formula: 'Φ = const  ⇒  dΦ/dt = 0',
    text: 'Поле магнита существует, но поток через катушку не меняется — ЭДС равна нулю.',
    anchor: [-1.26, 0.88, APP_Z],
    cardPos: [0.22, 2.22, 0.15],
    haloRadius: 0.6,
    accent: 0x38bdf8,
    accentHex: '#38bdf8',
    camera: { position: [-1.65, 2.15, 6.05], target: [-0.42, 1.3, 0.1] },
  },
  {
    title: 'Вводим полюс N',
    formula: 'ε = −N · (dΦ / dt)',
    text: 'Поток сквозь N витков растёт. Индуцированный ток создаёт поле, отталкивающее полюс N.',
    anchor: [0.0, 0.88, APP_Z],
    cardPos: [-1.38, 2.22, 0.2],
    haloRadius: 0.68,
    accent: 0xa78bfa,
    accentHex: '#a78bfa',
    camera: { position: [1.35, 2.15, 6.15], target: [-0.35, 1.32, 0.15] },
  },
  {
    title: 'Остановили магнит внутри',
    formula: 'Φ = Φ_max,  v = 0  ⇒  I = 0',
    text: 'Магнитный поток максимален, но его изменение прекратилось. Стрелка гальванометра на нуле.',
    anchor: [1.22, 0.68, 0.85],
    cardPos: [-0.35, 2.15, 0.25],
    haloRadius: 0.65,
    accent: 0xfbbf24,
    accentHex: '#fbbf24',
    camera: { position: [2.2, 1.95, 5.8], target: [0.38, 1.24, 0.4] },
  },
  {
    title: 'Вынимаем магнит',
    formula: 'dΦ/dt < 0  ⇒  ε > 0',
    text: 'Поток убывает: ток меняет знак, а поле катушки притягивает удаляющийся магнит (закон Ленца).',
    anchor: [-0.38, 0.88, APP_Z],
    cardPos: [1.05, 2.24, 0.15],
    haloRadius: 0.65,
    accent: 0xfbbf24,
    accentHex: '#fbbf24',
    camera: { position: [-1.25, 2.18, 6.25], target: [0.15, 1.32, 0.15] },
  },
  {
    title: 'Переворачиваем магнит',
    formula: 'Φ(t) = Φ₀ · cosθ(t)',
    text: 'Поворот меняет проекцию поля на ось катушки, поэтому ЭДС возникает даже без поступательного сдвига.',
    anchor: [-1.26, 0.88, APP_Z],
    cardPos: [0.42, 2.18, 0.15],
    haloRadius: 0.62,
    accent: 0xf87171,
    accentHex: '#f87171',
    camera: { position: [-1.45, 2.08, 6.05], target: [-0.3, 1.28, 0.1] },
  },
  {
    title: 'Вводим полюс S',
    formula: 'B → −B  ⇒  ε → −ε,  |ε| ~ N·v',
    text: 'Обратная полярность меняет знак потока и ЭДС. Скорость v и число витков N прямо усиливают отклик.',
    anchor: [-0.2, 0.88, APP_Z],
    cardPos: [-1.45, 2.22, 0.15],
    haloRadius: 0.68,
    accent: 0x22c55e,
    accentHex: '#22c55e',
    camera: { position: [1.4, 2.15, 6.2], target: [-0.32, 1.3, 0.15] },
  },
  {
    title: 'Ключ: ЭДС и ток',
    formula: 'ε ≠ 0,  R = ∞  ⇒  I = 0',
    text: 'После остановки ε = 0. В свободной лаборатории разомкните цепь: при движении ЭДС будет, а ток исчезнет.',
    anchor: [-0.85, 0.22, 1.08],
    cardPos: [0.22, 1.88, 0.5],
    haloRadius: 0.54,
    accent: 0xfbbf24,
    accentHex: '#fbbf24',
    camera: { position: [-1.15, 1.98, 5.55], target: [-0.32, 1.08, 0.65] },
  },
];

const questions = [
  {
    question: 'Почему неподвижный магнит не вызывает постоянного отклонения стрелки?',
    options: ['Поток не меняется, dΦ/dt = 0', 'У магнита исчезает поле', 'В катушке нет зарядов'],
    answer: 0,
    explanation: 'ЭДС определяется скоростью изменения потока, а не его величиной. Магнитное поле при этом сохраняется.',
    anchor: [-1.26, 0.88, APP_Z],
    cardPos: [0.48, 2.22, 0.12],
    camera: { position: [-1.15, 2.15, 6.35], target: [-0.25, 1.32, 0.1] },
  },
  {
    question: 'Что произойдёт с ЭДС при удвоении числа витков при том же движении?',
    options: ['Уменьшится вдвое', 'Увеличится вдвое', 'Не изменится'],
    answer: 1,
    explanation: 'ε = −N·dΦ/dt. При неизменном потоке через один виток ЭДС прямо пропорциональна N.',
    anchor: [0.0, 0.88, APP_Z],
    cardPos: [-1.42, 2.24, 0.15],
    camera: { position: [1.35, 2.15, 6.4], target: [-0.35, 1.32, 0.15] },
  },
  {
    question: 'Можно ли получить ЭДС при разомкнутой цепи?',
    options: ['Нет, без тока ЭДС невозможна', 'Да, но тока через разрыв не будет', 'Да, и ток станет бесконечным'],
    answer: 1,
    explanation: 'ЭДС и сила тока — разные величины. На выводах появляется напряжение, но замкнутого пути для тока нет.',
    anchor: [-0.85, 0.22, 1.08],
    cardPos: [0.25, 1.92, 0.5],
    camera: { position: [-1.05, 1.98, 5.7], target: [-0.28, 1.12, 0.65] },
  },
];

const reading = (s, p) =>
  inductionReading({
    x: s.x,
    velocity: s.velocity,
    angle: s.angle,
    angularVelocity: s.angularVelocity,
    turns: p.turns,
    resistance: p.resistance,
    closed: p.labMode === 'demo' || p.labMode === 'steps' || p.circuit === 'closed',
  });

const stepSample = (p) => inductionProgram(inductionCheckpoint(p.lessonStep, p.speed / 100), p.speed / 100);

function scopePayload(m, p) {
  const isSteps = p.labMode === 'steps';
  let data = m.history;
  let span = 5;
  if (isSteps) {
    // Zoom the window on step 5 (magnet flip) so the rotation EMF waveform stands out clearly.
    span = p.lessonStep === 4 ? 1.6 : 5;
    data = Array.from({ length: 161 }, (_, i) => {
      const t = Math.max(0, m.t - span) + (i / 160) * Math.min(span, m.t);
      const r = reading(inductionProgram(t, p.speed / 100), p);
      return [t, r.emf, r.flux];
    });
  }
  const tEnd = isSteps ? Math.max(span, m.t) : Math.max(5, m.t);
  const emfVals = data.filter((a) => a[0] >= m.t - span).map((a) => [a[0], a[1]]);
  const fluxVals = data.filter((a) => a[0] >= m.t - span).map((a) => [a[0], a[2] * 1e6]);

  return {
    summaryPills: [
      { text: `ε = ${fmt(m.emf * 1000, 2)} мВ`, color: '#fbbf24' },
      { text: `I = ${fmt(m.current * 1000, 2)} мА`, color: '#38bdf8' },
      { text: `Φ = ${fmt(m.flux * 1e6, 2)} мкВб`, color: '#c4b5fd' },
    ],
    warningBanner:
      p.labMode === 'free' && p.motion === 'hold'
        ? 'Магнит удержан неподвижно · нажмите «Возобновить движение»'
        : '',
    scopes: [
      {
        title: 'ЭДС катушки ε(t)',
        units: 'В',
        time: tEnd,
        span,
        traces: [{ label: 'ε, В', color: '#fbbf24', values: emfVals }],
        note: `Окно ${span.toFixed(1)} с · ε = −N·dΦ/dt`,
      },
      {
        title: 'Поток Φ(t) через виток',
        units: 'мкВб',
        time: tEnd,
        span,
        traces: [{ label: 'Φ, мкВб', color: '#38bdf8', values: fluxVals }],
        note: 'ЭДС пропорциональна наклону Φ(t)',
      },
    ],
    signature: `${p.labMode}|${p.lessonStep}|${p.motion}|${p.turns}|${p.speed}|${p.resistance}|${p.circuit}|${m.t.toFixed(3)}|${m.emf.toFixed(5)}|${data.length}`,
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
      slideKey: `ind-quiz-${p.quizIndex}`,
      badge: `ВОПРОС ${p.quizIndex + 1} / ${questions.length}`,
      anchorPos: q.anchor,
      cardPos: q.cardPos,
      haloRadius: 0.72,
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

  const idx = p.labMode === 'steps' ? (p.lessonStep || 0) : (m.stage || 0);
  const st = stages[idx] || stages[0];
  return {
    visible: true,
    slideKey: p.labMode === 'steps' ? `ind-step-${idx}` : `ind-demo-${idx}`,
    badge: p.labMode === 'steps' ? `СЛАЙД ${idx + 1} / ${stages.length}` : `ДЕМО · ${idx + 1} / ${stages.length}`,
    title: st.title,
    formula: st.formula,
    explanation: st.text,
    metricLabel: idx === 1 ? `N = ${p.turns}` : idx === 6 ? 'Ключ цепи' : 'На приборах сейчас',
    metric: idx === 6 ? (m.closed ? 'Цепь замкнута · ε = 0' : 'Цепь разомкнута') : `ε = ${fmt(m.emf * 1000, 2)} мВ · I = ${fmt(m.current * 1000, 2)} мА`,
    anchorPos: idx === 0 || idx === 3 || idx === 4 ? [m.x * 10.5, 0.88, APP_Z] : st.anchor,
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
    signature: `s|${idx}|${p.turns}|${p.speed}|${m.t.toFixed(2)}|${m.emf.toFixed(5)}`,
  };
}

export default {
  id: 'electromagnetic-induction',
  kind: 'simulation',
  subject: 'physics',
  category: 'electromagnetism',
  title: 'Лаборатория Фарадея: магнит и катушка',
  shortTitle: 'Электромагнитная индукция',
  subtitle: 'Физика · закон Фарадея и правило Ленца',
  description: 'Перемещайте и переворачивайте магнит. Измеряйте поток, ЭДС и ток; сравнивайте скорость и количество витков.',
  tags: ['индукция', 'фарадей', 'ленц', 'катушка', 'магнит', 'гальванометр'],
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
    { key: 'target', label: 'Куда переместить магнит, см', type: 'range', min: -14, max: 14, step: 0.5, default: -12, exact: true, visibleIf: (p) => p.labMode === 'free' },
    {
      key: 'motion',
      label: 'Движение магнита',
      type: 'select',
      default: 'move',
      visibleIf: (p) => p.labMode === 'free',
      options: [
        { value: 'move', label: 'Двигаться к выбранной цели' },
        { value: 'hold', label: 'Удерживать неподвижно' },
      ],
    },
    { key: 'speed', label: 'Скорость движения', type: 'range', min: 1, max: 20, step: 1, default: 4, format: (v) => `${v} см/с`, exact: true },
    {
      key: 'polarity',
      label: 'Ориентация магнита',
      type: 'select',
      default: 'north',
      visibleIf: (p) => p.labMode === 'free',
      options: [
        { value: 'north', label: 'N направлен вправо →' },
        { value: 'south', label: 'S направлен вправо →' },
      ],
    },
    { key: 'turns', label: 'Витков N', type: 'range', min: 20, max: 800, step: 10, default: 200, format: (v) => String(v), exact: true },
    { key: 'resistance', label: 'Сопротивление цепи R', type: 'range', min: 5, max: 100, step: 1, default: 20, format: (v) => `${v} Ом`, exact: true },
    {
      key: 'circuit',
      label: 'Цепь',
      type: 'select',
      default: 'closed',
      visibleIf: (p) => p.labMode === 'free',
      options: [
        { value: 'closed', label: 'Замкнута · гальванометр подключён' },
        { value: 'open', label: 'Разомкнута · измеряем ЭДС без тока' },
      ],
    },
  ],
  presets: [
    { id: 'insert', label: 'Ввести к центру →', values: { labMode: 'free', motion: 'move', target: 0 } },
    { id: 'withdraw', label: '← Вынуть магнит', values: { labMode: 'free', motion: 'move', target: -12 } },
    { id: 'pass', label: 'Пройти насквозь →', values: { labMode: 'free', motion: 'move', target: 12 } },
  ],
  playback: { duration: null, canScrub: false, dtFixed: 1 / 240, defaultSpeed: 1 },
  getTimeScale: (p) => (p.labMode === 'steps' || p.labMode === 'quiz' ? 0 : 1),
  getStepSize: () => 0.05,
  steps: stages,
  layers: [
    { key: 'apparatus', label: 'Катушка, осциллограф и приборы', color: '#d97706', step: 0 },
    { key: 'magnet', label: 'Постоянный магнит N / S', color: '#f87171', step: 0 },
    { key: 'field', label: 'Линии поля магнита (схема)', color: '#38bdf8', step: 0 },
    { key: 'current', label: 'Условные заряды и направление тока', color: '#fbbf24', step: 0 },
    { key: 'induced', label: 'Поле катушки по правилу Ленца', color: '#a78bfa', step: 0 },
    { key: 'presentation', label: '3D-выноски, стрелки и подсветка', color: '#38bdf8', step: 0 },
  ],
  help: 'В режиме «Презентация» камера плавно фокусируется на отдельных частях модели со стрелками-выносками и формулами. Осциллограф отображается поверх сцены и его можно свернуть.',
  cameraDefaults: { ...CAM_OVERVIEW, fitRadius: 2.45 },
  summarizeParams: (p) => `N=${p.turns} · ${p.speed} см/с`,
  initState(p) {
    return {
      x: -0.12,
      velocity: 0,
      angle: p.polarity === 'south' ? Math.PI : 0,
      angularVelocity: 0,
      t: 0,
      charge: 0,
      history: [],
      mode: p.labMode,
      stage: 0,
    };
  },
  onParamsChange(s, p) {
    if (s.mode !== p.labMode && p.labMode !== 'quiz' && s.mode !== 'quiz') {
      s.t = 0;
      s.history = [];
    }
    s.mode = p.labMode;
    if (p.labMode === 'steps') Object.assign(s, stepSample(p));
    if (p.labMode === 'free' && Math.abs(p.target / 100 - s.x) < 1e-8) s.velocity = 0;
    if (p.labMode === 'free' && p.motion === 'hold') {
      s.velocity = 0;
      s.angularVelocity = 0;
    }
    return true;
  },
  stepState(s, dt, p) {
    if (p.labMode === 'steps' || p.labMode === 'quiz') return;
    s.t += dt;
    if (p.labMode === 'demo') Object.assign(s, inductionProgram(s.t, p.speed / 100));
    else if (p.motion === 'hold') {
      s.velocity = 0;
      s.angularVelocity = 0;
    } else {
      const delta = p.target / 100 - s.x;
      const travel = Math.min(Math.abs(delta), (p.speed / 100) * dt);
      s.velocity = travel > 1e-10 ? Math.sign(delta) * (p.speed / 100) : 0;
      s.x += Math.sign(delta) * travel;
      const turn = (p.polarity === 'south' ? Math.PI : 0) - s.angle;
      s.angularVelocity = Math.abs(turn) > 1e-8 ? Math.sign(turn) * Math.PI : 0;
      s.angle += Math.sign(turn) * Math.min(Math.abs(turn), Math.PI * dt);
      if (Math.abs(p.target / 100 - s.x) < 1e-10) s.velocity = 0;
      if (Math.abs((p.polarity === 'south' ? Math.PI : 0) - s.angle) < 1e-10) s.angularVelocity = 0;
    }
    const r = reading(s, p);
    s.charge += r.current * dt * 5;
    if (!s.history.length || s.t - s.history.at(-1)[0] >= 0.04 - 1e-8) {
      s.history.push([s.t, r.emf, r.flux, r.current]);
      if (s.history.length > 220) s.history.shift();
    }
  },
  solveState(s, p) {
    const a = p.labMode === 'steps' ? stepSample(p) : s;
    const t = p.labMode === 'steps' ? inductionCheckpoint(p.lessonStep, p.speed / 100) : s.t;
    return { ...reading(a, p), t, charge: s.charge, history: s.history, stage: a.stage ?? 0 };
  },
  serializeState(s) {
    return { ...s, history: s.history.map((a) => [...a]) };
  },
  deserializeState(s, p) {
    if (!s || !['x', 'velocity', 'angle', 'angularVelocity', 't', 'charge'].every((k) => Number.isFinite(s[k])) || Math.abs(s.x) > 0.15 || s.t < 0) {
      return null;
    }
    return {
      x: s.x,
      velocity: s.velocity,
      angle: s.angle,
      angularVelocity: s.angularVelocity,
      t: s.t,
      charge: s.charge,
      mode: p.labMode,
      stage: Number.isInteger(s.stage) && s.stage >= 0 && s.stage < stages.length ? s.stage : 0,
      history: Array.isArray(s.history)
        ? s.history.filter((a) => Array.isArray(a) && a.length === 4 && a.every(Number.isFinite)).slice(-220).map((a) => [...a])
        : [],
    };
  },
  getScopeOverlay(m, p) {
    const payload = scopePayload(m, p);
    return { ...payload, draw: (canvas) => paintOscilloscopeOverlay(canvas, payload) };
  },
  getCalcRows(m, p) {
    return [
      ['Магнит x / v', `${fmt(m.x * 100, 1)} см / ${fmt(m.velocity * 100, 1)} см/с`],
      ['Поток Φ через один виток', `${fmt(m.flux * 1e6, 3)} мкВб`],
      ['Скорость изменения dΦ/dt', `${fmt(m.dFlux * 1e6, 2)} мкВб/с`],
      ['ЭДС ε = −N·dΦ/dt', `${fmt(m.emf, 4)} В`],
      ['Гальванометр I = ε/R', `${fmt(m.current * 1000, 3)} мА`],
      ['Поле B, среднее по площади', `${fmt(m.bAverage * 1000, 3)} мТл`],
      ['Витки / сопротивление', `${p.turns} / ${p.resistance} Ом`],
    ];
  },
  lab: {
    steps: stages,
    questions,
    actions: (m, p) =>
      p.labMode === 'free'
        ? [
            {
              id: 'toggleHold',
              label: p.motion === 'hold' ? 'Возобновить движение' : 'Остановить магнит',
              pressed: p.motion === 'hold',
              patch: () => ({ motion: p.motion === 'hold' ? 'move' : 'hold' }),
            },
          ]
        : [],
    cameraViews: CAM_VIEWS,
    getSlideCamera(p, stageIndex) {
      if (p.labMode === 'quiz') return (questions[p.quizIndex] || questions[0]).camera;
      if (p.labMode === 'steps' || p.labMode === 'demo') return stages[stageIndex ?? p.lessonStep]?.camera || CAM_OVERVIEW;
      return CAM_OVERVIEW;
    },
  },
  build(api, { groups: G, solved: m, params: p }) {
    const { THREE, V, studioBox, label, arrow } = api;
    studioBox(G.apparatus, 4.4, 0.12, 2.5, [-0.15, -0.02, 0.1], 0x1e293b, { edgeColor: 0x475569 });
    const c = coil(api, G.apparatus, { center: [0, 0.88, APP_Z], radius: 0.54, length: 0.72, turns: p.turns });
    studioBox(G.apparatus, 0.86, 0.2, 1.15, [0, 0.2, APP_Z], 0x475569);
    const turnsLabel = label(`N = ${p.turns} витков`, V(0, 1.62, APP_Z), G.apparatus, { color: '#fdba74', scale: 0.52 });
    const radiusLabel = label('Радиус 4 см', V(0, 0.1, -0.78), G.apparatus, { scale: 0.44 });

    const g = galvanometer(api, G.apparatus, [1.22, 0.66, 0.85]);
    const lead = wire(
      api,
      G.apparatus,
      [
        c.end,
        [0.82, 0.52, -0.45],
        [1.75, 0.2, -0.35],
        [1.75, 0.36, 0.85],
        [0.72, 0.36, 0.85],
        [-0.6, 0.22, 1.08],
      ],
      0x38bdf8
    );
    wire(api, G.apparatus, [[-1.1, 0.22, 1.08], c.start], 0x38bdf8);

    const switchPivot = new THREE.Group();
    switchPivot.position.set(-1.1, 0.22, 1.08);
    api.seg(switchPivot, V(0, 0, 0), V(0.5, 0, 0), 0.024, 0xfbbf24);
    G.apparatus.add(switchPivot);
    studioBox(G.apparatus, 0.42, 0.07, 0.22, [-0.85, 0.15, 1.08], 0x64748b);
    const switchBadge = readout(api, G.apparatus, [-0.85, 0.48, 1.36], '#fbbf24', 0.96);

    const magnet = new THREE.Group();
    G.magnet.add(magnet);
    studioBox(magnet, 0.44, 0.32, 0.32, [0.22, 0, 0], 0xef4444);
    studioBox(magnet, 0.44, 0.32, 0.32, [-0.22, 0, 0], 0x2563eb);
    label('N', V(0.25, 0.3, 0), magnet, { color: '#fca5a5', scale: 0.42 });
    label('S', V(-0.25, 0.3, 0), magnet, { color: '#93c5fd', scale: 0.42 });

    const field = new THREE.Group();
    G.field.add(field);
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2;
      const rad = 0.52;
      wire(
        api,
        field,
        [
          [0.44, 0, 0],
          [0.46, rad * Math.cos(a), rad * Math.sin(a)],
          [-0.46, rad * Math.cos(a), rad * Math.sin(a)],
          [-0.44, 0, 0],
          [0.44, 0, 0],
        ],
        0x38bdf8,
        0.008
      );
      const ah = arrow(field, 0x38bdf8, 0.011, 0.038, 0.1);
      api.updateArrow(ah, [0.1, rad * Math.cos(a), rad * Math.sin(a)], [-0.26, 0, 0]);
    }

    const fluxArrow = arrow(G.induced, 0xa78bfa, 0.024, 0.068, 0.2);
    const lenzLabel = label('B катушки · Ленц', V(0, 2.16, APP_Z), G.induced, { color: '#c4b5fd', scale: 0.52 });
    const meter = readout(api, G.apparatus, [-1.85, 0.28, 0.72], '#67e8f9', 1.04);

    const focusHalo = focusHighlight3D(api, G.presentation || G.apparatus);
    const callout = spatialCallout3D(api, G.presentation || G.apparatus);
    const secondarySprites = [turnsLabel, radiusLabel, lenzLabel, meter.sprite, switchBadge.sprite, g.text.sprite];

    return {
      fitRadius: 2.45,
      groundY: -0.08,
      handles: {
        magnet,
        field,
        g,
        meter,
        switchPivot,
        switchBadge,
        fluxArrow,
        focusHalo,
        callout,
        secondarySprites,
        charges: [chargeMarkers(api, G.current, c.curve, 0xfbbf24, 14), chargeMarkers(api, G.current, lead, 0xfbbf24, 12)],
      },
    };
  },
  updateScene(api, { params: p, solved: m, handles: h }) {
    if (!h) return;
    const isGuided = p.labMode === 'steps' || p.labMode === 'quiz';
    h.secondarySprites?.forEach((s) => {
      if (s) s.visible = !isGuided;
    });
    for (const grp of [h.magnet, h.field]) {
      grp.position.set(m.x * 10.5, 0.88, APP_Z);
      grp.rotation.z = m.angle;
    }
    const range = 10 ** Math.ceil(Math.log10(Math.max(Math.abs(m.current) * 1.2, 0.00025)));
    h.g.needle.rotation.z = (-m.current / range) * 0.92;
    h.g.setRange(`±${fmt(range * 1000, 1)} мА`);
    h.g.text.set(`I = ${fmt(m.current * 1000, 3)} мА`);
    h.meter.set(`ε = ${fmt(m.emf * 1000, 3)} мВ`);
    h.switchPivot.rotation.z = m.closed ? 0 : 0.68;
    h.switchBadge.set(m.closed ? 'Цепь замкнута' : 'Разрыв: I = 0');
    h.charges.forEach((c) => updateCharges(api, c, m.charge, m.current));
    api.updateArrow(
      h.fluxArrow,
      [-0.65 * Math.sign(m.current), 1.92, APP_Z],
      [Math.abs(m.current) > 1e-8 ? 1.3 * Math.sign(m.current) : 0, 0, 0]
    );

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
