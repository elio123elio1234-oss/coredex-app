/* ==================================================================
   OverlayLayer (atom) — the host every sheet and dialog is presented in.

   ══════════════════════════════════════════════════════════════════
   ★ WHY THIS IS NOT `Modal`, AND WHY THAT WAS NOT A STYLE CHOICE
   ══════════════════════════════════════════════════════════════════
   Both of the first round's sheet complaints came from the same import.

   1. **The blur could never have worked.** React Native's `Modal` is a
      SEPARATE WINDOW on iOS (its own `UIViewController`) and a `Dialog`
      with its own `Window` on Android. `UIVisualEffectView` — what
      `expo-blur` wraps — samples the layer tree of ITS OWN window, and
      dimezis' `BlurView` snapshots ITS OWN decor view. Inside a Modal
      that content is empty, so both degrade to a flat translucent
      rectangle over black. Every "modern glass sheet" shipped in
      v0.17.0 was, on the device, exactly the grey rectangle it was
      written to replace. No amount of tint or radius could have fixed
      it: the material needs something behind it, and a Modal is
      defined by having nothing behind it.

   2. **It crashed the app in landscape.** `Modal` defaults to
      `supportedOrientations={['portrait']}`. Presenting one while the
      app is landscape makes UIKit raise
      `UIApplicationInvalidInterfaceOrientation` — an uncaught
      Objective-C exception, so the process DIES. Full screen is
      landscape, which is why tapping MARK there and dropping a marker
      took the whole app down. (`supportedOrientations` would have
      silenced the crash and left the grey rectangle. Only leaving
      `Modal` fixes both.)

   So overlays are rendered IN TREE: an absolutely-positioned layer
   inside the app's own hierarchy, above the page. The blur then samples
   the real page — which is the entire point — and there is no second
   window to disagree about orientation.

   ══════════════════════════════════════════════════════════════════
   ★ v0.83.0 — THE SHEET IS A THING YOU HOLD, NOT AN ANIMATION YOU WATCH
   ══════════════════════════════════════════════════════════════════
   Reported together, and they are ONE defect wearing two faces:

     "כל הסליידרים שעולים מלמטה למעלה עולים בריצוד ואין לי יכולת
      להחזיק את הפס למעלה ולהחליק לאט לאט — זה או נפתח או נסגר."

   The second half is the diagnosis of the first. **There was no
   gesture.** The grabber was a 36×5 rounded `View` — a PICTURE of a
   handle, drawn at the top of every sheet since v2.0.0, announcing an
   affordance the code never implemented. A finger on it did nothing, so
   the sheet could only ever be in one of two states, and the only thing
   between them was a 240 ms timeline playing at you. That is what "או
   נפתח או נסגר" means, and it is also why the rise was JUDGED so
   harshly: an animation you cannot interrupt is the only thing on
   screen, so every dropped frame in it is the whole experience.

   A sheet on any current platform tracks the finger CONTINUOUSLY.
   Sixty per cent of the way down and released, it falls; flicked, it
   goes with the flick; dragged and held, it sits exactly where it is
   put. None of that is decoration — it is what makes the panel read as
   an object with a position rather than a slide with a duration.

   So the drag is the headline change, and three structural fixes to the
   rise ride along with it, each one a thing that was measurably wrong:

   ── 1. Reanimated, not `Animated` ──
   A gesture-driven sheet CANNOT be built on `Animated.Value` + React
   state: the finger's position would take a JS round trip per frame.
   The whole presentation therefore moves to a Reanimated shared value,
   where the gesture handler and the animation write to the SAME value
   on the UI thread. The drag has no JS in it at all.

   ── 2. ★ THE PANEL TRAVELS ITS OWN HEIGHT, NOT THE WINDOW'S ──
   `translateY` interpolated `[height, 0]` — the whole WINDOW's height.
   A 380 pt sheet on an 844 pt phone was therefore flung 844 pt in
   240 ms (3.5 pt/ms) to cover 380 pt of visible distance. Two costs:
   the visible part of the rise is far too fast to read as an arrival,
   and for most of those frames a full-width LIQUID GLASS surface is
   being composited off screen for nothing.

   That was correct when it was written — the comment said so: the
   window's height guarantees the panel starts off screen "so no layout
   pass is needed before it can animate". ★ But v1.2.0 then made the
   rise WAIT FOR LAYOUT for an unrelated reason, and the justification
   quietly expired. The measurement is now in hand before the animation
   starts, so the panel moves exactly as far as it has to.

   ── 3. ★ THE ANIMATION NO LONGER STARTS INSIDE A REACT RENDER ──
   The layout gate was `setReady(true)` — React state. So the frame the
   rise began was also a render of this component, a re-publish into
   `OverlayPortal`, and a re-render of the portal host. v1.2.0 moved the
   view-creation cost off the first frame and then put a reconciliation
   pass back on it. The gate is now a ref, and `onLayout` starts the
   animation by writing to a shared value: zero renders, zero publishes,
   nothing for the UI thread to share that frame with.

   ⚠️ The durations are NOT the fix and were not the bug. v0.18.1
   shortened them on that assumption and was told plainly: "it's not the
   speed, it just isn't smooth." `IN_MS` goes up here only because the
   DISTANCE went down — same perceived speed over a shorter travel.

   ── WHAT THIS FILE OWNS ──
     • Mount / unmount around the animation, so a closed sheet costs
       nothing and a closing one is still visible while it leaves.
     • The dim, tappable scrim — which now follows the finger too.
     • The drag itself, published through `SheetDragContext` for the
       panel's own handle to attach to (see `BottomSheet`).
     • Android's hardware back button (what `onRequestClose` used to do).
     • The keyboard. A bottom-anchored sheet in tree is NOT lifted by the
       OS, so this measures the keyboard and rides above it. That is why
       callers no longer need `KeyboardAvoidingView`, which does not work
       reliably inside an absolutely-positioned host anyway.

   ══════════════════════════════════════════════════════════════════
   ★ THE SCRIM IS A DIM, NOT A BLUR — AND THAT IS A PERFORMANCE FIX
   ══════════════════════════════════════════════════════════════════
   v0.18.0 blurred the scrim as well as the panel. Reported as "slow, and
   it flickers a bit when it opens", which is exactly what that costs:

     • **Two full-screen blurs stacked.** The panel's own `GlassSurface`
       samples what is behind it — which was a second blur sampling the
       page. Android's `dimezisBlurView` is experimental and snapshots a
       view tree per frame; two of them is visibly janky.
     • **Animating a blur's opacity is the expensive case.** A
       `UIVisualEffectView` re-renders its effect whenever its opacity
       changes, so fading one in re-computes a full-screen blur every
       frame of the animation. That is the flicker, precisely.

   So the scrim is a plain animated colour — free to fade, UI thread, no
   effect to re-compute — and the PANEL keeps the blur, sampling the page
   straight through the dim. Which is also what the platform itself does:
   an iOS sheet dims its backdrop and reserves the material for the
   sheet. Nothing was lost; a blur was moved.

   ══════════════════════════════════════════════════════════════════
   ★ AND IT IS RENDERED AT THE APP ROOT, NOT WHERE IT IS WRITTEN
   ══════════════════════════════════════════════════════════════════
   "In tree" above means "in the same WINDOW" — it never had to mean "in
   the screen's own subtree", and that difference cost a release. The
   floating dock is the tab navigator's `tabBar`: a sibling of the
   screen, painted after it. Nothing a screen renders can go above it,
   because `zIndex` orders siblings within one parent and these have
   different parents. So a bottom-anchored sheet's pinned footer landed
   underneath the dock, the scrim did not dim it, and it stayed tappable
   through the modal. `OverlayPortal` moves the elements to the root —
   same window, so the material still samples the real page, and inside
   `GestureHandlerRootView`, so the drag above works from there.

   Callers own their own panel: this positions and animates it only.
   ================================================================== */

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  BackHandler,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { Gesture, type PanGesture } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useOverlayPortal } from '@/components/atoms/OverlayPortal';
import { useIsDark } from '@/theme/useTheme';

