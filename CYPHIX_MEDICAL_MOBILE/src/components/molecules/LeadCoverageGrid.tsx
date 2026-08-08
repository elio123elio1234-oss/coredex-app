/* ==================================================================
   LeadCoverageGrid (molecule) — how much evidence stands behind each
   lead of the ECG ID, INCLUDING the leads that have never been measured.

        I ·12   II ·12   III ·12   aVR ·12  aVL ·12  aVF ·12
        V1  —   V2  —    V3  —     V4  —    V5  —    V6  —

   ══ THE EMPTY CELLS ARE THE FEATURE ══
   A coverage table that listed only what exists would show six confident
   leads and say nothing at all — the reader would have to already know
   that a limb-lead device cannot produce V1. Printing all twelve, with the
   precordial ones explicitly empty, states the shape of the record: this
   is a six-lead identity, and the other six are not missing data, they
   are un-measured territory.

   It is also the seam the 12-lead hardware arrives through. Nothing in
   this component knows how many leads the device has — it renders the
   coverage rows the identity produced. When a study starts carrying
   V1–V6 those six cells fill in on their own.

   ══ THE COUNT IS SHOWN PER LEAD, NOT ONCE ══
   Because they genuinely differ. A patient with thirty limb studies and
   two 12-lead ones has a lead II baseline worth leaning on and a V3
   baseline that is barely more than one recording — and the numbers on
   the cells are the only place that is visible.

   Purely presentational.
   ================================================================== */

import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { LeadCoverage } from '@cyphix/shared';
import { RADIUS } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

interface Props {
  coverage: readonly LeadCoverage[];
  /** The lead currently drawn in the signature card, highlighted here. */
  selected?: string | null;
  onSelect?: (lead: string) => void;
  /** Shown in a cell with no studies. */
  emptyMark?: string;
  rtl?: boolean;
}

export default function LeadCoverageGrid({
  coverage,
  selected,
  onSelect,
  emptyMark = '—',
  rtl,
}: Props) {
  const t = useTheme();

  return (
    <View style={[styles.grid, rtl && styles.gridRtl]}>
      {coverage.map((row) => {
        const has = row.studies > 0;
        const active = has && row.lead === selected;
        const tappable = has && Boolean(onSelect);
        return (
          <Pressable
            key={row.lead}
            accessibilityRole={tappable ? 'button' : 'text'}
            accessibilityState={{ selected: active, disabled: !tappable }}
            accessibilityLabel={`${row.lead}: ${has ? row.studies : emptyMark}`}
            disabled={!tappable}
            onPress={() => {
              void Haptics.selectionAsync();
              onSelect?.(row.lead);
            }}
            style={({ pressed }) => [
              styles.cell,
              {
                backgroundColor: active ? t.accentSoft : t.bgSoft,
                borderColor: active ? t.accent : t.border,
                opacity: has ? (pressed ? 0.6 : 1) : 0.55,
              },
            ]}
          >
            <Text
              style={[styles.lead, { color: has ? t.textPrimary : t.textTertiary }]}
              allowFontScaling={false}
            >
              {row.lead}
            </Text>
            <Text
              style={[styles.count, { color: has ? t.textSecondary : t.textTertiary }]}
              allowFontScaling={false}
            >
              {has ? row.studies : emptyMark}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  /* Wrapping row rather than a fixed 6-column grid: the day a 15-lead or a
     3-lead set exists, the layout is already right. */
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  gridRtl: { flexDirection: 'row-reverse' },
  cell: {
    /* 44 pt, not 52: twelve leads want to land as two rows of SIX (the
       limb block over the precordial block, which is how a 12-lead sheet
       is printed). At 52 the sixth cell no longer fits inside a card on a
       390 pt phone and the rows break 5 · 5 · 2, which reads as an
       arbitrary grouping of leads. 44 is still above the 44 pt minimum
       tap target. */
    minWidth: 44,
    flexGrow: 1,
    flexBasis: '14%',
    alignItems: 'center',
    gap: 1,
    paddingVertical: 8,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
  },
  lead: { fontSize: 12.5, fontWeight: '800', letterSpacing: 0.3 },
  count: { fontSize: 11, fontVariant: ['tabular-nums'] },
});

// v1.0.0 — Per-lead evidence for the ECG ID across all twelve leads, with the
//          never-measured ones printed empty rather than omitted.
