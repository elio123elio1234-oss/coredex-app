/* ==================================================================
   Report DSP — the "clean, presentable ECG" filter chain.

   Ported from the Python `_gemini_dsp` reference you provided, adapted for
   the browser. This is the OFFLINE / review filter, applied once to a full
   recording — distinct from the real-time display filter in ecgDSP.ts.

   Python chain → this port:
     1. Baseline wander removal (double median, 0.2 s then 0.6 s)   ✅ port
     2. 50 Hz notch (zero-phase)                                    ✅ port (filtfilt-style)
     3. DWT sym4 denoise                                            ⚠️ OMITTED — see below
     4. Savitzky-Golay smoothing (0.04 s window, poly 3)            ✅ port
     5. Auto-scale by 99th percentile                               ✅ port

   ⚠️ DWT (wavelet) denoising is intentionally NOT ported: it needs a wavelet
   library (pywt has no lightweight JS equivalent I'd add as a dependency for
   this). The median + notch + Savitzky-Golay chain already yields a clean,
   presentable trace. If wavelet denoising proves clinically necessary,
   integrate a vetted wavelet lib and slot it in at step 3 — the seam is here.
   ================================================================== */

/* ---- 1. Baseline via decimated double-median ----
   The baseline is a very-low-frequency curve (< ~1 Hz), so we do NOT need
   the median at every sample. A naive per-sample median over a ~0.6 s kernel
   (192 samples) across 6 leads froze the UI for a beat. Instead we compute
   the two medians on a DECIMATED copy (every 8th sample) and linearly
   interpolate back to full rate. Same baseline, ~64× less work — no freeze.
   ---------------------------------------------------------------------- */

function medianFilterSlow(signal: Float32Array, kernel: number): Float32Array {
  const k = kernel % 2 === 0 ? kernel + 1 : kernel;
  const half = (k - 1) / 2;
  const n = signal.length;
  const out = new Float32Array(n);
  const window: number[] = new Array(k);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < k; j++) {
      const idx = Math.min(n - 1, Math.max(0, i - half + j));
      window[j] = signal[idx];
    }
    window.sort((a, b) => a - b);
    out[i] = window[half];
  }
  return out;
}

function decimate(signal: Float32Array, factor: number): Float32Array {
  const m = Math.ceil(signal.length / factor);
  const out = new Float32Array(m);
  for (let i = 0; i < m; i++) out[i] = signal[Math.min(signal.length - 1, i * factor)];
  return out;
}

function interpolateTo(coarse: Float32Array, factor: number, targetLen: number): Float32Array {
  const out = new Float32Array(targetLen);
  for (let i = 0; i < targetLen; i++) {
    const pos = i / factor;
    const a = Math.floor(pos);
    const b = Math.min(coarse.length - 1, a + 1);
    const frac = pos - a;
    out[i] = coarse[Math.min(a, coarse.length - 1)] * (1 - frac) + coarse[b] * frac;
  }
  return out;
}

/** Baseline estimate: double median (w1 then w2) on a decimated signal. */
function baselineEstimate(signal: Float32Array, w1: number, w2: number): Float32Array {
  const DECIM = 8;
  const coarse = decimate(signal, DECIM);
  const k1 = Math.max(3, Math.round(w1 / DECIM));
  const k2 = Math.max(3, Math.round(w2 / DECIM));
  const b1 = medianFilterSlow(coarse, k1);
  const b2 = medianFilterSlow(b1, k2);
  return interpolateTo(b2, DECIM, signal.length);
}

/* ---- 2. 50 Hz notch biquad, applied forward + backward (zero phase) ---- */
interface Biquad {
  b0: number;
  b1: number;
  b2: number;
  a1: number;
  a2: number;
}

