/* ==================================================================
   CarouselArrow (atom) — the round ‹ › button that steps the Tests
   carousel one card at a time, for a patient who does not think to swipe.

   ★ THE ARROWS ARE PHYSICAL, NOT LOGICAL — they do not mirror in Hebrew.
   The carousel is a horizontal `ScrollView`, and RN only reverses one when
   `I18nManager.isRTL` is set, which this app deliberately does not use (it
   handles direction per-component so the language can change without an
   app restart). So the pages really are laid out left-to-right whatever
   the language, and an arrow that mirrored would point away from the card
   it moves to. `prev` always means "the one physically to the left".

   Pure presentation: it does not know what page it is on, only whether it
   is allowed to move (`disabled`), which the carousel decides.
   ================================================================== */

import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '@/theme/useTheme';

/** Big enough to hit without looking — the 44 pt platform minimum. */
const HIT = 44;

interface Props {
  direction: 'prev' | 'next';
  onPress: () => void;
  /** At the end of the run: dimmed and inert, never removed (the row
      must not reflow and shift the card sideways as you page). */
  disabled?: boolean;
  accessibilityLabel: string;
}

export default function CarouselArrow({
  direction,
  onPress,
  disabled = false,
  accessibilityLabel,
}: Props) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      hitSlop={8}
      style={({ pressed }) => [
        styles.btn,
        {
          backgroundColor: t.surface,
          borderColor: t.border,
          opacity: disabled ? 0.28 : pressed ? 0.7 : 1,
        },
      ]}
    >
      <View style={styles.glyph}>
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
          <Path
            d={direction === 'prev' ? 'M15 5 8 12l7 7' : 'M9 5l7 7-7 7'}
            stroke={t.textPrimary}
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: HIT,
    height: HIT,
    borderRadius: HIT / 2,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0A2540',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  glyph: { alignItems: 'center', justifyContent: 'center' },
});

// v1.0.0 — Round page-step arrow for the Tests carousel (physical direction).
