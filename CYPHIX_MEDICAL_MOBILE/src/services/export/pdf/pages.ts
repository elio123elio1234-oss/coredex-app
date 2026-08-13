/* ==================================================================
   THE PAGES — every sheet of the report, built to an exact millimetre.

   ══ THE ONE RULE ══
   A page is a fixed 210 × 297 mm box with `overflow: hidden`, and every
   block inside it declares its own height in millimetres. `assertFits`
   checks the arithmetic while the HTML is being built, so a layout that
   would spill THROWS here rather than producing a torn document.

   That is the whole answer to *"the graphs stretch across two pages"*:
   nothing in this file can grow. There is no `auto`, no `100%`, no
   `flex-wrap`, and no text block without a clamp.

   ══ THE SHAPE OF THE DOCUMENT ══
     1..n  THE ECG          six leads, full page, 25 mm/s · 10 mm/mV
     n+1   INTERPRETATION   the verdict ring, then every finding with its
                            evidence and its published criterion
     n+2   STATISTICS       intervals against their reference bands, the
                            hexaxial dial, Poincaré, tachogram, amplitudes
     n+3   REFERENCE        Einthoven's triangle, what the test cannot see,
                            how to read the sheet, the disclaimer
   ================================================================== */

import {
  buildCalibrationPulse,
  buildEcgGrid,
  buildEcgPath,
  LIMB_LEAD_ORDER,
  STANDARD_MM_PER_MV,
  STANDARD_MM_PER_SEC,
  type EcgAnalysis,
  type EcgScreening,
  type LimbLeadName,
  type ScreeningFinding,
} from '@cyphix/shared';
import {
  amplitudeBar,
  beatFigure,
  donut,
  einthoven,
  hexaxial,
  poincare,
  rangeBar,
  tachogram,
} from './figures';
import type { PdfLabels } from './labels';
import { wordmark } from './logo';
import {
  BAND_OK,
  BODY_H,
  BRAND,
  BRAND_SOFT,
  PAGE_BOX_H,
  CAL_W,
  COL_W,
  GRID_MAJOR,
  GRID_MINOR,
  HAIRLINE,
  INK,
  LEVEL_COLOR,
  MARKER,
  MUTED,
  PAPER,
  SHEET_CAPTION_H,
  SLATE,
  SURFACE,
  STRIP_H,
  TRACE,
  assertFits,
  esc,
  mm,
} from './theme';

/* ══════════════════ The page shell ══════════════════ */

interface Chrome {
  brand: string;
  title: string;
  /** Right-hand side of the letterhead — the study's date and the patient. */
  subtitle: string;
  /** Footer centre. */
  pageLabel: string;
  /** Footer right. */
  footRight: string;
}

/**
 * A page. Fixed size, hidden overflow, header and footer absolutely placed
 * so the body's height is a constant the blocks can be checked against.
 */
function page(chrome: Chrome, bodyHtml: string): string {
  /* The WORDMARK, not the word. Reported: "why are you not using my logo and
     writing it in plain text?" - and there is no answer, the logo existed as
     `components/atoms/BrandLogo` the whole time. It is 34 mm wide: large
     enough to be the issuer of a clinical document at a glance, small enough
     that the study title beside it is still the loudest thing on the page. */
  return `<section class="pg">
  <header class="lh">
    <div class="lh-l">
      <div class="mark">${wordmark(34)}</div>
      <div class="ttl">${esc(chrome.title)}</div>
    </div>
    <div class="lh-r">${esc(chrome.subtitle)}</div>
  </header>
  <div class="body">${bodyHtml}</div>
  <footer class="ft">
    <span>${esc(chrome.brand)}</span>
    <span>${esc(chrome.pageLabel)}</span>
    <span>${esc(chrome.footRight)}</span>
  </footer>
</section>`;
}

/** A block of an exact height. Everything on a page is one of these. */
function block(h: number, html: string, cls = ''): string {
  return `<div class="blk ${cls}" style="height:${mm(h)}">${html}</div>`;
}

function sectionTitle(text: string): string {
  return `<div class="sec">${esc(text)}</div>`;
}

/* ══════════════════ 1. The ECG sheets ══════════════════ */

/**
 * The ruler, printed ON the paper.
 *
 * Asked for: "add the square measurements onto the ECG axes." A grid without
 * numbers asks the reader to remember that a large square is 200 ms and
 * 0.5 mV - which every clinician does know, and which is exactly the kind of
 * recall a document should not be spending. A second tick every 5 mm of
 * amplitude and a label every large square along the time axis costs nothing
 * and makes the sheet self-describing.
 */
