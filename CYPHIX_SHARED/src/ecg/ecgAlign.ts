/* ==================================================================
   ecgAlign — warp one recording onto another, beat feature by beat
   feature, so two studies can be compared honestly.

   ══ THE PROBLEM WITH SHIFTING ══
   Sliding a ghost trace left or right lines up ONE point — usually the
   first R peak — and everything else drifts, because two recordings are
   never at the same heart rate. At 60 bpm vs 72 bpm the second beat is
   already ~170 ms out, and by the fifth beat the two traces are
   comparing a QRS against a T wave. A reader looking at that sees
   "morphology changed" when all that changed was the rate.

   ══ WHAT THIS DOES INSTEAD ══
   It finds the fiducial points of every beat in both recordings — P, Q,
   R, S, T — pairs them up, and builds a PIECEWISE-LINEAR TIME WARP that
   maps each of the reference's features onto the corresponding feature
   of the target. The reference is then resampled through that warp.

   The result: every R sits on the target's R, every S on its S, every P
   on its P, and the segments BETWEEN them are stretched or compressed to
   fit. What is left over is the only thing worth comparing — the shape.

     target   ──P──Q─R─S────T──────P──Q─R─S────T────
     ghost    ─P─Q─R─S───T─────P─Q─R─S───T──────      (faster)
     warped   ──P──Q─R─S────T──────P──Q─R─S────T────  ← same landmarks

   ══ ⚠️ WHAT THIS COSTS, AND WHY IT MUST BE LABELLED ══
   Time-warping DESTROYS interval information in the ghost. After
   warping, the ghost's QT and PR are the TARGET's, by construction —
   they were forced there. **Nothing may ever be measured off a warped
   trace.** It is a morphology-comparison aid only, and the UI must say
   so wherever it is switched on. Calipers stay bound to the foreground
   trace, which is never warped.

   Detection windows below are the conventional ones relative to R.
   Nothing here is a diagnosis: these are landmarks on a curve.
   ================================================================== */

export interface BeatFiducials {
  /** Sample index of the R peak — the anchor everything else is found from. */
  r: number;
  p: number | null;
  q: number | null;
  s: number | null;
  t: number | null;
}

/* Search windows in seconds relative to R. Deliberately generous: a
   missed landmark simply drops out of the warp (the neighbouring anchors
   still constrain that stretch), whereas a landmark found in the wrong
   place would bend the trace incorrectly. */
const Q_BEFORE_R = 0.06;
const S_AFTER_R = 0.08;
const T_FROM_S = 0.06;
const T_TO_R = 0.42;
const P_FROM_R = 0.30;
const P_TO_R = 0.07;

function argMin(sig: Float32Array, from: number, to: number): number | null {
  const a = Math.max(0, from);
  const b = Math.min(sig.length, to);
  if (b - a < 2) return null;
  let idx = a;
  let val = sig[a];
  for (let i = a; i < b; i++) if (sig[i] < val) { val = sig[i]; idx = i; }
  return idx;
}

function argMax(sig: Float32Array, from: number, to: number): number | null {
  const a = Math.max(0, from);
  const b = Math.min(sig.length, to);
  if (b - a < 2) return null;
  let idx = a;
  let val = sig[a];
  for (let i = a; i < b; i++) if (sig[i] > val) { val = sig[i]; idx = i; }
  return idx;
}

/**
 * Locate P, Q, R, S, T for every detected beat.
 * `rPeaks` comes from the same Pan-Tompkins pass the measurements use, so
 * the landmarks here and the numbers on the report agree about where the
 * beats are.
 */
export function detectFiducials(
  signal: Float32Array,
  rPeaks: number[],
  sampleRate: number,
): BeatFiducials[] {
  const s = (sec: number) => Math.round(sec * sampleRate);

  return rPeaks.map((r, i) => {
    const prevR = i > 0 ? rPeaks[i - 1] : -Infinity;
    const nextR = i < rPeaks.length - 1 ? rPeaks[i + 1] : Infinity;

    const q = argMin(signal, r - s(Q_BEFORE_R), r);
    const sPt = argMin(signal, r + 1, r + s(S_AFTER_R));

    // T: the largest deflection after S, stopping well before the next R
    // so a fast rate cannot let the window swallow the following P.
    const tFrom = (sPt ?? r) + s(T_FROM_S);
    const tTo = Math.min(r + s(T_TO_R), nextR === Infinity ? signal.length : nextR - s(0.05));
    const t = tTo > tFrom ? argMax(signal, tFrom, tTo) : null;

    // P: the largest deflection before Q, bounded by the previous beat's T.
    const pFrom = Math.max(r - s(P_FROM_R), prevR === -Infinity ? 0 : prevR + s(0.20));
    const pTo = r - s(P_TO_R);
    const p = pTo > pFrom ? argMax(signal, pFrom, pTo) : null;

    return { r, p, q, s: sPt, t };
  });
}

