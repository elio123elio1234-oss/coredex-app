/* ==================================================================
   bootTimeline — where the launch actually goes.

   ══ WHY THIS EXISTS ══
   v0.94.0 moved the server wait INTO the splash, which is what was
   asked for and is the right shape. It also meant the splash now holds
   for things nobody can see, and the first question back was the
   obvious one: *"the server is already up and on the fifth launch it
   still takes 5-6 seconds — why?"*

   That question cannot be answered from a Windows machine. The build on
   the phone is a release build over TestFlight: no Metro, no console, no
   profiler. Same predicament as `GLASS_MATERIAL` on the Settings screen
   — "it doesn't look like glass" had three indistinguishable causes and
   only the phone could say which — and the same answer: measure on the
   device and print it where it can be read and quoted.

   ══ WHAT THE NUMBERS MEAN, EXACTLY ══
   `T0` is when THIS MODULE is evaluated. `index.ts` imports it on its
   first line, so that is as close to "JavaScript started running" as
   this app can get from inside itself.

   ⚠️ It therefore does NOT include what happens before that: the process
   launch, the native splash, and Hermes reading and evaluating the
   bundle. If the phone says 3 s here and the launch FEELS like 6, the
   missing three seconds are in that stretch — which is a different
   problem with different fixes (bundle size, native init), and knowing
   which half to work on is the entire point of the row.

   Every mark is idempotent and first-write-wins, because several of
   them are set from effects that React is free to run twice.
   ================================================================== */

/** The instant JS started, near enough. See the header. */
const T0 = Date.now();

/**
 * The stages of a launch, in the order they can only happen.
 *
 *   prefs    stored preferences read → the first paint can be in the
 *            right theme and the right language
 *   session  the enclave read → we know WHO, without a network
 *   server   the revalidation settled → live, or known not to be
 *   data     the first sync landed (only when the device had nothing)
 *   app      `AuthGate` handed over to the navigator
 */
export type BootMark = 'prefs' | 'session' | 'server' | 'data' | 'app';

const ORDER: readonly BootMark[] = ['prefs', 'session', 'server', 'data', 'app'];

const marks = new Map<BootMark, number>();

export function markBoot(name: BootMark): void {
  if (!marks.has(name)) marks.set(name, Date.now() - T0);
}

/**
 * One line for a bug report, e.g.
 *   `2.4s from JS start — prefs 0.04 · session 0.22 · server 1.98 · app 0.11`
 *
 * DELTAS, not timestamps: the question is always "which stage ate it",
 * and a reader should not have to subtract four numbers on a phone
 * screen to find out. English, like every other diagnostic on that
 * screen, so a report quotes a string that can be grepped for.
 */
export function bootTimelineLabel(): string | null {
  const done = marks.get('app');
  if (done === undefined) return null;

  const parts: string[] = [];
  let prev = 0;
  for (const name of ORDER) {
    const at = marks.get(name);
    /* A missing stage is not a gap to paper over — `data` is absent on
       every launch where the device already had a mirror, which is most
       of them, and printing `0.00` for it would read as "instant"
       rather than "did not happen". */
    if (at === undefined) continue;
    parts.push(`${name} ${((at - prev) / 1000).toFixed(2)}`);
    prev = at;
  }
  return `${(done / 1000).toFixed(1)}s from JS start — ${parts.join(' · ')}`;
}

// v1.0.0 — Records where a launch goes and prints it in Settings › About. A
//          release build on TestFlight has no console to ask, and "why is it
//          still slow" is not answerable by guessing from Windows.
