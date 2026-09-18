/* ==================================================================
   useRecordingView — turn a STORED recording into something drawable.
   Ported from the web hook of the same name; the chain is identical
   because it is the frozen one (root CLAUDE.md §2.3).

        stored raw Lead I + Lead II (+ Lead II-b)  (base64 Float32, mV)
                     │
                     ▼  limbLeadsFromRecording — decode, FUSE the two
                     │  Lead II copies when there are two and
                     │  `settings.fusion` is on, then deriveLeads()
                I, II, III, aVR, aVL, aVF
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

   ══ FUSION IS A READING DECISION TOO ══
   A dual-Lead-II recording (firmware v3+) stores both copies raw, and the
   fused Lead II is an OPINION about them — so it is a switch, like the
   stages, and it is upstream of `deriveLeads`: with it on, III / aVR /
   aVL / aVF are computed from the fused trace, and every measurement
   follows. `fusion` on the view says what was actually done (null = not
   attempted; `mode: 'single'` = attempted and declined, with the reason),
   so the screen never has to guess. A recording with one copy never
   reaches any of this and renders exactly as it always has.

   ══ COST, AND WHY IT MATTERS MORE HERE THAN ON THE WEB ══
   Six leads of median-baseline + zero-phase notch + Savitzky-Golay over a
   10 s recording is real work, and on a phone it happens on the SAME
   JavaScript thread that runs the scroll. It is memoised on
   [recording.id, filter stages, fusion] so it runs once per study and once per
   filter change — never on a zoom, a pan, a lead focus or a re-render.
   Anything that would make this recompute per frame is a bug, not a
   slowdown.
   ================================================================== */

import { useMemo } from 'react';
import {
  analyseLimbEcg,
  reportFilterLeads,
  type EcgAnalysis,
  type LeadFusionInfo,
  type LimbLeadName,
  type StoredRecording,
} from '@cyphix/shared';
import type { ViewerSettings } from '@/features/history/viewerSettings';
import { limbLeadsFromRecording } from '@/services/ecg/storedLimbLeads';

export interface RecordingView {
  /** Filtered, display-ready leads. */
  leads: Record<LimbLeadName, Float32Array>;
  /** Measurements taken from exactly these waveforms. */
  analysis: EcgAnalysis;
  sampleRate: number;
  durationSec: number;
  /** The recording carries a second Lead II copy — i.e. the fusion switch
      means something and should be offered. */
  hasSecondCopy: boolean;
  /** What the fusion did to THIS view. null = not attempted (one copy, or
      switched off); `mode: 'single'` = attempted and declined. */
  fusion: LeadFusionInfo | null;
}

export function useRecordingView(
  recording: StoredRecording | undefined,
  settings: ViewerSettings,
): RecordingView | null {
  const { baseline, notch, smoothing } = settings.filters;
  const { fusion } = settings;

  return useMemo(() => {
    if (!recording) return null;

    const raw = limbLeadsFromRecording(recording, { fusion });
    const n = raw.samples;
    if (n === 0) return null;
    const derived = raw.leads;

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
      hasSecondCopy: raw.hasSecondCopy,
      fusion: raw.fusion,
    };
    /* `recording.id` is the identity that matters; the object itself is a
       fresh reference on every RTK Query render and would thrash the memo —
       which on a phone means re-running six lead-filters mid-scroll. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recording?.id, recording?.sampleRate, baseline, notch, smoothing, fusion]);
}

// v1.1.0 — Dual Lead II: decoding goes through `limbLeadsFromRecording`, so a
//          recording with a second copy is fused (when `settings.fusion` is on)
//          BEFORE the frozen `deriveLeads`; the view reports `hasSecondCopy`
//          and what the fusion did. One-copy recordings: unchanged, bit for bit.
// v1.0.0 — Rehydrates a stored recording: decode → derive six → filter per
//          settings → measure. Memoised on the study and the filter stages only.
