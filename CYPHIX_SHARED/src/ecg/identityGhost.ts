/* ==================================================================
   identityGhost — lay the patient's REPRESENTATIVE BEAT over a strip.

   ══ THE IDEA ══
   The viewer can already ghost one study behind another (`ecgAlign`,
   `useOverlayRecording`), and that answers "how does this recording
   compare with that one". It cannot answer the question a reader asks far
   more often:

       "Is this recording like ME?"

   The ECG ID is exactly that reference — one beat, averaged out of every
   clean study the patient has, with the noise cancelled. Comparing a
   strip against ONE prior study compares it against that study's noise as
   well; comparing it against the identity compares it against the signal
   that survived twenty of them. It is the better reference and it was
   sitting one screen away, unusable from the place people actually look
   at waveforms.

   ══ HOW A SINGLE BEAT BECOMES A 30-SECOND GHOST ══
   By being STAMPED at each of the foreground's own R peaks:

     foreground   ─╮╭──────╮╭──────╮╭────────╮╭──
                   ││      ││      ││        ││
     R peaks       ▲        ▲       ▲         ▲
     identity      ╿        ╿       ╿         ╿      one template,
                   ╰────────┴───────┴─────────╯      drawn at each

   ★ Alignment is therefore EXACT BY CONSTRUCTION, and that is the deep
   difference from a study-vs-study ghost. There is no beat-shift to
   accumulate error and no fiducial warp to distort intervals — the three
   alignment modes exist because two recordings have two independent
   timelines, and this ghost has none of its own. Every beat lands on its
   own R peak because that is where it was put.

   ⚠️ WHICH ALSO MEANS: THE GHOST'S TIMING IS THE FOREGROUND'S.
   A reader must not measure an RR interval off it, because the RR they
   would be measuring is the one they can already read off the trace
   underneath. What the ghost carries is SHAPE — P, QRS, ST, T — and the
   UI has to say so. A ghost silently supplying its own rhythm would be
   the most misleading thing in this application; a ghost that borrows the
   rhythm and says it borrowed it is a magnifying glass.

   ══ WHY EACH STAMP IS LEVELLED TO THE TRACE UNDER IT ══
   The template is isoelectric at zero: `beatTemplate` levels every beat on
   its own PR segment before averaging. A real strip is not — the filter
   legitimately leaves some baseline wander behind. Stamping at a flat zero
   would float the whole ghost above or below the trace and the reader
   would spend the comparison correcting for an offset that is an artefact
   of the drawing. So each stamp is shifted onto the local isoelectric
   measured from the FOREGROUND, in the same PR window the template used.

   ══ AND WHY THE GAPS ARE FLAT ══
   The template spans −250…+450 ms around R. At an ordinary rate that
   leaves a gap before the next beat's window opens, and the honest thing
   to draw there is the isoelectric line — which is what a TP segment
   actually is. Nothing is invented: the flat run is the baseline the stamp
   either side of it was levelled onto.
   ================================================================== */

import { TEMPLATE_FS, TEMPLATE_PRE_SAMPLES, TEMPLATE_SAMPLES } from './beatTemplate';
import type { EcgLeadName } from '../types/ecg';
import type { EcgIdentity } from '../types/ecgIdentity';

/**
 * ★ The sentinel the viewer uses in place of a recording id.
 *
 * The comparison overlay is addressed by recording id and persisted in
 * `ViewerSettings`, so "compare with my baseline" needs an id that cannot
 * collide with one. Underscored on both sides for the same reason a
 * database uses a reserved prefix: it must be impossible for a real
 * recording to be mistaken for it, and obvious in a persisted settings
 * blob what it is.
 */
export const IDENTITY_OVERLAY_ID = '__ecg-id__';

/** The PR window each stamp's level is taken from — `beatTemplate`'s own. */
const ISO_FROM_MS = 200;
const ISO_TO_MS = 120;

