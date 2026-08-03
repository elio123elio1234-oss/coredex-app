/* ==================================================================
   ChoiceChip (molecule) — the two small selectables the flow needs:

     `tile` — a 60 pt square in the blood-type grid. Selected inverts to
              navy, because eight of these are on screen at once and a
              tinted fill would not be findable at a glance.
     `pill` — a 38 pt rounded chip for the relationship row, where the
              set is a list of words rather than a grid of codes.
   ================================================================== */

import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import { NUMERIC_TYPE, type AuthPalette } from '@/theme/authTheme';

interface Props {
  label: string;
  selected: boolean;
  onPress: () => void;
  palette: AuthPalette;
  variant?: 'tile' | 'pill';
  style?: StyleProp<ViewStyle>;
}

export default function ChoiceChip({
  label,
  selected,
  onPress,
  palette,
  variant = 'tile',
  style,
}: Props) {
  const tile = variant === 'tile';
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={() => {
        void Haptics.selectionAsync();
        onPress();
      }}
      style={({ pressed }) => [
        tile ? styles.tile : styles.pill,
        {
          backgroundColor: selected
            ? tile
              ? palette.navy
              : palette.selected
            : pressed
              ? palette.key
              : palette.page,
          borderColor: selected ? palette.navy : palette.border,
          borderWidth: selected ? 2 : 1,
        },
        style,
      ]}
    >
      <Text
        allowFontScaling={false}
        numberOfLines={1}
        style={[
          tile ? styles.tileLabel : styles.pillLabel,
          { color: selected && tile ? '#FFFFFF' : palette.heading },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: { height: 60, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  pill: {
    height: 38,
    paddingHorizontal: 15,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileLabel: { fontSize: 18, fontWeight: '600', ...NUMERIC_TYPE },
  pillLabel: { fontSize: 13.5, fontWeight: '600' },
});

// v1.0.0 — Blood-type tile and relationship pill in one selectable.
