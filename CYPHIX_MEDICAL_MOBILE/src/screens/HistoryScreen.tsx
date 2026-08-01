/* History — the clinician-facing recordings view (kept doctor-dense per
   the CYPHIX UX direction). On the web this is the one screen with the
   classic sidebar; on mobile it shares the shell and the dock, and the
   recordings list becomes the page itself. */

import { StyleSheet, Text, View } from 'react-native';
import PatientShell from '@/components/templates/PatientShell';
import { useTranslation } from '@/i18n/useTranslation';
import { RADIUS } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

export default function HistoryScreen() {
  const t = useTheme();
  const { t: tr, rtl } = useTranslation();
  const align = rtl ? ('right' as const) : ('left' as const);
  return (
    <PatientShell>
      <View style={styles.inner}>
        <Text style={[styles.title, { color: t.textPrimary }]}>{tr('histTitle')}</Text>
        <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }]}>
          <Text style={[styles.cardTitle, { color: t.textPrimary, textAlign: align }]}>
            {tr('histEmptyTitle')}
          </Text>
          <Text style={[styles.body, { color: t.textSecondary, textAlign: align }]}>
            {tr('histEmptyBody')}
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

// v0.3.0 — Copy comes from the locale; prose re-aligns under an RTL language.