/* Rising is slower than leaving — a sheet should arrive, not appear.
   ⚠️ These are NOT where the reported judder came from, and reaching for them
   is a known dead end: v0.18.1 shortened them on that assumption and was told
   plainly it made no difference — "it's not the speed, it just isn't smooth."
   `IN_MS` rose from 240 in v0.83.0 for one reason only: the panel now travels
   its OWN height instead of the window's, so the same number would have read
   as roughly twice as fast. Same perceived speed, shorter distance. */
const IN_MS = 330;
const OUT_MS = 210;

/** Released below this share of the way open → it falls rather than returns. */
const DISMISS_AT = 0.62;
/** Downward px/s that dismisses from ANY position. A flick is an intention. */
const FLING_CLOSE = 750;
/** Upward px/s that re-opens from any position, for the same reason. */
const FLING_OPEN = -420;

/** Snapping back is a spring, because it is answering a finger. */
const SNAP = {
  damping: 26,
  stiffness: 320,
  mass: 0.85,
  /* ⚠️ Load-bearing. The panel is anchored to the bottom EDGE, so an
     overshoot past "open" is negative translateY — it lifts the sheet off
     the bottom of the screen and shows a strip of page underneath it. */
  overshootClamping: true,
} as const;

interface Props {
  visible: boolean;
  /** Scrim tap, Android back, drag-to-dismiss. Callers treat it as "cancel". */
  onRequestClose: () => void;
  /** Accessible name for the scrim. */
  closeLabel: string;
  /** `slide` anchors to the bottom edge and can be dragged; `fade` centres. */
  enter: 'slide' | 'fade';
  /**
   * The panel. As a FUNCTION it is handed this sheet's drag gesture, for its
   * own handle to attach a `GestureDetector` to; `null` for `enter="fade"`,
   * because a centred dialog has no edge to be dragged to.
   *
   * ── WHY A RENDER PROP AND NOT A CONTEXT ──
   * A context was written first and was WRONG in a way that compiles and
   * runs: the provider lives inside this component, so `BottomSheet` — which
   * renders `<OverlayLayer>` — would have read it from ABOVE its own
   * provider and got the default. `null`. A handle that silently does not
   * drag, which is precisely the bug being fixed. Passing it down the one
   * edge that exists cannot be positioned wrongly.
   *
   * ★ WHY THE HANDLE AND NOT THE WHOLE PANEL. Most sheets here put a
   * `ScrollView` directly inside the panel. A pan over the whole surface
   * races every one of them for the same vertical finger, and the
   * arbitration has to be wired at BOTH ends (`simultaneousWithExternalGesture`
   * needs the scroll view's ref) — twelve callers, for a gesture the user
   * described by its handle: "להחזיק את הפס". It is also where the platform
   * itself puts the drag once the content scrolls.
   */
  children: ReactNode | ((drag: PanGesture | null) => ReactNode);
}

