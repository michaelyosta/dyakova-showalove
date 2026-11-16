import test from 'node:test';
import assert from 'node:assert/strict';
import { inductionReading, inductionProgram, transformerReading, TAU } from '../models/physics/lab/electromagnetism.js';
import induction from '../models/physics/electromagnetic-induction.js';
import transformer, { transformerFrame } from '../models/physics/transformer.js';
import { createSimRunner } from '../src/sim-runner.js';
const defaults = m => Object.fromEntries(m.params.map(p => [p.key, p.default]));
const ip = defaults(induction), tp = defaults(transformer);
const near = (a, b, eps = 1e-9) => assert(Math.abs(a - b) <= eps * Math.max(1, Math.abs(a), Math.abs(b)), `${a} ≠ ${b}`);
const advance = (r, t) => { for (let i = 0; i < Math.ceil(t * 100); i++) r.tick(0.01); };

test('Faraday: analytic EMF matches a finite difference of flux for translation and rotation', () => {
  for (const x of [-0.12, -0.04, 0, 0.04, 0.12]) for (const angle of [0, 0.7, Math.PI]) {
    const v = 0.04, w = 0.8, dt = 1e-6;
    const m = inductionReading({ x, angle, velocity: v, angularVelocity: w, turns: 320 });
    const before = inductionReading({ x: x - v * dt, angle: angle - w * dt });
    const after = inductionReading({ x: x + v * dt, angle: angle + w * dt });
    near(m.emf, -320 * (after.flux - before.flux) / (2 * dt));
  }
});
test('stationary magnet has flux but no EMF; N and speed scale EMF, either reversal changes its sign', () => {
  const stationary = inductionReading({ x: 0 }); assert(stationary.flux > 0); near(stationary.emf, 0);
  const p = { x: -0.04, velocity: 0.04, turns: 200, resistance: 20 };
  const m = inductionReading(p); assert(m.emf < 0); assert(m.current < 0);
  near(inductionReading({ ...p, turns: 400 }).emf, 2 * m.emf);
  near(inductionReading({ ...p, velocity: 0.08 }).emf, 2 * m.emf);
  near(inductionReading({ ...p, velocity: -0.04 }).emf, -m.emf);
  near(inductionReading({ ...p, angle: Math.PI }).emf, -m.emf);
  near(inductionReading({ ...p, angle: Math.PI, velocity: -0.04 }).emf, m.emf);
  const open = inductionReading({ ...p, closed: false }); near(open.emf, m.emf); near(open.current, 0);
  assert(m.current * m.dFlux < 0); // induced field opposes the change, not the flux itself
});
test('free magnet moves at the requested speed, stops at its target, and survives snapshot restore', () => {
  const r = createSimRunner(); const p = { ...ip, target: 0 }; r.initSimulation(induction, p); r.play(); advance(r, 1);
  near(r.getState().solved.x, -0.08, 1e-8); assert(r.getState().solved.emf < 0);
  r.pause(); const x = r.getState().solved.x; r.tick(1); near(r.getState().solved.x, x);
  r.play(); advance(r, 3); near(r.getState().solved.x, 0); near(r.getState().solved.emf, 0);
  const snap = r.captureSimSnapshot(); r.reset(); r.restoreSimSnapshot(snap);
  assert.deepEqual(r.captureSimSnapshot(), snap);
  assert.equal(induction.deserializeState({ ...snap.simState, x: Infinity }, p), null);
});
test('continuous demonstration contains stationary, forward, backward and reversed-polarity frames', () => {
  near(inductionProgram(0.5).velocity, 0);
  assert(inductionProgram(2).velocity > 0); near(inductionProgram(4.5).velocity, 0);
  assert(inductionProgram(6).velocity < 0); assert(inductionProgram(11).angle > 3);
  for (let i = 0; i < 7; i++) assert(Number.isFinite(induction.solveState(induction.initState(ip), { ...ip, labMode: 'steps', lessonStep: i }).emf));
});
test('ideal transformer produces exactly 380 V and 12 V and conserves load power', () => {
  for (const [n1, n2, output] of [[220, 380, 380], [550, 30, 12]]) {
    const m = transformerReading({ ...tp, n1, n2 }); near(m.U2, output); near(m.U2 / m.U1, n2 / n1);
    near(m.U1 * m.I1, m.U2 * m.I2); near(m.inputPower, m.outputPower); near(m.efficiency, 1);
  }
});
test('open circuit retains voltage without secondary current or load power', () => {
  for (const model of ['ideal', 'real']) {
    const m = transformerReading({ ...tp, model, load: 'open' }); assert(m.U2 > 0); near(m.I2, 0); near(m.outputPower, 0);
    if (model === 'ideal') near(m.I1, 0); else assert(m.I1 > 0 && m.coreLoss > 0);
  }
});
test('real equivalent circuit conserves active power including copper and core losses', () => {
  for (const n1 of [20, 220, 550, 1200]) for (const n2 of [10, 30, 380, 1200]) for (const resistance of [10, 100, 1000]) for (const frequency of [10, 50, 100]) {
    const m = transformerReading({ ...tp, model: 'real', n1, n2, resistance, frequency });
    near(m.inputPower, m.outputPower + m.copperLoss + m.coreLoss, 1e-8);
    assert(m.U2 < tp.voltage * n2 / n1); assert(m.efficiency >= 0 && m.efficiency <= 1);
  }
});
test('secondary EMF obeys Faraday, flux amplitude depends inversely on frequency and primary turns', () => {
  for (const model of ['ideal', 'real']) {
    const p = { ...tp, model }, t = 0.0023, h = 1e-8;
    const m = transformerReading(p, t), before = transformerReading(p, t - h), after = transformerReading(p, t + h);
    near(m.e2, -p.n2 * (after.flux - before.flux) / (2 * h), 1e-7);
    near(m.e2, -p.n2 * m.dFlux);
  }
  const a = transformerReading(tp), b = transformerReading({ ...tp, frequency: 100 }), c = transformerReading({ ...tp, n1: 1100 });
  near(a.fluxPeak, 2 * b.fluxPeak); near(a.fluxPeak, 2 * c.fluxPeak);
});
test('RMS and instantaneous readings agree over a period; real source current includes its phase', () => {
  for (const model of ['ideal', 'real']) {
    const p = { ...tp, model }; const n = 1000, sum = { u1: 0, u2: 0, i1: 0, i2: 0, power: 0 };
    for (let i = 0; i < n; i++) { const m = transformerReading(p, i / (n * p.frequency)); for (const k of ['u1', 'u2', 'i1', 'i2']) sum[k] += m[k] ** 2 / n; sum.power += m.u1 * m.i1 / n; }
    const m = transformerReading(p); for (const [k, rms] of [['u1','U1'],['u2','U2'],['i1','I1'],['i2','I2']]) near(Math.sqrt(sum[k]), m[rms]); near(sum.power, m.inputPower);
  }
});
test('DC has no continuous secondary EMF; ideal input current is undefined, real mode dissipates heat', () => {
  for (const model of ['ideal', 'real']) {
    const m = transformerReading({ ...tp, model, source: 'dc' }, 10);
    near(m.U2, 0); near(m.I2, 0); near(m.e2, 0); near(m.dFlux, 0); assert.equal(m.flux, null);
    if (model === 'ideal') assert.equal(m.I1, null); else { assert(m.I1 > 0); near(m.inputPower, m.copperLoss); }
  }
});
test('slowing observation changes physical simulation time without changing the entered frequency', () => {
  const r = createSimRunner(); r.initSimulation(transformer, tp); r.play(); advance(r, 1);
  near(r.getState().simTime, 0.01); near(r.getState().solved.phase, TAU * 50 * 0.01);
  r.pause(); r.stepBy(transformer.getStepSize(tp)); near(r.getState().simTime, 0.01 + 1 / 800);
  const snap = r.captureSimSnapshot(); r.reset(); r.restoreSimSnapshot(snap); near(r.getState().simTime, snap.simTime);
  for (let lessonStep = 0; lessonStep < 7; lessonStep++) assert(Number.isFinite(transformerFrame({ ...tp, labMode: 'steps', lessonStep }, 0).U2));
});

