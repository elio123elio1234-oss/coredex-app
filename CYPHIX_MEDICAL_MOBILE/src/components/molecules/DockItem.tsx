/* ==================================================================
   DockItem (molecule) — one tab of the floating dock: its touch target,
   and the icon + label that swell inside it while the tab is held down.

   ── WHY THIS LEFT `BottomDock` ──
   The dock now re-renders on touch: it previews the highlight under the
   finger, so which tab is lit is React state, not just the navigator's
   index. Four of the five tabs are unchanged by that press and must not
   re-render with it — every one of them is an SVG. That needs a `memo`
   boundary, and a `memo` boundary needs a component of its own.

   ── ★ WHY THERE IS NO `onLongPress` HERE ──
   React Native does **not** fire `onPress` after `onLongPress` has fired.
   Wiring the swell to `onLongPress` would therefore mean a hold that
   grows the glass and then navigates nowhere — the tab bar would ignore
   the very gesture it just animated. So the hold is TIMED BY THE DOCK
   (`HOLD_MS`) and this component reports only raw touch-down / touch-up.
   You can hold a tab for a minute; releasing it still selects it.

   Presentation only: no navigation, no haptics, no timers. The dock owns
   all three so that every response the bar makes to a finger is decided
   in one place.
   ================================================================== */

import { memo } from 'react';
import { StyleSheet, Text, Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';
import type { DockConfigItem } from '@/navigation/dockConfig';
import { HOME_ICON, ICON, ITEM_GAP, LABEL_LINE, LABEL_SIZE } from '@/navigation/dockMetrics';

/** How much the icon + label grow while the tab is held. Deliberately
    smaller than the pill's own swell — the glass leads, the content
    follows it, which is the order the eye reads as one object moving. */
const HELD_CONTENT_SCALE = 1.07;

/** Softer and slower than the pill's spring: content that snaps harder
    than the surface under it looks detached from it. */
const CONTENT_SPRING = { damping: 16, stiffness: 200, mass: 0.8 } as const;

export interface DockItemProps {
  index: number;
  item: DockConfigItem;
  /** Already resolved from the locale by the dock. */
  label: string;
  width: number;
  height: number;
  /** The sliding pill is behind this tab. Follows the FINGER during a
      press, not the navigator — so the icon's cutout colour and the thing
      it is cut out against can never disagree. */
  lit: boolean;
  /** What the navigator actually has selected. The a11y truth, which is
      NOT `lit`: a preview under someone's thumb has not selected anything
      yet, and announcing that it has would be a lie to a screen reader. */
  selected: boolean;
  /** Held long enough that the glass has swollen under it. */
  held: boolean;
  /** The dock's selection-landed pop, shared by all five tabs and applied by
      whichever one is `selected` when it runs. A `SharedValue` and not a
      prop change on purpose: it is driven from the UI thread and its
      identity never changes, so it costs the `memo` below nothing. */
  pop: SharedValue<number>;
  /** Icon outline + label colour. */
  color: string;
  /** Colour the filled icon's inner details are cut out in. */
  cutout: string;
  onPressIn: (index: number) => void;
  onPressOut: (index: number) => void;
  onPress: (index: number) => void;
}

function DockItem({
  index,
  item,
  label,
  width,
  height,
  lit,
  selected,
  held,
  pop,
  color,
  cutout,
  onPressIn,
  onPressOut,
  onPress,
}: DockItemProps) {
  /* Two scale entries rather than one sum: the hold is an ANIMATION assigned
     to the property (`withSpring` resolves it per frame) and the pop is a
     plain read of a shared value. They cannot be added together in one
     expression — but two transforms multiply, which is the same result and
     keeps a hold released onto a new tab reading as one continuous motion. */
  const contentStyle = useAnimatedStyle(
    () => ({
      transform: [
        { scale: withSpring(held ? HELD_CONTENT_SCALE : 1, CONTENT_SPRING) },
        { scale: 1 + (selected ? pop.value : 0) },
      ],
    }),
    [held, selected],
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      style={[styles.target, { width, height }]}
      onPressIn={() => onPressIn(index)}
      onPressOut={() => onPressOut(index)}
      onPress={() => onPress(index)}
    >
      <Animated.View style={[styles.content, contentStyle]} pointerEvents="none">
        <item.Icon
          size={item.emphasized ? HOME_ICON : ICON}
          color={color}
          active={lit}
          cutout={cutout}
        />
        <Text
          numberOfLines={1}
          allowFontScaling={false}
          style={[styles.label, { color, fontWeight: item.emphasized ? '800' : '700' }]}
        >
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  target: { alignItems: 'center', justifyContent: 'center' },
  content: { alignItems: 'center', justifyContent: 'center', gap: ITEM_GAP },
  label: { fontSize: LABEL_SIZE, lineHeight: LABEL_LINE },
});

/* The dock re-renders on every touch-down, touch-up and hold. Without this
   that is five SVG re-renders per press for the one tab that changed. */
export default memo(DockItem);

// v1.1.0 — Applies the dock's selection-landed pop when the tab that landed is
//          this one. Selection had no moment of its own before: the pill slid
//          and the icon filled, both states rather than events.
// v1.0.0 — One dock tab, extracted so the four tabs a press did not touch can
//          skip the re-render that previewing the highlight now causes.