export default function OverlayLayer({
  visible,
  onRequestClose,
  closeLabel,
  enter,
  children,
}: Props) {
  const dark = useIsDark();
  const { height } = useWindowDimensions();
  const [mounted, setMounted] = useState(visible);
  const [keyboard, setKeyboard] = useState(0);
  const slide = enter === 'slide';

  /** 0 = off screen, 1 = at rest. Written by the animation AND by the finger. */
  const progress = useSharedValue(visible ? 1 : 0);
  /** How far off screen "0" is: the panel's own measured height.
      Seeded from the window so the first frame is off screen whatever the
      panel turns out to measure — a sheet that flashes at its rest position
      for one frame is worse than one that rises slightly too far. */
  const travel = useSharedValue(height);
  /** Where the finger took hold, so a drag resumes mid-animation. */
  const grabbed = useSharedValue(0);

  /* ★ A REF, NOT STATE. This is the layout gate, and it used to be
     `setReady(true)` — which put a render of this component, a re-publish
     into the portal and a re-render of the portal host on the exact frame
     the rise began. See the header. */
  const opened = useRef(visible);

  /* Live ref, so subscribing to the back button does not re-subscribe on
     every parent render just because the callback is a fresh arrow. Same
     lesson as the drag handles: a prop in a dependency array is a rebuild. */
  const close = useRef(onRequestClose);
  close.current = onRequestClose;

  const startOpen = useCallback(() => {
    progress.value = withTiming(1, {
      duration: IN_MS,
      /* A long, soft tail. `Easing.out(Easing.cubic)` was fine over the old
         (wrong) distance; over the real one it stops too abruptly. */
      easing: Easing.bezier(0.22, 1, 0.36, 1),
    });
  }, [progress]);

  /** The leaving animation finished on its own — nothing left to show. */
  const afterClose = useCallback(() => {
    opened.current = false;
    setMounted(false);
  }, []);

  /** The FINGER closed it: unmount, and tell the owner its sheet is gone. */
  const afterDragClose = useCallback(() => {
    opened.current = false;
    setMounted(false);
    close.current();
  }, []);

  /* ★ `visible && !mounted`, not just `visible`. A drag-dismiss unmounts
     BEFORE the owner has flipped `visible`, and an owner is entitled to
     refuse — a sheet with unsaved work, say. Keyed on `visible` alone, that
     sheet would be unmounted with `visible` still true and no edge left to
     re-trigger on: invisible forever. The invariant is "visible implies
     mounted", and this restates it after every render. */
  useEffect(() => {
    if (visible && !mounted) setMounted(true);
  }, [visible, mounted]);

  /* Leaving. Opening is NOT here — it is started by `onContentLayout`, off
     the React render path entirely. */
  useEffect(() => {
    if (!mounted || visible) return;
    progress.value = withTiming(
      0,
      { duration: OUT_MS, easing: Easing.in(Easing.cubic) },
      (finished) => {
        'worklet';
        // Only unmount when the LEAVING animation actually finished — an
        // interrupted one means it is being reopened.
        if (finished) runOnJS(afterClose)();
      },
    );
  }, [visible, mounted, progress, afterClose]);

  /* Belt and braces. `onLayout` on a panel that always has a grabber cannot
     realistically fail to fire — but if it ever did the sheet would never
     rise at all, and a stuck-invisible modal is a dead app. Late is
     recoverable; never is not. The panel then travels the seeded window
     height, which is too far but visible, rather than not moving. */
  useEffect(() => {
    if (!mounted || !visible || opened.current) return;
    const timer = setTimeout(() => {
      if (opened.current) return;
      opened.current = true;
      startOpen();
    }, 140);
    return () => clearTimeout(timer);
  }, [mounted, visible, startOpen]);

  const onContentLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const h = e.nativeEvent.layout.height;
      /* ★ Set on the FIRST measure, and afterwards only ever GROWN. This is
         the hazard the change introduces and it has to be closed here: the
         panel is content-driven, and `ActionSheet` and `CompareSheet` put an
         unbounded `ScrollView` inside it (see BottomSheet's `scrollable`
         note). If such a panel measures 300 pt and then commits to 600, a
         travel frozen at 300 leaves it HALF ON SCREEN at progress 0 — it
         would pop into view and then rise, which is worse than the judder.
         Monotonic growth can only ever push it further off screen, which is
         invisible by definition; the timing lands on 1 regardless. */
      if (h > 0 && (!opened.current || h > travel.value)) travel.value = h;
      if (!opened.current && visible) {
        opened.current = true;
        startOpen();
      }
    },
    [visible, startOpen, travel, progress],
  );

  /* Android's back button used to be `Modal.onRequestClose`. Without it the
     first thing an Android user tries leaves the app instead of the sheet. */
  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      close.current();
      return true;
    });
    return () => sub.remove();
  }, [visible]);

  /* The keyboard. `willChangeFrame` on iOS so the sheet moves WITH it rather
     than after it; Android has no will* events and reports height on show. */
  useEffect(() => {
    if (!slide) return;
    const ios = Platform.OS === 'ios';
    const shown = Keyboard.addListener(ios ? 'keyboardWillChangeFrame' : 'keyboardDidShow', (e) =>
      setKeyboard(e.endCoordinates.height),
    );
    const hidden = Keyboard.addListener(ios ? 'keyboardWillHide' : 'keyboardDidHide', () =>
      setKeyboard(0),
    );
    return () => {
      shown.remove();
      hidden.remove();
    };
  }, [slide]);

  /* ★ Built ONCE. A `Gesture` object rebuilt every render detaches and
     re-attaches its native handler — mid-drag, that is a dropped finger.
     Every dependency here is either a shared value (stable ref) or a
     `useCallback` with no deps, so the memo genuinely never invalidates. */
  const drag = useMemo(
    () =>
      Gesture.Pan()
        .enabled(slide)
        /* Vertical only, and not until the finger has committed 6 pt. Below
           that a touch on the handle is still a TAP, which matters because
           the title sits inside the same draggable band. */
        .activeOffsetY([-6, 6])
        .failOffsetX([-20, 20])
        .onStart(() => {
          /* Reading the live value is what makes a drag able to CATCH a
             sheet that is still rising, instead of snapping it to 1 first. */
          grabbed.value = progress.value;
        })
        .onUpdate((e) => {
          const t = travel.value || 1;
          const next = grabbed.value - e.translationY / t;
          /* Clamped at 1 rather than rubber-banded. Past "open" there is
             nothing above to reveal and a gap opens under the panel. */
          progress.value = next > 1 ? 1 : next < 0 ? 0 : next;
        })
        .onEnd((e) => {
          const flungDown = e.velocityY > FLING_CLOSE;
          const flungUp = e.velocityY < FLING_OPEN;
          /* Position decides only when the finger did not. A slow drag to
             70 % and release comes back; the same position released with a
             downward flick goes. */
          if (flungDown || (!flungUp && progress.value < DISMISS_AT)) {
            progress.value = withTiming(
              0,
              { duration: OUT_MS, easing: Easing.out(Easing.quad) },
              (finished) => {
                'worklet';
                if (finished) runOnJS(afterDragClose)();
              },
            );
            return;
          }
          progress.value = withSpring(1, {
            ...SNAP,
            /* The spring inherits the finger's motion, in the value's own
               units: translateY = (1 − p) · travel, so dp/dt = −vY / travel.
               Without this the snap-back starts from rest and the release
               reads as a cut. */
            velocity: -e.velocityY / (travel.value || 1),
          });
        }),
    [slide, progress, travel, grabbed, afterDragClose],
  );

  const scrimStyle = useAnimatedStyle(() => ({ opacity: progress.value }));
  /* The panel is dragged, so this is the one that must be cheap: a single
     transform, no opacity (fading a Liquid Glass surface re-computes the
     material every frame — the v1.1.0 lesson, which applies to the panel
     exactly as it did to the scrim). */
  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - progress.value) * travel.value }],
  }));
  const dialogStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: 0.94 + 0.06 * progress.value }],
  }));

  const overlay = !mounted ? null : (
    <View
      style={[styles.host, slide ? styles.hostBottom : styles.hostCentre]}
      pointerEvents="box-none"
    >
      {/* A plain colour: free to fade on the UI thread, and it gives the
          panel's own blur the contrast it needs over a white page. Driven by
          the same value as the panel, so dragging the sheet down lifts the
          dim with it — which is the thing that makes the page behind feel
          like it is coming back rather than waiting. */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: dark ? 'rgba(0,0,0,0.46)' : 'rgba(15,23,42,0.30)' },
          scrimStyle,
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={closeLabel}
          onPress={onRequestClose}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <Animated.View
        pointerEvents="box-none"
        onLayout={onContentLayout}
        style={[slide && { marginBottom: keyboard }, slide ? panelStyle : dialogStyle]}
      >
        {typeof children === 'function' ? children(slide ? drag : null) : children}
      </Animated.View>
    </View>
  );

  /* Rendered at the app root when a host is mounted — the only way to be
     above the dock, which is the navigator's tab bar and therefore a
     sibling of the screen this was written in. Falls back to rendering
     in place, so an overlay used outside the app shell still appears. */
  const hosted = useOverlayPortal(overlay);
  return hosted ? null : overlay;
}

