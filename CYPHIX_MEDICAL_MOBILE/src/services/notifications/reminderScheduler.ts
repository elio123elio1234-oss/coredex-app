/* ==================================================================
   reminderScheduler — the ONE place this app talks to the OS notifier.

   ══ WHAT IT ARMS ══
   Two different things, for two different reasons.

     PRIMARY   a repeating DAILY trigger per slot, handed to the OS. It
               fires whether or not this app has run in a month. That
               guarantee is the feature — a self-re-arming background task
               would be at the mercy of iOS's background budget, so a
               patient who had not opened the app in a week would silently
               stop being reminded.

     FOLLOW-UP a DATED one-shot per occurrence, armed a week ahead, and
               cancelled the moment a measurement lands inside its window.
               It cannot be a repeating trigger, because it is
               CONDITIONAL: nothing can evaluate "did they measure?" while
               the app is closed, so the condition has to be applied when
               the app IS open — by not arming it, or by cancelling it.

   The honest cost of that: follow-ups exist only as far ahead as they were
   armed. Seven days, re-armed on every launch and after every recording.
   A patient would have to ignore the app for a week to lose them, and by
   then the primary reminders — which never stop — are doing the work.

   ══ SNOOZE / DONE ══
   The notification carries two actions so it is something the patient
   ACTS on rather than only swipes away:
     • Snooze — re-fires in `SNOOZE_MINUTES`.
     • Done   — cancels this occurrence's follow-up.
   The response handler lives here, at module scope, because it must be
   registered exactly once and must work when no screen is mounted.

   ══ ⚠️ CANCEL-THEN-SET, AND IT MUST NOT INTERLEAVE ⚠️ ══
   Every apply cancels all of ours and re-creates them, so the OS is a pure
   function of the schedule rather than a second copy that can drift.

   `useReminders` is mounted in THREE places (Settings, Reminders, Tests),
   and Settings + Reminders are on screen together whenever the editor is
   pushed. Two concurrent applies would interleave their cancels and sets
   and leave either duplicates or nothing — a bug that shows up as
   "sometimes I get two" and is close to impossible to reproduce on
   purpose. Every apply therefore goes through `queue`, which serialises
   them.

   ══ PERMISSION IS NOT ASSUMED, AND NOT NAGGED ══
   The prompt is raised when the patient switches reminders ON — the moment
   they have said what it is for. Asking on first launch, before the app
   has shown what it is, is how an app gets denied permanently. After a
   settled no it is never re-asked: on iOS a second request shows no prompt
   at all, so retrying would look like a silent failure instead of the
   answer it is.
   ================================================================== */

import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import {
  isOccurrenceSatisfied,
  normalizeSchedule,
  sortSlots,
  SNOOZE_MINUTES,
  upcomingOccurrences,
  type MeasurementSchedule,
} from "@cyphix/shared";

/** Android needs a channel before anything can be posted to it. */
const CHANNEL_ID = "measurement-reminders";

/** Marks a notification as ours, so a future feature's alerts survive a cancel. */
const REMINDER_TAG = "cyphix.measurementReminder";

/** The interactive category both kinds of reminder are posted under. */
const CATEGORY_ID = "cyphix.reminder";
const ACTION_SNOOZE = "cyphix.reminder.snooze";
const ACTION_DONE = "cyphix.reminder.done";

/** How far ahead the conditional follow-ups are armed. See the header. */
const FOLLOW_UP_DAYS = 7;

/**
 * How many times a follow-up repeats before giving up, and how far apart.
 *
 * Asked for as "until you snooze or deny": one notification on a lock
 * screen is one chance to be looking at the phone. Three, spaced out, is a
 * reminder that survives being in another room — and every one of them is
 * cancelled the instant a measurement lands or Done is tapped, so this
 * never nags someone who has already answered.
 */
const FOLLOW_UP_REPEATS = 3;
const FOLLOW_UP_REPEAT_GAP_MIN = 10;

