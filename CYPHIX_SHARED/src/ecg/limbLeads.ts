/* ==================================================================
   limbLeads — raw measured channels in, the six limb leads out.

   Every place that opens a limb recording (the end-of-exam report, the
   History viewer, the PDF, the list digest) used to spell out the same
   three lines: decode, clamp to the shorter channel, loop `deriveLeads`.
   With a second copy of Lead II there is now a DECISION inside that loop
   — fuse the copies or not — and a decision spelled out in five places is
   five chances for the list, the viewer and the printout to describe the
   same recording differently. So it lives here, once.

   Nothing frozen is touched: `deriveLeads` is called exactly as before,
   only with a Lead II that may have been fused first (leadFusion.ts).
   A recording with no second copy goes straight through, bit for bit.

   ⚠️ LIMB RECORDINGS ONLY. In the chest protocol the probe electrode moves
   from V1 to V6 while the second left-leg electrode stays on the leg, so
   the two "copies" are different leads there. Chest code must keep calling
   `deriveLeads` / `reportFilterLead` on `leadII` directly.
   ================================================================== */

import { deriveLeads } from './ecgDSP';
import { fuseLeadII, type LeadFusionInfo, type LeadFusionOptions } from './leadFusion';
import { LIMB_LEAD_ORDER, type LimbLeadName, type MeasurementType } from '../types/ecg';

/**
 * May a stored recording of this type have its two Lead II copies fused?
 *
 * Everything except a chest capture. The stored channels of a 'limb' AND of a
 * '12lead' recording both come from the limb measurement (the 12-lead flow
 * files its limb capture under '12lead'; chest captures are never persisted),
 * so in both the two copies are the same lead. Asking "is it 'limb'?" instead
 * made the end-of-exam report fuse a 12-lead capture while History showed the
 * same recording unfused.
 */
export function recordingAllowsFusion(type: MeasurementType): boolean {
  return type !== 'chest';
}

export interface LimbLeadsOptions {
  /** Fuse the two Lead II copies when a second one exists. Default true. */
  fusion?: boolean;
  fusionOptions?: LeadFusionOptions;
}

export interface LimbLeadsFromRaw {
  /** The six limb leads, RAW domain (nothing filtered yet), `samples` long. */
  leads: Record<LimbLeadName, Float32Array>;
  samples: number;
  /** True when the recording carries a second Lead II copy at all — i.e. when
      offering the fusion switch makes sense. */
  hasSecondCopy: boolean;
  /**
   * What the fusion did. `null` = it was not attempted (no second copy, or
   * switched off). Non-null with `mode: 'single'` = it was attempted and
   * declined — `fallback` says why — and Lead II is the plain first copy.
   */
  fusion: LeadFusionInfo | null;
}

export function limbLeadsFromRaw(
  rawLeadI: Float32Array,
  rawLeadII: Float32Array,
  rawLeadIIb: Float32Array | null | undefined,
  sampleRate: number,
  options: LimbLeadsOptions = {},
): LimbLeadsFromRaw {
  const hasSecondCopy = !!rawLeadIIb && rawLeadIIb.length > 0;
  const n = Math.min(rawLeadI.length, rawLeadII.length, hasSecondCopy ? rawLeadIIb!.length : Infinity);

  let leadII = rawLeadII.length === n ? rawLeadII : rawLeadII.subarray(0, n);
  let fusion: LeadFusionInfo | null = null;
  if (hasSecondCopy && (options.fusion ?? true)) {
    const result = fuseLeadII(leadII, rawLeadIIb!.subarray(0, n), sampleRate, options.fusionOptions);
    leadII = result.fused;
    fusion = result.info;
  }

  const leads = {} as Record<LimbLeadName, Float32Array>;
  for (const lead of LIMB_LEAD_ORDER) leads[lead] = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const s = deriveLeads(rawLeadI[i], leadII[i]);
    for (const lead of LIMB_LEAD_ORDER) leads[lead][i] = s[lead];
  }
  return { leads, samples: n, hasSecondCopy, fusion };
}

// v1.1.0 — `recordingAllowsFusion`: the recording-type rule, stated once ('chest' is the only no).
// v1.0.0 — One place that turns raw channels into six leads, so the optional
//          Lead II fusion is decided once and not per call site.
