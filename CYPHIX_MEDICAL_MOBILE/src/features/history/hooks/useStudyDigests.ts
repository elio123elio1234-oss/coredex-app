/* ==================================================================
   useStudyDigests — the History rows' verdicts and previews, off the
   render path.

   The backfill pattern is `useEcgIdentity`'s, copied rather than
   reinvented (its header is the full argument): cached digests are
   published immediately; anything missing is computed ONE STUDY AT A
   TIME, with a real macrotask yield between studies so the scroll, the
   dock and the segmented control stay alive; waveforms are fetched with
   `subscribe: false` so they are released the moment they are used; the
   pass starts only after `runAfterInteractions` and abandons itself on
   unmount.

   ══ WHAT IS DIFFERENT FROM useEcgIdentity ══
   * It takes the ROWS the screen already has — no second list query.
   * Staleness is not only "missing": a digest also goes stale when the
     row's expected screening context changes (`ctxKey` — the card loading
     after the list, a corrected birth date). `staleDigestIds` folds both
     cases into one list.
   * Simulated studies ARE digested — their preview is real pixels of what
     is stored — but their verdict is null, per the honesty rule that
     synthetic data is never screened.
   ================================================================== */

import { useEffect, useMemo, useRef, useState } from 'react';
import { InteractionManager } from 'react-native';
import type { RecordingListItem } from '@cyphix/shared';
import { digestFromRecording } from '@/features/history/digestFromRecording';
import { screeningContextFor } from '@/features/history/patientContext';
import { usePatientCard } from '@/features/profile/usePatientCard';
import { recordingApi } from '@/services/api/endpoints/recordingApi';
import {
  flushDigests,
  pruneDigests,
  readDigests,
  stageDigests,
  staleDigestIds,
  type StudyDigest,
} from '@/services/db/studyDigestCache';
import { useAppDispatch } from '@/store/hooks';

/** Digests staged before the disk is touched. See `studyDigestCache` header. */
const FLUSH_EVERY = 5;

export interface StudyDigestsView {
  /** By recording id. A row absent here simply has no digest yet. */
  digests: Record<string, StudyDigest>;
  /** Rows digested / rows to digest, during a backfill. Null when idle. */
  progress: { done: number; total: number } | null;
}

export function useStudyDigests(rows: RecordingListItem[] | undefined): StudyDigestsView {
  const dispatch = useAppDispatch();
  const { card, patientId, isDemo } = usePatientCard();

  const [digests, setDigests] = useState<Record<string, StudyDigest>>({});
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  /* The identity of the work: the row ids plus the context the ACTIVE
     patient would contribute. Depending on `rows`/`card` directly would
     restart the pass on every RTK re-render — fresh references each time. */
  const workKey = useMemo(() => {
    const ids = (rows ?? []).map((r) => r.id).join(',');
    const ctx = `${isDemo ? 'demo' : ''}|${patientId ?? ''}|${card.gender ?? ''}|${card.birthDate ?? ''}`;
    return `${ids}#${ctx}`;
  }, [rows, card.gender, card.birthDate, patientId, isDemo]);

  const cancelled = useRef(false);
  useEffect(() => {
    cancelled.current = false;
    return () => {
      cancelled.current = true;
    };
  }, []);

  useEffect(() => {
    if (!rows || rows.length === 0) {
      setDigests({});
      setProgress(null);
      return;
    }
    let stop = false;
    let handle: { cancel: () => void } | null = null;

    /* Per-row expected context, resolved once per pass. */
    const expected = rows.map((r) => ({
      id: r.id,
      subject: r.subject,
      ...screeningContextFor(r.subject, card, patientId, isDemo),
    }));

    const publish = (list: StudyDigest[]) => {
      const map: Record<string, StudyDigest> = {};
      for (const d of list) map[d.recordingId] = d;
      setDigests(map);
    };

    const run = async () => {
      /* A deleted study must not keep a verdict on file. Pruning first
         also keeps the one heavy cache entry from growing without bound. */
      await pruneDigests(rows.map((r) => r.id));

      const cached = await readDigests();
      if (stop || cancelled.current) return;
      // Show what is already known immediately — with a warm cache this is
      // the entire answer and nothing below runs.
      publish(cached);

      const stale = await staleDigestIds(expected.map(({ id, ctxKey }) => ({ id, ctxKey })));
      if (stop || cancelled.current || stale.length === 0) {
        setProgress(null);
        return;
      }

      setProgress({ done: 0, total: stale.length });
      let sinceFlush = 0;

      for (let i = 0; i < stale.length; i++) {
        if (stop || cancelled.current) break;
        const row = expected.find((e) => e.id === stale[i]);
        if (!row) continue;

        try {
          /* `subscribe: false`: a one-shot read — subscribing would keep
             every waveform in the RTK cache for the rest of the session. */
          const result = dispatch(
            recordingApi.endpoints.getRecording.initiate(row.id, { subscribe: false }),
          );
          const recording = await result.unwrap();
          if (recording) {
            const digest = digestFromRecording(recording, row.context, row.ctxKey);
            if (digest) {
              await stageDigests([digest]);
              sinceFlush++;
            }
          }
        } catch {
          /* One unreadable study must not abandon the rest. Its row simply
             keeps the metadata-only face it has today. */
        }

        if (sinceFlush >= FLUSH_EVERY) {
          await flushDigests();
          sinceFlush = 0;
          if (!stop && !cancelled.current) publish(await readDigests());
        }

        if (!stop && !cancelled.current) {
          setProgress({ done: i + 1, total: stale.length });
          /* ★ The yield that keeps the app alive — a macrotask, because
             `await` on a resolved promise never lets React paint. */
          await new Promise<void>((resolve) => setTimeout(resolve, 0));
        }
      }

      await flushDigests();
      if (stop || cancelled.current) return;
      publish(await readDigests());
      setProgress(null);
    };

    /* Never start during a transition — the tab thumb slides first. */
    handle = InteractionManager.runAfterInteractions(() => {
      void run();
    });

    return () => {
      stop = true;
      handle?.cancel();
    };
    /* `workKey` is the identity of the work; `rows`/`card` would thrash. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workKey, dispatch]);

  return { digests, progress };
}

// v1.0.0 — History digests off the render path: cached first, a yielding
//          one-study-at-a-time backfill for the missing and context-stale rest,
//          published batch-wise with visible progress.
