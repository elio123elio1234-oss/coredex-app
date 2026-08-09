/* ==================================================================
   BeatBuilder (molecule) — drag to build the ECG ID, study by study.

        ▌▌▌▌▌▌▌│░░░░░░░░
        Averaging 7 of 11 studies · 12 Jul

   One notch per contributing study, filled up to where the finger is.
   As it moves right the signature above redraws from the first k studies.

   ══ WHY THIS EARNS ITS SPACE ══
   The claim behind the whole feature is that averaging many recordings
   cancels what is not the heart. Written down, a reader has to take that
   on faith. Given this control they watch it happen in about two seconds,
   and the argument makes itself.

   ══ ⚠️ WHAT IT ACTUALLY SHOWS — the band FILLS OUT, it does not tighten ══
   The obvious story ("more studies, narrower band") is wrong, and it was
   written that way here until `buildBaselineSequence` was measured. The
   corridor is a prediction interval for the NEXT study, so it converges on
   this person's real variability instead of shrinking: 0.021 → 0.028 mV
   across six sessions, then flat.

   The true story is better. After one study the band is narrow only
   because it holds nothing but that recording's own beat-to-beat noise —
   a single measurement dressed as a range, and the most over-confident
   picture the system can draw. Dragging right is watching it learn how
   much this person really varies. `insBuiltMeaning` says exactly that, and
   must keep saying it: a caption promising a tightening band would promise
   the one thing the maths will not do.

   ══ NOTCHES, NOT A SMOOTH TRACK ══
   The quantity is a count of studies, not a proportion. A continuous
   slider would invite the finger to stop between two of them, which means
   nothing, and would hide how few studies a young baseline rests on.

   ══ HAPTICS ══
   One `selectionAsync` per study crossed — the picker-wheel event, because
   this is scrubbing through discrete items and not an impact. Firing per
   frame would buzz continuously and say nothing.

   Purely presentational: it reports the index it is on.
   ================================================================== */

import { useCallback, useMemo, useRef } from 'react';
import * as Haptics from 'expo-haptics';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/useTheme';

interface Props {
  /** How many studies stand behind the finished baseline. */
  total: number;
  /** How many are currently being averaged, 1…total. */
  value: number;
  onChange: (value: number) => void;
  /** Localised caption, already formatted by the caller. */
  caption: string;
  /** Shown when fewer than all are selected — tapping restores all. */
  resetLabel: string;
  rtl?: boolean;
}

const TRACK_H = 26;
const NOTCH_RADIUS = 2;

export default function BeatBuilder({
  total,
  value,
  onChange,
  caption,
  resetLabel,
  rtl,
}: Props) {
  const t = useTheme();
  const trackW = useRef(0);
  const last = useRef(value);

  const move = useCallback(
    (x: number) => {
      if (trackW.current <= 0 || total <= 0) return;
      /* RTL is handled HERE rather than by reversing the layout: the
         notches are a timeline, and time runs left-to-right in Hebrew as
         it does everywhere else. What mirrors is which end the finger
         starts from, which is what a reader expects of a control. */
      const ratio = rtl ? 1 - x / trackW.current : x / trackW.current;
      const next = Math.max(1, Math.min(total, Math.ceil(ratio * total)));
      if (next === last.current) return;
      last.current = next;
      void Haptics.selectionAsync();
      onChange(next);
    },
    [total, onChange, rtl],
  );

  /* Same axis discipline as the signature above it: this track sits in a
     vertical ScrollView, so it claims horizontal movement and explicitly
     FAILS on vertical, handing the page back. A tap jumps to a study;
     `onStart` rather than `onBegin` so resting a thumb here while
     scrolling past does not rewrite the baseline and buzz. */
  const gesture = useMemo(
    () =>
      Gesture.Race(
        Gesture.Pan()
          .activeOffsetX([-4, 4])
          .failOffsetY([-12, 12])
          .onStart((e) => runOnJS(move)(e.x))
          .onUpdate((e) => runOnJS(move)(e.x)),
        Gesture.Tap().onEnd((e) => runOnJS(move)(e.x)),
      ),
    [move],
  );

  const partial = value < total;

  return (
    <View style={styles.root}>
      <GestureDetector gesture={gesture}>
        <View
          accessibilityRole="adjustable"
          accessibilityLabel={caption}
          accessibilityValue={{ min: 1, max: total, now: value }}
          onLayout={(e) => {
            trackW.current = e.nativeEvent.layout.width;
          }}
          style={[styles.track, rtl && styles.trackRtl]}
          /* Generous, because the track itself is 26 pt and a timeline you
             have to hit precisely is a timeline nobody drags. */
          hitSlop={{ top: 14, bottom: 14, left: 10, right: 10 }}
        >
          {Array.from({ length: total }, (_, i) => (
            <View
              key={i}
              style={[
                styles.notch,
                {
                  backgroundColor: i < value ? t.teal : t.border,
                  // The newest included study is the one the finger is on.
                  opacity: i === value - 1 ? 1 : i < value ? 0.75 : 1,
                },
              ]}
            />
          ))}
        </View>
      </GestureDetector>

      <Pressable
        accessibilityRole={partial ? 'button' : 'text'}
        disabled={!partial}
        onPress={() => {
          void Haptics.selectionAsync();
          last.current = total;
          onChange(total);
        }}
        style={({ pressed }) => [styles.captionRow, rtl && styles.rowRtl, { opacity: pressed ? 0.6 : 1 }]}
      >
        <Text
          style={[styles.caption, { color: partial ? t.teal : t.textTertiary }]}
          numberOfLines={1}
        >
          {caption}
        </Text>
        {partial && <Text style={[styles.reset, { color: t.textTertiary }]}>{resetLabel}</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 5 },
  rowRtl: { flexDirection: 'row-reverse' },
  track: { flexDirection: 'row', alignItems: 'center', height: TRACK_H, gap: 3 },
  trackRtl: { flexDirection: 'row-reverse' },
  notch: { flex: 1, height: 14, borderRadius: NOTCH_RADIUS },
  captionRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  caption: { fontSize: 11.5, flexShrink: 1, fontVariant: ['tabular-nums'] },
  reset: { fontSize: 11.5, fontWeight: '700', textDecorationLine: 'underline' },
});

// v1.0.0 — Drag through the studies and watch the median beat assemble: one
//          notch per contributing study, one haptic tick per study crossed, and
//          the caption doubles as the reset once the selection is partial.
