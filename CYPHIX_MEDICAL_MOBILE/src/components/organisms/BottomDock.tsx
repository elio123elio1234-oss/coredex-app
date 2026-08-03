/* ==================================================================
   BottomDock (organism) — the floating bottom navigation, ported from the
   web BottomDock + the `.bottom-dock` / `.dock-pill` / `.dock-item` rules
   in layout.css, and then dressed the way iOS 26 dresses its OWN tab bar.

   Every size and offset lives in `dockMetrics.ts`, next to the CSS lines
   it came from — including WHY two of them deliberately differ from a
   literal copy. Nothing here is a guessed number.

   Carried over from the web: a single sliding highlight on the pill's
   overshoot curve, icons that fill in with their inner details cut out in
   the pill colour, and a Home that stays navy even when unselected.

   ── ★ WHAT MAKES IT FEEL NATIVE, NOT PORTED (v0.24.0) ──
   Glass on iOS is not a LOOK, it is a MATERIAL THAT ANSWERS YOUR FINGER:

   1. **The highlight follows the finger.** Touch down on any tab and the
      pill travels there immediately; release commits the navigation,
      slide off and it springs home. The lit icon follows the PILL rather
      than the navigator (`lit`, not `selected`), which is also what keeps
      the filled icon's cut-out details on the colour they are cut out
      against — see `PILL` below.
   2. **Hold and the glass grows.** Touch → the pill swells slightly;
      keep holding past `HOLD_MS` → it swells further with a heavier
      haptic, and the icon and label grow with it. That is the "press and
      the glass gets bigger" of a system tab bar, and it is done here in
      Reanimated so ANDROID GETS IT TOO — the material differs per
      platform, the gesture does not.

   ── ★ WHY THE PILL IS OPAQUE (v0.24.1 — this cost a release) ──
   The pill used to be a TRANSLUCENT white (0.85 / 0.16). It was never
   visible in its own right; it was visible *because it was brighter than
   the bar*. So the moment v0.24.0 made the bar glassier — tint 55 % → 32 %
   for a more system-like material — the pill had nothing left to be
   brighter than and **the current tab stopped being marked at all**. The
   dock's own dressing quietly destroyed the one thing it exists to show.

   `PILL` is therefore a SOLID colour, and it is THE SAME CONSTANT the
   active icon's inner details are cut out in. Those two were always
   required to match — the cut-outs sit directly on the pill — and while
   they were merely *similar* (a translucent pill against a fixed cut-out
   colour) they drifted apart with every change to the bar behind them.
   Now they cannot: an indicator may not depend on the material it is on.

   ── ★ AND WHY THERE IS NO `isInteractive` HERE ANY MORE ──
   v0.24.0 put Apple's `UIGlassEffect.isInteractive` on the BAR. On the
   iPhone the result was reported as not looking like glass at all. It is
   the one prop that was flagged as unverifiable from Windows, and it is
   the one applied against its grain — Apple's interactive glass is for a
   control the size of a button, inside a glass container, not for a
   whole bar. It is out. The hold-and-swell above is Reanimated and does
   not depend on it.
   ⚠️ Two causes of "it doesn't look like glass" are NOT in this file:
   the phone may simply have no Liquid Glass (Settings › About now names
   the material that resolved), and **a material needs something behind
   it** — the dock floats over a soft flat backdrop, and glass with
   nothing to refract renders as a plain translucent plate no matter what
   is set here. Same lesson as the blur inside a `Modal` (v0.18.0).

   ── ★ WHY THE PILL IS NOT ITSELF A `GlassView` ──
   Tempting, and wrong. `UIGlassContainerEffect` MERGES glass elements
   that are near each other into one continuous shape — that is the whole
   point of the container — so a glass pill sitting inside a glass bar
   would dissolve into the bar and the selection indicator would simply
   stop existing. Apple's own tab bar does the same thing this does: one
   glass bar, and a solid-ish capsule riding on it.

   Non-obvious: the swell is safe against the bar's `overflow: hidden`.
   At `HOLD_SWELL` the pill grows to 60.0 pt inside a 65.1 pt inner box,
   and horizontally to ~4.5 pt short of the rounded cap on the outermost
   tabs. It presses against the container without being cut by it.
   ================================================================== */

import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import GlassSurface, { IS_LIQUID_GLASS } from '@/components/atoms/GlassSurface';
import DockItem from '@/components/molecules/DockItem';
import { useTranslation } from '@/i18n/useTranslation';
import { DOCK_ITEMS } from '@/navigation/dockConfig';
import {
  BAR_PADDING,
  DOCK_ITEM_HEIGHT,
  dockBottomOffset,
  dockGap,
  MAX_BAR_W,
  MIN_ITEM_W,
} from '@/navigation/dockMetrics';
import { useIsDark, useTheme } from '@/theme/useTheme';

