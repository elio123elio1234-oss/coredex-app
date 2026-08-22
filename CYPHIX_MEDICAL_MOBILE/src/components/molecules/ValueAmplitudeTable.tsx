/* ==================================================================
   ValueAmplitudeTable (molecule) — per-lead wave voltages, redesigned.

   ══ WHAT CHANGED FROM `AmplitudeTable`, AND WHY ══
   The ported table put seven columns in a horizontally SCROLLING view,
   because seven legible columns do not fit 390 pt. That is a defensible
   answer for a clinician's report and a poor one here: a table you have
   to drag sideways to finish reading hides half its own content, and on
   this screen it was the only element that did not fit the phone.

   The handoff's answer is better and is what this draws: the numbers get
   one row, and the QRS peak-to-peak PROFILE — the thing a reader actually
   scans this table for — gets its own full-width bar underneath each row.
   Nothing scrolls sideways, and the shape across I → aVF is more visible
   than it was in a 96 pt column.

   The bar is still drawn on p-p ONLY. Six columns of competing bars would
   bury exactly the profile it exists to show.

   A voltage that could not be measured is "—", never 0.
   ================================================================== */

import { StyleSheet, Text, View, type DimensionValue } from 'react-native';
import { LIMB_LEAD_ORDER, type LeadAmplitudes, type LimbLeadName } from '@cyphix/shared';
import type { ValuesPalette } from '@/theme/valuesPalette';

interface Props {
  palette: ValuesPalette;
  amplitudes: Record<LimbLeadName, LeadAmplitudes>;
  labels: {
    lead: string;
    p: string;
    q: string;
    r: string;
    s: string;
    t: string;
    qrs: string;
    unit: string;
  };
}

const LEAD_COL = 32;
const PP_COL = 50;

const pct = (fraction: number): DimensionValue => `${fraction * 100}%` as DimensionValue;
const cell = (v: number | null | undefined): string => (v == null ? '—' : v.toFixed(2));

export default function ValueAmplitudeTable({ palette, amplitudes, labels }: Props) {
  /* The bar is relative to the LARGEST p-p in this recording, not to an
     absolute voltage: the point is the profile across the six leads. The
     floor stops a near-flat recording from drawing six full-width bars. */
  const peak = Math.max(0.1, ...LIMB_LEAD_ORDER.map((l) => amplitudes[l]?.qrsAmplitudeMv ?? 0));

  return (
    <View>
      <View style={[styles.headRow, { borderBottomColor: palette.hair }]}>
        <Text style={[styles.th, { width: LEAD_COL, color: palette.dim }]}>{labels.lead}</Text>
        {[labels.p, labels.q, labels.r, labels.s, labels.t].map((h) => (
          <Text key={h} style={[styles.th, styles.flexCol, styles.num, { color: palette.dim }]}>
            {h}
          </Text>
        ))}
        <Text style={[styles.th, styles.num, { width: PP_COL, color: palette.dim }]}>
          {labels.qrs}
        </Text>
      </View>

      {LIMB_LEAD_ORDER.map((lead) => {
        const a = amplitudes[lead];
        const qrs = a?.qrsAmplitudeMv ?? null;
        /* A measured-but-tiny voltage still gets a visible sliver; an
           unmeasurable one gets nothing at all, which is the difference
           this table exists to keep. */
        const width = qrs === null ? 0 : Math.max(0.02, qrs / peak);
        return (
          <View key={lead}>
            <View style={[styles.row, { borderBottomColor: palette.hair }]}>
              <Text style={[styles.lead, { width: LEAD_COL, color: palette.txt }]}>{lead}</Text>
              {[a?.pMv, a?.qMv, a?.rMv, a?.sMv, a?.tMv].map((v, i) => (
                <Text
                  key={i}
                  style={[
                    styles.td,
                    styles.flexCol,
                    styles.num,
                    /* R is the one the eye is meant to land on. */
                    i === 2 && styles.tdStrong,
                    { color: v == null ? palette.faint : palette.muted },
                    i === 2 && v != null ? { color: palette.txt } : null,
                  ]}
                >
                  {cell(v)}
                </Text>
              ))}
              <Text
                style={[
                  styles.td,
                  styles.tdStrong,
                  styles.num,
                  { width: PP_COL, color: qrs == null ? palette.faint : palette.blue },
                ]}
              >
                {cell(qrs)}
              </Text>
            </View>
            <View style={[styles.track, { backgroundColor: palette.track }]}>
              {width > 0 && (
                <View style={[styles.fill, { width: pct(width), backgroundColor: palette.blue }]} />
              )}
            </View>
          </View>
        );
      })}

      <Text style={[styles.note, { color: palette.faint }]}>{labels.unit}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  /* The lead name and the p-p column are fixed; the five wave columns
     share what is left. That is what lets seven columns fit 390 pt
     without any of them being unreadable. */
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  flexCol: { flex: 1 },
  th: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },
  td: { fontSize: 12.5, fontVariant: ['tabular-nums'] },
  tdStrong: { fontWeight: '600' },
  num: { textAlign: 'right' },
  /* The lead symbols (I, II, aVR…) are international and identical in
     every language, so this column never mirrors. */
  lead: { fontSize: 13, fontWeight: '700' },
  track: { height: 4, borderRadius: 99, overflow: 'hidden', marginBottom: 2 },
  fill: { height: '100%', borderRadius: 99 },
  note: { fontSize: 11.5, lineHeight: 16.5, marginTop: 10 },
});

// v0.59.0 — Seven columns that fit the phone, with the QRS peak-to-peak
//           profile as a full-width bar per row instead of a side-scroller.