/** RBJ notch design (matches scipy.signal.iirnotch shape). */
function designNotch(f0: number, Q: number, fs: number): Biquad {
  const w0 = (2 * Math.PI * f0) / fs;
  const alpha = Math.sin(w0) / (2 * Q);
  const cos = Math.cos(w0);
  const a0 = 1 + alpha;
  return {
    b0: 1 / a0,
    b1: (-2 * cos) / a0,
    b2: 1 / a0,
    a1: (-2 * cos) / a0,
    a2: (1 - alpha) / a0,
  };
}

function biquadForward(signal: Float32Array, f: Biquad): Float32Array {
  const out = new Float32Array(signal.length);
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  for (let i = 0; i < signal.length; i++) {
    const x = signal[i];
    const y = f.b0 * x + f.b1 * x1 + f.b2 * x2 - f.a1 * y1 - f.a2 * y2;
    x2 = x1;
    x1 = x;
    y2 = y1;
    y1 = y;
    out[i] = y;
  }
  return out;
}

/** Forward then reversed-forward → zero phase distortion (like filtfilt). */
function zeroPhaseNotch(signal: Float32Array, fs: number): Float32Array {
  const f = designNotch(50, 30, fs);
  const fwd = biquadForward(signal, f);
  fwd.reverse();
  const back = biquadForward(fwd, f);
  back.reverse();
  return back;
}

/* ---- 4. Savitzky-Golay smoothing ---- */

/** Solve a small symmetric system A·x = b by Gaussian elimination. */
function solve(A: number[][], b: number[]): number[] {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    // Partial pivot.
    let piv = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r;
    [M[col], M[piv]] = [M[piv], M[col]];
    const d = M[col][col] || 1e-12;
    for (let c = col; c <= n; c++) M[col][c] /= d;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const factor = M[r][col];
      for (let c = col; c <= n; c++) M[r][c] -= factor * M[col][c];
    }
  }
  return M.map((row) => row[n]);
}

/**
 * Savitzky-Golay smoothing coefficients for the CENTRE value.
 * c[i] = row 0 of (AᵀA)⁻¹Aᵀ, where A[i][j] = (i-m)^j.
 */
function savgolCoeffs(windowLength: number, polyorder: number): number[] {
  const m = (windowLength - 1) / 2;
  const p = polyorder;
  const A: number[][] = [];
  for (let i = -m; i <= m; i++) {
    const row: number[] = [];
    for (let j = 0; j <= p; j++) row.push(i ** j);
    A.push(row);
  }
  // AᵀA (p+1 square) and solve AᵀA·x = e0.
  const ATA: number[][] = Array.from({ length: p + 1 }, () => new Array(p + 1).fill(0));
  for (let a = 0; a <= p; a++) {
    for (let b = 0; b <= p; b++) {
      let sum = 0;
      for (let i = 0; i < A.length; i++) sum += A[i][a] * A[i][b];
      ATA[a][b] = sum;
    }
  }
  const e0 = new Array(p + 1).fill(0);
  e0[0] = 1;
  const x = solve(ATA, e0);
  // c[i] = Σ_j x[j] · A[i][j]
  return A.map((row) => row.reduce((acc, aij, j) => acc + x[j] * aij, 0));
}

function savitzkyGolay(signal: Float32Array, windowLength: number, polyorder: number): Float32Array {
  let wl = windowLength % 2 === 0 ? windowLength + 1 : windowLength;
  wl = Math.max(wl, polyorder + 2 + ((polyorder + 2) % 2 === 0 ? 1 : 0));
  if (signal.length < wl) return signal.slice();

  const c = savgolCoeffs(wl, polyorder);
  const half = (wl - 1) / 2;
  const n = signal.length;
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let acc = 0;
    for (let j = 0; j < wl; j++) {
      const idx = Math.min(n - 1, Math.max(0, i - half + j));
      acc += c[j] * signal[idx];
    }
    out[i] = acc;
  }
  return out;
}

