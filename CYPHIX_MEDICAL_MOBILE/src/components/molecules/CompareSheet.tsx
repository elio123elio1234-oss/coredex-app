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
     3. **How do I move it?** BUTTONS. A drag gesture is the nicest way to
        move the ghost and the worst way to discover that moving it is
        possible; taps do not have to be discovered, and one tap = one
        small square is the unit a reader is already thinking in. The drag
        stays, offered here as an alternative rather than as the secret.

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

/**
 * One tap = one small square of ECG paper: 1 mm, which is 40 ms across at
 * 25 mm/s and 0.1 mV up at 10 mm/mV. Deliberately NOT a pixel or a percent —
 * the reader is looking at millimetre graph paper and thinking in it.
 */
const NUDGE_MM = 1;

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
  onNudge: (dxMm: number, dyMm: number) => void;
  onReset: () => void;
  /** Hand the reader back to the strip in drag mode. */
  onDragOnStrip: () => void;
  /** The colour the ghost is actually drawn in, so the legend cannot lie. */
  ghostColor: string;
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
  onNudge,
  onReset,
  onDragOnStrip,
  ghostColor,
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

  const nudge = (dxMm: number, dyMm: number) => {
    void Haptics.selectionAsync();
    onNudge(dxMm, dyMm);
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

  /** One arrow in the nudge pad. */
  const pad = (
    icon: keyof typeof Ionicons.glyphMap,
    label: string,
    dxMm: number,
    dyMm: number,
  ) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => nudge(dxMm, dyMm)}
      style={({ pressed }) => [
        styles.pad,
        { borderColor: t.border, backgroundColor: pressed ? t.accentSoft : 'transparent' },
      ]}
    >
      <Ionicons name={icon} size={17} color={t.textPrimary} />
      <Text style={[styles.padText, { color: t.textPrimary }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );

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
              {studies.map((s) => choice(s.id, s.label, s.hint))}
            </View>
          </>
        )}

        {active && (
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

            <Text style={[styles.section, { color: t.textTertiary, textAlign: align }]}>
              {tr('ovMoveTitle')}
            </Text>
            <Text style={[styles.modeHint, { color: t.textSecondary, textAlign: align }]}>
              {tr('ovMoveStep')}
            </Text>

            <View style={styles.padGrid}>
              {pad('arrow-back', tr('ovEarlier'), -NUDGE_MM, 0)}
              {pad('arrow-forward', tr('ovLater'), NUDGE_MM, 0)}
              {/* Screen y grows DOWNWARD, so "up" is a negative step. */}
              {pad('arrow-up', tr('ovUp'), 0, -NUDGE_MM)}
              {pad('arrow-down', tr('ovDown'), 0, NUDGE_MM)}
            </View>

            <Text style={[styles.offset, { color: t.textSecondary, textAlign: align }]}>
              {tr('ovOffset', {
                ms: String(Math.round(offsetMs)),
                mv: offsetMv.toFixed(2),
              })}
            </Text>

            <View style={[styles.tail, rtl && styles.rowRtl]}>
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
              <Pressable
                accessibilityRole="button"
                accessibilityHint={tr('ovDragHint')}
                onPress={onDragOnStrip}
                style={({ pressed }) => [
                  styles.tailBtn,
                  { borderColor: t.border, opacity: pressed ? 0.6 : 1 },
                ]}
              >
                <Text style={[styles.tailText, { color: t.brandNavy }]}>{tr('ovDragInstead')}</Text>
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

  padGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 14,
    paddingTop: 10,
  },
  /* Two per row on any phone, and each is a 46 pt target — the whole point of
     offering taps is that they cannot be missed. */
  pad: {
    flexGrow: 1,
    flexBasis: '46%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    height: 46,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  padText: { fontSize: 14, fontWeight: '700' },
  offset: {
    fontSize: 12.5,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    paddingHorizontal: 14,
    paddingTop: 9,
  },

  tail: { flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingTop: 10 },
  tailBtn: {
    flex: 1,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    paddingVertical: 12,
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

// v1.0.0 — Comparison gets its own sheet: what the grey trace IS (legend),
//          which study, how they are lined up and what that costs, and BUTTONS
//          for moving it — one small square per tap — instead of only a drag
//          nobody could discover.
