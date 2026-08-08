/* ==================================================================
   Measurement reminders — when this patient means to measure.

   ══ WHY THIS IS A SHARED TYPE AND NOT A PHONE SETTING ══
   It looks like a device preference (which it also is), but it is a
   statement about a patient's care: "three readings a day, morning, midday
   and evening". That belongs to the person, not to the handset — it has to
   survive a new phone, it has to be visible to the web app, and a
   clinician who asks a patient to measure twice a day has to be able to
   see whether that is what the app is actually asking for. So the SHAPE
   lives here, in the platform-neutral core, and every consumer reads the
   same one (root CLAUDE.md §2.1).

   Delivery is per-platform and always will be: a phone schedules OS
   notifications, the web can only nag a tab that is open. That asymmetry
   is exactly why the schedule is defined apart from the thing that fires
   it.

   ══ WHAT THIS FILE MAY NOT DO ══
   The same prohibition as the rest of the clinical stack. It records what
   the patient (or their clinician) chose; it does not decide how often
   anyone should measure, and there is no "recommended" anything in here.
   Telling a patient how often to take an ECG is a clinical instruction,
   and this app does not give those.
   ================================================================== */

/** Minutes since local midnight, 0–1439. Not a `Date`: a reminder is a
    TIME OF DAY, and storing it as an instant would pin it to one date and
    one timezone — a patient who flies would be reminded at 03:00. */
export type MinutesOfDay = number;

/** How many reminders a day the UI offers. One is a habit; five is noise. */
export const MAX_REMINDERS_PER_DAY = 4;

/** One reminder in the day. */
export interface ReminderSlot {
  /** Stable across edits, so an OS notification can be matched to its slot. */
  id: string;
  at: MinutesOfDay;
}

export interface MeasurementSchedule {
  /**
   * Whether the phone should actually notify.
   *
   * Separate from an empty slot list on purpose: a patient who switches
   * reminders off for a fortnight must get their own times back when they
   * switch them on again, not an empty editor.
   */
  enabled: boolean;
  slots: ReminderSlot[];
  /**
   * ISO-8601 of the last edit. Present so a future server sync can resolve
   * two devices that both changed it without asking the patient.
   */
  updatedAt: string | null;
}

/* ══════════════════ Defaults ══════════════════ */

/**
 * The times a fresh schedule of `count` reminders proposes.
 *
 * ★ These are WAKING-DAY ANCHORS, not medical advice. They exist so the
 * editor opens on something sensible instead of on 00:00, and every one of
 * them is editable. The ordering logic — spread across the day, nothing
 * before 08:00 or after 21:00 — is about not waking anyone, which is a
 * usability decision this file is allowed to make.
 */
export function defaultSlotTimes(count: number): MinutesOfDay[] {
  const clamped = Math.max(1, Math.min(MAX_REMINDERS_PER_DAY, count));
  switch (clamped) {
    case 1:
      return [9 * 60];
    case 2:
      return [9 * 60, 20 * 60];
    case 3:
      return [8 * 60, 14 * 60, 20 * 60];
    default:
      return [8 * 60, 12 * 60, 16 * 60, 20 * 60];
  }
}

/** An empty, switched-off schedule — what a new account starts with. */
export function emptySchedule(): MeasurementSchedule {
  return { enabled: false, slots: [], updatedAt: null };
}

/**
 * Resize a schedule to `count` slots, keeping the times already chosen.
 *
 * Growing appends from the defaults for the NEW size rather than
 * re-proposing the whole set: a patient who moved their morning reminder
 * to 07:15 and then asked for a third must keep 07:15. Shrinking drops
 * from the end, which is the only end a reader can predict.
 */
export function resizeSchedule(
  schedule: MeasurementSchedule,
  count: number,
  idFor: (index: number) => string,
): MeasurementSchedule {
  const target = Math.max(1, Math.min(MAX_REMINDERS_PER_DAY, count));
  const kept = schedule.slots.slice(0, target);
  const proposed = defaultSlotTimes(target);

  for (let i = kept.length; i < target; i++) {
    // Skip any proposal that collides with a time already on the list —
    // two reminders at the same minute is one reminder and a puzzle.
    const taken = new Set(kept.map((s) => s.at));
    const at = proposed.find((p) => !taken.has(p)) ?? (proposed[i] ?? 9 * 60);
    kept.push({ id: idFor(i), at });
  }

  return { ...schedule, slots: sortSlots(kept) };
}

/** Chronological within the day. The list is read as a day, so it reads in order. */
export function sortSlots(slots: readonly ReminderSlot[]): ReminderSlot[] {
  return [...slots].sort((a, b) => a.at - b.at);
}

/* ══════════════════ Reading a schedule ══════════════════ */

/** `08:05` — zero-padded 24 h, which every locale can read unambiguously. */
export function formatMinutes(at: MinutesOfDay): string {
  const h = Math.floor(at / 60) % 24;
  const m = at % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * The next time this schedule comes round, as a local `Date`.
 *
 * Returns null when nothing is scheduled. Built by walking today's slots
 * and falling through to tomorrow's first — deliberately NOT by adding
 * 24 h to a slot, because a day is not always 24 hours long and the one
 * night a year it is 23 would move every reminder by an hour.
 */
export function nextOccurrence(
  schedule: MeasurementSchedule,
  now: Date = new Date(),
): Date | null {
  if (!schedule.enabled || schedule.slots.length === 0) return null;

  const sorted = sortSlots(schedule.slots);
  const minutesNow = now.getHours() * 60 + now.getMinutes();

  const later = sorted.find((s) => s.at > minutesNow);
  const target = later ?? sorted[0];

  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (!later) date.setDate(date.getDate() + 1);
  date.setHours(Math.floor(target.at / 60), target.at % 60, 0, 0);
  return date;
}

// v1.0.0 — The measurement-reminder schedule: times of day (never instants, so
//          a patient who flies is not woken at 03:00), stable slot ids, and the
//          defaults an editor opens on. Delivery is per-platform and lives
//          outside this file; nothing here recommends how often to measure.
