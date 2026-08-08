/* ==================================================================
   CadenceStrip (molecule) — WHEN this person measures, over a day.

     00        06        12        18        24
     ▁▁▁▁▁▁▁▃▇█▅▂▁▁▁▁▁▁▂▅▃▁▁▁
              ▲ morning              ▲ evening

   Twenty-four thin bars, one per local hour, plus the day/night ticks
   that make the shape readable without a legend.

   ══ WHY THIS SITS BESIDE THE BASELINE AND NOT IN A SETTINGS CORNER ══
   Because it qualifies the baseline. An ECG ID built from six studies all
   taken between 22:00 and 23:00 has seen one physiological state — one
   posture, one point in the circadian cycle, one distance from the last
   coffee. That is a legitimate baseline for late evenings and a poor one
   for a 07:00 comparison, and the only way a reader can know which they
   are holding is to see the hours it was built from.

   ══ NOT A STREAK GAME ══
   No targets, no "you missed a day", no colour that means failure. It
   reports a pattern; what to do about it is a conversation between a
   patient and their doctor, not a nudge from a phone.

   Purely presentational.
   ================================================================== */

import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/useTheme';

interface Props {
  /** 24 counts, index = local hour. */
  byHour: readonly number[];
  /** Hour ticks to print under the strip, e.g. [0, 6, 12, 18]. */
  ticks?: readonly number[];
  /** Highlighted block [startHour, endHour) — the busiest four hours. */
  highlight?: readonly [number, number] | null;
  rtl?: boolean;
  accessibilityLabel?: string;
}

const STRIP_H = 40;
const DEFAULT_TICKS = [0, 6, 12, 18] as const;

/** True when `hour` falls in the (possibly midnight-wrapping) block. */
function inBlock(hour: number, block: readonly [number, number] | null | undefined): boolean {
  if (!block) return false;
  const [from, to] = block;
  return from <= to ? hour >= from && hour < to : hour >= from || hour < to;
}

export default function CadenceStrip({
  byHour,
  ticks = DEFAULT_TICKS,
  highlight,
  rtl,
  accessibilityLabel,
}: Props) {
  const t = useTheme();
  const peak = Math.max(1, ...byHour);

  return (
    <View style={styles.root} accessibilityRole="image" accessibilityLabel={accessibilityLabel}>
      <View style={[styles.bars, rtl && styles.rowRtl]}>
        {byHour.map((count, hour) => {
          const lit = inBlock(hour, highlight);
          /* An hour with no studies still gets a 2 pt stub. A truly empty
             column and a very small one would otherwise be the same
             picture, and "never at 03:00" is information. */
          const height = count === 0 ? 2 : Math.max(4, (count / peak) * STRIP_H);
          return (
            <View
              key={hour}
              style={[
                styles.bar,
                {
                  height,
                  backgroundColor: count === 0 ? t.border : lit ? t.accentLive : t.textTertiary,
                },
              ]}
            />
          );
        })}
      </View>

      <View style={[styles.ticks, rtl && styles.rowRtl]}>
        {ticks.map((hour) => (
          <Text
            key={hour}
            style={[
              styles.tick,
              { color: t.textTertiary, left: `${(hour / 24) * 100}%` },
              rtl && { left: undefined, right: `${(hour / 24) * 100}%` },
            ]}
            allowFontScaling={false}
          >
            {String(hour).padStart(2, '0')}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 4 },
  rowRtl: { flexDirection: 'row-reverse' },
  bars: { flexDirection: 'row', alignItems: 'flex-end', height: STRIP_H, gap: 2 },
  bar: { flex: 1, borderRadius: 2 },
  ticks: { height: 12 },
  tick: { position: 'absolute', fontSize: 9.5, fontVariant: ['tabular-nums'] },
});

// v1.0.0 — Twenty-four-hour measurement cadence: one bar per local hour with
//          the busiest four-hour block lit, empty hours kept visible as stubs,
//          and no target anywhere.
