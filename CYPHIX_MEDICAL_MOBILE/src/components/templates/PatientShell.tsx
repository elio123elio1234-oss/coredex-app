/* ==================================================================
   PatientShell (template) — the mobile twin of the web AppShell's
   full-screen patient shell (.app-shell--full / .main--full):

     • the background field fills the screen (default: flat gray)
     • the CYPHIX wordmark floats free in the top-start corner
     • content FILLS the viewport and never scrolls — only taps
     • the floating dock hovers above it (rendered by the navigator)

   Content is padded clear of the floating logo above and the dock below,
   the same job `.home-view`'s padding does on the web.
   ================================================================== */

import type { ReactNode } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BrandLogo from '@/components/atoms/BrandLogo';
import HeroBackdrop from '@/components/atoms/HeroBackdrop';
import { SHOW_SHELL_WORDMARK } from '@/config/featureFlags';
import { usePreferences } from '@/features/preferences/usePreferences';
import { dockFootprint } from '@/navigation/dockMetrics';
import { shellPalette } from '@/theme/shellTheme';
import { useIsDark } from '@/theme/useTheme';

interface Props {
  children: ReactNode;
  /** Immersive screens (the exam) hide the wordmark, as the web does. */
  chrome?: boolean;
  /**
   * Whether the floating dock is on screen behind this shell.
   *
   * The exam route is stacked ABOVE the tab navigator, so there is no dock
   * there — reserving its footprint anyway pushed the prep screen's primary
   * button ~99px up the screen for a bar that does not exist. Defaults to
   * `chrome`, since the two travel together today, but stays overridable.
   */
  dock?: boolean;
  /**
   * ★ The screen owns its own bottom clearance because it SCROLLS.
   *
   * By default the shell reserves the dock's footprint as padding, which
   * ends the content box above the bar. For a static screen that is right.
   * For a scrolling one it is visibly wrong: the list stops at a hard edge
   * and the strip below it — where the dock floats — is bare page. On the
   * phone that reads as a grey bar wedged under the content, and it
   * defeats the whole point of a frosted dock, which is to have something
   * passing underneath it to refract.
   *
   * With this set, the content box runs to the screen edge and the screen
   * puts `dockFootprint()` on its scroll container's CONTENT inset instead
   * — so the last card can still be scrolled clear of the bar, but
   * everything travels behind the glass on the way.
   */
  scrollsUnderDock?: boolean;
  /**
   * ★ The screen owns its own SIDE padding, because something inside it
   * has to reach the screen edge.
   *
   * A negative margin cannot escape a scroll view: RN sets `clipsToBounds`
   * on it, so a child made wider than the scroller is silently CUT at the
   * scroller's frame — which took the first ~20 pt off each side of the
   * full-bleed ECG and swallowed the lead label sitting there. The fix is
   * not a bigger negative margin, it is to stop the scroll view being
   * narrow: the shell drops its horizontal padding, the screen applies the
   * same padding on its scroll CONTENT, and the one element that wants the
   * full width cancels it with a negative margin that now has room to go.
   */
  bleedHorizontal?: boolean;
  /**
   * ★ The screen owns its TOP clearance, because it has its own floating
   * header.
   *
   * The third axis of the same idea as `scrollsUnderDock`: a screen whose
   * title sits on a frosted bar cannot also be pushed down by the shell's
   * safe-area padding, or the bar would float over an empty strip and the
   * list would start below both. With this set the content box starts at
   * the very top of the screen, the header takes the safe area itself, and
   * the scroll container carries the header's measured height as its
   * CONTENT inset — so cards pass behind the glass instead of stopping
   * above it, which is the entire point of a frosted header.
   */
  bleedTop?: boolean;
}

export default function PatientShell({
  children,
  chrome = true,
  dock = chrome,
  scrollsUnderDock = false,
  bleedHorizontal = false,
  bleedTop = false,
}: Props) {
  const insets = useSafeAreaInsets();
  const { height: screenH } = useWindowDimensions();
  const { prefs } = usePreferences();
  const palette = shellPalette(prefs.background, useIsDark());

  /* One condition for BOTH the mark and the space reserved for it — see the
     padding below. Two separate tests is how you end up with a 70 pt hole at
     the top of every screen holding nothing. */
  const wordmark = chrome && SHOW_SHELL_WORDMARK;

  return (
    <View style={styles.root}>
      <HeroBackdrop palette={palette} />

      {wordmark && (
        <View style={[styles.brand, { top: insets.top + 10 }]} pointerEvents="none">
          <BrandLogo width={160} tint={palette.logoTint} />
        </View>
      )}

      <View
        style={[
          styles.content,
          {
            /* 70 exists ONLY to clear the floating wordmark; with the mark
               hidden that height goes back to the content it was covering
               for. The screens are vertically centred, so this reads as the
               content settling up by ~29 pt rather than as a gap closing. */
            paddingTop: bleedTop ? 0 : insets.top + (wordmark ? 70 : 12),
            // Landscape puts the notch on a SIDE, so the horizontal padding
            // has to clear it — 20 is only the floor. A bleeding screen
            // takes both the padding and that responsibility on itself
            // (`shellPaddingH` is the same expression, exported for it).
            paddingLeft: bleedHorizontal ? 0 : Math.max(insets.left, 20),
            paddingRight: bleedHorizontal ? 0 : Math.max(insets.right, 20),
            // dockFootprint already accounts for the safe area where it
            // matters — adding insets.bottom again here squeezed the screen.
            paddingBottom: scrollsUnderDock
              ? 0
              : dock
                ? dockFootprint(insets.bottom, screenH)
                : Math.max(insets.bottom, 12),
          },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

/**
 * The side padding the shell would have applied.
 *
 * Exported so a `bleedHorizontal` screen re-applies exactly the same
 * number rather than a copy of it — two 20s that are meant to be one 20
 * is how a layout drifts on the first device with a different notch.
 */
export function shellPaddingH(insets: { left: number; right: number }): number {
  return Math.max(insets.left, insets.right, 20);
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  brand: { position: 'absolute', left: 20, zIndex: 20 },
  content: { flex: 1, justifyContent: 'center' },
});

// v2.5.0 — `bleedTop`: a screen with its own frosted header takes the top
//          clearance onto its scroll content, so the page travels behind the
//          glass rather than starting below it. Third axis of `scrollsUnderDock`.
// v2.4.0 — `bleedHorizontal` + `shellPaddingH`: a screen with something that
//          must reach the screen edge takes the side padding onto its own
//          scroll content. A negative margin cannot escape a ScrollView —
//          `clipsToBounds` cuts the child at the scroller's frame — so the
//          scroller itself has to be full width.
// v2.3.0 — `scrollsUnderDock`: a scrolling screen takes the dock's clearance on
//          its own content inset instead, so the page travels BEHIND the glass
//          rather than stopping on a bare strip above it.
// v2.2.0 — The floating wordmark is behind SHOW_SHELL_WORDMARK (off for now),
//          and the padding that cleared it follows the same switch.