/**
 * ★ iOS keeps at most 64 PENDING notifications per app and silently drops
 * the rest — so this is a budget, not a guideline.
 *
 * Four slots × seven days × three repeats is 84, which would overflow and
 * lose whichever the OS felt like. Occurrences are therefore armed in
 * TIME ORDER until the budget is spent: nearest-first, because tonight's
 * reminder matters and next Tuesday's third repeat does not.
 */
const MAX_PENDING = 56;

/** The Android channel a follow-up goes to — see `ensureChannel`. */
const FOLLOW_CHANNEL_ID = 'measurement-reminders-followup';

export type PermissionOutcome = "granted" | "denied" | "undetermined";

/** Every string the OS will show. Injected, never imported — see `applySchedule`. */
export interface ReminderCopy {
  title: string;
  body: string;
  followUpTitle: string;
  followUpBody: string;
  snooze: string;
  done: string;
}

/**
 * The last copy handed in.
 *
 * A snooze can be tapped hours later, from the lock screen, with no React
 * tree alive — so the words for the re-fired notification cannot come from
 * a hook. They are cached on the last successful apply, which runs on
 * every launch and on every language change.
 */
let lastCopy: ReminderCopy | null = null;

/**
 * How a notification behaves while the app is OPEN.
 *
 * Registered at module scope because `expo-notifications` reads the
 * handler when a notification arrives, which can be before any screen has
 * mounted. Banners are shown in-app on purpose: the reminder is "time to
 * measure", and a patient already holding the phone is exactly who it is
 * for — swallowing it because the app happens to be foregrounded would
 * lose the reminder entirely.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    // No sound or badge in the foreground: the patient is already looking
    // at the screen, so a chime is startling rather than informative.
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/* ══════════════════ Serialisation ══════════════════ */

let chain: Promise<unknown> = Promise.resolve();

/** Run `job` after every job queued before it, whatever they did. */
function queue<T>(job: () => Promise<T>): Promise<T> {
  const next = chain.then(job, job);
  // Swallow here only — the caller still gets the real promise.
  chain = next.catch(() => undefined);
  return next;
}

/**
 * Run an OS call and swallow its failure.
 *
 * ★ A reminder that fails to arm is a reminder that does not arrive. It
 * must never be an app that dies — and in v0.35.0 it was exactly that: one
 * rejected `scheduleNotificationAsync` became an unhandled rejection and
 * took the whole app down on every navigation.
 *
 * Deliberately silent rather than rethrowing: there is no caller anywhere
 * up this stack for whom "the notification could not be scheduled" is
 * worth interrupting a patient over, and `applySchedule` already reports
 * the one failure that IS actionable — permission.
 */
async function safely(what: () => Promise<unknown>): Promise<boolean> {
  try {
    await what();
    return true;
  } catch {
    return false;
  }
}

/* ══════════════════ OS set-up ══════════════════ */

async function ensureChannel(): Promise<void> {
  if (Platform.OS !== "android") return;

  /* ★ TWO channels, because they are two different promises.
     The primary is a routine nudge at a time the patient chose, so it is
     DEFAULT: a heads-up notification that jumps over what someone is
     doing is for something urgent, and nothing this app produces is
     urgent by construction — it does not interpret, so it can never know
     that anything is.
     The FOLLOW-UP is different, and the difference is consent: the patient
     switched on a thing whose entire job is to catch them when they have
     missed something. HIGH is what they asked for by asking for it. */
  await Notifications.setNotificationChannelAsync(FOLLOW_CHANNEL_ID, {
    name: "Missed measurement",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 150, 250],
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });

  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: "Measurement reminders",
    importance: Notifications.AndroidImportance.DEFAULT,
    /* DEFAULT, not HIGH: this is a routine nudge, and a heads-up
       notification that jumps over what someone is doing is for something
       urgent. Nothing this app produces is urgent by construction — it
       does not interpret, so it can never know that anything is. */
    vibrationPattern: [0, 200],
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
}

/** Register Snooze / Done so the notification is actionable where it lands. */
async function ensureCategory(copy: ReminderCopy): Promise<void> {
  await Notifications.setNotificationCategoryAsync(CATEGORY_ID, [
    {
      identifier: ACTION_SNOOZE,
      buttonTitle: copy.snooze,
      // Handled in the background: snoozing should not drag the patient
      // into the app to do the one thing that means "not now".
      options: { opensAppToForeground: false },
    },
    {
      identifier: ACTION_DONE,
      buttonTitle: copy.done,
      options: { opensAppToForeground: false },
    },
  ]);
}

