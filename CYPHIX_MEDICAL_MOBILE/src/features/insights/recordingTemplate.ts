/* ==================================================================
   recordingTemplate — one stored recording → one representative beat.

   The same chain `useRecordingView` runs, with two deliberate
   differences, and both of them are the reason this is a separate file
   rather than a call into that hook:

     1. THE FILTERS ARE PINNED (`IDENTITY_FILTERS`). The viewer re-measures
        whenever the reader toggles a stage, which is right for a viewer
        and wrong for a baseline: an identity that changed when someone
        switched the notch off would not be an identity.
     2. IT IS NOT A HOOK. Forty studies are processed in a loop, off the
        render path, so this has to be an ordinary function.

        stored raw Lead I + Lead II  (base64 Float32, mV)
                     │
                     ▼  decodeChannel
                deriveLeads()        → I, II, III, aVR, aVL, aVF
                     │
                     ▼  reportFilterLeads(IDENTITY_FILTERS)
                     ▼  analyseLimbEcg()      → R peaks + intervals
                     ▼  buildBeatTemplates()  → the median beat, per lead
   ================================================================== */

import {
  analyseLimbEcg,
  buildBeatTemplates,
  decodeChannel,
  deriveLeads,
  LIMB_LEAD_ORDER,
  reportFilterLeads,
  TEMPLATE_VERSION,
  type EcgLeadName,
  type LimbLeadName,
  type RecordingTemplate,
  type StoredRecording,
} from '@cyphix/shared';
import { IDENTITY_FILTERS } from '@/services/db/templateCache';

/**
 * Derive the template of one recording, or null when there is nothing to
 * derive from.
 *
 * Null is not an error — a 3-second strip or a flat lead legitimately has
 * no representative beat, and the identity handles a study it never got a
 * template for by simply not counting it. Returning an empty template
 * instead would put a flat line into the patient's signature.
 */
export function templateFromRecording(recording: StoredRecording): RecordingTemplate | null {
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
    IDENTITY_FILTERS,
  ) as Record<LimbLeadName, Float32Array>;

  const analysis = analyseLimbEcg(filtered, recording.sampleRate);

  /* Widening to `EcgLeadName` is where the 12-lead future gets in: the
     template builder is handed "the leads this study had", and the day a
     study carries V1–V6 the only change is that this map is bigger. */
  const leads: Partial<Record<EcgLeadName, Float32Array>> = filtered;
  const built = buildBeatTemplates(leads, analysis.rPeaks, recording.sampleRate, 'II');
  if (built.beatsUsed === 0) return null;

  return {
    recordingId: recording.id,
    recordedAt: recording.recordedAt,
    templateVersion: TEMPLATE_VERSION,
    sampleRate: built.sampleRate,
    rIndex: built.rIndex,
    leads: built.leads,
    sqi: analysis.quality.sqi,
    beatsUsed: built.beatsUsed,
    intervals: {
      prMs: analysis.intervals.prMs,
      qrsMs: analysis.intervals.qrsMs,
      qtMs: analysis.intervals.qtMs,
      // Bazett is the convention the rest of the app reports, so the
      // baseline is built on the same correction the cards show. Mixing
      // Bazett into a Fridericia baseline would look like a 20 ms drift.
      qtcMs: analysis.intervals.qtcBazettMs,
      axisDegrees: analysis.axis.degrees,
      bpm: analysis.rate.bpm,
    },
    isSimulated: recording.isSimulated,
  };
}

// v1.0.0 — Stored recording → representative beat, through the PINNED identity
//          filter chain rather than the viewer's current one, as a plain
//          function so a backfill can loop over forty of them.
