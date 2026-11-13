/** Simulation playback engine supporting analytic and deterministic step-based physics scenes. */

export const SIM_SPEEDS = [0.25, 0.5, 1, 2];

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createSimRunner() {
  let scene = null;
  let params = {};
  let playing = false;
  let simTime = 0;
  let speed = 1;
  let seed = 1337;
  let simState = null;
  let rng = mulberry32(seed);
  let acc = 0;
  let solved = {};

  const isSim = () => !!scene && scene.kind === 'simulation';
  const duration = () => {
    if (!scene) return null;
    if (typeof scene.getDuration === 'function') return scene.getDuration(params);
    return scene.playback?.duration ?? null;
  };

  function evaluateSolved() {
    if (!scene) return {};
    if (typeof scene.evaluateAt === 'function') {
      solved = scene.evaluateAt(simTime, params);
    } else if (typeof scene.solveState === 'function') {
      solved = scene.solveState(simState, params, simTime);
    } else if (typeof scene.solve === 'function') {
      solved = scene.solve(params, simTime);
    } else {
      solved = {};
    }
    return solved;
  }

  function initSimulation(def, nextParams, opts = {}) {
    scene = def;
    params = nextParams;
    playing = false;
    acc = 0;
    speed = opts.speed ?? def.playback?.defaultSpeed ?? 1;
    seed = opts.seed ?? 1337;
    rng = mulberry32(seed);
    const targetT = typeof opts.simTime === 'number' ? opts.simTime : 0;

    if (typeof def.initState === 'function') {
      simState = def.initState(params, rng);
      const deserialized =
        opts.simState && typeof def.deserializeState === 'function'
          ? def.deserializeState(opts.simState, params)
          : null;
      if (deserialized) {
        simState = deserialized;
        simTime = targetT;
      } else {
        simTime = 0;
        if (targetT > 0 && typeof def.stepState === 'function') {
          advanceStepped(targetT);
        }
      }
    } else {
      simState = null;
      simTime = targetT;
    }
    return evaluateSolved();
  }

  function updateParams(nextParams) {
    params = nextParams;
    if (!isSim()) return {};
    if (typeof scene.onParamsChange === 'function' && simState) {
      const keep = scene.onParamsChange(simState, params, rng);
      if (keep === false) {
        rng = mulberry32(seed);
        simState = scene.initState(params, rng);
        simTime = 0;
        acc = 0;
      }
    } else if (typeof scene.initState === 'function') {
      rng = mulberry32(seed);
      simState = scene.initState(params, rng);
      if (simTime > 0 && typeof scene.stepState === 'function') {
        const target = simTime;
        simTime = 0;
        advanceStepped(target);
      }
    }
    const dur = duration();
    if (dur !== null && simTime > dur) simTime = dur;
    return evaluateSolved();
  }

  function advanceStepped(dtScaled) {
    const dtFixed = scene.playback?.dtFixed || 1 / 120;
    acc += dtScaled;
    let steps = 0;
    const maxSteps = 240;
    while (acc >= dtFixed && steps < maxSteps) {
      scene.stepState(simState, dtFixed, params, rng);
      acc -= dtFixed;
      simTime += dtFixed;
      steps++;
    }
  }

  function tick(realDt) {
    if (!isSim() || !playing) return false;
    const dt = Math.min(Math.max(realDt, 0), 0.05) * speed;
    const dur = duration();
    const loop = !!scene.playback?.loop;

    if (typeof scene.stepState === 'function') {
      advanceStepped(dt);
      if (dur !== null && simTime >= dur) {
        if (loop && dur > 0) {
          reset();
          playing = true;
        } else {
          simTime = dur;
          playing = false;
        }
      }
    } else {
      simTime += dt;
      if (dur !== null && simTime >= dur) {
        if (loop && dur > 0) {
          simTime = simTime % dur;
        } else {
          simTime = dur;
          playing = false;
        }
      }
    }
    evaluateSolved();
    return true;
  }

  function reset() {
    if (!isSim()) return;
    playing = false;
    simTime = 0;
    acc = 0;
    rng = mulberry32(seed);
    if (typeof scene.initState === 'function') {
      simState = scene.initState(params, rng);
    }
    evaluateSolved();
  }

  function seek(targetT) {
    if (!isSim()) return;
    const dur = duration();
    const t = Math.max(0, dur !== null ? Math.min(dur, targetT) : targetT);
    if (typeof scene.stepState === 'function') {
      if (t < simTime - 1e-6) {
        rng = mulberry32(seed);
        simState = scene.initState(params, rng);
        simTime = 0;
        acc = 0;
      }
      if (t > simTime) advanceStepped(t - simTime);
    } else {
      simTime = t;
    }
    evaluateSolved();
  }

  function stepBy(deltaSec) {
    if (!isSim()) return;
    playing = false;
    if (deltaSec > 0 && typeof scene.stepState === 'function') {
      advanceStepped(deltaSec);
      const dur = duration();
      if (dur !== null && simTime > dur) simTime = dur;
      evaluateSolved();
    } else {
      seek(simTime + deltaSec);
    }
  }

  function play() {
    if (!isSim()) return;
    const dur = duration();
    if (dur !== null && !scene.playback?.loop && simTime >= dur - 1e-4) {
      reset();
    }
    playing = true;
  }

  function pause() {
    playing = false;
  }

  function togglePlay() {
    if (playing) pause();
    else play();
    return playing;
  }

  function cycleSpeed() {
    const idx = SIM_SPEEDS.indexOf(speed);
    speed = SIM_SPEEDS[(idx + 1) % SIM_SPEEDS.length];
    return speed;
  }

  function captureSimSnapshot() {
    if (!isSim()) return { simTime: null, simSeed: null, simState: null };
    return {
      simTime,
      simSeed: seed,
      simState: typeof scene.serializeState === 'function' && simState ? scene.serializeState(simState) : null,
    };
  }

  function restoreSimSnapshot(snap) {
    if (!isSim()) return;
    playing = false;
    seed = snap.simSeed ?? 1337;
    rng = mulberry32(seed);
    acc = 0;
    const t = typeof snap.simTime === 'number' ? snap.simTime : 0;
    const deserialized =
      snap.simState && typeof scene.deserializeState === 'function'
        ? scene.deserializeState(snap.simState, params)
        : null;
    if (deserialized) {
      simState = deserialized;
      simTime = t;
    } else {
      simState = typeof scene.initState === 'function' ? scene.initState(params, rng) : null;
      simTime = 0;
      if (t > 0 && typeof scene.stepState === 'function') {
        advanceStepped(t);
      } else {
        simTime = t;
      }
    }
    evaluateSolved();
  }

  return {
    isSim,
    initSimulation,
    updateParams,
    tick,
    play,
    pause,
    togglePlay,
    reset,
    seek,
    stepBy,
    cycleSpeed,
    getState: () => ({
      playing,
      simTime,
      speed,
      duration: duration(),
      canScrub: !!scene?.playback?.canScrub,
      solved,
      simState,
    }),
    captureSimSnapshot,
    restoreSimSnapshot,
  };
}
