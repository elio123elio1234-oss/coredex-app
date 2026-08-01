/* ==================================================================
   BackgroundSelectRow (molecule) — the shell background picker, ported
   from the web molecule of the same name.

   A row of labelled colour swatches; tapping one applies immediately so
   the patient can preview each look and keep the one they like. Purely
   presentational — the screen passes the current value + onChange.

   Every swatch carries its NAME as well as its colour: a picker that is
   colour-only is unusable to a colour-blind or low-vision patient, which
   is exactly the audience most likely to be changing the background.
   ================================================================== */

import * as Haptics from 'expo-haptics';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable } from 'react-native';
import type { BgStyle } from '@/theme/shellTheme';
import { useTheme } from '@/theme/useTheme';

/** Order and labels follow the web's BG_STYLES / bg* locale keys. */
const SWATCHES: { id: BgStyle; label: string; colors: [string, string] }[] = [
  { id: 'waves', label: 'Waves', colors: ['#E7F6FB', '#8FD2E6'] },
  { id: 'white', label: 'White', colors: ['#FBFBFD', '#FBFBFD'] },
  { id: 'gray', label: 'Gray', colors: ['#E4E7EC', '#E4E7EC'] },
  { id: 'calm', label: 'Calm', colors: ['#F2FAFC', '#C9EEF2'] },
];

interface Props {
  value: BgStyle;
  onChange: (bg: BgStyle) => void;
}

export default function BackgroundSelectRow({ value, onChange }: Props) {
  const t = useTheme();
  return (
    <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel="Background">
      {SWATCHES.map((s) => {
        const active = s.id === value;
        return (
          <Pressable
            key={s.id}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            accessibilityLabel={s.label}
            onPress={() => {
              void Haptics.selectionAsync();
              onChange(s.id);
            }}
            style={styles.swatch}
          >
            <LinearGradient
              colors={s.colors}
              start={{ x: 0.15, y: 0 }}
              end={{ x: 0.85, y: 1 }}
              style={[
                styles.chip,
                { borderColor: active ? t.brandNavy : t.border, borderWidth: active ? 2.5 : 1 },
              ]}
            />
            <Text
              style={[
                styles.label,
                { color: active ? t.textPrimary : t.textSecondary, fontWeight: active ? '800' : '600' },
              ]}
            >
              {s.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 14, paddingVertical: 4 },
  swatch: { alignItems: 'center', gap: 6 },
  chip: { width: 46, height: 34, borderRadius: 10 },
  label: { fontSize: 11.5 },
});

// v1.0.0 — Shell background picker (named swatches, not colour alone).
