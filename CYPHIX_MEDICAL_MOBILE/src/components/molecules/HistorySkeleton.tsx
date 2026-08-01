/* ==================================================================
   HistorySkeleton (molecule) — the shape of the list, while it loads.
   Ported from the web molecule.

   A skeleton rather than a spinner because it tells the truth about what is
   coming: four rows of a specific size, so the layout does not jump when
   the data lands. A spinner in the middle of an empty screen says only
   "wait", and then the page rearranges itself under the reader's thumb.

   The pulse is Reanimated, i.e. on the UI thread — the whole point of a
   perceived-speed animation is that it keeps moving while JavaScript is
   busy doing the work being waited for.
   ================================================================== */

import { useEffect } from 'react';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { StyleSheet, View } from 'react-native';
import { RADIUS } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

const ROWS = 4;

export default function HistorySkeleton() {
  const t = useTheme();
  const pulse = useSharedValue(0.45);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 850, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [pulse]);

  const fade = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <View style={styles.list} accessibilityRole="progressbar">
      {Array.from({ length: ROWS }, (_, i) => (
        <Animated.View
          key={i}
          style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }, fade]}
        >
          <View style={styles.main}>
            <View style={[styles.bar, styles.wide, { backgroundColor: t.surfaceHover }]} />
            <View style={[styles.bar, styles.narrow, { backgroundColor: t.surfaceHover }]} />
          </View>
          <View style={[styles.rate, { backgroundColor: t.surfaceHover }]} />
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 10 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: 15,
    // Matches StudyCard's resting height so nothing shifts on arrival.
    minHeight: 78,
  },
  main: { flex: 1, gap: 8 },
  bar: { height: 12, borderRadius: 6 },
  wide: { width: '62%' },
  narrow: { width: '40%', height: 10 },
  rate: { width: 46, height: 34, borderRadius: 8 },
});

// v1.0.0 — Loading placeholder shaped like the list it precedes (UI-thread pulse).
