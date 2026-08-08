/* ==================================================================
   RejectedBeats (molecule) — the beats that were NOT averaged in, drawn
   against the one that was.

        ╱▔╲          ← the accepted beat (the template), heavy
       ╱   ╲
      ╱     ╲╱▔╲     ← a rejected beat, thin, in amber
                        "came early · 71 % match"

   ══ WHY A COUNT IS NOT ENOUGH ══
   "3 beats were not used" asks the reader to trust the single decision
   that most shapes the whole feature: which beats were allowed to define
   the template. Trust is the wrong currency here — the point of the
   product is that a clinician can check what it did. Drawn on the same
   axes, a reader sees in one glance that the discarded beat really is a
   different shape, and can disagree if it is not.

   It is also the honest place to explain the rejection rules, because it
   is the only place they are visible: a beat leaves the average either for
   its TIMING (it came early, so it started somewhere other than the sinus
   node) or for its SHAPE (it did not match the recording's own beats).

   ══ AMBER, NOT RED ══
   A rejected beat is a completely ordinary thing to find in a healthy
   recording — an ectopic beat, a shrug, an arm moved. Red would make an
   unremarkable observation look like a finding, and this layer is not
   permitted to make findings at all.

   Purely presentational.
   ================================================================== */

import { useId, useMemo } from 'react';
import Svg, { ClipPath, Defs, G, Path, Rect } from 'react-native-svg';
import { StyleSheet, Text, View } from 'react-native';
import { buildEcgPath, type RejectedBeat } from '@cyphix/shared';
import {
  SCREEN_DARK,
  SCREEN_LIGHT,
  SIGNATURE_MM_PER_SEC,
} from '@/components/molecules/BeatSignature';
import { RADIUS } from '@/theme/tokens';
import { useIsDark, useTheme } from '@/theme/useTheme';

interface Props {
  /** The beat that WAS used — the reference every rejection is judged against. */
  accepted: Float32Array;
  rejected: readonly RejectedBeat[];
  sampleRate: number;
  width: number;
  /** The identity's one gain, so this sheet is on the same scale as the rest. */
  mmPerMv: number;
  /** Localised: reason word per kind, plus the "n% match" pattern. */
  labels: {
    premature: string;
    dissimilar: string;
    truncated: string;
    match: (pct: number) => string;
  };
  rtl?: boolean;
}

const HEIGHT_MM = 22;
const LEAD_IN_MM = 2;
const TAIL_MM = 2;

export default function RejectedBeats({
  accepted,
  rejected,
  sampleRate,
  width,
  mmPerMv,
  labels,
  rtl,
}: Props) {
  const t = useTheme();
  const c = useIsDark() ? SCREEN_DARK : SCREEN_LIGHT;

  const geometry = useMemo(() => {
    const durationSec = accepted.length / sampleRate;
    const widthMm = LEAD_IN_MM + durationSec * SIGNATURE_MM_PER_SEC + TAIL_MM;
    const baselineMm = HEIGHT_MM / 2;
    const clipMm = baselineMm - 0.5;

    /* ★ The identity's OWN gain, handed in — not one fitted to these
       traces. Every sheet in Insights is then on one scale, and a rejected
       beat that is twice as tall as the accepted one is DRAWN twice as
       tall, which is precisely what this picture exists to show. A sheet
       that rescales to its own extremes would draw them the same. */
    const opts = {
      sampleRate,
      mmPerSec: SIGNATURE_MM_PER_SEC,
      mmPerMv,
      baselineMm,
      xOffsetMm: LEAD_IN_MM,
      bucketsPerMm: 6,
      clipMm,
    };

    return {
      widthMm,
      accepted: buildEcgPath(accepted, opts),
      rejected: rejected.map((r) => buildEcgPath(r.samples, opts)),
    };
  }, [accepted, rejected, sampleRate, mmPerMv]);

  const height = (width * HEIGHT_MM) / geometry.widthMm;
  const align = rtl ? ('right' as const) : ('left' as const);

  /* Rounded like the signature, one step smaller — radius scales with the
     surface, and this sheet is about two thirds its height. Clipped inside
     the SVG for the same reason (see `BeatSignature`), and with a unique
     id because Android resolves `url(#…)` per document. */
  const clipId = useId();
  const rxMm = geometry.widthMm > 0 ? (RADIUS.md * geometry.widthMm) / width : 0;

  const reasonOf = (r: RejectedBeat) =>
    r.reason === 'premature'
      ? labels.premature
      : r.reason === 'truncated'
        ? labels.truncated
        : labels.dissimilar;

  return (
    <View style={styles.root}>
      <View style={{ width, height }}>
        <Svg
          width={width}
          height={height}
          viewBox={`0 0 ${geometry.widthMm} ${HEIGHT_MM}`}
          preserveAspectRatio="xMidYMid meet"
        >
          <Defs>
            <ClipPath id={clipId}>
              <Rect x={0} y={0} width={geometry.widthMm} height={HEIGHT_MM} rx={rxMm} ry={rxMm} />
            </ClipPath>
          </Defs>

          <G clipPath={`url(#${clipId})`}>
          {/* No grid: this is a shape comparison, and the eye compares two
              curves better without a ruler competing with them. The gain
              is the identity's, so anything measured here would still be
              honest — it simply is not the question being asked. */}
          {geometry.rejected.map((d, i) => (
            <Path
              key={i}
              d={d}
              fill="none"
              stroke={t.attention}
              strokeWidth={0.2}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.9}
            />
          ))}

          <Path
            d={geometry.accepted}
            fill="none"
            stroke={c.trace}
            strokeWidth={0.32}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          </G>
        </Svg>
      </View>

      <View style={styles.rows}>
        {rejected.map((r, i) => (
          <View key={`${r.atSec}-${i}`} style={[styles.row, rtl && styles.rowRtl]}>
            <View style={[styles.dash, { backgroundColor: t.attention }]} />
            <Text style={[styles.reason, { color: t.textSecondary, textAlign: align }]}>
              {reasonOf(r)}
            </Text>
            <Text style={[styles.match, { color: t.textTertiary }]} allowFontScaling={false}>
              {labels.match(Math.round(r.correlation * 100))} · {r.atSec.toFixed(1)}s
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 8 },
  rows: { gap: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowRtl: { flexDirection: 'row-reverse' },
  dash: { width: 12, height: 2, borderRadius: 1 },
  reason: { fontSize: 12, flex: 1 },
  match: { fontSize: 11, fontVariant: ['tabular-nums'] },
});

// v1.2.0 — Rounded corners, clipped inside the SVG like the signature's.
// v1.1.0 — On the screen rather than on a white sheet, and on the IDENTITY'S
//          gain rather than one fitted here, so every trace in Insights is at
//          one scale and "twice as tall" is drawn twice as tall.
// v1.0.0 — The discarded beats drawn on the accepted beat's own axes and gain,
//          each with why it went and how well it matched — so the beat-selection
//          decision is checkable instead of asserted.
