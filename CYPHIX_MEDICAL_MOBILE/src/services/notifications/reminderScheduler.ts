/* ==================================================================
   reminderScheduler — the ONE place this app talks to the OS notifier.

   ══ WHAT IT DOES ══
   Turns a `MeasurementSchedule` (platform-neutral, from `@cyphix/shared`)
   into repeating daily notifications, and keeps the OS in step with it.

     schedule  ──►  cancel everything ours  ──►  one DAILY trigger per slot

   ══ WHY A DAILY TRIGGER AND NOT A BACKGROUND TASK ══
   `SchedulableTriggerInputTypes.DAILY` is handed to the operating system,
   which fires it whether or not this app has run since. A background task
   that re-arms itself would be at the mercy of iOS's budget for background
   execution — meaning a patient who had not opened the app in a week would
   silently stop being reminded, which is the one failure this feature
   cannot have. Four repeating triggers cost nothing and survive a reboot.

   iOS caps an app at 64 pending notifications; `MAX_REMINDERS_PER_DAY` is
   4 and each daily repeat is ONE pending entry, so there is no ceiling to
   manage here.

   ══ CANCEL-THEN-SET, ALWAYS ══
   There is no "edit a scheduled notification" that is safe: the OS keys
   them by an identifier we do not control across a reinstall. Every apply
   cancels ALL of this app's scheduled notifications and re-creates them.
   That is cheap, and it makes the OS a pure function of the schedule
   rather than a second copy of it that can drift.

   ══ PERMISSION IS NOT ASSUMED, AND NOT NAGGED ══
   The prompt is raised when the patient switches reminders ON — the moment
   they have said what they want it for. Asking on first launch, before the
   app has shown what it is, is how an app gets denied permanently. If the
   answer is no, `apply` reports it and the UI says so; it does not retry.
   ================================================================== */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { sortSlots, type MeasurementSchedule } from '@cyphix/shared';

/** Android needs a channel before anything can be posted to it. */
const CHANNEL_ID = 'measurement-reminders';

/** Marks a notification as ours, so a future feature's alerts survive a cancel. */
const REMINDER_TAG = 'cyphix.measurementReminder';

export type PermissionOutcome = 'granted' | 'denied' | 'undetermined';

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

/** Create the Android channel. No-op on iOS, safe to call repeatedly. */
async function ensureChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Measurement reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
    /* DEFAULT, not HIGH: this is a routine nudge, and a heads-up
       notification that jumps over what someone is doing is for something
       urgent. Nothing this app produces is urgent by construction — it
       does not interpret, so it can never know that anything is. */
    vibrationPattern: [0, 200],
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
}

/**
 * Ask for permission, if it has not been settled already.
 *
 * `requestPermissionsAsync` is only called when the current status is
 * undetermined — on iOS a second request after a denial does nothing at
 * all (the OS shows no prompt), so calling it again would look like a
 * silent failure rather than the settled "no" it is.
 */
export async function requestPermission(): Promise<PermissionOutcome> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return 'granted';
  if (!current.canAskAgain) return 'denied';

  const asked = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowSound: true, allowBadge: false },
  });
  return asked.granted ? 'granted' : 'denied';
}

export async function permissionStatus(): Promise<PermissionOutcome> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return 'granted';
  return current.canAskAgain ? 'undetermined' : 'denied';
}

/** Remove every reminder this app has scheduled. */
export async function cancelAll(): Promise<void> {
  const pending = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    pending
      .filter((n) => n.content.data?.tag === REMINDER_TAG)
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}

export interface ApplyResult {
  /** How many daily reminders are now armed with the OS. */
  scheduled: number;
  permission: PermissionOutcome;
}

/**
 * Make the OS match `schedule`.
 *
 * `copy` is passed in rather than imported: this service must not reach
 * into the i18n layer, or the notification would arrive in whatever
 * language the app was built in instead of the one the patient reads.
 */
export async function applySchedule(
  schedule: MeasurementSchedule,
  copy: { title: string; body: string },
): Promise<ApplyResult> {
  await cancelAll();

  if (!schedule.enabled || schedule.slots.length === 0) {
    return { scheduled: 0, permission: await permissionStatus() };
  }

  const permission = await requestPermission();
  if (permission !== 'granted') return { scheduled: 0, permission };

  await ensureChannel();

  const slots = sortSlots(schedule.slots);
  for (const slot of slots) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: copy.title,
        body: copy.body,
        data: { tag: REMINDER_TAG, slotId: slot.id },
        ...(Platform.OS === 'android' ? {} : { sound: 'default' }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: Math.floor(slot.at / 60),
        minute: slot.at % 60,
        ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
      },
    });
  }

  return { scheduled: slots.length, permission };
}

// v1.0.0 — Daily OS-level reminders from the shared schedule: repeating triggers
//          rather than a background task (a patient who has not opened the app
//          in a week must still be reminded), cancel-then-set so the OS is a
//          pure function of the schedule, permission asked at the moment it is
//          switched on and never re-asked after a settled no, and the copy
//          injected so the notification speaks the patient's language.
