/* ==================================================================
   ValueInfoSheet (molecule) — "what is this number?", one tile at a time.

   Every tile and every interval row on the Values screen opens this. It
   repeats the measurement it was opened from — large, so there is no
   doubt which tile you tapped — and then one plain sentence saying what
   the quantity IS.

   ★ It never says whether the value is good. Not "slightly high", not
   "within range", not a colour that implies either. That is the whole
   line this app does not cross, and this sheet is where it would be
   easiest to cross by accident, because a sentence explaining a number
   wants to end with a judgement. The copy lives in the locale files
   (`valInfo*`) where it can be read as a set and checked as a set.

   Presentation only — `BottomSheet` owns the material, the grabber, the
   scrim and the dismissal.
   ================================================================== */

import { StyleSheet, Text, View } from 'react-native';
import BottomSheet from '@/components/molecules/BottomSheet';
import { useTranslation } from '@/i18n/useTranslation';
import { useTheme } from '@/theme/useTheme';

export interface ValueInfo {
  title: string;
  value: string;
  unit: string;
  body: string;
}

interface Props {
  info: ValueInfo | null;
  onClose: () => void;
}

export default function ValueInfoSheet({ info, onClose }: Props) {
  const t = useTheme();
  const { t: tr, rtl } = useTranslation();
  const align = rtl ? ('right' as const) : ('left' as const);

  return (
    <BottomSheet
      visible={info !== null}
      onClose={onClose}
      /* The sheet's own chrome stays on the APP's tokens, not the Values
         palette: it is a modal over the whole app, and a sheet that came
         up in a different colour language than every other sheet would
         read as a different app's dialog. */
      title={info?.title}
      closeLabel={tr('valInfoDone')}
    >
      <View style={styles.body}>
        <View style={[styles.valueRow, rtl && styles.rowRtl]}>
          <Text style={[styles.value, { color: t.textPrimary }]}>{info?.value ?? ''}</Text>
          {info?.unit ? (
            <Text
              style={[
                styles.unit,
                { color: t.textSecondary },
                rtl ? { marginRight: 6 } : { marginLeft: 6 },
              ]}
            >
              {info.unit}
            </Text>
          ) : null}
        </View>
        <Text style={[styles.text, { color: t.textSecondary, textAlign: align }]}>
          {info?.body ?? ''}
        </Text>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: { paddingBottom: 4 },
  rowRtl: { flexDirection: 'row-reverse' },
  valueRow: { flexDirection: 'row', alignItems: 'baseline' },
  /* Word-valued measurements land here too ("Slightly variable"), so the
     number must be allowed to shrink and wrap rather than print through
     the sheet's edge. */
  value: {
    flexShrink: 1,
    fontSize: 40,
    fontWeight: '700',
    letterSpacing: -1.5,
    fontVariant: ['tabular-nums'],
  },
  unit: { flexShrink: 0, fontSize: 14, fontWeight: '600' },
  text: { fontSize: 14, lineHeight: 21, marginTop: 12 },
});

// v0.59.0 — The Values screen's explainer sheet: what the quantity is, never
//           whether the value is good.
