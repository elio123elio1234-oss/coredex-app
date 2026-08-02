/* ==================================================================
   ActionSheet (molecule) — the phone's answer to the web's ActionMenu.

   The web hangs a dropdown off an "Actions" button in the study header.
   Ported literally that is a 180 pt popover anchored to a 40 pt trigger in
   the top-right corner of a 390 pt screen — reachable only by the hand that
   is holding the phone, at the far end of its stretch, which is the corner
   every platform's own guidelines tell you not to put actions in.

   The native pattern is a sheet from the BOTTOM: it appears where the thumb
   already is, its rows are full-width so they cannot be mis-tapped, and it
   is dismissed by tapping away or dragging down.

   Presentation (blurred scrim, glass panel, corners, grabber) belongs to
   `BottomSheet`; this file is the rows. Same ordering rule as the web menu:
   destructive items sit below a divider, in the danger colour, never
   adjacent to a routine one.
   ================================================================== */

import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import BottomSheet from '@/components/molecules/BottomSheet';
import { RADIUS } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

export interface ActionSheetItem {
  id: string;
  label: string;
  hint?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onSelect: () => void;
  /** Renders in the destructive style and sits below a divider. */
  danger?: boolean;
  disabled?: boolean;
  /**
   * Set (true/false) to render the row as a TOGGLE with a trailing check.
   *
   * This is what lets the filter stages and the alignment modes live in a
   * sheet instead of on the toolbar: they need words ("50 Hz", "Align
   * P-QRS-T") to be honest, and an icon for "Savitzky-Golay smoothing" would
   * be a guess. Toggling one does NOT close the sheet — a reader comparing
   * the notch on against off would otherwise reopen it every time.
   */
  checked?: boolean;
  /** Sub-heading printed above this row. Groups a sheet without nesting it. */
  section?: string;
}

interface Props {
  visible: boolean;
  title: string;
  items: ActionSheetItem[];
  cancelLabel: string;
  onClose: () => void;
}

export default function ActionSheet({ visible, title, items, cancelLabel, onClose }: Props) {
  const t = useTheme();

  const normal = items.filter((i) => !i.danger);
  const danger = items.filter((i) => i.danger);

  const row = (item: ActionSheetItem) => {
    const isToggle = item.checked !== undefined;
    return (
      <View key={item.id}>
        {item.section && (
          <Text style={[styles.section, { color: t.textTertiary }]}>{item.section}</Text>
        )}
        <Pressable
          accessibilityRole={isToggle ? 'switch' : 'button'}
          accessibilityState={isToggle ? { checked: item.checked } : undefined}
          accessibilityLabel={item.label}
          accessibilityHint={item.hint}
          disabled={item.disabled}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            /* A toggle stays open — see `checked`. Everything else closes
               FIRST: a share sheet or file picker opened from inside a
               still-mounted Modal is presented behind it on iOS, so the user
               sees nothing happen and taps again. */
            if (!isToggle) onClose();
            item.onSelect();
          }}
          style={({ pressed }) => [
            styles.row,
            {
              backgroundColor: pressed
                ? item.danger
                  ? t.dangerSoft
                  : t.accentSoft
                : 'transparent',
              opacity: item.disabled ? 0.4 : 1,
            },
          ]}
        >
          {item.icon && (
            <Ionicons name={item.icon} size={20} color={item.danger ? t.danger : t.textSecondary} />
          )}
          <View style={styles.rowText}>
            <Text style={[styles.label, { color: item.danger ? t.danger : t.textPrimary }]}>
              {item.label}
            </Text>
            {item.hint && (
              <Text style={[styles.hint, { color: t.textTertiary }]} numberOfLines={2}>
                {item.hint}
              </Text>
            )}
          </View>
          {isToggle && (
            <Ionicons
              name={item.checked ? 'checkmark-circle' : 'ellipse-outline'}
              size={22}
              color={item.checked ? t.accentLive : t.textTertiary}
            />
          )}
        </Pressable>
      </View>
    );
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={title}
      closeLabel={cancelLabel}
      footer={
        <Pressable
          accessibilityRole="button"
          onPress={onClose}
          style={({ pressed }) => [
            styles.cancel,
            { backgroundColor: t.accentSoft, opacity: pressed ? 0.6 : 1 },
          ]}
        >
          <Text style={[styles.cancelText, { color: t.textPrimary }]}>{cancelLabel}</Text>
        </Pressable>
      }
    >
      <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
        {normal.map(row)}
        {danger.length > 0 && normal.length > 0 && (
          <View style={[styles.divider, { backgroundColor: t.border }]} />
        )}
        {danger.map(row)}
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: RADIUS.md,
  },
  rowText: { flex: 1, flexShrink: 1, gap: 2 },
  section: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 2,
  },
  label: { fontSize: 16.5, fontWeight: '600' },
  hint: { fontSize: 12.5, lineHeight: 17 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 6, marginHorizontal: 14 },
  cancel: { marginTop: 10, marginHorizontal: 4, paddingVertical: 14, borderRadius: 16, alignItems: 'center' },
  cancelText: { fontSize: 16, fontWeight: '700' },
});

// v2.0.0 — Presentation moved into BottomSheet (blurred scrim + glass panel);
//          rows keep their toggle/section behaviour and the destructive divider.