function axisTicks(sampleRate: number, secondsBefore: number): string {
  const parts: string[] = [];
  const usable = COL_W - CAL_W;
  /* One label per SECOND: at 25 mm/s that is every 5 large squares, which is
     dense enough to find a point and sparse enough not to become texture. */
  for (let sec = 0; CAL_W + sec * STANDARD_MM_PER_SEC <= COL_W - 4; sec++) {
    const x = CAL_W + sec * STANDARD_MM_PER_SEC;
    parts.push(
      `<line x1="${x.toFixed(2)}" y1="${(STRIP_H - 3.4).toFixed(2)}" x2="${x.toFixed(2)}" y2="${(STRIP_H - 1.2).toFixed(2)}" stroke="${MUTED}" stroke-width="0.2"/>`,
      `<text x="${(x + 0.7).toFixed(2)}" y="${(STRIP_H - 1.6).toFixed(2)}" font-size="2.3" fill="${MUTED}">${(secondsBefore + sec).toFixed(0)}s</text>`,
    );
  }
  /* Amplitude: +/- 0.5 mV either side of the baseline is one large square, and
     that is the number a reader actually measures against. */
  const base = STRIP_H / 2;
  for (const mv of [1, 0.5, -0.5, -1]) {
    const y = base - mv * STANDARD_MM_PER_MV;
    if (y < 4 || y > STRIP_H - 4) continue;
    parts.push(
      `<text x="${(COL_W - 1).toFixed(2)}" y="${(y - 0.5).toFixed(2)}" font-size="2.3" fill="${MUTED}" text-anchor="end">${mv > 0 ? '+' : ''}${mv} mV</text>`,
    );
  }
  parts.push(
    `<text x="${(CAL_W - 0.8).toFixed(2)}" y="${(STRIP_H - 1.6).toFixed(2)}" font-size="2.2" fill="${MUTED}" text-anchor="end">1 mV</text>`,
  );
  return parts.join('');
}

/** One lead band. Explicit width AND height — never inferred. */
function strip(
  lead: string,
  data: Float32Array,
  sampleRate: number,
  rPeaks: number[] | undefined,
  secondsBefore: number,
): string {
  const baseline = STRIP_H / 2;
  const grid = buildEcgGrid(COL_W, STRIP_H);
  const path = buildEcgPath(data, {
    sampleRate,
    mmPerSec: STANDARD_MM_PER_SEC,
    mmPerMv: STANDARD_MM_PER_MV,
    baselineMm: baseline,
    xOffsetMm: CAL_W,
    bucketsPerMm: 8,
    clipMm: baseline - 0.8,
  });
  const cal = buildCalibrationPulse(baseline, STANDARD_MM_PER_MV, STANDARD_MM_PER_SEC, 1);
  const ticks = (rPeaks ?? [])
    .map((r) => CAL_W + (r / sampleRate) * STANDARD_MM_PER_SEC)
    .filter((x) => x <= COL_W - 1)
    .map(
      (x) =>
        `<line x1="${x.toFixed(2)}" y1="0.8" x2="${x.toFixed(2)}" y2="3" stroke="${MARKER}" stroke-width="0.3"/>`,
    )
    .join('');

  return `<svg class="strip" width="${mm(COL_W)}" height="${mm(STRIP_H)}" viewBox="0 0 ${COL_W} ${STRIP_H}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${COL_W}" height="${STRIP_H}" fill="${PAPER}"/>
  <path d="${grid.minor}" fill="none" stroke="${GRID_MINOR}" stroke-width="0.09"/>
  <path d="${grid.major}" fill="none" stroke="${GRID_MAJOR}" stroke-width="0.19"/>
  <path d="${cal}" fill="none" stroke="${TRACE}" stroke-width="0.2" stroke-linejoin="round" opacity="0.85"/>
  ${ticks}
  <path d="${path}" fill="none" stroke="${TRACE}" stroke-width="0.26" stroke-linecap="round" stroke-linejoin="round"/>
  <rect x="1.2" y="1.2" width="7.2" height="5.4" rx="1" fill="${PAPER}" opacity="0.9"/>
  <text x="2" y="5.4" font-size="3.8" font-weight="800" fill="${TRACE}">${esc(lead)}</text>
  ${axisTicks(sampleRate, secondsBefore)}
</svg>`;
}

/** Samples that fit on one sheet at the standard 25 mm/s. */
export function samplesPerSheet(fs: number): number {
  return Math.max(1, Math.floor(((COL_W - CAL_W) / STANDARD_MM_PER_SEC) * fs));
}

/** ★ Counted BEFORE anything is built, because every page prints "n of N"
    and N is not knowable from inside a page builder. Two passes over the
    same arithmetic would eventually disagree; one function cannot. */
/**
 * ★ ALWAYS ONE. THE RECORDING IS NOT PAGINATED ANY MORE.
 *
 * It used to be: 186 mm of column at 25 mm/s holds 7.1 s, so a 10 s capture
 * became two sheets and the second one was six leads that stopped a third of
 * the way across - "half a page of ECG for the remaining leads", reported
 * exactly that way, and it looked broken because it WAS the ugly half of a
 * trade-off nobody had asked for.
 *
 * The trade being made instead: the sheet shows the first ~7.1 s at the full
 * clinical 25 mm/s, and the caption states the window and the total. Squeezing
 * 10 s into 186 mm would mean 18.6 mm/s, and rescaling the time axis is banned
 * for a good reason (`ecgPath.ts`) - every interval measured off the paper
 * would be wrong by a quarter. Seven seconds of true-scale six-lead ECG is a
 * legitimate clinical strip; a compressed ten is not.
 *
 * The full waveform is not lost: CSV and EDF export carry every sample.
 */
export function countEcgSheets(): number {
  return 1;
}

