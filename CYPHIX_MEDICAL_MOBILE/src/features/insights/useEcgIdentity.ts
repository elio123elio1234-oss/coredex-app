/* ==================================================================
   useEcgIdentity — the patient's ECG ID, built from every study they have.

   ══ THE PROBLEM THIS HOOK EXISTS TO SOLVE ══
   The maths is pure and lives in `@cyphix/shared`. What is NOT pure is
   getting forty waveforms off the device and through the DSP without
   freezing the screen while it happens. That is this file's whole job:

     list (metadata) ──► which studies lack a template?
                              │
                              ▼   one at a time, yielding between each
                    fetch waveform → templateFromRecording()
                              │
                              ▼   staged in memory, flushed every few
                         templateCache (device)
                              │
                              ▼
                    buildEcgIdentity()  ──►  the signature

   ══ WHY ONE AT A TIME, AND WHY IT YIELDS ══
   A `Promise.all` over forty studies would decode, filter and
   Pan-Tompkins forty waveforms in one uninterrupted synchronous burst —
   `await` does not yield inside a CPU-bound loop, it only yields at the
   IO. The result is a JS thread blocked for seconds, which on this app
   means a frozen scroll, a dead dock and a segmented control that does
   not move when tapped. So each study is followed by a real macrotask
   yield, and the whole pass starts only after `runAfterInteractions` —
   the tab animation finishes first, always.

   That is also why progress is reported rather than hidden behind a
   spinner: the first run over a full history takes a few seconds, and
   "Analysing 12 of 34" is a screen doing work, while a spinner of unknown
   length is a screen that might be broken.

   ══ WHY IT IS ONLY EVER SLOW ONCE ══
   Templates are cached and recordings are immutable, so the second visit
   reads one file and builds the identity in memory. A new study adds one
   study's worth of work, not the whole history's.

   ══ WHAT IT REFUSES TO DO ══
   It does not compute anything during render, does not hold waveforms
   after it is done with them (`subscribe: false` — the RTK cache entry is
   released immediately, or forty waveforms would sit in Redux for the rest
   of the session), and it abandons the pass on unmount rather than
   finishing into a dead component.
   ================================================================== */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { InteractionManager } from 'react-native';
import {
  buildEcgIdentity,
  summariseMeasurementHistory,
  type EcgIdentity,
  type MeasurementStats,
  type RecordingListItem,
  type RecordingTemplate,
} from '@cyphix/shared';
import { templateFromRecording } from '@/features/insights/recordingTemplate';
import { recordingApi, useListRecordingsQuery, HISTORY_PAGE_SIZE } from '@/services/api/endpoints/recordingApi';
import {
  flushTemplates,
  missingTemplates,
  pruneTemplates,
  readTemplates,
  stageTemplates,
} from '@/services/db/templateCache';
import { useAppDispatch } from '@/store/hooks';

/** Templates staged before the disk is touched. See `templateCache` header. */
const FLUSH_EVERY = 5;

export interface EcgIdentityView {
  identity: EcgIdentity | null;
  stats: MeasurementStats | null;
  /** The metadata rows, so callers can join a match back to its study. */
  studies: RecordingListItem[];
  /** True while the FIRST pass is still gathering templates. */
  isBuilding: boolean;
  /** Studies templated / studies to template, during a backfill. */
  progress: { done: number; total: number } | null;
  isLoading: boolean;
  isError: boolean;
  /**
   * One study's own representative beat, for laying over the baseline.
   *
   * It is already in memory — the identity was built from it — so drawing
   * a comparison costs nothing beyond a lookup. Re-fetching the waveform
   * and re-running the DSP to draw a curve we are already holding would be
   * the most expensive way to answer a question we already answered.
   */
  templateOf: (recordingId: string) => RecordingTemplate | null;
  /** Recompute from scratch — used after a study is deleted or struck. */
  refresh: () => void;
}

export interface UseEcgIdentityOptions {
  /**
   * ★ Off by default nowhere, but switchable — because this hook is no
   * longer only used by the screen that IS the ECG ID.
   *
   * The study viewer can now lay the identity over a strip, and it must
   * not pay for that until the reader asks: a cold first pass decodes,
   * filters and Pan-Tompkins every study in the history. On the Insights
   * tab that cost is the point and the screen shows progress for it; in
   * the viewer it would be seconds of work for a comparison nobody
   * selected. `false` skips the list query AND the backfill entirely, so
   * mounting the hook costs nothing at all.
   */
  enabled?: boolean;
}

