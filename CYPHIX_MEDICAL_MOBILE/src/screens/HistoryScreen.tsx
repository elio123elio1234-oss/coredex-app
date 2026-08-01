/* History — the clinician-facing recordings view (kept doctor-dense per
   the CYPHIX UX direction). On the web this is the one screen with the
   classic sidebar; on mobile it shares the shell and the dock, and the
   recordings list becomes the page itself. */

import { StyleSheet, Text, View } from 'react-native';
import PatientShell from '@/components/templates/PatientShell';
import { RADIUS } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

export default function HistoryScreen() {
  const t = useTheme();
  return (
    <PatientShell>
      <View style={styles.inner}>
        <Text style={[styles.title, { color: t.textPrimary }]}>Scan History</Text>
        <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }]}>
          <Text style={[styles.cardTitle, { color: t.textPrimary }]}>No recordings yet</Text>
          <Text style={[styles.body, { color: t.textSecondary }]}>
            Completed measurements sync here through the CYPHIX server, with the same waveform
            viewer and calipers as the web history view.
          </Text>
        </View>
      </View>
    </PatientShell>
  );
}

const styles = StyleSheet.create({
  inner: { gap: 18 },
  title: { fontSize: 32, fontWeight: '800', textAlign: 'center' },
  card: { borderRadius: RADIUS.lg, borderWidth: 1, padding: 24, gap: 8 },
  cardTitle: { fontSize: 17, fontWeight: '700' },
  body: { fontSize: 14.5, lineHeight: 21 },
});

// v0.2.0 — Rebuilt on the patient shell (was a bare scaffold screen).
