/* Tests — the patient's own results list. Shares the shell so the whole
   app reads as one surface; content lands when the recording endpoints
   are wired to the shared API layer (see PARITY.md). */

import { StyleSheet, Text, View } from 'react-native';
import PatientShell from '@/components/templates/PatientShell';
import { useTranslation } from '@/i18n/useTranslation';
import { RADIUS } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

export default function TestsScreen() {
  const t = useTheme();
  const { t: tr, rtl } = useTranslation();
  const align = rtl ? ('right' as const) : ('left' as const);
  return (
    <PatientShell>
      <View style={styles.inner}>
        <Text style={[styles.title, { color: t.textPrimary }]}>{tr('testsTitle')}</Text>
        <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }]}>
          <Text style={[styles.cardTitle, { color: t.textPrimary, textAlign: align }]}>
            {tr('testsEmptyTitle')}
          </Text>
          <Text style={[styles.body, { color: t.textSecondary, textAlign: align }]}>
            {tr('testsEmptyBody')}
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

// v0.2.0 — Copy comes from the locale; prose re-aligns under an RTL language.
