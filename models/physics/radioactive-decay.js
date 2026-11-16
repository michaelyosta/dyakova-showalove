/** Радиоактивный распад: отдельные 3D-модели α-, β- и γ-излучения, сравнение 3 лучей, магнит N/S и каскад преград. */

const T_DECAY = 0.65;
const DURATION = 3.8;
const ORIGIN_X = -1.35;
const BEAM_Y = 0.85;
const DETECTOR_X = 2.05;
const SHIELD_SINGLE_X = 0.95;
const CASCADE_PLATES = [
  { key: 'paper', x: 0.12, label: 'Бумага', col: 0xe2e8f0, op: 0.72, thick: 0.03, stops: ['alpha'] },
  { key: 'alu', x: 0.82, label: 'Al 3 мм', col: 0x94a3b8, op: 0.82, thick: 0.06, stops: ['alpha', 'beta'] },
  { key: 'lead', x: 1.52, label: 'Свинец', col: 0x334155, op: 0.94, thick: 0.18, stops: ['alpha', 'beta', 'gamma'] },
];

// Линейные RGB-цвета нуклонов под THREE.sRGBEncoding для сочного отображения протонов и нейтронов
const COL_PROTON = 0x960a0e;
const COL_PROTON_HI = 0xd61e26;
const COL_NEUTRON = 0x0a2152;
const COL_NEUTRON_HI = 0x1e4b8f;

const REACTIONS = {
  alpha: {
    u238: {
      id: 'u238',
      pSym: 'U',
      pA: 238,
      pZ: 92,
      pName: 'Уран-238',
      pShort: 'Уран',
      dSym: 'Th',
      dA: 234,
      dZ: 90,
      dName: 'Торий-234',
      dShort: 'Торий',
      halfLife: '4.47 млрд лет',
      energy: 'Q = 4.27 МэВ',
      eq: '²³⁸₉₂U → ²³⁴₉₀Th + ⁴₂He',
    },
    ra226: {
      id: 'ra226',
      pSym: 'Ra',
      pA: 226,
      pZ: 88,
      pName: 'Радий-226',
      pShort: 'Радий',
      dSym: 'Rn',
      dA: 222,
      dZ: 86,
      dName: 'Радон-222',
      dShort: 'Радон',
      halfLife: '1600 лет',
      energy: 'Q = 4.87 МэВ',
      eq: '²²⁶₈₈Ra → ²²²₈₆Rn + ⁴₂He',
    },
    po210: {
      id: 'po210',
      pSym: 'Po',
      pA: 210,
      pZ: 84,
      pName: 'Полоний-210',
      pShort: 'Полоний',
      dSym: 'Pb',
      dA: 206,
      dZ: 82,
      dName: 'Свинец-206',
      dShort: 'Свинец',
      halfLife: '138.4 сут',
      energy: 'Q = 5.41 МэВ',
      eq: '²¹⁰₈₄Po → ²⁰⁶₈₂Pb + ⁴₂He',
    },
  },
  beta: {
    c14: {
      id: 'c14',
      pSym: 'C',
      pA: 14,
      pZ: 6,
      pName: 'Углерод-14',
      pShort: 'Углерод',
      dSym: 'N',
      dA: 14,
      dZ: 7,
      dName: 'Азот-14',
      dShort: 'Азот',
      sign: -1,
      halfLife: '5730 лет',
      energy: 'Q = 0.156 МэВ',
      eq: '¹⁴₆C → ¹⁴₇N + ⁰₋₁e + ν̃ₑ',
    },
    i131: {
      id: 'i131',
      pSym: 'I',
      pA: 131,
      pZ: 53,
      pName: 'Иод-131',
      pShort: 'Иод',
      dSym: 'Xe',
      dA: 131,
      dZ: 54,
      dName: 'Ксенон-131',
      dShort: 'Ксенон',
      sign: -1,
      halfLife: '8.02 сут',
      energy: 'Q = 0.97 МэВ',
      eq: '¹³¹₅₃I → ¹³¹₅₄Xe + ⁰₋₁e + ν̃ₑ',
    },
    na22: {
      id: 'na22',
      pSym: 'Na',
      pA: 22,
      pZ: 11,
      pName: 'Натрий-22',
      pShort: 'Натрий',
      dSym: 'Ne',
      dA: 22,
      dZ: 10,
      dName: 'Неон-22',
      dShort: 'Неон',
      sign: 1,
      halfLife: '2.60 года',
      energy: 'Q = 2.84 МэВ',
      eq: '²²₁₁Na → ²²₁₀Ne + ⁰₊₁e + νₑ',
    },
  },
  gamma: {
    ni60: {
      id: 'ni60',
      pSym: 'Ni*',
      pA: 60,
      pZ: 28,
      pName: 'Никель-60*',
      pShort: 'Никель*',
      dSym: 'Ni',
      dA: 60,
      dZ: 28,
      dName: 'Никель-60',
      dShort: 'Никель',
      halfLife: '< 1 пс',
      energy: 'Eγ = 1.33 МэВ',
      eq: '⁶⁰₂₈Ni* → ⁶⁰₂₈Ni + γ',
    },
    ba137: {
      id: 'ba137',
      pSym: 'Ba*',
      pA: 137,
      pZ: 56,
      pName: 'Барий-137m',
      pShort: 'Барий*',
      dSym: 'Ba',
      dA: 137,
      dZ: 56,
      dName: 'Барий-137',
      dShort: 'Барий',
      halfLife: '2.55 мин',
      energy: 'Eγ = 0.662 МэВ',
      eq: '¹³⁷₅₆Ba* → ¹³⁷₅₆Ba + γ',
    },
    tc99m: {
      id: 'tc99m',
      pSym: 'Tc*',
      pA: 99,
      pZ: 43,
      pName: 'Технеций-99m',
      pShort: 'Технеций*',
      dSym: 'Tc',
      dA: 99,
      dZ: 43,
      dName: 'Технеций-99',
      dShort: 'Технеций',
      halfLife: '6.01 ч',
      energy: 'Eγ = 0.141 МэВ',
      eq: '⁹⁹ᵐ₄₃Tc → ⁹⁹₄₃Tc + γ',
    },
  },
  compare: {
    id: 'compare',
    pSym: 'U,C,Ni*',
    pA: 238,
    pZ: 92,
    pName: 'Смесь α, β⁻, γ',
    pShort: 'Источник',
    dSym: 'Th,N,Ni',
    dA: 234,
    dZ: 90,
    dName: 'Продукты распада',
    dShort: 'Детектор',
    halfLife: 'Сравнение',
    energy: 'B и 3 преграды',
    eq: 'α (⁴He) · β⁻ (e⁻) · γ (hν)',
  },
};

function buildNucleonLattice(maxCount = 60) {
  const pts = [];
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < maxCount; i++) {
    const t = (i + 0.5) / maxCount;
    const r = 0.3 + 0.7 * Math.cbrt(t);
    const y = 1 - 2 * t;
    const radXZ = Math.sqrt(Math.max(0, 1 - y * y));
    const phi = i * goldenAngle;
    pts.push([r * radXZ * Math.cos(phi), r * y, r * radXZ * Math.sin(phi)]);
  }
  pts.sort((a, b) => b[0] - a[0]);
  return pts;
}
const NUCLEON_SEEDS = buildNucleonLattice(60);

function getActiveReaction(p) {
  const type = p.decayType || 'alpha';
  if (type === 'compare') return REACTIONS.compare;
  if (type === 'beta') return REACTIONS.beta[p.betaEx] || REACTIONS.beta.c14;
  if (type === 'gamma') return REACTIONS.gamma[p.gammaEx] || REACTIONS.gamma.ni60;
  return REACTIONS.alpha[p.alphaEx] || REACTIONS.alpha.u238;
}