test('holding the magnet suppresses both translation and rotation EMF while preserving flux', () => {
  const r = createSimRunner(); let p = { ...ip, target: 0, polarity: 'south' };
  r.initSimulation(induction, p); r.play(); advance(r, 0.2);
  p = { ...p, motion: 'hold' }; r.updateParams(p);
  const m = r.getState().solved; near(m.emf, 0); assert(Math.abs(m.flux) > 0);
  const x = m.x, a = m.angle; advance(r, 1); near(r.getState().solved.x, x); near(r.getState().solved.angle, a);
});
test('a stopped teaching frame aligns maximum flux with zero EMF, including real phase shifts', () => {
  const m = transformerFrame({ ...tp, model: 'real', labMode: 'steps', lessonStep: 1 }, 0);
  near(m.e2, 0, 1e-8); near(Math.abs(m.flux), m.fluxPeak);
  const loadFrame = transformerFrame({ ...tp, labMode: 'steps', lessonStep: 3 }, 0);
  assert(loadFrame.I1 > 0 && loadFrame.I2 > 0); assert(loadFrame.e2 > 0);
});

test('transformer demo stage pacing stays constant regardless of timeView slowdown or AC frequency', () => {
  const slow0 = transformerFrame({ ...tp, labMode: 'demo', timeView: 'slow', frequency: 50 }, 0.01);
  const slow1 = transformerFrame({ ...tp, labMode: 'demo', timeView: 'slow', frequency: 50 }, 0.05);
  const real0 = transformerFrame({ ...tp, labMode: 'demo', timeView: 'real', frequency: 100 }, 1.0);
  const real1 = transformerFrame({ ...tp, labMode: 'demo', timeView: 'real', frequency: 100 }, 5.0);
  assert.equal(slow0.stage, 0);
  assert.equal(slow1.stage, 2);
  assert.equal(real0.stage, 0);
  assert.equal(real1.stage, 2);
});

