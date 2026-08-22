/* ==================================================================
   FIGURES — every chart, dial and diagram in the report, as pure SVG.

   ══ RULES THIS WHOLE FILE OBEYS ══
   1. Every function returns an `<svg>` with an EXPLICIT width and height in
      millimetres. Nothing is `100%` and nothing infers its own size from an
      aspect ratio — that inference is exactly what tore the old report
      across two pages.
   2. Every function is PURE: numbers in, markup out. No DOM, no locale, no
      theme lookup beyond the shared palette. That makes the whole report
      buildable and checkable in Node without a printer.
   3. Nothing here interprets. A dial draws the angle it is handed; whether
      that angle is a finding was decided upstream, by a named rule.

   ══ WHY THESE FIGURES AND NOT PRETTIER ONES ══
   Each was chosen because it answers a question a table cannot:

     donut        how much of the screen actually ran — a fraction is a
                  shape before it is a number
     rangeBar     is this measurement near its limit or far past it, which
                  is the question a bare "236 ms" leaves open
     hexaxial     the frontal axis is an ANGLE; drawing it as a compass is
                  the only representation that does not need a sentence
     poincaré     beat-to-beat variability as a cloud — a tight ball, a
                  cigar, or the fan that irregular rhythms make. No summary
                  statistic separates those three as fast as looking does
     tachogram    where in the ten seconds the variation actually happened
     einthoven    which lead is looking at which wall, which is the one
                  piece of context that makes "inferior" mean something
   ================================================================== */

import {
  BAND_OK,
  BLUE,
  BRAND,
  GRID_MAJOR,
  GRID_MINOR,
  GOLD,
  HAIRLINE,
  INK,
  MUTED,
  PAPER,
  SLATE,
  SURFACE,
  esc,
} from './theme';

/* Green appears in exactly two places in this file and in neither of them is
   it identity: the reference band on an interval bar and the normal sector on
   the dial. That is the universal chart convention for "inside the expected
   range" and a reader decodes it without a legend. Everything that speaks FOR
   the product - rings, needles, traces, clouds - is the wordmark's navy. */

