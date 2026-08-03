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
   The bar was already Apple's Liquid Glass on iOS 26 and still did not
   feel like the system's, because glass on iOS is not a LOOK, it is a
   MATERIAL THAT ANSWERS YOUR FINGER. Three things were missing, and all
   three are here now:

   1. **The material itself responds.** `interactive` turns on Apple's
      `UIGlassEffect.isInteractive`, so the glass brightens and its
      specular highlight tracks the touch — the system's own behaviour,
      not an imitation of it.
   2. **The highlight follows the finger.** Touch down on any tab and the
      pill travels there immediately; release commits the navigation,
      slide off and it springs home. The lit icon follows the PILL rather
      than the navigator (`lit`, not `selected`), which is also what keeps
      the filled icon's cut-out details on the colour they are cut out
      against — see `cutout` below.
   3. **Hold and the glass grows.** Touch → the pill swells slightly;
      keep holding past `HOLD_MS` → it swells further with a heavier
      haptic, and the icon and label grow with it. That is the "press and
      the glass gets bigger" of a system tab bar, and it is done here in
      Reanimated so ANDROID GETS IT TOO — the material differs per
      platform, the gesture does not.

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

  /* The colour the active icon's inner details are cut out in — it must match
     what sits directly behind them, i.e. the pill, not the page. This is why
     the icon lights from `lit` and not from the navigator: were the pill to
     travel under the finger while the filled icon stayed on the old tab, that
     icon's cut-out details would be sitting on glass instead of on the pill. */
  const cutout = dark ? '#33415A' : t.surface;

  /* On iOS 26 the bar is Apple's real Liquid Glass, so it is dressed the way
     the system dresses its own tab bar rather than the way CSS had to fake it:
     a light tint instead of the web's milky 55 % plate, and no hand-drawn
     1 px rim — the material lights its own edge, and a second one over it is
     the tell that it is not really glass. The border WIDTH stays so the bar
     keeps the height `dockMetrics.DOCK_BAR_HEIGHT` promises.
     The fallback keeps the web's values: an untinted BlurView really is
     nearly invisible over a light page (the v0.19.2 trap). */
  const tint = IS_LIQUID_GLASS
    ? dark
      ? 'rgba(19,27,44,0.26)'
      : 'rgba(255,255,255,0.32)'
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
        /* Apple's own touch response, on the surface that IS the control. */
        interactive
        style={[
          styles.bar,
          {
            padding: BAR_PADDING,
            gap,
            borderColor: IS_LIQUID_GLASS
              ? 'transparent'
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
              backgroundColor: dark ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.85)',
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
            cutout={cutout}
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
  pill: { position: 'absolute', borderRadius: 999 },
});

// v3.3.0 — The dock answers a finger the way a system tab bar does: Apple's
//          interactive glass on the bar, a highlight that travels to the tab
//          being touched, and a hold that swells the pill and its icon. The
//          swell is Reanimated, so Android gets the gesture even though only
//          iOS 26 gets the material. `ITEM_GAP`/label metrics moved with the
//          tab into `DockItem`.
