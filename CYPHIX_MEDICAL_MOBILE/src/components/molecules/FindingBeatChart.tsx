/* ==================================================================
   FindingBeatChart (molecule) — the patient's OWN beat, with the part the
   rule looked at highlighted.

   ══ WHY THE REAL BEAT AND NOT AN ILLUSTRATION ══
   A stock diagram of a heart explains the concept and proves nothing. The
   question this component answers is not "what is a QT interval", it is
   "why did YOU flag MINE" — and only the patient's own waveform can answer
   that. Drawing their beat and shading the segment the rule measured turns
   a verdict into something they can look at and check.

   ══ WHICH BEAT ══
   The one whose RR interval is closest to the median: the most
   representative single beat in the recording, and the cheapest honest
   choice. Averaging beats would be better statistics and worse evidence —
   an averaged beat is not a beat that happened, and the whole point here is
   to show something that did.

   ══ THE HIGHLIGHT IS DERIVED, NOT SWITCHED ON ══
   The window comes from the finding's `focus`, which the RULE declares.
   A switch here on finding id would be a second copy of "what did this rule
   look at", and the two would drift the first time a rule changed.
   ================================================================== */

import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Line, Path, Rect } from 'react-native-svg';
import type { BeatFocus } from '@cyphix/shared';
import { useTheme } from '@/theme/useTheme';

interface Props {
  /** Filtered lead II — the conventional rhythm strip. */
  signal: Float32Array;
  rPeaks: number[];
  sampleRate: number;
  focus: BeatFocus;
  /** The finding's colour. */
  accent: string;
  height?: number;
}

/** How much of the beat to draw, either side of R. Wide enough to include a
    P wave before and the whole T wave after at ordinary rates. */
const BEFORE_S = 0.32;
const AFTER_S = 0.46;

/**
 * Where each focus sits, in seconds RELATIVE TO R.
 *
 * Approximate on purpose. These are drawn as a soft band behind the trace,
 * not as calipers — the exact boundaries are per-beat and live in the
 * measurement layer. Implying millisecond precision with a shaded rectangle
 * would be claiming a delineation this drawing has not done.
 */
const WINDOW: Record<BeatFocus, [number, number] | null> = {
  p: [-0.24, -0.1],
  pr: [-0.22, -0.03],
  qrs: [-0.05, 0.06],
  st: [0.05, 0.14],
  t: [0.14, 0.34],
  qt: [-0.05, 0.34],
  /* The rhythm is about the gaps BETWEEN beats, so a band inside one beat
     would point at the wrong thing entirely. `rhythm` switches the whole
     chart to a multi-beat strip instead — see `RHYTHM_SECONDS`. */
  rhythm: null,
  none: null,
};

/** How much of the recording a rhythm finding shows. Long enough for the
    spacing to be the visible subject, short enough that the beats are still
    beats rather than a hedge. */
const RHYTHM_SECONDS = 5;

