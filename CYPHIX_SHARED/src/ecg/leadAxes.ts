/* ==================================================================
   Limb-lead AXES — where each of the six leads looks from.

   ══ WHY THIS IS IN SHARED AND NOT IN THE VIEWER THAT NEEDS IT ══
   The first consumer is a 3-D heart on the web app's Insights tab, which
   turns to face whichever lead the reader picked. That makes these numbers
   look like camera settings, and they are not: the hexaxial reference
   system is the same fact that `ecgAnalysis` already leans on when it
   computes the frontal axis from the net QRS areas of I and aVF *because
   they are 0° and +90° apart*. That relationship is stated there in a
   comment and nowhere as a value. Here it is a value, once, so the phone's
   port of the same view cannot quietly disagree with it — and so a future
   axis-diagram, a vector loop, or a lead-placement teacher all measure
   from one origin.

   ══ THE CONVENTION, WRITTEN DOWN ══
   Degrees are the clinical hexaxial ones: 0° points at the patient's LEFT
   (lead I), and POSITIVE ROTATES DOWNWARD, toward the feet, so aVF is +90°
   and aVR is −150°. That "positive is clockwise on the page" sign is the
   one most often lost in a port, which is why the unit vector below is
   given as well as the angle.

   The vector frame is anatomical and right-handed:

       +x → the patient's LEFT        (so lead I is +x)
       +y → SUPERIOR, toward the head (so aVF, pointing at the feet, is −y)
       +z → ANTERIOR, out of the chest

   The limb leads all live in the FRONTAL plane, so z is 0 for all six —
   that is the definition of a limb lead, not a simplification. A
   precordial lead would not be expressible here, which is correct: V1–V6
   are not measured by this device (see `PRECORDIAL_LEADS_ENABLED` on the
   web and the ECG ID's lead grid), and when they are, they get their own
   table with a real z.
   ================================================================== */

import { LIMB_LEAD_ORDER, type LimbLeadName } from '../types/ecg';

/**
 * The hexaxial angle of each limb lead's POSITIVE pole, in degrees.
 *
 * These are the textbook values, not a fit to anything measured: a lead's
 * axis is defined by where its electrodes sit, and this device's electrodes
 * sit where the standard says they do.
 */
export const LIMB_LEAD_AXIS_DEG: Readonly<Record<LimbLeadName, number>> = {
  I: 0,
  II: 60,
  III: 120,
  aVR: -150,
  aVL: -30,
  aVF: 90,
} as const;

/** A unit vector in the anatomical frame described above. */
export interface LeadAxisVector {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/**
 * The unit vector along a lead's positive pole.
 *
 * `y` is negated because the hexaxial angle grows DOWNWARD while the
 * anatomical frame's +y is up. One sign, and it is the whole reason this
 * helper exists rather than a `Math.cos`/`Math.sin` at each call site.
 */
export function limbLeadAxisVector(lead: LimbLeadName): LeadAxisVector {
  const rad = (LIMB_LEAD_AXIS_DEG[lead] * Math.PI) / 180;
  return { x: Math.cos(rad), y: -Math.sin(rad), z: 0 };
}

/**
 * Which electrodes a lead is actually read from.
 *
 * A bipolar lead is a DIFFERENCE between two electrodes; an augmented lead
 * is one electrode against the average of the other two. A picture of a
 * lead that draws aVF as a line between two dots is drawing a lead that
 * does not exist, so the two cases are typed differently rather than
 * flattened into "a pair, sometimes".
 */
export type LimbElectrode = 'RA' | 'LA' | 'LL';

export type LeadElectrodes =
  | { readonly kind: 'bipolar'; readonly negative: LimbElectrode; readonly positive: LimbElectrode }
  | { readonly kind: 'augmented'; readonly positive: LimbElectrode };

export const LIMB_LEAD_ELECTRODES: Readonly<Record<LimbLeadName, LeadElectrodes>> = {
  I: { kind: 'bipolar', negative: 'RA', positive: 'LA' },
  II: { kind: 'bipolar', negative: 'RA', positive: 'LL' },
  III: { kind: 'bipolar', negative: 'LA', positive: 'LL' },
  aVR: { kind: 'augmented', positive: 'RA' },
  aVL: { kind: 'augmented', positive: 'LA' },
  aVF: { kind: 'augmented', positive: 'LL' },
} as const;

/** Re-exported for callers that iterate the table. */
export { LIMB_LEAD_ORDER };

// v1.0.0 — The hexaxial axes of the six limb leads, with the sign
//          convention and the anatomical frame written down, plus which
//          electrodes each lead is read from. First consumed by the web
//          Insights heart; the mobile port reads the same table.
