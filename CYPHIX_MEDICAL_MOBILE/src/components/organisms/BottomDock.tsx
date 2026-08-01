/* ==================================================================
   BottomDock (organism) — the floating frosted-glass bottom navigation,
   ported from the web BottomDock + the `.bottom-dock` / `.dock-pill` /
   `.dock-item` rules in layout.css.

   Every size and offset lives in `dockMetrics.ts`, next to the CSS lines
   it came from — including WHY two of them deliberately differ from a
   literal copy. Nothing here is a guessed number.

   Carried over from the web: real frosted glass (expo-blur is the native
   equivalent of `backdrop-filter: blur(22px) saturate(1.6)`), a single
   sliding highlight on the pill's overshoot curve, icons that fill in with
   their inner details cut out in the pill colour, and a Home that stays
   navy even when unselected.
   ================================================================== */

import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import GlassSurface from '@/components/atoms/GlassSurface';
import { DOCK_ITEMS } from '@/navigation/dockConfig';
import {
  BAR_PADDING,
  DOCK_ITEM_HEIGHT,
  dockBottomOffset,
  dockGap,
  HOME_ICON,
  ICON,
  ITEM_GAP,
  LABEL_LINE,
  LABEL_SIZE,
  MAX_BAR_W,
  MIN_ITEM_W,
} from '@/navigation/dockMetrics';
import { useIsDark, useTheme } from '@/theme/useTheme';

/** The web's pill easing: cubic-bezier(.34, 1.28, .5, 1) — a gentle overshoot. */
const SPRING = { damping: 15, stiffness: 180, mass: 0.85 } as const;

export default function BottomDock({ state, navigation }: BottomTabBarProps) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const dark = useIsDark();

  const itemH = DOCK_ITEM_HEIGHT;
  const gap = dockGap(screenW);
  const available = Math.min(screenW - 24, MAX_BAR_W) - BAR_PADDING * 2 - gap * (DOCK_ITEMS.length - 1);
  const itemW = Math.max(MIN_ITEM_W, available / DOCK_ITEMS.length);
  const step = itemW + gap;

  const x = useSharedValue(state.index * step);
  useEffect(() => {
    x.value = withSpring(state.index * step, SPRING);
  }, [state.index, step, x]);
  const pillStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  /* The colour the active icon's inner details are cut out in — it must match
     what sits directly behind them, i.e. the pill, not the page. */
  const cutout = dark ? '#33415A' : t.surface;

  return (
    <View
      style={[styles.shell, { bottom: dockBottomOffset(insets.bottom, screenH) }]}
      pointerEvents="box-none"
    >
      <GlassSurface
        dark={dark}
        /* color-mix(in srgb, var(--surface) 55%, transparent) — 44% on dark. */
        fallbackTint={dark ? 'rgba(19,27,44,0.44)' : 'rgba(255,255,255,0.55)'}
        style={[
          styles.bar,
          {
            padding: BAR_PADDING,
            gap,
            borderColor: dark ? 'rgba(255,255,255,0.14)' : 'rgba(200,208,224,0.55)',
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
        />

        {DOCK_ITEMS.map((item, i) => {
          const active = state.index === i;
          /* .dock-item--home:not(.is-active) { color: var(--brand-navy) } */
          const color = active ? t.textPrimary : item.emphasized ? t.brandNavy : t.textSecondary;
          return (
            <Pressable
              key={item.name}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={item.label}
              style={{
                width: itemW,
                height: itemH,
                alignItems: 'center',
                justifyContent: 'center',
                gap: ITEM_GAP,
              }}
              onPress={() => {
                if (!active) {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  navigation.navigate(state.routes[i].name);
                }
              }}
            >
              <item.Icon
                size={item.emphasized ? HOME_ICON : ICON}
                color={color}
                active={active}
                cutout={cutout}
              />
              <Text
                numberOfLines={1}
                allowFontScaling={false}
                style={[styles.label, { color, fontWeight: item.emphasized ? '800' : '700' }]}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </GlassSurface>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  bar: {
    flexDirection: 'row',
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
  label: { fontSize: LABEL_SIZE, lineHeight: LABEL_LINE },
});

// v3.1.0 — Reads the resolved theme (Settings choice, then OS) instead of the raw
//          OS appearance, so the dock cannot stay light while the app goes dark.
