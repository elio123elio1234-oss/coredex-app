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

   ══ HAPTICS — ★ STRENGTHENED IN v2.0.0 ══
   It was one `selectionAsync` per study crossed: the picker-wheel event,
   correct on paper because this is scrubbing through discrete items and
   not an impact. Reported from the phone as too faint to feel, and that
   is the honest outcome rather than a preference — `selectionAsync` is
   the LIGHTEST event iOS defines, it is tuned for a wheel spinning under
   a thumb resting on glass, and through a case, one-handed, with a
   finger already moving, it is easy to miss entirely. A control whose
   feedback you cannot feel is a control you have to watch, which defeats
   the point of putting the sensation there at all.

   So: `Medium` impact per study crossed, and `Heavy` at either END of
   the timeline. The end-stop is the part that earns its place — it is
   how the finger learns where the first and the last study are without
   looking, the same way a picker's rubber-band tells you the list is
   over.

   ⚠️ TWO THINGS THAT MUST NOT BE UNDONE:
     • The tick fires ONE PER STUDY CROSSED, never per frame. Per frame
       is a continuous buzz that says nothing and drains the taptic
       engine's headroom, after which it starts dropping events.
     • `MIN_TICK_MS` guards a fast flick. `move` can already only fire
       once per frame, but at 120 Hz on a ProMotion display that is a
       medium impact every 8 ms — the engine cannot reproduce them, so
       they merge into one long rumble. The value still updates; only the
       buzz is skipped, so the picture never lags the finger.

   Purely presentational: it reports the index it is on.
   ================================================================== */

import { useCallback, useEffect, useMemo, useRef } from 'react';
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

const TRACK_H = 28;
const NOTCH_RADIUS = 2;

/**
 * The floor between two taptic events, in ms.
 *
 * Not a debounce on the VALUE — the baseline still redraws on every
 * crossing, so the picture never lags the finger. It is a floor on the
 * BUZZ, because impacts fired closer together than the engine can
 * reproduce them merge into one continuous rumble, which is precisely
 * the featureless vibration this control was rebuilt to stop being.
 */