function medianOf(values: number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/**
 * One template sample, read at an arbitrary position on the target's grid.
 *
 * Linear, and only ever actually interpolating when a recording was made
 * at something other than the hardware's own rate — our own 320 Hz data
 * lands on the canonical grid exactly, so the common path costs one
 * comparison and no invented resolution.
 */
function sampleTemplate(template: Float32Array, offsetFromR: number, ratio: number): number {
  const pos = TEMPLATE_PRE_SAMPLES + offsetFromR * ratio;
  if (pos <= 0) return template[0] ?? 0;
  if (pos >= TEMPLATE_SAMPLES - 1) return template[TEMPLATE_SAMPLES - 1] ?? 0;
  const i0 = Math.floor(pos);
  const w = pos - i0;
  return template[i0] * (1 - w) + template[i0 + 1] * w;
}

export interface IdentityGhost {
  /** Ghost leads on the foreground's own timeline, ready to draw. */
  leads: Partial<Record<EcgLeadName, Float32Array>>;
  /** Beats the template was stamped onto — the foreground's R peaks used. */
  beatsStamped: number;
  /** Leads the identity could supply. Empty means nothing to draw. */
  leadsCovered: EcgLeadName[];
  /**
   * ★ True when the beats are closer together than the template is long.
   *
   * The template spans 700 ms (−250…+450 around R). Above about 130 bpm
   * the RR interval is shorter than that, so neighbouring stamps overlap
   * and the midpoint clip necessarily TRUNCATES each beat — the tail of
   * the T wave and the head of the next P are cut off. There is no way
   * around it: you cannot draw a 700 ms beat every 430 ms.
   *
   * Measured, not assumed: across 45–100 bpm the ghost tracks the strip
   * it is laid over to within 0.04 mV, and at 140 bpm that becomes
   * 0.30 mV, entirely in the truncated region. A reader comparing T waves
   * on a tachycardic strip would see a difference the drawing invented.
   *
   * So the UI has to say so. This is the flag; `ovIdCrowded` is the
   * sentence. Drawing it silently is the failure mode this whole codebase
   * is written against.
   */
  crowded: boolean;
}

/**
 * Build the ghost: the identity's representative beat, repeated at every
 * R peak of the strip it is being laid over.
 *
 * `reference` is the FOREGROUND's own filtered leads — read only, and only
 * to find the local isoelectric each stamp is levelled onto. Passing the
 * ghost's own leads there instead would level it onto itself, which is a
 * no-op dressed as a correction.
 */
export function stampIdentityBeats(
  identity: EcgIdentity,
  reference: Partial<Record<EcgLeadName, Float32Array>>,
  rPeaks: readonly number[],
  length: number,
  sampleRate: number,
): IdentityGhost {
  const leads: Partial<Record<EcgLeadName, Float32Array>> = {};
  const leadsCovered: EcgLeadName[] = [];
  if (length <= 0 || sampleRate <= 0 || rPeaks.length === 0) {
    return { leads, beatsStamped: 0, leadsCovered, crowded: false };
  }

  /** Target samples per template sample. 1.0 on our own hardware. */
  const ratio = TEMPLATE_FS / sampleRate;
  const ms = (v: number) => Math.round((v / 1000) * sampleRate);
  const pre = Math.round(TEMPLATE_PRE_SAMPLES / ratio);
  const post = Math.round((TEMPLATE_SAMPLES - 1 - TEMPLATE_PRE_SAMPLES) / ratio);
  const isoFrom = ms(ISO_FROM_MS);
  const isoTo = ms(ISO_TO_MS);
  // The same window on the TEMPLATE's own grid, which is fixed at TEMPLATE_FS.
  const templateIsoFrom = Math.round((ISO_FROM_MS / 1000) * TEMPLATE_FS);
  const templateIsoTo = Math.round((ISO_TO_MS / 1000) * TEMPLATE_FS);

  for (const name of Object.keys(identity.leads) as EcgLeadName[]) {
    const source = identity.leads[name];
    const under = reference[name];
    if (!source || !under) continue;

    /* ★ THE TEMPLATE'S OWN ISOELECTRIC, REMOVED BEFORE THE STRIP'S IS
       ADDED. Caught by measurement, not by reasoning: without it the
       whole ghost floats by whatever the template's PR window happens to
       hold, which on a test cohort was 0.13 mV — larger than the baseline
       wander the levelling exists to cancel, and a constant offset is the
       single most misleading thing a comparison overlay can have.

       `buildBeatTemplates` levels every contributing beat on its own PR
       segment, so for a template built by this app the value here is
       already ~0 and subtracting it changes nothing. That is precisely
       why it must be explicit: the correction is invisible on our own
       data and load-bearing for anything imported, and an invariant that
       is only true by luck is one that breaks silently. */
    const tplSpan: number[] = [];
    for (let k = TEMPLATE_PRE_SAMPLES - templateIsoFrom; k < TEMPLATE_PRE_SAMPLES - templateIsoTo; k++) {
      if (k >= 0 && k < source.samples.length) tplSpan.push(source.samples[k]);
    }
    const tplLevel = medianOf(tplSpan);

    /* NaN, not zero, and only until the fill pass below. It is the one
       initial value that cannot be mistaken for a measurement, so a
       sample the stamping never reached is a bug that shows rather than
       a flat line that looks intentional. */
    const out = new Float32Array(length).fill(NaN);

    for (let b = 0; b < rPeaks.length; b++) {
      const r = rPeaks[b];

      // The local isoelectric, from the FOREGROUND's PR segment.
      const a = Math.max(0, r - isoFrom);
      const z = Math.max(a + 1, r - isoTo);
      const span: number[] = [];
      for (let i = a; i < z && i < under.length; i++) span.push(under[i]);
      const level = medianOf(span);

      /* ★ Each stamp owns the paper up to the MIDPOINT between it and its
         neighbours. Without that clip, at a fast rate one beat's T wave
         window and the next beat's P wave window overlap, and whichever
         was written last wins — which silently deletes a T wave from the
         ghost at exactly the rates where a reader is most interested in
         it. The midpoint is where the two claims are equally good. */
      const prev = b > 0 ? rPeaks[b - 1] : r - 2 * pre;
      const next = b < rPeaks.length - 1 ? rPeaks[b + 1] : r + 2 * post;
      const from = Math.max(0, Math.max(r - pre, Math.ceil((prev + r) / 2)));
      const to = Math.min(length - 1, Math.min(r + post, Math.floor((r + next) / 2)));

      for (let i = from; i <= to; i++) {
        out[i] = sampleTemplate(source.samples, i - r, ratio) - tplLevel + level;
      }
    }

    /* ── The TP gaps, and the paper before the first beat and after the
       last, HELD AT THE NEIGHBOURING STAMP'S OWN EDGE VALUE ────────
       ⚠️ Not at the foreground's measured isoelectric, which is what this
       did until it was tested. The two are not the same number: the PR
       window this app levels on is the one `beatTemplate` uses, and at an
       ordinary PR interval that window still contains part of the P wave.
       That bias is harmless where it cancels — it is present in both the
       template's level and the strip's, so a stamp lands correctly — and
       it does NOT cancel in a gap filled from the strip's level alone.
       The result was a 0.13 mV STEP at the edge of every beat's window,
       which dropped the ghost's correlation with the trace it was laid
       over from 0.998 to 0.972 and would have drawn a visible staircase
       between beats.

       Holding the edge value cannot produce a step by construction, which
       is the property worth having: the flat run is then genuinely "the
       baseline the stamp either side of it was levelled onto" rather than
       a second estimate of it that happens to disagree. */
    let lastReal = NaN;
    for (let i = 0; i < length; i++) {
      if (Number.isFinite(out[i])) lastReal = out[i];
      else if (Number.isFinite(lastReal)) out[i] = lastReal;
    }
    // The leading run has no previous value; back-fill it from the first.
    let firstReal = NaN;
    for (let i = 0; i < length; i++) {
      if (Number.isFinite(out[i])) {
        firstReal = out[i];
        break;
      }
    }
    if (Number.isFinite(firstReal)) {
      for (let i = 0; i < length && !Number.isFinite(out[i]); i++) out[i] = firstReal;
    } else {
      out.fill(0);
    }

    leads[name] = out;
    leadsCovered.push(name);
  }

  /* Median RR against the template's own span. The MEDIAN so that one
     ectopic pair cannot declare a resting strip crowded. */
  const rr: number[] = [];
  for (let i = 1; i < rPeaks.length; i++) rr.push(rPeaks[i] - rPeaks[i - 1]);
  const spanSamples = (TEMPLATE_SAMPLES - 1) / ratio;
  const crowded = rr.length > 0 && medianOf(rr) < spanSamples;

  return {
    leads,
    beatsStamped: leadsCovered.length > 0 ? rPeaks.length : 0,
    leadsCovered,
    crowded,
  };
}

// v1.1.0 — Reports `crowded`: above ~130 bpm the RR is shorter than the
//          template's 700 ms span, so the midpoint clip necessarily truncates
//          each beat's T wave and the next P. Measured: 0.04 mV agreement with
//          the strip across 45-100 bpm, 0.30 mV at 140, all of it in the
//          truncated region. A reader comparing T waves there would be shown a
//          difference the DRAWING invented, so the UI states it.
// v1.0.2 — The gaps between beats HOLD the neighbouring stamp's edge value
//          instead of being written at the strip's measured isoelectric. Those
//          are different numbers: the PR window this levels on still contains
//          part of the P wave at an ordinary PR interval, a bias that cancels
//          inside a stamp and does not cancel in a gap filled independently.
//          The result was a 0.13 mV STEP at every beat-window edge — a visible
//          staircase, and 0.998 -> 0.972 correlation with the trace underneath.
//          Holding the edge cannot step, by construction.
// v1.0.1 — The stamp removes the TEMPLATE's own isoelectric before adding the
//          strip's. Found by measurement: without it the ghost floats by
//          whatever the template's PR window holds — 0.13 mV on a test cohort,
//          larger than the wander the levelling exists to cancel. For templates
//          this app builds the value is already ~0, which is exactly why it has
//          to be explicit: invisible on our own data, load-bearing for imports,
//          and an invariant true only by luck breaks silently.
// v1.0.0 — The ECG ID as a viewer overlay: one representative beat stamped at
//          every R peak of the strip it is laid over, levelled per beat onto the
//          foreground's own isoelectric so it sits ON the trace rather than
//          floating above it, and clipped at the midpoint between neighbouring
//          beats so a fast rate cannot let one stamp overwrite the previous
//          beat's T wave. ⚠️ Alignment is exact by construction — there is no
//          shift to accumulate and no warp to distort — but for the same reason
//          the ghost's RHYTHM is the foreground's own and must never be measured
//          off. It carries shape; the trace underneath carries time.
