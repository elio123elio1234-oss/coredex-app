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

   ══ ★ WHERE THE NOTCH IS DECIDED — MOVED TO THE UI THREAD IN v3.0.0 ══
   "One tick per study crossed" was true of the HAPTIC and false of the
   plumbing: every pointer sample — 60 to 120 a second — was marshalled
   into JS with `runOnJS`, and only there did it discover that the finger
   was still on the same notch and return. That is fine while JS is idle
   and it is not fine while JS is busy, because `runOnJS` QUEUES.

   And JS was busy: each crossing re-rendered the panel above, which was
   re-fusing the entire baseline every render (`useEcgIdentity` v1.2.0).
   So the queue grew under the finger, the buzz ran behind the drag, and
   it went on firing after the reader had already switched to Studies —
   reported, in as many words, as still feeling the vibration from a tab
   they had left. Nothing was leaking touches. The thread was still
   working through a drag that had ended.

   The crossing test now runs in the gesture worklet against shared
   values, so JS is entered ONCE PER NOTCH — about eleven times in a full
   sweep instead of several hundred. `enabled` is the second half of the
   same fix: a queued crossing that arrives after the host has gone off
   show is DROPPED rather than buzzed.

   Purely presentational: it reports the index it is on.
   ================================================================== */

import { useCallback, useEffect, useMemo, useRef } from 'react';
import * as Haptics from 'expo-haptics';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS, useSharedValue } from 'react-native-reanimated';
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
  /**
   * Whether the host is actually on show.
   *
   * ★ Not a styling flag — a mute. History keeps the Insights tab MOUNTED
   * when the reader switches to Studies, so this control outlives the
   * screen it is on, and any crossing still queued when the tab changed
   * would otherwise buzz into a screen where nothing is moving. A
   * vibration with no visible cause is worse than a missing one: it reads
   * as the phone misbehaving.
   */
  enabled?: boolean;
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
  enabled = true,
}: Props) {
  const t = useTheme();

  /* ── What the worklet needs, as shared values ──
     Everything the crossing test reads has to be legible from the UI
     thread, or the test cannot run there. Shared values are stable
     objects, which is also what keeps the gesture built once. */
  const trackW = useSharedValue(0);
  const totalSv = useSharedValue(total);
  const rtlSv = useSharedValue(rtl === true);
  const liveSv = useSharedValue(enabled);
  /** The notch the caller is actually showing — the guard that stops a
      redraw per frame. It must FOLLOW the prop, not only the finger:
      when the value is changed from outside (the reset link, a lead
      switch, a rebuilt identity) a stale guard would swallow the first
      drag back to that same notch and read as a dead control. */
  const notchSv = useSharedValue(value);

  useEffect(() => {
    totalSv.value = total;
  }, [total, totalSv]);
  useEffect(() => {
    rtlSv.value = rtl === true;
  }, [rtl, rtlSv]);

  /** The last notch this control itself reported. See the effect below. */
  const committed = useRef(value);
  /** The current prop, readable from an effect that must not depend on it. */
  const valueRef = useRef(value);

  /* ══ ⚠️ SYNC THE GUARD FROM OUTSIDE, BUT NEVER FROM OUR OWN ECHO ══
     The guard has to follow the `value` prop, or an external change (the
     reset link, a lead switch, a rebuilt identity) leaves it stale and
     swallows the first drag back to that notch — a dead control.

     But the two now live on different threads, and a naive copy
     REGRESSES the guard mid-drag: the UI thread reaches notch 6 while JS
     is still retiring the commit for 5, and copying `value` back would
     rewind the worklet to 5, so the very next pointer sample re-reports 6
     and the reader gets the same notch twice — a double thump. So an
     echo of our own commit is ignored, and only a value this control did
     not ask for is copied down. */
  useEffect(() => {
    valueRef.current = value;
    if (value === committed.current) return;
    notchSv.value = value;
  }, [value, notchSv]);

  /* ── The same three, as refs, for the JS half ──
     `commit` must keep ONE identity for the life of the mount (it is
     captured by the worklet), so it cannot close over props. */
  const onChangeRef = useRef(onChange);
  const totalRef = useRef(total);
  const liveRef = useRef(enabled);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  useEffect(() => {
    totalRef.current = total;
  }, [total]);
  /* Both halves of the mute flip together, and coming back ON SHOW also
     RESYNCS the guard: a crossing that was dropped while muted left the
     worklet holding a notch the panel never drew, which would swallow the
     first drag back to it. Whatever the caller is showing is the truth. */
  useEffect(() => {
    liveRef.current = enabled;
    liveSv.value = enabled;
    if (enabled) {
      notchSv.value = valueRef.current;
      committed.current = valueRef.current;
    }
  }, [enabled, liveSv, notchSv]);

  /** When the last impact was fired — see `MIN_TICK_MS`. */
  const lastTick = useRef(0);

  /* Reached once per study crossed, never per frame — the worklet below
     has already established that the notch changed. */
  const commit = useCallback((next: number) => {
    /* ★ The late arrival. A crossing can be queued on the UI thread and
       retired on the JS thread after the reader has moved to another tab;
       buzzing then is a vibration with nothing on screen to explain it. */
    if (!liveRef.current) return;
    committed.current = next;

    /* ★ The value moves FIRST and unconditionally: the throttle below is
       allowed to skip a buzz, never a redraw. Gating the state on the
       haptic clock is how a scrubber comes to stutter under a fast
       finger. */
    onChangeRef.current(next);

    const now = Date.now();
    if (now - lastTick.current < MIN_TICK_MS) return;
    lastTick.current = now;
    /* Heavy at the ends, Medium in between — the end-stop is what lets a
       finger find the first and the last study without looking. */
    const atEnd = next === 1 || next === totalRef.current;
    void Haptics.impactAsync(
      atEnd ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Medium,
    );
  }, []);

  /**
   * Finger x → the notch it is on, decided ON THE UI THREAD.
   *
   * This is the whole of v3.0.0: the early return for "still on the same
   * notch" now happens before the thread boundary, so a saturated JS
   * thread cannot accumulate a queue of pointer samples that each turn
   * out to have nothing to say. See the header.
   */
  const settle = useCallback(
    (x: number) => {
      'worklet';
      if (!liveSv.value) return;
      const w = trackW.value;
      const n = totalSv.value;
      if (w <= 0 || n <= 0) return;
      /* RTL is handled HERE rather than by reversing the layout: the
         notches are a timeline, and time runs left-to-right in Hebrew as
         it does everywhere else. What mirrors is which end the finger
         starts from, which is what a reader expects of a control. */
      const ratio = rtlSv.value ? 1 - x / w : x / w;
      const next = Math.max(1, Math.min(n, Math.ceil(ratio * n)));
      if (next === notchSv.value) return;
      notchSv.value = next;
      runOnJS(commit)(next);
    },
    [commit, liveSv, trackW, totalSv, rtlSv, notchSv],
  );

  /* ══ ⚠️ THE GESTURE OBJECT IS BUILT ONCE AND NEVER REBUILT ══
     Reported: the drag "sometimes just doesn't work, it's like it loses
     touch". It was not the touch handling — it was this component
     handing `GestureDetector` a NEW gesture object mid-drag.

     The chain: the caller passes `onChange` as an inline arrow, so it is
     a new function on every render; `move` was a `useCallback` on it, so
     that was new too; the gesture was a `useMemo` on it, so THAT was
     new — and every notch the finger crosses calls `onChange`, which
     re-renders the panel. So the detector was being reconfigured on
     every crossing, in the middle of the interaction it was tracking,
     and a reconfigured handler can drop the gesture it was in.

     `settle` closes over shared values and one permanent callback, so it
     keeps its identity whatever the caller does with its props —
     `enabled` included, which is why muting the control does not
     reconfigure the handler either. */
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
          .onStart((e) => settle(e.x))
          .onUpdate((e) => settle(e.x)),
        Gesture.Tap().onEnd((e) => settle(e.x)),
      ),
    [settle],
  );

  const partial = value < total;

  /* ══ ★ THE DETECTOR DOES NOT EXIST WHILE THE TAB IS HIDDEN ══
     Reported dead FOUR times on one route: drag it on Insights, go to
     Studies, come back, nothing. Each round named a real cause and shipped
     a correct fix — a gesture rebuilt mid-drag (v2.1.0), a width measured
     as zero (v2.2.0), a queue of pointer samples outliving the drag
     (v3.0.0), a detector remounted on return (v3.1.0) — and it came back
     every time.

     The answer was already in the same pane, working. `BeatSignature`'s
     caliper crosses the identical boundary and has never once been
     reported dead, and the reason is structural: its `gesture` memo
     returns `null` when it is off show and it renders the bare sheet, so
     while Insights is hidden there is NO `GestureDetector` in the tree at
     all (`BeatSignature.tsx` — `if (!gesture) return sheet`).

     This control was the only one keeping a LIVE detector inside a
     `display: none` subtree. History hides the pane, Fabric hides the
     native view and Yoga lays it out at zero, and an RNGH handler that is
     attached to a view in that state is being asked to survive something
     nothing else here asks of it. v3.1.0 came close but is not the same
     thing: the detector still existed throughout the hidden period and was
     only rebuilt AFTERWARDS, from a `useEffect` — a frame late, racing
     RNGH's own re-attach on the way back in.

     So the detector is now mounted by `enabled`, exactly as the caliper's
     is. Off show it is gone; on show it is constructed fresh in the SAME
     commit that reveals the pane, over a freshly-mounted track whose
     `onLayout` therefore reports a real, visible width. There is no state
     to carry across the boundary because there is nothing there to carry
     it — which is the one property the previous four fixes never had.

     ⚠️ This does NOT weaken "the gesture is built once". That rule forbids
     reconfiguring a handler DURING a drag; `enabled` can only change when
     the reader taps a tab, which cannot happen with a finger on the track.
     `gesture` itself is memoised on `settle` alone, so no re-render of the
     panel above can touch it. */
  const track = (
    <View
      accessibilityRole="adjustable"
      accessibilityLabel={caption}
      accessibilityValue={{ min: 1, max: total, now: value }}
      onLayout={(e) => {
            /* ★ A ZERO IS NEVER A MEASUREMENT, AND ACCEPTING ONE KILLS
               THE CONTROL. `move` refuses to act on a track of width 0
               (it cannot compute a ratio), so whatever writes 0 here
               silently disables dragging until some later layout pass
               happens to write a real number.
               Something does write 0: since v0.58.1 History keeps both
               tabs mounted and hides the inactive one with
               `display: none`, and Yoga lays a hidden subtree out at
               zero. So every trip to Studies used to blank this width,
               and coming back to Insights left the drag dead until the
               next layout — which is exactly the "it came back" report.
               The width of this track does not change while the panel
               lives, so the last real measurement is always the right
               one to keep. */
        const w = e.nativeEvent.layout.width;
        if (w > 0) trackW.value = w;
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
  );

  return (
    <View style={styles.root}>
      {/* ★ The detector is mounted BY `enabled` — see the note above. Off
          show it is absent from the tree entirely, so there is no attached
          native handler to be orphaned while the pane is hidden. */}
      {enabled ? <GestureDetector gesture={gesture}>{track}</GestureDetector> : track}

      <Pressable
        accessibilityRole={partial ? 'button' : 'text'}
        disabled={!partial}
        onPress={() => {
          /* Same weight as landing on the last notch, because that is
             exactly what this does — snapping back to the whole
             baseline should not feel lighter than reaching it by hand. */
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          notchSv.value = total;
          committed.current = total;
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

// v4.0.0 — ★ THE DETECTOR DOES NOT EXIST WHILE THE TAB IS HIDDEN, and this one
//          is not another candidate — it is the pattern that was already
//          working, ten files away. `BeatSignature`'s caliper crosses the exact
//          same hide/show boundary, is gated by the same `active` prop, and has
//          never been reported dead once; its gesture memo returns `null` off
//          show and it renders the bare sheet, so no `GestureDetector` exists in
//          the tree while Insights is hidden. This control was the ONLY one
//          keeping a live detector inside a `display: none` subtree — a native
//          view that Fabric hides and Yoga lays out at zero — which is exactly
//          the population of one that kept failing. It now mounts its detector
//          from `enabled` the same way, in the SAME commit that reveals the
//          pane, over a freshly-mounted track that measures a real width.
//          v3.1.0's `visitId` remount is removed: it rebuilt the detector one
//          effect-tick AFTER the return, racing RNGH's re-attach, and it left
//          the handler attached for the whole hidden period — the very thing
//          that had to stop.
// v3.1.0 — ★ NOTHING SURVIVES A TRIP OFF SHOW. Three rounds of fixes, three
//          real causes, and the drag came back dead after every one of them —
//          always on the same route (drag it, leave the tab, return). The
//          common factor is not a mechanism, it is that SOMETHING is carried
//          across the hide/show boundary in a state no check on this machine
//          can see. So coming back on show now remounts the detector with its
//          own gesture object: fresh native handler, fresh `onLayout`, nothing
//          inherited. It does not weaken "built once" — that rule forbids
//          reconfiguring DURING a drag, and `enabled` can only change when the
//          reader taps a tab, which cannot happen with a finger on the track.
// v3.0.0 — ⚠️ "I still feel the vibration from the Insights tab after I go back
//          to Studies, and then the drag doesn't work again." Neither half was
//          a touch problem, and the hidden tab was not stealing anything (a
//          `display: none` view is `hidden` in the native hierarchy and cannot
//          be hit-tested). It was a QUEUE. Every pointer sample crossed into
//          JS through `runOnJS` and only discovered there that the finger was
//          still on the same notch — 60–120 marshalled calls a second — while
//          the panel above re-fused the whole baseline on every render
//          (`useEcgIdentity` v1.2.0). The queue outlived the drag, so the buzz
//          arrived on a screen that had already changed, and the next drag
//          started behind a thread that was still catching up.
//          The crossing test now runs in the gesture worklet against shared
//          values: JS is entered ONCE PER NOTCH. And `enabled` mutes a late
//          arrival — a crossing retired after the host went off show is
//          dropped, not buzzed.
// v2.2.0 — ⚠️ The drag died again after v2.1.0, and the second cause was not
//          the gesture at all: `onLayout` accepted a width of ZERO. `move`
//          cannot compute a ratio without a width, so it returns — and since
//          History v0.58.1 keeps both tabs mounted and hides the inactive one
//          with `display: none`, Yoga lays the hidden subtree out at zero and
//          blanked this width on every trip to Studies. The track's width does
//          not change while the panel lives, so a zero is never a measurement
//          worth keeping.
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
