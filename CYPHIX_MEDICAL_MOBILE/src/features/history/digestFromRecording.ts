/* ==================================================================
   digestFromRecording — one stored recording → one History digest:
   the screening verdict and a small preview strip, for the list row.

   The same chain `useRecordingView` runs, with the same two deliberate
   differences `recordingTemplate.ts` has, for the same reasons:

     1. THE FILTERS ARE PINNED (`DIGEST_FILTERS`). The viewer re-measures
        whenever the reader toggles a stage; a LIST VERDICT may not — a
        pill that changed when someone switched the notch off would
        silently redefine what the row claims about the recording.
     2. IT IS NOT A HOOK. Dozens of studies are processed in a loop, off
        the render path, so this has to be an ordinary function.

        stored raw Lead I + Lead II  (base64 Float32, mV)
                     │
                     ▼  decodeChannel
                deriveLeads()        → I, II, III, aVR, aVL, aVF
                     │
                     ▼  reportFilterLeads(DIGEST_FILTERS)
                     ▼  analyseLimbEcg()
                     ├─ screenLimbEcg(ctx)   → the verdict (unless simulated)
                     └─ lead II window       → the 4 s preview, downsampled

   ══ THE HONESTY RULES BIND HERE TOO ══
   A SIMULATED recording is never screened — `screeningLevel` is null and
   the row shows what the recording IS (the SIMULATION chip). The caller
   decides the context via `screeningContextFor`, so sex/age reach the
   engine only when the study provably belongs to the active patient.
   ================================================================== */

import {
  analyseLimbEcg,
  decodeChannel,
  deriveLeads,
  LIMB_LEAD_ORDER,
  reportFilterLeads,
  screenLimbEcg,
  type LimbLeadName,
  type ScreeningContext,
  type StoredRecording,
} from '@cyphix/shared';
import { INTERPRETATION_ENABLED } from '@/config/featureFlags';
import { DIGEST_FILTERS, type StudyDigest } from '@/services/db/studyDigestCache';

/** Window the preview shows. Four seconds at a fixed time scale is the
    Kardia-proven size: legible rhythm, not ten seconds squeezed to noise. */
const PREVIEW_SECONDS = 4;
/** Skip the settle-in — the first half second is electrode contact, not heart. */
const PREVIEW_SKIP_SECONDS = 0.5;
/** ≤ 250 min/max pairs — ~2.7 kB encoded per study, peak-preserving. */
const PREVIEW_MAX_SAMPLES = 500;

/**
 * Min/max-pair downsample, in temporal order — the same argument as
 * `buildEcgPath`'s decimation: plain "every Nth sample" drops R-peaks,
 * the sharpest and most important feature in the trace.
 */
function downsamplePeakPreserving(data: Float32Array, maxSamples: number): Float32Array {
  if (data.length <= maxSamples) return data;
  const pairs = Math.floor(maxSamples / 2);
  const out = new Float32Array(pairs * 2);
  const perBucket = data.length / pairs;
  for (let b = 0; b < pairs; b++) {
    const from = Math.floor(b * perBucket);
    const to = Math.min(data.length, Math.max(from + 1, Math.floor((b + 1) * perBucket)));
    let min = data[from];
    let max = data[from];
    let minIdx = from;
    let maxIdx = from;
    for (let i = from; i < to; i++) {
      if (data[i] < min) {
        min = data[i];
        minIdx = i;
      }
      if (data[i] > max) {
        max = data[i];
        maxIdx = i;
      }
    }
    // Emit in the order they occurred, so the line never travels backwards.
    out[b * 2] = minIdx <= maxIdx ? min : max;
    out[b * 2 + 1] = minIdx <= maxIdx ? max : min;
  }
  return out;
}

/**
 * Derive the digest of one recording, or null when there is nothing to
 * derive from. Null is not an error — an empty channel has no preview and
 * no verdict, and the row simply keeps its metadata-only face.
 */
export function digestFromRecording(
  recording: StoredRecording,
  context: ScreeningContext,
  ctxKey: string,
): StudyDigest | null {
  const rawI = decodeChannel(recording.channels.leadI);
  const rawII = decodeChannel(recording.channels.leadII);
  const n = Math.min(rawI.length, rawII.length);
  if (n === 0) return null;

  const derived: Record<LimbLeadName, Float32Array> = {
    I: new Float32Array(n),
    II: new Float32Array(n),
    III: new Float32Array(n),
    aVR: new Float32Array(n),
    aVL: new Float32Array(n),
    aVF: new Float32Array(n),
  };
  for (let i = 0; i < n; i++) {
    const s = deriveLeads(rawI[i], rawII[i]);
    for (const lead of LIMB_LEAD_ORDER) derived[lead][i] = s[lead];
  }

  const filtered = reportFilterLeads(
    derived,
    recording.sampleRate,
    'II',
    DIGEST_FILTERS,
  ) as Record<LimbLeadName, Float32Array>;

  const analysis = analyseLimbEcg(filtered, recording.sampleRate);

  /* ★ v0.59.0 — skipped entirely while this build does not interpret.
     Not merely hidden: this runs 43 rules over six leads for EVERY study in
     the history, on the JS thread, the first time the list is opened, and
     the result would go straight into a cache nothing reads. The null it
     writes is the same null a simulated recording has always produced. */
  const screeningLevel =
    !INTERPRETATION_ENABLED || recording.isSimulated
      ? null
      : screenLimbEcg(filtered, analysis, context).level;

  /* The preview window: [0.5 s, 4.5 s) when the recording affords it,
     from 0 when it is short. Lead II — the rhythm lead, the one the rate
     was computed from and the one every monitor shows first. */
  const durationSec = n / recording.sampleRate;
  const startSec =
    durationSec > PREVIEW_SECONDS + PREVIEW_SKIP_SECONDS ? PREVIEW_SKIP_SECONDS : 0;
  const from = Math.floor(startSec * recording.sampleRate);
  const to = Math.min(n, from + Math.floor(PREVIEW_SECONDS * recording.sampleRate));
  const window = filtered.II.subarray(from, to);
  if (window.length < 2) return null;

  const previewSamples = downsamplePeakPreserving(window, PREVIEW_MAX_SAMPLES);
  const windowSec = window.length / recording.sampleRate;
  const previewSampleRate = previewSamples.length / windowSec;

  return {
    recordingId: recording.id,
    screeningLevel,
    previewSamples,
    previewSampleRate,
    bpm: analysis.rate.bpm,
    ctxKey,
    isSimulated: recording.isSimulated,
  };
}

// v1.1.0 — The screening pass is skipped entirely while INTERPRETATION_ENABLED
//          is false: 43 rules over six leads per study, for a label nothing
//          renders, is work nobody asked for. Same null a simulation produces.
// v1.0.0 — Stored recording → History digest (verdict + 4 s lead II preview +
//          bpm), through the PINNED digest filter chain, as a plain function so
//          a backfill can loop over dozens of them.
