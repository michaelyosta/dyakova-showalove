/** SI units. Quasistatic induction and a linear transformer equivalent circuit.
 * Sources: OpenStax University Physics 2, §§13.1–13.2, 15.6.
 * No saturation, leakage reactance or inter-winding electrical connection.
 */
export const TAU = 2 * Math.PI;
const MU0 = 4e-7 * Math.PI;
export const MAGNET_MOMENT = 2.5; // A m²; ideal point dipole, coil radius 4 cm
export const COIL_RADIUS = 0.04;
export const CORE_AREA = 0.003; // m²
export const fmt = (x, digits = 2) => Number.isFinite(x) ? (Math.abs(x) < 0.5 * 10 ** -digits ? 0 : x).toLocaleString('ru-RU', { maximumFractionDigits: digits }) : '—';

/** Flux per turn through a circular loop coaxial with a point dipole.
 * Transverse dipole components integrate to zero by symmetry.
 */
export function inductionReading({ x, velocity = 0, angle = 0, angularVelocity = 0, turns = 200, resistance = 20, closed = true }) {
  const a2 = COIL_RADIUS ** 2, q = a2 + x * x;
  const axialFlux = MU0 * MAGNET_MOMENT * a2 / (2 * q ** 1.5);
  const gradient = -3 * x * axialFlux / q;
  const flux = axialFlux * Math.cos(angle);
  const dFlux = gradient * velocity * Math.cos(angle) - axialFlux * Math.sin(angle) * angularVelocity;
  const emf = -turns * dFlux;
  const current = closed ? emf / resistance : 0;
  return { x, velocity, angle, angularVelocity, flux, dFlux, emf, current, bAverage: flux / (Math.PI * a2), turns, resistance, closed };
}

/** Continuous automatic experiment: hold, insert, hold, withdraw, turn, insert. */
export function inductionProgram(t, speed = 0.04) {
  const travel = 0.12 / speed, period = 5 + 3 * travel;
  const z = ((t % period) + period) % period;
  if (z < 1) return { x: -0.12, velocity: 0, angle: 0, angularVelocity: 0, stage: 0 };
  if (z < 1 + travel) return { x: -0.12 + speed * (z - 1), velocity: speed, angle: 0, angularVelocity: 0, stage: 1 };
  if (z < 2 + travel) return { x: 0, velocity: 0, angle: 0, angularVelocity: 0, stage: 2 };
  if (z < 2 + 2 * travel) return { x: -speed * (z - 2 - travel), velocity: -speed, angle: 0, angularVelocity: 0, stage: 3 };
  if (z < 3 + 2 * travel) return { x: -0.12, velocity: 0, angle: 0, angularVelocity: 0, stage: 4 };
  if (z < 4 + 2 * travel) return { x: -0.12, velocity: 0, angle: Math.PI * (z - 3 - 2 * travel), angularVelocity: Math.PI, stage: 4 };
  if (z < 4 + 3 * travel) return { x: -0.12 + speed * (z - 4 - 2 * travel), velocity: speed, angle: Math.PI, angularVelocity: 0, stage: 5 };
  return { x: 0, velocity: 0, angle: Math.PI, angularVelocity: 0, stage: 6 };
}
export function inductionCheckpoint(index, speed) {
  const travel = 0.12 / speed;
  return [0.5, 1 + travel * 0.7, 1.5 + travel, 2 + travel * 1.3, 3.5 + travel * 2, 4 + travel * 2.7, 4.5 + travel * 3][index] ?? 0;
}

const complex = (re = 0, im = 0) => ({ re, im });
const mul = (a, b) => complex(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
const scale = (a, k) => complex(a.re * k, a.im * k);
const div = (a, b) => scale(mul(a, complex(b.re, -b.im)), 1 / (b.re ** 2 + b.im ** 2));
const abs = a => Math.hypot(a.re, a.im);
const wave = (a, phase) => Math.SQRT2 * (a.re * Math.sin(phase) + a.im * Math.cos(phase));

/** RMS phasors with a resistive load. Real mode: R1, R2, Lm and core-loss Rc.
 * Vp = U1/(1 + R1 Y), Y = n²/(R+R2) + 1/Rc - j/(ωLm).
 * This yields Pin = Pload + copper losses + core losses exactly.
 */
export function transformerReading(p, t = 0) {
  const U = Number(p.voltage), N1 = Number(p.n1), N2 = Number(p.n2), f = Number(p.frequency);
  const n = N2 / N1, real = p.model === 'real', closed = p.load === 'closed';
  const R = Number(p.resistance), R1 = real ? 0.004 * N1 : 0, R2 = real ? 0.004 * N2 : 0;
  const Rc = 18000, Lm = 20 * (N1 / 550) ** 2;
  if (p.source === 'dc') {
    const I = real ? U / R1 : null;
    return { t, U1: U, U2: 0, E2: 0, I1: I, I2: 0, u1: U, u2: 0, e2: 0, i1: I, i2: 0,
      flux: null, fluxPeak: null, bPeak: null, dFlux: 0, inputPower: real ? U * I : null, outputPower: 0,
      copperLoss: real ? U * I : null, coreLoss: 0, efficiency: 0, ratio: n, phase: 0, real, closed, dc: true, R1, R2 };
  }
  const omega = TAU * f, phase = omega * t;
  const Y = complex((closed ? n * n / (R + R2) : 0) + (real ? 1 / Rc : 0), real ? -1 / (omega * Lm) : 0);
  const vp = div(complex(U), complex(1 + R1 * Y.re, R1 * Y.im));
  const e2 = scale(vp, n), i2 = closed ? scale(e2, 1 / (R + R2)) : complex();
  const u2 = closed ? scale(i2, R) : e2;
  const i1 = mul(vp, Y);
  const inputPower = U * i1.re, outputPower = abs(i2) ** 2 * R;
  const copperLoss = abs(i1) ** 2 * R1 + abs(i2) ** 2 * R2, coreLoss = real ? abs(vp) ** 2 / Rc : 0;
  // Orientation: flux chosen so secondary ε = −N2 dΦ/dt equals terminal u2 at no load.
  const flux = Math.SQRT2 * (vp.re * Math.cos(phase) - vp.im * Math.sin(phase)) / (omega * N1);
  const dFlux = -wave(vp, phase) / N1;
  return { t, U1: U, U2: abs(u2), E2: abs(e2), I1: abs(i1), I2: abs(i2), u1: Math.SQRT2 * U * Math.sin(phase),
    u2: wave(u2, phase), e2: wave(e2, phase), i1: wave(i1, phase), i2: wave(i2, phase),
    flux, dFlux, fluxPeak: Math.SQRT2 * abs(vp) / (omega * N1), bPeak: Math.SQRT2 * abs(vp) / (omega * N1 * CORE_AREA),
    inputPower, outputPower, copperLoss, coreLoss, efficiency: inputPower > 1e-12 ? outputPower / inputPower : 0,
    ratio: n, phase, real, closed, dc: false, R1, R2, vp, i1Phasor: i1 };
}