export default function FindingBeatChart({
  signal,
  rPeaks,
  sampleRate,
  focus,
  accent,
  height = 150,
}: Props) {
  const t = useTheme();

  const beat = useMemo(() => {
    if (rPeaks.length === 0 || signal.length === 0) return null;

    /* ── A rhythm finding is about the SPACING, so it gets a strip ──
       Five seconds from the start of the recording rather than one beat: a
       pause, an early beat or an irregular rhythm is invisible in a single
       complex, and shading part of one complex would point at the wrong
       thing entirely. */
    if (focus === 'rhythm') {
      const to = Math.min(signal.length - 1, Math.round(RHYTHM_SECONDS * sampleRate));
      if (to < 8) return null;
      let lo = Infinity;
      let hi = -Infinity;
      for (let i = 0; i <= to; i++) {
        if (signal[i] < lo) lo = signal[i];
        if (signal[i] > hi) hi = signal[i];
      }
      return { from: 0, to, centre: 0, lo, hi, span: Math.max(0.4, hi - lo), strip: true };
    }

    /* The most representative beat: the one whose preceding interval is
       closest to the median. */
    let centre = rPeaks[Math.floor(rPeaks.length / 2)];
    if (rPeaks.length >= 3) {
      const gaps = rPeaks.slice(1).map((r, i) => r - rPeaks[i]);
      const sorted = [...gaps].sort((a, b) => a - b);
      const medianGap = sorted[Math.floor(sorted.length / 2)];
      let best = Infinity;
      for (let i = 1; i < rPeaks.length; i++) {
        const d = Math.abs(rPeaks[i] - rPeaks[i - 1] - medianGap);
        if (d < best) {
          best = d;
          centre = rPeaks[i];
        }
      }
    }

    const from = Math.max(0, centre - Math.round(BEFORE_S * sampleRate));
    const to = Math.min(signal.length - 1, centre + Math.round(AFTER_S * sampleRate));
    if (to - from < 8) return null;

    let lo = Infinity;
    let hi = -Infinity;
    for (let i = from; i <= to; i++) {
      if (signal[i] < lo) lo = signal[i];
      if (signal[i] > hi) hi = signal[i];
    }
    /* A flat trace would divide by zero and a nearly-flat one would be
       amplified into noise, so the span has a floor. */
    const span = Math.max(0.4, hi - lo);
    return { from, to, centre, lo, hi, span, strip: false };
  }, [signal, rPeaks, sampleRate, focus]);

  if (!beat) return <View style={{ height }} />;

  const { from, to, centre, span } = beat;
  const mid = (beat.lo + beat.hi) / 2;
  const W = 100;
  const H = 40;
  const PAD = 3;

  const x = (i: number) => ((i - from) / (to - from)) * W;
  const y = (v: number) => H / 2 - ((v - mid) / span) * (H - PAD * 2);

  /* One point per sample would be ~250 path commands for a 250 pt wide
     drawing — more precision than the display can render. Stride to about
     two samples per rendered point. */
  const stride = Math.max(1, Math.round((to - from) / 220));
  let d = '';
  for (let i = from; i <= to; i += stride) {
    d += `${d === '' ? 'M' : 'L'}${x(i).toFixed(2)} ${y(signal[i]).toFixed(2)}`;
  }

  const win = WINDOW[focus];
  const band =
    win === null
      ? null
      : {
          x: x(centre + Math.round(win[0] * sampleRate)),
          w: x(centre + Math.round(win[1] * sampleRate)) - x(centre + Math.round(win[0] * sampleRate)),
        };

  return (
    <View style={[styles.wrap, { height, backgroundColor: t.bgSoft }]}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        {band && band.w > 0 && (
          <Rect x={band.x} y={0} width={band.w} height={H} fill={accent} opacity={0.15} />
        )}
        {/* On a rhythm strip the beats themselves are the subject, so each
            detected R gets a tick. The eye then measures the GAPS, which is
            what the finding is actually about. */}
        {beat.strip &&
          rPeaks
            .filter((r) => r >= from && r <= to)
            .map((r) => (
              <Line
                key={r}
                x1={x(r)}
                y1={0}
                x2={x(r)}
                y2={H}
                stroke={accent}
                strokeWidth={0.4}
                opacity={0.55}
              />
            ))}
        {/* The baseline: without it a shaded band floats over nothing and the
            trace has no reference to be above or below. */}
        <Line x1={0} y1={y(0)} x2={W} y2={y(0)} stroke={t.border} strokeWidth={0.25} />
        <Path
          d={d}
          fill="none"
          stroke={t.textPrimary}
          strokeWidth={0.7}
          strokeLinejoin="round"
          strokeLinecap="round"
          /* `preserveAspectRatio="none"` stretches the viewBox to the view,
             which would stretch the stroke with it. This keeps the line one
             consistent weight whatever the container's shape. */
          vectorEffect="non-scaling-stroke"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: 14, overflow: 'hidden' },
});

// v1.0.0 — The patient's own representative beat with the rule's measurement
//          window shaded. Real waveform, because a stock diagram explains the
//          concept and proves nothing about this recording.
