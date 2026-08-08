/* ==================================================================
   useReminders — the schedule, and keeping the OS in step with it.

   ══ THE ONE INVARIANT ══
   The stored schedule is the truth; the operating system's pending
   notifications are a projection of it. Nothing else may schedule or
   cancel a reminder, and every path that changes the schedule ends in the
   same `applySchedule` call — otherwise the phone keeps buzzing at a time
   the app no longer shows anywhere, which is the worst kind of bug this
   feature can have because the app looks correct while it happens.

     preferences.schedule ──► applySchedule() ──► OS triggers
     recordings (times)  ──►                      (daily + conditional)
              ▲                                          │
              └────── the editor writes here ────────────┘

   ══ WHY THE RECORDINGS ARE AN INPUT ══
   The follow-up is conditional — "ask again unless they measured" — and
   that condition can only be applied while the app is open. So the list of
   recent measurement times is handed to the scheduler, which simply does
   not arm a follow-up whose window a recording already sits in. Cheaper
   and more robust than cancelling one later, and it works for a
   measurement taken on another device and synced here.

   That is also why this re-applies after a NEW recording: taking a reading
   is the event that should silence tonight's second ask, and it has to be
   silenced then rather than at the next launch.

   ══ WHY IT RE-APPLIES ON MOUNT ══
   Four things put the OS out of step without this app doing anything: the
   patient revoking notification permission in Settings; a restore onto a
   new phone (preferences come back, the OS's schedule does not); a
   language change (the notification's words are baked in when it is
   SCHEDULED, so a patient switching to Hebrew would keep getting English
   reminders until they next edited their times); and the follow-up window
   simply rolling forward past the week that was armed.

   ══ WHAT IT REFUSES TO DO ══
   It does not decide how often anyone should measure and never nudges
   toward more. `MAX_REMINDERS_PER_DAY` is a UI bound, not a
   recommendation, and there is no "suggested" schedule anywhere in here
   (`@cyphix/shared` `types/reminder` header — same rule).
   ================================================================== */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  nextOccurrence,
  normalizeSchedule,
  resizeSchedule,
  sortSlots,
  type MeasurementSchedule,
  type MinutesOfDay,
} from '@cyphix/shared';
import { usePreferences } from '@/features/preferences/usePreferences';
import { useTranslation } from '@/i18n/useTranslation';
import {
  applySchedule,
  permissionStatus,
  type PermissionOutcome,
  type ReminderCopy,
} from '@/services/notifications/reminderScheduler';
import { setSchedule } from '@/features/preferences/preferencesSlice';
import {
  HISTORY_PAGE_SIZE,
  useListRecordingsQuery,
} from '@/services/api/endpoints/recordingApi';
import { useAppDispatch } from '@/store/hooks';

export interface UseReminders {
  schedule: MeasurementSchedule;
  /** The master switch (`notifications.testReminders`) AND some times set. */
  active: boolean;
  /** The next reminder as a local Date, or null when nothing is armed. */
  next: Date | null;
  /**
   * Whether the OS will actually deliver. `denied` means the patient said
   * no at some point — the UI has to say so, because a schedule that looks
   * armed and silently never fires is worse than one that is plainly off.
   */
  permission: PermissionOutcome;
  /** How many reminders a day. Resizing keeps the times already chosen. */
  setCount: (count: number) => void;
  /** Move one slot. `at` is minutes since local midnight. */
  setSlotTime: (id: string, at: MinutesOfDay) => void;
  /** Turn the times on or off without forgetting them. */
  setEnabled: (enabled: boolean) => void;
  /** Minutes after a missed slot to ask again; null switches it off. */
  setFollowUp: (minutes: number | null) => void;
}