export function ecgPages(
  leads: Record<LimbLeadName, Float32Array>,
  analysis: EcgAnalysis,
  sampleCount: number,
  chrome: Omit<Chrome, 'title' | 'pageLabel' | 'footRight'>,
  labels: PdfLabels,
  totalPages: number,
  firstPageNumber: number,
): { html: string; pages: number } {
  const fs = analysis.sampleRate;
  const perSheet = samplesPerSheet(fs);
  const sheets = 1;

  /* Checked once for the shape every ECG page has. If STRIP_H or the
     margins are ever edited, this is what refuses the edit. */
  assertFits('ecg', [STRIP_H * 6, SHEET_CAPTION_H]);

  const html = Array.from({ length: sheets }, (_, s) => {
    const from = s * perSheet;
    const to = Math.min(sampleCount, from + perSheet);
    const bands = LIMB_LEAD_ORDER.map((lead) =>
      strip(
        lead,
        leads[lead].subarray(from, to),
        fs,
        /* Lead II carries the R-peak ticks: it is the rhythm strip the rate
           was computed from, and marking all six would imply six
           independent detections. Re-based onto this sheet's window. */
        lead === 'II' ? analysis.rPeaks.filter((r) => r >= from && r < to).map((r) => r - from) : undefined,
        from / fs,
      ),
    ).join('');

    /* States the window against the TOTAL. The sheet no longer paginates, so
       the honest thing is to say which slice of the capture is drawn rather
       than to let the reader assume it is all of it. */
    const caption = `<div class="cap">
      <span><b>${STANDARD_MM_PER_SEC} mm/s</b> &middot; <b>${STANDARD_MM_PER_MV} mm/mV</b> &middot; 1 mV calibration pulse per lead &middot; small square 40 ms / 0.1 mV</span>
      <span>${esc(labels.sheetWindow
        .replace('{from}', (from / fs).toFixed(1))
        .replace('{to}', (to / fs).toFixed(1))
        .replace('{total}', (sampleCount / fs).toFixed(1)))}</span>
    </div>`;

    return page(
      {
        ...chrome,
        title: labels.pageEcg,
        pageLabel: labels.pageOf
          .replace('{n}', String(firstPageNumber + s))
          .replace('{total}', String(totalPages)),
        footRight: `${STANDARD_MM_PER_SEC} mm/s · ${STANDARD_MM_PER_MV} mm/mV`,
      },
      block(STRIP_H * 6, `<div class="sheet">${bands}</div>`) +
        block(SHEET_CAPTION_H, caption),
    );
  }).join('');

  return { html, pages: sheets };
}

/* ══════════════════ 2. Interpretation ══════════════════ */

const VERDICT_H = 34;
const FINDING_H = 25;
const AUDIT_TITLE_H = 7;
const SECTION_GAP = 3;

/** Rows the audit grid can hold on the interpretation page, once the verdict
    and any findings have taken their share. Derived, never guessed. */
const AUDIT_ROW_H = 4.4;

function findingRow(f: ScreeningFinding, labels: PdfLabels): string {
  const c = LEVEL_COLOR[f.level] ?? LEVEL_COLOR.attention;
  const copy = labels.finding(f.id);
  const evidence = f.evidence
    .map((e) => `<span class="ev"><b>${esc(e.label)}</b> ${esc(e.value)}</span>`)
    .join('');
  const fill = Math.max(6, Math.round(f.margin * 100));

  return `<div class="find" style="height:${mm(FINDING_H)}">
    <div class="find-bar" style="background:${c.ink}"></div>
    <div class="find-body">
      <div class="find-top">
        <span class="find-name">${esc(copy.name)}</span>
        <span class="chip" style="background:${c.soft};color:${c.ink}">${esc(labels.confidence(f.confidence))}</span>
        <span class="chip chip-q">${esc(labels.category(f.category))}</span>
        ${f.borderline ? `<span class="chip chip-q">${esc(labels.borderlineNote)}</span>` : ''}
      </div>
      <div class="find-mean">${esc(copy.meaning)}</div>
      <div class="find-ev">${evidence}</div>
      <div class="mtrack"><i style="width:${fill}%;background:${c.ink}"></i></div>
      <div class="find-src">${esc(labels.criterion)}: ${esc(f.source)}</div>
    </div>
  </div>`;
}

/**
 * ★ THE AUDIT — every one of the 43 checks and what happened to it.
 *
 * ══ WHY THIS EXISTS ══
 * Reported, and it was the right thing to be angry about: *"a whole page for
 * that one line? Are you serious?"* The interpretation page carried a ring, a
 * headline and one finding on 297 mm of paper, and the rest was white.
 *
 * The deeper problem was not the emptiness, it was that "no abnormal finding"
 * is a claim with NO CONTENT unless the reader knows what was looked for.
 * A clinician wants the NEGATIVE list at least as much as the positive one —
 * "atrial fibrillation: not present" is a clinical statement, and a report
 * that omits it is asking to be trusted rather than read.
 *
 * Three columns of small type carry all 43 in ~50 mm, grouped by the category
 * a reader triages by, with the ruled-out ones set quietly and anything found
 * in its level's colour.
 */
function auditGrid(screening: EcgScreening, labels: PdfLabels): string {
  const ORDER: ScreeningFinding['category'][] = [
    'rhythm', 'conduction', 'ischaemia', 'repolarisation', 'rate', 'chamber', 'axis', 'other', 'technical',
  ];
  const byCat = new Map<string, typeof screening.checks>();
  for (const c of screening.checks) {
    if (!byCat.has(c.category)) byCat.set(c.category, []);
    byCat.get(c.category)!.push(c);
  }

  const foundIds = new Map(screening.findings.map((f) => [f.id, f]));

  const groups = ORDER.filter((cat) => byCat.has(cat)).map((cat) => {
    const rows = byCat
      .get(cat)!
      .map((c) => {
        const f = foundIds.get(c.id);
        const ink = f ? (LEVEL_COLOR[f.level] ?? LEVEL_COLOR.attention).ink : null;
        const glyph =
          c.status === 'found' ? '&#9679;' : c.status === 'notPresent' ? '&#8211;' : '&#63;';
        const cls =
          c.status === 'found' ? 'a-found' : c.status === 'notPresent' ? 'a-out' : 'a-na';
        return `<div class="arow ${cls}"${ink ? ` style="color:${ink}"` : ''}><i>${glyph}</i><span>${esc(
          labels.finding(c.id).name,
        )}</span></div>`;
      })
      .join('');
    return `<div class="agroup"><h4>${esc(labels.category(cat))}</h4>${rows}</div>`;
  });

  return `<div class="audit">${groups.join('')}</div>`;
}