function getShieldStopX(kind, shield) {
  if (shield === 'cascade') {
    for (const plate of CASCADE_PLATES) {
      if (plate.stops.includes(kind)) {
        return plate.x - (plate.key === 'lead' ? 0.01 : plate.thick * 0.5 + 0.01);
      }
    }
    return DETECTOR_X - 0.02;
  }
  if (shield === 'paper' && kind === 'alpha') return SHIELD_SINGLE_X - 0.025;
  if (shield === 'alu' && (kind === 'alpha' || kind === 'beta')) return SHIELD_SINGLE_X - 0.04;
  if (shield === 'lead') return kind === 'gamma' ? SHIELD_SINGLE_X + 0.01 : SHIELD_SINGLE_X - 0.1;
  return DETECTOR_X - 0.02;
}

function getSingleShieldCfg(shield) {
  if (shield === 'paper') return { x: SHIELD_SINGLE_X, label: 'Бумага', col: 0xe2e8f0, op: 0.72, thick: 0.03 };
  if (shield === 'alu') return { x: SHIELD_SINGLE_X, label: 'Алюминий 3 мм', col: 0x94a3b8, op: 0.84, thick: 0.065 };
  if (shield === 'lead') return { x: SHIELD_SINGLE_X, label: 'Свинец 5 см', col: 0x334155, op: 0.94, thick: 0.19 };
  return null;
}

function computeCurveParams(kind, reaction, bField) {
  const b = Number.isFinite(bField) ? bField : 0.6;
  if (kind === 'gamma') return { speed: 2.05, curvY: 0 };
  if (kind === 'alpha') return { speed: 1.25, curvY: 0.095 * b };
  const sign = reaction.sign || -1;
  return { speed: 1.75, curvY: sign * 0.31 * b };
}

function solveBeam(kind, reaction, bField, shield, tau, yOrigin = BEAM_Y) {
  const { speed, curvY } = computeCurveParams(kind, reaction, bField);
  const stopX = getShieldStopX(kind, shield);
  const isDetectorStop = stopX >= DETECTOR_X - 0.05;
  const dtStep = 0.025;
  const maxDur = DURATION - T_DECAY;
  const pts = [];
  let stopTau = null;
  let stopPt = null;

  for (let s = 0; s <= maxDur + 1e-6; s += dtStep) {
    const x = ORIGIN_X + speed * s;
    const y = yOrigin + 0.5 * curvY * s * s;
    if (x >= stopX) {
      const sHit = (stopX - ORIGIN_X) / speed;
      const yHit = yOrigin + 0.5 * curvY * sHit * sHit;
      stopTau = sHit;
      stopPt = [stopX, yHit, 0];
      pts.push(stopPt);
      break;
    }
    pts.push([x, y, 0]);
  }

  const effTau = stopTau !== null && tau >= stopTau ? stopTau : tau;
  const pos = [ORIGIN_X + speed * effTau, yOrigin + 0.5 * curvY * effTau * effTau, 0];
  const stoppedNow = stopTau !== null && tau >= stopTau - 1e-4;
  const vel = stoppedNow ? [0, 0, 0] : [speed, curvY * effTau, 0];
  return {
    kind,
    yOrigin,
    pts,
    speed,
    curvY,
    stopTau,
    stopPt,
    isDetectorStop,
    pos,
    vel,
    stoppedNow,
  };
}

