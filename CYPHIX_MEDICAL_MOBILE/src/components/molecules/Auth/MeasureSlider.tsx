/* ==================================================================
   MeasureSlider (molecule) — the height/weight slider: a 4 pt rail and a
   navy thumb ringed in white, exactly the reference's styled
   `input[type=range]` (which draws no filled portion — the value is
   already 64 pt tall above it, so a second reading of the same number
   would only add ink).

   ── Why it is hand-built ──
   RN has no slider in core, and this one has to keep up with a finger
   while the readout above it changes. The thumb is therefore driven on
   the UI THREAD (Reanimated), and JS is told only when the ROUNDED value
   changes — dragging 174 → 175 crosses dozens of touch events and must
   not cause dozens of re-renders.

   The whole 34 pt band is the target, not the 30 pt thumb: this is a
   control older hands use, and the reference sizes its row the same way.
   ================================================================== */

import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import type { AuthPalette } from '@/theme/authTheme';

interface Props {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  palette: AuthPalette;
  accessibilityLabel: string;
}

const TRACK_HEIGHT = 4;
const THUMB = 30;
const BAND = 34;

export default function MeasureSlider({
  value,
  min,
  max,
  onChange,
  palette,
  accessibilityLabel,
}: Props) {
  /* Rail width, measured on layout. Zero until then, and every read
     guards for it — dividing by an unmeasured track is how a thumb ends
     up at NaN on the first frame. */
  const width = useSharedValue(0);
  /* The value as the UI thread knows it: what the thumb is drawn from,
     and what tells `commit` whether JS still needs telling. */
  const current = useSharedValue(value);

  /* Follow changes that came from OUTSIDE a drag (returning to the step,
     a value restored from the draft). */
  useEffect(() => {
    current.value = value;
  }, [current, value]);

  const pan = Gesture.Pan()
    /* Claim the touch on contact rather than on movement: a tap on the
       rail is a jump to that value, and waiting for a drag eats it. */
    .onBegin((e) => {
      'worklet';
      const w = width.value;
      if (w <= 0) return;
      const next = Math.round(min + Math.max(0, Math.min(1, e.x / w)) * (max - min));
      if (next !== current.value) {
        current.value = next;
        runOnJS(onChange)(next);
      }
    })
    .onUpdate((e) => {
      'worklet';
      const w = width.value;
      if (w <= 0) return;
      const next = Math.round(min + Math.max(0, Math.min(1, e.x / w)) * (max - min));
      if (next !== current.value) {
        current.value = next;
        runOnJS(onChange)(next);
      }
    });

  const thumbStyle = useAnimatedStyle(() => {
    const ratio = max > min ? (current.value - min) / (max - min) : 0;
    return {
      transform: [{ translateX: Math.max(0, Math.min(1, ratio)) * width.value - THUMB / 2 }],
    };
  });

  return (
    <GestureDetector gesture={pan}>
      <View
        style={styles.band}
        accessibilityRole="adjustable"
        accessibilityLabel={accessibilityLabel}
        accessibilityValue={{ now: value, min, max }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => {
          if (e.nativeEvent.actionName === 'increment') onChange(Math.min(max, value + 1));
          if (e.nativeEvent.actionName === 'decrement') onChange(Math.max(min, value - 1));
        }}
        onLayout={(e) => {
          width.value = e.nativeEvent.layout.width;
        }}
      >
        <View style={[styles.track, { backgroundColor: palette.border }]} />
        <Animated.View
          pointerEvents="none"
          style={[
            styles.thumb,
            { backgroundColor: palette.navy, borderColor: palette.page },
            thumbStyle,
          ]}
        />
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  band: { height: BAND, justifyContent: 'center' },
  track: { height: TRACK_HEIGHT, borderRadius: 3 },
  thumb: {
    position: 'absolute',
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    /* The reference's 6 px ring — what lifts the thumb off the rail. */
    borderWidth: 6,
    elevation: 3,
    shadowColor: '#0D2041',
    shadowOpacity: 0.32,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
});

// v1.0.0 — UI-thread measurement slider (reports only on value change).
