/* ==================================================================
   ActionSheet (molecule) — the phone's answer to the web's ActionMenu.

   The web hangs a dropdown off an "Actions" button in the study header.
   Ported literally that is a 180 pt popover anchored to a 40 pt trigger in
   the top-right corner of a 390 pt screen — reachable only by the hand that
   is holding the phone, at the far end of its stretch, which is the corner
   every platform's own guidelines tell you not to put actions in.

   The native pattern is a sheet from the BOTTOM: it appears where the thumb
   already is, its rows are full-width so they cannot be mis-tapped, and it
   is dismissed by tapping away or dragging down — the two things a user
   tries first.

   Same content, same ordering rule as the web menu: destructive items sit
   below a divider, in the danger colour, never adjacent to a routine one.
   ================================================================== */

import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const insets = useSafeAreaInsets();

  const normal = items.filter((i) => !i.danger);
  const danger = items.filter((i) => i.danger);

  const row = (item: ActionSheetItem) => (
    <Pressable
      key={item.id}
      accessibilityRole="button"
      accessibilityLabel={item.label}
      accessibilityHint={item.hint}
      disabled={item.disabled}
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        /* Close FIRST. A share sheet or a file picker opened from inside a
           still-mounted Modal is presented behind it on iOS — the user sees
           nothing happen and taps again. */
        onClose();
        item.onSelect();
      }}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: pressed ? t.surfaceHover : 'transparent',
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
    </Pressable>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      {/* The scrim IS the dismiss target — tapping away is what a user tries
          before looking for a Cancel button. */}
      <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel={cancelLabel} />
      <View
        style={[
          styles.sheet,
          {
            backgroundColor: t.surface,
            borderColor: t.border,
            paddingBottom: Math.max(insets.bottom, 12),
          },
        ]}
      >
        <View style={[styles.grabber, { backgroundColor: t.border }]} />
        <Text style={[styles.title, { color: t.textTertiary }]}>{title}</Text>

        <ScrollView bounces={false}>
          {normal.map(row)}
          {danger.length > 0 && normal.length > 0 && (
            <View style={[styles.divider, { backgroundColor: t.border }]} />
          )}
          {danger.map(row)}
        </ScrollView>

        <Pressable
          accessibilityRole="button"
          onPress={onClose}
          style={({ pressed }) => [
            styles.cancel,
            { borderColor: t.border, opacity: pressed ? 0.6 : 1 },
          ]}
        >
          <Text style={[styles.cancelText, { color: t.textPrimary }]}>{cancelLabel}</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderTopWidth: 1,
    paddingHorizontal: 8,
    paddingTop: 8,
    maxHeight: '75%',
  },
  grabber: { alignSelf: 'center', width: 38, height: 4, borderRadius: 2, marginBottom: 10 },
  title: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    paddingHorizontal: 12,
    paddingBottom: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: RADIUS.md,
  },
  rowText: { flex: 1, gap: 2 },
  label: { fontSize: 16.5, fontWeight: '600' },
  hint: { fontSize: 12.5, lineHeight: 17 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 6, marginHorizontal: 12 },
  cancel: {
    marginTop: 8,
    marginHorizontal: 4,
    paddingVertical: 14,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelText: { fontSize: 16, fontWeight: '700' },
});

// v1.0.0 — Bottom action sheet replacing the web's corner dropdown; destructive
//          items below a divider, closes before running so a share sheet can present.
