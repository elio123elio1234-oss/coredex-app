/* ==================================================================
   OverlayLayer (atom) — the host every sheet and dialog is presented in.

   ══════════════════════════════════════════════════════════════════
   ★ WHY THIS IS NOT `Modal`, AND WHY THAT WAS NOT A STYLE CHOICE
   ══════════════════════════════════════════════════════════════════
   Both of the last round's sheet complaints came from the same import.

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
   inside the screen's own hierarchy, above its content. The blur then
   samples the real page — which is the entire point — and there is no
   second window to disagree about orientation.

   ── WHAT THIS FILE OWNS ──
     • Mount / unmount around the animation, so a closed sheet costs
       nothing and an closing one is still visible while it leaves.
     • The blurred, tappable scrim.
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

   So the scrim is a plain animated colour — free to fade, native
   driver, no effect to re-compute — and the PANEL keeps the blur,
   sampling the page straight through the dim. Which is also what the
   platform itself does: an iOS sheet dims its backdrop and reserves the
   material for the sheet. Nothing was lost; a blur was moved.

   Callers own their own panel: this positions and animates it only.
   ================================================================== */

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  BackHandler,
  Easing,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useIsDark } from '@/theme/useTheme';

/** Rising is slower than leaving — a sheet should arrive, not appear. Both are
    short: this was 260/170 and read as "slow" on the device, and a modal that
    keeps you waiting is one you notice instead of one you use. */
const IN_MS = 210;
const OUT_MS = 140;

interface Props {
  visible: boolean;
  /** Scrim tap, Android back. Callers should treat it as "cancel". */
  onRequestClose: () => void;
  /** Accessible name for the scrim. */
  closeLabel: string;
  /** `slide` anchors to the bottom edge; `fade` centres and scales. */
  enter: 'slide' | 'fade';
  children: ReactNode;
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
  const progress = useRef(new Animated.Value(visible ? 1 : 0)).current;

  /* Live ref, so subscribing to the back button does not re-subscribe on
     every parent render just because the callback is a fresh arrow. Same
     lesson as the drag handles: a prop in a dependency array is a rebuild. */
  const close = useRef(onRequestClose);
  close.current = onRequestClose;

  useEffect(() => {
    if (visible) setMounted(true);
    const animation = Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      duration: visible ? IN_MS : OUT_MS,
      easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start(({ finished }) => {
      // Only unmount when the LEAVING animation actually finished — an
      // interrupted one means it is being reopened.
      if (finished && !visible) setMounted(false);
    });
    return () => animation.stop();
  }, [visible, progress]);

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
    if (enter !== 'slide') return;
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
  }, [enter]);

  const slide = enter === 'slide';

  /* Built once per window height, not per render: an interpolation is a NATIVE
     animated node, and re-creating it inline every render would detach and
     re-attach it on the UI thread mid-gesture — exactly the mistake the drag
     handles already paid for. */
  const translateY = useMemo(
    // The window's own height guarantees the panel starts off screen whatever
    // it measures, so no layout pass is needed before it can animate.
    () => progress.interpolate({ inputRange: [0, 1], outputRange: [height, 0] }),
    [progress, height],
  );
  const scale = useMemo(
    () => progress.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }),
    [progress],
  );

  if (!mounted) return null;

  return (
    <View
      style={[styles.host, slide ? styles.hostBottom : styles.hostCentre]}
      pointerEvents="box-none"
    >
      {/* A plain colour: free to fade on the native driver, and it gives the
          panel's own blur the contrast it needs over a white page. */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { opacity: progress, backgroundColor: dark ? 'rgba(0,0,0,0.46)' : 'rgba(15,23,42,0.30)' },
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
        style={[
          slide && { marginBottom: keyboard },
          {
            opacity: slide ? 1 : progress,
            transform: slide ? [{ translateY }] : [{ scale }],
          },
        ]}
      >
        {children}
      </Animated.View>
    </View>
  );
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

// v1.1.0 — The scrim is a plain dim, not a second full-screen blur. Two stacked
//          blurs, one of them with an ANIMATED opacity (which makes a
//          UIVisualEffectView re-compute every frame), is what "slow, and it
//          flickers when it opens" was. The panel keeps the material.

// v1.0.0 — Overlays are presented IN TREE, not in a Modal: a Modal is its own
//          window, so its blur has nothing to sample (the grey rectangle) and
//          its portrait-only default crashes the app in landscape.