/** Slot ids only have to be unique within one patient's schedule. */
const newSlotId = (): string =>
  `slot-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;

export function useReminders(): UseReminders {
  const dispatch = useAppDispatch();
  const { prefs } = usePreferences();
  const { t: tr, lang } = useTranslation();
  const [permission, setPermission] = useState<PermissionOutcome>('undetermined');

  /* ★ Normalised, not just defaulted. `prefs.schedule` is read back off a
     disk written by an OLDER BUILD of this app — a different program — so
     a field added since arrives `undefined` rather than at its default.
     That is precisely how v0.35.0 crashed: `followUpMinutes` was missing,
     `undefined !== null` passed, and `new Date(NaN)` reached the OS. */
  const schedule = useMemo(() => normalizeSchedule(prefs.schedule), [prefs.schedule]);
  /* The master switch and the times are separate settings, and BOTH have
     to be on. Folding them into one would mean a patient silencing
     reminders lost the times they had chosen. */
  const armed = prefs.notifications.testReminders && schedule.enabled;

  /* The same arguments History and Tests use, so RTK Query serves this
     from the page it has already fetched rather than issuing a third
     request for the same rows. */
  const { data: recordings } = useListRecordingsQuery({ limit: HISTORY_PAGE_SIZE });

  /* Epoch-ms of real measurements. Simulator runs are excluded: a bench
     demo is not evidence that the patient took their reading, and
     counting it would silence a reminder they still need. */
  const measurementTimes = useMemo(
    () =>
      (recordings ?? [])
        .filter((r) => !r.isSimulated)
        .map((r) => Date.parse(r.recordedAt))
        .filter((t) => Number.isFinite(t)),
    [recordings],
  );

  const copy: ReminderCopy = useMemo(
    () => ({
      title: tr('remNotifTitle'),
      body: tr('remNotifBody'),
      followUpTitle: tr('remFollowNotifTitle'),
      followUpBody: tr('remFollowNotifBody'),
      snooze: tr('remActionSnooze'),
      done: tr('remActionDone'),
    }),
    // Re-made when the LANGUAGE changes, which is the whole point: the
    // words are baked in at schedule time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lang],
  );

  const push = useCallback(
    async (next: MeasurementSchedule) => {
      dispatch(setSchedule(next));
      try {
        const result = await applySchedule(
          { ...next, enabled: next.enabled && prefs.notifications.testReminders },
          copy,
          measurementTimes,
        );
        setPermission(result.permission);
      } catch {
        // Same rule as the effect below: the schedule is saved either way.
      }
    },
    [dispatch, prefs.notifications.testReminders, copy, measurementTimes],
  );

  /* ── Keep the OS honest ───────────────────────────────────────── */
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const result = await applySchedule({ ...schedule, enabled: armed }, copy, measurementTimes);
        if (!cancelled) setPermission(result.permission);
      } catch {
        /* ⚠️ A `void (async …)()` with no catch is how a background
           concern becomes a crash: an unhandled rejection here took the
           whole app down in v0.35.0. Reminders failing to arm is a bad
           day for reminders and must never be one for the app. */
      }
    })();
    return () => {
      cancelled = true;
    };
    /* Keyed on the VALUES, not the objects: `schedule` is a fresh
       reference on every store read and would re-arm the OS on every
       render. The newest recording is in the key so taking a reading
       silences tonight's second ask immediately. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    armed,
    copy,
    schedule.followUpMinutes,
    schedule.slots.map((s) => `${s.id}:${s.at}`).join(','),
    measurementTimes.length > 0 ? Math.max(...measurementTimes) : 0,
  ]);

  useEffect(() => {
    void permissionStatus().then(setPermission);
  }, []);

  const commit = useCallback(
    (next: MeasurementSchedule) => {
      void push({ ...next, updatedAt: new Date().toISOString() });
    },
    [push],
  );

  const setCount = useCallback(
    (count: number) => commit({ ...resizeSchedule(schedule, count, newSlotId), enabled: true }),
    [schedule, commit],
  );

  const setSlotTime = useCallback(
    (id: string, at: MinutesOfDay) =>
      commit({
        ...schedule,
        slots: sortSlots(schedule.slots.map((s) => (s.id === id ? { ...s, at } : s))),
      }),
    [schedule, commit],
  );

  const setEnabled = useCallback(
    (enabled: boolean) => {
      /* Switching ON with nothing set yet opens on a sensible day rather
         than on an empty list — a switch that turns on and shows nothing
         reads as broken. */
      const base =
        enabled && schedule.slots.length === 0
          ? resizeSchedule(schedule, 2, newSlotId)
          : schedule;
      commit({ ...base, enabled });
    },
    [schedule, commit],
  );

  const setFollowUp = useCallback(
    (minutes: number | null) => commit({ ...schedule, followUpMinutes: minutes }),
    [schedule, commit],
  );

  return {
    schedule,
    active: armed && schedule.slots.length > 0,
    next: armed ? nextOccurrence(schedule) : null,
    permission,
    setCount,
    setSlotTime,
    setEnabled,
    setFollowUp,
  };
}

// v2.1.0 — Normalises the schedule read back from storage, and CATCHES around
//          every apply. v0.35.0 crashed on every navigation because a field
//          added in that release hydrated as `undefined` from a blob an older
//          build had written, and the resulting rejection was unhandled.
// v2.0.0 — Feeds the scheduler the recent MEASUREMENT TIMES, so a conditional
//          follow-up whose window already contains a recording is never armed —
//          cheaper than cancelling one later, and it works for a reading taken
//          on another device and synced here. Re-applies when a new recording
//          lands, so taking a reading silences tonight's second ask at once.
// v1.0.0 — The schedule is the truth and the OS is a projection of it.
