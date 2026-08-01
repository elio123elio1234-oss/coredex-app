/* ==================================================================
   Guided chest protocol constants — ported from BEATALIGN.
   ⚠️ Clinically meaningful: 10 s per electrode is the recording length
   the protocol requires. Do not shorten for convenience.
   ================================================================== */

import type { ElectrodeName } from '../types/scan';

/** The precordial protocol runs strictly in this order. */
export const CHEST_LEAD_ORDER: readonly ElectrodeName[] = [
  'V1',
  'V2',
  'V3',
  'V4',
  'V5',
  'V6',
] as const;

/** Seconds of ECG captured at each electrode. */
export const GUIDED_REC_SECS = 10;

/** Seconds the watch must be held steady on target before recording starts. */
export const GUIDED_STAB_SECS = 2.5;

/** Milliseconds the lock must persist before we trust it (anti-flicker). */
export const GUIDED_LOCK_CONFIRM_MS = 500;

/** Pause after a lead completes, so the user can register the success. */
export const GUIDED_LEAD_DONE_MS = 1500;

/** State machine tick rate. */
export const GUIDED_TICK_MS = 100;

/**
 * Which V5/V6 geometry the PRODUCTION measurement tab draws:
 *   'enhanced' — occlusion-resistant, hard V4<V5<V6 ordering (field-validated
 *                in Live Scan; keeps V5/V6 from collapsing onto V4).
 *   'frozen'   — the original frozen computeElectrodes V5/V6.
 * ⚠️ V1–V4 are always the frozen geometry. This flag only affects V5/V6.
 * INSTANT REVERT: flip this to 'frozen' to restore the original behaviour with
 * a one-line change (no other edits needed).
 */
export const CHEST_V5V6_MODE: 'enhanced' | 'frozen' = 'enhanced';

// v1.2.0 — Guided chest protocol timing constants (V1→V6, 10 s each) + production V5/V6 geometry switch.