const MIN_TICK_MS = 32;

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
  /** The notch the caller is actually showing — the guard that stops a
      redraw per frame. It must FOLLOW the prop, not only the finger:
      when the value is changed from outside (the reset link, a lead
      switch, a rebuilt identity) a stale guard would swallow the first
      drag back to that same notch and read as a dead control. */
  const last = useRef(value);
  useEffect(() => {
    last.current = value;
  }, [value]);
  /** When the last impact was fired — see `MIN_TICK_MS`. */
  const lastTick = useRef(0);

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

      /* ★ The value moves FIRST and unconditionally: the throttle below
         is allowed to skip a buzz, never a redraw. Gating the state on
         the haptic clock is how a scrubber comes to stutter under a fast
         finger. */
      onChange(next);

      const now = Date.now();
      if (now - lastTick.current < MIN_TICK_MS) return;
      lastTick.current = now;
      /* Heavy at the ends, Medium in between — the end-stop is what lets
         a finger find the first and the last study without looking. */
      const atEnd = next === 1 || next === total;
      void Haptics.impactAsync(
        atEnd ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Medium,
      );
    },
    [total, onChange, rtl],
  );

  /* ══ ⚠️ THE GESTURE OBJECT IS BUILT ONCE AND NEVER REBUILT ══
     Reported: the drag "sometimes just doesn't work, it's like it loses
     touch". It was not the touch handling — it was this component
     handing `GestureDetector` a NEW gesture object mid-drag.

     The chain: the caller passes `onChange` as an inline arrow, so it is
     a new function on every render; `move` is a `useCallback` on it, so
     that is new too; the gesture was a `useMemo` on `move`, so THAT was
     new — and every notch the finger crosses calls `onChange`, which
     re-renders the panel. So the detector was being reconfigured on
     every crossing, in the middle of the interaction it was tracking,
     and a reconfigured handler can drop the gesture it was in.

     The fix is to stop the churn reaching the detector at all: the
     gesture closes over ONE stable callback that reads the current
     `move` out of a ref. The caller can be as careless with its props as
     it likes; the handler is configured once and lives for the mount. */
  const moveRef = useRef(move);
  useEffect(() => {
    moveRef.current = move;
  }, [move]);
  const dispatchMove = useCallback((x: number) => moveRef.current(x), []);

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
          /* 16, not 12. This is the tolerance for how much the finger may
             drift vertically BEFORE the pan claims the touch, and a real
             thumb starting a horizontal drag on a 28 pt track is never
             purely horizontal. Too tight and an ordinary diagonal start
             fails the pan and scrolls the page instead — which is the
             other half of "sometimes it doesn't work". Still small enough
             that a deliberate vertical scroll from the track hands off. */
          .failOffsetY([-16, 16])
          /* ★ Explicit, because the track is 28 pt tall and a finger
             dragging across it WILL leave those bounds. Pan already
             defaults to false; stating it stops a future edit from
             turning a drag into a control that dies when the thumb
             wanders. */
          .shouldCancelWhenOutside(false)
          .onStart((e) => runOnJS(dispatchMove)(e.x))
          .onUpdate((e) => runOnJS(dispatchMove)(e.x)),
        Gesture.Tap().onEnd((e) => runOnJS(dispatchMove)(e.x)),
      ),
    [dispatchMove],
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
                  backgroundColor: i < value ? t.signal : t.border,
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
          /* Same weight as landing on the last notch, because that is
             exactly what this does — snapping back to the whole
             baseline should not feel lighter than reaching it by hand. */
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          last.current = total;
          lastTick.current = Date.now();
          onChange(total);
        }}
        style={({ pressed }) => [styles.captionRow, rtl && styles.rowRtl, { opacity: pressed ? 0.6 : 1 }]}
      >
        <Text
          style={[styles.caption, { color: partial ? t.signalInk : t.textTertiary }]}
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
  notch: { flex: 1, height: 16, borderRadius: NOTCH_RADIUS },
  captionRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  /* 13.5, not 11.5: this caption is the only thing that says what the
     control is doing, and Insights is aimed at a reader for whom no text
     on the screen may need good eyes (v0.44.0). */
  caption: { fontSize: 13.5, flexShrink: 1, fontVariant: ['tabular-nums'] },
  reset: { fontSize: 13.5, fontWeight: '700', textDecorationLine: 'underline' },
});

// v2.1.0 — ⚠️ "It sometimes loses touch." The gesture OBJECT was being rebuilt
//          mid-drag: the caller's inline `onChange` → a new `move` → a new
//          `useMemo` gesture, on every notch crossed, because crossing a notch
//          re-renders the caller. `GestureDetector` reconfigures on a new
//          gesture, and a reconfigured handler can drop the interaction it is
//          tracking. It now closes over one stable callback reading `move`
//          from a ref, so the handler is configured once per mount whatever
//          the caller does. Also: `failOffsetY` 12 → 16 (a thumb starting a
//          horizontal drag is never purely horizontal, and too tight a
//          tolerance scrolls the page instead), `shouldCancelWhenOutside`
//          stated explicitly, and `last` now follows the `value` prop so an
//          external change cannot leave a stale guard swallowing the first
//          drag back to that notch.
// v2.0.0 — Haptics strengthened after the tick was reported as too faint to
//          feel: Medium impact per study crossed instead of `selectionAsync`
//          (the lightest event iOS has, easy to miss through a case while the
//          finger is already moving), Heavy at either end of the timeline as an
//          end-stop, and MIN_TICK_MS so a fast flick cannot merge them into one
//          rumble. The value is never throttled, only the buzz. Track and
//          notches up 2 pt, caption 11.5 -> 13.5 for the older reader.
// v1.0.0 — Drag through the studies and watch the median beat assemble: one
//          notch per contributing study, one haptic tick per study crossed, and
//          the caption doubles as the reset once the selection is partial.