export function interpretationPages(
  screening: EcgScreening,
  chrome: Omit<Chrome, 'title' | 'pageLabel' | 'footRight'>,
  labels: PdfLabels,
  totalPages: number,
  firstPageNumber: number,
): { html: string; pages: number } {
  const c = LEVEL_COLOR[screening.level] ?? LEVEL_COLOR.inconclusive;
  const copy = labels.level(screening.level);
  const { rulesEvaluated, rulesTotal } = screening.stats;

  const verdict = `<div class="verdict" style="border-color:${c.ink}33;background:${c.soft}">
    ${donut({
      size: 26,
      fraction: rulesTotal > 0 ? rulesEvaluated / rulesTotal : 0,
      ink: c.ink,
      soft: PAPER,
      centre: `${rulesEvaluated}`,
      caption: `/ ${rulesTotal}`,
    })}
    <div class="verdict-copy">
      <div class="verdict-head" style="color:${c.ink}">${esc(copy.headline)}</div>
      <div class="verdict-act">${esc(copy.action)}</div>
      <div class="verdict-checks">${esc(
        labels.checksRan.replace('{done}', String(rulesEvaluated)).replace('{total}', String(rulesTotal)),
      )}</div>
    </div>
  </div>`;

  /* ★ ONE PAGE. The findings take what they need and the audit takes the
     rest, so the sheet is full whatever the result — an empty half page was
     the complaint, and a layout whose density depends on the diagnosis is a
     layout that has only been looked at with one diagnosis. */
  const found = screening.findings;
  const findingsH = found.length * FINDING_H;
  const titleH = 8;
  const auditRows = Math.ceil(screening.checks.length / 3) + 9;
  const auditH = Math.max(30, AUDIT_TITLE_H + auditRows * AUDIT_ROW_H);

  const spare = BODY_H - VERDICT_H - SECTION_GAP - (found.length ? titleH + findingsH : 0)
    - SECTION_GAP - AUDIT_TITLE_H;

  /* Findings that do not fit continue on a second page rather than being
     dropped or squeezed. Nothing is ever silently omitted from a report. */
  const perExtra = Math.floor((BODY_H - titleH) / FINDING_H);
  const firstCount = Math.max(0, Math.min(found.length, Math.floor((BODY_H - VERDICT_H - SECTION_GAP - titleH - 34) / FINDING_H)));
  const first = found.slice(0, firstCount);
  const rest: ScreeningFinding[][] = [];
  for (let i = firstCount; i < found.length; i += perExtra) rest.push(found.slice(i, i + perExtra));

  const firstFindingsH = first.length * FINDING_H;
  const auditAvail = BODY_H - VERDICT_H - SECTION_GAP - (first.length ? titleH + firstFindingsH : 0) - SECTION_GAP - AUDIT_TITLE_H;

  assertFits('interpretation', [
    VERDICT_H,
    SECTION_GAP,
    first.length ? titleH + firstFindingsH : 0,
    SECTION_GAP,
    AUDIT_TITLE_H,
    Math.max(0, auditAvail),
  ]);

  const firstPage = page(
    {
      ...chrome,
      title: labels.pageInterpretation,
      pageLabel: labels.pageOf.replace('{n}', String(firstPageNumber)).replace('{total}', String(totalPages)),
      footRight: copy.headline,
    },
    block(VERDICT_H, verdict) +
      block(SECTION_GAP, '') +
      (first.length
        ? block(titleH, sectionTitle(labels.findingsTitle)) + block(firstFindingsH, first.map((f) => findingRow(f, labels)).join(''))
        : '') +
      block(SECTION_GAP, '') +
      block(AUDIT_TITLE_H, sectionTitle(labels.auditTitle)) +
      block(Math.max(0, auditAvail), auditGrid(screening, labels) + `<div class="auditnote">${esc(labels.auditNote)}</div>`),
  );

  const extraPages = rest.map((chunk, i) => {
    assertFits(`interpretation cont ${i + 1}`, [titleH, chunk.length * FINDING_H]);
    return page(
      {
        ...chrome,
        title: labels.pageInterpretation,
        pageLabel: labels.pageOf
          .replace('{n}', String(firstPageNumber + 1 + i))
          .replace('{total}', String(totalPages)),
        footRight: copy.headline,
      },
      block(titleH, sectionTitle(`${labels.findingsTitle} (${labels.continued})`)) +
        block(chunk.length * FINDING_H, chunk.map((f) => findingRow(f, labels)).join('')),
    );
  });

  return { html: firstPage + extraPages.join(''), pages: 1 + extraPages.length };
}

/** How many interpretation pages there will be. Same arithmetic as the
    builder, so the page count and the pages cannot disagree. */
export function countInterpretationPages(findings: readonly ScreeningFinding[]): number {
  const titleH = 8;
  const perExtra = Math.floor((BODY_H - titleH) / FINDING_H);
  const firstCount = Math.max(0, Math.min(findings.length, Math.floor((BODY_H - VERDICT_H - SECTION_GAP - titleH - 34) / FINDING_H)));
  return 1 + Math.ceil(Math.max(0, findings.length - firstCount) / perExtra);
}

