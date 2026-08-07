/* ==================================================================
   ExplainerVideoSheet (organism) — the "how do I do this test?" clip.

   The mobile twin of the web `ExplainerVideoModal`. The web presents it as
   a centred full-screen card; the phone presents it as a SHEET, because
   that is what a phone does with a thing you opened from the page you were
   reading and will dismiss back to — and because this app's sheets already
   own the scrim, the Android back button and the material (`BottomSheet` →
   `OverlayLayer`, and read that file before changing anything here).

   ── Not every test has a clip, and that is a supported state ──
   `videoSrc == null` shows the test's own photograph behind a "coming
   soon" badge, exactly as the web does, rather than an empty player. The
   moment a clip is added to `MEASUREMENT_GUIDE_VIDEO` it plays with no
   other change.

   ── The player is created only while the sheet is open ──
   `useVideoPlayer` is a hook, so it runs on every render of this component
   whether or not the sheet is showing. Feeding it `null` while closed is
   what keeps a 2.7 MB clip from being decoded behind the Tests tab from
   the moment the app opens. Autoplay is deliberate: the patient already
   pressed "Watch how", so a second press on a play button is a step that
   asks them to say yes twice.

   ⚠️ `allowsFullscreen` is OFF on purpose. iOS fullscreen video is
   presented by AVPlayerViewController, which manages its OWN orientation —
   and every route in this app but the exam is declared `portrait_up` in
   RootNavigator. Handing a second party the orientation API is the exact
   shape of the bug documented at the top of that file. The sheet is sized
   generously instead.
   ================================================================== */

import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect } from 'react';
import { Image, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import BottomSheet from '@/components/molecules/BottomSheet';
import { useTranslation } from '@/i18n/useTranslation';
import { RADIUS } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

interface Props {
  visible: boolean;
  onClose: () => void;
  title: string;
  description: string;
  /** Still shown behind the "coming soon" slot until a clip exists. */
  posterSrc: ImageSourcePropType;
  /** `require()`d clip, or null while none has been produced. */
  videoSrc: number | null;
}

export default function ExplainerVideoSheet({
  visible,
  onClose,
  title,
  description,
  posterSrc,
  videoSrc,
}: Props) {
  const t = useTheme();
  const { t: tr } = useTranslation();

  const player = useVideoPlayer(visible ? videoSrc : null, (p) => {
    // A short how-to is watched more than once; looping saves a rewind.
    p.loop = true;
  });

  useEffect(() => {
    if (visible && videoSrc != null) player.play();
    else player.pause();
  }, [visible, videoSrc, player]);

  return (
    <BottomSheet visible={visible} onClose={onClose} closeLabel={tr('close')}>
      <View style={styles.body}>
        <View style={[styles.stage, { backgroundColor: '#000000' }]}>
          {videoSrc != null ? (
            <VideoView
              player={player}
              style={StyleSheet.absoluteFill}
              contentFit="contain"
              nativeControls
              allowsFullscreen={false}
              allowsPictureInPicture={false}
            />
          ) : (
            <>
              <Image
                source={posterSrc}
                style={StyleSheet.absoluteFill}
                resizeMode="cover"
                accessibilityIgnoresInvertColors
              />
              <View style={styles.soonScrim} />
              <View style={[styles.soonBadge, { backgroundColor: t.surface }]}>
                <Text style={[styles.soonText, { color: t.textPrimary }]}>
                  {tr('testsVideoSoon')}
                </Text>
              </View>
            </>
          )}
        </View>

        <Text style={[styles.title, { color: t.textPrimary }]}>{title}</Text>
        <Text style={[styles.desc, { color: t.textSecondary }]}>{description}</Text>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 8, paddingBottom: 6, gap: 12 },
  /* 16:9 with a black bed, so a clip of any aspect is letterboxed rather
     than cropped — a how-to must not lose the hand at the edge of frame. */
  stage: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  soonScrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(10, 37, 64, 0.45)' },
  soonBadge: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 999 },
  soonText: { fontSize: 13.5, fontWeight: '700' },
  title: { fontSize: 20, fontWeight: '800', paddingHorizontal: 6 },
  desc: { fontSize: 15, lineHeight: 22, paddingHorizontal: 6 },
});

// v1.0.0 — Explainer clip in a sheet; a missing clip shows the still, not a
//          dead player. Player is only alive while the sheet is open.
