/* ==================================================================
   ReportHeader (molecule) — the report's letterhead.

   ══ WHY THIS DIVERGES FROM THE WEB ══
   The web prints TWO A4 sheets and repeats the full letterhead on each,
   because a sheet that gets separated from its first page must still
   identify itself. Paper can be separated; a phone screen cannot. Ported
   literally, the repeat put the logo, the title, the page label and four
   provenance fields on screen twice inside one scroll — the single biggest
   source of the "everything is thrown at me" feeling.

   So on mobile the letterhead appears ONCE, at the top of the document,
   and the provenance that used to sit in a four-column meta grid moved
   into the summary card below it, where it reads as data rather than as a
   form. Root CLAUDE.md §3.3: brand identity is identical to web,
   navigation and layout patterns follow the platform.
   ================================================================== */

import { StyleSheet, Text, View } from 'react-native';
import BrandLogo from '@/components/atoms/BrandLogo';
import { RADIUS } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

interface Props {
  /** e.g. "Limb Leads Report". */
  title: string;
  /** When the recording was taken, already formatted for display. */
  timestamp: string;
  /** Shown as a loud banner when the signal was synthetic. */
  simulatedNotice?: string;
}

export default function ReportHeader({ title, timestamp, simulatedNotice }: Props) {
  const t = useTheme();
  return (
    <View style={styles.wrap}>
      <View style={[styles.row, { borderBottomColor: t.accent }]}>
        <BrandLogo width={112} />
        <View style={styles.titleBlock}>
          <Text style={[styles.title, { color: t.accent }]} numberOfLines={1}>
            {title.toUpperCase()}
          </Text>
          <Text style={[styles.stamp, { color: t.textTertiary }]} numberOfLines={1}>
            {timestamp}
          </Text>
        </View>
      </View>

      {/* A synthetic recording must never be able to read as a clinical
          record — this stays the loudest element on the screen. */}
      {simulatedNotice != null && <Text style={styles.simBanner}>{simulatedNotice}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  /* `.report-header` — the 2 px accent rule is what makes this read as a
     document letterhead rather than as a screen title. */
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    paddingBottom: 10,
    borderBottomWidth: 2,
  },
  titleBlock: { flex: 1, minWidth: 0, alignItems: 'flex-end' },
  /* `.report-page-label` — uppercase, letter-spaced, accent. */
  title: { fontSize: 11, fontWeight: '800', letterSpacing: 1.1 },
  stamp: { fontSize: 11.5, fontWeight: '600', marginTop: 3 },
  /* `.report-sim-banner` */
  simBanner: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
    backgroundColor: 'rgba(245, 158, 11, 0.16)',
    borderWidth: 1.5,
    borderColor: 'rgba(245, 158, 11, 0.65)',
    color: '#92400E',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
    textAlign: 'center',
  },
});

// v2.0.0 — One compact letterhead for the whole document instead of the web's
//          per-A4-sheet repeat; provenance moved to the summary card.