/* ══════════════════ Permission ══════════════════ */

export async function requestPermission(): Promise<PermissionOutcome> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return "granted";
  if (!current.canAskAgain) return "denied";

  const asked = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowSound: true, allowBadge: false },
  });
  return asked.granted ? "granted" : "denied";
}

export async function permissionStatus(): Promise<PermissionOutcome> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return "granted";
  return current.canAskAgain ? "undetermined" : "denied";
}

/* ══════════════════ Cancelling ══════════════════ */

async function ours(): Promise<Notifications.NotificationRequest[]> {
  const pending = await Notifications.getAllScheduledNotificationsAsync();
  return pending.filter((n) => n.content.data?.tag === REMINDER_TAG);
}

/** Remove every reminder this app has scheduled. */
export async function cancelAll(): Promise<void> {
  return queue(async () => {
    for (const n of await ours()) {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  });
}

/* ══════════════════ Arming ══════════════════ */

export interface ApplyResult {
  /** Repeating daily reminders now armed. */
  daily: number;
  /** Conditional follow-ups armed for the days ahead. */
  followUps: number;
  permission: PermissionOutcome;
}

/**
 * Make the OS match `schedule`.
 *
 * `measurementTimes` are epoch-ms of recent recordings; an occurrence
 * already answered by one is not armed at all — which is the cheapest
 * possible way to "cancel" it, and works even for a measurement taken on
 * a different device and synced here.
 *
 * `copy` is passed in rather than imported: this service must not reach
 * into the i18n layer, or the notification would arrive in whatever
 * language the app was built in instead of the one the patient reads.
 */
export function applySchedule(
  schedule: MeasurementSchedule,
  copy: ReminderCopy,
  measurementTimes: readonly number[] = [],
): Promise<ApplyResult> {
  return queue(async () => {
    lastCopy = copy;
    /* ★ Normalised HERE too, not only by the caller. This is the boundary
       to the operating system: whatever reaches it must already be valid,
       and a service that trusts its argument to have been cleaned
       upstream is a service that breaks the day a second caller appears. */
    schedule = normalizeSchedule(schedule);

    for (const n of await ours()) {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }

    if (!schedule.enabled || schedule.slots.length === 0) {
      return { daily: 0, followUps: 0, permission: await permissionStatus() };
    }

    const permission = await requestPermission();
    if (permission !== "granted") return { daily: 0, followUps: 0, permission };

    await safely(() => ensureChannel());
    await safely(() => ensureCategory(copy));

    /* ── The primary reminders: repeating, unconditional ── */
    const slots = sortSlots(schedule.slots);
    let daily = 0;
    for (const slot of slots) {
      const ok = await safely(() =>
        Notifications.scheduleNotificationAsync({
          content: {
            title: copy.title,
            body: copy.body,
            data: { tag: REMINDER_TAG, kind: "primary", slotId: slot.id },
            categoryIdentifier: CATEGORY_ID,
            ...(Platform.OS === "android" ? {} : { sound: "default" }),
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour: Math.floor(slot.at / 60),
            minute: slot.at % 60,
            ...(Platform.OS === "android" ? { channelId: CHANNEL_ID } : {}),
          },
        }),
      );
      if (ok) daily++;
    }

    /* ── The follow-ups: dated, repeated, and only where still owed ── */
    let followUps = 0;
    if (schedule.followUpMinutes !== null) {
      let budget = MAX_PENDING - daily;
      for (const occurrence of upcomingOccurrences(schedule, FOLLOW_UP_DAYS)) {
        if (budget <= 0) break;
        /* ⚠️ `Number.isFinite(getTime())`, not `if (!followUpAt)`. An
           Invalid Date is TRUTHY, so the obvious guard passes it straight
           through to the OS — which throws, and that throw is what took
           the app down on every navigation in v0.35.0. A Date is not
           validated by being present. */
        const fireAt = occurrence.followUpAt;
        if (!fireAt || !Number.isFinite(fireAt.getTime())) continue;
        if (isOccurrenceSatisfied(occurrence, measurementTimes)) continue;

        /* ★ A CHAIN, not one shot. One notification on a lock screen is
           one chance to be looking at the phone; three, spaced out,
           survives being in another room. Every one of them carries the
           same `due`, so a single Done — or a measurement — cancels the
           whole chain rather than the next one only. */
        for (let repeat = 0; repeat < FOLLOW_UP_REPEATS && budget > 0; repeat++) {
          const at = new Date(fireAt.getTime() + repeat * FOLLOW_UP_REPEAT_GAP_MIN * 60_000);
          if (!Number.isFinite(at.getTime())) break;

          const armed = await safely(() =>
            Notifications.scheduleNotificationAsync({
              content: {
                title: copy.followUpTitle,
                body: copy.followUpBody,
                data: {
                  tag: REMINDER_TAG,
                  kind: "followUp",
                  slotId: occurrence.slotId,
                  due: occurrence.at.getTime(),
                },
                categoryIdentifier: CATEGORY_ID,
                ...(Platform.OS === "android" ? {} : { sound: "default" }),
              },
              trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DATE,
                // The hoisted local, not the property: a closure loses the
                // narrowing the guard above just established — which is TS
                // telling us the same thing the crash did.
                date: at,
                ...(Platform.OS === "android" ? { channelId: FOLLOW_CHANNEL_ID } : {}),
              },
            }),
          );
          if (armed) {
            followUps++;
            budget--;
          }
        }
      }
    }

    return { daily, followUps, permission };
  });
}

