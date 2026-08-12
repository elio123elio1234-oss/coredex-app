/* ==================================================================
   CompareSheet (molecule) — everything about laying one study over
   another, in one place that explains itself.

   ══ WHY THIS IS ITS OWN SHEET ══
   Comparison used to be three rows in the middle of a generic ⋯ sheet,
   between the filter toggles and the alignment modes. It was reported
   twice as "I still don't understand how to use COMPARE WITH", and the
   reason is visible in that sentence: what was on screen was a LIST OF
   SETTINGS for a feature that had never been explained, and whose only
   control — moving the reference trace — was a drag on a surface the
   reader had no reason to know was draggable.

   So this sheet answers, in order, the three questions a reader actually
   has:

     1. **What is this?** One sentence, plus a LEGEND. The grey trace is
        the single most confusing thing on the screen when it appears; a
        two-swatch key costs 20 pt and removes the confusion entirely.
     2. **Compared with what?** The studies, as a picker.
     3. **How do I move it?** By dragging it, on the paper — and this sheet
        gets out of the way and says so. v0.18.0 tried arrow buttons here
        instead. They were discoverable and they were WRONG: lining two
        heartbeats up is a direct-manipulation task, judged continuously by
        eye, and nothing about that loop survives being expressed as 40 ms
        steps in a list you have to look away at. Discoverability was
        never the drag's problem — invisibility was, and a labelled handle
        on the strip fixes that without taking the gesture away.

   The alignment modes stay, but as a segmented control with the selected
   mode's consequence printed underneath — "never measure off a warped
   trace" is not a footnote, it is the reason the mode exists and the
   reason it is dangerous.

   Presentation belongs to `BottomSheet`.
   ================================================================== */

import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import BottomSheet from '@/components/molecules/BottomSheet';
import SegmentedControl from '@/components/molecules/SegmentedControl';
/* Type-only: the union is defined next to the maths that consumes it, and a
   type import leaves no runtime edge from a component into a feature hook. */
import type { OverlayAlignMode } from '@/features/history/hooks/useOverlayRecording';
import { useTranslation } from '@/i18n/useTranslation';
import { RADIUS } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

export interface CompareStudy {
  id: string;
  label: string;
  hint: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Candidates, already excluding the study being viewed. */
  studies: CompareStudy[];
  overlayId: string | null;
  onPick: (id: string | null) => void;
  /** True once the overlay is loaded and actually drawn. */
  active: boolean;
  alignMode: OverlayAlignMode;
  onAlignMode: (mode: OverlayAlignMode) => void;
  /** What the alignment did, in words. Already localised by the caller. */
  statusLine: string | null;
  degraded: boolean;
  offsetMs: number;
  offsetMv: number;
  onReset: () => void;
  /** Close, and hand the reader back to the strip with the ghost draggable. */
  onDragOnStrip: () => void;
  /** The colour the ghost is actually drawn in, so the legend cannot lie. */
  ghostColor: string;
  /**
   * The patient's own representative beat, offered alongside the studies.
   *
   * `null` when there is no identity to offer — a first study, or a
   * history with nothing eligible. Absent rather than disabled: a greyed
   * row invites a tap and then explains why it did nothing, which is a
   * worse answer than not raising the question.
   */
  identityOption: { id: string; label: string; hint: string } | null;
  /** True while the ECG ID is the chosen comparison. */
  isIdentity: boolean;
  /** Beats too close together for the template to fit — see `ovIdCrowded`. */
  identityCrowded: boolean;
}

