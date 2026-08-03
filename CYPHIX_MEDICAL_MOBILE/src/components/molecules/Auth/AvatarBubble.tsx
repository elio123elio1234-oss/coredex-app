/* ==================================================================
   AvatarBubble (molecule) — the round account mark: the chosen photo if
   there is one, otherwise the patient's initials on a chosen tone.

   Initials are the fallback rather than a generic silhouette on purpose.
   The reference's own copy says why the photo is asked for at all —
   "helps clinicians confirm they are reviewing the right record" — and
   two letters of the right name serve that better than a grey outline of
   nobody.
   ================================================================== */

import { Image, StyleSheet, Text, View } from 'react-native';
import { NUMERIC_TYPE } from '@/theme/authTheme';

interface Props {
  initials: string;
  tone: string;
  size: number;
  /** Local URI of a picked photo. Takes precedence over the initials. */
  photoUri?: string;
  /** A soft lift under the big one on the photo step. */
  elevated?: boolean;
  accessibilityLabel?: string;
}

export default function AvatarBubble({
  initials,
  tone,
  size,
  photoUri,
  elevated = false,
  accessibilityLabel,
}: Props) {
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.bubble,
        elevated && styles.elevated,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: tone },
      ]}
    >
      {photoUri ? (
        <Image
          source={{ uri: photoUri }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          resizeMode="cover"
        />
      ) : (
        <Text
          allowFontScaling={false}
          style={[styles.initials, { fontSize: size * 0.29 }]}
        >
          {initials}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  initials: { color: '#FFFFFF', fontWeight: '600', ...NUMERIC_TYPE },
  elevated: {
    elevation: 6,
    shadowColor: '#0D2041',
    shadowOpacity: 0.4,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
  },
});

// v1.0.0 — Photo-or-initials account bubble.