/** The web's pill easing: cubic-bezier(.34, 1.28, .5, 1) — a gentle overshoot. */
const SLIDE_SPRING = { damping: 15, stiffness: 180, mass: 0.85 } as const;

/** Tighter and lighter than the slide: a swell that lags the finger reads
    as lag, not as weight. The low damping is the liquid bounce on release. */
const SWELL_SPRING = { damping: 13, stiffness: 230, mass: 0.7 } as const;

/** Scale added on touch-down — an acknowledgement, not an event. */
const TAP_SWELL = 0.05;
/** …and on a sustained hold. This is the one the user asked for: it must be
    unmistakable while still fitting inside the bar (see the header). */
const HOLD_SWELL = 0.13;

/**
 * How long a touch must stay down before the glass grows to `HOLD_SWELL`.
 *
 * Not `delayLongPress` (default 500 ms): that is a threshold for a DIFFERENT
 * gesture — long-press menus — and it is far too slow to read as the surface
 * reacting to being held. 220 ms is past the ~150 ms where a deliberate hold
 * separates from a tap, and short enough that the growth still feels caused
 * by the finger rather than announced after it.
 */
const HOLD_MS = 220;

/**
 * How long the finger-following preview outlives the release.
 *
 * A release runs `onPressOut` and then `onPress`, and the navigator's index
 * lands a render later. Clearing the preview in `onPressOut` therefore snaps
 * the pill back to the OLD tab for one frame before it slides to the new one.
 * Waiting instead means that by the time the preview clears, the navigator
 * agrees with it and clearing is invisible. On a cancelled press — finger slid
 * off the bar, no `onPress` — this is simply how long the pill waits before
 * springing home, which reads as deliberate rather than twitchy.
 */
const RELEASE_SETTLE_MS = 140;

