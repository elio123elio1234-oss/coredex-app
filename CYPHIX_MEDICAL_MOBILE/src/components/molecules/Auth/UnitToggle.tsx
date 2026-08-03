/* ==================================================================
   UnitToggle (molecule) — the CM/FT · KG/LB pill beside the height and
   weight headings.

   It changes only how the number is DISPLAYED. The draft always holds
   centimetres and kilograms, because that is what the ECG criteria are
   indexed against and a unit stored per-patient is a conversion bug
   waiting for a clinician.
   ================================================================== */

import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LABEL_TYPE, type AuthPalette } from '@/theme/authTheme';
import type { Units } from '@/features/auth/onboardingModel';

interface Props {
  value: Units;
  onChange: (units: Units) => void;
  /** Already translated: e.g. ['CM', 'FT'] or ['KG', 'LB']. */
  labels: [string, string];
  palette: AuthPalette;
}

const OPTIONS: Units[] = ['metric', 'imperial'];

export default function UnitToggle({ value, onChange, labels, palette }: Props) {
  return (
    <View
      accessibilityRole="radiogroup"
      style={[styles.track, { backgroundColor: palette.key }]}
    >
      {OPTIONS.map((option, i) => {
        const active = option === value;
        return (
          <Pressable
            key={option}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            accessibilityLabel={labels[i]}
            onPress={() => {
              void Haptics.selectionAsync();
              onChange(option);
            }}
            style={[styles.option, active && { backgroundColor: palette.navy }]}
          >
            <Text
              allowFontScaling={false}
              style={[styles.label, { color: active ? '#FFFFFF' : palette.body }]}
            >
              {labels[i]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', borderRadius: 11, padding: 3 },
  option: {
    height: 32,
    paddingHorizontal: 13,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { ...LABEL_TYPE, fontSize: 11.5, letterSpacing: 0.6 },
});

// v1.0.0 — Metric/imperial display toggle (storage stays cm + kg).