/** One (referenceIndex → targetIndex) correspondence. */
interface Anchor {
  ref: number;
  target: number;
}

/**
 * Build the warp anchors by pairing beats positionally.
 *
 * Beats are paired 1↔1, 2↔2, … up to the shorter recording. Pairing by
 * ORDER rather than by time is what makes rate differences irrelevant —
 * which is the entire point. Beats beyond the shorter recording have no
 * counterpart and are left to the trailing extrapolation.
 */
function buildAnchors(refBeats: BeatFiducials[], targetBeats: BeatFiducials[]): Anchor[] {
  const anchors: Anchor[] = [];
  const n = Math.min(refBeats.length, targetBeats.length);

  for (let i = 0; i < n; i++) {
    const a = refBeats[i];
    const b = targetBeats[i];
    // Order matters: landmarks must be added along the beat, in time.
    for (const key of ['p', 'q', 'r', 's', 't'] as const) {
      const ref = a[key];
      const target = b[key];
      if (ref !== null && target !== null) anchors.push({ ref, target });
    }
  }

  // Strictly increasing in BOTH axes, or the warp folds back on itself and
  // the resampled trace runs backwards through time.
  anchors.sort((x, y) => x.target - y.target);
  const clean: Anchor[] = [];
  for (const a of anchors) {
    const last = clean[clean.length - 1];
    if (!last || (a.target > last.target && a.ref > last.ref)) clean.push(a);
  }
  return clean;
}

export interface AlignmentResult {
  /** Reference samples resampled onto the target's timeline. */
  warped: Float32Array;
  /** How many landmark correspondences the warp was built from. */
  anchorCount: number;
  /** Beats that were matched between the two recordings. */
  beatsMatched: number;
  /** False when there was too little to work with and the input was passed through. */
  applied: boolean;
}

/**
 * Warp `reference` onto `target`'s timeline using their beat landmarks.
 *
 * Both signals must be the SAME LEAD from the two recordings — warping a
 * lead onto a different lead would be meaningless.
 */
export function alignByFiducials(
  reference: Float32Array,
  referenceRPeaks: number[],
  target: Float32Array,
  targetRPeaks: number[],
  sampleRate: number,
): AlignmentResult {
  const outLength = target.length;

  // Two beats each is the minimum that defines a stretch rather than a
  // shift; below that, honestly do nothing.
  if (referenceRPeaks.length < 2 || targetRPeaks.length < 2) {
    return { warped: reference.slice(0, outLength), anchorCount: 0, beatsMatched: 0, applied: false };
  }

  const refBeats = detectFiducials(reference, referenceRPeaks, sampleRate);
  const targetBeats = detectFiducials(target, targetRPeaks, sampleRate);
  const anchors = buildAnchors(refBeats, targetBeats);

  if (anchors.length < 2) {
    return { warped: reference.slice(0, outLength), anchorCount: 0, beatsMatched: 0, applied: false };
  }

  /* Resample: for each output position (target timeline) find where to
     read from in the reference, by piecewise-linear interpolation between
     anchors. Outside the anchor range the edge segment's slope continues,
     so the trace does not snap flat at the ends. */
  const warped = new Float32Array(outLength);
  let seg = 0;

  for (let j = 0; j < outLength; j++) {
    while (seg < anchors.length - 2 && j > anchors[seg + 1].target) seg++;

    const a = anchors[seg];
    const b = anchors[seg + 1] ?? anchors[seg];
    const span = b.target - a.target;
    const frac = span > 0 ? (j - a.target) / span : 0;
    const refPos = a.ref + frac * (b.ref - a.ref);

    // Linear interpolation between reference samples — the warp lands
    // between them almost everywhere.
    const i0 = Math.floor(refPos);
    const i1 = i0 + 1;
    if (i0 < 0 || i1 >= reference.length) {
      warped[j] = 0;
    } else {
      const w = refPos - i0;
      warped[j] = reference[i0] * (1 - w) + reference[i1] * w;
    }
  }

  return {
    warped,
    anchorCount: anchors.length,
    beatsMatched: Math.min(refBeats.length, targetBeats.length),
    applied: true,
  };
}

// v1.0.0 — Piecewise-linear fiducial warp (P/Q/R/S/T) so two studies compare
//          on shape, never on rate. Copied VERBATIM from the web app's
//          services/ecg/ecgAlign.ts (root CLAUDE.md §2.3: the maths is frozen
//          and must be numerically identical on every platform). It had no
//          imports at all, which is why the copy is byte-for-byte. Until the
//          web migrates to this file, edit BOTH.
