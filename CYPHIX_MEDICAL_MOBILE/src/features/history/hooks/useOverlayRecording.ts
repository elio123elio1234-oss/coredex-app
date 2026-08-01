/* ==================================================================
   useOverlayRecording — load a SECOND study to ghost behind the first.
   Ported from the web hook; the alignment maths is the shared `ecgAlign`.

   ══ HOW CHANGE OVER TIME IS ACTUALLY JUDGED ══
   Two studies side by side make you compare from memory. Superimposed, a
   change in QRS width or a shifted ST segment is visible directly, because
   the eye is very good at spotting where two curves stop agreeing and very
   bad at holding a waveform in mind while it looks somewhere else. On a
   phone that gap is wider still: side-by-side means two 190 pt columns, or
   scrolling between them.

   ══ THREE WAYS TO LINE THEM UP ══
     'beat'    shift the whole ghost so beat 1 sits on beat 1. Preserves the
               ghost's own timing exactly, so intervals stay real — but the
               traces drift apart as the rate difference accumulates.
     'warp'    stretch the ghost between its P/Q/R/S/T landmarks so every
               feature lands on the target's. Every beat stays superimposed,
               at the cost of the ghost's interval information.
     'manual'  the reader drags it. Sometimes the eye is right and the
               algorithm is not, and a comparison tool that cannot be
               overridden is one that has to be trusted blindly.

   The mode and the applied offset are both surfaced so the UI can state
   them. A ghost that had been silently stretched would be the most
   misleading thing in this whole application.

   The ghost is always put through the SAME filter settings as the
   foreground, never the ones it was saved with — otherwise the shapes
   differ because of the DSP rather than the heart.
   ================================================================== */

import { useMemo } from 'react';
import { alignByFiducials, LIMB_LEAD_ORDER, type EcgAnalysis, type LimbLeadName } from '@cyphix/shared';
import { useRecordingView } from '@/features/history/hooks/useRecordingView';
import type { ViewerSettings } from '@/features/history/viewerSettings';
import { useGetRecordingQuery } from '@/services/api/endpoints/recordingApi';

export type OverlayAlignMode = 'beat' | 'warp' | 'manual';

export interface OverlayView {
  /** Ghost leads on the foreground's timeline, ready to draw. */
  leads: Record<LimbLeadName, Float32Array>;
  sampleRate: number;
  mode: OverlayAlignMode;
  /** Samples the ghost was shifted by (beat/manual modes). */
  shiftSamples: number;
  shiftMs: number;
  /** Landmark correspondences used (warp mode). */
  anchorCount: number;
  beatsMatched: number;
  /** True when the requested alignment could not be computed. */
  degraded: boolean;
  recordedAt: string;
  isLoading: boolean;
}

/** Shift a signal by `shift` samples onto a fixed-length timeline. */
function shiftSignal(src: Float32Array, shift: number, length: number): Float32Array {
  const out = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    const j = i - shift;
    out[i] = j >= 0 && j < src.length ? src[j] : 0;
  }
  return out;
}

export function useOverlayRecording(
  overlayId: string | null,
  settings: ViewerSettings,
  foreground: { analysis: EcgAnalysis; leads: Record<LimbLeadName, Float32Array> } | null,
  mode: OverlayAlignMode,
  /** Reader's manual nudge, in samples. Applied in every mode. */
  manualShift: number,
): OverlayView | null {
  const query = useGetRecordingQuery(overlayId ?? '', { skip: !overlayId });
  const view = useRecordingView(query.data, settings);

  return useMemo(() => {
    if (!overlayId) return null;

    const empty: OverlayView = {
      leads: {} as Record<LimbLeadName, Float32Array>,
      sampleRate: 0,
      mode,
      shiftSamples: 0,
      shiftMs: 0,
      anchorCount: 0,
      beatsMatched: 0,
      degraded: true,
      recordedAt: query.data?.recordedAt ?? '',
      isLoading: query.isLoading,
    };
    if (!view || !query.data || !foreground) return empty;

    const length = foreground.leads.II.length;
    const leads = {} as Record<LimbLeadName, Float32Array>;
    let shift = manualShift;
    let anchorCount = 0;
    let beatsMatched = 0;
    let degraded = false;

    if (mode === 'warp') {
      /* Warp each lead against ITS OWN counterpart. The landmark positions
         are the same across leads (one heart), but the amplitudes are not,
         so detection has to run per lead or a flat lead would drag the
         anchors around. */
      for (const lead of LIMB_LEAD_ORDER) {
        const result = alignByFiducials(
          view.leads[lead],
          view.analysis.rPeaks,
          foreground.leads[lead],
          foreground.analysis.rPeaks,
          view.sampleRate,
        );
        leads[lead] =
          manualShift === 0 ? result.warped : shiftSignal(result.warped, manualShift, length);
        if (lead === 'II') {
          anchorCount = result.anchorCount;
          beatsMatched = result.beatsMatched;
          degraded = !result.applied;
        }
      }
    } else {
      // 'beat' lines up the first R peaks; 'manual' starts from raw and lets
      // the reader do it. Both then take the manual nudge on top.
      const fgFirst = foreground.analysis.rPeaks[0];
      const ghostFirst = view.analysis.rPeaks[0];
      const beatShift =
        mode === 'beat' && fgFirst !== undefined && ghostFirst !== undefined
          ? fgFirst - ghostFirst
          : 0;
      degraded =
        mode === 'beat' && beatShift === 0 && (fgFirst === undefined || ghostFirst === undefined);
      shift = beatShift + manualShift;
      for (const lead of LIMB_LEAD_ORDER) {
        leads[lead] = shiftSignal(view.leads[lead], shift, length);
      }
    }

    return {
      leads,
      sampleRate: view.sampleRate,
      mode,
      shiftSamples: shift,
      shiftMs: view.sampleRate > 0 ? (shift / view.sampleRate) * 1000 : 0,
      anchorCount,
      beatsMatched,
      degraded,
      recordedAt: query.data.recordedAt,
      isLoading: false,
    };
  }, [overlayId, view, query.data, query.isLoading, foreground, mode, manualShift]);
}

// v1.0.0 — Three alignment modes (beat shift / fiducial warp / manual nudge),
//          each stated in the UI, ported from web.