export function useEcgIdentity(
  patientId?: string,
  options: UseEcgIdentityOptions = {},
): EcgIdentityView {
  const enabled = options.enabled ?? true;
  const dispatch = useAppDispatch();
  const list = useListRecordingsQuery({ patientId, limit: HISTORY_PAGE_SIZE }, { skip: !enabled });

  const [templates, setTemplates] = useState<RecordingTemplate[] | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [nonce, setNonce] = useState(0);

  /* The ids, as a stable string. Depending on `list.data` directly would
     restart the whole pass on every RTK re-render, because the array is a
     fresh reference each time even when nothing changed. */
  const ids = useMemo(
    () => (list.data ?? []).map((r) => r.id).join(','),
    [list.data],
  );

  const cancelled = useRef(false);
  useEffect(() => {
    cancelled.current = false;
    return () => {
      cancelled.current = true;
    };
  }, []);

  useEffect(() => {
    if (!enabled || !list.data) return;
    const rows = list.data;
    let handle: { cancel: () => void } | null = null;
    let stop = false;

    const run = async () => {
      /* A deleted study must stop shaping the baseline. Pruning first
         means the identity below is built from studies that still exist,
         not from whatever the cache happens to remember. */
      await pruneTemplates(rows.map((r) => r.id));

      const cached = await readTemplates();
      if (stop || cancelled.current) return;
      // Show what is already known immediately — with a full cache this is
      // the entire answer and nothing below runs.
      setTemplates(cached);

      const missing = await missingTemplates(rows.map((r) => r.id));
      if (stop || cancelled.current || missing.length === 0) {
        setProgress(null);
        return;
      }

      setProgress({ done: 0, total: missing.length });
      const staged: RecordingTemplate[] = [];
      let sinceFlush = 0;

      for (let i = 0; i < missing.length; i++) {
        if (stop || cancelled.current) break;

        try {
          /* `subscribe: false`: this is a one-shot read, not a component
             watching a study. Subscribing would keep every waveform in the
             RTK cache for the rest of the session — tens of megabytes to
             answer a question already answered. */
          const result = dispatch(
            recordingApi.endpoints.getRecording.initiate(missing[i], { subscribe: false }),
          );
          const recording = await result.unwrap();
          if (recording) {
            const template = templateFromRecording(recording);
            if (template) {
              staged.push(template);
              await stageTemplates([template]);
              sinceFlush++;
            }
          }
        } catch {
          /* One unreadable study must not abandon the other thirty-nine.
             It simply contributes nothing, which is already a state the
             identity handles — and History still shows the study itself. */
        }

        if (sinceFlush >= FLUSH_EVERY) {
          await flushTemplates();
          sinceFlush = 0;
        }

        if (!stop && !cancelled.current) {
          setProgress({ done: i + 1, total: missing.length });
          /* ★ The yield that keeps the app alive. `await` on an already-
             resolved promise is a microtask and does NOT let React paint
             or a touch be handled; a macrotask does. One per study is
             enough — the DSP itself is tens of ms, not hundreds. */
          await new Promise<void>((resolve) => setTimeout(resolve, 0));
        }
      }

      await flushTemplates();
      if (stop || cancelled.current) return;
      setTemplates(await readTemplates());
      setProgress(null);
    };

    /* Never start during a transition. The Insights tab is reached by a
       segmented control with a sliding thumb; starting the DSP on the same
       tick would make the thumb jump instead of slide. */
    handle = InteractionManager.runAfterInteractions(() => {
      void run();
    });

    return () => {
      stop = true;
      handle?.cancel();
    };
    /* `ids` is the identity of the work, not `list.data`. `nonce` is the
       manual refresh. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids, nonce, dispatch, enabled]);

  const identity = useMemo(
    () => (templates && templates.length > 0 ? buildEcgIdentity(templates) : null),
    [templates],
  );

  const stats = useMemo(() => {
    if (!list.data) return null;
    return summariseMeasurementHistory(
      list.data.map((r) => ({
        recordedAt: r.recordedAt,
        isSimulated: r.isSimulated,
        insufficient: r.summary.insufficient,
        bpm: r.summary.bpm,
        qrsMs: r.summary.qrsMs,
        qtcMs: r.summary.qtcMs,
      })),
    );
  }, [list.data]);

  const byId = useMemo(() => {
    const map = new Map<string, RecordingTemplate>();
    for (const t of templates ?? []) map.set(t.recordingId, t);
    return map;
  }, [templates]);

  const templateOf = useCallback((id: string) => byId.get(id) ?? null, [byId]);
  const refresh = useCallback(() => setNonce((n) => n + 1), []);

  return {
    identity,
    stats,
    studies: list.data ?? [],
    templateOf,
    /* A disabled hook is not "building" — it is idle. Reporting otherwise
       would leave a caller that never enabled it showing a spinner
       forever, waiting for a pass that will never start. */
    isBuilding: enabled && templates === null && !list.isError,
    progress,
    isLoading: list.isLoading,
    isError: list.isError,
    refresh,
  };
}

// v1.1.0 — An `enabled` option. The hook is no longer used only by the screen
//          that IS the ECG ID: the study viewer can lay the identity over a
//          strip, and a cold first pass decodes and re-analyses every study in
//          the history. On Insights that cost is the point and progress is
//          shown for it; in the viewer it must not be paid until the reader
//          selects the comparison. Disabled skips the list query and the
//          backfill, so mounting costs nothing.
// v1.0.0 — Builds the ECG ID off the render path: cached templates first, a
//          yielding one-study-at-a-time backfill for the rest with visible
//          progress, waveforms released as soon as they are used, and the pure
//          fusion left to @cyphix/shared.