/* ══════════════════ Telling the truth about what is armed ══════════════════ */

export interface ArmedSummary {
  /** Repeating daily reminders the OS is holding. */
  daily: number;
  /** Conditional follow-ups the OS is holding, repeats included. */
  followUps: number;
  /** When the very next one of ours fires, whatever kind. */
  nextAt: Date | null;
}

/**
 * ★ WHAT THE OS ACTUALLY HAS, not what this app believes it asked for.
 *
 * This exists because of an hour somebody spent waiting for a follow-up
 * that was never armed, with no way to find that out. Everything else in
 * this feature reports INTENT — the schedule, the switch, the next time —
 * and intent was exactly what was not in question. The only useful
 * question was "is anything actually pending?", and nothing could answer
 * it.
 *
 * Read straight from `getAllScheduledNotificationsAsync`, so it cannot
 * agree with a mistaken belief held anywhere else in the app.
 */
export function armedSummary(): Promise<ArmedSummary> {
  return queue(async () => {
    const mine = await ours();
    let nextAt: Date | null = null;

    for (const n of mine) {
      const trigger = n.trigger as { type?: string; value?: number } | null;
      const when =
        trigger && typeof trigger.value === 'number' ? new Date(trigger.value) : null;
      if (when && Number.isFinite(when.getTime()) && (!nextAt || when < nextAt)) nextAt = when;
    }

    return {
      daily: mine.filter((n) => n.content.data?.kind === 'primary').length,
      followUps: mine.filter((n) => n.content.data?.kind === 'followUp').length,
      nextAt,
    };
  });
}

/**
 * Fire the whole chain in the next minute, to see it rather than trust it.
 *
 * A reminder feature is close to untestable in the ordinary way: the
 * shortest honest interval the editor offers is thirty minutes, and the
 * thing worth checking — does the follow-up appear on the lock screen,
 * with its buttons, when nothing was recorded — takes that long to find
 * out. It cost an hour once, and the answer was "no, because it was never
 * armed at all".
 *
 * So this arms the REAL content, category and actions, ten seconds and
 * seventy seconds from now. It is not a mock: if this works and the
 * scheduled one does not, the difference is timing, not plumbing.
 *
 * It does NOT go through `applySchedule`, so it neither cancels nor is
 * cancelled by the real reminders.
 */