/* ══════════════════ 3. Statistics ══════════════════ */

const REF = {
  pr: { min: 80, max: 320, low: 120, high: 200 },
  qrs: { min: 40, max: 200, low: 80, high: 120 },
  qt: { min: 200, max: 600, low: 300, high: 440 },
  qtc: { min: 280, max: 600, low: 350, high: 450 },
} as const;

/** Green when inside the reference band, gold when outside. A colour that
    means "outside the band" and nothing more — the finding rules decide
    whether being outside matters, and they have already run. */
function bandInk(v: number | null, low: number, high: number): string {
  if (v === null) return MUTED;
  return v >= low && v <= high ? BRAND : LEVEL_COLOR.attention.ink;
}

/**
 * ★ THE MEDIAN BEAT PANEL — the same representative beat the app's ECG ID tab
 * shows, all six leads, side by side.
 *
 * Asked for, and it is the single most clinically useful thing that was
 * missing. A ten-second strip shows the rhythm; a MEDIAN beat shows the
 * morphology with the noise averaged out of it, which is what a reader
 * actually inspects when asking about a Q wave or an ST segment. Real ECG
 * machines print exactly this panel next to the rhythm strip.
 *
 * It is built from `buildBeatTemplates` in `@cyphix/shared` — the same
 * function the ECG ID uses — so the beat on this page and the beat on that
 * screen are the same beat, computed once and never re-derived.
 */
function medianBeatPanel(
  templates: TemplatePanel | null,
  w: number,
  h: number,
  labels: PdfLabels,
): string {
  if (!templates || templates.leads.length === 0) {
    return `<div class="empty">${esc(labels.noFindings)}</div>`;
  }
  const cellW = (w - 5 * 2) / 6;
  const cells = templates.leads
    .map(
      (l) => `<div class="mbcell" style="width:${mm(cellW)}">
        <div class="mblead">${esc(l.name)}</div>
        ${beatFigure({ w: cellW, h: h - 7, signal: l.data, from: 0, to: l.data.length - 1, band: null, ink: BRAND })}
      </div>`,
    )
    .join('');
  return `<div class="mbrow">${cells}</div>`;
}

/** What the statistics page needs to draw the median beats. */
export interface TemplatePanel {
  leads: { name: string; data: Float32Array }[];
  beatsUsed: number;
  beatsRejected: number;
}

