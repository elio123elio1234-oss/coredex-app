/* ==================================================================
   FieldRow (molecule) — one labelled line of a form.

     Recording
     21 Sep · Limb (6)                                          ›

   Either a PICKER (tap it, something opens) or a static label over a
   child. The two look identical on purpose: a form whose rows do not
   line up because some of them are buttons reads as assembled rather
   than designed.

   ⚠️ THE WHOLE ROW IS THE TARGET, not the text inside it. That is the
   fix for *"I press on it and nothing happens"* — v0.91.0's composer put
   the touchable on the `TextInput` alone, so the generous padding around
   it, which is most of what the eye reads as the control, swallowed every
   tap. A control's hit area has to be the thing that LOOKS like the
   control.
   ================================================================== */

import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/useTheme';

export interface FieldRowProps {
  label: string;
  /** A quiet qualifier after the label, e.g. "optional". */
  hint?: string;
  /** The chosen value. Falsy renders `placeholder` in the muted colour. */
  value?: string | null;
  /**
   * A quieter line under the value — a qualifier that belongs to the
   * chosen thing rather than to the field. `SIMULATION` travels this way,
   * and it has to travel: a request to review synthetic data must be
   * recognisable as one on the form, not only inside the picker it was
   * chosen from (mobile CLAUDE.md §4).
   */
  note?: string | null;
  placeholder?: string;
  /** Present ⇒ the row is a picker and shows a chevron. */
  onPress?: () => void;
  /** Rendered under the label instead of `value` — for an input. */
  children?: ReactNode;
  /** Greys the row and refuses the press. */
  disabled?: boolean;
  rtl?: boolean;
}

export default function FieldRow({
  label,
  hint,
  value,
  note,
  placeholder,
  onPress,
  children,
  disabled = false,
  rtl = false,
}: FieldRowProps) {
  const t = useTheme();
  const align = rtl ? ('right' as const) : ('left' as const);

  const head = (
    <View style={[styles.headRow, rtl && styles.rtl]}>
      <Text style={[styles.label, { color: t.textSecondary, textAlign: align }]}>{label}</Text>
      {hint && <Text style={[styles.hint, { color: t.textTertiary }]}>{hint}</Text>}
    </View>
  );

  if (!onPress) {
    return (
      <View style={styles.row}>
        {head}
        {children}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value ?? placeholder ?? ''}`}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => {
        void Haptics.selectionAsync();
        onPress();
      }}
      /* The padding is INSIDE the pressable, so the whole row responds —
         see the header. */
      style={({ pressed }) => [styles.row, { opacity: disabled ? 0.45 : pressed ? 0.6 : 1 }]}
    >
      {head}
      <View style={[styles.valueRow, rtl && styles.rtl]}>
        <Text
          style={[
            styles.value,
            { color: value ? t.textPrimary : t.textTertiary, textAlign: align },
          ]}
          numberOfLines={1}
        >
          {value || placeholder}
        </Text>
        <Ionicons
          name={rtl ? 'chevron-back' : 'chevron-forward'}
          size={17}
          color={t.textTertiary}
        />
      </View>
      {note && (
        <Text style={[styles.note, { color: t.textTertiary, textAlign: align }]}>{note}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { paddingVertical: 12, gap: 4 },
  rtl: { flexDirection: 'row-reverse' },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  label: { fontSize: 12.5, fontWeight: '600', letterSpacing: 0.2, flexShrink: 1 },
  hint: { fontSize: 11.5 },
  valueRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  value: { fontSize: 16.5, flex: 1 },
  note: { fontSize: 11.5, letterSpacing: 0.3 },
});

// v1.1.0 — `note`: a quiet line under the value, so the chosen recording's
//          SIMULATION badge stays visible on the form and not only in the sheet
//          it was picked from.
// v1.0.0 — One labelled form line, picker or static, with the WHOLE ROW as the
//          hit area — the padding is inside the pressable, which is what
//          "I press on it and nothing happens" was about.
