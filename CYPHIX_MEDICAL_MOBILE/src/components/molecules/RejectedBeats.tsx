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

import { useMemo } from 'react';
import Svg, { Path, Rect } from 'react-native-svg';
import { StyleSheet, Text, View } from 'react-native';
import { buildEcgPath, STANDARD_MM_PER_MV, type RejectedBeat } from '@cyphix/shared';
import { SIGNATURE_MM_PER_SEC } from '@/components/molecules/BeatSignature';
import { ECG_PAPER_DARK, ECG_PAPER_LIGHT } from '@/components/molecules/EcgStripSvg';
import { RADIUS } from '@/theme/tokens';
import { useIsDark, useTheme } from '@/theme/useTheme';

interface Props {
  /** The beat that WAS used — the reference every rejection is judged against. */
  accepted: Float32Array;
  rejected: readonly RejectedBeat[];
  sampleRate: number;
  width: number;
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
  labels,
  rtl,
}: Props) {
  const t = useTheme();
  const c = useIsDark() ? ECG_PAPER_DARK : ECG_PAPER_LIGHT;

  const geometry = useMemo(() => {
    const durationSec = accepted.length / sampleRate;
    const widthMm = LEAD_IN_MM + durationSec * SIGNATURE_MM_PER_SEC + TAIL_MM;

    /* One gain for ALL the traces, chosen from the tallest of them. A
       rejected beat rescaled to fit its own extremes would be drawn to the
       same height as the accepted one, and "it is twice as tall" is
       precisely the thing this picture exists to show. */
    let peak = 0;
    const scan = (a: Float32Array) => {
      for (let i = 0; i < a.length; i++) peak = Math.max(peak, Math.abs(a[i]));
    };
    scan(accepted);
    for (const r of rejected) scan(r.samples);

    const baselineMm = HEIGHT_MM / 2;
    const clipMm = baselineMm - 0.5;
    const mmPerMv = Math.min(STANDARD_MM_PER_MV, peak > 0 ? clipMm / peak : STANDARD_MM_PER_MV);

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
      mmPerMv,
      accepted: buildEcgPath(accepted, opts),
      rejected: rejected.map((r) => buildEcgPath(r.samples, opts)),
    };
  }, [accepted, rejected, sampleRate]);

  const height = (width * HEIGHT_MM) / geometry.widthMm;
  const align = rtl ? ('right' as const) : ('left' as const);

  const reasonOf = (r: RejectedBeat) =>
    r.reason === 'premature'
      ? labels.premature
      : r.reason === 'truncated'
        ? labels.truncated
        : labels.dissimilar;

  return (
    <View style={styles.root}>
      <View style={[styles.sheet, { width, height, backgroundColor: c.paper }]}>
        <Svg
          width={width}
          height={height}
          viewBox={`0 0 ${geometry.widthMm} ${HEIGHT_MM}`}
          preserveAspectRatio="xMidYMid meet"
        >
          <Rect width={geometry.widthMm} height={HEIGHT_MM} fill={c.paper} />

          {/* No grid here on purpose. Nothing on this sheet is measured —
              it is a shape comparison, and a ruler under it would invite
              readings the gain (fitted, not standard) does not support. */}
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
  sheet: { borderRadius: RADIUS.sm, overflow: 'hidden' },
  rows: { gap: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowRtl: { flexDirection: 'row-reverse' },
  dash: { width: 12, height: 2, borderRadius: 1 },
  reason: { fontSize: 12, flex: 1 },
  match: { fontSize: 11, fontVariant: ['tabular-nums'] },
});

// v1.0.0 — The discarded beats drawn on the accepted beat's own axes and gain,
//          each with why it went and how well it matched — so the beat-selection
//          decision is checkable instead of asserted.
