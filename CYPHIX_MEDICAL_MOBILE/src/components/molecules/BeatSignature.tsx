/* ==================================================================
   BeatSignature (molecule) — the ECG ID itself, drawn and measurable.

   One lead's baseline beat with the patient's own TOLERANCE CORRIDOR
   shaded behind it, an optional study laid over it, and a CALIPER the
   reader drags along the trace.

        ░░░░░░░░╱▔╲░░░░░░░░░░░░░░░   ← corridor: ±2σ of this person's
        ────────╱   ╲──╮   ╭──────      own measured repeatability
                  ┊    ╰───╯
                  ┊ ← the caliper, under the finger

   ══ THE GEOMETRY IS THE REPORT'S. THE SURFACE IS NOT. ══
   Same millimetre grid, same `buildEcgGrid`/`buildEcgPath`, same standard
   scales as the report — because the whole claim of a median beat is that
   it shows detail no single beat does, and detail you cannot measure is
   decoration.

   But it is NOT drawn on the report's white sheet. `EcgStripSvg`'s header
   is emphatic that CYPHIX's report paper is white with a blue grid and is
   not to be re-invented — and that rule is about the REPORT, which is a
   document: a printable page, on paper, with its own edges. This is an
   instrument panel on a screen. Boxed on white paper inside a white card
   on a grey page it was reported as "a drawing on the screen rather than
   information about my heart", and that reading was right: three nested
   rectangles announce a picture pasted into a layout.

   So the trace is drawn straight onto the app's own background, full
   bleed, with the grid as a faint tint of the brand. Nothing measurable
   changed — a small square is still 20 ms, the scale is still printed —
   but the ECG stops being a picture ON the screen and becomes the screen.

   ══ ★ THE BOX NEVER RESIZES ══
   The height and the gain were derived per lead from that lead's own
   amplitude. Every lead therefore drew a different-sized rectangle, and
   dragging the builder resized it under the finger — reported, exactly
   right, as feeling unstable.

   Both are now handed IN by the caller, chosen once from the tallest lead
   in the whole identity, which is what a real 12-lead sheet does: one
   gain, one channel height, every lead on it. A small lead then draws as
   a small trace in the same box — which is true, and is information. A
   lead scaled to fill its own box is the picture that lies.

   ══ 50 mm/s, AND WHY THAT IS NOT A LIBERTY ══
   One beat is 700 ms. At the 25 mm/s of a rhythm strip that is 17.5 mm of
   paper — and since the same beat is ~27 mm TALL at standard gain, a
   square-gridded sheet of it is a narrow vertical sliver.

   50 mm/s is the other standard sweep speed on every clinical cart, used
   for exactly this: short segments read for detail. One large square is
   100 ms instead of 200 ms, the gain is untouched, and the caption says
   which speed is in force. What it is NOT is a FITTED scale — the earlier
   web report derived 17.1 mm/s by fitting a recording to the page, and a
   QRS measured by eye off that reads ~30 % narrow (`EcgStripSvg` header).

   The gain drops to 5 mm/mV — also standard, also printed — only when a
   complex is too tall for the sheet at 10 (`pickGain`). Clipping the R
   wave to protect the layout would be the one change that makes this
   trace lie.

   ══ ★ THE CALIPER, REBUILT IN v5.0.0 — IT LIVES ONLY UNDER THE FINGER ══
   Three linked changes, all from one report: *"the line that runs over
   the wave should vibrate as hard as possible, and when I lift my finger
   the green line should disappear, and while it's there it should write
   the wave's value nicely."* Each one is a correction to a decision that
   was right when it was made and stopped being right afterwards.

   1. THE READOUT IS BACK, AND IT IS ON THE SHEET. It used to be handed
      up to the caller and drawn in the chrome above, on the rule History
      learned in v0.16.0: a readout floating on the trace covers the
      deflections whose position it reports. That rule is still true and
      is why this label sits at the TOP EDGE, on paper, beside the line
      and never on it — flipping to whichever side of the caliper has
      room. What changed is that v0.44.0 deleted the chrome strip, so
      from then on the caliper reported into nothing: a green line you
      could drag along your own ECG that told you no value at all.
   2. IT VANISHES ON RELEASE. It used to stay where it was left, so that
      the reader was not holding a finger over the point they were trying
      to read. That reasoning depended entirely on the readout being
      elsewhere and PERSISTENT — with the number travelling with the line
      and gone on lift, a parked caliper is just a green line sitting on
      the trace saying nothing, which is what was reported.
   3. THE TICK IS THE HARDEST THE PLATFORM HAS. See `moveCaliper`.

   ⚠️ The lead label hides while the caliper is out. Two floating chips at
   the top edge is precisely the clutter this screen was stripped for, and
   nobody measuring a beat is wondering which lead they are on.
   ================================================================== */

