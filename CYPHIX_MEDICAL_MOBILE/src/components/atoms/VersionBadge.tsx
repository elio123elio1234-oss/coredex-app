/* Visible version badge — bottom-right, same convention as web (§8). */

import { StyleSheet, Text, View } from 'react-native';
import { APP_BUILD_LABEL, APP_VERSION } from '@/config/version';
import { useTheme } from '@/theme/useTheme';

export default function VersionBadge() {
  const t = useTheme();
  return (
    <View pointerEvents="none" style={styles.wrap}>
      <Text style={[styles.text, { color: t.textTertiary }]} allowFontScaling={false}>
        v{APP_VERSION} · {APP_BUILD_LABEL}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', right: 10, bottom: 2, zIndex: 10 },
  text: { fontSize: 9, fontWeight: '500' },
});

// v0.1.0 — Bottom-right build identifier.
