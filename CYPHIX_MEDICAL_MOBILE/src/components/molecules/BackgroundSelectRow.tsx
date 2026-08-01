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
import type { TranslationKey } from '@/i18n/config';
import { useTranslation } from '@/i18n/useTranslation';
import type { BgStyle } from '@/theme/shellTheme';
import { useTheme } from '@/theme/useTheme';

/** Order and labels follow the web's BG_STYLES / bg* locale keys. */
const SWATCHES: { id: BgStyle; labelKey: TranslationKey; colors: [string, string] }[] = [
  { id: 'waves', labelKey: 'bgWaves', colors: ['#E7F6FB', '#8FD2E6'] },
  { id: 'white', labelKey: 'bgWhite', colors: ['#FBFBFD', '#FBFBFD'] },
  { id: 'gray', labelKey: 'bgGray', colors: ['#E4E7EC', '#E4E7EC'] },
  { id: 'calm', labelKey: 'bgCalm', colors: ['#F2FAFC', '#C9EEF2'] },
];

interface Props {
  value: BgStyle;
  onChange: (bg: BgStyle) => void;
}

export default function BackgroundSelectRow({ value, onChange }: Props) {
  const t = useTheme();
  const { t: tr, rtl } = useTranslation();
  return (
    <View
      style={[styles.row, rtl && styles.rowRtl]}
      accessibilityRole="radiogroup"
      accessibilityLabel={tr('bgLabel')}
    >
      {SWATCHES.map((s) => {
        const active = s.id === value;
        const label = tr(s.labelKey);
        return (
          <Pressable
            key={s.id}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            accessibilityLabel={label}
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
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 14, paddingVertical: 4 },
  rowRtl: { flexDirection: 'row-reverse', justifyContent: 'flex-start' },
  swatch: { alignItems: 'center', gap: 6 },
  chip: { width: 46, height: 34, borderRadius: 10 },
  label: { fontSize: 11.5 },
});

// v1.1.0 — Swatch names come from the locale; the row follows the reading
//          direction, so the first swatch is where the eye starts.