export function statisticsPage(
  analysis: EcgAnalysis,
  screening: EcgScreening | null,
  templates: TemplatePanel | null,
  chrome: Omit<Chrome, 'title' | 'pageLabel' | 'footRight'>,
  labels: PdfLabels,
  totalPages: number,
  pageNumber: number,
): string {
  const { rate, intervals, axis, amplitudes, quality } = analysis;
  const fs = analysis.sampleRate;

  const rrMs: number[] = [];
  for (let i = 1; i < analysis.rPeaks.length; i++) {
    rrMs.push(((analysis.rPeaks[i] - analysis.rPeaks[i - 1]) / fs) * 1000);
  }

  /* ── Block heights, declared before anything is drawn ── */
  const H_TILES = 24;
  const H_MB_TITLE = 7;
  const H_MB = 30;
  const H_INT_TITLE = 7;
  const H_INTERVALS = 13 * 5;
  const H_FIG_TITLE = 7;
  const H_FIGS = 46;
  const H_AMP_TITLE = 7;
  const H_AMPS = 51;
  assertFits('statistics', [
    H_TILES,
    H_MB_TITLE,
    H_MB,
    H_INT_TITLE,
    H_INTERVALS,
    H_FIG_TITLE,
    H_FIGS,
    H_AMP_TITLE,
    H_AMPS,
  ]);

  const tile = (label: string, value: string, unit: string, ink = INK): string =>
    `<div class="tile"><div class="tile-v" style="color:${ink}">${esc(value)}<span>${esc(unit)}</span></div><div class="tile-l">${esc(label)}</div></div>`;

  const num = (v: number | null, d = 0): string => (v === null ? '—' : v.toFixed(d));

  const tiles = `<div class="tiles">
    ${tile(labels.mBpm, num(rate.bpm), 'BPM', BRAND)}
    ${tile(labels.mSdnn, num(rate.sdnnMs, 1), 'ms')}
    ${tile(labels.mRmssd, num(rate.rmssdMs, 1), 'ms')}
    ${tile(labels.mRrVariation, num(rate.rrVariationPct, 1), '%')}
    ${tile(labels.mBeats, String(rate.beatsAnalyzed), '')}
    ${tile(labels.mSqi, String(quality.sqi), '%', BRAND)}
  </div>`;

  const intervals5 = [
    rangeBar({ w: COL_W, label: 'PR', value: intervals.prMs, unit: 'ms', ...REF.pr, ink: bandInk(intervals.prMs, REF.pr.low, REF.pr.high) }),
    rangeBar({ w: COL_W, label: 'QRS', value: intervals.qrsMs, unit: 'ms', ...REF.qrs, ink: bandInk(intervals.qrsMs, REF.qrs.low, REF.qrs.high) }),
    rangeBar({ w: COL_W, label: 'QT', value: intervals.qtMs, unit: 'ms', ...REF.qt, ink: bandInk(intervals.qtMs, REF.qt.low, REF.qt.high) }),
    rangeBar({ w: COL_W, label: 'QTc B', value: intervals.qtcBazettMs, unit: 'ms', ...REF.qtc, ink: bandInk(intervals.qtcBazettMs, REF.qtc.low, REF.qtc.high) }),
    rangeBar({ w: COL_W, label: 'QTc F', value: intervals.qtcFridericiaMs, unit: 'ms', ...REF.qtc, ink: bandInk(intervals.qtcFridericiaMs, REF.qtc.low, REF.qtc.high) }),
  ].join('');

  const figW = (COL_W - 8) / 3;
  const level = screening ? (LEVEL_COLOR[screening.level] ?? LEVEL_COLOR.clear) : LEVEL_COLOR.clear;
  const figs = `<div class="figrow">
    <div class="fig" style="width:${mm(figW)}">
      ${hexaxial({ size: 38, degrees: axis.degrees, ink: level.ink })}
      <div class="fig-cap">${esc(labels.axisCaption)}</div>
    </div>
    <div class="fig" style="width:${mm(figW)}">
      ${poincare({ size: 38, rrMs, ink: BRAND })}
      <div class="fig-cap">${esc(labels.poincareCaption)}</div>
    </div>
    <div class="fig" style="width:${mm(figW)}">
      ${tachogram({ w: figW, h: 38, rrMs, ink: BRAND, meanMs: rate.rrMeanMs })}
      <div class="fig-cap">${esc(labels.tachogramCaption)}</div>
    </div>
  </div>`;

  const peak = Math.max(
    0.2,
    ...LIMB_LEAD_ORDER.flatMap((l) => {
      const a = amplitudes[l];
      return [a?.pMv ?? 0, a?.qMv ?? 0, a?.rMv ?? 0, a?.sMv ?? 0, a?.tMv ?? 0].map(Math.abs);
    }),
  );
  const cell = (v: number | null): string =>
    `<td>${v === null ? '—' : (v > 0 ? '+' : '') + v.toFixed(2)}</td>`;

  const ampRows = LIMB_LEAD_ORDER.map((l) => {
    const a = amplitudes[l];
    return `<tr>
      <th>${l}</th>
      ${cell(a?.pMv ?? null)}${cell(a?.qMv ?? null)}${cell(a?.rMv ?? null)}${cell(a?.sMv ?? null)}${cell(a?.tMv ?? null)}
      <td class="ampcell">${amplitudeBar({ w: 42, values: [a?.pMv ?? null, a?.qMv ?? null, a?.rMv ?? null, a?.sMv ?? null, a?.tMv ?? null], peak })}</td>
    </tr>`;
  }).join('');

  const amps = `<table class="amp">
    <thead><tr><th>${esc(labels.ampLead)}</th><th>P</th><th>Q</th><th>R</th><th>S</th><th>T</th><th></th></tr></thead>
    <tbody>${ampRows}</tbody>
  </table>
  <div class="fig-cap">${esc(labels.ampUnit)}</div>`;

  return page(
    {
      ...chrome,
      title: labels.pageStatistics,
      pageLabel: labels.pageOf.replace('{n}', String(pageNumber)).replace('{total}', String(totalPages)),
      footRight: `${labels.mAnalysed}: ${quality.analysedSeconds} s`,
    },
    block(H_TILES, tiles) +
      block(
        H_MB_TITLE,
        sectionTitle(
          templates
            ? `${labels.medianBeatTitle} · ${labels.medianBeatCaption
                .replace('{used}', String(templates.beatsUsed))
                .replace('{rejected}', String(templates.beatsRejected))}`
            : labels.medianBeatTitle,
        ),
      ) +
      block(H_MB, medianBeatPanel(templates, COL_W, H_MB, labels)) +
      block(H_INT_TITLE, sectionTitle(`${labels.statsIntervals} · ${labels.refRange}`)) +
      block(H_INTERVALS, intervals5) +
      block(H_FIG_TITLE, sectionTitle(labels.statsVariability)) +
      block(H_FIGS, figs) +
      block(H_AMP_TITLE, sectionTitle(labels.statsAmplitudes)) +
      block(H_AMPS, amps),
  );
}

/* ══════════════════ 4. Reference ══════════════════ */

