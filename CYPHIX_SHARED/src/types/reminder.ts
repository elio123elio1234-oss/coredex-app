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
   * ★ Ask a second time, this many minutes later, IF no measurement has
   * been recorded by then. `null` switches it off.
   *
   * Not a duplicate reminder — a CONDITIONAL one, and the condition is the
   * whole point: a patient who measured at 19:12 must not be nudged at
   * 20:00 about the thing they already did. Nothing erodes a reminder
   * faster than being wrong about what you already know.
   */
  followUpMinutes: number | null;
  /**
   * ISO-8601 of the last edit. Present so a future server sync can resolve
   * two devices that both changed it without asking the patient.
   */
  updatedAt: string | null;
}

/** Delays the editor offers for the second ask. */
export const FOLLOW_UP_CHOICES: readonly number[] = [30, 60, 120];

/** How long "Snooze" on the notification pushes it back. */
export const SNOOZE_MINUTES = 15;

/**
 * A measurement this long BEFORE a slot still counts as that slot's.
 *
 * Somebody who takes their evening reading at 18:50 has done the 19:00
 * one. Without a lead-in the follow-up would fire at 20:00 about a
 * measurement that is already in their history, which is the single
 * fastest way to teach a patient to ignore this app's notifications.
 */
export const SATISFY_LEAD_MINUTES = 45;

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
  return { enabled: false, slots: [], followUpMinutes: null, updatedAt: null };
}

/**
 * ★ Make a schedule read back off a disk safe to use.
 *
 * ══ THIS EXISTS BECAUSE IT ALREADY CRASHED THE APP ══
 * v0.35.0 added `followUpMinutes` and shipped over installs whose stored
 * schedule was written by v0.34, which had no such field. It came back
 * `undefined`, `undefined !== null` passed the "is the follow-up on?"
 * guard, and the result was `new Date(NaN)` — an **Invalid Date, which is
 * truthy**, so it also survived a `if (!followUpAt) continue`. Handing
 * that to the OS scheduler threw, and the throw took the app down on
 * every navigation.
 *
 * Three lessons are baked in here rather than left to be relearned:
 *   1. A persisted shape is UNTRUSTED INPUT. It was written by an older
 *      version of this code, which is a different program.
 *   2. `x !== null` is not a null check when the value can be undefined.
 *      Every optional-ish field below is coerced to exactly one absent
 *      value, so downstream code has one thing to test.
 *   3. An Invalid Date passes every truthiness test there is. Numbers are
 *      validated here, before a Date is ever built from them.
 *
 * Call it on ANYTHING that came from storage or the network — and when
 * the next field is added to this type, it gets a line here first.
 */
