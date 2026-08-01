/* ==================================================================
   GlassSurface (atom) — the ONE frosted surface in the app, resolved to
   the best real implementation the device actually has.

   ── WHY THIS EXISTS ──
   The dock was "glass" that did not look like glass, and the reason was
   platform-specific and invisible from Windows:

   • **Android**: `expo-blur` does NOT blur by default. Without
     `experimentalBlurMethod="dimezisBlurView"` it renders a flat
     translucent rectangle — a literal imitation of glass with no blur at
     all. That is almost certainly what was on screen.
   • **iOS 26+**: the real thing is Apple's Liquid Glass
     (`expo-glass-effect`), which refracts and specularly highlights what
     is behind it. `UIBlurEffect` (what `expo-blur` wraps) is the older,
     flatter material.

   So: Liquid Glass where it exists, a genuinely blurring UIBlurEffect /
   BlurView everywhere else.

   ── THE GUARDED REQUIRE IS LOAD-BEARING ──
   `expo-glass-effect`'s iOS entry calls `requireNativeViewManager` at
   MODULE SCOPE, and `isLiquidGlassAvailable()` calls
   `requireNativeModule`. Both THROW when the native module is missing —
   which is the case in any client that wasn't built with it. A static
   `import` would therefore take down the whole bundle on launch rather
   than degrading. Hence `require` inside try/catch, resolved once.
   ================================================================== */

import { BlurView } from 'expo-blur';
import type { ReactNode } from 'react';
import { Platform, StyleSheet, View, type ViewStyle } from 'react-native';

type GlassModule = {
  GlassView: React.ComponentType<
    { glassEffectStyle?: 'clear' | 'regular' | 'none'; tintColor?: string } & {
      style?: ViewStyle | ViewStyle[];
      children?: ReactNode;
    }
  >;
  isLiquidGlassAvailable: () => boolean;
};

/** Resolved once at first use: the module, or null if unavailable here. */
const glass: GlassModule | null = (() => {
  if (Platform.OS !== 'ios') return null;
  try {
    const mod = require('expo-glass-effect') as GlassModule;
    return mod.isLiquidGlassAvailable() ? mod : null;
  } catch {
    // Not built into this client — fall back to a blur that does work.
    return null;
  }
})();

/** True when the surface below is Apple's real Liquid Glass. */
export const IS_LIQUID_GLASS = glass !== null;

interface Props {
  children: ReactNode;
  style?: ViewStyle | ViewStyle[];
  dark: boolean;
  /** Tint under the material. Ignored by Liquid Glass, which tints itself. */
  fallbackTint: string;
}

export default function GlassSurface({ children, style, dark, fallbackTint }: Props) {
  if (glass) {
    const { GlassView } = glass;
    return (
      <GlassView glassEffectStyle="regular" style={style}>
        {children}
      </GlassView>
    );
  }

  return (
    <BlurView
      intensity={dark ? 40 : 55}
      tint={dark ? 'dark' : 'light'}
      // ★ Without this Android does not blur AT ALL — it just draws a
      //   translucent rectangle. This is the line that makes it glass.
      experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : 'none'}
      style={style}
    >
      {/* expo-blur's own tint is coarse; this is the surface colour the web
          gets from `color-mix(in srgb, var(--surface) 55%, transparent)`. */}
      <View
        style={[StyleSheet.absoluteFill, { backgroundColor: fallbackTint }]}
        pointerEvents="none"
      />
      {children}
    </BlurView>
  );
}

// v1.0.0 — Liquid Glass on iOS 26+, real Android blur via dimezisBlurView.