const styles = StyleSheet.create({
  host: {
    ...StyleSheet.absoluteFillObject,
    /* Above the viewer's glass header (zIndex 20). Android orders by
       elevation rather than zIndex, so both are set. */
    zIndex: 100,
    elevation: 100,
  },
  hostBottom: { justifyContent: 'flex-end' },
  hostCentre: { justifyContent: 'center', paddingHorizontal: 26 },
});

// v2.0.0 — ★ THE SHEET CAN BE HELD. The grabber was a PICTURE of a handle —
//          drawn since v2.0.0 of BottomSheet, wired to nothing — so a sheet
//          had exactly two states and a timeline between them: "או נפתח או
//          נסגר". A real pan now drives the same value the animation does, on
//          the UI thread, published through `SheetDragContext` for the panel's
//          handle; release decides by position AND velocity, and the scrim
//          follows the finger. Three structural fixes ride along:
//          - Reanimated replaces `Animated`. A finger cannot take a JS round
//            trip per frame, so a gesture-driven sheet cannot be built on
//            `Animated.Value` + state at all.
//          - ★ The panel travels ITS OWN height, not the window's. A 380 pt
//            sheet was flung 844 pt in 240 ms to cover 380 pt of visible
//            distance, compositing a full-width Liquid Glass surface off
//            screen for most of them. The window height was right when it was
//            written — and v1.2.0's layout gate silently expired the reason.
//          - ★ The layout gate is a REF. As state it rendered this component,
//            re-published into the portal and re-rendered the portal host on
//            the very frame the rise began: v1.2.0 moved the view-creation
//            cost off that frame and put reconciliation back on it.
//          ⚠️ IN_MS 240 → 330 is NOT a smoothness fix (v0.18.1 tried that and
//          was corrected). It is the same perceived speed over half the
//          distance.
// v1.2.0 — Two fixes, both about WHERE and WHEN, not about looks.
//          - Portalled to the app root. A screen cannot paint above the dock:
//            the dock is the navigator's tab bar, a sibling of the screen. So a
//            pinned footer sat under it, the scrim never dimmed it, and it
//            stayed tappable through a modal. Same window, so the blur is
//            unaffected; only the parent changes.
//          - The rise waits for the content's first layout. Starting it on
//            mount put the animation on the same UI thread that was still
//            creating a hundred-odd views, which is what "it comes up in
//            frames" was. The native driver does not help: it is what puts the
//            animation on the busy thread.
// v1.1.0 — The scrim is a plain dim, not a second full-screen blur. Two stacked
//          blurs, one of them with an ANIMATED opacity (which makes a
//          UIVisualEffectView re-compute every frame), is what "slow, and it
//          flickers when it opens" was. The panel keeps the material.

// v1.0.0 — Overlays are presented IN TREE, not in a Modal: a Modal is its own
//          window, so its blur has nothing to sample (the grey rectangle) and
//          its portrait-only default crashes the app in landscape.
