/* ==================================================================
   measurementStats — WHEN this person measures, and what has drifted.

   ══ WHY A LIST OF STUDIES IS NOT AN ANSWER ══
   History is reverse-chronological rows, and forty rows look identical
   whether they were taken every morning for six weeks or eleven times in
   one panicked afternoon and then never again. The rows hold the pattern;
   they just do not show it.

   That pattern is not cosmetic. An ECG ID is only as good as the habit
   feeding it: a baseline built from four recordings taken within an hour
   of each other has seen one physiological state, not four. Knowing that
   the studies are spread across eleven weeks and three times of day is
   part of knowing what the baseline is worth — which is exactly why this
   lives next to it rather than in a separate "stats" corner.

   ══ EVERYTHING IS IN THE READER'S OWN TIMEZONE ══
   "I measure in the morning" is a claim about their morning. Hours and
   weekdays are therefore read off the local `Date`, not off the ISO
   string, and a study taken at 23:30 in Tel Aviv counts as a late-night
   study even though it is 20:30 UTC.

   ══ WHAT THIS FILE MAY NOT DO ══
   Same rule as everything around it: it counts and it divides. It does
   not advise, does not set a target, and does not tell anyone they are
   measuring too little. A number a clinician reads and acts on is fine;
   an app telling a patient what to do about their heart is not.
   ================================================================== */

import type { MeasurementPoint, MeasurementStats } from '../types/ecgIdentity';

/** One row of History, reduced to what this file needs. */
export interface MeasurementEntry {
  recordedAt: string;
  isSimulated: boolean;
  /** True when too few clean beats were found to trust the numbers. */
  insufficient: boolean;
  bpm: number | null;
  qrsMs: number | null;
  qtcMs: number | null;
}

const DAY_MS = 86_400_000;
const WEEK_MS = 7 * DAY_MS;

/** The busiest-block search slides a window this wide across the 24 hours. */
const BLOCK_HOURS = 4;

/** How many months of cadence bars the summary carries. */
const MONTHS_SHOWN = 12;

function startOfLocalDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** `YYYY-MM` in LOCAL time — grouping by UTC month would move December studies. */
function localMonthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Summarise a patient's measurement history.
 *
 * `now` is a parameter rather than a `Date.now()` call so the result is a
 * pure function of its inputs — which is what makes it testable, and what
 * lets the server compute the identical summary later.
 */
