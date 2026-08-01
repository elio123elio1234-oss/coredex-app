/* ==================================================================
   useRecordingView — turn a STORED recording into something drawable.
   Ported from the web hook of the same name; the chain is identical
   because it is the frozen one (root CLAUDE.md §2.3).

        stored raw Lead I + Lead II  (base64 Float32, millivolts)
                     │
                     ▼  decodeChannel
                deriveLeads()      → I, II, III, aVR, aVL, aVF
                     │
                     ▼  reportFilterLeads(settings.filters)
                filtered six leads
                     │
                     └── analyseLimbEcg()  → rate, axis, intervals, amplitudes

   Everything is recomputed from RAW whenever the filter settings change,
   which is exactly why the raw channels are what we persist. Turning the
   notch off is not a cosmetic overlay — it genuinely re-runs the chain and
   re-measures.

   ══ THE MEASUREMENTS FOLLOW THE FILTERS, ON PURPOSE ══
   `analysis` is computed from the SAME waveform on screen. If a reader
   switches the smoother off and the QRS duration shifts by 4 ms, that is
   information about how much the filter was doing — not a bug. Measuring a
   different signal from the one displayed would be worse: the numbers could
   not be checked against the trace they claim to describe.

   ══ COST, AND WHY IT MATTERS MORE HERE THAN ON THE WEB ══
   Six leads of median-baseline + zero-phase notch + Savitzky-Golay over a
   10 s recording is real work, and on a phone it happens on the SAME
   JavaScript thread that runs the scroll. It is memoised on
   [recording.id, filter stages] so it runs once per study and once per
   filter change — never on a zoom, a pan, a lead focus or a re-render.
   Anything that would make this recompute per frame is a bug, not a
   slowdown.
   ================================================================== */

import { useMemo } from 'react';
import {
  analyseLimbEcg,
  decodeChannel,
  deriveLeads,
  LIMB_LEAD_ORDER,
  reportFilterLeads,
  type EcgAnalysis,
  type LimbLeadName,
  type StoredRecording,
} from '@cyphix/shared';
import type { ViewerSettings } from '@/features/history/viewerSettings';

export interface RecordingView {
  /** Filtered, display-ready leads. */
  leads: Record<LimbLeadName, Float32Array>;
  /** Measurements taken from exactly these waveforms. */
  analysis: EcgAnalysis;
  sampleRate: number;
  durationSec: number;
}

export function useRecordingView(
  recording: StoredRecording | undefined,
  settings: ViewerSettings,
): RecordingView | null {
  const { baseline, notch, smoothing } = settings.filters;

  return useMemo(() => {
    if (!recording) return null;

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

    const filtered = reportFilterLeads(derived, recording.sampleRate, 'II', {
      baseline,
      notch,
      smoothing,
    }) as Record<LimbLeadName, Float32Array>;

    return {
      leads: filtered,
      analysis: analyseLimbEcg(filtered, recording.sampleRate),
      sampleRate: recording.sampleRate,
      durationSec: n / recording.sampleRate,
    };
    /* `recording.id` is the identity that matters; the object itself is a
       fresh reference on every RTK Query render and would thrash the memo —
       which on a phone means re-running six lead-filters mid-scroll. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recording?.id, recording?.sampleRate, baseline, notch, smoothing]);
}

// v1.0.0 — Rehydrates a stored recording: decode → derive six → filter per
//          settings → measure. Memoised on the study and the filter stages only.