export function normalizeSchedule(raw: unknown): MeasurementSchedule {
  const base = emptySchedule();
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Partial<Record<keyof MeasurementSchedule, unknown>>;

  const slots = Array.isArray(r.slots)
    ? r.slots
        .filter(
          (s): s is ReminderSlot =>
            !!s &&
            typeof s === 'object' &&
            typeof (s as ReminderSlot).id === 'string' &&
            Number.isFinite((s as ReminderSlot).at),
        )
        // A time outside the day is a corrupt row, not a reminder at 34:00.
        .filter((s) => s.at >= 0 && s.at < 24 * 60)
        .map((s) => ({ id: s.id, at: Math.round(s.at) }))
    : [];

  const follow = r.followUpMinutes;
  return {
    enabled: r.enabled === true,
    slots: sortSlots(slots).slice(0, MAX_REMINDERS_PER_DAY),
    followUpMinutes: typeof follow === 'number' && Number.isFinite(follow) && follow > 0
      ? Math.round(follow)
      : null,
    updatedAt: typeof r.updatedAt === 'string' ? r.updatedAt : null,
  };
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

/* ══════════════════ The second ask ══════════════════ */

/** One dated firing of one slot, with the follow-up it may owe. */
export interface SlotOccurrence {
  slotId: string;
  /** When the primary reminder is due, as a local instant. */
  at: Date;
  /** When to ask again if nothing was recorded. Null when it is switched off. */
  followUpAt: Date | null;
}

/**
 * Every slot firing in the next `days` days, from `from` onwards.
 *
 * Dated instants, unlike the primary reminders themselves — and that
 * asymmetry is deliberate, so it is worth stating here rather than only in
 * the scheduler:
 *
 *   • the PRIMARY reminder is a repeating daily trigger handed to the OS.
 *     It fires whether or not this app has run in a month. That guarantee
 *     is the feature.
 *   • the FOLLOW-UP cannot be, because it is CONDITIONAL — nothing can
 *     evaluate "did they measure?" while the app is closed. So it is
 *     armed as individual dated notifications and cancelled when the
 *     measurement lands.
 *
 * The cost is honest and bounded: follow-ups only exist as far ahead as
 * they were armed. Arm a week at a time and re-arm on every launch and a
 * patient would have to not open the app for seven days to lose them — by
 * which point the primary reminders, which never stop, are the thing
 * doing the work anyway.
 */
export function upcomingOccurrences(
  schedule: MeasurementSchedule,
  days: number,
  from: Date = new Date(),
): SlotOccurrence[] {
  if (!schedule.enabled || schedule.slots.length === 0) return [];

  /* ⚠️ NOT `!== null`. This function is reached with schedules read off a
     disk, and `undefined` used to slip through that test and produce
     `new Date(NaN)` — which is truthy, so it survived every downstream
     guard and crashed the app at the OS boundary. `normalizeSchedule`
     should have made this unnecessary; it is here anyway, because a pure
     function has no business emitting an Invalid Date whatever it is
     handed. */
  const followUp =
    typeof schedule.followUpMinutes === 'number' && Number.isFinite(schedule.followUpMinutes)
      ? schedule.followUpMinutes
      : null;

  const out: SlotOccurrence[] = [];
  const midnight = new Date(from.getFullYear(), from.getMonth(), from.getDate());

  for (let day = 0; day <= days; day++) {
    for (const slot of sortSlots(schedule.slots)) {
      const at = new Date(midnight);
      /* setDate THEN setHours, and never `+ day * 86400000`: adding a
         fixed number of milliseconds is wrong across a DST boundary, and
         a reminder that drifts by an hour twice a year is a reminder
         nobody trusts. */
      at.setDate(at.getDate() + day);
      at.setHours(Math.floor(slot.at / 60), slot.at % 60, 0, 0);
      if (at.getTime() <= from.getTime()) continue;

      const followUpAt = followUp === null ? null : new Date(at.getTime() + followUp * 60_000);

      out.push({ slotId: slot.id, at, followUpAt });
    }
  }

  return out.sort((a, b) => a.at.getTime() - b.at.getTime());
}

/**
 * Has this occurrence already been answered by a measurement?
 *
 * The window opens `SATISFY_LEAD_MINUTES` before the slot and closes at
 * the follow-up. Anything recorded inside it counts, so an early reading
 * silences the second ask exactly as an on-time one does.
 */
export function isOccurrenceSatisfied(
  occurrence: SlotOccurrence,
  measurementTimes: readonly number[],
): boolean {
  const opens = occurrence.at.getTime() - SATISFY_LEAD_MINUTES * 60_000;
  const closes = (occurrence.followUpAt ?? occurrence.at).getTime();
  return measurementTimes.some((t) => t >= opens && t <= closes);
}

// v1.1.0 — Adds the CONDITIONAL second ask: `followUpMinutes`, the dated
//          `upcomingOccurrences` a scheduler arms one at a time, and the window
//          that decides whether a measurement already answered one. The primary
//          reminder stays a repeating OS trigger and the follow-up cannot be —
//          nothing can evaluate "did they measure?" with the app closed.
// v1.0.0 — The measurement-reminder schedule: times of day (never instants, so
//          a patient who flies is not woken at 03:00), stable slot ids, and the
//          defaults an editor opens on. Delivery is per-platform and lives
//          outside this file; nothing here recommends how often to measure.
