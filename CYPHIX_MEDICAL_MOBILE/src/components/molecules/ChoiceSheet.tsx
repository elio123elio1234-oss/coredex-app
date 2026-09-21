/* ==================================================================
   ChoiceSheet (molecule) — pick one of a list, from a bottom sheet.

   A sheet rather than a wheel or a modal list because that is what this
   app already opens for every other "tell me more about this" (the ECG ID
   explanation, the values sheets), and a form that borrows a second
   picker idiom for no reason reads as two apps.

   ⚠️ The chosen row is marked with a TICK, not with a filled background.
   A filled row in a list of six looks like the one that is disabled, and
   on a dark sheet it reads as a hole. A tick says "this one" and nothing
   else.
   ================================================================== */

import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import BottomSheet from '@/components/molecules/BottomSheet';
import { useTheme } from '@/theme/useTheme';

export interface Choice {
  id: string;
  label: string;
  /** A quieter second line — a date, a code, a count. */
  sub?: string;
}

export interface ChoiceSheetProps {
  visible: boolean;
  title: string;
  closeLabel: string;
  options: readonly Choice[];
  selectedId?: string | null;
  onSelect: (id: string) => void;
  onClose: () => void;
  /** Shown instead of the list when there is nothing to choose from. */
  emptyBody?: string;
  rtl?: boolean;
}

export default function ChoiceSheet({
  visible,
  title,
  closeLabel,
  options,
  selectedId = null,
  onSelect,
  onClose,
  emptyBody,
  rtl = false,
}: ChoiceSheetProps) {
  const t = useTheme();
  const align = rtl ? ('right' as const) : ('left' as const);

  return (
    <BottomSheet visible={visible} onClose={onClose} title={title} closeLabel={closeLabel} scrollable>
      {options.length === 0 ? (
        <Text style={[styles.empty, { color: t.textSecondary, textAlign: align }]}>
          {emptyBody}
        </Text>
      ) : (
        <View>
          {options.map((o, i) => (
            <Pressable
              key={o.id}
              accessibilityRole="button"
              accessibilityState={{ selected: o.id === selectedId }}
              onPress={() => {
                void Haptics.selectionAsync();
                onSelect(o.id);
                onClose();
              }}
              style={({ pressed }) => [
                styles.row,
                rtl && styles.rtl,
                i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.border },
                { opacity: pressed ? 0.6 : 1 },
              ]}
            >
              <View style={styles.text}>
                <Text style={[styles.label, { color: t.textPrimary, textAlign: align }]}>
                  {o.label}
                </Text>
                {o.sub && (
                  <Text style={[styles.sub, { color: t.textTertiary, textAlign: align }]}>
                    {o.sub}
                  </Text>
                )}
              </View>
              {o.id === selectedId && <Ionicons name="checkmark" size={19} color={t.accent} />}
            </Pressable>
          ))}
        </View>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  rtl: { flexDirection: 'row-reverse' },
  text: { flex: 1, gap: 2 },
  label: { fontSize: 16 },
  sub: { fontSize: 12.5 },
  empty: { fontSize: 14.5, lineHeight: 21, paddingVertical: 12 },
});

// v1.0.0 — One-of-many picker in the app's own bottom sheet, marked with a tick
//          rather than a fill.