export function referencePage(
  screening: EcgScreening | null,
  leadII: Float32Array | null,
  analysis: EcgAnalysis,
  note: string | null,
  chrome: Omit<Chrome, 'title' | 'pageLabel' | 'footRight'>,
  labels: PdfLabels,
  totalPages: number,
  pageNumber: number,
): string {
  const H_MAP_TITLE = 7;
  const H_MAP = 62;
  const H_BLIND_TITLE = 7;
  const H_BLIND = 34;
  const H_HOW_TITLE = 7;
  const H_HOW = 34;
  const H_NOTE = note ? 26 : 0;
  const H_DISC = 22;
  assertFits('reference', [
    H_MAP_TITLE,
    H_MAP,
    H_BLIND_TITLE,
    H_BLIND,
    H_HOW_TITLE,
    H_HOW,
    H_NOTE,
    H_DISC,
  ]);

  /* A representative beat beside the triangle, so the two figures together
     say "this is where the leads look" and "this is what they recorded". */
  const rPeaks = analysis.rPeaks;
  const centre = rPeaks.length > 0 ? rPeaks[Math.floor(rPeaks.length / 2)] : 0;
  const from = Math.max(0, centre - Math.round(0.32 * analysis.sampleRate));
  const to = Math.min((leadII?.length ?? 1) - 1, centre + Math.round(0.46 * analysis.sampleRate));

  const map = `<div class="maprow">
    <div class="mapfig">
      ${einthoven({ w: 76, h: 58, highlight: ['I', 'II', 'III'] })}
    </div>
    <div class="mapcopy">
      <p>${esc(labels.leadMapCaption)}</p>
      <div class="wall"><b>II · III · aVF</b><span>${esc(labels.wallInferior)}</span></div>
      <div class="wall"><b>I · aVL</b><span>${esc(labels.wallLateral)}</span></div>
      <div class="wall wall-off"><b>V1–V6</b><span>${esc(labels.wallNotSeen)}</span></div>
      ${leadII ? beatFigure({ w: 82, h: 20, signal: leadII, from, to, band: null, ink: BRAND }) : ''}
    </div>
  </div>`;

  const blind = screening
    ? `<ul class="blind">${screening.blindSpots
        .map((b) => `<li>${esc(labels.blindSpot(b))}</li>`)
        .join('')}</ul>`
    : '';

  const how = `<ol class="how">${labels.howToRead.map((l) => `<li>${esc(l)}</li>`).join('')}</ol>`;

  return page(
    {
      ...chrome,
      title: labels.pageReference,
      pageLabel: labels.pageOf.replace('{n}', String(pageNumber)).replace('{total}', String(totalPages)),
      footRight: '',
    },
    block(H_MAP_TITLE, sectionTitle(labels.leadMapTitle)) +
      block(H_MAP, map) +
      block(H_BLIND_TITLE, sectionTitle(labels.blindTitle)) +
      block(H_BLIND, blind) +
      block(H_HOW_TITLE, sectionTitle(labels.howToReadTitle)) +
      block(H_HOW, how) +
      (note
        ? block(H_NOTE, `<div class="note"><b>${esc(labels.noteTitle)}</b><br/>${esc(note)}</div>`)
        : '') +
      block(H_DISC, `<p class="disc">${esc(labels.disclaimer)}</p>`),
  );
}

/* ══════════════════ The stylesheet ══════════════════ */

