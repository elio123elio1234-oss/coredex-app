/* ==================================================================
   ValueQualityCard (molecule) — how steady the rhythm was, as a ring.

   ══ WHAT THE RING IS, AND WHAT IT IS NOT ══
   The number inside it is `quality.sqi` — a rhythm regularity index 0–100
   computed from the spread of the R-R intervals. It says how CONSISTENT
   the beat spacing was in this recording. It does not say the recording
   is good, the heart is well, or the reading can be trusted; a perfectly
   steady rhythm can be steadily abnormal, and `ecgAnalysis.ts` does not
   get to have an opinion about that.

   Which is why the ring is one colour at every value. An arc that turned
   from green to amber to red as the percentage fell would be a verdict
   drawn as a dial, and it would be the easiest rule in this app to break
   by accident — so the reason is written here, next to the code that
   would have to be changed to break it.

   The two figures beside it (seconds analysed, sample rate) are there
   because a steadiness score means nothing without knowing how much
   signal it was measured over.
   ================================================================== */

import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTranslation } from '@/i18n/useTranslation';
import type { ValuesPalette } from '@/theme/valuesPalette';

interface Props {
  palette: ValuesPalette;
  /** 0–100 regularity index. */
  sqi: number;
  analysedLabel: string;
  analysedValue: string;
  sampleRateLabel: string;
  sampleRateValue: string;
  title: string;
}

const SIZE = 84;
const R = 26;
const STROKE = 7;
const CIRCUMFERENCE = 2 * Math.PI * R;

export default function ValueQualityCard({
  palette,
  sqi,
  analysedLabel,
  analysedValue,
  sampleRateLabel,
  sampleRateValue,
  title,
}: Props) {
  const { rtl } = useTranslation();
  const align = rtl ? ('right' as const) : ('left' as const);
  const fraction = Math.max(0, Math.min(1, sqi / 100));

  return (
    <View style={[styles.row, rtl && styles.rowRtl]}>
      <View style={styles.ringBox}>
        {/* Rotated so the arc starts at twelve o'clock rather than at three
            — the only orientation anyone reads a progress ring in. */}
        <Svg width={SIZE} height={SIZE} viewBox="0 0 64 64" style={styles.ring}>
          <Circle cx="32" cy="32" r={R} fill="none" stroke={palette.track} strokeWidth={STROKE} />
          <Circle
            cx="32"
            cy="32"
            r={R}
            fill="none"
            stroke={palette.mint}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - fraction)}
          />
        </Svg>
      </View>

      <View style={styles.body}>
        <Text style={[styles.label, { color: palette.dim, textAlign: align }]}>
          {title.toUpperCase()}
        </Text>
        <View style={[styles.valueRow, rtl && styles.rowRtl]}>
          <Text style={[styles.value, { color: palette.mint }]}>{sqi}</Text>
          <Text
            style={[styles.unit, { color: palette.muted }, rtl ? { marginRight: 4 } : { marginLeft: 4 }]}
          >
            %
          </Text>
        </View>
        <View style={[styles.facts, rtl && styles.rowRtl]}>
          <View>
            <Text style={[styles.factLabel, { color: palette.dim, textAlign: align }]}>
              {analysedLabel.toUpperCase()}
            </Text>
            <Text style={[styles.factValue, { color: palette.txt, textAlign: align }]}>
              {analysedValue}
            </Text>
          </View>
          <View>
            <Text style={[styles.factLabel, { color: palette.dim, textAlign: align }]}>
              {sampleRateLabel.toUpperCase()}
            </Text>
            <Text style={[styles.factValue, { color: palette.txt, textAlign: align }]}>
              {sampleRateValue}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  rowRtl: { flexDirection: 'row-reverse' },
  ringBox: { width: SIZE, height: SIZE, flexGrow: 0, flexShrink: 0 },
  ring: { transform: [{ rotate: '-90deg' }] },
  body: { flex: 1 },
  label: { fontSize: 10.5, fontWeight: '700', letterSpacing: 1.2 },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 4 },
  value: { fontSize: 34, fontWeight: '700', letterSpacing: -1, fontVariant: ['tabular-nums'] },
  unit: { fontSize: 13, fontWeight: '600' },
  facts: { flexDirection: 'row', gap: 16, marginTop: 10 },
  factLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  factValue: { fontSize: 16, fontWeight: '700', marginTop: 2, fontVariant: ['tabular-nums'] },
});

// v0.59.0 — Rhythm steadiness as a ring. ONE colour at every value: an arc
//           that changed hue with the number would be a verdict drawn as a dial.
