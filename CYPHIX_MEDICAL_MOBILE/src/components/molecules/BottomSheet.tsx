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

   ★ v0.18.0: and none of that could work until the `Modal` went. A Modal
   is its own window, so the blur had nothing behind it to sample and fell
   back to — precisely — a grey rectangle. Presentation now lives in
   `OverlayLayer`, in tree, where the page is really there to blur. Read
   that file before changing anything here.

   What this owns:
     • 28 pt corners, a hairline edge, a shadow that lifts it off the page,
       and a grabber that says "this can be dismissed".
     • `GlassSurface` — Apple's Liquid Glass on iOS 26+, a real
       `dimezisBlurView` blur on Android, never a translucent rectangle
       pretending to be one.
     • A height ceiling measured from the WINDOW, not a percentage: the
       panel's own height is content-driven, so a percentage would have
       nothing to resolve against.

   Content is the caller's. This owns presentation only.
   ================================================================== */

import type { ReactNode } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import GlassSurface from '@/components/atoms/GlassSurface';
import OverlayLayer from '@/components/atoms/OverlayLayer';
import { useIsDark, useTheme } from '@/theme/useTheme';

/** Fraction of the window a sheet may cover before it should be a screen. */
const MAX_FRACTION = 0.82;

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Small uppercase label above the content. Omit for an untitled sheet. */
  title?: string;
  /** Accessible name for the tap-to-dismiss scrim. */
  closeLabel: string;
  children: ReactNode;
  /** Pinned below the scrolling content (e.g. a Cancel button). */
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
  const { height } = useWindowDimensions();

  return (
    <OverlayLayer visible={visible} onRequestClose={onClose} closeLabel={closeLabel} enter="slide">
      <GlassSurface
        dark={dark}
        tint={dark ? 'rgba(19, 27, 44, 0.80)' : 'rgba(255, 255, 255, 0.82)'}
        style={[
          styles.panel,
          {
            borderColor: dark ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.08)',
            paddingBottom: Math.max(insets.bottom, 14),
            maxHeight: height * MAX_FRACTION,
          },
        ]}
      >
        <View style={[styles.grabber, { backgroundColor: t.textTertiary }]} />
        {title && <Text style={[styles.title, { color: t.textTertiary }]}>{title}</Text>}
        {children}
        {footer}
      </GlassSurface>
    </OverlayLayer>
  );
}

const styles = StyleSheet.create({
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

// v2.0.0 — Presented through OverlayLayer instead of Modal, which is the only
//          way the blur has anything to sample. Height ceiling measured from
//          the window rather than a percentage of an auto-height parent.
