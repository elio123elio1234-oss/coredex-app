/* ==================================================================
   leadCalibration — separate WHERE THE PADS WERE from WHAT THE HEART DID.

   ══ THE PROBLEM THIS FILE EXISTS TO SOLVE ══
   The hardware measures two channels, I and II, and derives the other
   four limb leads from them (`deriveLeads`):

       III = II − I        aVR = −(I + II)/2
       aVL = I − II/2      aVF = II − I/2

   Every derived lead is therefore a LINEAR COMBINATION of the two
   measured ones. That has a consequence nobody notices until they look
   at real serial data: if the patient sticks the pads two centimetres
   from where they stuck them last week, I and II each pick up a slightly
   different projection of the same heart vector — a different GAIN each.
   Lead I and lead II still correlate ~0.99 with their own baselines,
   because Pearson correlation is invariant to gain. But III = II − I is
   a DIFFERENCE of two channels whose gains moved apart, so its shape
   genuinely changes, and its correlation collapses.

   That is the signature the panel was reporting: `Shape · 3 leads` while
   the two MEASURED leads stayed silent. Three derived leads screaming,
   two measured leads fine, and an amplitude change on exactly the two
   channels the hardware actually records. It is not a heart finding. It
   is where the pads were.

   ══ ⚠️ THE SAFETY ARGUMENT — READ THIS BEFORE CHANGING ANYTHING ⚠️ ══
   A change in electrode position and a change in the heart's electrical
   AXIS produce the SAME first-order effect: a linear remap of the (I, II)
   pair. They are not separable from the waveform alone — no amount of
   maths distinguishes "the pad moved 2 cm" from "the axis rotated 15°".

   So this file must not, and does not, decide which one happened. What it
   does is narrower and safe:

     • It fits the linear remap and uses it ONLY to answer "is this the
       same BEAT SHAPE" — the question that decides whether a study is
       allowed to shape the baseline. For that question, placement is a
       nuisance parameter and must be divided out, or the baseline ends up
       built from whichever sessions happened to share a pad position.

     • It NEVER suppresses the clinical content of the remap. The frontal
       AXIS is still measured independently by the DSP (`analyseLimbEcg`)
       and still reported as an `axis` deviation in degrees; the gain is
       still reported as an `amplitude` deviation in mV. A reader who
       needs to know the axis moved is told, by the measurement that was
       designed to tell them — not by a shape score that cannot say why.

   Removing the nuisance from the WEIGHTING while leaving it in the
   REPORTING is the whole design. Applying this correction to the
   deviations themselves would hide a real axis change, and would be a
   defect of the most dangerous kind: one that makes the screen quieter.

   ══ IT IS SELF-LIMITING, AND IT SAYS SO ══
   A fit is accepted only when it is (a) physically plausible as a
   placement change — bounded rotation, bounded gain, no reflection, no
   extreme anisotropy — and (b) actually helps by a stated margin. If the
   studies differ for a reason a remap cannot explain, every fit is
   rejected, `applied` is false, and the identity behaves exactly as it
   did before this file existed. That property is deliberate: it means
   shipping this cannot make anything worse, and `improvement` on each
   study is the evidence for whether the placement hypothesis was right
   for THIS patient at all.
   ================================================================== */

import { correlate, TEMPLATE_SAMPLES } from './beatTemplate';
import { LIMB_LEAD_ORDER, type EcgLeadName, type LimbLeadName } from '../types/ecg';
import type { BeatTemplate } from '../types/ecgIdentity';

/* ══════════════════ Plausibility bounds, named and justified ══════════════════ */

/**
 * How far the implied frontal rotation may go before the fit is refused.
 *
 * Pad displacement of a few centimetres moves the effective lead axes by
 * a handful of degrees; 35° is generous for that and still far below the
 * rotation a genuine conduction change produces. Beyond it the "remap" is
 * no longer describing a placement difference, it is describing a
 * different heart, and dividing it out would be exactly the hiding this
 * file's header forbids.
 */
const MAX_ROTATION_DEG = 35;

/** Overall gain the fit may absorb. Contact quality moves this, not much else. */
const MIN_SCALE = 0.6;
const MAX_SCALE = 1.7;

/**
 * How anisotropic the stretch may be (largest singular value / smallest).
 *
 * A placement change scales the two axes by SIMILAR amounts. A fit that
 * squashes one direction to a third of the other is not a placement
 * model — it is a least-squares solution abusing its freedom to flatten a
 * disagreement it cannot otherwise explain.
 */
const MAX_ANISOTROPY = 2;

/**
 * The fit must buy at least this much mean per-lead correlation.
 *
 * Below it, the remap is fitting noise: it will always improve the number
 * a little, because four free parameters always can. Requiring a real
 * margin is what keeps `applied` an honest flag rather than a formality.
 */
const MIN_IMPROVEMENT = 0.01;

/** Below this the normal equations are singular — a flat or absent channel. */
const MIN_PIVOT = 1e-9;

