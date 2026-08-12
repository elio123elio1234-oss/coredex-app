/* ==================================================================
   SimilarityTimeline (molecule) — every study's match with the ECG ID,
   oldest → newest, as one bar each.

        100 ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄
            ▇ ▇ ▇ ▆ ▇ ▇ ▇ █ ▇ ▂ ▇ ▇ ▇
         90 ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄
                          ▲ the one worth opening

   ══ THE POINT IS THE OUTLIER, NOT THE TREND ══
   Serial ECGs mostly agree, so this chart is nearly flat nearly always —
   and that is the design brief, not a failure of it. A flat row of bars
   with one short one is the fastest possible way to answer "is there a
   study I should look at?", which is the question a reader actually has.
   A line chart would spend its ink on the agreeing 95 %.

   ══ WHY THE SCALE IS TRUNCATED — AND WHY THE FLOOR IS NOT OURS ══
   Two recordings of one heart score high. Drawn from zero they are twelve
   identical full-height bars and the outlier is invisible. The floor is
   stated on the axis, because a truncated axis that does not say so is
   the oldest chart lie there is.

   ★ THE FLOOR COMES FROM `SIMILARITY_AXIS_FLOOR`, NOT FROM THIS FILE.
   It used to be a local `const FLOOR = 80` while the score itself was
   stretched from a correlation of 0.90 in `ecgIdentity.ts`. Two constants
   in two files that had to agree, and nobody owned the pair — so they
   drifted, and the consequence was severe: the ENTIRE visible range of
   this chart became r ∈ [0.971, 1.000]. A study matching its baseline at
   0.96 — an excellent serial match — was drawn as exactly the same 6 px
   stub as one at 0.80, and a real 24-study history rendered as one tall
   bar in a row of identical dashes. It looked like a weighting bug in the
   identity. It was this chart throwing away the data.

   The lesson generalises: a chart that picks its own axis floor for a
   score computed elsewhere is asserting something about that score's
   distribution that it has no way to know.

   ══ A BAR SELECTS; IT DOES NOT NAVIGATE ══
   Tapping used to open the study. That made the older bars a one-way door
   — you could leave through them but never look, so the chart could show
   you an outlier and then only offer to change screens about it. Now a
   tap PICKS the bar and the detail underneath the chart changes to that
   study, and the detail row is what opens it. Two steps, and the second
   one is optional, which is the right shape for "which of these is worth
   my attention".
   ================================================================== */

import * as Haptics from 'expo-haptics';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SIMILARITY_AXIS_FLOOR, type IdentityMatch } from '@cyphix/shared';
import { useTheme } from '@/theme/useTheme';

interface Props {
  /** Newest first, as the identity reports them. */
  matches: readonly IdentityMatch[];
  /** The bar whose detail is showing below the chart. */
  selectedId?: string | null;
  /** Picks a bar. This is a SELECTION, not navigation — see the header. */
  onSelect: (recordingId: string) => void;
  /**
   * Localised labels. The axis NUMBERS are not passed in — they are
   * derived from `SIMILARITY_AXIS_FLOOR` below, so a caller cannot label
   * the axis with a floor the bars are not actually drawn from.
   */
  labels: { excluded: string };
  rtl?: boolean;
}

/** Bars below this are drawn at the floor; the axis says so. See the header. */
const FLOOR = SIMILARITY_AXIS_FLOOR;
const BAR_H = 74;
const BAR_W = 12;

