/* ==================================================================
   MeasurementGuideImage (molecule) — the circular "here's how to hold
   it" illustration shown over the live measurement screen while the
   recording has not started yet. Ported from the web molecule.

   A CIRCLE, and `cover` rather than `contain`: this crop is the design
   (`.guide-image-circle` / `.guide-image-img` in tests.css). It is the
   one place cropping is right — the artwork is composed for it, and the
   round frame is what separates "an instruction happening right now"
   from the rectangular step cards the patient already confirmed.

   Presentational only. Later this slot becomes a short looping video.
   ================================================================== */

import { Image, type ImageSourcePropType, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/useTheme';

interface Props {
  source: ImageSourcePropType;
  accessibilityLabel: string;
  caption?: string;
  /** `.guide-image-circle { width: clamp(190px, 44vw, 300px) }` */
  size: number;
  /** `.guide-image-caption { font-size: clamp(15px, 2.2vw, 19px) }` */
  captionSize?: number;
}

export default function MeasurementGuideImage({
  source,
  accessibilityLabel,
  caption,
  size,
  captionSize = 17,
}: Props) {
  const t = useTheme();
  return (
    <View style={styles.figure}>
      <View
        style={[
          styles.circle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: t.surface,
            backgroundColor: t.surface,
          },
        ]}
      >
        <Image
          source={source}
          accessibilityLabel={accessibilityLabel}
          accessibilityIgnoresInvertColors
          style={styles.img}
          resizeMode="cover"
        />
      </View>
      {caption != null && (
        <Text
          style={[
            styles.caption,
            { color: t.textPrimary, fontSize: captionSize, lineHeight: captionSize * 1.4 },
          ]}
        >
          {caption}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  /* .guide-image { flex column; align-items: center; gap: 14px } */
  figure: { alignItems: 'center', gap: 14 },
  /* border: 4px solid var(--surface); box-shadow: var(--shadow-lg) */
  circle: {
    borderWidth: 4,
    overflow: 'hidden',
    shadowColor: '#0A2540',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  img: { width: '100%', height: '100%' },
  /* .guide-image-caption { max-width: 320px; font-weight: 700 } */
  caption: { textAlign: 'center', fontWeight: '700', maxWidth: 320 },
});

// v1.0.0 — Circular measurement-guidance illustration (still; video slot later).