/** Open an SVG whose on-page size is fixed in millimetres. */
function svg(w: number, h: number, body: string): string {
  return `<svg width="${w}mm" height="${h}mm" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
}

const n2 = (v: number): string => (Number.isFinite(v) ? v.toFixed(2) : '0');

/* ══════════════════ 1. The verdict donut ══════════════════ */

/**
 * A ring showing what fraction of the screen could be evaluated, with the
 * verdict's own colour and a glyph in the middle.
 *
 * The fraction is the point. "No abnormal finding" beside a ring that is
 * two-thirds empty is a completely different statement from the same words
 * beside a full one, and no wording achieves that distinction as quickly.
 */
export function donut(opts: {
  size: number;
  fraction: number;
  ink: string;
  soft: string;
  centre: string;
  caption: string;
}): string {
  const { size, fraction, ink, soft, centre, caption } = opts;
  const r = size / 2 - 3.2;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;
  const filled = Math.max(0, Math.min(1, fraction)) * circ;

  return svg(
    size,
    size,
    `
    <circle cx="${cx}" cy="${cy}" r="${n2(r)}" fill="${soft}" stroke="none"/>
    <circle cx="${cx}" cy="${cy}" r="${n2(r)}" fill="none" stroke="${HAIRLINE}" stroke-width="2.6"/>
    <circle cx="${cx}" cy="${cy}" r="${n2(r)}" fill="none" stroke="${ink}" stroke-width="2.6"
            stroke-linecap="round"
            stroke-dasharray="${n2(filled)} ${n2(circ - filled)}"
            transform="rotate(-90 ${cx} ${cy})"/>
    <text x="${cx}" y="${n2(cy + 1.2)}" text-anchor="middle" font-size="9.5" font-weight="800" fill="${ink}">${esc(centre)}</text>
    <text x="${cx}" y="${n2(cy + 7)}" text-anchor="middle" font-size="3.6" font-weight="600" fill="${SLATE}">${esc(caption)}</text>`,
  );
}

/* ══════════════════ 2. Measurement against its reference band ══════════════════ */

/**
 * A horizontal scale with the typical band shaded and the reading marked.
 *
 * This is the figure that turns "PR 236 ms" — which means nothing to most
 * readers and requires recall from the rest — into a picture of a marker
 * sitting just outside a green band.
 */
export function rangeBar(opts: {
  w: number;
  label: string;
  value: number | null;
  unit: string;
  min: number;
  max: number;
  low: number;
  high: number;
  /** Marker colour: green inside the band, gold or red outside. */
  ink: string;
}): string {
  const { w, label, value, unit, min, max, low, high, ink } = opts;
  const H = 13;
  const trackY = 6.4;
  const trackH = 3.6;
  const x0 = 26;
  const trackW = w - x0 - 20;

  const at = (v: number): number => x0 + ((v - min) / (max - min)) * trackW;
  const bandFrom = at(Math.max(min, low));
  const bandTo = at(Math.min(max, high));
  const clamped = value === null ? null : Math.max(min, Math.min(max, value));

  return svg(
    w,
    H,
    `
    <text x="0" y="${trackY + trackH - 0.3}" font-size="3.5" font-weight="700" fill="${SLATE}">${esc(label)}</text>
    <rect x="${n2(x0)}" y="${trackY}" width="${n2(trackW)}" height="${trackH}" rx="1.8" fill="${SURFACE}"/>
    <rect x="${n2(bandFrom)}" y="${trackY}" width="${n2(Math.max(0, bandTo - bandFrom))}" height="${trackH}" rx="1.8" fill="${BAND_OK}" opacity="0.22"/>
    <line x1="${n2(bandFrom)}" y1="${trackY - 0.9}" x2="${n2(bandFrom)}" y2="${trackY + trackH + 0.9}" stroke="${BRAND}" stroke-width="0.22" opacity="0.7"/>
    <line x1="${n2(bandTo)}" y1="${trackY - 0.9}" x2="${n2(bandTo)}" y2="${trackY + trackH + 0.9}" stroke="${BRAND}" stroke-width="0.22" opacity="0.7"/>
    ${
      clamped === null
        ? `<text x="${n2(x0 + trackW + 2)}" y="${trackY + trackH - 0.3}" font-size="3.6" font-weight="700" fill="${MUTED}">—</text>`
        : `<rect x="${n2(at(clamped) - 0.5)}" y="${trackY - 1.7}" width="1" height="${trackH + 3.4}" rx="0.5" fill="${ink}"/>
           <text x="${n2(x0 + trackW + 2)}" y="${trackY + trackH - 0.3}" font-size="3.8" font-weight="800" fill="${ink}">${value === null ? '—' : Math.round(value)}</text>`
    }
    <text x="${n2(x0)}" y="${H - 0.6}" font-size="2.6" fill="${MUTED}">${min}</text>
    <text x="${n2(bandFrom)}" y="${H - 0.6}" font-size="2.6" fill="${BRAND}" text-anchor="middle">${low}</text>
    <text x="${n2(bandTo)}" y="${H - 0.6}" font-size="2.6" fill="${BRAND}" text-anchor="middle">${high}</text>
    <text x="${n2(x0 + trackW)}" y="${H - 0.6}" font-size="2.6" fill="${MUTED}" text-anchor="end">${max} ${esc(unit)}</text>`,
  );
}

/* ══════════════════ 3. The hexaxial dial ══════════════════ */

/**
 * The frontal-plane axis as a compass, with the six limb leads on their
 * true hexaxial bearings and the normal sector shaded.
 *
 * ⚠️ The screen's y axis points DOWN, and the hexaxial convention puts +90°
 * (aVF) at the BOTTOM — so a positive clinical angle and a positive screen
 * angle happen to agree here, and no sign flip is needed. Writing that down
 * because it looks like a bug every time someone reads it.
 */
export function hexaxial(opts: {
  size: number;
  degrees: number | null;
  ink: string;
  /**
   * Print the angle under the dial.
   *
   * ★ Off on the measurements page, and it was a real collision, not a
   * preference: the label is baselined at `size - 0.6`, which is inside the
   * ring once the dial is small, and at 30 mm it printed straight through
   * the aVF spoke label. That page sets the angle at 19 pt beside the dial
   * anyway, so the figure was saying it twice AND illegibly.
   */
  showDegrees?: boolean;
}): string {
  const { size, degrees, ink, showDegrees = true } = opts;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 6;

  const point = (deg: number, radius: number) => ({
    x: cx + Math.cos((deg * Math.PI) / 180) * radius,
    y: cy + Math.sin((deg * Math.PI) / 180) * radius,
  });

  /* The normal sector, −30° to +90°, as a filled wedge. */
  const a = point(-30, r);
  const b = point(90, r);
  const wedge = `M ${n2(cx)} ${n2(cy)} L ${n2(a.x)} ${n2(a.y)} A ${n2(r)} ${n2(r)} 0 0 1 ${n2(b.x)} ${n2(b.y)} Z`;

  const LEADS: [string, number][] = [
    ['I', 0],
    ['II', 60],
    ['aVF', 90],
    ['III', 120],
    ['aVR', -150],
    ['aVL', -30],
  ];
  const spokes = LEADS.map(([name, deg]) => {
    const p = point(deg, r);
    const label = point(deg, r + 3.4);
    return `<line x1="${n2(cx)}" y1="${n2(cy)}" x2="${n2(p.x)}" y2="${n2(p.y)}" stroke="${HAIRLINE}" stroke-width="0.18"/>
      <text x="${n2(label.x)}" y="${n2(label.y + 1)}" font-size="2.9" font-weight="700" fill="${MUTED}" text-anchor="middle">${name}</text>`;
  }).join('');

  const needle =
    degrees === null
      ? ''
      : (() => {
          const tip = point(degrees, r - 1.5);
          return `<line x1="${n2(cx)}" y1="${n2(cy)}" x2="${n2(tip.x)}" y2="${n2(tip.y)}"
                    stroke="${ink}" stroke-width="1.1" stroke-linecap="round"/>
                  <circle cx="${n2(tip.x)}" cy="${n2(tip.y)}" r="1.5" fill="${ink}"/>`;
        })();

  return svg(
    size,
    size,
    `
    <path d="${wedge}" fill="${BAND_OK}" opacity="0.13"/>
    <circle cx="${cx}" cy="${cy}" r="${n2(r)}" fill="none" stroke="${HAIRLINE}" stroke-width="0.3"/>
    ${spokes}
    ${needle}
    <circle cx="${cx}" cy="${cy}" r="1.1" fill="${INK}"/>
    ${
      showDegrees
        ? /* INSIDE the ring, at the top. It used to be baselined at
             `size - 0.6`, which is where the aVF spoke label already is:
             the angle printed straight through the word on every render.
             The top of the dial is the one region with no spoke label
             (-90° is between aVR and aVL) and no wedge — the normal sector
             runs -30° to +90°, i.e. right and down. */
          `<text x="${cx}" y="${n2(cy - r * 0.44)}" text-anchor="middle" font-size="3.4" font-weight="800" fill="${ink}">${
            degrees === null ? '—' : `${Math.round(degrees)}°`
          }</text>`
        : ''
    }`,
  );
}

/* ══════════════════ 4. Poincaré plot ══════════════════ */

/**
 * Each beat's RR interval against the next one.
 *
 * The SHAPE of the cloud is the diagnosis-adjacent information, and it is
 * information no single number carries: a tight ball is a regular rhythm, a
 * cigar along the diagonal is ordinary respiratory variation, and a diffuse
 * fan is what atrial fibrillation looks like. SD1 and SD2 (the widths across
 * and along the identity line) are drawn as an ellipse over it, because
 * those are the two numbers the cloud is usually reduced to and showing
 * both together says what they mean.
 */
export function poincare(opts: {
  size: number;
  rrMs: number[];
  ink: string;
}): string {
  const { size, rrMs, ink } = opts;
  const pad = 7;
  const plot = size - pad - 3;

  if (rrMs.length < 3) {
    return svg(
      size,
      size,
      `<rect x="${pad}" y="3" width="${n2(plot - pad + 3)}" height="${n2(plot - 3 + 3)}" fill="${SURFACE}" rx="1.5"/>
       <text x="${size / 2}" y="${size / 2}" text-anchor="middle" font-size="3.2" fill="${MUTED}">—</text>`,
    );
  }

  const lo = Math.min(...rrMs) - 40;
  const hi = Math.max(...rrMs) + 40;
  const span = Math.max(120, hi - lo);
  const at = (v: number): number => pad + ((v - lo) / span) * (plot - pad);
  const atY = (v: number): number => plot - ((v - lo) / span) * (plot - pad) + 3;

  const dots = rrMs
    .slice(0, -1)
    .map((v, i) => `<circle cx="${n2(at(v))}" cy="${n2(atY(rrMs[i + 1]))}" r="0.7" fill="${ink}" opacity="0.75"/>`)
    .join('');

  /* SD1 / SD2 from the successive differences, the standard definitions. */
  const diffs = rrMs.slice(1).map((v, i) => v - rrMs[i]);
  const sums = rrMs.slice(1).map((v, i) => v + rrMs[i]);
  const sd = (xs: number[]): number => {
    const m = xs.reduce((a, b) => a + b, 0) / xs.length;
    return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length);
  };
  const sd1 = sd(diffs) / Math.SQRT2;
  const sd2 = sd(sums) / Math.SQRT2;
  const mean = rrMs.reduce((a, b) => a + b, 0) / rrMs.length;
  const scale = (plot - pad) / span;
  const cx = at(mean);
  const cy = atY(mean);

  return svg(
    size,
    size,
    `
    <rect x="${pad}" y="3" width="${n2(plot - pad)}" height="${n2(plot - 3)}" fill="${SURFACE}" rx="1.5"/>
    <line x1="${pad}" y1="${n2(plot)}" x2="${n2(plot)}" y2="3" stroke="${HAIRLINE}" stroke-width="0.25" stroke-dasharray="1 1"/>
    <ellipse cx="${n2(cx)}" cy="${n2(cy)}"
             rx="${n2(Math.max(0.6, sd2 * scale))}" ry="${n2(Math.max(0.4, sd1 * scale))}"
             transform="rotate(-45 ${n2(cx)} ${n2(cy)})"
             fill="none" stroke="${ink}" stroke-width="0.3" opacity="0.55"/>
    ${dots}
    <text x="${pad}" y="${size - 0.4}" font-size="2.5" fill="${MUTED}">SD1 ${sd1.toFixed(0)} · SD2 ${sd2.toFixed(0)} ms</text>`,
  );
}

/* ══════════════════ 5. RR tachogram ══════════════════ */

/** Every RR interval in order, so WHERE the variation happened is visible —
    a single early beat and a steadily drifting rate produce the same
    standard deviation and look nothing alike here. */
export function tachogram(opts: {
  w: number;
  h: number;
  rrMs: number[];
  ink: string;
  /** Drawn as a dashed reference line. */
  meanMs: number | null;
}): string {
  const { w, h, rrMs, ink, meanMs } = opts;
  const pad = 8;
  if (rrMs.length < 2) {
    return svg(w, h, `<rect width="${w}" height="${h}" fill="${SURFACE}" rx="1.5"/>`);
  }
  const lo = Math.min(...rrMs) - 30;
  const hi = Math.max(...rrMs) + 30;
  const span = Math.max(100, hi - lo);
  const x = (i: number): number => pad + (i / Math.max(1, rrMs.length - 1)) * (w - pad - 2);
  const y = (v: number): number => h - 4 - ((v - lo) / span) * (h - 10);

  const line = rrMs.map((v, i) => `${i === 0 ? 'M' : 'L'}${n2(x(i))} ${n2(y(v))}`).join('');
  const dots = rrMs
    .map((v, i) => `<circle cx="${n2(x(i))}" cy="${n2(y(v))}" r="0.6" fill="${ink}"/>`)
    .join('');

  return svg(
    w,
    h,
    `
    <rect width="${w}" height="${h}" fill="${SURFACE}" rx="1.5"/>
    ${
      meanMs === null
        ? ''
        : `<line x1="${pad}" y1="${n2(y(meanMs))}" x2="${n2(w - 2)}" y2="${n2(y(meanMs))}" stroke="${MUTED}" stroke-width="0.2" stroke-dasharray="1.2 1.2"/>`
    }
    <path d="${line}" fill="none" stroke="${ink}" stroke-width="0.35" stroke-linejoin="round"/>
    ${dots}
    <text x="1.5" y="5" font-size="2.5" fill="${MUTED}">${Math.round(hi)}</text>
    <text x="1.5" y="${h - 1.2}" font-size="2.5" fill="${MUTED}">${Math.round(lo)}</text>`,
  );
}

/* ══════════════════ 6. Amplitude bars ══════════════════ */

/** One lead's wave amplitudes as a signed bar from a shared zero line —
    signed because a Q wave being NEGATIVE is the whole point of it. */
export function amplitudeBar(opts: {
  w: number;
  values: (number | null)[];
  peak: number;
}): string {
  const { w, values, peak } = opts;
  const H = 7;
  const zero = H / 2;
  const slot = w / values.length;
  const bars = values
    .map((v, i) => {
      if (v === null) return '';
      const half = (Math.abs(v) / peak) * (H / 2 - 0.4);
      const yTop = v >= 0 ? zero - half : zero;
      const fill = v >= 0 ? BLUE : GOLD;
      return `<rect x="${n2(i * slot + slot * 0.22)}" y="${n2(yTop)}" width="${n2(slot * 0.56)}" height="${n2(Math.max(0.25, half))}" rx="0.3" fill="${fill}"/>`;
    })
    .join('');
  return svg(
    w,
    H,
    `<line x1="0" y1="${zero}" x2="${w}" y2="${zero}" stroke="${HAIRLINE}" stroke-width="0.2"/>${bars}`,
  );
}

/* ══════════════════ 7. Einthoven's triangle — the lead map ══════════════════ */

/**
 * Which lead looks at which wall, drawn.
 *
 * This is the figure that makes the word "inferior" mean something to a
 * reader who has never been told that leads have directions. It is also the
 * honest way to show the BLIND SPOTS: the front wall simply has no arrow
 * pointing at it in this diagram, and that absence says more than the
 * sentence does.
 */
export function einthoven(opts: { w: number; h: number; highlight: string[] }): string {
  const { w, h, highlight } = opts;
  const cx = w / 2;
  const cy = h / 2 + 1;
  const R = Math.min(w, h) / 2 - 9;

  const on = (name: string): boolean => highlight.includes(name);
  const strong = (name: string): string => (on(name) ? BLUE : HAIRLINE);
  const label = (name: string): string => (on(name) ? BLUE : MUTED);

  /* Vertices: right arm, left arm, left leg — the classic triangle. */
  const RA = { x: cx - R, y: cy - R * 0.62 };
  const LA = { x: cx + R, y: cy - R * 0.62 };
  const LL = { x: cx, y: cy + R * 0.86 };

  const mid = (a: { x: number; y: number }, b: { x: number; y: number }) => ({
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  });

  return svg(
    w,
    h,
    `
    <circle cx="${n2(cx)}" cy="${n2(cy + 1)}" r="${n2(R * 0.42)}" fill="${BAND_OK}" opacity="0.10"/>
    <path d="M ${n2(cx - R * 0.16)} ${n2(cy - R * 0.1)}
             q ${n2(R * 0.16)} ${n2(-R * 0.2)} ${n2(R * 0.32)} 0
             q ${n2(R * 0.16)} ${n2(R * 0.28)} ${n2(-R * 0.16)} ${n2(R * 0.42)}
             q ${n2(-R * 0.32)} ${n2(-R * 0.14)} ${n2(-R * 0.16)} ${n2(-R * 0.42)} Z"
          fill="${BAND_OK}" opacity="0.32"/>

    <line x1="${n2(RA.x)}" y1="${n2(RA.y)}" x2="${n2(LA.x)}" y2="${n2(LA.y)}" stroke="${strong('I')}" stroke-width="${on('I') ? 0.8 : 0.3}"/>
    <line x1="${n2(RA.x)}" y1="${n2(RA.y)}" x2="${n2(LL.x)}" y2="${n2(LL.y)}" stroke="${strong('II')}" stroke-width="${on('II') ? 0.8 : 0.3}"/>
    <line x1="${n2(LA.x)}" y1="${n2(LA.y)}" x2="${n2(LL.x)}" y2="${n2(LL.y)}" stroke="${strong('III')}" stroke-width="${on('III') ? 0.8 : 0.3}"/>

    <text x="${n2(mid(RA, LA).x)}" y="${n2(mid(RA, LA).y - 1.6)}" text-anchor="middle" font-size="3.4" font-weight="800" fill="${label('I')}">I</text>
    <text x="${n2(mid(RA, LL).x - 3)}" y="${n2(mid(RA, LL).y)}" text-anchor="middle" font-size="3.4" font-weight="800" fill="${label('II')}">II</text>
    <text x="${n2(mid(LA, LL).x + 3.4)}" y="${n2(mid(LA, LL).y)}" text-anchor="middle" font-size="3.4" font-weight="800" fill="${label('III')}">III</text>

    <circle cx="${n2(RA.x)}" cy="${n2(RA.y)}" r="1.7" fill="${INK}"/>
    <circle cx="${n2(LA.x)}" cy="${n2(LA.y)}" r="1.7" fill="${INK}"/>
    <circle cx="${n2(LL.x)}" cy="${n2(LL.y)}" r="1.7" fill="${INK}"/>
    <text x="${n2(RA.x)}" y="${n2(RA.y - 3)}" text-anchor="middle" font-size="2.7" fill="${SLATE}">R</text>
    <text x="${n2(LA.x)}" y="${n2(LA.y - 3)}" text-anchor="middle" font-size="2.7" fill="${SLATE}">L</text>
    <text x="${n2(LL.x)}" y="${n2(LL.y + 4.4)}" text-anchor="middle" font-size="2.7" fill="${SLATE}">F</text>`,
  );
}

/* ══════════════════ 8. A miniature beat, with a segment marked ══════════════════ */

/**
 * The patient's own representative beat at figure scale, with the segment a
 * finding measured shaded — the printed twin of the app's "why" sheet, so
 * the doctor reading the PDF sees the same evidence the patient was shown.
 */
export function beatFigure(opts: {
  w: number;
  h: number;
  signal: Float32Array;
  from: number;
  to: number;
  band: [number, number] | null;
  ink: string;
}): string {
  const { w, h, signal, from, to, band, ink } = opts;
  if (to - from < 8) return svg(w, h, `<rect width="${w}" height="${h}" fill="${SURFACE}" rx="1.5"/>`);

  let lo = Infinity;
  let hi = -Infinity;
  for (let i = from; i <= to; i++) {
    if (signal[i] < lo) lo = signal[i];
    if (signal[i] > hi) hi = signal[i];
  }
  const span = Math.max(0.4, hi - lo);
  const mid = (lo + hi) / 2;
  const x = (i: number): number => ((i - from) / (to - from)) * w;
  const y = (v: number): number => h / 2 - ((v - mid) / span) * (h - 3);

  const stride = Math.max(1, Math.round((to - from) / 260));
  let d = '';
  for (let i = from; i <= to; i += stride) d += `${d === '' ? 'M' : 'L'}${n2(x(i))} ${n2(y(signal[i]))}`;

  const shade =
    band === null
      ? ''
      : `<rect x="${n2(x(band[0]))}" y="0" width="${n2(Math.max(0.4, x(band[1]) - x(band[0])))}" height="${h}" fill="${ink}" opacity="0.14"/>`;

  return svg(
    w,
    h,
    `<rect width="${w}" height="${h}" fill="${PAPER}" rx="1.2" stroke="${HAIRLINE}" stroke-width="0.2"/>
     ${shade}
     <line x1="0" y1="${n2(y(0))}" x2="${w}" y2="${n2(y(0))}" stroke="${HAIRLINE}" stroke-width="0.15"/>
     <path d="${d}" fill="none" stroke="${INK}" stroke-width="0.28" stroke-linejoin="round" stroke-linecap="round"/>`,
  );
}

/* ══════════════════ 9. The hero trace ══════════════════ */

/**
 * A long strip of the recording as one thin line, for the top of the
 * measurements page.
 *
 * ★ IT IS THE REAL RECORDING. The handoff draws a repeating hand-written
 * ECG path — right for a mock-up, and the one thing that must not be copied
 * onto paper: a decorative waveform printed under this patient's measured
 * rate, on a document that gets filed, is a picture of somebody else's
 * heart in their record.
 *
 * ★ AND IT IS EXPLICITLY NOT MEASURABLE. Every other trace in this report
 * is on ECG paper at 25 mm/s and 10 mm/mV so a ruler laid on it gives a
 * real interval (`ecgPath.ts` forbids rescaling the time axis). This one is
 * scaled to fit a band — so it carries NO grid, no calibration pulse and no
 * axis, because those are the things that invite a ruler. It is a shape:
 * how the ten seconds went. The sheets that can be measured are pages 1-2.
 *
 * Reduced by keeping each column's most EXTREME sample rather than its
 * mean: averaging flattens the R wave, which is the one feature that makes
 * a 12 mm band legible at all.
 */
export function sparkTrace(opts: {
  w: number;
  h: number;
  samples: Float32Array | null;
  ink: string;
  /** Columns to reduce to. ~4 per mm reads as a continuous line in print. */
  columns?: number;
}): string {
  const { w, h, samples, ink } = opts;
  const columns = opts.columns ?? Math.max(120, Math.round(w * 4));
  if (!samples || samples.length < 2) return svg(w, h, '');

  const step = samples.length / columns;
  const picked = new Float64Array(columns);
  let lo = Infinity;
  let hi = -Infinity;
  for (let c = 0; c < columns; c++) {
    const from = Math.floor(c * step);
    const to = Math.min(samples.length, Math.max(from + 1, Math.floor((c + 1) * step)));
    let best = samples[from] ?? 0;
    for (let i = from; i < to; i++) {
      const v = samples[i];
      if (v !== undefined && Math.abs(v) > Math.abs(best)) best = v;
    }
    picked[c] = best;
    if (best < lo) lo = best;
    if (best > hi) hi = best;
  }

  /* A flat lead divides by zero and draws a line through the middle, which
     is the honest picture of a flat lead. */
  const span = hi - lo || 1;
  const pad = h * 0.1;
  const usable = h - pad * 2;

  let d = '';
  for (let c = 0; c < columns; c++) {
    const x = (c / (columns - 1)) * w;
    const y = pad + (1 - ((picked[c] as number) - lo) / span) * usable;
    d += (c === 0 ? 'M' : 'L') + n2(x) + ',' + n2(y);
  }
  return svg(
    w,
    h,
    `<path d="${d}" fill="none" stroke="${ink}" stroke-width="0.42" stroke-linejoin="round" stroke-linecap="round"/>`,
  );
}

/* ══════════════════ 10. One lead's waves, as standing bars ══════════════════ */

/**
 * P, Q, R, S and T for a single lead, drawn as signed bars on a zero line.
 *
 * ══ WHY THIS AND NOT ANOTHER TABLE COLUMN ══
 * The numbers are printed under it and are the record. The bars are for the
 * question the numbers answer badly: what SHAPE does this lead have, and
 * how does that shape change across the six? Six of these side by side make
 * the R-wave progression and the aVR inversion visible in one look — and
 * lead inversion in aVR is the sanity check that catches swapped arm
 * electrodes, which is the single commonest technical fault in a limb
 * recording.
 *
 * A wave that could not be measured draws NOTHING — not a zero-height bar.
 * A bar of no height and a bar sitting on the zero line are the same
 * picture, and "unmeasurable" and "zero millivolts" are not the same fact.
 */
export function waveColumn(opts: {
  w: number;
  h: number;
  values: readonly (number | null)[];
  inks: readonly string[];
  /** Shared across all six leads, so the columns are comparable. */
  peak: number;
}): string {
  const { w, h, values, inks, peak } = opts;
  const zero = h / 2;
  const slot = w / values.length;
  const barW = Math.min(slot * 0.42, 2.2);
  const half = h / 2 - 0.6;

  const bars = values
    .map((v, i) => {
      if (v === null) return '';
      const len = Math.max(0.35, (Math.abs(v) / peak) * half);
      const y = v >= 0 ? zero - len : zero;
      const x = i * slot + (slot - barW) / 2;
      return `<rect x="${n2(x)}" y="${n2(y)}" width="${n2(barW)}" height="${n2(len)}" rx="0.35" fill="${inks[i] ?? INK}"/>`;
    })
    .join('');

  return svg(
    w,
    h,
    `<line x1="0" y1="${n2(zero)}" x2="${n2(w)}" y2="${n2(zero)}" stroke="${HAIRLINE}" stroke-width="0.22"/>${bars}`,
  );
}

/* ══════════════════ 11. ECG paper, for the strips ══════════════════ */

/** The grid alone, as a reusable `<defs>` pattern reference is NOT used:
    each strip draws its own grid path because the shared `buildEcgGrid`
    already emits exactly the millimetre geometry the web print uses, and a
    CSS pattern would be a second, drifting definition of the same paper. */
export const GRID_STROKES = { minor: GRID_MINOR, major: GRID_MAJOR };

// v1.1.0 — Adds `sparkTrace` (the measurements page's hero line — the real
//          recording, deliberately un-measurable: no grid, no calibration, no
//          axis, because those are what invite a ruler) and `waveColumn` (one
//          lead's P/Q/R/S/T as signed bars, six of which make R-wave
//          progression and aVR inversion visible in one look).
// v1.0.0 — Every figure in the report: verdict donut, reference-band bars, the
//          hexaxial dial, a Poincaré plot, the RR tachogram, signed amplitude
//          bars, Einthoven's triangle and a marked beat. All pure, all sized in
//          millimetres, none of them `100%`.