export default function SimilarityTimeline({
  matches,
  selectedId,
  onSelect,
  labels,
  rtl,
}: Props) {
  const t = useTheme();

  // Oldest → newest: time runs forward, always, whatever order the data
  // arrived in. `matches` is newest-first because History is.
  const ordered = [...matches].reverse();
  if (ordered.length === 0) return null;

  return (
    <View style={styles.root}>
      <View style={[styles.axisRow, rtl && styles.rowRtl]}>
        <Text style={[styles.axis, { color: t.textTertiary }]} allowFontScaling={false}>
          100
        </Text>
        <View style={[styles.rule, { backgroundColor: t.border }]} />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.bars, rtl && styles.rowRtl]}
      >
        {ordered.map((m) => {
          const excluded = m.excluded !== null;
          const flagged = m.flaggedAtEnrollment || m.deviations.some((d) => d.severity === 'marked');
          const active = m.recordingId === selectedId;
          const height = excluded
            ? 6
            : Math.max(6, ((Math.max(FLOOR, m.similarity) - FLOOR) / (100 - FLOOR)) * BAR_H);

          // Amber, not red — see `tokens.ts`. A study that differs is one
          // to look at, and the bar is already a tap target for doing so.
          const fill = excluded ? t.border : flagged ? t.attention : t.signal;

          return (
            <Pressable
              key={m.recordingId}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={
                excluded ? labels.excluded : `${m.similarity}% · ${m.recordedAt.slice(0, 10)}`
              }
              onPress={() => {
                void Haptics.selectionAsync();
                onSelect(m.recordingId);
              }}
              style={({ pressed }) => [styles.slot, { opacity: pressed ? 0.55 : 1 }]}
              hitSlop={{ top: 6, bottom: 10, left: 3, right: 3 }}
            >
              <View style={styles.column}>
                {/* The UNSELECTED bars step back rather than the selected
                    one stepping forward. Brightening one bar in a row of a
                    dozen adds a second colour to decode, and this chart
                    already spends its one colour on "differs". */}
                <View
                  style={[styles.bar, { height, backgroundColor: fill, opacity: active ? 1 : 0.45 }]}
                />
              </View>
              {/* The foot marks the selected bar, and doubles as the slot a
                  struck study keeps — a gap in the row would read as a
                  study that does not exist. */}
              <View
                style={[
                  styles.foot,
                  {
                    backgroundColor: active
                      ? t.textPrimary
                      : excluded
                        ? t.textTertiary
                        : 'transparent',
                  },
                ]}
              />
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={[styles.axisRow, rtl && styles.rowRtl]}>
        <Text style={[styles.axis, { color: t.textTertiary }]} allowFontScaling={false}>
          {FLOOR}
        </Text>
        <View style={[styles.rule, { backgroundColor: t.border }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 4 },
  rowRtl: { flexDirection: 'row-reverse' },
  axisRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  axis: { fontSize: 10, fontVariant: ['tabular-nums'], width: 26 },
  rule: { flex: 1, height: StyleSheet.hairlineWidth },
  bars: { gap: 5, paddingVertical: 4, alignItems: 'flex-end' },
  slot: { alignItems: 'center', gap: 3 },
  /* The column is full height with the bar pinned to its bottom, so every
     bar grows from one line rather than floating at its own baseline. */
  column: { height: BAR_H, justifyContent: 'flex-end' },
  bar: { width: BAR_W, borderRadius: 3 },
  foot: { width: BAR_W, height: 3, borderRadius: 2 },
});

// v2.0.0 — The axis floor is `SIMILARITY_AXIS_FLOOR` from the shared package
//          instead of a local `80`, and the labels are derived from it rather
//          than passed in. The two constants had drifted apart, which squeezed
//          the chart's whole visible range into r ∈ [0.971, 1.000]: every study
//          below an excellent match was drawn as the identical 6 px stub, so a
//          normal history looked like one study owning the entire ECG ID. The
//          bars were never wrong — the axis was throwing the data away.
// v1.2.0 — A bar SELECTS rather than navigates, and the selection is marked by
//          the other bars stepping back plus a foot tick. Tapping used to leave
//          the screen, which made the older bars a one-way door: the chart could
//          point at an outlier and then only offer to change screens about it.
// v1.1.0 — Amber rather than red for a study that differs.
// v1.0.0 — One bar per study against the ECG ID, oldest first, on a stated
//          80–100 axis so the one short bar is findable; every bar opens its
//          study, and excluded studies keep their slot.