export function summariseMeasurementHistory(
  entries: readonly MeasurementEntry[],
  now: Date = new Date(),
): MeasurementStats {
  const empty: MeasurementStats = {
    total: 0,
    usable: 0,
    simulated: 0,
    firstAt: null,
    lastAt: null,
    daysTracked: 0,
    daysSinceLast: null,
    perWeek: null,
    longestGapDays: null,
    streakWeeks: 0,
    byHour: new Array(24).fill(0),
    byWeekday: new Array(7).fill(0),
    busiestBlock: null,
    byMonth: monthsBack(now, MONTHS_SHOWN).map((month) => ({ month, count: 0 })),
    trends: { bpm: [], qrsMs: [], qtcMs: [] },
  };

  // A row whose timestamp will not parse is dropped rather than counted at
  // the epoch — one such row would otherwise report a 56-year tracking span.
  const rows = entries
    .map((e) => ({ ...e, time: Date.parse(e.recordedAt) }))
    .filter((e) => Number.isFinite(e.time))
    .sort((a, b) => a.time - b.time);

  if (rows.length === 0) return empty;

  const simulated = rows.filter((r) => r.isSimulated).length;
  const usable = rows.filter((r) => !r.isSimulated && !r.insufficient).length;

  const first = rows[0];
  const last = rows[rows.length - 1];

  const byHour = new Array(24).fill(0) as number[];
  const byWeekday = new Array(7).fill(0) as number[];
  const monthCounts = new Map<string, number>();

  for (const r of rows) {
    const d = new Date(r.time);
    byHour[d.getHours()] += 1;
    byWeekday[d.getDay()] += 1;
    const key = localMonthKey(d);
    monthCounts.set(key, (monthCounts.get(key) ?? 0) + 1);
  }

  /* ── The busiest 4-hour block ──────────────────────────────────
     A sliding window that WRAPS at midnight, because "22:00–02:00" is a
     real habit and a non-wrapping scan would report it as two unrelated
     quiet periods. */
  let bestStart = 0;
  let bestCount = -1;
  for (let start = 0; start < 24; start++) {
    let count = 0;
    for (let k = 0; k < BLOCK_HOURS; k++) count += byHour[(start + k) % 24];
    if (count > bestCount) {
      bestCount = count;
      bestStart = start;
    }
  }

  /* ── Gaps, in whole LOCAL days ─────────────────────────────────
     Local midnights, not 24-hour multiples: two studies 20 hours apart
     that straddle midnight are on different days to the person who took
     them, and a DST change makes a day 23 or 25 hours long. */
  let longestGapDays: number | null = null;
  for (let i = 1; i < rows.length; i++) {
    const days = Math.round(
      (startOfLocalDay(new Date(rows[i].time)) - startOfLocalDay(new Date(rows[i - 1].time))) /
        DAY_MS,
    );
    if (longestGapDays === null || days > longestGapDays) longestGapDays = days;
  }

  const daysTracked = Math.max(
    1,
    Math.round((startOfLocalDay(now) - startOfLocalDay(new Date(first.time))) / DAY_MS) + 1,
  );
  const daysSinceLast = Math.round(
    (startOfLocalDay(now) - startOfLocalDay(new Date(last.time))) / DAY_MS,
  );

  /* ── Streak: consecutive weeks back from this one with ≥ 1 study ──
     Counted in weeks rather than days on purpose. A daily streak is a
     game mechanic, and a patient who skipped Sunday has not failed at
     anything; a run of weeks is a genuine description of a habit. */
  const weekOf = (t: number): number => Math.floor((startOfLocalDay(new Date(t)) - startOfLocalDay(new Date(0))) / WEEK_MS);
  const weeksWithStudies = new Set(rows.map((r) => weekOf(r.time)));
  const thisWeek = weekOf(now.getTime());
  let streakWeeks = 0;
  // The current week not being started yet must not break a run — the
  // streak is counted from the most recent week that HAS a study.
  let cursor = weeksWithStudies.has(thisWeek) ? thisWeek : thisWeek - 1;
  while (weeksWithStudies.has(cursor)) {
    streakWeeks++;
    cursor--;
  }

  const spanWeeks = daysTracked / 7;
  const perWeek = spanWeeks > 0 ? rows.length / spanWeeks : null;

  const point = (r: (typeof rows)[number], value: number | null): MeasurementPoint => ({
    at: r.recordedAt,
    value,
  });
  // Simulator runs are excluded from the trends: a synthetic 72 bpm is not
  // a data point about this person, and plotting it beside real ones would
  // make the line say something untrue.
  const real = rows.filter((r) => !r.isSimulated);

  return {
    total: rows.length,
    usable,
    simulated,
    firstAt: first.recordedAt,
    lastAt: last.recordedAt,
    daysTracked,
    daysSinceLast,
    perWeek: perWeek === null ? null : Math.round(perWeek * 10) / 10,
    longestGapDays,
    streakWeeks,
    byHour,
    byWeekday,
    busiestBlock: bestCount > 0 ? [bestStart, (bestStart + BLOCK_HOURS) % 24] : null,
    byMonth: monthsBack(now, MONTHS_SHOWN).map((month) => ({
      month,
      count: monthCounts.get(month) ?? 0,
    })),
    trends: {
      bpm: real.map((r) => point(r, r.bpm)),
      qrsMs: real.map((r) => point(r, r.qrsMs)),
      qtcMs: real.map((r) => point(r, r.qtcMs)),
    },
  };
}

/** The last `count` local month keys, oldest first, ending with `now`'s. */
function monthsBack(now: Date, count: number): string[] {
  const out: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    out.push(localMonthKey(new Date(now.getFullYear(), now.getMonth() - i, 1)));
  }
  return out;
}

// v1.0.0 — Measurement cadence: how often, when in the day, how long the gaps,
//          how many weeks in a row — all in the reader's own timezone, and all
//          descriptive. It counts and divides; it never advises.