test('3D presentation labs expose slide camera cues, overlay scope, and toggleable controls', () => {
  for (const model of [induction, transformer]) {
    assert(model.lab.steps.length === 7);
    assert(model.lab.questions.length === 3);
    assert(model.lab.cameraViews?.apparatus?.position?.length === 3);
    assert.equal(typeof model.getScopeOverlay, 'function');
    for (let i = 0; i < 7; i++) {
      const cam = model.lab.getSlideCamera({ ...tp, ...ip, labMode: 'steps' }, i);
      assert(Array.isArray(cam.position) && cam.position.length === 3);
      assert(Array.isArray(cam.target) && cam.target.length === 3);
    }
  }
  const indOverlay = induction.getScopeOverlay(induction.solveState(induction.initState(ip), ip), ip);
  assert.equal(indOverlay.scopes.length, 2);
  const trOverlay = transformer.getScopeOverlay(transformer.evaluateAt(0.01, tp), tp);
  assert.equal(trOverlay.scopes.length, 1);
  const holdAct = induction.lab.actions({}, { ...ip, labMode: 'free', motion: 'move' })[0];
  assert.equal(holdAct.patch().motion, 'hold');
  const resumeAct = induction.lab.actions({}, { ...ip, labMode: 'free', motion: 'hold' })[0];
  assert.equal(resumeAct.patch().motion, 'move');
  const scaleAct = transformer.lab.actions({ dc: false }, { ...tp, labMode: 'free', scopeScale: 'auto' })[0];
  assert.equal(scaleAct.patch(null, { scopeScale: 'auto' }).scopeScale, 'shared');
});