import { useCallback, useId, useMemo, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, { Circle, ClipPath, Defs, G, Line, Path, Rect } from 'react-native-svg';
import { runOnJS } from 'react-native-reanimated';
import { StyleSheet, Text, View } from 'react-native';
import {
  buildEcgGrid,
  buildEcgPath,
  CORRIDOR_BAND_SIGMA,
  STANDARD_MM_PER_MV,
} from '@cyphix/shared';
import { RADIUS } from '@/theme/tokens';
import { useIsDark, useTheme } from '@/theme/useTheme';

/* ── The SCREEN palette ───────────────────────────────────────────
   Not `ECG_PAPER_*`. Those are the report's, they carry a white sheet,
   and a white sheet is what turned this panel into a picture pasted onto
   a page (see the header). Here the ground is the app's own background
   and only the marks are drawn, as a faint tint of the brand.

   The TRACE colours are the report's, deliberately unchanged: navy in
   light, green in dark. That is the brand's ECG and a reader should meet
   the same trace everywhere; it is the paper under it that had to go. */
export const SCREEN_LIGHT = {
  gridMinor: 'rgba(13, 32, 65, 0.07)',
  gridMajor: 'rgba(13, 32, 65, 0.15)',
  trace: '#0A2540',
  marker: 'rgba(13, 32, 65, 0.34)',
  /* ★ THE PAPER IS BACK — v0.44.0, reported as "the rounded rectangle
     with no outline and no shadow behind it doesn't look professional".
     Both halves of that are right, and the fix is NOT the white card
     v0.33.0 removed. What was wrong then was a white sheet inside a white
     CARD on a grey page — three nested rectangles. What is wrong now is
     the opposite extreme: a grid floating on the page with no edge at
     all, so it reads as a texture rather than as a recording.

     A sheet needs (a) a ground of its own, (b) an EDGE, (c) somewhere to
     sit. Paper, a hairline, and a soft shadow. The grid keeps the brand's
     navy tint rather than clinical pink — chosen deliberately, because
     pink reads as a hospital printout and this is the patient's app. */
  paper: '#FFFFFF',
  edge: 'rgba(13, 32, 65, 0.13)',
};
export const SCREEN_DARK = {
  gridMinor: 'rgba(159, 180, 216, 0.10)',
  gridMajor: 'rgba(159, 180, 216, 0.19)',
  /* ★ NEAR-WHITE, not the report's green.
     The rule this panel follows is: the BASELINE is neutral and the
     COMPARED study is the brand colour. In light that is navy against
     green and reads instantly. Keeping the report's green trace in dark
     would put green against green — two curves the eye has to work to
     separate, in the one place whose entire job is showing where they
     differ. The report keeps its own palette; this is not the report. */
  trace: '#E8EEF7',
  marker: 'rgba(159, 180, 216, 0.42)',
  /* In dark there is no "paper" to imitate — a white sheet at night is a
     torch. The ground is one step LIFTED off the page instead, which is
     the same signal (this surface is a thing) in the register the dark
     theme already speaks. */
  paper: '#141D30',
  edge: 'rgba(159, 180, 216, 0.16)',
};

/** What the caliper is sitting on right now. Null when it is parked. */
export interface CaliperReading {
  /** Milliseconds from the R peak — negative before it. */
  msFromR: number;
  /** The baseline's value there, mV. */
  baselineMv: number;
  /** ±half-width of the corridor there, mV. */
  toleranceMv: number;
  /** The overlaid study's value there, when one is shown. */
  overlayMv: number | null;
}

interface Props {
  /** The baseline beat, in mV, on the canonical template grid. */
  baseline: Float32Array;
  /** Per-sample σ of this person's own variation. Same length. */
  tolerance: Float32Array;
  sampleRate: number;
  /** Sample index of R — where the vertical R marker is drawn. */
  rIndex: number;
  /** A single study's beat to lay over the baseline, when comparing. */
  overlay?: Float32Array | null;
  /** Rendered width in points; the mm sheet scales into it. */
  width: number;
  /**
   * ★ Gain and channel height, chosen ONCE by the caller for every lead —
   * see the header. Passing them in is what stops the box resizing.
   */
  mmPerMv: number;
  heightMm?: number;
  /** Lead name printed on the sheet. */
  label: string;
  /** Extra note appended to the scale caption. */
  caption?: string;
  /**
   * Whether the sheet can be measured at all.
   *
   * ★ Separate from `onCaliper` since v5.0.0. The gesture used to be
   * gated on a listener being passed, which meant the ONLY way to switch
   * the caliper on was to subscribe to it — so `EcgIdentityPanel` kept a
   * `caliper` state it no longer rendered anywhere, and every millimetre
   * the finger moved re-rendered the entire Insights tree at gesture
   * rate. The reading is drawn on the sheet now, so nobody has to listen
   * to it to have it.
   */
  measurable?: boolean;
  /** Optional listener, for a caller that wants the reading elsewhere. */
  onCaliper?: (reading: CaliperReading | null) => void;
}

/** Detail sweep speed — the second clinical standard. See the header. */
export const SIGNATURE_MM_PER_SEC = 50;

/** Leading margin so the P wave does not start on the sheet edge. */
const LEAD_IN_MM = 3;
/** Trailing margin so the T wave does not run into it either. */
const TAIL_MM = 2;
/** One channel height for every lead, always. See the header. */
export const SIGNATURE_HEIGHT_MM = 26;

/**
 * ★ How much page is left either side of the sheet.
 *
 * The sheet ran to the screen edge exactly. With square corners that read
 * as a slab; with ROUNDED corners it reads worse — a curve that ends flush
 * against the edge does not look like a corner, it looks like the grid
 * spilling off the display. A rounded rectangle needs to be seen to be
 * one.
 *
 * Small enough that this is still "the ECG gets the width" and not a card
 * — 10 pt against a 20 pt page margin is half the inset everything else
 * on the screen has, so the sheet still visibly breaks out of the column.
 */
export const SHEET_MARGIN = 10;
/** Space kept clear of the sheet edges so a tall R is not shaved by it. */
const HEADROOM_MM = 5;

/** How far the floating readout sits from the caliper line, in points. */
const READOUT_GAP = 10;
/** …and the least it may come to the sheet's own edge. */
const READOUT_EDGE = 8;

/**
 * The standard gains, largest first. Only these three: a gain a clinician
 * has not spent a career reading is a gain nobody can measure against.
 */
const STANDARD_GAINS = [STANDARD_MM_PER_MV, 5, 2.5] as const;

/**
 * The largest STANDARD gain at which `peakMv` still fits the channel.
 *
 * Called once per identity with the tallest lead's peak, so switching
 * leads or dragging the builder cannot change the scale under the reader.
 * Falls through to the smallest gain rather than inventing a fitted one —
 * an off-standard scale is how a QRS comes to be measured ~30 % narrow
 * (`ecgPath.ts`).
 */
export function pickGain(peakMv: number, heightMm = SIGNATURE_HEIGHT_MM): number {
  const usable = heightMm - HEADROOM_MM;
  for (const gain of STANDARD_GAINS) {
    if (2 * peakMv * gain <= usable) return gain;
  }
  return STANDARD_GAINS[STANDARD_GAINS.length - 1];
}

/**
 * The caliper ticks once per small square — 20 ms at 50 mm/s.
 *
 * Per FRAME would buzz continuously and mean nothing; per 100 ms would
 * feel laggy. One tick per square makes the grid something the finger can
 * feel, which is the whole point of putting a caliper on paper.
 */
const TICK_MM = 1;

/**
 * ★ The floor between two taptic events while dragging the caliper.
 *
 * A square is 1 mm and the sheet is ~40 mm wide, so an unhurried sweep
 * crosses 40 squares in about a second — and asking the engine for a
 * HEAVY impact every 25 ms is asking for more than it can reproduce.
 * Past that rate the thumps stop being separate events and merge into
 * one flat rumble, which is weaker in the hand than a slower train of
 * distinct hits even though it is nominally "more vibration".
 *
 * So the strongest tick the platform has is paired with a floor that
 * lets each one actually land. This throttles the BUZZ only — the line
 * and its readout still move on every square, so the picture never lags
 * the finger.
 */
const MIN_TICK_MS = 45;

/**
 * The corridor as ONE closed polygon: the upper bound left-to-right, the
 * lower bound right-to-left, closed. Two stroked lines were tried and
 * rejected — they read as two more traces, and the eye then compares three
 * curves instead of seeing one region.
 */
function buildCorridor(
  baseline: Float32Array,
  tolerance: Float32Array,
  opts: {
    sampleRate: number;
    mmPerMv: number;
    mmPerSec: number;
    baselineMm: number;
    xOffsetMm: number;
    clipMm: number;
  },
): string {
  const n = Math.min(baseline.length, tolerance.length);
  if (n < 2) return '';
  const { sampleRate, mmPerMv, mmPerSec, baselineMm, xOffsetMm, clipMm } = opts;

  const x = (i: number) => xOffsetMm + (i / sampleRate) * mmPerSec;
  const y = (mv: number) => baselineMm - Math.max(-clipMm, Math.min(clipMm, mv * mmPerMv));

  const up: string[] = [];
  const down: string[] = [];
  /* One point every few samples: the corridor is a smooth envelope, and a
     225-point polygon per lead is DOM weight for detail no eye resolves. */
  const step = Math.max(1, Math.round(n / 90));
  for (let i = 0; i < n; i += step) {
    const band = tolerance[i] * CORRIDOR_BAND_SIGMA;
    up.push(`${x(i).toFixed(2)} ${y(baseline[i] + band).toFixed(2)}`);
    down.push(`${x(i).toFixed(2)} ${y(baseline[i] - band).toFixed(2)}`);
  }
  down.reverse();

  return `M${up[0]} ${up.slice(1).map((p) => `L${p}`).join(' ')} ${down.map((p) => `L${p}`).join(' ')} Z`;
}

export default function BeatSignature({
  baseline,
  tolerance,
  sampleRate,
  rIndex,
  overlay,
  width,
  mmPerMv,
  heightMm = SIGNATURE_HEIGHT_MM,
  label,
  caption,
  measurable = false,
  onCaliper,
}: Props) {
  const t = useTheme();
  const dark = useIsDark();
  const c = dark ? SCREEN_DARK : SCREEN_LIGHT;

  const mmPerSec = SIGNATURE_MM_PER_SEC;

  /** Caliper position as a sample index, or null when parked. */
  const [cursor, setCursor] = useState<number | null>(null);
  /** Last square the finger crossed — the tick fires on change, not per frame. */
  const lastTick = useRef<number | null>(null);
  /** When the last tick actually fired — see `MIN_TICK_MS`. */
  const lastTickAt = useRef(0);
  /** Measured width of the floating readout, so it can be kept on the sheet. */
  const [readoutW, setReadoutW] = useState(0);

  const geometry = useMemo(() => {
    const durationSec = baseline.length / sampleRate;
    const widthMm = LEAD_IN_MM + durationSec * mmPerSec + TAIL_MM;
    const baselineMm = heightMm / 2;
    const clipMm = baselineMm - 0.6;

    const pathOpts = {
      sampleRate,
      mmPerSec,
      mmPerMv,
      baselineMm,
      xOffsetMm: LEAD_IN_MM,
      bucketsPerMm: 8,
      clipMm,
    };

    return {
      widthMm,
      baselineMm,
      clipMm,
      grid: buildEcgGrid(widthMm, heightMm),
      corridor: buildCorridor(baseline, tolerance, {
        sampleRate,
        mmPerMv,
        mmPerSec,
        baselineMm,
        xOffsetMm: LEAD_IN_MM,
        clipMm,
      }),
      trace: buildEcgPath(baseline, pathOpts),
      ghost: overlay ? buildEcgPath(overlay, pathOpts) : '',
      rX: LEAD_IN_MM + (rIndex / sampleRate) * mmPerSec,
    };
  }, [baseline, tolerance, overlay, sampleRate, rIndex, mmPerSec, mmPerMv, heightMm]);

  // Uniform scale — the grid squares must stay SQUARE or every interval
  // measured off this sheet is wrong.
  const height = (width * heightMm) / geometry.widthMm;
  const pxPerMm = width / geometry.widthMm;

  /* ── The rounded corners ──────────────────────────────────────
     Done as an SVG `ClipPath`, NOT as `overflow: 'hidden'` plus a
     `borderRadius` on the wrapping View. Clipping a native SVG child to a
     parent's rounded corners is one of the places Android and iOS have
     historically disagreed, and a corner that is round on one platform and
     square on the other is exactly the class of defect a typecheck and a
     bundle both wave through.

     The radius is converted from POINTS into millimetres through the
     sheet's own scale, so it is the same visual curve whatever width the
     sheet is handed — a fixed mm radius would grow and shrink with the
     device. `useId` because react-native-svg resolves `url(#…)` per
     document on Android: two sheets sharing an id would clip to whichever
     mounted last. */
  const clipId = useId();
  const rxMm = pxPerMm > 0 ? RADIUS.lg / pxPerMm : 0;

  /** Screen x (points) → sample index, clamped to the drawn beat. */
  const sampleAt = useCallback(
    (px: number): number => {
      const mm = px / pxPerMm - LEAD_IN_MM;
      const index = Math.round((mm / mmPerSec) * sampleRate);
      return Math.max(0, Math.min(baseline.length - 1, index));
    },
    [pxPerMm, mmPerSec, sampleRate, baseline.length],
  );

  const moveCaliper = useCallback(
    (px: number) => {
      const index = sampleAt(px);
      setCursor(index);

      /* ★ ONE HEAVY TICK PER SMALL SQUARE CROSSED — v5.0.0.
         `Heavy` is the strongest single event either platform exposes
         through `expo-haptics`; the only thing louder in the API is
         `notificationAsync`, which is a multi-thump PATTERN meaning
         success / warning / error and would be both wrong here and
         impossible to fire at scrubbing rate.
         It replaces `selectionAsync`, the lightest event iOS defines —
         reported as too faint, which it is: it is tuned for a picker
         wheel under a resting thumb, and this finger is moving.
         `MIN_TICK_MS` keeps consecutive hits far enough apart that the
         engine can actually deliver them as separate thumps. */
      const square = Math.round((index / sampleRate) * mmPerSec / TICK_MM);
      if (lastTick.current !== square) {
        lastTick.current = square;
        const now = Date.now();
        if (now - lastTickAt.current >= MIN_TICK_MS) {
          lastTickAt.current = now;
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        }
      }

      onCaliper?.({
        msFromR: ((index - rIndex) / sampleRate) * 1000,
        baselineMv: baseline[index],
        toleranceMv: (tolerance[index] ?? 0) * CORRIDOR_BAND_SIGMA,
        overlayMv: overlay ? (overlay[index] ?? null) : null,
      });
    },
    [sampleAt, sampleRate, mmPerSec, onCaliper, rIndex, baseline, tolerance, overlay],
  );

  const releaseCaliper = useCallback(() => {
    lastTick.current = null;
    /* ★ THE CALIPER EXISTS ONLY WHILE THE FINGER IS DOWN — v5.0.0.
       It used to stay where it was left, so the reader was not holding a
       finger over the point they were trying to read. That was sound
       while the readout lived in the chrome ABOVE the sheet and stayed
       up: you parked the line, then read the figures. Once the chrome
       strip was deleted (v0.44.0) and the number moved onto the sheet
       under the finger, a parked line reports nothing — it is a green
       mark left on someone's own ECG. Reported exactly that way. */
    setCursor(null);
    onCaliper?.(null);
  }, [onCaliper]);

  /* ★ A TAP places the caliper; a HORIZONTAL drag carries it; a VERTICAL
     drag is not ours and must reach the page behind us.

     This card lives inside a vertical ScrollView, so the axis thresholds
     are not polish — without `failOffsetY` the pan wins the moment a
     finger moves and the sheet becomes a hole the page cannot be scrolled
     through. And an `onBegin` handler (the first version) fires on
     touch-DOWN, so merely resting a thumb on the card while flicking past
     dropped a caliper and buzzed. `onStart` runs only after the gesture
     has actually been claimed, which is the difference between a control
     that responds and one that interrupts.

     `runOnJS` because everything this touches — React state, the haptic
     engine — lives on the JS thread; gesture-handler workletizes these
     callbacks when Reanimated is present, so calling into JS directly
     would be a crash rather than a slowdown. The work per event is one
     array index, not a re-render of the sheet. */
  const gesture = useMemo(() => {
    if (!measurable && !onCaliper) return null;
    const pan = Gesture.Pan()
      .activeOffsetX([-6, 6])
      .failOffsetY([-12, 12])
      .onStart((e) => runOnJS(moveCaliper)(e.x))
      .onUpdate((e) => runOnJS(moveCaliper)(e.x))
      .onFinalize(() => runOnJS(releaseCaliper)());

    /* ★ THE TAP IS GONE, AND A HOLD REPLACES IT — v5.0.0.
       A tap fires on RELEASE, and the caliper is now gone on release, so
       tapping could only ever flash a line that erased itself. Holding
       still is the gesture that matches the new behaviour: press, the
       line and its value appear where the finger is; slide, they follow;
       lift, they are gone.
       180 ms so that a finger passing through on its way to scrolling
       the page does not drop a caliper — the same defect `onBegin`
       caused in v2.0.0, arrived at from the other direction. The huge
       `maxDistance` is what turns a long-press into a hold-and-drag:
       without it, gesture-handler cancels the press the moment the
       finger travels, and the caliper would die under a slow sweep. */
    const hold = Gesture.LongPress()
      .minDuration(180)
      .maxDistance(10_000)
      .onStart((e) => runOnJS(moveCaliper)(e.x))
      .onTouchesMove((e) => {
        const touch = e.allTouches[0];
        if (touch) runOnJS(moveCaliper)(touch.x);
      })
      .onFinalize(() => runOnJS(releaseCaliper)());

    return Gesture.Race(pan, hold);
  }, [measurable, onCaliper, moveCaliper, releaseCaliper]);

  /* ── The floating readout ──────────────────────────────────────
     Drawn as real text in a View rather than as SVG `<Text>`: this is
     the one label on the sheet a reader has to READ rather than glance
     at, and react-native-svg's text lays out through each platform's own
     path renderer — weights, tabular figures and letter-spacing do not
     land identically on iOS and Android. A View also gets the paper fill
     for free, which is what keeps the figures legible when the finger is
     over a dense part of the trace.

     ⚠️ It is placed BESIDE the caliper, on whichever side has room, and
     never centred on it: centred, the line runs straight through the
     number, and at either end of the sheet half the label would be
     clipped by the rounded corner. */
  const readout = useMemo(() => {
    if (cursor === null) return null;
    const ms = ((cursor - rIndex) / sampleRate) * 1000;
    const mv = baseline[cursor] ?? 0;
    const ov = overlay ? (overlay[cursor] ?? null) : null;
    return {
      /* The sign is the information: this beat is aligned on R, so a
         negative number is "before the R wave" and that is how every
         interval on this screen is quoted. */
      time: `${ms > 0 ? '+' : ''}${Math.round(ms)} ms`,
      mv: `${mv >= 0 ? '' : '−'}${Math.abs(mv).toFixed(2)} mV`,
      overlay: ov === null ? null : `${ov >= 0 ? '' : '−'}${Math.abs(ov).toFixed(2)} mV`,
    };
  }, [cursor, rIndex, sampleRate, baseline, overlay]);

  const cursorX = cursor === null ? null : LEAD_IN_MM + (cursor / sampleRate) * mmPerSec;
  const cursorY =
    cursor === null
      ? null
      : geometry.baselineMm -
        Math.max(-geometry.clipMm, Math.min(geometry.clipMm, baseline[cursor] * mmPerMv));

  const sheet = (
    /* ★ The shadow lives on the WRAPPER, not on the Svg. A native SVG
       view does not cast one on either platform, and `elevation` on it is
       silently ignored on Android — so the sheet would have looked framed
       in the simulator and flat on a phone, which is exactly the class of
       defect a bundle waves through. */
    <View
      style={[
        styles.sheet,
        {
          width,
          height,
          borderRadius: rxMm * pxPerMm,
          backgroundColor: c.paper,
          shadowColor: dark ? '#000000' : '#0A2540',
        },
      ]}
    >
      <Svg
        width={width}
        height={height}
        viewBox={`0 0 ${geometry.widthMm} ${heightMm}`}
        preserveAspectRatio="xMidYMid meet"
        accessibilityLabel={`ECG ID · lead ${label}`}
      >
        <Defs>
          <ClipPath id={clipId}>
            <Rect x={0} y={0} width={geometry.widthMm} height={heightMm} rx={rxMm} ry={rxMm} />
          </ClipPath>
        </Defs>

        {/* Everything drawn lives inside the rounded sheet — including the
            caliper, which must stop at the same edge the grid does. */}
        <G clipPath={`url(#${clipId})`}>
        {/* The paper itself. Inside the clip so the corners are the
            sheet's, and under everything so the grid sits ON it. */}
        <Rect x={0} y={0} width={geometry.widthMm} height={heightMm} fill={c.paper} />
        {/* Dimmed against the report's grid — context, not the subject. */}
        <Path d={geometry.grid.minor} fill="none" stroke={c.gridMinor} strokeWidth={0.07} opacity={0.55} />
        <Path d={geometry.grid.major} fill="none" stroke={c.gridMajor} strokeWidth={0.14} opacity={0.7} />

        {/* The corridor sits UNDER everything: it is the field the traces
            live in, not a mark on top of them. */}
        {geometry.corridor !== '' && (
          <Path d={geometry.corridor} fill={c.marker} fillOpacity={0.14} stroke="none" />
        )}

        {/* Where R sits — the point every beat in the stack was aligned on,
            and therefore the origin of every interval quoted beside this. */}
        <Line
          x1={geometry.rX}
          y1={0.8}
          x2={geometry.rX}
          y2={heightMm - 0.8}
          stroke={c.marker}
          strokeWidth={0.1}
          strokeDasharray="0.5 1"
          opacity={0.6}
        />

        {/* The compared study, under the baseline: the baseline is the
            reference and must stay the readable one. */}
        {geometry.ghost !== '' && (
          <Path
            d={geometry.ghost}
            fill="none"
            stroke={t.signal}
            strokeWidth={0.22}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.9}
          />
        )}

        <Path
          d={geometry.trace}
          fill="none"
          stroke={c.trace}
          strokeWidth={0.3}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* The caliper, above everything — it is what the finger is doing. */}
        {cursorX !== null && cursorY !== null && (
          <>
            <Line
              x1={cursorX}
              y1={0}
              x2={cursorX}
              y2={heightMm}
              stroke={t.signal}
              strokeWidth={0.18}
            />
            <Circle cx={cursorX} cy={cursorY} r={0.55} fill={t.signal} />
          </>
        )}
        </G>

        {/* ★ The edge, OUTSIDE the clip and drawn last. Inside it, half the
            stroke would be clipped away and the hairline would render at
            half weight — visibly thinner than every other rule on the
            screen, which is worse than having no edge at all. */}
        <Rect
          x={0.05}
          y={0.05}
          width={geometry.widthMm - 0.1}
          height={heightMm - 0.1}
          rx={rxMm}
          ry={rxMm}
          fill="none"
          stroke={c.edge}
          strokeWidth={0.1}
        />
      </Svg>

      {/* ⚠️ The lead name steps aside while the caliper is out. Two chips
          at the top edge is the clutter this screen was stripped for, and
          nobody measuring a beat is wondering which lead they are on. */}
      {readout === null && (
        <Text style={[styles.label, { color: c.trace }]} allowFontScaling={false}>
          {label}
        </Text>
      )}

      {readout !== null && cursorX !== null && (
        <View
          pointerEvents="none"
          onLayout={(e) => setReadoutW(e.nativeEvent.layout.width)}
          style={[
            styles.readout,
            {
              backgroundColor: c.paper,
              borderColor: c.edge,
              /* Beside the line on the side with room, clamped so it can
                 never hang past the sheet's rounded corner. `readoutW`
                 is 0 on the very first frame, which parks it left of the
                 line for one frame — invisible at 60 Hz, and the
                 alternative is measuring before painting, which is a
                 frame of blank. */
              left: Math.max(
                READOUT_EDGE,
                Math.min(
                  width - readoutW - READOUT_EDGE,
                  cursorX * pxPerMm < width / 2
                    ? cursorX * pxPerMm + READOUT_GAP
                    : cursorX * pxPerMm - READOUT_GAP - readoutW,
                ),
              ),
            },
          ]}
        >
          <Text style={[styles.readoutTime, { color: t.textSecondary }]} allowFontScaling={false}>
            {readout.time}
          </Text>
          <Text style={[styles.readoutMv, { color: c.trace }]} allowFontScaling={false}>
            {readout.mv}
          </Text>
          {/* The compared study's value at the same instant, in the same
              colour it is drawn in — the pair IS the comparison, and
              quoting one number without the other makes the reader hold
              the second one in their head while dragging. */}
          {readout.overlay !== null && (
            <Text style={[styles.readoutMv, { color: t.signal }]} allowFontScaling={false}>
              {readout.overlay}
            </Text>
          )}
        </View>
      )}
      {/* ★ The scale is ALWAYS printed, and the caption is appended to it
          rather than replacing it. A sheet whose speed and gain are not
          stated cannot be measured, and this one is not on the defaults. */}
      <Text style={[styles.scale, { color: t.textTertiary }]} allowFontScaling={false}>
        {mmPerSec} mm/s · {mmPerMv} mm/mV{caption ? ` · ${caption}` : ''}
      </Text>
    </View>
  );

  if (!gesture) return sheet;
  return <GestureDetector gesture={gesture}>{sheet}</GestureDetector>;
}

