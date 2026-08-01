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
}

export default function PatientShell({ children, chrome = true, dock = chrome }: Props) {
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
            paddingTop: insets.top + (wordmark ? 70 : 12),
            // Landscape puts the notch on a SIDE, so the horizontal padding
            // has to clear it — 20 is only the floor.
            paddingLeft: Math.max(insets.left, 20),
            paddingRight: Math.max(insets.right, 20),
            // dockFootprint already accounts for the safe area where it
            // matters — adding insets.bottom again here squeezed the screen.
            paddingBottom: dock
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

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  brand: { position: 'absolute', left: 20, zIndex: 20 },
  content: { flex: 1, justifyContent: 'center' },
});

// v2.2.0 — The floating wordmark is behind SHOW_SHELL_WORDMARK (off for now),
//          and the padding that cleared it follows the same switch.
