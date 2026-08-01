/* ==================================================================
   ReportHeader (molecule) — the letterhead on every report page.
   Ported from the web molecule.

   Repeated on BOTH pages on purpose: a sheet that gets separated from its
   first page must still identify itself. A loose page of ECG measurements
   with no provenance is the kind of thing that ends up filed against the
   wrong record.
   ================================================================== */

import { StyleSheet, Text, View } from 'react-native';
import BrandLogo from '@/components/atoms/BrandLogo';
import { RADIUS } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

interface Props {
  title: string;
  /** e.g. "Waveforms" / "Measurements" — which page this is. */
  pageLabel: string;
  /** Label/value pairs: recorded at, duration, lead set… */
  meta: Array<{ label: string; value: string }>;
  /** Shown as a loud banner when the signal was synthetic. */
  simulatedNotice?: string;
}

export default function ReportHeader({ title, pageLabel, meta, simulatedNotice }: Props) {
  const t = useTheme();
  return (
    <View style={[styles.header, { borderBottomColor: t.accent }]}>
      <View style={styles.top}>
        <BrandLogo width={150} />
        <View style={styles.titleBlock}>
          <Text style={[styles.title, { color: t.textPrimary }]}>{title}</Text>
          <Text style={[styles.pageLabel, { color: t.accent }]}>{pageLabel.toUpperCase()}</Text>
        </View>
      </View>

      {/* A synthetic recording must never be able to read as a clinical
          record — this is the loudest element on the page. */}
      {simulatedNotice != null && <Text style={styles.simBanner}>{simulatedNotice}</Text>}

      <View style={styles.meta}>
        {meta.map((m) => (
          <View key={m.label} style={styles.metaItem}>
            <Text style={[styles.metaLabel, { color: t.textTertiary }]}>
              {m.label.toUpperCase()}
            </Text>
            <Text style={[styles.metaValue, { color: t.textPrimary }]}>{m.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  /* .report-header { gap 14; padding-bottom 14; border-bottom: 2px accent } */
  header: { gap: 14, paddingBottom: 14, borderBottomWidth: 2 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 16, flexWrap: 'wrap' },
  titleBlock: { flex: 1, minWidth: 0 },
  title: { fontSize: 19, fontWeight: '800' },
  /* .report-page-label — uppercase, letter-spaced, accent */
  pageLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.1, marginTop: 2 },
  /* .report-sim-banner */
  simBanner: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
    backgroundColor: 'rgba(245, 158, 11, 0.16)',
    borderWidth: 1.5,
    borderColor: 'rgba(245, 158, 11, 0.65)',
    color: '#92400E',
    fontSize: 12.5,
    fontWeight: '800',
    textAlign: 'center',
  },
  /* .report-meta — auto-fit columns, min 150px */
  meta: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 10, columnGap: 20 },
  metaItem: { minWidth: 140, flexGrow: 1, flexBasis: '40%' },
  metaLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8, marginBottom: 2 },
  metaValue: { fontSize: 13.5, fontWeight: '600' },
});

// v1.0.0 — Report letterhead (logo + title + provenance), repeated per page.