export default {
  id: 'radioactive-decay',
  kind: 'simulation',
  subject: 'physics',
  category: 'nuclear',
  title: 'Радиоактивный распад: α-, β- и γ-излучение',
  shortTitle: 'Распад · α, β и γ',
  subtitle: 'Физика · атомное ядро',
  description:
    'Модели α-, β- и γ-распада с превращениями U→Th, C→N, Ni*→Ni, магнитом N/S, детектором и каскадом преград Бумага→Al→Pb.',
  tags: ['радиоактивность', 'альфа', 'бета', 'гамма', 'ядро', 'изотоп', 'уран', 'радий', 'физика', 'егэ'],
  previewSvg: `<svg viewBox="0 0 100 100" width="96" height="96" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
    <circle cx="30" cy="54" r="14" fill="rgba(239,68,68,0.22)" stroke="#f87171"/>
    <circle cx="26" cy="50" r="3.5" fill="#ef4444" stroke="none"/>
    <circle cx="34" cy="58" r="3.5" fill="#38bdf8" stroke="none"/>
    <circle cx="34" cy="49" r="3.2" fill="#38bdf8" stroke="none"/>
    <path d="M44 48 Q64 34 84 26" stroke="#fbbf24" stroke-width="2.2"/>
    <circle cx="84" cy="26" r="4" fill="#fbbf24" stroke="none"/>
    <path d="M45 54 Q52 49 58 54 T72 54 T86 54" stroke="#c084fc" stroke-width="2.2"/>
    <path d="M44 60 Q64 74 84 82" stroke="#38bdf8" stroke-dasharray="3 2" stroke-width="2"/>
    <circle cx="84" cy="82" r="3" fill="#38bdf8" stroke="none"/>
  </svg>`,

  params: [
    {
      key: 'decayType',
      label: 'Вид распада',
      type: 'select',
      default: 'alpha',
      options: [
        { value: 'alpha', label: 'α-распад (вылет ⁴₂He)' },
        { value: 'beta', label: 'β-распад (e⁻ / e⁺ и нейтрино)' },
        { value: 'gamma', label: 'γ-излучение (снятие возбуждения)' },
        { value: 'compare', label: 'Сравнение: α, β⁻ и γ вместе' },
      ],
    },
    {
      key: 'alphaEx',
      label: 'Пример α-распада',
      type: 'select',
      default: 'u238',
      visibleIf: (p) => p.decayType === 'alpha',
      options: [
        { value: 'u238', label: '²³⁸U → ²³⁴Th + α (Уран → Торий)' },
        { value: 'ra226', label: '²²⁶Ra → ²²²Rn + α (Радий → Радон)' },
        { value: 'po210', label: '²¹⁰Po → ²⁰⁶Pb + α (Полоний → Свинец)' },
      ],
    },
    {
      key: 'betaEx',
      label: 'Пример β-распада',
      type: 'select',
      default: 'c14',
      visibleIf: (p) => p.decayType === 'beta',
      options: [
        { value: 'c14', label: '¹⁴C → ¹⁴N + e⁻ (Углерод → Азот, β⁻)' },
        { value: 'i131', label: '¹³¹I → ¹³¹Xe + e⁻ (Иод → Ксенон, β⁻)' },
        { value: 'na22', label: '²²Na → ²²Ne + e⁺ (Натрий → Неон, β⁺)' },
      ],
    },
    {
      key: 'gammaEx',
      label: 'Пример γ-перехода',
      type: 'select',
      default: 'ni60',
      visibleIf: (p) => p.decayType === 'gamma',
      options: [
        { value: 'ni60', label: '⁶⁰Ni* → ⁶⁰Ni + γ (Никель-60*)' },
        { value: 'ba137', label: '¹³⁷Ba* → ¹³⁷Ba + γ (Барий-137m)' },
        { value: 'tc99m', label: '⁹⁹ᵐTc → ⁹⁹Tc + γ (Технеций-99m)' },
      ],
    },
    {
      key: 'bField',
      label: 'Магнитное поле B',
      type: 'range',
      min: -1,
      max: 1,
      step: 0.2,
      default: 0.6,
      format: (v) => (Math.abs(v) < 0.05 ? 'Выкл' : `${v > 0 ? '+' : ''}${v.toFixed(1)} Тл`),
    },
    {
      key: 'shield',
      label: 'Преграда (защита)',
      type: 'select',
      default: 'off',
      options: [
        { value: 'off', label: 'Только экран-детектор' },
        { value: 'cascade', label: 'Каскад: Бумага → Al → Свинец' },
        { value: 'paper', label: 'Лист бумаги (держит α)' },
        { value: 'alu', label: 'Алюминий 3 мм (держит α и β)' },
        { value: 'lead', label: 'Свинец 5 см (гасит α, β, γ)' },
      ],
    },
  ],
  presets: [
    { id: 'ex-alpha', label: 'α: ²³⁸U → ²³⁴Th + ⁴He', values: { decayType: 'alpha', alphaEx: 'u238', bField: 0.6, shield: 'off' } },
    { id: 'ex-beta', label: 'β⁻: ¹⁴C → ¹⁴N + e⁻ + ν̃ₑ', values: { decayType: 'beta', betaEx: 'c14', bField: 0.6, shield: 'off' } },
    { id: 'ex-gamma', label: 'γ: ⁶⁰Ni* → ⁶⁰Ni + γ', values: { decayType: 'gamma', gammaEx: 'ni60', bField: 0.6, shield: 'off' } },
    { id: 'ex-cmp-b', label: 'Веер 3 лучей α / β / γ в поле B', values: { decayType: 'compare', bField: 0.8, shield: 'off' } },
    { id: 'ex-cmp-sh', label: '3 преграды: Бумага → Al → Pb', values: { decayType: 'compare', bField: 0.0, shield: 'cascade' } },
  ],
  summarizeParams: (p) => {
    if (p.decayType === 'compare') return p.shield === 'cascade' ? 'α/β/γ · 3 преграды' : 'α/β/γ · поле B';
    const rx = getActiveReaction(p);
    const kind = p.decayType === 'beta' ? (rx.sign > 0 ? 'β⁺' : 'β⁻') : p.decayType === 'gamma' ? 'γ' : 'α';
    return `${kind} · ${rx.pA}${rx.pSym.replace('*', '')}→${rx.dA}${rx.dSym}`;
  },

  playback: { loop: false, duration: DURATION, canScrub: true, defaultSpeed: 1, initialTime: 2.15 },

  layers: [
    { key: 'nuc', color: '#ef4444', label: 'Источник / ядро (протоны p⁺, нейтроны n⁰)', step: 0 },
    { key: 'rad', color: '#fbbf24', label: 'Пучок частиц, следы и экран-детектор', step: 0 },
    { key: 'field', color: '#38bdf8', label: 'Магнит N / S (зона поля B)', step: 0 },
    { key: 'shield', color: '#94a3b8', label: 'Поглощающие преграды', step: 0 },
    { key: 'x', color: '#c084fc', label: 'Схема превращения / уровней (2D)', step: 0 },
  ],

  calcAriaLabel: 'Параметры и продукты ядерного распада',
  diagramAriaLabel: '2D-схема превращения ядра, уровней или преград',
  diagramLayerKey: 'x',

  cameraDefaults: {
    position: [0.3, 2.25, 5.4],
    target: [0.22, 0.85, 0],
    fitRadius: 2.58,
  },

  evaluateAt(t, p) {
    const tc = Math.max(0, Math.min(t, DURATION));
    const decayType = p.decayType || 'alpha';
    const rx = getActiveReaction(p);
    const bField = Number.isFinite(p.bField) ? p.bField : 0.6;
    const shield = p.shield || 'off';
    const decayed = tc >= T_DECAY;
    const tau = decayed ? tc - T_DECAY : 0;

    const splitCompare = decayType === 'compare' && Math.abs(bField) < 0.05;
    const beamA = solveBeam('alpha', rx, bField, shield, tau, splitCompare ? BEAM_Y + 0.24 : BEAM_Y);
    const beamB = solveBeam('beta', decayType === 'compare' ? { sign: -1 } : rx, bField, shield, tau, BEAM_Y);
    const beamG = solveBeam('gamma', rx, bField, shield, tau, splitCompare ? BEAM_Y - 0.24 : BEAM_Y);
    const mainBeam = decayType === 'beta' ? beamB : decayType === 'gamma' ? beamG : beamA;

    const recoil = decayType === 'compare' || !decayed ? 0 : -0.14 * (1 - Math.exp(-tau * 4.5));
    const shiftText =
      decayType === 'compare'
        ? 'α: (−2,−4) · β⁻: (+1,0) · γ: (0,0)'
        : decayType === 'alpha'
          ? 'ΔZ = −2, ΔA = −4 (−2 клетки)'
          : decayType === 'gamma'
            ? 'ΔZ = 0, ΔA = 0 (уровень E*→E)'
            : rx.sign > 0
              ? 'ΔZ = −1, ΔA = 0 (−1 клетка)'
              : 'ΔZ = +1, ΔA = 0 (+1 клетка)';

    const radName =
      decayType === 'compare'
        ? 'α (+2e), β⁻ (−1e), γ (0)'
        : decayType === 'alpha'
          ? 'α-частица ⁴₂He (q = +2e)'
          : decayType === 'gamma'
            ? 'γ-квант (фотон, q = 0)'
            : rx.sign > 0
              ? 'Позитрон ⁰₊₁e + νₑ (+1e)'
              : 'Электрон ⁰₋₁e + ν̃ₑ (−1e)';

    let statusText = 'Готовность источника';
    if (decayed) {
      if (decayType === 'compare') {
        statusText =
          shield === 'cascade'
            ? 'α → Бумага · β⁻ → Al · γ → Свинец'
            : Math.abs(bField) < 0.05
              ? 'Прямой пучок до экрана'
              : 'Веер: α ↑ · γ → · β⁻ ↓';
      } else if (mainBeam.stoppedNow && !mainBeam.isDetectorStop) {
        statusText =
          shield === 'cascade'
            ? decayType === 'alpha'
              ? 'Остановлено в бумаге'
              : decayType === 'beta'
                ? 'Прошло бумагу, стоп в Al'
                : 'Прошло бумагу и Al, стоп в Pb'
            : `Задержано (${getSingleShieldCfg(shield)?.label.toLowerCase() || 'преграда'})`;
      } else if (mainBeam.stoppedNow && mainBeam.isDetectorStop) {
        statusText = 'Регистрация на экране-детекторе';
      } else if (decayType === 'gamma') {
        statusText = 'Летит прямо (q = 0, поле не действует)';
      } else if (Math.abs(bField) < 0.05) {
        statusText = 'Прямо (поле выкл.)';
      } else {
        const dirWord = mainBeam.curvY > 0 ? 'вверх' : 'вниз';
        statusText = `Отклонение ${dirWord} (${decayType === 'alpha' ? 'слабо' : 'сильно'})`;
      }
    }

    return {
      t: tc,
      tau,
      decayed,
      decayType,
      rx,
      bField,
      shield,
      beamA,
      beamB,
      beamG,
      mainBeam,
      recoil,
      shiftText,
      radName,
      statusText,
      parentN: rx.pA - rx.pZ,
      daughterN: rx.dA - rx.dZ,
    };
  },

  getCalcRows(m) {
    const rx = m.rx;
    if (m.decayType === 'compare') {
      return [
        ['Режим', 'Одновременный пучок α, β⁻, γ'],
        ['Превращения', 'U→Th (α) · C→N (β⁻) · Ni*→Ni (γ)'],
        ['Заряд и масса', 'α (+2e, 4u) · β⁻ (−e, ≪u) · γ (0)'],
        ['Сдвиг Содди', m.shiftText],
        ['Преграды', 'Бумага: α | Al: β⁻ | Pb: γ'],
        ['Итог опыта', m.statusText],
      ];
    }
    return [
      ['Реакция', rx.eq],
      ['Было → Стало', m.decayed ? `${rx.pName} → ${rx.dName}` : `${rx.pName} (до распада)`],
      ['Протоны / нейтроны', m.decayed ? `${rx.pZ}→${rx.dZ} p⁺, ${m.parentN}→${m.daughterN} n⁰` : `${rx.pZ} p⁺, ${m.parentN} n⁰`],
      ['Излучение', m.radName],
      ['Правило Содди', m.shiftText],
      ['T½ и энергия', `${rx.halfLife} · ${rx.energy}`],
      ['Пучок и детектор', m.statusText],
    ];
  },

  renderDiagram(m) {
    const rx = m.rx;
    if (m.decayType === 'compare') {
      if (m.shield === 'cascade') {
        return (
          `<svg role="img" aria-label="Проникающая способность α, β, γ" viewBox="0 0 200 200" style="display:block;width:100%;height:auto">` +
          `<text x="100" y="18" text-anchor="middle" font-size="10.2" font-weight="700" fill="#fbbf24">ПРОНИКАЮЩАЯ СПОСОБНОСТЬ</text>` +
          `<rect x="14" y="64" width="22" height="58" rx="4" fill="rgba(148,163,184,0.22)" stroke="#94a3b8" stroke-width="1.5"/>` +
          `<text x="25" y="97" text-anchor="middle" font-size="9" font-weight="700" fill="currentColor">α β γ</text>` +
          `<rect x="68" y="42" width="5" height="104" fill="#e2e8f0"/>` +
          `<text x="70" y="34" text-anchor="middle" font-size="8" fill="#cbd5e1">Бумага</text>` +
          `<rect x="114" y="42" width="9" height="104" fill="#94a3b8"/>` +
          `<text x="118" y="34" text-anchor="middle" font-size="8" fill="#cbd5e1">Al</text>` +
          `<rect x="158" y="42" width="18" height="104" fill="#475569" stroke="#cbd5e1" stroke-width="1"/>` +
          `<text x="167" y="34" text-anchor="middle" font-size="8" fill="#cbd5e1">Свинец</text>` +
          `<line x1="36" y1="68" x2="67" y2="68" stroke="#fbbf24" stroke-width="2.6"/>` +
          `<circle cx="67" cy="68" r="3.5" fill="#fbbf24"/>` +
          `<text x="48" y="62" font-size="9" font-weight="700" fill="#fbbf24">α</text>` +
          `<line x1="36" y1="94" x2="113" y2="94" stroke="#38bdf8" stroke-width="2.4"/>` +
          `<circle cx="113" cy="94" r="3.5" fill="#38bdf8"/>` +
          `<text x="48" y="88" font-size="9" font-weight="700" fill="#38bdf8">β⁻</text>` +
          `<line x1="36" y1="120" x2="165" y2="120" stroke="#c084fc" stroke-width="2.4" stroke-dasharray="4 2"/>` +
          `<circle cx="165" cy="120" r="3.5" fill="#c084fc"/>` +
          `<text x="48" y="114" font-size="9" font-weight="700" fill="#c084fc">γ</text>` +
          `<line x1="14" y1="158" x2="186" y2="158" stroke="currentColor" stroke-opacity=".24" stroke-width="1"/>` +
          `<text x="100" y="174" text-anchor="middle" font-size="9.8" font-weight="600" fill="currentColor">Бумага держит α · Al держит β</text>` +
          `<text x="100" y="190" text-anchor="middle" font-size="9.2" fill="#c084fc">Свинец ослабляет γ-излучение</text>` +
          '</svg>'
        );
      }
      const b = m.bField;
      const ay = (94 - 28 * b).toFixed(1);
      const by = (94 + 44 * b).toFixed(1);
      return (
        `<svg role="img" aria-label="Сравнение отклонения α, β, γ в магнитном поле" viewBox="0 0 200 200" style="display:block;width:100%;height:auto">` +
        `<text x="100" y="18" text-anchor="middle" font-size="10.2" font-weight="700" fill="#38bdf8">РАСЩЕПЛЕНИЕ В ПОЛЕ B${Math.abs(b) < 0.05 ? '=0' : b > 0 ? '⊗' : '⊙'}</text>` +
        `<rect x="14" y="76" width="22" height="36" rx="4" fill="rgba(148,163,184,0.22)" stroke="#94a3b8" stroke-width="1.5"/>` +
        `<text x="25" y="98" text-anchor="middle" font-size="9.5" font-weight="700" fill="currentColor">U+</text>` +
        `<rect x="166" y="34" width="6" height="118" fill="rgba(56,189,248,0.24)" stroke="#38bdf8" stroke-width="1.2"/>` +
        `<path d="M36 94 Q102 94 166 ${ay}" fill="none" stroke="#fbbf24" stroke-width="2.5"/>` +
        `<circle cx="166" cy="${ay}" r="3.5" fill="#fbbf24"/>` +
        `<text x="176" y="${Number(ay) + 3}" font-size="9.5" font-weight="700" fill="#fbbf24">α</text>` +
        `<line x1="36" y1="94" x2="166" y2="94" stroke="#c084fc" stroke-width="2.3" stroke-dasharray="4 2"/>` +
        `<circle cx="166" cy="94" r="3.5" fill="#c084fc"/>` +
        `<text x="176" y="97" font-size="9.5" font-weight="700" fill="#c084fc">γ</text>` +
        `<path d="M36 94 Q102 94 166 ${by}" fill="none" stroke="#38bdf8" stroke-width="2.5"/>` +
        `<circle cx="166" cy="${by}" r="3.5" fill="#38bdf8"/>` +
        `<text x="176" y="${Number(by) + 3}" font-size="9.5" font-weight="700" fill="#38bdf8">β⁻</text>` +
        `<line x1="14" y1="158" x2="186" y2="158" stroke="currentColor" stroke-opacity=".24" stroke-width="1"/>` +
        `<text x="100" y="174" text-anchor="middle" font-size="9.8" font-weight="600" fill="currentColor">α (+2e) и β⁻ (−1e) вразлёт</text>` +
        `<text x="100" y="190" text-anchor="middle" font-size="9.2" fill="#c084fc">γ-квант (q=0) идёт прямо</text>` +
        '</svg>'
      );
    }

    if (m.decayType === 'gamma') {
      // Энергетические уровни ядра E2* -> E1 + hν (фотон)
      const lvl = m.decayed ? '132' : '94';
      return (
        `<svg role="img" aria-label="Энергетические уровни при γ-излучении" viewBox="0 0 200 200" style="display:block;width:100%;height:auto">` +
        `<text x="100" y="18" text-anchor="middle" font-size="10.2" font-weight="700" fill="#c084fc">γ-ПЕРЕХОД · ΔZ = 0, ΔA = 0</text>` +
        `<circle cx="38" cy="60" r="21" fill="rgba(251,191,36,0.16)" stroke="#fbbf24" stroke-width="1.8"/>` +
        `<text x="38" y="64" text-anchor="middle" font-size="13" font-weight="700" fill="currentColor">${rx.pSym}</text>` +
        `<text x="38" y="92" text-anchor="middle" font-size="8.5" fill="#fbbf24">E* (возб.)</text>` +
        `<line x1="76" y1="54" x2="152" y2="54" stroke="#fbbf24" stroke-width="2" stroke-dasharray="4 2"/>` +
        `<text x="158" y="57" font-size="8.5" fill="#fbbf24">E₂*</text>` +
        `<line x1="76" y1="132" x2="152" y2="132" stroke="#38bdf8" stroke-width="2.4"/>` +
        `<text x="158" y="135" font-size="8.5" fill="#38bdf8">E₁</text>` +
        `<line x1="110" y1="56" x2="110" y2="124" stroke="#c084fc" stroke-width="2.2"/>` +
        `<polygon points="110,130 106,121 114,121" fill="#c084fc"/>` +
        `<path d="M112 92 Q122 86 132 92 T152 92 T172 92" fill="none" stroke="#c084fc" stroke-width="2.2"/>` +
        `<text x="176" y="88" font-size="9.5" font-weight="700" fill="#c084fc">γ</text>` +
        `<circle cx="38" cy="${lvl}" r="3.5" fill="${m.decayed ? '#38bdf8' : '#fbbf24'}" opacity=".9"/>` +
        `<line x1="14" y1="158" x2="186" y2="158" stroke="currentColor" stroke-opacity=".24" stroke-width="1"/>` +
        `<text x="100" y="174" text-anchor="middle" font-size="10.2" font-weight="600" fill="currentColor">${rx.eq}</text>` +
        `<text x="100" y="190" text-anchor="middle" font-size="9.2" fill="#c084fc">${rx.pShort} → ${rx.dShort} + hν</text>` +
        '</svg>'
      );
    }

    const typeCol = m.decayType === 'alpha' ? '#fbbf24' : rx.sign > 0 ? '#ec4899' : '#38bdf8';
    const typeTag = m.decayType === 'alpha' ? 'α-РАСПАД' : rx.sign > 0 ? 'β⁺-РАСПАД' : 'β⁻-РАСПАД';
    const emitShort = m.decayType === 'alpha' ? '⁴He' : rx.sign > 0 ? 'e⁺' : 'e⁻';
    const dFill = m.decayed ? 'rgba(56,189,248,0.16)' : 'rgba(148,163,184,0.06)';
    const dOpacity = m.decayed ? '1' : '0.42';
    const elemLine = `${rx.pShort} → ${rx.dShort} + ${emitShort}`;

    const b = m.bField;
    const ay = (72 - 12 * b).toFixed(1);
    const by = (72 + 20 * (rx.sign ? -rx.sign * b : b)).toFixed(1);

    return (
      `<svg role="img" aria-label="Схема ядерного распада" viewBox="0 0 200 200" style="display:block;width:100%;height:auto">` +
      `<text x="100" y="18" text-anchor="middle" font-size="10.2" font-weight="700" fill="${typeCol}">${typeTag} · ${m.shiftText.split(' (')[0]}</text>` +
      `<circle cx="40" cy="68" r="24" fill="rgba(239,68,68,0.18)" stroke="#ef4444" stroke-width="2"/>` +
      `<text x="40" y="56" text-anchor="middle" font-size="8" fill="currentColor" opacity=".8">${rx.pA}</text>` +
      `<text x="40" y="71" text-anchor="middle" font-size="14.5" font-weight="700" fill="currentColor">${rx.pSym}</text>` +
      `<text x="40" y="83" text-anchor="middle" font-size="8" fill="#f87171">Z=${rx.pZ}</text>` +
      `<line x1="68" y1="68" x2="90" y2="68" stroke="currentColor" stroke-opacity="${m.decayed ? '.85' : '.38'}" stroke-width="2"${m.decayed ? '' : ' stroke-dasharray="3 3"'}/>` +
      `<polygon points="94,68 87,64 87,72" fill="currentColor" fill-opacity="${m.decayed ? '.85' : '.38'}"/>` +
      `<g opacity="${dOpacity}">` +
      `<circle cx="122" cy="68" r="22" fill="${dFill}" stroke="#38bdf8" stroke-width="2"/>` +
      `<text x="122" y="57" text-anchor="middle" font-size="8" fill="currentColor" opacity=".8">${rx.dA}</text>` +
      `<text x="122" y="71" text-anchor="middle" font-size="13.5" font-weight="700" fill="currentColor">${rx.dSym}</text>` +
      `<text x="122" y="83" text-anchor="middle" font-size="8" fill="#7dd3fc">Z=${rx.dZ}</text>` +
      `<text x="153" y="71" text-anchor="middle" font-size="11" font-weight="700" fill="currentColor">+</text>` +
      `<circle cx="176" cy="68" r="14" fill="none" stroke="${typeCol}" stroke-width="2"/>` +
      `<text x="176" y="72" text-anchor="middle" font-size="10.5" font-weight="700" fill="${typeCol}">${emitShort}</text>` +
      `</g>` +
      `<text x="14" y="114" font-size="8.5" fill="currentColor" opacity=".6">Поле B${Math.abs(b) < 0.05 ? '=0' : b > 0 ? '⊗' : '⊙'}</text>` +
      `<path d="M58 134 Q114 134 176 ${134 + (Number(ay) - 72)}" fill="none" stroke="#fbbf24" stroke-width="${m.decayType === 'alpha' ? '2.4' : '1.1'}" stroke-opacity="${m.decayType === 'alpha' ? '1' : '.28'}"/>` +
      `<text x="184" y="${137 + (Number(ay) - 72)}" font-size="8.5" fill="#fbbf24" opacity="${m.decayType === 'alpha' ? '1' : '.45'}">α</text>` +
      `<line x1="58" y1="134" x2="176" y2="134" stroke="#c084fc" stroke-width="1.1" stroke-opacity=".28" stroke-dasharray="3 2"/>` +
      `<text x="184" y="137" font-size="8.5" fill="#c084fc" opacity=".45">γ</text>` +
      `<path d="M58 134 Q114 134 176 ${134 + (Number(by) - 72)}" fill="none" stroke="${typeCol}" stroke-width="${m.decayType === 'beta' ? '2.4' : '1.1'}" stroke-opacity="${m.decayType === 'beta' ? '1' : '.28'}"/>` +
      `<text x="184" y="${137 + (Number(by) - 72)}" font-size="8.5" fill="${typeCol}" opacity="${m.decayType === 'beta' ? '1' : '.45'}">${rx.sign > 0 ? 'β⁺' : 'β⁻'}</text>` +
      `<line x1="14" y1="158" x2="186" y2="158" stroke="currentColor" stroke-opacity=".24" stroke-width="1"/>` +
      `<text x="100" y="174" text-anchor="middle" font-size="10.2" font-weight="600" fill="currentColor">${rx.eq}</text>` +
      `<text x="100" y="190" text-anchor="middle" font-size="9.2" fill="${typeCol}">${elemLine}</text>` +
      '</svg>'
    );
  },

  build(api, opts = {}) {
    const p = opts.params || { decayType: 'alpha', alphaEx: 'u238', bField: 0.6, shield: 'off' };
    const m = opts.solved || this.evaluateAt(2.15, p);
    const G = opts.groups;
    const {
      THREE,
      V,
      seg,
      dashedSeg,
      dot,
      ring,
      sphere,
      studioBox,
      cylinderShell,
      trail,
      updateTrail,
      arrow,
      instancedSpheres,
      label,
    } = api;

    const isCompare = m.decayType === 'compare';

    // Компактная подставка источника слева на студийной сетке
    ring(G.nuc, 0.44, 0x38bdf8, 0.011, { center: [ORIGIN_X, 0.005, 0], opacity: 0.48 });
    if (isCompare) {
      // Свинцовый коллиматорный контейнер прочно на стойке для 3 пучков
      cylinderShell(G.nuc, 0.055, 0.085, 0.64, [ORIGIN_X - 0.06, 0.32, 0], 0x334155, 1, { metal: true });
      studioBox(G.nuc, 0.44, 0.62, 0.46, [ORIGIN_X - 0.06, BEAM_Y, 0], 0x1e293b, {
        metalness: 0.22,
        roughness: 0.65,
        edgeColor: 0x64748b,
        edgeOpacity: 0.65,
      });
      cylinderShell(G.nuc, 0.085, 0.11, 0.16, [ORIGIN_X + 0.18, BEAM_Y, 0], 0x475569, 1, {
        metal: true,
        normal: V(1, 0, 0),
      });
    } else {
      cylinderShell(G.nuc, 0.045, 0.075, 0.36, [ORIGIN_X, 0.18, 0], 0x334155, 1, { metal: true });
      ring(G.nuc, 0.18, 0x38bdf8, 0.012, { center: [ORIGIN_X, 0.365, 0], opacity: 0.65 });
    }

    // 3D-кластер ядра (скрыт в режиме compare, т.к. там свинцовый коллиматор)
    const nucMesh = instancedSpheres(G.nuc, 60, 0.058, COL_PROTON, {
      perInstanceColor: true,
      roughness: 0.26,
      metalness: 0.1,
    });
    const nucHalo = sphere(G.nuc, V(ORIGIN_X, BEAM_Y, 0), 0.45, 0xfbbf24, 0.24, {
      roughness: 0.15,
      clearcoat: 0.85,
      depthWrite: false,
      role: 'accent',
    });
    const nucGlowRing = ring(G.nuc, 0.44, 0xfbbf24, 0.018, {
      center: [ORIGIN_X, BEAM_Y, 0],
      normal: V(0, 0, 1),
      opacity: 0,
      role: 'accent',
    });

    const parentText = isCompare ? 'Источник (U, C, Ni*)' : `${m.rx.pA}${m.rx.pSym} · ${m.rx.pShort}`;
    const daughterText = isCompare ? 'Источник (α, β⁻, γ)' : `${m.rx.dA}${m.rx.dSym} · ${m.rx.dShort}`;
    const parentLabel = label(parentText, V(ORIGIN_X - 0.06, 1.5, 0), G.nuc, {
      color: '#f87171',
      scale: 0.56,
    });
    const daughterLabel = label(daughterText, V(ORIGIN_X - 0.06, 1.44, 0), G.nuc, {
      color: '#7dd3fc',
      scale: 0.56,
    });
    const wasParentLabel = isCompare
      ? null
      : label(`было: ${m.rx.pA}${m.rx.pSym}`, V(ORIGIN_X - 0.08, 1.76, 0), G.nuc, {
          color: '#cbd5e1',
          scale: 0.42,
        });
    daughterLabel.visible = false;
    if (wasParentLabel) wasParentLabel.visible = false;

    // Излучение α / β / γ (поддерживает как одиночный режим, так и одновременный compare)
    const alphaCluster = instancedSpheres(G.rad, 4, 0.056, 0xfbbf24, {
      perInstanceColor: true,
      roughness: 0.22,
      metalness: 0.12,
    });
    const betaCol = m.decayType === 'beta' && m.rx.sign > 0 ? 0xec4899 : 0x38bdf8;
    const betaDot = dot(G.rad, V(ORIGIN_X, BEAM_Y, 0), betaCol, 0.072, {
      roughness: 0.14,
      clearcoat: 0.9,
      role: 'preserve',
    });
    const neutrinoDot = dot(G.rad, V(ORIGIN_X, BEAM_Y, 0), 0x22c55e, 0.04, {
      opacity: 0.85,
      role: 'preserve',
    });
    const neutrinoLabel = label(m.rx.sign > 0 ? 'νₑ' : 'ν̃ₑ', V(ORIGIN_X, BEAM_Y, 0), G.rad, {
      color: '#6ee7b7',
      scale: 0.4,
    });
    neutrinoLabel.visible = false;

    const gammaWaveTrail = trail(G.rad, 44, 0xc084fc, 0.95);
    const gammaHeadDot = dot(G.rad, V(ORIGIN_X, BEAM_Y, 0), 0xc084fc, 0.052, { role: 'accent' });

    const trailA = trail(G.rad, 96, 0xfbbf24, 0.88);
    const trailB = trail(G.rad, 96, betaCol, 0.88);
    const trailG = trail(G.rad, 96, 0xc084fc, 0.72);
    const velArrow = arrow(G.rad, 0x22c55e, 0.017, 0.046, 0.14);

    const emitBadgeA = label('α (⁴He)', V(0, 0, 0), G.rad, { color: '#fbbf24', scale: 0.52 });
    const emitBadgeB = label(
      m.decayType === 'beta' && m.rx.sign > 0 ? 'β⁺ (e⁺)' : 'β⁻ (e⁻)',
      V(0, 0, 0),
      G.rad,
      { color: m.decayType === 'beta' && m.rx.sign > 0 ? '#ec4899' : '#38bdf8', scale: 0.52 }
    );
    const emitBadgeG = label('γ (фотон)', V(0, 0, 0), G.rad, { color: '#c084fc', scale: 0.5 });
    emitBadgeA.visible = false;
    emitBadgeB.visible = false;
    emitBadgeG.visible = false;

    const impactRingA = ring(G.rad, 0.13, 0xfbbf24, 0.016, {
      center: [DETECTOR_X, BEAM_Y, 0],
      normal: V(1, 0, 0),
      opacity: 0,
      role: 'accent',
    });
    const impactRingB = ring(G.rad, 0.13, betaCol, 0.016, {
      center: [DETECTOR_X, BEAM_Y, 0],
      normal: V(1, 0, 0),
      opacity: 0,
      role: 'accent',
    });
    const impactRingG = ring(G.rad, 0.13, 0xc084fc, 0.016, {
      center: [DETECTOR_X, BEAM_Y, 0],
      normal: V(1, 0, 0),
      opacity: 0,
      role: 'accent',
    });

    // Правый люминесцентный экран-детектор со шкалой высоты
    studioBox(G.rad, 0.045, 1.56, 1.15, [DETECTOR_X + 0.025, 0.85, 0], 0x162235, {
      metalness: 0.08,
      roughness: 0.72,
      envMapIntensity: 0.2,
      opacity: 0.85,
      edgeColor: 0x38bdf8,
      edgeOpacity: 0.45,
      role: 'apparatus',
    });
    seg(G.rad, V(DETECTOR_X - 0.002, BEAM_Y, -0.5), V(DETECTOR_X - 0.002, BEAM_Y, 0.5), 0.007, 0x64748b);
    label('Детектор', V(DETECTOR_X, 0.02, 0.72), G.rad, { color: '#7dd3fc', scale: 0.46 });

    // Полюса электромагнита N / S и рамка зоны магнитного поля B (x ∈ [-0.55, 0.65])
    if (Math.abs(m.bField) >= 0.05) {
      const mX = 0.05;
      const mW = 1.18;
      const mH = 1.24;
      const zBack = -0.58;
      const zFront = 0.44;
      // Задний полюс магнита (тонкая рамка + заливка, чтобы не заслонять летящие частицы)
      studioBox(G.field, mW, mH, 0.05, [mX, BEAM_Y + 0.04, zBack], m.bField > 0 ? 0x991b1b : 0x1e3a8a, {
        metalness: 0.15,
        roughness: 0.68,
        envMapIntensity: 0.18,
        opacity: 0.42,
        edgeColor: m.bField > 0 ? 0xf87171 : 0x38bdf8,
        edgeOpacity: 0.65,
        role: 'fill',
      });
      // Лёгкий каркас переднего полюса пунктиром для объёма зоны поля B
      const yMin = BEAM_Y + 0.04 - mH * 0.5;
      const yMax = BEAM_Y + 0.04 + mH * 0.5;
      const xL = mX - mW * 0.5;
      const xR = mX + mW * 0.5;
      dashedSeg(G.field, V(xL, yMin, zFront), V(xR, yMin, zFront), 0.007, 0x38bdf8);
      dashedSeg(G.field, V(xL, yMax, zFront), V(xR, yMax, zFront), 0.007, 0x38bdf8);
      dashedSeg(G.field, V(xL, yMin, zFront), V(xL, yMax, zFront), 0.007, 0x38bdf8);
      dashedSeg(G.field, V(xR, yMin, zFront), V(xR, yMax, zFront), 0.007, 0x38bdf8);

      [-0.35, 0.05, 0.45].forEach((bx) => {
        ring(G.field, 0.075, 0x38bdf8, 0.007, { center: [bx, 1.32, zBack + 0.04], normal: V(0, 0, 1), opacity: 0.72 });
        if (m.bField > 0) {
          seg(G.field, V(bx - 0.045, 1.32 - 0.045, zBack + 0.04), V(bx + 0.045, 1.32 + 0.045, zBack + 0.04), 0.006, 0x7dd3fc);
          seg(G.field, V(bx - 0.045, 1.32 + 0.045, zBack + 0.04), V(bx + 0.045, 1.32 - 0.045, zBack + 0.04), 0.006, 0x7dd3fc);
        } else {
          dot(G.field, V(bx, 1.32, zBack + 0.04), 0x7dd3fc, 0.022, { role: 'accent' });
        }
      });

      label(m.bField > 0 ? 'Полюс N · B⊗' : 'Полюс S · B⊙', V(mX, 1.62, zBack), G.field, {
        color: '#7dd3fc',
        scale: 0.46,
      });
    }

    // Эталонные пунктирные пути в слое поля для понимания угла отклонения до вылета
    if (!isCompare) {
      const baseBeam = m.decayType === 'beta' ? m.beamB : m.decayType === 'gamma' ? m.beamG : m.beamA;
      const guide = baseBeam.pts.map(([x, y, z]) => V(x, y, z));
      const guideTrail = trail(G.field, guide.length, 0x64748b, 0.35);
      updateTrail(guideTrail, guide);
    }

    // Поглощающие преграды (одиночная либо 3-ступенчатый каскад Бумага -> Al -> Свинец)
    if (m.shield === 'cascade') {
      CASCADE_PLATES.forEach((plate) => {
        studioBox(G.shield, plate.thick, 1.48, 1.12, [plate.x, 0.78, 0], plate.col, {
          metalness: plate.key === 'alu' ? 0.62 : 0.08,
          roughness: plate.key === 'paper' ? 0.85 : plate.key === 'alu' ? 0.35 : 0.78,
          envMapIntensity: plate.key === 'alu' ? 0.6 : 0.16,
          opacity: plate.op,
          edgeColor: 0x94a3b8,
          edgeOpacity: 0.55,
          role: plate.key === 'paper' ? 'fill' : 'apparatus',
        });
        label(plate.label, V(plate.x, 1.68, 0), G.shield, {
          color: '#e2e8f0',
          scale: 0.44,
        });
      });
    } else {
      const cfg = getSingleShieldCfg(m.shield);
      if (cfg) {
        studioBox(G.shield, cfg.thick, 1.48, 1.15, [cfg.x + cfg.thick * 0.5, 0.78, 0], cfg.col, {
          metalness: m.shield === 'alu' ? 0.62 : 0.08,
          roughness: m.shield === 'paper' ? 0.85 : m.shield === 'alu' ? 0.35 : 0.78,
          envMapIntensity: m.shield === 'alu' ? 0.6 : 0.16,
          opacity: cfg.op,
          edgeColor: 0x94a3b8,
          edgeOpacity: 0.55,
          role: m.shield === 'paper' ? 'fill' : 'apparatus',
        });
        label(cfg.label, V(cfg.x + cfg.thick * 0.5, 1.68, 0), G.shield, {
          color: '#e2e8f0',
          scale: 0.48,
        });
      }
    }

    return {
      target: [0.22, 0.85, 0],
      fitRadius: 2.58,
      groundY: 0,
      handles: {
        isCompare,
        nucMesh,
        nucHalo,
        nucGlowRing,
        parentLabel,
        daughterLabel,
        wasParentLabel,
        alphaCluster,
        betaDot,
        neutrinoDot,
        neutrinoLabel,
        gammaWaveTrail,
        gammaHeadDot,
        trailA,
        trailB,
        trailG,
        velArrow,
        emitBadgeA,
        emitBadgeB,
        emitBadgeG,
        impactRingA,
        impactRingB,
        impactRingG,
      },
    };
  },

  updateScene(api, { solved: m, handles }) {
    if (!handles || !m) return;
    const { V, updateInstanced, updateTrail, updateArrow } = api;
    const {
      isCompare,
      nucMesh,
      nucHalo,
      nucGlowRing,
      parentLabel,
      daughterLabel,
      wasParentLabel,
      alphaCluster,
      betaDot,
      neutrinoDot,
      neutrinoLabel,
      gammaWaveTrail,
      gammaHeadDot,
      trailA,
      trailB,
      trailG,
      velArrow,
      emitBadgeA,
      emitBadgeB,
      emitBadgeG,
      impactRingA,
      impactRingB,
      impactRingG,
    } = handles;

    const rx = m.rx;
    const cx = ORIGIN_X + m.recoil;
    const cy = BEAM_Y;

    if (isCompare) {
      updateInstanced(nucMesh, 0, () => ({ x: 0, y: 0, z: 0 }));
      nucHalo.visible = false;
      nucGlowRing.visible = false;
      parentLabel.visible = !m.decayed;
      daughterLabel.visible = m.decayed;
      parentLabel.position.set(cx - 0.05, 1.48, 0);
      daughterLabel.position.set(cx - 0.05, 1.48, 0);
    } else {
      const nVisTotal = Math.max(12, Math.min(60, Math.round(10 + Math.sqrt(rx.pA) * 3.1)));
      const nucRad = 0.21 + 0.17 * Math.cbrt(rx.pA / 238);
      const activeTotal = m.decayed && m.decayType === 'alpha' ? Math.max(8, nVisTotal - 4) : nVisTotal;
      const curZ = m.decayed ? rx.dZ : rx.pZ;
      const curA = m.decayed ? rx.dA : rx.pA;
      const pRatio = curZ / Math.max(1, curA);
      const nProtonsVis = Math.max(1, Math.min(activeTotal - 1, Math.round(activeTotal * pRatio)));

      updateInstanced(nucMesh, activeTotal, (i) => {
        const seedIdx = m.decayed && m.decayType === 'alpha' ? i + 4 : i;
        const pt = NUCLEON_SEEDS[seedIdx % NUCLEON_SEEDS.length];
        let col = ((i * 37) % activeTotal) < nProtonsVis ? COL_PROTON : COL_NEUTRON;
        if (!m.decayed && m.decayType === 'alpha' && i < 4) {
          col = i < 2 ? COL_PROTON_HI : COL_NEUTRON_HI;
        } else if (!m.decayed && m.decayType === 'beta' && i === 0) {
          const pulse = Math.sin(m.t * 10) > 0;
          col = pulse ? (rx.sign > 0 ? 0xec4899 : 0x10b981) : rx.sign > 0 ? COL_PROTON : COL_NEUTRON;
        } else if (m.decayed && m.decayType === 'beta' && i === 0) {
          col = rx.sign > 0 ? COL_NEUTRON_HI : COL_PROTON_HI;
        }
        const nScale = Math.max(0.78, 1.12 - nVisTotal * 0.005);
        return {
          x: cx + pt[0] * nucRad,
          y: cy + pt[1] * nucRad,
          z: pt[2] * nucRad,
          s: nScale,
          color: col,
        };
      });

      nucHalo.visible = m.decayType === 'gamma' && !m.decayed;
      if (nucHalo.visible) {
        const sc = 0.86 + 0.09 * Math.sin(m.t * 6.5);
        nucHalo.scale.set(sc, sc, sc);
        nucHalo.position.set(cx, cy, 0);
      }

      if (m.decayed && m.tau <= 0.55) {
        const kFlash = m.tau / 0.55;
        nucGlowRing.visible = true;
        nucGlowRing.position.set(cx, cy, 0);
        const rSc = 0.72 + kFlash * 1.4;
        nucGlowRing.scale.set(rSc, rSc, rSc);
        nucGlowRing.material.opacity = 0.82 * (1 - kFlash);
      } else {
        nucGlowRing.visible = false;
      }

      parentLabel.visible = !m.decayed;
      daughterLabel.visible = m.decayed;
      if (wasParentLabel) {
        wasParentLabel.visible = m.decayed;
        wasParentLabel.position.set(cx - 0.08, cy + nucRad + 0.62, 0);
      }
      parentLabel.position.set(cx - 0.08, cy + nucRad + 0.34, 0);
      daughterLabel.position.set(cx - 0.08, cy + nucRad + 0.34, 0);
    }

    const showAlpha = m.decayed && (isCompare || m.decayType === 'alpha');
    const showBeta = m.decayed && (isCompare || m.decayType === 'beta');
    const showGamma = m.decayed && (isCompare || m.decayType === 'gamma');

    // α-кластер (4 нуклона: 2 красных p⁺ + 2 кобальтовых n⁰)
    if (showAlpha) {
      const [ax, ay, az] = m.beamA.pos;
      const tetra = [
        [0.038, 0.038, 0.038, COL_PROTON_HI],
        [-0.038, -0.038, 0.038, COL_PROTON_HI],
        [-0.038, 0.038, -0.038, COL_NEUTRON_HI],
        [0.038, -0.038, -0.038, COL_NEUTRON_HI],
      ];
      const ang = m.tau * 3.8;
      const ca = Math.cos(ang);
      const sa = Math.sin(ang);
      updateInstanced(alphaCluster, 4, (i) => {
        const [tx, ty, tz, col] = tetra[i];
        return {
          x: ax + tx * ca - tz * sa,
          y: ay + ty,
          z: az + tx * sa + tz * ca,
          s: 1.0,
          color: col,
        };
      });
      const aPts = m.beamA.pts.filter((pt) => pt[0] <= ax + 1e-4).map((pt) => V(pt[0], pt[1], pt[2]));
      aPts.push(V(ax, ay, az));
      updateTrail(trailA, aPts);
      emitBadgeA.visible = true;
      emitBadgeA.position.set(Math.min(DETECTOR_X - 0.14, ax), Math.min(1.52, ay + 0.24), 0);
    } else {
      updateInstanced(alphaCluster, 0, () => ({ x: 0, y: 0, z: 0 }));
      updateTrail(trailA, []);
      emitBadgeA.visible = false;
    }

    // β-частица и подписанное антинейтрино/нейтрино
    betaDot.visible = showBeta;
    if (showBeta) {
      const [bx, by, bz] = m.beamB.pos;
      betaDot.position.set(bx, by, bz);
      const bPts = m.beamB.pts.filter((pt) => pt[0] <= bx + 1e-4).map((pt) => V(pt[0], pt[1], pt[2]));
      bPts.push(V(bx, by, bz));
      updateTrail(trailB, bPts);
      emitBadgeB.visible = true;
      const bOffY = by < BEAM_Y - 0.1 ? -0.22 : 0.22;
      emitBadgeB.position.set(Math.min(DETECTOR_X - 0.14, bx), Math.max(0.2, Math.min(1.5, by + bOffY)), 0);

      if (!isCompare) {
        const nx = ORIGIN_X + m.tau * 2.15;
        const ny = BEAM_Y + (m.rx.sign > 0 ? -0.22 : 0.22) * m.tau;
        const nz = 0.14 * m.tau;
        const nVis = nx <= DETECTOR_X - 0.1;
        neutrinoDot.visible = nVis;
        neutrinoLabel.visible = nVis;
        if (nVis) {
          neutrinoDot.position.set(nx, ny, nz);
          neutrinoLabel.position.set(nx, ny + 0.18, nz);
        }
      } else {
        neutrinoDot.visible = false;
        neutrinoLabel.visible = false;
      }
    } else {
      updateTrail(trailB, []);
      emitBadgeB.visible = false;
      neutrinoDot.visible = false;
      neutrinoLabel.visible = false;
    }

    // γ-волновой пакет
    gammaHeadDot.visible = showGamma;
    if (showGamma) {
      const [gx, gy, gz] = m.beamG.pos;
      gammaHeadDot.position.set(gx, gy, gz);
      const waveLen = Math.min(0.7, Math.max(0.2, m.tau * 1.9));
      const wPts = [];
      const N = 40;
      for (let i = 0; i <= N; i++) {
        const s = i / N;
        const wx = Math.max(ORIGIN_X, gx - (1 - s) * waveLen);
        const env = Math.sin(s * Math.PI);
        const wy = gy + 0.085 * env * Math.sin(s * 24 - m.tau * 18);
        wPts.push(V(wx, wy, 0));
      }
      updateTrail(gammaWaveTrail, wPts);
      const gPts = m.beamG.pts.filter((pt) => pt[0] <= gx + 1e-4).map((pt) => V(pt[0], pt[1], pt[2]));
      gPts.push(V(gx, gy, gz));
      updateTrail(trailG, gPts);
      emitBadgeG.visible = true;
      emitBadgeG.position.set(Math.min(DETECTOR_X - 0.16, gx), gy + (isCompare ? 0.02 : 0.22), isCompare ? 0.18 : 0);
    } else {
      updateTrail(gammaWaveTrail, []);
      updateTrail(trailG, []);
      emitBadgeG.visible = false;
    }

    // Стрелка скорости активной частицы в одиночном режиме
    if (!isCompare && m.decayed && !m.mainBeam.stoppedNow) {
      const [vx, vy, vz] = m.mainBeam.vel;
      const vn = Math.hypot(vx, vy, vz) || 1;
      updateArrow(velArrow, V(...m.mainBeam.pos), V((vx / vn) * 0.4, (vy / vn) * 0.4, 0), 0.04);
    } else {
      updateArrow(velArrow, V(0, 0, 0), V(0, 0, 0), 1);
    }

    // Светящиеся кольца удара на преградах / люминесцентном экране-детекторе
    const updateHit = (ringObj, beam, active) => {
      if (active && beam.stoppedNow && beam.stopPt) {
        const dtHit = Math.max(0, m.tau - (beam.stopTau || 0));
        const pulse = 0.8 + 0.25 * Math.sin(dtHit * 6);
        ringObj.visible = true;
        ringObj.position.set(beam.stopPt[0] - 0.01, beam.stopPt[1], 0);
        ringObj.scale.set(pulse, pulse, pulse);
        ringObj.material.opacity = beam.isDetectorStop ? 0.92 : 0.78;
      } else {
        ringObj.visible = false;
      }
    };
    updateHit(impactRingA, m.beamA, showAlpha);
    updateHit(impactRingB, m.beamB, showBeta);
    updateHit(impactRingG, m.beamG, showGamma);
  },
};
