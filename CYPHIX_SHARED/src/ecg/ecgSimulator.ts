/* ==================================================================
   EcgSimulator — a synthetic signal source for BENCH TESTING.

   ══ WHY THIS EXISTS ══
   The protocol refuses to run without a live signal (by design — see
   protocolMachine invariants). That makes the whole guided flow impossible
   to develop, demo, or review without the ESP32 physically present.
   Every serious medical-device team has a simulated signal source for
   exactly this reason.

   ══ SAFETY ══
   This is NOT a patient signal and must never be presented as one.
   • The device name is forced to "SIMULATION".
   • The UI must label it visibly (see BleConnectCard).
   • Nothing produced here may ever be committed as a clinical record.

   ── THE WAVEFORM ──
   A textbook PQRST built from gaussian bumps at 320 Hz. It is good enough
   to (a) render a believable trace and (b) satisfy the R-peak/QRS
   detectors, which is all bench testing needs. It is NOT physiologically
   faithful and carries no diagnostic meaning whatsoever.

   ══ EVERY SESSION LOOKS DIFFERENT (deliberate) ══
   Each `new EcgSimulator()` draws a random PROFILE: rate, frontal axis,
   wave amplitudes, sinus arrhythmia, noise and baseline wander. Two demo
   recordings therefore never look identical.

   That is a TESTING requirement, not decoration. With one fixed waveform,
   a history list of ten sessions renders ten pixel-identical strips — so
   an overlay comparison, a per-recording measurement table, or a caching
   bug that serves recording #3's samples for recording #7 all look
   perfectly correct. Variation is what makes those failures visible.

   The variation stays inside physiological plausibility so the frozen
   Pan-Tompkins gate still opens on it: R stays dominant and RR stays in
   the 300–1500 ms window the validator accepts.
   ================================================================== */

/** Gaussian bump helper: amplitude `a`, centre `mu` (s), width `sigma` (s). */
function bump(t: number, a: number, mu: number, sigma: number): number {
  const d = (t - mu) / sigma;
  return a * Math.exp(-0.5 * d * d);
}

/**
 * What makes one simulated subject differ from another.
 * All fields are multipliers/offsets on the textbook complex above.
 */
export interface SimulatorProfile {
  /** Resting rate this subject sits at. */
  bpm: number;
  /**
   * Frontal-plane axis in degrees, ~15°–75° (normal range). Lead I and
   * Lead II are projections of the same vector at 0° and 60°, so deriving
   * the ratio from an angle — rather than hardcoding 0.62 — is what makes
   * III/aVR/aVL/aVF differ believably between subjects.
   */
  axisDegrees: number;
  /** Overall QRS voltage multiplier. */
  qrsScale: number;
  pScale: number;
  tScale: number;
  /** Beat-to-beat RR variation as a fraction (sinus arrhythmia). */
  rrVariation: number;
  /** White noise amplitude in mV. */
  noiseMv: number;
  /** Slow baseline drift amplitude in mV (respiration). */
  wanderMv: number;
}

function randBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/** Draw a plausible, clearly-distinct subject. */
export function randomProfile(): SimulatorProfile {
  return {
    bpm: Math.round(randBetween(54, 92)),
    axisDegrees: randBetween(10, 75),
    qrsScale: randBetween(0.75, 1.35),
    pScale: randBetween(0.6, 1.4),
    tScale: randBetween(0.65, 1.45),
    rrVariation: randBetween(0.01, 0.07),
    noiseMv: randBetween(0.004, 0.016),
    wanderMv: randBetween(0.0, 0.05),
  };
}

export interface SimulatedSample {
  leadI_mV: number;
  leadII_mV: number;
}

export class EcgSimulator {
  private t = 0; // seconds elapsed within the current beat
  private elapsed = 0; // seconds since start (drives the slow wander)
  private readonly sampleRate: number;
  private readonly profile: SimulatorProfile;
  /** Length of the CURRENT beat — redrawn each beat for sinus arrhythmia. */
  private beatLen: number;
  private baseBeatLen: number;

  constructor(sampleRate: number, profile: SimulatorProfile = randomProfile()) {
    this.sampleRate = sampleRate;
    this.profile = profile;
    this.baseBeatLen = 60 / profile.bpm;
    this.beatLen = this.baseBeatLen;
  }

  /** The subject this instance is simulating — surface it when debugging. */
  getProfile(): Readonly<SimulatorProfile> {
    return this.profile;
  }

  setBpm(bpm: number): void {
    this.baseBeatLen = 60 / Math.max(30, Math.min(200, bpm));
    this.beatLen = this.baseBeatLen;
  }

  /** One beat of the frontal-plane QRS magnitude, in millivolts. */
  private beatWaveform(t: number): number {
    const p = this.profile;
    // Position the complex consistently regardless of heart rate: the PQRST
    // itself has a roughly fixed duration; the diastolic gap stretches.
    const qrsCentre = 0.28;

    let v = 0;
    v += bump(t, 0.12 * p.pScale, qrsCentre - 0.16, 0.022); // P wave
    v += bump(t, -0.09 * p.qrsScale, qrsCentre - 0.022, 0.008); // Q
    v += bump(t, 1.05 * p.qrsScale, qrsCentre, 0.011); // R (the tall spike)
    v += bump(t, -0.22 * p.qrsScale, qrsCentre + 0.026, 0.011); // S
    v += bump(t, 0.26 * p.tScale, qrsCentre + 0.17, 0.042); // T wave

    // Keep the tail flat if the beat is long (slow heart rate).
    if (t > this.beatLen) v = 0;
    return v;
  }

  /** Draw the next beat's length, applying this subject's sinus arrhythmia. */
  private nextBeatLength(): number {
    const jitter = 1 + (Math.random() * 2 - 1) * this.profile.rrVariation;
    // Clamp to what the frozen validator will accept as a real beat.
    return Math.max(0.34, Math.min(1.45, this.baseBeatLen * jitter));
  }

  /** Produce the next `count` samples. */
  next(count: number): SimulatedSample[] {
    const out: SimulatedSample[] = [];
    const dt = 1 / this.sampleRate;
    const p = this.profile;

    // Lead I is the vector projected on 0°, Lead II on +60°.
    const axisRad = (p.axisDegrees * Math.PI) / 180;
    const projI = Math.cos(axisRad);
    const projII = Math.cos(axisRad - Math.PI / 3);

    for (let i = 0; i < count; i++) {
      const magnitude = this.beatWaveform(this.t);

      // Independent noise per channel — a shared sample would make Lead III
      // (II − I) perfectly noiseless, which no real electrode pair is.
      const noiseI = (Math.random() - 0.5) * p.noiseMv;
      const noiseII = (Math.random() - 0.5) * p.noiseMv;
      // Respiration drifts the baseline at ~0.25 Hz.
      const wander = p.wanderMv * Math.sin(2 * Math.PI * 0.25 * this.elapsed);

      out.push({
        leadI_mV: magnitude * projI + noiseI + wander,
        leadII_mV: magnitude * projII + noiseII + wander,
      });

      this.t += dt;
      this.elapsed += dt;
      if (this.t >= this.beatLen) {
        this.t -= this.beatLen;
        this.beatLen = this.nextBeatLength();
      }
    }
    return out;
  }
}

// v2.0.0 — Randomised per-session profile (rate, axis, amplitudes, sinus arrhythmia, noise, wander) so demo recordings differ.
