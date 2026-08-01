/* ==================================================================
   EcgSimulator — synthetic two-lead ECG for environments without the
   ESP32 (Expo Go, emulators). Signal is a crude P-QRS-T composite —
   good enough to exercise rendering and protocol UI, never presented
   as a real measurement (bleSlice.simulated flags it).
   ================================================================== */

type BatchSink = (leadI: number[], leadII: number[], bpm: number) => void;

const BATCH_MS = 100; // mirror the native bridge's 10 Hz flush cadence

export class EcgSimulator {
  private timer: ReturnType<typeof setInterval> | null = null;
  private t = 0; // seconds
  private readonly dt: number;
  private readonly bpm = 62;

  constructor(sampleRate: number) {
    this.dt = 1 / sampleRate;
  }

  start(sink: BatchSink): void {
    this.stop();
    const samplesPerBatch = Math.round(BATCH_MS / 1000 / this.dt);
    this.timer = setInterval(() => {
      const leadI: number[] = new Array(samplesPerBatch);
      const leadII: number[] = new Array(samplesPerBatch);
      for (let i = 0; i < samplesPerBatch; i++) {
        const v = this.sample(this.t);
        // Lead II carries the stronger projection, like a real frontal axis.
        leadI[i] = v * 0.55;
        leadII[i] = v;
        this.t += this.dt;
      }
      sink(leadI, leadII, this.bpm);
    }, BATCH_MS);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  /** One beat = gaussian P + sharp QRS + broad T, repeated at `bpm`. */
  private sample(t: number): number {
    const period = 60 / this.bpm;
    const phase = t % period;
    const g = (center: number, width: number, amp: number) =>
      amp * Math.exp(-((phase - center) ** 2) / (2 * width ** 2));
    return (
      g(0.18, 0.025, 0.12) + // P
      g(0.3, 0.012, -0.15) + // Q
      g(0.32, 0.014, 1.05) + // R
      g(0.345, 0.012, -0.25) + // S
      g(0.55, 0.06, 0.3) + // T
      0.01 * Math.sin(2 * Math.PI * 0.28 * t) // respiratory drift
    );
  }
}

// v0.1.0 — Synthetic P-QRS-T generator matching the native batch cadence.
