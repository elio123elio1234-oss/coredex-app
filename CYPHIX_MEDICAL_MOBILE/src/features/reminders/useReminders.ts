/* ==================================================================
   useReminders — the schedule, and keeping the OS in step with it.

   ══ THE ONE INVARIANT ══
   The stored schedule is the truth; the operating system's pending
   notifications are a projection of it. Nothing else may schedule or
   cancel a reminder, and every path that changes the schedule ends in the
   same `applySchedule` call — otherwise the phone keeps buzzing at a time
   the app no longer shows anywhere, which is the worst kind of bug this
   feature can have because the app looks correct while it happens.

     preferences.schedule ──► applySchedule() ──► OS daily triggers
              ▲                                          │
              └────── the editor writes here ────────────┘
                      (the OS is never written to directly)

   ══ WHY IT RE-APPLIES ON MOUNT ══
   Three things can put the OS out of step without this app doing
   anything: the patient revoking notification permission in Settings, a
   restore onto a new phone (preferences come back, the OS's schedule does
   not), and a language change (the notification text is baked in when it
   is scheduled, so a patient who switches to Hebrew would keep getting
   English reminders until they next edited the times). Re-applying on
   mount costs one cheap OS call and closes all three.

   ══ WHAT IT REFUSES TO DO ══
   It does not decide how often anyone should measure and it never nudges
   the patient toward more. `MAX_REMINDERS_PER_DAY` is a UI bound, not a
   recommendation, and there is no "suggested" schedule anywhere in here
   (`@cyphix/shared` `types/reminder` header — same rule).
   ================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  emptySchedule,
  nextOccurrence,
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
} from '@/services/notifications/reminderScheduler';
import { setSchedule } from '@/features/preferences/preferencesSlice';
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
}

/** Slot ids only have to be unique within one patient's schedule. */
const newSlotId = (): string => `slot-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;

export function useReminders(): UseReminders {
  const dispatch = useAppDispatch();
  const { prefs } = usePreferences();
  const { t: tr, lang } = useTranslation();
  const [permission, setPermission] = useState<PermissionOutcome>('undetermined');

  const schedule = prefs.schedule ?? emptySchedule();
  /* The master switch and the times are separate settings, and BOTH have
     to be on. Folding them into one would mean a patient silencing
     reminders lost the times they had chosen. */
  const armed = prefs.notifications.testReminders && schedule.enabled;

  const copy = {
    title: tr('remNotifTitle'),
    body: tr('remNotifBody'),
  };

  /* A ref, because `commit` must not be re-created every time the locale
     object identity changes — it is a dependency of the effect below, and
     a new function each render would re-apply the schedule in a loop. */
  const copyRef = useRef(copy);
  copyRef.current = copy;

  const push = useCallback(
    async (next: MeasurementSchedule) => {
      dispatch(setSchedule(next));
      const result = await applySchedule(
        { ...next, enabled: next.enabled && prefs.notifications.testReminders },
        copyRef.current,
      );
      setPermission(result.permission);
    },
    [dispatch, prefs.notifications.testReminders],
  );

  /* ── Keep the OS honest ──────────────────────────────────────────
     Runs on mount and whenever the schedule, the master switch or the
     LANGUAGE changes. The language matters because the notification's
     words are baked in at schedule time: without this, switching to
     Hebrew would leave every already-armed reminder speaking English
     until the patient happened to edit their times. */
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await applySchedule(
        { ...schedule, enabled: armed },
        { title: tr('remNotifTitle'), body: tr('remNotifBody') },
      );
      if (!cancelled) setPermission(result.permission);
    })();
    return () => {
      cancelled = true;
    };
    /* Keyed on the VALUES, not the objects: `schedule` is a fresh
       reference on every store read and would re-arm the OS on every
       render. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [armed, lang, schedule.slots.map((s) => `${s.id}:${s.at}`).join(',')]);

  useEffect(() => {
    void permissionStatus().then(setPermission);
  }, []);

  const setCount = useCallback(
    (count: number) => {
      const resized = resizeSchedule(schedule, count, newSlotId);
      void push({ ...resized, enabled: true, updatedAt: new Date().toISOString() });
    },
    [schedule, push],
  );

  const setSlotTime = useCallback(
    (id: string, at: MinutesOfDay) => {
      const slots = sortSlots(
        schedule.slots.map((s) => (s.id === id ? { ...s, at } : s)),
      );
      void push({ ...schedule, slots, updatedAt: new Date().toISOString() });
    },
    [schedule, push],
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
      void push({ ...base, enabled, updatedAt: new Date().toISOString() });
    },
    [schedule, push],
  );

  return {
    schedule,
    active: armed && schedule.slots.length > 0,
    next: armed ? nextOccurrence(schedule) : null,
    permission,
    setCount,
    setSlotTime,
    setEnabled,
  };
}

// v1.0.0 — The schedule is the truth and the OS is a projection of it: every
//          path that edits it ends in one `applySchedule`, and the effect
//          re-applies on mount, on a master-switch change and on a LANGUAGE
//          change — because the notification's words are baked in when it is
//          scheduled, so a patient switching to Hebrew would otherwise keep
//          being reminded in English.
