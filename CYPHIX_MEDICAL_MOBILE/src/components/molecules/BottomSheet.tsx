/* ==================================================================
   BottomSheet (molecule) — the chrome every sheet in this app rises in.

   ══ WHY THIS EXISTS ══
   The first sheets here were a flat `surface`-coloured rectangle over a
   flat black scrim. On a phone that reads as a dialog from twenty years
   ago, because it is: every current platform presents modal content on a
   MATERIAL — something that blurs and tints what is behind it — with a
   large corner radius, a soft edge and a grabber. The difference is not
   decoration. A flat panel looks pasted onto the screen; a blurred one
   looks like it is IN FRONT OF the thing you were just reading, which is
   exactly the relationship a modal has to its page.

   So one file owns it, and every sheet gets the same:

     • The scrim BLURS the page instead of dimming it. What is behind stays
       recognisable, so the sheet reads as temporary.
     • The panel is `GlassSurface` — Apple's Liquid Glass on iOS 26+, a real
       `dimezisBlurView` blur on Android, never a translucent rectangle
       pretending to be one (see that file).
     • 28 pt corners, a hairline top edge, a shadow that lifts it off the
       page, and a grabber that says "this can be dismissed".
     • Tapping the scrim closes it — the first thing a user tries.

   Content is the caller's. This owns presentation only.
   ================================================================== */

import type { ReactNode } from 'react';
import { BlurView } from 'expo-blur';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import GlassSurface from '@/components/atoms/GlassSurface';
import { useIsDark, useTheme } from '@/theme/useTheme';

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Small uppercase label above the content. Omit for an untitled sheet. */
  title?: string;
  /** Accessible name for the tap-to-dismiss scrim. */
  closeLabel: string;
  children: ReactNode;
  /** Extra bottom padding beyond the home indicator (e.g. for a footer). */
  footer?: ReactNode;
}

export default function BottomSheet({
  visible,
  onClose,
  title,
  closeLabel,
  children,
  footer,
}: Props) {
  const t = useTheme();
  const dark = useIsDark();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      {/* The scrim blurs rather than dims. `pointerEvents` is the Pressable's
          job, so the blur sits inside it rather than over it. */}
      <Pressable style={styles.scrimTouch} onPress={onClose} accessibilityLabel={closeLabel}>
        <BlurView
          intensity={dark ? 24 : 18}
          tint={dark ? 'dark' : 'light'}
          // Without this Android draws NO blur at all — see GlassSurface.
          experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : 'none'}
          style={StyleSheet.absoluteFill}
        >
          {/* A little darkening under the blur, so white text on the sheet
              still has contrast over a white page. */}
          <View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: dark ? 'rgba(0,0,0,0.30)' : 'rgba(15,23,42,0.18)' },
            ]}
          />
        </BlurView>
      </Pressable>

      <GlassSurface
        dark={dark}
        fallbackTint={dark ? 'rgba(19, 27, 44, 0.80)' : 'rgba(255, 255, 255, 0.82)'}
        style={[
          styles.panel,
          {
            borderColor: dark ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.08)',
            paddingBottom: Math.max(insets.bottom, 14),
          },
        ]}
      >
        <View style={[styles.grabber, { backgroundColor: t.textTertiary }]} />
        {title && <Text style={[styles.title, { color: t.textTertiary }]}>{title}</Text>}
        {children}
        {footer}
      </GlassSurface>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrimTouch: { flex: 1 },
  panel: {
    /* 28 pt is the current platform radius for a presented sheet; the old
       22 read as a card, not as a sheet. `overflow: hidden` is what makes the
       blur respect the corners instead of squaring them off. */
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingTop: 8,
    maxHeight: '82%',
    // Lifts the panel off the page. iOS reads shadow*, Android elevation.
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -6 },
    elevation: 24,
  },
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 5,
    borderRadius: 3,
    opacity: 0.5,
    marginBottom: 10,
  },
  title: {
    fontSize: 11.5,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    paddingHorizontal: 14,
    paddingBottom: 8,
  },
});

// v1.0.0 — One modern sheet chrome for the whole app: blurred scrim, glass
//          panel, 28 pt corners, grabber, lift. Replaces the flat grey rectangle.
