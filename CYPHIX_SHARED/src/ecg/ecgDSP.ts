/* ==================================================================
   ECG Digital Signal Processing — ported VERBATIM from BEATALIGN
   (my-ecg-app/src/bluetooth/ecgDSP.js).

   ⚠️ FROZEN MATH: the biquad coefficients below are pre-calculated for
   Fs = 320 Hz (the ESP32 sample rate). Do NOT "clean up" the numbers —
   changing them changes the clinical waveform. If the hardware sample
   rate ever changes, the coefficients must be re-derived, not tweaked.

   Provides:
     1. Lead derivation (III, aVR, aVL, aVF from Lead I + Lead II)
     2. Display filter chain (0.5–40 Hz bandpass + 50 Hz notch)
     3. Raw data is never modified — filtering always returns new values.
   ================================================================== */

import {
  createCascadeState,
  designHighpass,
  designLowpass,
  designNotch,
  processCascade,
  type BiquadState as CascadeState,
} from './filterDesign';
import type { LimbLeadName, SixLeadSample } from '../types/ecg';

/* ──────────────────────────────────────────────────────────────
   Einthoven / Goldberger lead derivation.
   The hardware measures only Lead I and Lead II. The remaining four
   limb leads are pure algebra — this is standard 12-lead ECG theory:
     Lead III = Lead II − Lead I         (Einthoven's triangle)
     aVR      = −(Lead I + Lead II) / 2
     aVL      =  Lead I − Lead II / 2
     aVF      =  Lead II − Lead I / 2
   ────────────────────────────────────────────────────────────── */
export function deriveLeads(leadI_mV: number, leadII_mV: number): SixLeadSample {
  return {
    I: leadI_mV,
    II: leadII_mV,
    III: leadII_mV - leadI_mV,
    aVR: -(leadI_mV + leadII_mV) / 2,
    aVL: leadI_mV - leadII_mV / 2,
    aVF: leadII_mV - leadI_mV / 2,
  };
}

/* Biquad state and cascade processing live in filterDesign.ts, alongside
   the design functions that produce the coefficients they run. */
export type { BiquadState } from './filterDesign';

/* ══════════════════════════════════════════════════════════════════
   THE DISPLAY CHAIN — identical to the reference desktop monitor.

   ⚠️ THE BUG THIS REPLACED (measured, not guessed)
   This chain used to carry hand-transcribed constants whose comments did
   not match what they actually did:

     stage        comment said   actually was      consequence
     ──────────────────────────────────────────────────────────────────
     notch        50 Hz          47.31 Hz          0.51 dB at real mains
                                                   → traces buried in
                                                     interference
     high-pass    0.5 Hz         0.252 Hz, order 2 → baseline wander walked
                                                     straight through, the
                                                     trace drifted off card

   Both were reproduced on the bench against the reference GUI, which
   showed the SAME patient on the SAME hardware perfectly clean at the
   same moment. The hardware was never at fault.

   The chain below matches `ecg_dsp.py :: filter_sample_online` in the
   reference monitor exactly — the configuration that is known good on
   real patients:

     high-pass  4th-order Butterworth @ 0.67 Hz   (IEC 60601-2-27 monitoring)
     notch      50 Hz, Q = 30
     low-pass   6th-order Butterworth @ 100 Hz

   Coefficients are DESIGNED at load time from the sample rate (see
   services/ecg/filterDesign.ts), so they cannot silently point at the
   wrong frequency again, and they track the hardware if it ever changes.
   ══════════════════════════════════════════════════════════════════ */

