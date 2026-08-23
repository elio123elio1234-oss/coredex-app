/* ==================================================================
   LeadCoverageGrid (molecule) — how much evidence stands behind each
   lead of the ECG ID, INCLUDING the leads that have never been measured.

        I ·12   II ·12   III ·12   aVR ·12  aVL ·12  aVF ·12
        V1  —   V2  —    V3  —     V4  —    V5  —    V6  —

   ══ THE EMPTY CELLS WERE THE FEATURE, AND ARE NOW OPT-IN (v0.62.0) ══
   The original argument: a table listing only what exists shows six
   confident leads and says nothing about the SHAPE of the record — the
   reader would have to already know that a limb-lead device cannot produce
   V1. Printing all twelve with the precordial ones explicitly empty says
   "this is a six-lead identity, and the other six are not missing data,
   they are un-measured territory".

   That is a good argument addressed to a clinician, and the wrong one for
   the person whose heart it is. Reported: *"you can hide V1–V6 completely,
   because there won't be any."* On a patient's screen six permanently grey
   cells are not territory, they are six things that look broken, on a
   device that is never going to fill them. `hideEmpty` drops any lead with
   no studies behind it.

   The 12-lead seam is untouched and is the reason this is a PROP rather
   than a filter at the call site: nothing in this component knows how many
   leads the hardware has, it renders the coverage rows the identity
   produced. Flip `PRECORDIAL_LEADS_ENABLED` and the six cells reappear —
   empty at first, then filling in on their own as studies arrive.

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
  /**
   * Drop every lead with no studies behind it instead of drawing it empty.
   *
   * ⚠️ Deliberately "has no studies" and not "is precordial": a limb lead
   * that somehow produced nothing is exactly as unhelpful to show as V1,
   * and hard-coding the six names here would put the lead set in two
   * places — this file and the hardware — which is the shape drift takes.
   */
  hideEmpty?: boolean;
  rtl?: boolean;
}

export default function LeadCoverageGrid({
  coverage,
  selected,
  onSelect,
  emptyMark = '—',
  hideEmpty = false,
  rtl,
}: Props) {
  const t = useTheme();
  const rows = hideEmpty ? coverage.filter((c) => c.studies > 0) : coverage;

  return (
    <View style={[styles.grid, rtl && styles.gridRtl]}>
      {rows.map((row) => {
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
            /* Only the SELECTED cell is drawn as a control. Twelve
               bordered boxes read as a form to fill in; eleven quiet
               labels and one lit cell read as a picker, which is what it
               is. An un-measured lead has no fill at all — it is not a
               button, and it should not look like one. */
            style={({ pressed }) => [
              styles.cell,
              {
                backgroundColor: active ? t.accentSoft : has ? t.bgSoft : 'transparent',
                borderColor: active ? t.accent : 'transparent',
                opacity: has ? (pressed ? 0.6 : 1) : 0.45,
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
    paddingVertical: 7,
    borderRadius: RADIUS.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
  lead: { fontSize: 12.5, fontWeight: '800', letterSpacing: 0.3 },
  count: { fontSize: 10.5, fontVariant: ['tabular-nums'] },
});

// v1.2.0 — `hideEmpty` drops the never-measured leads instead of drawing
//          them. The empty cells were a clinician's argument about the shape
//          of the record; on a patient's screen six permanently grey cells
//          read as six broken things. The 12-lead seam survives as a prop.
// v1.1.0 — Only the selected cell is drawn as a control. Twelve bordered boxes
//          read as a form; one lit cell among quiet labels reads as a picker.
// v1.0.0 — Per-lead evidence for the ECG ID across all twelve leads, with the
//          never-measured ones printed empty rather than omitted.
