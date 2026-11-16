import test from 'node:test';
import assert from 'node:assert/strict';
import mhd, { mhdForcing } from '../models/physics/salt-water-mhd.js';
import { createSimRunner } from '../src/sim-runner.js';
import { distance3D, angle3D } from '../src/teaching-tools.js';

const base = Object.fromEntries(mhd.params.map(p => [p.key, p.default]));
const advance = (r, seconds) => { for (let i = 0; i < seconds * 40; i++) r.tick(0.025); };

test('radial current cross vertical field: either polarity reverses force, both preserve it', () => {
  const f = mhdForcing(base);
  assert(f.torque > 0);
  assert.equal(mhdForcing({ ...base, battery: 'center-minus' }).torque, -f.torque);
  assert.equal(mhdForcing({ ...base, magnet: 'south-up' }).torque, -f.torque);
  assert.equal(mhdForcing({ ...base, battery: 'center-minus', magnet: 'south-up' }).torque, f.torque);
  for (const patch of [{ power: 'off' }, { current: 0 }, { field: 0 }]) {
    assert.equal(Math.abs(mhdForcing({ ...base, ...patch }).torque), 0);
  }
  // f = jB at the mean radius; integrated torque = IB(b²−a²)/2.
  assert(Math.abs(f.forceDensity - base.current * base.field / (2 * Math.PI * 0.033 * 0.012)) < 1e-10);
  assert(Math.abs(f.torque - base.current * base.field * (0.06 ** 2 - 0.006 ** 2) / 2) < 1e-12);
});

test('the running simulation preserves momentum on reversal, then reverses and coasts to rest', () => {
  const runner = createSimRunner();
  runner.initSimulation(mhd, base); runner.play(); advance(runner, 8);
  const before = runner.getState().solved.omega;
  assert(before > 0);
  runner.updateParams({ ...base, battery: 'center-minus' });
  assert.equal(runner.getState().solved.omega, before);
  assert(runner.getState().solved.torque < 0);
  advance(runner, 5);
  assert(runner.getState().solved.omega < 0);
  runner.updateParams({ ...base, power: 'off' });
  const speed = Math.abs(runner.getState().solved.omega);
  advance(runner, 10);
  assert(Math.abs(runner.getState().solved.omega) < speed * 0.001);
});

test('snapshot round trip restores time, particle angle and angular velocity', () => {
  const runner = createSimRunner();
  runner.initSimulation(mhd, base); runner.play(); advance(runner, 3);
  const snap = runner.captureSimSnapshot();
  runner.reset(); runner.restoreSimSnapshot(snap);
  const s = runner.getState();
  assert.equal(s.simTime, snap.simTime);
  assert.deepEqual(s.simState, snap.simState);
  assert.equal(s.playing, false);
  assert.equal(mhd.deserializeState({ theta: Infinity, omega: 0 }), null);
});

test('measurements use 3D coordinates and model scale, with the second point as angle vertex', () => {
  assert.equal(distance3D([0, 0, 0], [3, 4, 12]), 13);
  assert.equal(distance3D([0, 0, 0], [0, 0, 2], 3), 6);
  assert.equal(angle3D([1, 0, 0], [0, 0, 0], [0, 1, 0]), 90);
  assert.equal(angle3D([1, 0, 0], [0, 0, 0], [-1, 0, 0]), 180);
  assert.equal(angle3D([0, 0, 0], [0, 0, 0], [0, 1, 0]), null);
});
