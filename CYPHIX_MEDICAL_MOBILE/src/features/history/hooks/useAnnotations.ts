/* ==================================================================
   useAnnotations — add, move and remove clinician markers on a recording.

   Wraps the RTK Query mutations so components never touch the API, and
   attaches the author + audit entry in ONE place. Attribution is not
   optional: an unattributed note in a clinical record is worthless at best
   (nobody can ask the author what they meant) and misleading at worst.

   The permission is checked HERE as well as in the toolbar. A hidden button
   is a UI convenience; this is the actual gate, so no future caller can
   reach the mutation by rendering their own button.
   ================================================================== */

import { useCallback } from 'react';
import type { RecordingAnnotation } from '@cyphix/shared';
import { useCurrentUser } from '@/features/auth/useCurrentUser';
import { logAudit } from '@/services/audit/auditLogger';
import {
  useAddAnnotationMutation,
  useRemoveAnnotationMutation,
  useUpdateAnnotationMutation,
} from '@/services/api/endpoints/recordingApi';

export interface UseAnnotationsResult {
  add: (args: { recordingId: string; lead: string; sampleIndex: number; text: string }) => void;
  remove: (recordingId: string, annotationId: string) => void;
  /** Move an existing marker to a new sample (drag), or retext it. */
  move: (args: {
    recordingId: string;
    annotation: RecordingAnnotation;
    sampleIndex: number;
  }) => void;
  retext: (recordingId: string, annotationId: string, text: string) => void;
  busy: boolean;
}

export function useAnnotations(allowed: boolean): UseAnnotationsResult {
  const user = useCurrentUser();
  const [addAnnotation, addState] = useAddAnnotationMutation();
  const [removeAnnotation, removeState] = useRemoveAnnotationMutation();
  const [updateAnnotation, updateState] = useUpdateAnnotationMutation();

  const actorId = user?.id ?? 'anonymous';
  const actorRole = user?.role ?? 'guest';

  const audit = useCallback(
    (recordingId: string, detail: string, ok: boolean) =>
      logAudit({
        actor: { id: actorId, role: actorRole },
        action: 'recording:annotate',
        resourceType: 'EcgRecording',
        resourceId: recordingId,
        outcome: ok ? 'success' : 'failure',
        detail,
      }),
    [actorId, actorRole],
  );

  const add = useCallback(
    ({
      recordingId,
      lead,
      sampleIndex,
      text,
    }: {
      recordingId: string;
      lead: string;
      sampleIndex: number;
      text: string;
    }) => {
      const label = text.trim();
      if (!allowed || label === '') return;
      void addAnnotation({
        id: recordingId,
        annotation: { lead, sampleIndex, text: label, authorId: actorId },
      })
        .unwrap()
        .then(() => audit(recordingId, `add on ${lead}`, true))
        .catch(() => audit(recordingId, 'add', false));
    },
    [allowed, addAnnotation, actorId, audit],
  );

  const remove = useCallback(
    (recordingId: string, annotationId: string) => {
      if (!allowed) return;
      void removeAnnotation({ id: recordingId, annotationId })
        .unwrap()
        .then(() => audit(recordingId, 'remove', true))
        .catch(() => audit(recordingId, 'remove', false));
    },
    [allowed, removeAnnotation, audit],
  );

  /**
   * Move a marker IN PLACE (a real PATCH), keeping its id, author and
   * createdAt.
   *
   * ⚠️ On the web this was once remove-then-add, which produced the "drag
   * makes copies" bug: a drag fires many move events, each removed the
   * ORIGINAL id (stale after the first) and ADDED a fresh marker, so the
   * trace filled with duplicates. A single in-place update cannot duplicate
   * however often it is called. Callers should still commit ONCE on release
   * rather than on every touch move — but even if they don't, this can only
   * ever move the one marker.
   */
  const move = useCallback(
    ({
      recordingId,
      annotation,
      sampleIndex,
    }: {
      recordingId: string;
      annotation: RecordingAnnotation;
      sampleIndex: number;
    }) => {
      if (!allowed || sampleIndex === annotation.sampleIndex) return;
      void updateAnnotation({
        id: recordingId,
        annotationId: annotation.id,
        patch: { sampleIndex },
      })
        .unwrap()
        .then(() => audit(recordingId, 'move', true))
        .catch(() => audit(recordingId, 'move', false));
    },
    [allowed, updateAnnotation, audit],
  );

  /* Editing the LABEL is the same in-place PATCH, for the same reason: the
     note keeps its identity and its author when its wording is corrected. */
  const retext = useCallback(
    (recordingId: string, annotationId: string, text: string) => {
      const label = text.trim();
      if (!allowed || label === '') return;
      void updateAnnotation({ id: recordingId, annotationId, patch: { text: label } })
        .unwrap()
        .then(() => audit(recordingId, 'edit', true))
        .catch(() => audit(recordingId, 'edit', false));
    },
    [allowed, updateAnnotation, audit],
  );

  return {
    add,
    remove,
    move,
    retext,
    busy: addState.isLoading || removeState.isLoading || updateState.isLoading,
  };
}

// v1.0.0 — Annotation writes with attribution + audit; move/retext are in-place
//          PATCHes so a marker keeps its identity.
