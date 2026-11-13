/** Лёгкий метаиндекс всех сцен каталога: математика (построения) и физика (симуляции). */

export const SUBJECTS = [
  { id: 'math', label: 'Математика' },
  { id: 'physics', label: 'Физика' },
];

export const CATEGORIES = [
  { id: 'combinations', label: 'Комбинации тел', subject: 'math' },
  { id: 'sections', label: 'Сечения многогранников', subject: 'math' },
  { id: 'mechanics', label: 'Механика', subject: 'physics' },
  { id: 'thermo', label: 'МКТ и тепло', subject: 'physics' },
  { id: 'electromagnetism', label: 'Электромагнетизм', subject: 'physics' },
  { id: 'waves', label: 'Колебания и волны', subject: 'physics' },
];

export const SCENE_INDEX = [
  {
    id: 'pyramid-inscribed-sphere',
    kind: 'geometry',
    subject: 'math',
    category: 'combinations',
    title: 'Правильная пирамида и вписанный шар',
    shortTitle: 'Пирамида · вписанный шар',
    subtitle: 'Стереометрия · комбинации тел',
    description: 'Радиус вписанного шара r = ρh / (ρ + l), точки касания на апофемах и сечение SOM.',
    tags: ['пирамида', 'вписанный шар', 'апофема', 'тетраэдр', 'егэ'],
    module: './pyramid-inscribed-sphere.js',
    previewSvg: `<svg viewBox="0 0 100 100" width="96" height="96" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round">
      <polygon points="50,12 18,74 54,84 84,68" fill="rgba(56,189,248,0.12)" stroke="#94a3b8"/>
      <line x1="50" y1="12" x2="54" y2="84" stroke="currentColor"/>
      <circle cx="51" cy="56" r="18" stroke="#38bdf8" fill="rgba(56,189,248,0.20)"/>
      <ellipse cx="51" cy="56" rx="18" ry="5.5" stroke="#7dd3fc" stroke-width="1.3" opacity="0.65"/>
      <line x1="50" y1="12" x2="51" y2="74" stroke="#f87171" stroke-dasharray="3 2"/>
      <circle cx="51" cy="56" r="2.6" fill="#fbbf24" stroke="none"/>
    </svg>`,
  },
  {
    id: 'pyramid-circumscribed-sphere',
    kind: 'geometry',
    subject: 'math',
    category: 'combinations',
    title: 'Правильная пирамида и описанный шар',
    shortTitle: 'Пирамида · описанный шар',
    subtitle: 'Стереометрия · комбинации тел',
    description: 'Центр шара Q на оси высоты (внутри пирамиды, в основании O или под ним) и радиус Rш = (h² + R²) / (2h).',
    tags: ['пирамида', 'описанный шар', 'радиус сферы', 'тетраэдр', 'егэ'],
    module: './pyramid-circumscribed-sphere.js',
    previewSvg: `<svg viewBox="0 0 100 100" width="96" height="96" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round">
      <circle cx="50" cy="52" r="36" stroke="#38bdf8" fill="rgba(56,189,248,0.10)"/>
      <ellipse cx="50" cy="52" rx="36" ry="10" stroke="#7dd3fc" stroke-width="1.2" opacity="0.45"/>
      <polygon points="50,16 18,68 54,84 82,66" fill="rgba(148,163,184,0.16)" stroke="currentColor"/>
      <line x1="50" y1="16" x2="54" y2="84"/>
      <line x1="50" y1="16" x2="50" y2="70" stroke="#f87171" stroke-dasharray="3 2"/>
      <circle cx="50" cy="50" r="3" fill="#34d399" stroke="none"/>
    </svg>`,
  },
  {
    id: 'cone-inscribed-sphere',
    kind: 'geometry',
    subject: 'math',
    category: 'combinations',
    title: 'Конус и вписанный шар',
    shortTitle: 'Конус · вписанный шар',
    subtitle: 'Стереометрия · тела вращения',
    description: 'Касание конуса по окружности, осевое сечение SAB и радиус шара r = Rh / (R + l).',
    tags: ['конус', 'шар', 'образующая', 'тела вращения', 'егэ'],
    module: './cone-inscribed-sphere.js',
    previewSvg: `<svg viewBox="0 0 100 100" width="96" height="96" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round">
      <polygon points="50,14 18,76 82,76" fill="rgba(148,163,184,0.14)" stroke="currentColor"/>
      <ellipse cx="50" cy="76" rx="32" ry="9" stroke="#94a3b8"/>
      <circle cx="50" cy="56" r="20" stroke="#38bdf8" fill="rgba(56,189,248,0.22)"/>
      <ellipse cx="50" cy="48" rx="17" ry="4.5" stroke="#fbbf24" stroke-width="1.5"/>
      <line x1="50" y1="14" x2="50" y2="76" stroke="#f87171" stroke-dasharray="3 2"/>
    </svg>`,
  },
  {
    id: 'cube-section',
    kind: 'geometry',
    subject: 'math',
    category: 'sections',
    title: 'Сечение куба по трём точкам',
    shortTitle: 'Сечение куба',
    subtitle: 'Стереометрия · метод следов и параллельных прямых',
    description: 'Живое построение сечения плоскостью (PQR): от 3 точек к 3–6-угольнику и истинной форме в 2D.',
    tags: ['куб', 'сечение', 'метод следов', 'параллельные грани', 'егэ'],
    module: './cube-section.js',
    previewSvg: `<svg viewBox="0 0 100 100" width="96" height="96" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round">
      <rect x="20" y="30" width="46" height="46" opacity="0.65"/>
      <polygon points="20,30 36,16 82,16 66,30" opacity="0.5"/>
      <polyline points="82,16 82,62 66,76" opacity="0.65"/>
      <polygon points="20,53 43,76 74,58 82,36 59,16 28,33" stroke="#fbbf24" fill="rgba(251,191,36,0.24)"/>
      <circle cx="20" cy="53" r="2.8" fill="#fbbf24" stroke="none"/>
      <circle cx="74" cy="58" r="2.8" fill="#fbbf24" stroke="none"/>
      <circle cx="59" cy="16" r="2.8" fill="#fbbf24" stroke="none"/>
    </svg>`,
  },
  {
    id: 'projectile-motion',
    kind: 'simulation',
    subject: 'physics',
    category: 'mechanics',
    title: 'Бросок тела под углом к горизонту',
    shortTitle: 'Бросок под углом',
    subtitle: 'Физика · баллистика',
    description: 'Траектория с учётом сопротивления воздуха, векторы v, vx, vy, g и график энергий в реальном времени.',
    tags: ['баллистика', 'парабола', 'скорость', 'ускорение', 'физика', 'егэ'],
    module: './physics/projectile-motion.js',
    previewSvg: `<svg viewBox="0 0 100 100" width="96" height="96" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
      <line x1="12" y1="80" x2="88" y2="80" stroke="#64748b"/>
      <path d="M16 74 Q50 14 84 80" stroke="#38bdf8" stroke-dasharray="4 3"/>
      <circle cx="44" cy="39" r="5" fill="#fbbf24" stroke="none"/>
      <line x1="44" y1="39" x2="64" y2="29" stroke="#34d399" stroke-width="2.4"/>
      <line x1="44" y1="39" x2="44" y2="57" stroke="#f87171" stroke-width="2.2"/>
    </svg>`,
  },
  {
    id: 'impulse-explosion',
    kind: 'simulation',
    subject: 'physics',
    category: 'mechanics',
    title: 'Разрыв снаряда и закон импульса',
    shortTitle: 'Разрыв · закон импульса',
    subtitle: 'Физика · законы сохранения',
    description: 'Разлёт 2 или 3 осколков в воздухе: вспышка разрыва, движение центра масс и сумма векторов импульса.',
    tags: ['взрыв', 'разрыв', 'импульс', 'осколки', 'центр масс', 'физика'],
    module: './physics/impulse-explosion.js',
    previewSvg: `<svg viewBox="0 0 100 100" width="96" height="96" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
      <path d="M16 78 Q38 40 50 34" stroke="#94a3b8" stroke-dasharray="3 3"/>
      <circle cx="50" cy="34" r="10" stroke="#fbbf24" stroke-width="1.2" opacity="0.45"/>
      <circle cx="50" cy="34" r="4.5" fill="#fde047" stroke="#f87171"/>
      <path d="M50 34 Q68 22 86 70" stroke="#38bdf8"/>
      <path d="M50 34 Q54 52 56 80" stroke="#34d399"/>
      <path d="M50 34 Q38 30 22 72" stroke="#f87171"/>
    </svg>`,
  },
  {
    id: 'gas-burner',
    kind: 'simulation',
    subject: 'physics',
    category: 'thermo',
    title: 'Идеальный газ и нагрев на горелке',
    shortTitle: 'Газ · нагрев и поршень',
    subtitle: 'Физика · МКТ и термодинамика',
    description: 'Движение молекул в сосуде под поршнем, пламя горелки, рост температуры и давления P·V/T.',
    tags: ['газ', 'молекулы', 'огонь', 'температура', 'давление', 'поршень', 'термодинамика'],
    module: './physics/gas-burner.js',
    previewSvg: `<svg viewBox="0 0 100 100" width="96" height="96" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round">
      <rect x="28" y="20" width="44" height="50" rx="3" fill="rgba(56,189,248,0.12)" stroke="#94a3b8"/>
      <line x1="28" y1="36" x2="72" y2="36" stroke="#cbd5e1" stroke-width="3.5"/>
      <circle cx="42" cy="52" r="3" fill="#38bdf8" stroke="none"/>
      <circle cx="58" cy="48" r="3" fill="#f87171" stroke="none"/>
      <circle cx="50" cy="61" r="3" fill="#fbbf24" stroke="none"/>
      <path d="M40 84 Q45 71 50 82 Q55 69 60 84 Z" fill="#fbbf24" stroke="#f87171"/>
    </svg>`,
  },
  {
    id: 'water-waves',
    kind: 'simulation',
    subject: 'physics',
    category: 'waves',
    title: 'Волны на воде и интерференция',
    shortTitle: 'Волны и интерференция',
    subtitle: 'Физика · колебания и волны',
    description: 'Распространение круговых волн, интерференция двух когерентных источников, стоячая волна и движение поплавка.',
    tags: ['вода', 'волны', 'интерференция', 'стоячая волна', 'частота', 'физика'],
    module: './physics/water-waves.js',
    previewSvg: `<svg viewBox="0 0 100 100" width="96" height="96" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
      <rect x="12" y="28" width="76" height="52" rx="4" stroke="#64748b" stroke-width="1.5" opacity="0.55"/>
      <path d="M12 52 Q24 34 36 52 T60 52 T88 52" stroke="#38bdf8" stroke-width="2.5"/>
      <path d="M12 64 Q24 52 36 64 T60 64 T88 64" stroke="#7dd3fc" stroke-width="1.6" opacity="0.65"/>
      <circle cx="48" cy="43" r="4.5" fill="#fbbf24" stroke="none"/>
    </svg>`,
  },
  {
    id: 'pendulum-oscillations',
    kind: 'simulation',
    subject: 'physics',
    category: 'mechanics',
    title: 'Колебания маятников и фазовый портрет',
    shortTitle: 'Колебания маятника',
    subtitle: 'Физика · гармонические колебания',
    description: 'Нитяной и пружинный маятники с затуханием, векторы скорости/силы, энергии Ek/Ep и фазовый портрет (x, v).',
    tags: ['маятник', 'пружина', 'колебания', 'период', 'энергия', 'фазовый портрет', 'физика'],
    module: './physics/pendulum-oscillations.js',
    previewSvg: `<svg viewBox="0 0 100 100" width="96" height="96" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
      <line x1="25" y1="16" x2="75" y2="16" stroke="#94a3b8"/>
      <line x1="50" y1="16" x2="50" y2="82" stroke="#64748b" stroke-dasharray="3 3" opacity="0.55"/>
      <line x1="50" y1="16" x2="70" y2="66" stroke="currentColor"/>
      <circle cx="70" cy="66" r="7.5" fill="#fbbf24" stroke="none"/>
      <path d="M30 66 A38 38 0 0 0 70 66" stroke="#38bdf8" stroke-dasharray="3 2"/>
    </svg>`,
  },
  {
    id: 'salt-water-mhd', kind: 'simulation', subject: 'physics', category: 'electromagnetism',
    title: 'Солёная вода в магнитном поле', shortTitle: 'Вращение солёной воды',
    subtitle: 'Физика · ток, магнитное поле и сила Лоренца',
    description: 'Блюдце, гвоздь и кольцо: переключение полярности, векторы тока, поля и силы, вращение с инерцией.',
    tags: ['магнит', 'соль', 'вода', 'ток', 'лоренц', 'ампер', 'электромагнетизм'],
    module: './physics/salt-water-mhd.js',
    previewSvg: `<svg viewBox="0 0 100 100" width="96" height="96" fill="none" stroke="currentColor" stroke-width="2">
      <ellipse cx="46" cy="53" rx="32" ry="20" fill="#22d3ee" fill-opacity=".15" stroke="#94a3b8"/>
      <ellipse cx="46" cy="77" rx="23" ry="9" fill="#ef4444" fill-opacity=".5" stroke="#f87171"/>
      <path d="M46 34V54" stroke="#cbd5e1" stroke-width="4"/><path d="M49 52H70L65 48M70 52L65 56" stroke="#fbbf24"/>
      <path d="M25 50V24L21 30M25 24L29 30" stroke="#38bdf8"/><path d="M71 53L66 66L63 60M66 66L73 63" stroke="#fb7185"/>
    </svg>`,
  },
];

export const DEFAULT_SCENE_ID = SCENE_INDEX[0].id;
export const CATALOG_BY_ID = new Map(SCENE_INDEX.map((m) => [m.id, m]));