export function scheduleTestReminder(copy: ReminderCopy): Promise<boolean> {
  return queue(async () => {
    const permission = await requestPermission();
    if (permission !== 'granted') return false;

    await safely(() => ensureChannel());
    await safely(() => ensureCategory(copy));

    const primary = await safely(() =>
      Notifications.scheduleNotificationAsync({
        content: {
          title: copy.title,
          body: copy.body,
          data: { tag: REMINDER_TAG, kind: 'primary', slotId: 'test', test: true },
          categoryIdentifier: CATEGORY_ID,
          ...(Platform.OS === 'android' ? {} : { sound: 'default' }),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 10,
          repeats: false,
          ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
        },
      }),
    );

    const followUp = await safely(() =>
      Notifications.scheduleNotificationAsync({
        content: {
          title: copy.followUpTitle,
          body: copy.followUpBody,
          data: { tag: REMINDER_TAG, kind: 'followUp', slotId: 'test', due: Date.now(), test: true },
          categoryIdentifier: CATEGORY_ID,
          ...(Platform.OS === 'android' ? {} : { sound: 'default' }),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 70,
          repeats: false,
          ...(Platform.OS === 'android' ? { channelId: FOLLOW_CHANNEL_ID } : {}),
        },
      }),
    );

    return primary && followUp;
  });
}

/* ══════════════════ Responses ══════════════════ */

/**
 * Snooze and Done, handled wherever the patient taps them.
 *
 * Registered at module scope, once, on import: a response can arrive from
 * the lock screen with no React tree alive, so a hook could not catch it.
 * Neither action opens the app — the whole point of "not now" is that it
 * costs nothing.
 */
Notifications.addNotificationResponseReceivedListener((response) => {
  const action = response.actionIdentifier;
  const data = response.notification.request.content.data as
    { slotId?: string; due?: number } | undefined;

  if (action === ACTION_SNOOZE) {
    const copy = lastCopy;
    if (!copy) return;
    void safely(() =>
      Notifications.scheduleNotificationAsync({
        content: {
          title: copy.title,
          body: copy.body,
          data: { tag: REMINDER_TAG, kind: "snoozed", slotId: data?.slotId },
          categoryIdentifier: CATEGORY_ID,
          ...(Platform.OS === "android" ? {} : { sound: "default" }),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: SNOOZE_MINUTES * 60,
          repeats: false,
          ...(Platform.OS === "android" ? { channelId: CHANNEL_ID } : {}),
        },
      }),
    );
    return;
  }

  if (action === ACTION_DONE) {
    /* "Done" means this occurrence is answered, so its second ask goes.
       Matched on the slot AND the date it was due, because the same slot
       has a follow-up armed for every one of the next seven days and
       cancelling all of them would silence the rest of the week. */
    void queue(async () => {
      for (const n of await ours()) {
        const d = n.content.data as
          { kind?: string; slotId?: string; due?: number } | undefined;
        if (
          d?.kind === "followUp" &&
          d.slotId === data?.slotId &&
          d.due === data?.due
        ) {
          await Notifications.cancelScheduledNotificationAsync(n.identifier);
        }
      }
    });
  }
});

// v2.1.0 — HARDENED after v0.35.0 crashed the app on every navigation. The
//          schedule is normalised at this boundary as well as by the caller, a
//          follow-up date is checked with `Number.isFinite(getTime())` rather
//          than for truthiness (an Invalid Date is truthy, which is precisely
//          how the bad value reached the OS), and `safely()` wraps every call
//          into `expo-notifications` so one rejected notification can never
//          become an unhandled rejection. A reminder failing to arm is a
//          reminder that does not arrive; it must never be an app that dies.
// v2.0.0 — Adds the CONDITIONAL second ask and the Snooze / Done actions.
//          Follow-ups are DATED one-shots armed a week ahead and skipped where
//          a measurement already answers them: they cannot be repeating
//          triggers, because nothing can evaluate "did they measure?" with the
//          app closed. Also serialises every apply — `useReminders` is mounted
//          three times and Settings + Reminders are on screen together, so two
//          concurrent cancel-then-set passes could interleave and leave
//          duplicates or nothing, which presents as "sometimes I get two".
// v1.0.0 — Daily OS-level reminders from the shared schedule.