/* ---- Percentile (for auto-scaling) ---- */
function percentileAbs(signal: Float32Array, pct: number): number {
  const abs = Array.from(signal, Math.abs).sort((a, b) => a - b);
  const idx = Math.min(abs.length - 1, Math.floor((pct / 100) * abs.length));
  return abs[idx] ?? 0;
}

/* ---- Which stages to run ----
   A reviewing clinician must be able to switch stages OFF. Baseline removal
   flattens a drifting trace but also attenuates genuine ST shift; the notch
   removes mains hum but rings slightly around it; the smoother tidies
   morphology at the cost of the sharpest detail. Each is a judgement call
   that belongs to the reader, not to us — so the stages are selectable
   rather than welded together. All-on is the default and reproduces the
   original chain byte for byte. */
export interface ReportFilterOptions {
  /** Double-median baseline-wander removal. */
  baseline?: boolean;
  /** Zero-phase 50 Hz mains notch. */
  notch?: boolean;
  /** Savitzky-Golay morphology smoothing. */
  smoothing?: boolean;
}

const ALL_STAGES: Required<ReportFilterOptions> = {
  baseline: true,
  notch: true,
  smoothing: true,
};

/**
 * Run the report chain on ONE lead.
 * Mirrors the Python order: median baseline → notch → savgol.
 * (Auto-scaling is applied across leads by `reportFilterLeads` below, so
 * the inter-lead ratios are preserved — exactly like the reference script.)
 */
export function reportFilterLead(
  signal: Float32Array,
  fs: number,
  options: ReportFilterOptions = {},
): Float32Array {
  if (signal.length < 10) return signal.slice();
  const opts = { ...ALL_STAGES, ...options };

  // 1. Double median baseline removal (decimated — see baselineEstimate).
  let out: Float32Array;
  if (opts.baseline) {
    const w1 = Math.round(0.2 * fs);
    const w2 = Math.round(0.6 * fs);
    const baseline = baselineEstimate(signal, w1, w2);
    out = new Float32Array(signal.length);
    for (let i = 0; i < signal.length; i++) out[i] = signal[i] - baseline[i];
  } else {
    out = signal.slice();
  }

  // 2. Zero-phase 50 Hz notch.
  if (opts.notch) out = zeroPhaseNotch(out, fs);

  // 3. (DWT denoise omitted — see file header.)

  // 4. Savitzky-Golay (0.04 s window, poly 3).
  if (opts.smoothing) {
    let wl = Math.round(0.04 * fs);
    if (wl % 2 === 0) wl += 1;
    wl = Math.max(wl, 5);
    out = savitzkyGolay(out, wl, 3);
  }

  return out;
}

/**
 * Apply the report filter to a set of leads and auto-scale them TOGETHER,
 * using a reference lead's 99th percentile — matching the Python `scaling`
 * step so relative lead amplitudes stay faithful.
 */
export function reportFilterLeads(
  leads: Record<string, Float32Array>,
  fs: number,
  refLead = 'II',
  options: ReportFilterOptions = {},
): Record<string, Float32Array> {
  const filtered: Record<string, Float32Array> = {};
  for (const [name, sig] of Object.entries(leads)) {
    filtered[name] = reportFilterLead(sig, fs, options);
  }

  const ref = filtered[refLead] ?? Object.values(filtered)[0];
  if (!ref) return filtered;

  let scaling = 1.0;
  const maxAmp = percentileAbs(ref, 99);
  if (maxAmp > 2.0 || maxAmp < 0.2) scaling = maxAmp / 1.2;
  if (scaling <= 0) scaling = 1.0;

  const scaled: Record<string, Float32Array> = {};
  for (const [name, sig] of Object.entries(filtered)) {
    const out = new Float32Array(sig.length);
    for (let i = 0; i < sig.length; i++) out[i] = sig[i] / scaling;
    scaled[name] = out;
  }
  return scaled;
}

// v1.4.0 — Filter stages are individually selectable (a reviewer must be able to switch them off); all-on remains the default.