/* ══════════════════ The Einthoven ⇄ Cartesian basis ══════════════════
   Lead I points at 0° in the frontal plane and lead II at 60°, so the
   pair (I, II) is an OBLIQUE coordinate system. A rotation looks like a
   shear in it, which makes "how many degrees did this move" unanswerable
   until the transform is expressed in an orthogonal basis.

     x = I                       (the 0° axis)
     y = (2·II − I) / √3         (the 90° axis — this is aVF's direction)

   `E` maps (I, II) → (x, y); `E_INV` maps back. A transform A written in
   the (I, II) basis becomes C = E·A·E⁻¹ in Cartesian, and only THERE do
   "rotation" and "scale" mean what the words say. */
const SQRT3 = Math.sqrt(3);
const E = [1, 0, -1 / SQRT3, 2 / SQRT3] as const;
const E_INV = [1, 0, 0.5, SQRT3 / 2] as const;

type Mat2 = [number, number, number, number];

/** Row-major 2×2 multiply. */
function mul(a: readonly number[], b: readonly number[]): Mat2 {
  return [
    a[0] * b[0] + a[1] * b[2],
    a[0] * b[1] + a[1] * b[3],
    a[2] * b[0] + a[3] * b[2],
    a[2] * b[1] + a[3] * b[3],
  ];
}

/* ══════════════════ What a fit reports ══════════════════ */

export interface ChannelTransform {
  /**
   * Row-major 2×2 mapping the STUDY's (I, II) onto the baseline's.
   * Identity when nothing was applied, so callers never branch on null.
   */
  m: Mat2;
  /** Implied frontal-plane rotation, degrees. Positive = counter-clockwise. */
  rotationDeg: number;
  /** Implied overall gain, √det. 1.0 = unchanged. */
  scale: number;
  /** Mean per-lead correlation the fit bought: r_after − r_before. */
  improvement: number;
  /** True only when the fit was plausible AND helped. See the header. */
  applied: boolean;
}

/** The no-op transform: what every rejected fit collapses to. */
export const IDENTITY_TRANSFORM: ChannelTransform = {
  m: [1, 0, 0, 1],
  rotationDeg: 0,
  scale: 1,
  improvement: 0,
  applied: false,
};

/* ══════════════════ The fit ══════════════════ */

/**
 * Least squares for `a·x + b·y ≈ t` over two sample vectors.
 *
 * Two unknowns, so the normal equations are a 2×2 solved by Cramer — no
 * matrix library, no iteration, no failure mode more interesting than a
 * singular pivot (a dead channel), which returns null rather than a
 * plausible-looking division by nearly zero.
 */
function solve2(
  x: Float32Array,
  y: Float32Array,
  t: Float32Array,
  n: number,
): [number, number] | null {
  let xx = 0;
  let xy = 0;
  let yy = 0;
  let xt = 0;
  let yt = 0;
  for (let i = 0; i < n; i++) {
    const xi = x[i];
    const yi = y[i];
    const ti = t[i];
    xx += xi * xi;
    xy += xi * yi;
    yy += yi * yi;
    xt += xi * ti;
    yt += yi * ti;
  }
  const det = xx * yy - xy * xy;
  if (!Number.isFinite(det) || Math.abs(det) < MIN_PIVOT) return null;
  return [(xt * yy - yt * xy) / det, (yt * xx - xt * xy) / det];
}

/** Mean per-lead correlation of a lead set against a baseline lead set. */
function meanR(
  leads: Partial<Record<EcgLeadName, Float32Array>>,
  baseline: Partial<Record<EcgLeadName, Float32Array>>,
): number {
  let sum = 0;
  let n = 0;
  for (const name of Object.keys(leads) as EcgLeadName[]) {
    const a = leads[name];
    const b = baseline[name];
    if (!a || !b) continue;
    sum += correlate(a, b);
    n++;
  }
  return n > 0 ? sum / n : 0;
}

/**
 * Fit the linear channel remap that best carries `study` onto `baseline`.
 *
 * Returns `IDENTITY_TRANSFORM` — not null — whenever the fit is refused,
 * so every caller can apply the result unconditionally and the "we did
 * nothing" path is the same code path as the "we did something" one.
 */