/* ── The COSMETIC stage (display only) ──────────────────────────────
   Everything above is the reference's clinical chain and is faithful to
   it. The two stages below are NOT in the clinical chain: they exist so
   the live trace the PATIENT watches is smooth and calm.

   This is legitimate, and it is what the reference monitor does too (its
   "DSP ALL ON" button adds wavelet denoising, NLMS and Savitzky-Golay on
   top of the clinical IIR — for the screen only). The justification is
   the same in both places:

     the live trace is FEEDBACK, not evidence.

   Its whole job is to tell the patient "you are holding it right". The
   report is computed from the RAW captured samples by the offline chain
   in reportFilter.ts, which never sees these buffers — so smoothing here
   cannot cost a single microvolt of diagnostic information. Nothing
   downstream of the screen reads this signal.

     monitor low-pass  4th-order Butterworth @ 40 Hz
       Standard bedside "monitor mode" bandwidth (IEC 60601-2-27). Kills
       EMG and any mains residual. It WILL soften an ischemic ST slope —
       which is fine, because no ST measurement is ever taken from here.
     Savitzky-Golay  window 9, cubic
       Copied from the reference (`sg_window=9, sg_order=3`). 28 ms wide
       against an 80–120 ms QRS, so it smooths without clipping R peaks.
   ────────────────────────────────────────────────────────────────── */
export const MONITOR_LP_ORDER = 4;
export const MONITOR_LP_HZ = 40;

/** Savitzky-Golay 9-point cubic smoothing kernel (Σ = 231). */
const SG_KERNEL = [-21, 14, 39, 54, 59, 54, 39, 14, -21];
const SG_NORM = 231;
const SG_LEN = SG_KERNEL.length;

/** Sample rate the display chain is designed for. */
export const DISPLAY_FS = 320;

/** Baseline-wander removal. 4th order — 2nd order was not enough. */
export const HP_ORDER = 4;
export const HP_CUTOFF_HZ = 0.67;
/** Mains rejection. */
export const NOTCH_HZ = 50;
export const NOTCH_Q = 30;
/** Anti-EMG / smoothing. */
export const LP_ORDER = 6;
export const LP_CUTOFF_HZ = 100;

const HP_SECTIONS = designHighpass(HP_ORDER, HP_CUTOFF_HZ, DISPLAY_FS);
const NOTCH_SECTION = [designNotch(NOTCH_HZ, NOTCH_Q, DISPLAY_FS)];
const LP_SECTIONS = designLowpass(LP_ORDER, LP_CUTOFF_HZ, DISPLAY_FS);
const MONITOR_LP_SECTIONS = designLowpass(MONITOR_LP_ORDER, MONITOR_LP_HZ, DISPLAY_FS);

/** Exposed so tests can assert the response instead of trusting comments. */
export const DISPLAY_FILTER_SECTIONS = {
  highpass: HP_SECTIONS,
  notch: NOTCH_SECTION,
  lowpass: LP_SECTIONS,
} as const;

/** Display filter state for a single channel: clinical chain + cosmetics. */
export interface DisplayFilter {
  hp: CascadeState[];
  notch: CascadeState[];
  lp: CascadeState[];
  monitorLp: CascadeState[];
  /** Savitzky-Golay ring buffer (a 4-sample / 12.5 ms display latency). */
  sg: number[];
  sgIdx: number;
  sgCount: number;
}

export function createDisplayFilter(): DisplayFilter {
  return {
    hp: createCascadeState(HP_SECTIONS.length),
    notch: createCascadeState(NOTCH_SECTION.length),
    lp: createCascadeState(LP_SECTIONS.length),
    monitorLp: createCascadeState(MONITOR_LP_SECTIONS.length),
    sg: new Array<number>(SG_LEN).fill(0),
    sgIdx: 0,
    sgCount: 0,
  };
}

/** One Savitzky-Golay step. Passes samples through until the window fills. */
function savitzkyGolay(filter: DisplayFilter, sample: number): number {
  filter.sg[filter.sgIdx] = sample;
  filter.sgIdx = (filter.sgIdx + 1) % SG_LEN;
  if (filter.sgCount < SG_LEN) {
    filter.sgCount++;
    return sample; // window not full yet — don't fabricate a smoothed value
  }
  let acc = 0;
  for (let k = 0; k < SG_LEN; k++) {
    acc += SG_KERNEL[k]! * filter.sg[(filter.sgIdx + k) % SG_LEN]!;
  }
  return acc / SG_NORM;
}

