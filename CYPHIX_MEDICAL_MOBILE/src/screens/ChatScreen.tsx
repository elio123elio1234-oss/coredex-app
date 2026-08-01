/* Chat — messages with the care team. Shares the patient shell; the
   thread lands with messageApi + auth (see PARITY.md). */

import { StyleSheet, Text, View } from 'react-native';
import PatientShell from '@/components/templates/PatientShell';
import { RADIUS } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

export default function ChatScreen() {
  const t = useTheme();
  return (
    <PatientShell>
      <View style={styles.inner}>
        <Text style={[styles.title, { color: t.textPrimary }]}>Chat</Text>
        <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }]}>
          <Text style={[styles.body, { color: t.textSecondary }]}>
            Messages with your care team will appear here, on the same thread you see on the web.
          </Text>
        </View>
      </View>
    </PatientShell>
  );
}

const styles = StyleSheet.create({
  inner: { gap: 18 },
  title: { fontSize: 32, fontWeight: '800', textAlign: 'center' },
  card: { borderRadius: RADIUS.lg, borderWidth: 1, padding: 24 },
  body: { fontSize: 14.5, lineHeight: 21 },
});

// v0.1.0 — Chat tab on the patient shell.