export default function BottomDock({ state, navigation }: BottomTabBarProps) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const dark = useIsDark();

  const itemH = DOCK_ITEM_HEIGHT;
  const gap = dockGap(screenW);
  const available = Math.min(screenW - 24, MAX_BAR_W) - BAR_PADDING * 2 - gap * (DOCK_ITEMS.length - 1);
  const itemW = Math.max(MIN_ITEM_W, available / DOCK_ITEMS.length);
  const step = itemW + gap;

  /* The tab under the finger, or null. Drives the highlight — NOT the
     navigation, which only happens on release. */
  const [pressedIndex, setPressedIndex] = useState<number | null>(null);
  const [held, setHeld] = useState(false);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    if (settleTimer.current) clearTimeout(settleTimer.current);
    holdTimer.current = null;
    settleTimer.current = null;
  }, []);
  /* A dock can unmount mid-press (sign-out from Profile does exactly that),
     and a timer that fires afterwards sets state on a dead component. */
  useEffect(() => clearTimers, [clearTimers]);

  const handlePressIn = useCallback(
    (i: number) => {
      clearTimers();
      setPressedIndex(i);
      setHeld(false);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      holdTimer.current = setTimeout(() => {
        holdTimer.current = null;
        setHeld(true);
        /* Heavier than the touch-down tap, because it marks a different
           thing: the surface has taken hold of the finger, not just felt it. */
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }, HOLD_MS);
    },
    [clearTimers],
  );

  const handlePressOut = useCallback(() => {
    clearTimers();
    setHeld(false);
    settleTimer.current = setTimeout(() => {
      settleTimer.current = null;
      setPressedIndex(null);
    }, RELEASE_SETTLE_MS);
  }, [clearTimers]);

  const handlePress = useCallback(
    (i: number) => {
      if (state.index !== i) navigation.navigate(state.routes[i].name);
    },
    [navigation, state.index, state.routes],
  );

  /* Where the highlight is: the finger while there is one, the navigator
     otherwise. Everything visual reads from this and not from state.index. */
  const lit = pressedIndex ?? state.index;

  const x = useSharedValue(lit * step);
  const swell = useSharedValue(0);
  useEffect(() => {
    x.value = withSpring(lit * step, SLIDE_SPRING);
  }, [lit, step, x]);
  useEffect(() => {
    swell.value = withSpring(
      held ? HOLD_SWELL : pressedIndex !== null ? TAP_SWELL : 0,
      SWELL_SPRING,
    );
  }, [held, pressedIndex, swell]);

  /* translateX first, scale second: the pill grows about its OWN centre
     wherever it currently sits, rather than about the bar's left edge. */
  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { scale: 1 + swell.value }],
  }));

  /* ★ ONE colour for the pill AND for the cut-outs in the icon sitting on it.
     Solid, so the indicator survives any change to the material behind it —
     see the header for the release where it did not. */
  const PILL = dark ? '#33415A' : t.surface;

  /* The tint's ONLY remaining job is contrast for the UNSELECTED labels, which
     have nothing but the material under them; the selected tab is carried by
     the opaque pill and no longer needs the bar to be pale. So it can be
     glassier than the web's milky 55 % plate — which is what made the bar read
     as white plastic — without putting anything at risk.
     iOS 26 gets less of it because Apple's material is doing real work; the
     BlurView fallback keeps more, because an untinted blur over a light page
     really is nearly invisible (the v0.19.2 trap). */
  const tint = IS_LIQUID_GLASS
    ? dark
      ? 'rgba(19,27,44,0.34)'
      : 'rgba(255,255,255,0.38)'
    : dark
      ? 'rgba(19,27,44,0.44)'
      : 'rgba(255,255,255,0.55)';

  return (
    <View
      style={[styles.shell, { bottom: dockBottomOffset(insets.bottom, screenH) }]}
      pointerEvents="box-none"
    >
      <GlassSurface
        dark={dark}
        tint={tint}
        style={[
          styles.bar,
          {
            padding: BAR_PADDING,
            gap,
            /* v0.24.0 made this `transparent` on iOS, on the theory that the
               material lights its own edge. Over a pale flat backdrop it does
               not do so anything like strongly enough, and a floating object
               with no edge stops reading as an object. The rim is back on both
               materials, softer on the glass one. */
            borderColor: IS_LIQUID_GLASS
              ? dark
                ? 'rgba(255,255,255,0.10)'
                : 'rgba(255,255,255,0.45)'
              : dark
                ? 'rgba(255,255,255,0.14)'
                : 'rgba(200,208,224,0.55)',
          },
        ]}
      >
        <Animated.View
          style={[
            styles.pill,
            pillStyle,
            {
              left: BAR_PADDING,
              top: BAR_PADDING,
              width: itemW,
              height: itemH,
              backgroundColor: PILL,
              /* A raised puck, the way a system segmented control's selection
                 is: its own edge and its own small shadow, so it is a thing
                 ON the bar rather than a lighter patch OF it. */
              borderColor: dark ? 'rgba(255,255,255,0.16)' : 'rgba(10,37,64,0.08)',
              shadowOpacity: dark ? 0.3 : 0.12,
            },
          ]}
          pointerEvents="none"
        />

        {/* ★ The dock is NOT reversed under an RTL language. Home is the
            centre anchor and the other four sit symmetrically around it, so
            mirroring would move nothing meaningful — while the sliding pill's
            offset is `lit * step`, which is indexed off `state.routes`.
            Reversing one and not the other lights the wrong tab. Recorded in
            PARITY.md. */}
        {DOCK_ITEMS.map((item, i) => (
          <DockItem
            key={item.name}
            index={i}
            item={item}
            label={tr(item.labelKey)}
            width={itemW}
            height={itemH}
            lit={lit === i}
            selected={state.index === i}
            held={held && pressedIndex === i}
            /* .dock-item--home:not(.is-active) { color: var(--brand-navy) } */
            color={lit === i ? t.textPrimary : item.emphasized ? t.brandNavy : t.textSecondary}
            cutout={PILL}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            onPress={handlePress}
          />
        ))}
      </GlassSurface>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    overflow: 'hidden',
    // --shadow-lg under the glass pill.
    shadowColor: '#0A2540',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  pill: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#0A2540',
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
});

// v3.4.0 — The pill is SOLID, and is the same constant the icon cut-outs use.
//          It was translucent, i.e. visible only by being brighter than the
//          bar — so glassing the bar erased the current tab entirely.
//          `isInteractive` is off the bar (reported as not looking like glass;
//          it was the one unverifiable prop, and Apple's interactive glass is
//          for button-sized controls). The rim is back: a floating object with
//          no edge stops reading as an object over a pale backdrop.
// v3.3.0 — The dock answers a finger the way a system tab bar does: a
//          highlight that travels to the tab being touched, and a hold that
//          swells the pill and its icon. The swell is Reanimated, so Android
//          gets the gesture even though only iOS 26 gets the material.
//          `ITEM_GAP`/label metrics moved with the tab into `DockItem`.