/**
 * Filter one sample for the LIVE SCREEN.
 * Clinical chain (baseline → mains → anti-alias) then the cosmetic stage.
 * Never call this on data destined for the report — see reportFilter.ts.
 */
export function filterSample(filter: DisplayFilter, sample: number): number {
  // 1. Remove baseline wander (breathing / electrode drift)
  let v = processCascade(HP_SECTIONS, filter.hp, sample);
  // 2. Remove 50 Hz powerline hum
  v = processCascade(NOTCH_SECTION, filter.notch, v);
  // 3. Diagnostic-bandwidth low-pass (this is where the reference stops)
  v = processCascade(LP_SECTIONS, filter.lp, v);
  // 4. COSMETIC: monitor-mode bandwidth — removes EMG and mains residue
  v = processCascade(MONITOR_LP_SECTIONS, filter.monitorLp, v);
  // 5. COSMETIC: morphology-preserving smoother
  return savitzkyGolay(filter, v);
}

/* ══════════════════════════════════════════════════════════════════
   FILTER TWO, DERIVE SIX — order matters, and we had it backwards.

   Only Lead I and Lead II are measured. The other four are exact linear
   combinations of them. This code used to run SIX independent filter
   chains, one per lead, including the four derived ones. That is wrong,
   and the reference monitor carries an explicit warning against it
   (ecg_monitor.py, the online capture thread):

     "Running independent IIR chains on derived leads creates separate
      transient settling trajectories, breaking Einthoven relationships
      and causing double-beat / amplitude errors during first ~3s."

   Each chain settles on its own trajectory, so III's filter state is not
   (II's state − I's state). The identity III = II − I holds on the input
   but NOT on the output, and the residue lands hardest on the derived
   leads — III and aVF ripple while I and aVL look comparatively clean.

   So: filter I and II, then derive the other four from the FILTERED
   values, exactly as the reference does.
   ══════════════════════════════════════════════════════════════════ */

/** Filter state for the two MEASURED channels. The rest are algebra. */
export interface SixLeadFilter {
  I: DisplayFilter;
  II: DisplayFilter;
}

export function createSixLeadFilter(): SixLeadFilter {
  return { I: createDisplayFilter(), II: createDisplayFilter() };
}

/** Filter the two measured leads, then derive all six. */
export function filterSixLeads(
  filters: SixLeadFilter,
  rawI: number,
  rawII: number,
): SixLeadSample {
  return deriveLeads(filterSample(filters.I, rawI), filterSample(filters.II, rawII));
}

/* ──────────────────────────────────────────────────────────────
   DC offset tracker (ported verbatim from SixLeadECGScreen).
   Keeps each trace vertically centered: fast average for the first
   2 seconds, then a very slow EMA so real ST-segment shifts survive.
   ────────────────────────────────────────────────────────────── */
export interface DCTracker {
  [lead: string]: { sum: number; count: number; dc: number };
}

export function createDCTracker(): DCTracker {
  const t: DCTracker = {};
  (['I', 'II', 'III', 'aVR', 'aVL', 'aVF'] as LimbLeadName[]).forEach((l) => {
    t[l] = { sum: 0, count: 0, dc: 0 };
  });
  return t;
}

/** Returns the sample with its DC offset removed. */
export function updateDC(tracker: DCTracker, leadName: LimbLeadName, val: number): number {
  const t = tracker[leadName];
  if (!t) return val;
  if (t.count < 320 * 2) {
    t.sum += val;
    t.count++;
    t.dc = t.sum / t.count;
  } else {
    t.dc = t.dc * 0.999 + val * 0.001;
  }
  return val - t.dc;
}

// v3.0.0 — Filter two leads and derive six (was: six independent chains, which broke Einthoven on the derived leads); adds the display-only cosmetic stage (40 Hz monitor LP + Savitzky-Golay) so the live trace matches the reference GUI. Report path untouched.