export default function CompareSheet({
  visible,
  onClose,
  studies,
  overlayId,
  onPick,
  active,
  alignMode,
  onAlignMode,
  statusLine,
  degraded,
  offsetMs,
  offsetMv,
  onReset,
  onDragOnStrip,
  ghostColor,
  identityOption,
  isIdentity,
  identityCrowded,
}: Props) {
  const t = useTheme();
  const { t: tr, rtl } = useTranslation();

  const align = rtl ? ('right' as const) : ('left' as const);
  const modeHint =
    alignMode === 'beat'
      ? tr('ovModeBeatHint')
      : alignMode === 'warp'
        ? tr('ovModeWarpHint')
        : tr('ovModeManualHint');

  const pick = (id: string | null) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPick(id);
  };

  const choice = (id: string | null, label: string, hint?: string) => {
    const selected = overlayId === id;
    return (
      <Pressable
        key={id ?? 'none'}
        accessibilityRole="radio"
        accessibilityState={{ selected }}
        accessibilityLabel={label}
        accessibilityHint={hint}
        onPress={() => pick(id)}
        style={({ pressed }) => [
          styles.row,
          rtl && styles.rowRtl,
          { backgroundColor: pressed ? t.accentSoft : 'transparent' },
        ]}
      >
        <Ionicons
          name={selected ? 'radio-button-on' : 'radio-button-off'}
          size={21}
          color={selected ? t.accentLive : t.textTertiary}
        />
        <View style={styles.rowText}>
          <Text style={[styles.rowLabel, { color: t.textPrimary, textAlign: align }]}>{label}</Text>
          {hint && (
            <Text style={[styles.rowHint, { color: t.textTertiary, textAlign: align }]}>
              {hint}
            </Text>
          )}
        </View>
      </Pressable>
    );
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={tr('vtCompare')}
      closeLabel={tr('setDone')}
      footer={
        <Pressable
          accessibilityRole="button"
          onPress={onClose}
          style={({ pressed }) => [
            styles.done,
            { backgroundColor: t.accentSoft, opacity: pressed ? 0.6 : 1 },
          ]}
        >
          <Text style={[styles.doneText, { color: t.textPrimary }]}>{tr('setDone')}</Text>
        </Pressable>
      }
    >
      <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
        <Text style={[styles.explain, { color: t.textSecondary, textAlign: align }]}>
          {tr('ovExplain')}
        </Text>

        {/* The key. The grey trace is the most confusing thing on the screen
            the moment it appears, and this is what stops it being. */}
        <View style={[styles.legend, rtl && styles.rowRtl]}>
          <View style={[styles.legendItem, rtl && styles.rowRtl]}>
            <View style={[styles.swatch, { backgroundColor: t.brandNavy }]} />
            <Text style={[styles.legendText, { color: t.textSecondary }]}>{tr('ovLegendThis')}</Text>
          </View>
          <View style={[styles.legendItem, rtl && styles.rowRtl]}>
            <View style={[styles.swatch, { backgroundColor: ghostColor }]} />
            <Text style={[styles.legendText, { color: t.textSecondary }]}>
              {tr('ovLegendGhost')}
            </Text>
          </View>
        </View>

        {studies.length === 0 ? (
          <Text style={[styles.empty, { color: t.textTertiary, textAlign: align }]}>
            {tr('ovNeedTwo')}
          </Text>
        ) : (
          <>
            <Text style={[styles.section, { color: t.textTertiary, textAlign: align }]}>
              {tr('ovPick')}
            </Text>
            <View accessibilityRole="radiogroup">
              {choice(null, tr('ovNone'))}
              {/* ★ ABOVE the studies, not at the bottom of them. It is not
                  one more study — it is the average of all of them, so
                  comparing against it compares against the signal that
                  survived every recording rather than against one
                  recording's noise. Listing it after a date-ordered run of
                  studies would file it as the oldest one. */}
              {identityOption &&
                choice(identityOption.id, identityOption.label, identityOption.hint)}
              {studies.map((s) => choice(s.id, s.label, s.hint))}
            </View>
          </>
        )}

        {/* ⚠️ THE ALIGNMENT MODES DO NOT APPLY TO THE ECG ID, and are not
            shown for it rather than shown and ignored. They exist because
            two recordings have two independent timelines; the identity
            has none of its own — every beat is stamped ON this strip's own
            R peaks, so the fit is exact by construction.

            The same fact has a consequence the reader must be told, so it
            replaces the mode picker instead of simply removing it: the
            ghost's RHYTHM is this recording's, and an interval measured
            off it is this recording's interval read twice. It carries
            SHAPE. */}
        {active && isIdentity && (
          <>
            <Text style={[styles.section, { color: t.textSecondary, textAlign: align }]}>
              {tr('ovIdSection')}
            </Text>
            <Text style={[styles.modeHint, { color: t.textSecondary, textAlign: align }]}>
              {tr('ovIdExactFit')}
            </Text>
            <Text style={[styles.warn, { color: t.attention, textAlign: align }]}>
              {tr('ovIdBorrowsRhythm')}
            </Text>
            {/* ⚠️ At a fast rate the beats are closer together than the
                700 ms template is long, so each stamp is necessarily cut
                short — the tail of the T wave and the head of the next P.
                Measured at 0.30 mV of invented difference at 140 bpm,
                against 0.04 mV at resting rates. Silence here would let a
                reader read a truncation as a T-wave change. */}
            {identityCrowded && (
              <Text style={[styles.warn, { color: t.attention, textAlign: align }]}>
                {tr('ovIdCrowded')}
              </Text>
            )}
          </>
        )}

        {active && !isIdentity && (
          <>
            <Text style={[styles.section, { color: t.textTertiary, textAlign: align }]}>
              {tr('ovAlignSection')}
            </Text>
            <View style={styles.segWrap}>
              <SegmentedControl
                options={[
                  { value: 'beat' as const, label: tr('ovModeBeat') },
                  { value: 'warp' as const, label: tr('ovModeWarp') },
                  { value: 'manual' as const, label: tr('ovModeManual') },
                ]}
                value={alignMode}
                onChange={onAlignMode}
                accessibilityLabel={tr('ovAlignSection')}
              />
            </View>
            {/* The consequence of the chosen mode, always printed. A warped
                ghost has had its intervals destroyed on purpose; that fact
                cannot live behind a disclosure triangle. */}
            <Text style={[styles.modeHint, { color: t.textSecondary, textAlign: align }]}>
              {modeHint}
            </Text>
            {degraded && (
              <Text style={[styles.warn, { color: t.danger, textAlign: align }]}>
                {tr('ovWarpFailed')}
              </Text>
            )}
            {statusLine && (
              <Text style={[styles.status, { color: t.textTertiary, textAlign: align }]}>
                {statusLine}
              </Text>
            )}

          </>
        )}

        {active && (
          <>
            <Text style={[styles.section, { color: t.textTertiary, textAlign: align }]}>
              {tr('ovMoveTitle')}
            </Text>
            <Text style={[styles.modeHint, { color: t.textSecondary, textAlign: align }]}>
              {tr('ovDragHint')}
            </Text>

            {/* The primary action closes this sheet. Comparing two traces is
                done by LOOKING at them, so the last thing the reader needs is
                a panel over the thing they are judging. */}
            <View style={styles.moveWrap}>
              <Pressable
                accessibilityRole="button"
                accessibilityHint={tr('ovDragHint')}
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  onDragOnStrip();
                }}
                style={({ pressed }) => [
                  styles.moveBtn,
                  { backgroundColor: t.brandNavy, opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <Ionicons name="move" size={18} color="#FFFFFF" />
                <Text style={styles.moveText}>{tr('ovMoveOnScreen')}</Text>
              </Pressable>
            </View>

            <View style={[styles.tail, rtl && styles.rowRtl]}>
              <Text
                style={[styles.offset, { color: t.textSecondary, textAlign: align }]}
                numberOfLines={1}
              >
                {tr('ovOffset', {
                  ms: String(Math.round(offsetMs)),
                  mv: offsetMv.toFixed(2),
                })}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  void Haptics.selectionAsync();
                  onReset();
                }}
                style={({ pressed }) => [
                  styles.tailBtn,
                  { borderColor: t.border, opacity: pressed ? 0.6 : 1 },
                ]}
              >
                <Text style={[styles.tailText, { color: t.textPrimary }]}>{tr('ovResetPos')}</Text>
              </Pressable>
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={() => pick(null)}
              style={({ pressed }) => [styles.remove, { opacity: pressed ? 0.6 : 1 }]}
            >
              <Ionicons name="close-circle-outline" size={18} color={t.danger} />
              <Text style={[styles.removeText, { color: t.danger }]}>{tr('ovRemove')}</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  rowRtl: { flexDirection: 'row-reverse' },
  explain: { fontSize: 13.5, lineHeight: 19.5, paddingHorizontal: 14, paddingBottom: 10 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, paddingHorizontal: 14 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  swatch: { width: 20, height: 3, borderRadius: 2 },
  legendText: { fontSize: 12.5, fontWeight: '600' },
  empty: { fontSize: 13.5, lineHeight: 19.5, paddingHorizontal: 14, paddingTop: 14 },

  section: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    paddingHorizontal: 14,
    paddingTop: 18,
    paddingBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: RADIUS.md,
  },
  rowText: { flex: 1, flexShrink: 1, gap: 1 },
  rowLabel: { fontSize: 15.5, fontWeight: '600' },
  rowHint: { fontSize: 12.5 },

  segWrap: { paddingHorizontal: 14, paddingTop: 2 },
  modeHint: { fontSize: 12.5, lineHeight: 18, paddingHorizontal: 14, paddingTop: 7 },
  warn: { fontSize: 12.5, fontWeight: '700', paddingHorizontal: 14, paddingTop: 5 },
  status: { fontSize: 12, paddingHorizontal: 14, paddingTop: 4 },

  moveWrap: { paddingHorizontal: 14, paddingTop: 11 },
  moveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    height: 50,
    borderRadius: RADIUS.md,
  },
  moveText: { color: '#FFFFFF', fontSize: 15.5, fontWeight: '700' },
  offset: {
    flex: 1,
    flexShrink: 1,
    fontSize: 12.5,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },

  tail: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingTop: 12 },
  tailBtn: {
    flexShrink: 0,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  tailText: { fontSize: 13.5, fontWeight: '700' },

  remove: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 14,
    marginTop: 4,
  },
  removeText: { fontSize: 14.5, fontWeight: '700' },

  done: {
    marginTop: 10,
    marginHorizontal: 4,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  doneText: { fontSize: 16, fontWeight: '700' },
});

// v3.0.0 — The patient's own representative beat is offered as a comparison,
//          listed ABOVE the studies because it is not one more study — it is
//          the average of all of them, and filing it after a date-ordered run
//          would read as the oldest one. The alignment modes are not shown for
//          it: they exist because two recordings have two timelines, and the
//          identity has none of its own. What replaces them is the sentence
//          that fact makes necessary — the ghost borrows this recording's
//          rhythm, so it carries shape and nothing about time.
// v2.0.0 — The arrow pad is gone. Moving the ghost belongs on the paper, where
//          the eye judges the fit; this sheet explains, picks and aligns, then
//          gets out of the way with one primary action that closes it and makes
//          the trace draggable.