export function fitChannelTransform(
  study: Partial<Record<EcgLeadName, BeatTemplate>>,
  baseline: Partial<Record<EcgLeadName, Float32Array>>,
): ChannelTransform {
  const sI = study.I?.samples;
  const sII = study.II?.samples;
  const bI = baseline.I;
  const bII = baseline.II;
  // The fit lives on the two MEASURED channels. Without both there is no
  // channel pair to remap, and fitting on derived leads would be fitting
  // on data that is already a function of the thing being fitted.
  if (!sI || !sII || !bI || !bII) return IDENTITY_TRANSFORM;

  const n = Math.min(sI.length, sII.length, bI.length, bII.length, TEMPLATE_SAMPLES);
  if (n < 8) return IDENTITY_TRANSFORM;

  const row1 = solve2(sI, sII, bI, n);
  const row2 = solve2(sI, sII, bII, n);
  if (!row1 || !row2) return IDENTITY_TRANSFORM;

  const m: Mat2 = [row1[0], row1[1], row2[0], row2[1]];
  const det = m[0] * m[3] - m[1] * m[2];
  // A negative determinant is a REFLECTION — it maps the heart vector to
  // its mirror image. Electrodes swapped left-for-right can do that, and
  // it is worth seeing on the screen, not worth silently undoing.
  if (!Number.isFinite(det) || det <= 0) return IDENTITY_TRANSFORM;

  /* Rotation, scale and anisotropy are read off the CARTESIAN form —
     see the basis note above. In the oblique (I, II) basis these three
     words do not mean what they say. */
  const c = mul(mul(E, m), E_INV);
  const p = Math.hypot(c[0] + c[3], c[2] - c[1]) / 2; // rotational part
  const q = Math.hypot(c[0] - c[3], c[2] + c[1]) / 2; // shear/stretch part
  const s1 = p + q;
  const s2 = Math.abs(p - q);
  const rotationDeg = (Math.atan2(c[2] - c[1], c[0] + c[3]) * 180) / Math.PI;
  const scale = Math.sqrt(det);

  const plausible =
    Math.abs(rotationDeg) <= MAX_ROTATION_DEG &&
    scale >= MIN_SCALE &&
    scale <= MAX_SCALE &&
    s2 > MIN_PIVOT &&
    s1 / s2 <= MAX_ANISOTROPY;

  if (!plausible) return { ...IDENTITY_TRANSFORM, rotationDeg, scale };

  /* ── Did it actually help? ──────────────────────────────────────
     Measured over every lead the study and the baseline share, INCLUDING
     the derived ones — those are the leads the whole problem shows up in,
     so leaving them out of the acceptance test would test the fit on the
     two leads that were never broken. */
  const before = meanR(
    Object.fromEntries(
      (Object.keys(study) as EcgLeadName[]).map((k) => [k, study[k]?.samples]),
    ) as Partial<Record<EcgLeadName, Float32Array>>,
    baseline,
  );
  const after = meanR(applyChannelTransform(study, m), baseline);
  const improvement = after - before;

  return {
    m,
    rotationDeg,
    scale,
    improvement,
    applied: improvement >= MIN_IMPROVEMENT,
  };
}

/* ══════════════════ Applying it ══════════════════ */

/**
 * The study's leads as they would have been measured with the baseline's
 * channel geometry.
 *
 * The limb leads are RE-DERIVED from the corrected (I, II) rather than
 * transformed one by one, and that is exact rather than an approximation:
 * they are defined as linear functions of the pair, so correcting the
 * pair and re-deriving gives the same answer the hardware would have
 * given. Any lead that is NOT a function of (I, II) — a future V1–V6 —
 * passes through untouched, because this transform says nothing about the
 * horizontal plane and pretending otherwise would invent data.
 */
export function applyChannelTransform(
  study: Partial<Record<EcgLeadName, BeatTemplate>>,
  m: Mat2,
): Partial<Record<EcgLeadName, Float32Array>> {
  const sI = study.I?.samples;
  const sII = study.II?.samples;
  const out: Partial<Record<EcgLeadName, Float32Array>> = {};

  for (const name of Object.keys(study) as EcgLeadName[]) {
    const t = study[name];
    if (t) out[name] = t.samples;
  }
  if (!sI || !sII) return out;

  const n = Math.min(sI.length, sII.length);
  const cI = new Float32Array(n);
  const cII = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    cI[i] = m[0] * sI[i] + m[1] * sII[i];
    cII[i] = m[2] * sI[i] + m[3] * sII[i];
  }

  const derived: Record<LimbLeadName, Float32Array> = {
    I: cI,
    II: cII,
    III: new Float32Array(n),
    aVR: new Float32Array(n),
    aVL: new Float32Array(n),
    aVF: new Float32Array(n),
  };
  for (let i = 0; i < n; i++) {
    derived.III[i] = cII[i] - cI[i];
    derived.aVR[i] = -(cI[i] + cII[i]) / 2;
    derived.aVL[i] = cI[i] - cII[i] / 2;
    derived.aVF[i] = cII[i] - cI[i] / 2;
  }

  // Only overwrite the limb leads the study actually carried — a study
  // that never recorded aVL must not acquire one here.
  for (const name of LIMB_LEAD_ORDER) {
    if (study[name]) out[name] = derived[name];
  }
  return out;
}

// v1.0.0 — Fits and applies the linear (I, II) channel remap that electrode
//          displacement produces, so a pad moved 2 cm stops reading as a shape
//          change in the three DERIVED leads while the two measured ones sit
//          silent. Used ONLY to decide whether a study may shape the baseline;
//          the clinical content of the remap — axis in degrees, amplitude in mV
//          — is still measured and reported independently, because a placement
//          change and an axis change are not separable from the waveform and
//          this layer may not pretend otherwise. Self-limiting: an implausible
//          or unhelpful fit is refused and the identity behaves as if this file
//          did not exist.
