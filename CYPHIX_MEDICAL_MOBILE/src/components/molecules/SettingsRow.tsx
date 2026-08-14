/* ==================================================================
   SettingsRow (molecule) — one label(+description) on the start, one
   control (or read-only value) on the end. Ported from the web molecule.

   When `onPress` is supplied the whole row becomes the tap target ("Sign
   out", "Connect a device"): a 44 pt-tall row is a far better target for
   an unsteady hand than a word at the end of it.

   Rows are separated by a top divider, and the FIRST row in a section
   never draws one — the section header already ends there
   (`.settings-section-body > .settings-row:first-child`).

   ══ `layout="stack"` — WIDE CONTROLS GO UNDER THE LABEL, NOT OVER IT ══
   The inline slot is capped at half the row (see the `control` style),
   which is right for a Switch and structurally wrong for anything with an
   intrinsic width — a three-segment control is ~200 pt and CANNOT fit in
   161 pt of a 390 pt phone. Yoga's default `flexShrink` is 0 and RN views
   default `overflow: 'visible'`, so the old failure mode was silent: the
   track kept its natural width, was pinned to the row's end, and painted
   LEFTWARD OVER THE LABEL. Clamping harder just moves the collision.
   The honest fix is the one `LanguageSelectRow` and `BackgroundSelectRow`
   always used: a control wider than half the row gets the WHOLE row,
   under its label. That is what `stack` renders.

   ── RTL ──
   "Start" and "end" are language-dependent, so the row reverses and its
   text re-aligns in Hebrew. ⚠️ Including the control slot's cross-axis:
   `alignItems: 'flex-end'` used to be unconditional, so under Hebrew the
   overflow spilled toward the card's outer edge instead of over the
   label — one bug, two different broken pictures.
   ================================================================== */

import * as Haptics from 'expo-haptics';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from '@/i18n/useTranslation';
import { useTheme } from '@/theme/useTheme';

interface Props {
  label: string;
  description?: string;
  /** Right-side interactive control (switch, segmented buttons, …). */
  control?: ReactNode;
  /** Right-side read-only value (status text or chip). */
  value?: ReactNode;
  /** When set, the whole row is a button. */
  onPress?: () => void;
  disabled?: boolean;
  /** The section's first row draws no divider. */
  first?: boolean;
  /** `stack` puts the control/value FULL-WIDTH under the label — for
      anything wider than half a row (segmented controls, chip groups,
      long diagnostic strings). Default `inline`. */
  layout?: 'inline' | 'stack';
}

export default function SettingsRow({
  label,
  description,
  control,
  value,
  onPress,
  disabled = false,
  first = false,
  layout = 'inline',
}: Props) {
  const t = useTheme();
  const { rtl } = useTranslation();
  const align = rtl ? ('right' as const) : ('left' as const);
  const stacked = layout === 'stack';

  const main = (
    <View style={stacked ? styles.mainStacked : styles.main}>
      <Text style={[styles.label, { color: t.textPrimary, textAlign: align }]}>{label}</Text>
      {description != null && (
        <Text style={[styles.desc, { color: t.textSecondary, textAlign: align }]}>
          {description}
        </Text>
      )}
    </View>
  );

  const end =
    control != null ? (
      <View
        style={
          stacked
            ? [styles.stackSlot, { alignItems: rtl ? 'flex-end' : 'flex-start' }]
            : [styles.control, { alignItems: rtl ? 'flex-start' : 'flex-end' }]
        }
      >
        {control}
      </View>
    ) : value != null ? (
      typeof value === 'string' ? (
        <Text
          style={
            stacked
              ? [styles.valueStacked, { color: t.textSecondary, textAlign: align }]
              : [styles.value, { color: t.textSecondary, textAlign: rtl ? 'left' : 'right' }]
          }
        >
          {value}
        </Text>
      ) : (
        <View
          style={
            stacked
              ? [styles.stackSlot, { alignItems: rtl ? 'flex-end' : 'flex-start' }]
              : [styles.control, { alignItems: rtl ? 'flex-start' : 'flex-end' }]
          }
        >
          {value}
        </View>
      )
    ) : null;

  const body = (
    <>
      {main}
      {end}
    </>
  );

  const frame = [
    stacked ? styles.rowStacked : styles.row,
    !stacked && rtl && styles.rowRtl,
    !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.border },
  ];

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={() => {
          void Haptics.selectionAsync();
          onPress();
        }}
        style={({ pressed }) => [...frame, { opacity: disabled ? 0.55 : pressed ? 0.6 : 1 }]}
      >
        {body}
      </Pressable>
    );
  }
  return <View style={frame}>{body}</View>;
}

const styles = StyleSheet.create({
  /* .settings-row { row; space-between; gap 16; padding 13px 0 } */
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    paddingVertical: 13,
    minHeight: 44,
  },
  rowStacked: { paddingVertical: 13, gap: 10 },
  rowRtl: { flexDirection: 'row-reverse' },
  main: { flex: 1, flexShrink: 1, minWidth: 0, gap: 3 },
  mainStacked: { gap: 3 },
  label: { fontSize: 14, fontWeight: '700' },
  desc: { fontSize: 12.5, lineHeight: 18 },
  /* ★ `flexShrink: 1`, and a ceiling.
     It was `flexShrink: 0`, which reads as "the control keeps its natural
     size" and is fine for a Switch. Give it a long chip — "Secure
     On-Device Processing" — and the control takes the width it asks for,
     `flex: 1` on the label column loses to a sibling that refuses to
     yield, and the label collapses to one character per line. That is
     exactly what happened in Privacy & Security.
     A control may now shrink, and may never take more than half the row.
     Nothing with a fixed intrinsic size (a Switch is ~51 pt) notices —
     and anything whose intrinsic width EXCEEDS the ceiling belongs in
     `layout="stack"`, not in a tighter clamp (see header). */
  control: { flexShrink: 1, minWidth: 0, maxWidth: '52%' },
  value: { flexShrink: 1, fontSize: 13, fontWeight: '600', maxWidth: '52%' },
  stackSlot: { width: '100%' },
  valueStacked: { fontSize: 13, fontWeight: '600', lineHeight: 19 },
});

// v2.0.0 — `layout="stack"`: a control wider than half the row gets the whole
//          row under its label (the LanguageSelectRow pattern) instead of
//          painting over it — and the control slot's cross-axis alignment now
//          flips with RTL, so Hebrew stops spilling toward the card edge.
// v1.2.0 — A control may SHRINK and may never exceed half the row. It was
//          `flexShrink: 0`, so a long status chip took the width it wanted and
//          squeezed the label column — which has `flex: 1` — down to one
//          character per line. Reported from Privacy & Security, where the chip
//          reads "Secure On-Device Processing".
// v1.1.0 — Reverses and re-aligns under an RTL language.