const styles = StyleSheet.create({
  /* Soft and LOW: a sheet resting on the page, not a card floating above
     it. A large blur with a big offset is the "web dashboard" shadow the
     de-carding was about; 6 pt of blur at 2 pt down is the difference
     between an object having weight and an object being pasted on. */
  sheet: {
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  /* Inset from the sheet EDGE, not from a card's padding: this thing is
     full-bleed. The inset clears the corner RADIUS as well as the screen
     edge — a label tucked at 2 pt sits in the arc that was just cut away
     and reads as floating loose of the sheet it belongs to. */
  label: {
    position: 'absolute',
    top: 6,
    left: 20,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
    opacity: 0.8,
  },
  scale: {
    position: 'absolute',
    bottom: 6,
    right: 20,
    fontSize: 8.5,
    fontVariant: ['tabular-nums'],
  },
  /* One row, at the top edge, on paper. The border is the sheet's own
     hairline so the chip reads as part of the instrument rather than as
     a tooltip from another design language. */
  readout: {
    position: 'absolute',
    top: 5,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 7,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
  /* Tabular figures on both, without exception: a number that reflows as
     the finger moves is a number nobody can read while moving it. */
  readoutTime: { fontSize: 13, fontVariant: ['tabular-nums'] },
  readoutMv: { fontSize: 14.5, fontWeight: '700', fontVariant: ['tabular-nums'] },
});

// v5.0.0 — ★ The caliper lives only under the finger, and it says what it is
//          sitting on. From one report: "the line over the wave should vibrate
//          as hard as possible, when I lift my finger it should disappear, and
//          while it's there it should write the wave's value nicely."
//          • THE READING IS BACK, ON THE SHEET — a paper chip at the top edge
//            beside the line (never centred on it, never over the trace),
//            carrying ms from R, the baseline's mV, and the compared study's mV
//            in the colour it is drawn in. v0.44.0 deleted the chrome strip the
//            caliper reported into and did not move the numbers, so since then
//            it had been a line you could drag along your own ECG that told you
//            nothing.
//          • IT VANISHES ON RELEASE. Persisting was right only while the
//            readout was elsewhere AND stayed up; with the number travelling
//            with the line, a parked caliper is a green mark left on the trace.
//          • THE TICK IS `Heavy`, the strongest single event either platform
//            exposes — `selectionAsync` is the LIGHTEST iOS defines and was
//            reported as unfeelable. MIN_TICK_MS (45 ms) spaces them so the
//            engine delivers separate thumps instead of one flat rumble; it
//            throttles the buzz only, never the line.
//          • THE TAP IS GONE, a 180 ms HOLD replaces it: a tap fires on release
//            and the caliper is now gone on release, so it could only flash a
//            line that erased itself.
//          • `measurable` replaces "gated on someone listening" — that gate
//            made `EcgIdentityPanel` keep a reading it no longer drew, and
//            re-render the whole Insights tree at gesture rate.
// v4.0.0 — The sheet is PAPER again: a ground of its own, a hairline edge and
//          a low soft shadow. Reported as "the rounded rectangle with no
//          outline and no shadow behind it doesn't look professional", and both
//          halves of that are right. ⚠️ This is NOT the white card v0.33.0
//          removed — what was wrong then was a white sheet inside a white CARD
//          on a grey page, three nested rectangles. What was wrong after it is
//          the opposite: a grid floating with no edge at all, which reads as a
//          texture rather than as a recording. The grid keeps the brand's navy
//          tint rather than going clinical pink: pink reads as a hospital
//          printout, and this is the patient's app. The shadow is on the
//          wrapper View, never the Svg — a native SVG view casts none on either
//          platform and ignores `elevation` on Android, so it would have looked
//          framed in the simulator and flat on a phone.
// v3.1.0 — Rounded sheet corners, as an SVG ClipPath rather than a View's
//          `overflow: hidden` + `borderRadius`: clipping a native SVG child to
//          a parent's rounded corners is a place iOS and Android have
//          historically disagreed, and a corner round on one and square on the
//          other passes typecheck, bundle and doctor alike. The radius is
//          converted from points into mm through the sheet's own scale, so the
//          curve looks the same at any width.
// v3.0.0 — Two changes from device feedback, both about it not feeling native:
//          • the sheet no longer has a size of its own. Height and gain are
//            handed in, chosen once from the tallest lead in the identity, so
//            switching leads and dragging the builder stop resizing the box
//            under the finger. One gain, one channel height, every lead — what
//            a real 12-lead sheet does;
//          • the white paper is gone. The trace is drawn straight onto the
//            app's background with the grid as a faint brand tint. The report
//            keeps its paper (it is a document); this is an instrument panel,
//            and a white rectangle inside a white card on a grey page reads as
//            a picture pasted into a layout.
// v2.0.0 — A draggable caliper: tap or drag anywhere on the sheet and a line
//          follows the finger, ticking once per small square, reporting time
//          from R / baseline mV / corridor width UP to the caller so the readout
//          is drawn in the chrome and never over the trace.
// v1.0.0 — The ECG ID on real millimetre paper at 50 mm/s (the clinical DETAIL
//          speed, not a fitted one), gain dropping to half-standard only when a
//          complex will not fit and saying so, the patient's own ±2σ corridor as
//          one filled region behind the beat, and an optional study over it.
