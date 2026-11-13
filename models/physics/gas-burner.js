/** Идеальный газ в цилиндре с горелкой (нагрев «огнём») и подвижным поршнем. */

const CYL_R = 1.15;
const H_MAX = 2.55;
const MOL_R = 0.055;
const FLAME_COUNT = 56;

function speedToColor(spd) {
  if (spd < 1.8) return 0x38bdf8; // прохладные
  if (spd < 3.0) return 0xf59e0b; // тёплые
  return 0xef4444; // быстрые горячие
}

function randomDir(rng) {
  const u = rng() * 2 - 1;
  const phi = rng() * Math.PI * 2;
  const s = Math.sqrt(Math.max(0, 1 - u * u));
  return [s * Math.cos(phi), u, s * Math.sin(phi)];
}

export default {
  id: 'gas-burner',
  kind: 'simulation',
  subject: 'physics',
  category: 'thermo',
  title: 'Идеальный газ и нагрев на горелке',
  shortTitle: 'Газ · нагрев и поршень',
  subtitle: 'Физика · МКТ и термодинамика',
  description: 'Движение молекул в сосуде под поршнем, пламя горелки, рост температуры и давления P·V/T.',
  tags: ['газ', 'молекулы', 'огонь', 'температура', 'давление', 'поршень', 'термодинамика'],
  previewSvg: `<svg viewBox="0 0 100 100" width="96" height="96" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round">
    <rect x="28" y="20" width="44" height="50" rx="3" fill="rgba(56,189,248,0.12)" stroke="#94a3b8"/>
    <line x1="28" y1="36" x2="72" y2="36" stroke="#cbd5e1" stroke-width="3.5"/>
    <circle cx="42" cy="52" r="3" fill="#38bdf8" stroke="none"/>
    <circle cx="58" cy="48" r="3" fill="#f87171" stroke="none"/>
    <circle cx="50" cy="61" r="3" fill="#fbbf24" stroke="none"/>
    <path d="M40 84 Q45 71 50 82 Q55 69 60 84 Z" fill="#fbbf24" stroke="#f87171"/>
  </svg>`,

  params: [
    { key: 'N', label: 'Молекул N', type: 'range', min: 20, max: 120, step: 5, default: 60, format: (v) => String(Math.round(v)) },
    { key: 'heat', label: 'Нагрев (огонь)', type: 'range', min: 0, max: 100, step: 5, default: 50, format: (v) => `${Math.round(v)}%` },
    { key: 'piston', label: 'Объём V', type: 'range', min: 0.4, max: 1.0, step: 0.05, default: 0.75, format: (v) => `${Math.round(v * 100)}%` },
  ],
  presets: [
    { id: 'isochor-heat', label: 'Сильный нагрев (изохорный)', values: { N: 60, heat: 95, piston: 0.65 } },
    { id: 'cool-compress', label: 'Охлаждение и сжатие', values: { N: 60, heat: 0, piston: 0.45 } },
    { id: 'room', label: 'Комнатный режим', values: { N: 60, heat: 20, piston: 0.85 } },
  ],
  summarizeParams: (p) => `N=${Math.round(p.N)}, Q=${Math.round(p.heat)}%`,

  playback: { duration: null, loop: true, canScrub: false, defaultSpeed: 1, dtFixed: 1 / 120 },

  layers: [
    { key: 'vessel', color: '#9aa0aa', label: 'Сосуд и подвижный поршень', step: 0 },
    { key: 'flame', color: '#f97316', label: 'Горелка и пламя', step: 0 },
    { key: 'mols', color: '#38bdf8', label: 'Молекулы газа (синие → красные)', step: 0 },
    { key: 'x', color: '#eab308', label: 'Распределение скоростей и P-V-T', step: 0 },
  ],

  calcAriaLabel: 'Термодинамические параметры газа',
  diagramAriaLabel: 'Гистограмма распределения скоростей молекул',
  diagramLayerKey: 'x',

  cameraDefaults: {
    position: [4.3, 1.72, 4.7],
    target: [0, 0.78, 0],
    fitRadius: 2.55,
  },

  initState(p = {}, rng) {
    const N = Math.max(1, Math.round(Number(p?.N ?? 60)));
    const heat = Number(p?.heat ?? 50);
    const piston = Math.max(0.15, Number(p?.piston ?? 0.75));
    const hp = H_MAX * piston;
    const T0 = 280 + 5.5 * heat;
    const vMean = Math.sqrt(T0 / 113.3);
    const pos = [];
    const vel = [];
    const rMax = CYL_R - MOL_R - 0.02;
    for (let i = 0; i < N; i++) {
      const ang = rng() * Math.PI * 2;
      const rad = Math.sqrt(rng()) * rMax;
      pos.push(rad * Math.cos(ang), MOL_R + rng() * Math.max(0.2, hp - 2 * MOL_R), rad * Math.sin(ang));
      const d = randomDir(rng);
      const sp = vMean * (0.7 + 0.6 * rng());
      vel.push(d[0] * sp, d[1] * sp, d[2] * sp);
    }
    return { n: N, pistonH: hp, targetT: T0, pressEma: (N * T0) / (piston * 1400), pos, vel };
  },

  onParamsChange(state, p) {
    if (state.n !== p.N) return false; // Переинициализируем при смене числа молекул
    const newH = H_MAX * p.piston;
    const prevH = state.pistonH;
    state.pistonH = newH;
    // При сжатии поршнем молекулы ниже границы поднимаются/ускоряются
    for (let i = 0; i < state.n; i++) {
      if (state.pos[i * 3 + 1] > newH - MOL_R) {
        state.pos[i * 3 + 1] = newH - MOL_R;
        if (newH < prevH) state.vel[i * 3 + 1] = -Math.abs(state.vel[i * 3 + 1]) - 0.3;
      }
    }
    return true;
  },

  stepState(state, dt, p, rng) {
    const rMax = CYL_R - MOL_R;
    const hp = H_MAX * p.piston;
    state.pistonH = hp;
    const targetT = 270 + 6.5 * p.heat;
    const targetV2 = targetT / 110;
    const relax = 1 - Math.exp(-dt * (0.45 + 0.012 * p.heat));
    let impulseSum = 0;

    for (let i = 0; i < state.n; i++) {
      const idx = i * 3;
      state.pos[idx] += state.vel[idx] * dt;
      state.pos[idx + 1] += state.vel[idx + 1] * dt;
      state.pos[idx + 2] += state.vel[idx + 2] * dt;

      // Отражение от дна (подвод тепла от горелки) и поршня
      if (state.pos[idx + 1] < MOL_R) {
        state.pos[idx + 1] = MOL_R;
        state.vel[idx + 1] = Math.max(0.22, Math.abs(state.vel[idx + 1]));
        impulseSum += 2 * state.vel[idx + 1];
        const v2 = state.vel[idx] ** 2 + state.vel[idx + 1] ** 2 + state.vel[idx + 2] ** 2;
        const nextV2 = v2 + (targetV2 * (0.65 + 0.7 * rng()) - v2) * Math.min(0.6, relax * 6);
        const factor = Math.sqrt(Math.max(0.1, nextV2) / Math.max(0.01, v2));
        state.vel[idx] *= factor;
        state.vel[idx + 1] *= factor;
        state.vel[idx + 2] *= factor;
      } else if (state.pos[idx + 1] > hp - MOL_R) {
        state.pos[idx + 1] = hp - MOL_R;
        state.vel[idx + 1] = -Math.abs(state.vel[idx + 1]);
        impulseSum += 2 * Math.abs(state.vel[idx + 1]);
      }

      // Отражение от цилиндрических стенок
      const x = state.pos[idx];
      const z = state.pos[idx + 2];
      const r = Math.hypot(x, z);
      if (r > rMax) {
        const nx = x / r;
        const nz = z / r;
        state.pos[idx] = nx * rMax;
        state.pos[idx + 2] = nz * rMax;
        const vn = state.vel[idx] * nx + state.vel[idx + 2] * nz;
        if (vn > 0) {
          state.vel[idx] -= 2 * vn * nx;
          state.vel[idx + 2] -= 2 * vn * nz;
          impulseSum += 2 * vn;
        }
      }
    }

    // Нормируем мгновенное импульсное давление строго на эффективный объём и площадь стенок сосуда
    const rEff = CYL_R - MOL_R;
    const hEff = Math.max(0.25, hp - 2 * MOL_R);
    const vesselArea = 2 * Math.PI * rEff * (rEff + hEff);
    const kinScale = (3 * Math.PI * rEff * rEff * hEff * 110) / (Math.max(0.15, p.piston) * 1400);
    const instP = (impulseSum / Math.max(1e-4, dt)) * (kinScale / Math.max(0.8, vesselArea));
    state.pressEma = state.pressEma * (1 - Math.min(1, dt * 3)) + instP * Math.min(1, dt * 3);
  },

  solveState(state, p = {}, simTime = 0) {
    const piston = Math.max(0.15, Number(p?.piston ?? 0.75));
    const heat = Number(p?.heat ?? 50);
    if (!state || !state.n) {
      const N = Math.max(1, Math.round(Number(p?.N ?? 60)));
      const T0 = 280 + 5.5 * heat;
      const P0 = (N * T0) / (piston * 1400);
      return {
        t: simTime,
        n: N,
        V: piston,
        T: T0,
        P: P0,
        vMean: Math.sqrt(T0 / 110),
        pvt: (P0 * piston) / Math.max(1, T0),
        speeds: [],
        bins: [0, 0, 0, 0, 0, 0],
        heat,
        pistonH: H_MAX * piston,
        pos: [],
      };
    }
    let v2Sum = 0;
    const speeds = [];
    for (let i = 0; i < state.n; i++) {
      const idx = i * 3;
      const sp = Math.hypot(state.vel[idx], state.vel[idx + 1], state.vel[idx + 2]);
      speeds.push(sp);
      v2Sum += sp * sp;
    }
    const v2Mean = v2Sum / Math.max(1, state.n);
    const tempK = v2Mean * 110;
    const idealP = (state.n * tempK) / (piston * 1400);
    const P = 0.7 * idealP + 0.3 * (Number.isFinite(state.pressEma) ? state.pressEma : idealP);

    const bins = [0, 0, 0, 0, 0, 0];
    speeds.forEach((sp) => {
      const b = Math.min(5, Math.floor(sp / 0.85));
      bins[b]++;
    });

    return {
      t: simTime,
      n: state.n,
      V: piston,
      T: tempK,
      P,
      vMean: Math.sqrt(v2Mean),
      pvt: (P * piston) / Math.max(1, tempK),
      speeds,
      bins,
      heat,
      pistonH: state.pistonH,
      pos: state.pos,
    };
  },

  serializeState(state) {
    return {
      n: state.n,
      pistonH: Number(state.pistonH.toFixed(4)),
      pressEma: Number(state.pressEma.toFixed(4)),
      pos: state.pos.map((v) => Number(v.toFixed(4))),
      vel: state.vel.map((v) => Number(v.toFixed(4))),
    };
  },

  deserializeState(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const n = Math.max(1, Math.min(120, Math.round(Number(raw.n) || 0)));
    if (!Array.isArray(raw.pos) || !Array.isArray(raw.vel) || raw.pos.length < n * 3 || raw.vel.length < n * 3) {
      return null;
    }
    const pos = raw.pos.slice(0, n * 3).map((v) => (Number.isFinite(v) ? v : 0));
    const vel = raw.vel.slice(0, n * 3).map((v) => (Number.isFinite(v) ? v : 0.2));
    return {
      n,
      pistonH: Number.isFinite(raw.pistonH) ? raw.pistonH : H_MAX * 0.65,
      pressEma: Number.isFinite(raw.pressEma) ? raw.pressEma : 0,
      pos,
      vel,
    };
  },

  getCalcRows(m) {
    return [
      ['Время опыта t', `${m.t.toFixed(2)} с`],
      ['Температура T', `${Math.round(m.T)} K (${Math.round(m.T - 273)} °C)`],
      ['Средн. скорость ⟨v⟩', `${(m.vMean * 180).toFixed(0)} м/с`],
      ['Объём V (отн.)', `${Math.round(m.V * 100)}%`],
      ['Давление P (усл.)', `${m.P.toFixed(1)} кПа`],
      ['P·V / T (константа)', (m.pvt * 1000).toFixed(2)],
    ];
  },

  renderDiagram(m) {
    const maxBin = Math.max(1, ...m.bins);
    const bars = m.bins
      .map((cnt, i) => {
        const h = (cnt / maxBin) * 100;
        const col = i < 2 ? '#38bdf8' : i < 4 ? '#f59e0b' : '#ef4444';
        return `<rect x="${22 + i * 26}" y="${(140 - h).toFixed(1)}" width="21" height="${h.toFixed(1)}" rx="3" fill="${col}"/>`;
      })
      .join('');
    return (
      `<svg role="img" aria-label="Распределение скоростей молекул" viewBox="0 0 200 200" style="display:block;width:100%;height:auto">` +
      `<line x1="16" y1="90" x2="184" y2="90" stroke="currentColor" stroke-opacity=".14" stroke-dasharray="3 3" stroke-width="1"/>` +
      `<line x1="16" y1="44" x2="184" y2="44" stroke="currentColor" stroke-opacity=".14" stroke-dasharray="3 3" stroke-width="1"/>` +
      `<line x1="16" y1="142" x2="184" y2="142" stroke="currentColor" stroke-opacity=".4" stroke-width="1.5"/>` +
      bars +
      `<text x="100" y="164" text-anchor="middle" font-size="11" font-weight="600" fill="currentColor">T ≈ ${Math.round(m.T)} K · P ≈ ${m.P.toFixed(1)}</text>` +
      `<text x="100" y="182" text-anchor="middle" font-size="10" fill="currentColor" opacity=".78">Скорости: медл. → горячие</text>` +
      '</svg>'
    );
  },

  build(api, opts = {}) {
    const m = opts.solved || this.solveState(null, opts.params, 0);
    const G = opts.groups;
    const { THREE, V, seg, ring, cylinderShell, disk, instancedSpheres } = api;
    const benchY = -0.84;

    // Боросиликатный стеклянный цилиндр, термостойкое дно и шкала объёма
    cylinderShell(G.vessel, CYL_R, CYL_R, H_MAX, [0, H_MAX / 2, 0], 0x93c5fd, 0.14, {
      openEnded: true,
      doubleSide: true,
      roughness: 0.08,
      clearcoat: 0.94,
    });
    disk(G.vessel, CYL_R + 0.02, [0, -0.018, 0], 0x93c5fd, 0.24, {
      thickness: 0.032,
      roughness: 0.12,
      clearcoat: 0.9,
      depthWrite: false,
    });
    ring(G.vessel, CYL_R + 0.024, 0x64748b, 0.02, { center: [0, -0.018, 0] });
    ring(G.vessel, CYL_R + 0.01, 0xcbd5e1, 0.018, { center: [0, H_MAX, 0] });
    ring(G.vessel, CYL_R + 0.015, 0x94a3b8, 0.014, { center: [0, 0.012, 0] });
    [0.25, 0.5, 0.75].forEach((f) => {
      ring(G.vessel, CYL_R + 0.005, 0x94a3b8, 0.005, { center: [0, H_MAX * f, 0], opacity: 0.28 });
    });

    // Тренога-подставка под сосуд на лабораторном столе (benchY = -0.84)
    ring(G.vessel, CYL_R * 0.96, 0x64748b, 0.02, { center: [0, -0.055, 0] });
    for (let i = 0; i < 3; i++) {
      const ang = (i * Math.PI * 2) / 3 + Math.PI / 6;
      const topPt = V(Math.cos(ang) * CYL_R * 0.94, -0.055, Math.sin(ang) * CYL_R * 0.94);
      const botPt = V(Math.cos(ang) * (CYL_R * 1.12), benchY, Math.sin(ang) * (CYL_R * 1.12));
      seg(G.vessel, topPt, botPt, 0.022, 0x64748b);
    }

    // Подвижный поршень с уплотнительным кольцом и направляющим штоком
    const pistonGroup = new THREE.Group();
    const pDisk = new THREE.Mesh(
      new THREE.CylinderGeometry(CYL_R - 0.015, CYL_R - 0.015, 0.08, 44),
      new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.72, roughness: 0.28 })
    );
    pDisk.userData.exportTintRole = 'apparatus';
    const gasket = new THREE.Mesh(
      new THREE.TorusGeometry(CYL_R - 0.015, 0.014, 10, 48),
      new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7, metalness: 0.1 })
    );
    gasket.rotation.x = Math.PI / 2;
    const rod = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.055, 1.05, 16),
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.78, roughness: 0.24 })
    );
    rod.position.y = 0.56;
    const knob = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.14, 0.06, 24),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.3, roughness: 0.35 })
    );
    knob.position.y = 1.08;
    pistonGroup.add(pDisk, gasket, rod, knob);
    pistonGroup.position.y = m.pistonH + 0.04;
    G.vessel.add(pistonGroup);

    // Горелка Бунзена на плите лабораторного стола (benchY = -0.84)
    disk(G.flame, 0.54, [0, benchY + 0.025, 0], 0x334155, 1, { thickness: 0.05, metal: true });
    cylinderShell(G.flame, 0.14, 0.19, 0.22, [0, benchY + 0.15, 0], 0x64748b, 1, { metal: true });
    cylinderShell(G.flame, 0.24, 0.16, 0.11, [0, benchY + 0.30, 0], 0x475569, 1, { metal: true });
    ring(G.flame, 0.21, 0xf97316, 0.014, { center: [0, benchY + 0.355, 0], opacity: 0.85, role: 'preserve' });

    const flameCore = new THREE.Mesh(
      new THREE.ConeGeometry(0.16, 0.30, 24),
      new THREE.MeshBasicMaterial({
        color: 0x0ea5e9,
        transparent: true,
        opacity: 0.52,
        depthWrite: false,
        toneMapped: false,
      })
    );
    flameCore.userData.exportTintRole = 'preserve';
    G.flame.add(flameCore);

    const flameMesh = instancedSpheres(G.flame, FLAME_COUNT, 0.095, 0xf97316, { unlit: true, perInstanceColor: true });
    const molsMesh = instancedSpheres(G.mols, 120, MOL_R, 0x38bdf8, {
      perInstanceColor: true,
      roughness: 0.24,
      metalness: 0.06,
    });

    return {
      target: [0, 0.78, 0],
      fitRadius: 2.55,
      groundY: benchY,
      handles: { pistonGroup, flameCore, flameMesh, molsMesh, benchY },
    };
  },

  updateScene(api, { solved: m, handles }) {
    if (!handles || !m) return;
    const { updateInstanced } = api;
    const { pistonGroup, flameCore, flameMesh, molsMesh, benchY } = handles;

    pistonGroup.position.y = m.pistonH + 0.04;

    updateInstanced(molsMesh, m.n, (i) => {
      const idx = i * 3;
      return {
        x: m.pos[idx],
        y: m.pos[idx + 1],
        z: m.pos[idx + 2],
        s: 1,
        color: speedToColor(m.speeds[i] || 1),
      };
    });

    const heatNorm = (m.heat || 0) / 100;
    const baseFlameY = (benchY ?? -0.84) + 0.36;
    if (heatNorm <= 0.01) {
      if (flameCore) flameCore.visible = false;
      updateInstanced(flameMesh, 0, () => ({ x: 0, y: 0, z: 0 }));
    } else {
      if (flameCore) {
        flameCore.visible = true;
        const hScale = 0.28 + 0.84 * heatNorm;
        const rScale = 0.62 + 0.45 * heatNorm;
        flameCore.scale.set(rScale, hScale, rScale);
        flameCore.position.set(0, baseFlameY + 0.15 * hScale, 0);
      }
      updateInstanced(flameMesh, FLAME_COUNT, (i) => {
        const life = (i / FLAME_COUNT + m.t * (1.25 + heatNorm * 1.65)) % 1;
        const ang = i * 2.39996;
        const spread = (1 - life * 0.72) * 0.25 * (0.45 + heatNorm);
        return {
          x: Math.cos(ang + m.t * 2.2) * spread,
          y: baseFlameY + life * (0.22 + heatNorm * 0.15),
          z: Math.sin(ang + m.t * 2.2) * spread,
          s: (1 - life * 0.68) * (0.50 + 0.82 * heatNorm),
          color: life < 0.24 ? 0x0ea5e9 : life < 0.50 ? 0xf59e0b : life < 0.78 ? 0xf97316 : 0xea580c,
        };
      });
    }
  },
};
