/* ==================================================================
   useIdentityGhost — the patient's OWN representative beat, as a ghost
   the viewer can lay over the strip it is already showing.

   ══ WHY IT RETURNS AN `OverlayView` ══
   The viewer already knows how to draw a ghost, nudge it, colour it,
   legend it and put a status line under it (`useOverlayRecording`,
   `EcgReviewStrip`, `CompareSheet`). None of that machinery cares where
   the second curve came from. So this hook produces the SAME shape rather
   than a parallel one, and the screen keeps one ghost concept with two
   sources instead of two ghost concepts — which is the difference between
   adding a comparison and adding a second comparison feature.

   ══ WHAT IS DIFFERENT, AND WHAT THE UI MUST SAY ══
   The three alignment modes do not apply and are not offered. They exist
   because two recordings have two independent timelines; the identity has
   none of its own — every beat is stamped ON the foreground's R peaks, so
   alignment is exact by construction (`identityGhost.ts`).

   ⚠️ The consequence has to reach the screen: the ghost's RHYTHM is the
   foreground's own, so an RR measured off it is the trace's own RR read
   twice. It carries SHAPE. `ovIdBorrowsRhythm` is that sentence and it is
   not decoration.

   ══ COST ══
   The identity is only built when the reader has actually selected it —
   `useEcgIdentity({ enabled })`. A cold pass re-analyses the whole history,
   which is the point on the Insights tab and would be seconds of unasked
   work here.
   ================================================================== */

import { useMemo } from 'react';
import {
  IDENTITY_OVERLAY_ID,
  stampIdentityBeats,
  type EcgAnalysis,
  type LimbLeadName,
} from '@cyphix/shared';
import type { OverlayView } from '@/features/history/hooks/useOverlayRecording';
import { useEcgIdentity } from '@/features/insights/useEcgIdentity';

export function useIdentityGhost(
  /** True when the reader has picked the ECG ID as the comparison. */
  active: boolean,
  patientId: string | undefined,
  foreground: { analysis: EcgAnalysis; leads: Record<LimbLeadName, Float32Array> } | null,
  sampleRate: number,
): OverlayView | null {
  const view = useEcgIdentity(patientId, { enabled: active });
  const identity = view.identity;

  return useMemo(() => {
    if (!active) return null;

    const empty: OverlayView = {
      leads: {} as Record<LimbLeadName, Float32Array>,
      sampleRate,
      // 'beat' is the honest label of what happened — every beat was put
      // on a beat. It is never offered as a CHOICE for this ghost.
      mode: 'beat',
      shiftSamples: 0,
      shiftMs: 0,
      anchorCount: 0,
      beatsMatched: 0,
      degraded: true,
      recordedAt: identity?.updatedAt ?? '',
      isLoading: view.isLoading || view.isBuilding || view.progress !== null,
    };
    if (!identity || !foreground) return empty;

    const length = foreground.leads.II?.length ?? 0;
    const ghost = stampIdentityBeats(
      identity,
      foreground.leads,
      foreground.analysis.rPeaks,
      length,
      sampleRate,
    );

    /* Nothing to draw is not an error state to hide — a limb-only
       identity has no V leads, and an identity with no eligible study has
       no leads at all. `degraded` is what the sheet already renders as
       "this comparison could not be made". */
    if (ghost.leadsCovered.length === 0) return empty;

    return {
      ...empty,
      leads: ghost.leads as Record<LimbLeadName, Float32Array>,
      beatsMatched: ghost.beatsStamped,
      /* Reused rather than given a field of its own: `anchorCount` is
         "what the caller needs to know about this alignment", and for
         this ghost the one thing worth knowing is whether the beats were
         too close together for the template to fit between them. The
         sheet reads it through `crowded` below. */
      anchorCount: ghost.crowded ? 1 : 0,
      degraded: false,
      isLoading: false,
    };
  }, [active, identity, foreground, sampleRate, view.isLoading, view.isBuilding, view.progress]);
}

export { IDENTITY_OVERLAY_ID };

// v1.0.0 — The ECG ID as a viewer ghost, shaped as an `OverlayView` so the
//          screen keeps ONE ghost concept with two sources rather than two
//          ghost features. Built only when selected — a cold identity pass
//          re-analyses the whole history. Alignment modes do not apply and are
//          not offered: every beat is stamped on the foreground's own R peaks,
//          which is also why the ghost's rhythm is the foreground's and the UI
//          has to say so.