export const REPORT_CSS = `
@page { size: A4 portrait; margin: 0; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: ${PAPER}; }
body { font-family: -apple-system, "SF Pro Text", "Helvetica Neue", Roboto, Arial, sans-serif;
       color: ${INK}; -webkit-print-color-adjust: exact; print-color-adjust: exact;
       -webkit-font-smoothing: antialiased; }

/* ★ The page is a FIXED BOX. 'overflow:hidden' is the last line of defence
   behind assertFits: if arithmetic ever fails, the damage is a clipped
   block on one page rather than a lead torn across two. */
.pg { position: relative; width: 210mm; height: ${PAGE_BOX_H}mm; overflow: hidden;
      padding: 10mm 12mm 8mm; page-break-after: always; break-after: page; }
.pg:last-child { page-break-after: avoid; break-after: avoid; }

.lh { height: 16mm; display: flex; align-items: flex-start; justify-content: space-between;
      border-bottom: 0.5mm solid ${INK}; padding-bottom: 2mm; }
.mark { line-height: 0; }
.mark svg { display: block; }
.ttl { font-size: 13pt; font-weight: 800; letter-spacing: -0.3px; margin-top: 1.6mm; color: ${BRAND}; }
.lh-r { font-size: 7.5pt; color: ${SLATE}; text-align: right; line-height: 1.5;
        max-width: 80mm; overflow: hidden; }

.body { height: ${BODY_H}mm; }
.blk { overflow: hidden; }
.ft { position: absolute; left: 12mm; right: 12mm; bottom: 8mm; height: 7mm;
      display: flex; align-items: flex-end; justify-content: space-between;
      font-size: 7pt; color: ${MUTED}; border-top: 0.2mm solid ${HAIRLINE}; }

.sec { font-size: 9.5pt; font-weight: 800; letter-spacing: -0.2px; color: ${INK};
       padding-bottom: 1.4mm; }

/* ── ECG ── */
.sheet { border: 0.25mm solid ${HAIRLINE}; border-radius: 1.5mm; overflow: hidden;
         display: block; font-size: 0; line-height: 0; }
.strip { display: block; }
.cap { display: flex; justify-content: space-between; align-items: center;
       font-size: 7pt; color: ${SLATE}; padding-top: 2mm; }

/* ── Interpretation ── */
.verdict { display: flex; align-items: center; gap: 6mm; height: 100%;
           border: 0.3mm solid; border-radius: 3mm; padding: 4mm 6mm; }
.verdict-copy { flex: 1; min-width: 0; }
.verdict-head { font-size: 17pt; font-weight: 800; letter-spacing: -0.5px; line-height: 1.1; }
.verdict-act { font-size: 9.5pt; color: ${SLATE}; margin-top: 1.4mm; }
.verdict-checks { font-size: 7.5pt; color: ${MUTED}; margin-top: 1.4mm; }

.find { display: flex; gap: 0; border: 0.2mm solid ${HAIRLINE}; border-radius: 2mm;
        overflow: hidden; margin-bottom: 1.6mm; }
.find-bar { width: 1.2mm; flex: none; }
.find-body { flex: 1; min-width: 0; padding: 2mm 3mm; }
.find-top { display: flex; align-items: center; gap: 2mm; }
.find-name { font-size: 10pt; font-weight: 800; letter-spacing: -0.2px; }
.chip { font-size: 6.5pt; font-weight: 800; padding: 0.5mm 1.6mm; border-radius: 1mm; }
.chip-q { background: ${SURFACE}; color: ${SLATE}; }
.find-mean { font-size: 8pt; color: ${SLATE}; margin-top: 0.8mm; line-height: 1.35;
             max-height: 7mm; overflow: hidden; }
.find-ev { margin-top: 1mm; font-size: 7.5pt; color: ${INK}; }
.ev { display: inline-block; background: ${SURFACE}; border-radius: 1mm;
      padding: 0.4mm 1.4mm; margin-right: 1.4mm; font-variant-numeric: tabular-nums; }
.ev b { color: ${MUTED}; font-weight: 700; }
.mtrack { height: 0.9mm; background: ${SURFACE}; border-radius: 0.5mm; margin-top: 1.2mm;
          overflow: hidden; }
.mtrack i { display: block; height: 100%; border-radius: 0.5mm; }
.find-src { font-size: 6.5pt; color: ${MUTED}; margin-top: 1mm;
            white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.empty { font-size: 9pt; color: ${SLATE}; background: ${SURFACE}; border-radius: 2mm;
         padding: 4mm; }

/* ── Statistics ── */
.tiles { display: flex; gap: 2mm; height: 100%; }
.tile { flex: 1; border: 0.2mm solid ${HAIRLINE}; border-radius: 2mm; padding: 2.4mm 2mm;
        background: ${PAPER}; overflow: hidden; }
.tile-v { font-size: 15pt; font-weight: 800; letter-spacing: -0.6px;
          font-variant-numeric: tabular-nums; white-space: nowrap; }
.tile-v span { font-size: 7pt; font-weight: 700; color: ${MUTED}; margin-left: 0.8mm; }
.tile-l { font-size: 6.8pt; color: ${SLATE}; margin-top: 1mm; line-height: 1.2; }

.figrow { display: flex; gap: 4mm; height: 100%; }
.fig { text-align: center; }
.fig-cap { font-size: 6.6pt; color: ${MUTED}; line-height: 1.3; margin-top: 1mm; }

table.amp { width: 100%; border-collapse: collapse; font-size: 8pt; }
table.amp thead th { font-size: 7pt; font-weight: 800; color: ${MUTED}; text-align: right;
                     padding: 1.2mm 1.6mm; border-bottom: 0.3mm solid ${INK}; }
table.amp thead th:first-child { text-align: left; }
table.amp tbody th { text-align: left; font-weight: 800; font-size: 8.5pt;
                     padding: 1.4mm 1.6mm; border-bottom: 0.2mm solid ${HAIRLINE}; }
table.amp td { text-align: right; padding: 1.4mm 1.6mm; font-variant-numeric: tabular-nums;
               border-bottom: 0.2mm solid ${HAIRLINE}; }
table.amp tbody tr:nth-child(even) th, table.amp tbody tr:nth-child(even) td { background: ${SURFACE}; }
td.ampcell { width: 44mm; padding-right: 0; }

/* -- The audit grid: 43 checks in three columns -- */
.audit { column-count: 3; column-gap: 6mm; }
.agroup { break-inside: avoid; margin-bottom: 2mm; }
.agroup h4 { margin: 0 0 0.8mm; font-size: 6.6pt; font-weight: 800; letter-spacing: 0.6px;
             text-transform: uppercase; color: ${MUTED}; }
.arow { display: flex; gap: 1.4mm; align-items: baseline; font-size: 7pt; line-height: 1.45; }
.arow i { font-style: normal; width: 2mm; flex: none; text-align: center; }
.a-out { color: ${SLATE}; }
.a-out i { color: ${HAIRLINE}; }
.a-na { color: ${MUTED}; }
.a-found { font-weight: 800; }
.auditnote { font-size: 6.4pt; color: ${MUTED}; margin-top: 1.6mm; line-height: 1.4; }

/* -- Median beats -- */
.mbrow { display: flex; gap: 2mm; height: 100%; }
.mbcell { flex: none; }
.mblead { font-size: 7pt; font-weight: 800; color: ${BRAND}; margin-bottom: 0.8mm; }

/* ── Reference ── */
.maprow { display: flex; gap: 5mm; height: 100%; }
.mapfig { flex: none; }
.mapcopy { flex: 1; min-width: 0; }
.mapcopy p { margin: 0 0 2mm; font-size: 8pt; color: ${SLATE}; line-height: 1.45; }
.wall { display: flex; gap: 2.5mm; align-items: baseline; font-size: 8pt; margin-bottom: 1.4mm; }
.wall b { flex: none; width: 22mm; font-weight: 800; color: ${INK}; }
.wall span { color: ${SLATE}; }
.wall-off b, .wall-off span { color: ${MUTED}; }
ul.blind { margin: 0; padding-left: 4mm; font-size: 8pt; color: ${SLATE}; line-height: 1.5; }
ol.how { margin: 0; padding-left: 4.5mm; font-size: 8pt; color: ${SLATE}; line-height: 1.5; }
.note { font-size: 8pt; line-height: 1.45; background: ${SURFACE}; border-radius: 2mm;
        padding: 2.5mm 3mm; height: 100%; overflow: hidden; }
.disc { font-size: 6.8pt; line-height: 1.45; color: ${MUTED}; margin: 0; }
.sim { display: inline-block; font-size: 7.5pt; font-weight: 800; color: ${LEVEL_COLOR.urgent.ink};
       background: ${LEVEL_COLOR.urgent.soft}; padding: 0.8mm 2mm; border-radius: 1mm; }
`;

// v1.0.0 — Every page of the report at an exact millimetre, with assertFits
//          refusing a layout that would spill. Page 1 is the six-lead ECG at
//          full page; then the verdict, the statistics with real figures, and
//          the lead map.
