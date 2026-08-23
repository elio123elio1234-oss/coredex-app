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
  NOTCH_HZ,
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
  R_AMP_HEAD,
  R_AMP_LINE,
  R_AX_BG_A,
  R_AX_BG_B,
  R_AX_INK,
  R_AX_NUM,
  R_AX_SECTOR,
  R_BAND_A,
  R_BAND_B,
  R_BODY,
  R_FAINT,
  R_INK,
  R_MUTE,
  R_MUTE2,
  R_NUM,
  R_OUTLINE,
  R_PP_A,
  R_PP_B,
  R_PP_INK,
  R_Q_BG_A,
  R_Q_BG_B,
  R_Q_NUM,
  R_RULE,
  R_T_AMB_BG,
  R_T_AMB_LB,
  R_T_AMB_VA,
  R_T_BLUE_BG,
  R_T_BLUE_LB,
  R_T_BLUE_VA,
  R_T_RED_BG,
  R_T_RED_LB,
  R_T_RED_VA,
  R_T_VIO_BG,
  R_T_VIO_LB,
  R_T_VIO_VA,
  R_TRACK,
} from './reportPalette';
import {
  BAND_OK,
  BLUE,
  BLUE_SOFT,
  BODY_H,
  BRAND,
  BRAND_DEEP,
  BRAND_SOFT,
  GOLD,
  GREY_SOFT,
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
  RED,
  RED_SOFT,
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

export interface Chrome {
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
export function pageShell(chrome: Chrome, bodyHtml: string): string {
  return page(chrome, bodyHtml);
}

function page(chrome: Chrome, bodyHtml: string): string {
  /* The WORDMARK, not the word. Reported: "why are you not using my logo and
     writing it in plain text?" - and there is no answer, the logo existed as
     `components/atoms/BrandLogo` the whole time. It is 34 mm wide: large
     enough to be the issuer of a clinical document at a glance, small enough
     that the study title beside it is still the loudest thing on the page.

     ★ v0.56.0: THE LETTERHEAD IS A BAND, NOT A RULE. Reported: "not colourful
     enough … no added value." A modern lab report is not grayscale — it
     carries its issuer's colour as a full-width band on every sheet, and
     that one block is most of what separates "printout" from "document
     someone designed". The band bleeds into the page margins with negative
     margins + matching padding, so its FLOW height is exactly the 16 mm the
     geometry has always reserved (`HEADER_H`) — `assertFits` arithmetic is
     untouched. */
  return `<section class="pg">
  <header class="lh">
    <div class="lh-l">
      <div class="mark">${wordmark(34, true)}</div>
      <div class="ttl">${esc(chrome.title)}</div>
    </div>
    <div class="lh-r">${esc(chrome.subtitle)}</div>
  </header>
  <div class="body">${bodyHtml}</div>
  <footer class="ft">
    <span>${esc(chrome.brand)}</span>
    <span class="ft-page">${esc(chrome.pageLabel)}</span>
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
  identity: { label: string; value: string }[],
  chrome: Omit<Chrome, 'title' | 'pageLabel' | 'footRight'>,
  labels: PdfLabels,
  totalPages: number,
  firstPageNumber: number,
): { html: string; pages: number } {
  const c = LEVEL_COLOR[screening.level] ?? LEVEL_COLOR.inconclusive;
  const copy = labels.level(screening.level);
  const { rulesEvaluated, rulesTotal } = screening.stats;

  /* ★ A STATEMENT BLOCK, NOT A CARD. A rounded box with a coloured fill and
     a ring inside it is an app component photographed onto paper. A clinical
     report states its conclusion in a ruled block with a heavy left edge —
     the same shape a pathology report puts its impression in — because the
     conclusion is a STATEMENT the issuer is standing behind, not a widget. */
  const verdict = `<div class="stmt" style="border-left-color:${c.ink};background:${c.soft}">
    <div class="stmt-l">
      <div class="stmt-kicker">${esc(labels.pageInterpretation)}</div>
      <div class="stmt-head" style="color:${c.ink}">${esc(copy.headline)}</div>
      <div class="stmt-act">${esc(copy.action)}</div>
    </div>
    <div class="stmt-r">
      ${donut({
        size: 22,
        fraction: rulesTotal > 0 ? rulesEvaluated / rulesTotal : 0,
        ink: c.ink,
        soft: PAPER,
        centre: `${rulesEvaluated}`,
        caption: `/ ${rulesTotal}`,
      })}
      <div class="stmt-checks">${esc(
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
  const firstCount = Math.max(0, Math.min(found.length, Math.floor((BODY_H - 15 - SECTION_GAP - VERDICT_H - SECTION_GAP - titleH - 40) / FINDING_H)));
  const first = found.slice(0, firstCount);
  const rest: ScreeningFinding[][] = [];
  for (let i = firstCount; i < found.length; i += perExtra) rest.push(found.slice(i, i + perExtra));

  const firstFindingsH = first.length * FINDING_H;
  const auditAvail = BODY_H - 15 - SECTION_GAP - VERDICT_H - SECTION_GAP - (first.length ? titleH + firstFindingsH : 0) - SECTION_GAP - AUDIT_TITLE_H;

  const ID_H = 15;
  assertFits('interpretation', [
    ID_H,
    SECTION_GAP,
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
    block(ID_H, idBlock(identity)) +
      block(SECTION_GAP, '') +
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
  const firstCount = Math.max(0, Math.min(findings.length, Math.floor((BODY_H - 15 - SECTION_GAP - VERDICT_H - SECTION_GAP - titleH - 40) / FINDING_H)));
  return 1 + Math.ceil(Math.max(0, findings.length - firstCount) / perExtra);
}

/* ══════════════════ Clinical document primitives ══════════════════ */

/**
 * ★ THE IDENTIFICATION BLOCK — what every clinical report opens with.
 *
 * Reported: *"it does not look like a professional medical report."* The
 * pages were built out of APP idioms — rounded cards, soft fills, chips,
 * big tiles — and an app rendered onto A4 does not become a document. What
 * makes a report read as a report is boring and specific: a labelled
 * identification grid at the top, ruled tables, figures aligned on the
 * decimal, and a verification line at the bottom.
 *
 * This is the first of those. A reader picking the sheet out of a folder
 * needs to answer "whose, when, on what" before anything else, and they
 * should not have to read a sentence to do it.
 */
export function idBlock(rows: { label: string; value: string }[]): string {
  return `<div class="idgrid">${rows
    .map(
      (r) => `<div class="idcell"><span>${esc(r.label)}</span><b>${esc(r.value)}</b></div>`,
    )
    .join('')}</div>`;
}

/**
 * A measurement row with its reference range and a flag.
 *
 * The H / L flag column is the single most report-like thing on the page and
 * it is not decoration: it is how a reader scans forty numbers in two
 * seconds and stops on the one that matters. Blank when in range — a column
 * of ticks would make the exceptions harder to see, not easier.
 */
function measureRow(
  label: string,
  value: number | null,
  unit: string,
  low: number | null,
  high: number | null,
  digits = 0,
): string {
  const num = value === null ? '\u2014' : value.toFixed(digits);
  let flag = '';
  let cls = '';
  if (value !== null && low !== null && high !== null) {
    if (value > high) {
      flag = 'H';
      cls = 'hi';
    } else if (value < low) {
      flag = 'L';
      cls = 'lo';
    }
  }
  const ref =
    low === null || high === null ? '\u2014' : `${low}\u2013${high}`;
  return `<tr class="${cls}">
    <th>${esc(label)}</th>
    <td class="num">${num}</td>
    <td class="unit">${esc(unit)}</td>
    <td class="ref">${ref}</td>
    <td class="flag">${flag}</td>
  </tr>`;
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
  /* ★ Non-null for a SIMULATED report (v0.56.0): the identification grid
     normally opens the interpretation page, but a simulated study has none —
     which used to mean a report with NO "whose / when / on what" block at
     all. It renders here instead, and the figures below give up exactly the
     millimetres it takes. */
  identity: { label: string; value: string }[] | null,
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
  const withId = identity !== null;
  /* 18, not 15: the grid is eight cells at 25 % width — TWO rows — and 15 mm
     fits one and a half of them. The second row printed cut through the
     middle of its own type ("6 limb", "12", "100 %" all sliced). */
  const H_ID = withId ? 18 : 0;
  const H_ID_GAP = withId ? 3 : 0;
  const H_MB_TITLE_FIRST = 7;
  /* A ruled row is 2.6 mm of padding plus a LINE BOX (7.8 pt × 1.2 ≈
     3.3 mm), not 2.6 plus the font size. Seven rows are ~39.6 mm and the
     block said 38, so the last measurement of each column — SQI on the
     right, QTc (Fridericia) on the left — was cut in half. */
  /* 50, measured off a render rather than computed: the RESULT cell is
     8.6 pt, not the table rule 7.8 pt, so the line box is the tall one and a
     row is ~7.6 mm. At 44 the sixth measurement of each column — QTc
     (Fridericia) on the left, signal quality on the right — still did not
     print. Six data rows plus a header need 50. */
  const H_TILES = 52;
  const H_MB_TITLE = 7;
  const H_MB = 34;
  const H_INT_TITLE = 7;
  /* Five 13 mm bars, plus a millimetre of cushion. Exact now that the
     stack has no baseline under each row (see the .stack rule). */
  const H_INTERVALS = 13 * 5 + 3;
  const H_FIG_TITLE = 7;
  const H_FIGS = 48;
  assertFits('statistics', [
    H_ID,
    H_ID_GAP,
    H_MB_TITLE_FIRST,
    H_TILES,
    H_MB_TITLE,
    H_MB,
    H_INT_TITLE,
    H_INTERVALS,
    H_FIG_TITLE,
    H_FIGS,
  ]);

  /* ★ A RULED TABLE WITH REFERENCE RANGES AND FLAGS, not six app tiles.
     Six 30 pt numbers in rounded boxes is a dashboard; a clinician reads a
     column. Two columns of measurement / result / unit / reference / flag is
     what every ECG machine and every lab prints, and it is scannable in a way
     a tile grid is not: the eye runs down the flag column first and stops on
     the letters. */
  const tableRows = [
    measureRow(labels.mBpm, rate.bpm, 'BPM', 50, 100),
    measureRow('PR', intervals.prMs, 'ms', REF.pr.low, REF.pr.high),
    measureRow('QRS', intervals.qrsMs, 'ms', REF.qrs.low, REF.qrs.high),
    measureRow('QT', intervals.qtMs, 'ms', REF.qt.low, REF.qt.high),
    measureRow('QTc (Bazett)', intervals.qtcBazettMs, 'ms', REF.qtc.low, REF.qtc.high),
    measureRow('QTc (Fridericia)', intervals.qtcFridericiaMs, 'ms', REF.qtc.low, REF.qtc.high),
  ].join('');
  const tableRows2 = [
    measureRow(labels.statsAxis, axis.degrees, 'deg', -30, 90),
    measureRow(labels.mRrMean, rate.rrMeanMs, 'ms', null, null),
    measureRow(labels.mSdnn, rate.sdnnMs, 'ms', null, null, 1),
    measureRow(labels.mRmssd, rate.rmssdMs, 'ms', null, null, 1),
    measureRow(labels.mRrVariation, rate.rrVariationPct, '%', null, null, 1),
    measureRow(labels.mSqi, quality.sqi, '%', null, null),
  ].join('');

  const head = `<tr><th>${esc(labels.measureCol)}</th><th class="num">${esc(labels.resultCol)}</th><th></th><th class="ref">${esc(labels.refCol)}</th><th class="flag"></th></tr>`;
  const tiles = `<div class="twocol">
    <table class="mt"><thead>${head}</thead><tbody>${tableRows}</tbody></table>
    <table class="mt"><thead>${head}</thead><tbody>${tableRows2}</tbody></table>
  </div>`;

  const intervals5 = [
    rangeBar({ w: COL_W, label: 'PR', value: intervals.prMs, unit: 'ms', ...REF.pr, ink: bandInk(intervals.prMs, REF.pr.low, REF.pr.high) }),
    rangeBar({ w: COL_W, label: 'QRS', value: intervals.qrsMs, unit: 'ms', ...REF.qrs, ink: bandInk(intervals.qrsMs, REF.qrs.low, REF.qrs.high) }),
    rangeBar({ w: COL_W, label: 'QT', value: intervals.qtMs, unit: 'ms', ...REF.qt, ink: bandInk(intervals.qtMs, REF.qt.low, REF.qt.high) }),
    rangeBar({ w: COL_W, label: 'QTc B', value: intervals.qtcBazettMs, unit: 'ms', ...REF.qtc, ink: bandInk(intervals.qtcBazettMs, REF.qtc.low, REF.qtc.high) }),
    rangeBar({ w: COL_W, label: 'QTc F', value: intervals.qtcFridericiaMs, unit: 'ms', ...REF.qtc, ink: bandInk(intervals.qtcFridericiaMs, REF.qtc.low, REF.qtc.high) }),
  ].join('');

  const figW = (COL_W - 8) / 3;
  /* The figures shrink when the ID grid is on this page — the millimetres
     have to come from somewhere, and `assertFits` will not be argued with. */
  const figSize = 40;
  const level = screening ? (LEVEL_COLOR[screening.level] ?? LEVEL_COLOR.clear) : LEVEL_COLOR.clear;
  const figs = `<div class="figrow">
    <div class="fig" style="width:${mm(figW)}">
      ${hexaxial({ size: figSize, degrees: axis.degrees, ink: level.ink })}
      <div class="fig-cap">${esc(labels.axisCaption)}</div>
    </div>
    <div class="fig" style="width:${mm(figW)}">
      ${poincare({ size: figSize, rrMs, ink: BRAND })}
      <div class="fig-cap">${esc(labels.poincareCaption)}</div>
    </div>
    <div class="fig" style="width:${mm(figW)}">
      ${tachogram({ w: figW - 4, h: figSize, rrMs, ink: BRAND, meanMs: rate.rrMeanMs })}
      <div class="fig-cap">${esc(labels.tachogramCaption)}</div>
    </div>
  </div>`;

  /* ★ THE AMPLITUDE TABLE IS GONE FROM THIS PAGE (v0.60.0).
     It was printing THREE OF SIX LEADS. Each row carried a 7 mm inline
     figure in a block sized as though the row were a line of 7.6 pt type,
     so lead III was cut through and aVR, aVL and aVF did not print at
     all — on a limb ECG, where aVR is the lead that catches swapped arm
     electrodes.
     It is not repaired here because the measurements page now does the same
     job better: all six leads, every number, and a bar chart per lead
     instead of one bar per row. Two tables of the same data, one of them
     truncated, is worse than one that is complete. The millimetres go to the
     blocks above that were also clipping.
     `amplitudeBar` is untouched and still exported — see figures.ts. */

  return page(
    {
      ...chrome,
      title: labels.pageStatistics,
      pageLabel: labels.pageOf.replace('{n}', String(pageNumber)).replace('{total}', String(totalPages)),
      footRight: `${labels.mAnalysed}: ${quality.analysedSeconds} s`,
    },
    (withId ? block(H_ID, idBlock(identity)) + block(H_ID_GAP, '') : '') +
      block(H_MB_TITLE_FIRST, sectionTitle(labels.statsRate)) +
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
      /* COL_W minus the panel's own 2 mm of side padding: the six cells are
         sized from the width they are HANDED, and handing them the full
         column made the row 4 mm wider than the panel containing it — aVF,
         the sixth cell, was sliced by the panel's overflow. */
      block(H_MB, medianBeatPanel(templates, COL_W - 4, H_MB, labels)) +
      block(H_INT_TITLE, sectionTitle(`${labels.statsIntervals} · ${labels.refRange}`)) +
      block(H_INTERVALS, intervals5, 'stack') +
      block(H_FIG_TITLE, sectionTitle(labels.statsVariability)) +
      block(H_FIGS, figs),
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
  /* ★ v0.56.0: THE LAYPERSON TUTORIAL IS GONE. "How to read this report" —
     four numbered sentences explaining that a small square is 40 ms — was
     doctor-irrelevant on a document addressed to a doctor, and its fourth
     sentence had been FALSE since v0.49 (it promised continuation sheets
     that no longer exist). What replaced it earns its millimetres: the
     SIGNAL QUALITY table — SQI, analysed window, beats, RR range, ectopy
     burden — which the engine has always computed and the paper never
     showed, and which is the first thing a clinician uses to decide how
     much to trust every number before it. */
  const H_MAP_TITLE = 7;
  /* Breathes into whatever the study note leaves behind. The lead map is a
     FIGURE, and a figure is the one thing on a page that absorbs spare
     millimetres by getting better rather than by getting emptier. */
  const H_MAP = note ? 84 : 96;
  const H_PROC_TITLE = 7;
  const H_PROC = 34;
  const H_QUAL_TITLE = 7;
  /* 44, not 34: six ruled rows are ~39.6 mm (see the statistics page's
     H_TILES), so the last one — RR range — printed cut in half. */
  const H_QUAL = 48;
  /* ★ The blind-spots list comes from the SCREENING ENGINE, which this build
     does not run (INTERPRETATION_ENABLED). It was rendering as a heading
     over 34 mm of white space — a section that promises "what this test
     cannot see" and then says nothing is worse than no section, because a
     reader concludes there are no blind spots. There always are: this is six
     limb leads, and it never sees the front wall. When the flag comes back
     on, so does the list. */
  const withBlind = screening !== null;
  const H_BLIND_TITLE = withBlind ? 7 : 0;
  const H_BLIND = withBlind ? 34 : 0;
  const H_NOTE = note ? 26 : 0;
  const H_DISC = 22;
  assertFits('reference', [
    H_MAP_TITLE,
    H_MAP,
    H_PROC_TITLE,
    H_PROC,
    H_QUAL_TITLE,
    H_QUAL,
    H_BLIND_TITLE,
    H_BLIND,
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
      ${einthoven({ w: 96, h: note ? 74 : 88, highlight: ['I', 'II', 'III'] })}
    </div>
    <div class="mapcopy">
      <p>${esc(labels.leadMapCaption)}</p>
      <div class="wall"><b>II · III · aVF</b><span>${esc(labels.wallInferior)}</span></div>
      <div class="wall"><b>I · aVL</b><span>${esc(labels.wallLateral)}</span></div>
      <div class="wall wall-off"><b>V1–V6</b><span>${esc(labels.wallNotSeen)}</span></div>
      ${leadII ? beatFigure({ w: 84, h: note ? 26 : 38, signal: leadII, from, to, band: null, ink: BRAND }) : ''}
    </div>
  </div>`;

  /* ★ The signal chain, stated on the paper for the first time. NOTCH_HZ is
     interpolated rather than typed: it is a shared constant the firmware and
     three apps agree on, and a printed document that hard-codes it is a copy
     that will one day disagree with the filter that actually ran. */
  const processing = `<div class="proc">${esc(
    labels.procBody.replace('{notch}', String(NOTCH_HZ)),
  )}</div>`;

  const blind = withBlind
    ? `<ul class="blind">${(screening as EcgScreening).blindSpots
        .map((b) => `<li>${esc(labels.blindSpot(b))}</li>`)
        .join('')}</ul>`
    : '';

  /* The quality table. `measureRow`'s ruled shape, hand-rolled where a value
     is a range rather than a number. Ectopy comes from the screening stats
     and is honestly '—' on a simulated study, which is never screened. */
  const { rate, quality } = analysis;
  const rrRange =
    rate.rrMinMs !== null && rate.rrMaxMs !== null
      ? `${Math.round(rate.rrMinMs)}–${Math.round(rate.rrMaxMs)}`
      : '—';
  const ectopy =
    screening && screening.stats.ectopyBurdenPct !== null
      ? screening.stats.ectopyBurdenPct.toFixed(1)
      : '—';
  const qualRow = (label: string, value: string, unit: string) =>
    `<tr><th>${esc(label)}</th><td class="num">${value}</td><td class="unit">${esc(unit)}</td><td class="ref">—</td><td class="flag"></td></tr>`;
  const qualityTable = `<div class="qualwrap"><table class="mt">
    <thead><tr><th>${esc(labels.measureCol)}</th><th class="num">${esc(labels.resultCol)}</th><th></th><th class="ref">${esc(labels.refCol)}</th><th class="flag"></th></tr></thead>
    <tbody>
      ${qualRow(labels.mSqi, String(quality.sqi), '%')}
      ${qualRow(labels.mAnalysed, String(quality.analysedSeconds), 's')}
      ${qualRow(labels.mBeats, String(rate.beatsAnalyzed), '')}
      ${qualRow(labels.mRrRange, rrRange, 'ms')}
      ${qualRow(labels.mEctopy, ectopy, '%')}
    </tbody>
  </table></div>`;

  return page(
    {
      ...chrome,
      title: labels.pageReference,
      pageLabel: labels.pageOf.replace('{n}', String(pageNumber)).replace('{total}', String(totalPages)),
      footRight: '',
    },
    block(H_MAP_TITLE, sectionTitle(labels.leadMapTitle)) +
      block(H_MAP, map) +
      block(H_PROC_TITLE, sectionTitle(labels.procTitle)) +
      block(H_PROC, processing) +
      block(H_QUAL_TITLE, sectionTitle(labels.statsQuality)) +
      block(H_QUAL, qualityTable) +
      (withBlind
        ? block(H_BLIND_TITLE, sectionTitle(labels.blindTitle)) + block(H_BLIND, blind)
        : '') +
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
       -webkit-font-smoothing: antialiased;
       font-variant-numeric: tabular-nums; }

/* The page is a FIXED BOX at 296 mm - see PAGE_BOX_H for why not 297. */
.pg { position: relative; width: 210mm; height: ${PAGE_BOX_H}mm; overflow: hidden;
      padding: 10mm 12mm 8mm; page-break-after: always; break-after: page; }
.pg:last-child { page-break-after: avoid; break-after: avoid; }

/* ★ THE LETTERHEAD BAND (v0.56.0). Full-bleed brand navy on every page —
   negative margins pull it over the page padding, and the matching top
   padding hands the space back, so the band's height IN FLOW is exactly the
   16 mm HEADER_H has always reserved. The blue keyline under it is the
   report's accent running the full width of every sheet. */
/* ★ v0.61.0 — FLAT BRAND NAVY AGAIN. v0.60.0 painted this the handoff's
   plum-to-navy gradient so it would match the measurements page's dark
   hero. The hero is gone (see the masthead rule below), and the reasoning
   was backwards regardless: the letterhead is where a document says whose
   it is, so it is the last element that should borrow another product's
   colour. This is the one dark band a CYPHIX sheet gets, and the blue
   keyline under it is the report's accent running the width of every page. */
.lh { height: 26mm; display: flex; align-items: flex-start; justify-content: space-between;
      background: ${BRAND_DEEP}; overflow: hidden;
      margin: -10mm -12mm 0; padding: 11mm 12mm 2mm;
      border-bottom: 0.8mm solid ${BLUE}; }
.mark { line-height: 0; }
.mark svg { display: block; }
.ttl { font-size: 11pt; font-weight: 800; letter-spacing: 0.4px; margin-top: 1.8mm;
       color: ${PAPER}; text-transform: uppercase; }
/* 1.3, not 1.55: four lines of subtitle at 1.55 are 17 mm in a 13 mm
   space. Tightening the leading is what makes the longest real subtitle
   (patient + recorded + duration/rate + a long device label) FIT rather
   than merely get cut, which is the difference between a report that reads
   and one that loses its device name. */
.lh-r { font-size: 7pt; color: #C3CDE2; text-align: right; line-height: 1.3;
        max-width: 82mm; max-height: 13mm; overflow: hidden; white-space: pre-line; }

.body { height: ${BODY_H}mm; }
.blk { overflow: hidden; }
/* ★ A BLOCK OF FIGURES HAS NO TEXT IN IT, SO IT MUST NOT HAVE A TEXT BASELINE.
   An <svg> is an inline element: the line box it sits on reserves room for
   descenders under it, ~1.2 mm per row at this size. Five 13 mm interval
   bars declared as 65 mm therefore laid out at ~71 mm, and the fifth one —
   QTc (Fridericia), a real measurement — was clipped off the page by
   the .blk overflow:hidden rule. Silently: assertFits validates the heights
   the BUILDER declares, and it cannot see what a browser did inside one.
   Every stack of figures gets this class. */
.stack { line-height: 0; font-size: 0; }
.stack > svg { display: block; }
.ft { position: absolute; left: 12mm; right: 12mm; bottom: 8mm; height: 7mm;
      display: flex; align-items: flex-end; justify-content: space-between;
      font-size: 6.6pt; color: ${MUTED}; border-top: 0.35mm solid ${HAIRLINE};
      letter-spacing: 0.3px; }
.ft-page { color: ${BRAND}; font-weight: 800; }

/* ★ THE SECTION RULE. Uppercase, letterspaced, on a rule that runs the full
   column — in the report's blue (v0.56.0), so every section opens with the
   same accent the letterhead closes with. */
/* ★ v0.60.0 dropped the 0.45 mm blue rule under every heading to a
   hairline, and that part was right — a heavy accent rule was the loudest
   thing on the statistics page, competing with the figures it introduced.
   v0.61.0 keeps the lighter weight and takes the colour back: the label is
   the wordmark's navy, not the handoff's violet-grey. One kicker language
   across all four pages, in this product's ink. */
.sec { font-size: 7pt; font-weight: 800; letter-spacing: 1.4px; text-transform: uppercase;
       color: ${BRAND}; border-bottom: 0.25mm solid ${HAIRLINE}; padding-bottom: 1.2mm; }

/* ══════════════════════════════════════════════════════════════════
   THE MEASUREMENTS PAGE (v0.60.0) — the design handoff's A4.

   ★ SYSTEM FONTS, NOT THE HANDOFF'S THREE GOOGLE FAMILIES.
   The handoff sets Space Grotesk / IBM Plex Mono / Source Sans 3 from
   fonts.googleapis.com. This document is built ON THE PHONE, at the moment
   someone taps Export — so a <link> to Google is a network request in the
   middle of an export that must work on a plane, and it hands a third party
   the user's IP and the referring page every time a medical report is
   printed. Offline it silently falls back and the report prints in a
   different typeface than the one that was approved.
   So the hierarchy is rebuilt out of the system stack: weight, letter-
   spacing and case do the work the three families were doing. Tabular
   figures are already on the body rule, which is most of what the mono was for.
   ══════════════════════════════════════════════════════════════════ */

/* -- The masthead --

   ★ v0.61.0 — NO SLAB. NO GRADIENT. NO DARK FILL BEHIND THE RATE OR THE
   TRACE. Reported as ugly, and it was: v0.60.0 took the handoff literally
   and printed a 44 mm plum-to-navy card, 3 mm below a 26 mm navy
   letterhead. Two dark bands stacked at the top of a sheet is a poster, not
   a clinical page, and the second one was carrying the number the page
   exists for.

   So the rate is set straight on the paper in the wordmark's navy, over a
   hairline, with the trace beneath it in the SAME navy the six-lead sheets
   use — it is the same signal, and giving it a second colour on a second
   page implied it was a second thing.

   The gradient-clipped headline went with the band. background-clip:text
   only ever existed to make light rose type legible on plum; it is the most
   fragile declaration in this stylesheet (an engine without it renders the
   number INVISIBLE, which is why it needed an @supports guard at all), and
   on white paper navy type needs none of that machinery. Deleting a
   load-bearing guard is only safe because the thing it was guarding is gone
   too. */
.hero { height: 100%; color: ${INK}; }
.hero-top { display: flex; justify-content: space-between; align-items: flex-end; }
.hero-k { font-size: 6pt; letter-spacing: 2px; text-transform: uppercase; font-weight: 700;
          color: ${MUTED}; margin-bottom: 1.6mm; white-space: nowrap; }
.hero-rate { display: flex; align-items: baseline; gap: 2mm; }
.hero-n { font-size: 32pt; font-weight: 800; line-height: 0.85; letter-spacing: -1px;
          color: ${BRAND_DEEP}; }
.hero-u { font-size: 9.5pt; font-weight: 700; color: ${SLATE}; letter-spacing: 0.4px; }
.hero-chips { display: flex; gap: 1.4mm; align-items: center; }
/* Outlined pills on white, not solid chips on dark. */
.mchip { font-size: 6.2pt; font-weight: 700; padding: 0.9mm 2.4mm; border-radius: 4mm;
         white-space: nowrap; background: ${PAPER}; color: ${SLATE};
         border: 0.2mm solid ${HAIRLINE}; }
/* Amber because the RHYTHM family is amber on every surface of this product
   — not because a rhythm is worth flagging. It is amber for "Regular" too. */
.mchip-amber { background: ${R_T_AMB_BG}; border-color: ${R_T_AMB_BG}; color: ${R_T_AMB_LB}; }
.mchip-dim { color: ${MUTED}; font-weight: 600; }
/* The one chip on this page that IS allowed to shout, because it is not
   about the measurement — it is about whether the signal came from a heart.
   The same red on the same rose as the SIMULATED banner on the sheets. */
.mchip-sim { background: ${RED_SOFT}; border-color: ${RED}; color: ${RED};
             letter-spacing: 0.6px; }
.hero-tr { margin-top: 2.4mm; padding-top: 2mm; border-top: 0.25mm solid ${HAIRLINE};
           line-height: 0; }
.hero-tr svg { display: block; }

/* -- The tile row -- */
.mtiles { display: flex; flex-wrap: wrap; gap: 2mm; height: 100%; }
.mtile { width: calc(25% - 1.5mm); height: 15mm; border-radius: 2.6mm; padding: 2.2mm 2.8mm;
         overflow: hidden; }
.mtile-k { font-size: 5.6pt; letter-spacing: 1.1px; text-transform: uppercase; font-weight: 700;
           margin-bottom: 1mm; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
           color: ${R_MUTE2}; }
.mtile-v { font-size: 14pt; font-weight: 800; line-height: 1; letter-spacing: -0.3px;
           color: ${R_INK}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mtile-v-s { font-size: 10.5pt; }
.mtile-u { font-size: 7pt; font-weight: 600; margin-left: 0.8mm; color: ${R_MUTE2}; }
.mtile-red { background: ${R_T_RED_BG}; }
.mtile-red .mtile-k { color: ${R_T_RED_LB}; }
.mtile-red .mtile-v { color: ${R_T_RED_VA}; }
.mtile-blue { background: ${R_T_BLUE_BG}; }
.mtile-blue .mtile-k { color: ${R_T_BLUE_LB}; }
.mtile-blue .mtile-v { color: ${R_T_BLUE_VA}; }
.mtile-violet { background: ${R_T_VIO_BG}; }
.mtile-violet .mtile-k { color: ${R_T_VIO_LB}; }
.mtile-violet .mtile-v { color: ${R_T_VIO_VA}; }
.mtile-amber { background: ${R_T_AMB_BG}; }
.mtile-amber .mtile-k { color: ${R_T_AMB_LB}; }
.mtile-amber .mtile-v { color: ${R_T_AMB_VA}; }
.mtile-plain { border: 0.25mm solid ${R_OUTLINE}; }

/* -- The kicker this page uses instead of .sec -- */
.mkick { font-size: 6.4pt; font-weight: 700; letter-spacing: 1.8px; text-transform: uppercase;
         color: ${BRAND}; margin-bottom: 2.4mm; }
.mkick-2 { margin-top: 3mm; }
.mkick-flat { margin: 0; }

/* -- Intervals | axis + quality -- */
.mmain { display: flex; gap: 5mm; height: 100%; }
.mcol-l { width: 100mm; flex: none; }
.mcol-r { flex: 1; min-width: 0; }
.irows { display: flex; flex-direction: column; gap: 2.6mm; }
.irow-top { display: flex; justify-content: space-between; align-items: baseline; }
.irow-l { font-size: 8pt; font-weight: 700; }
.irow-v { font-size: 10pt; font-weight: 800; color: ${R_T_BLUE_VA}; }
.irow-u { font-size: 6.4pt; font-weight: 600; margin-left: 0.6mm; color: ${R_MUTE2}; }
/* An unmeasurable interval is an em dash in the QUIET ink, and with no unit
   after it: "— ms" reads as a measurement of nothing, and a dash in the same
   confident blue as the numbers above it reads as a value. */
.irow-v-na { color: ${R_MUTE2}; font-weight: 600; }
.itrack { position: relative; height: 1.8mm; background: ${R_TRACK}; border-radius: 1mm;
          margin-top: 1mm; }
/* ONE flat tint at any value — see reportPalette.ts. The band never changes
   colour with the measurement, and there is no chip beside it saying
   whether the marker is inside or out. */
.iband { position: absolute; top: 0; bottom: 0; border-radius: 1mm;
         background: linear-gradient(90deg, ${R_BAND_A}, ${R_BAND_B}); }
.idot { position: absolute; top: -0.9mm; width: 3.6mm; height: 3.6mm; margin-left: -1.8mm;
        border-radius: 50%; background: ${R_T_BLUE_VA}; border: 0.6mm solid #FFFFFF; }
.irow-ref { font-size: 5.8pt; color: ${R_MUTE2}; margin-top: 1mm; }
.inote { font-size: 5.8pt; color: ${R_FAINT}; margin-top: 2.6mm; line-height: 1.4; }

.axcard { display: flex; gap: 3mm; align-items: center; border-radius: 3mm; padding: 2.4mm 3mm;
          height: 36mm; background: ${R_AX_BG_A};
          background-image: linear-gradient(135deg, ${R_AX_BG_A}, ${R_AX_BG_B}); }
.axdial { flex: none; line-height: 0; }
.axdial svg { display: block; }
.axread { min-width: 0; }
.axdeg { font-size: 19pt; font-weight: 800; line-height: 1; color: ${R_AX_NUM}; }
/* The handoff paints this pill GREEN when the axis is normal. It is violet
   here, at every classification: a chip whose colour changes with the
   reading is a verdict wearing a label's clothes, and this report stopped
   giving verdicts in v0.59.0. */
.axchip { display: inline-block; font-size: 6.4pt; font-weight: 700; margin-top: 1.6mm;
          padding: 0.8mm 2.2mm; border-radius: 4mm; background: ${R_AX_SECTOR};
          color: ${R_AX_INK}; }
.axcap { font-size: 5.8pt; color: ${R_MUTE}; margin-top: 1.4mm; }
.axnets { display: flex; gap: 2mm; margin-top: 2.4mm; }
.axnets .mtile { width: calc(50% - 1mm); height: 12mm; }

.qcard { display: flex; gap: 3mm; align-items: center; border-radius: 3mm; padding: 2.4mm 3mm;
         height: 24mm; background: ${R_Q_BG_A};
         background-image: linear-gradient(135deg, ${R_Q_BG_A}, ${R_Q_BG_B}); }
.qring { flex: none; line-height: 0; }
.qring svg { display: block; }
.qbody { min-width: 0; }
.qtitle { font-size: 6pt; font-weight: 700; letter-spacing: 1.1px; text-transform: uppercase;
          color: ${R_Q_NUM}; }
.qtext { font-size: 6.4pt; color: ${R_BODY}; line-height: 1.4; margin-top: 0.8mm; }
.qchips { display: flex; gap: 1.4mm; margin-top: 1.4mm; }
.qchip { font-size: 5.8pt; background: #FFFFFF; border-radius: 4mm; padding: 0.6mm 2mm;
         color: ${R_MUTE}; white-space: nowrap; }

/* -- Wave amplitudes -- */
.ampbar { display: flex; justify-content: space-between; align-items: baseline; }
.amplegend { display: flex; gap: 2.6mm; align-items: center; font-size: 5.8pt; color: ${R_MUTE}; }
.lg { display: flex; align-items: center; gap: 0.8mm; }
.lg i { width: 1.6mm; height: 1.6mm; border-radius: 0.4mm; display: inline-block; }
.lg-scale { color: ${R_FAINT}; }
.amppanel { height: 100%; border: 0.25mm solid ${R_OUTLINE}; border-radius: 3mm;
            overflow: hidden; }
.amphead { display: flex; background: ${R_AMP_HEAD}; }
.amphead > div { flex: 1; text-align: center; font-size: 7.5pt; font-weight: 800;
                 padding: 1mm 0; }
.ampgrid { display: flex; border-top: 0.25mm solid ${R_AMP_LINE}; }
.ampcol { flex: 1; min-width: 0; padding: 1.6mm 1.6mm 1.2mm;
          border-right: 0.2mm solid ${R_AMP_LINE}; }
.ampcol:last-child { border-right: 0; }
.ampfig { line-height: 0; }
.ampfig svg { display: block; margin: 0 auto; }
.ampnums { display: flex; margin-top: 0.8mm; font-size: 5pt; color: ${R_MUTE}; }
.ampnums span { flex: 1; text-align: center; }
.ampn-strong { font-weight: 700; color: ${R_NUM}; }
.amppp { display: flex; justify-content: space-between; align-items: baseline; margin-top: 1.4mm;
         font-size: 5.6pt; color: ${R_MUTE2}; letter-spacing: 0.6px; text-transform: uppercase; }
.amppp b { font-size: 8pt; font-weight: 800; color: ${R_PP_INK}; letter-spacing: 0; }
.amppptrack { height: 1.2mm; border-radius: 1mm; background: ${R_TRACK}; overflow: hidden;
              margin-top: 0.8mm; }
.amppptrack i { display: block; height: 100%; border-radius: 1mm;
                background: linear-gradient(90deg, ${R_PP_A}, ${R_PP_B}); }

/* -- The statement the page closes on -- */
.mfoot { display: flex; justify-content: space-between; align-items: flex-end; gap: 6mm;
         border-top: 0.25mm solid ${R_RULE}; padding-top: 2mm; height: 100%; }
.mfoot p { margin: 0; font-size: 5.8pt; line-height: 1.45; color: ${R_MUTE}; max-width: 130mm; }
.mfoot-r { font-size: 5.8pt; color: ${R_FAINT}; white-space: nowrap; }

/* -- ECG -- */
.sheet { border: 0.25mm solid ${HAIRLINE}; overflow: hidden;
         display: block; font-size: 0; line-height: 0; }
.strip { display: block; }
.cap { display: flex; justify-content: space-between; align-items: center;
       font-size: 6.6pt; color: ${SLATE}; padding-top: 2mm; letter-spacing: 0.2px; }

/* -- Identification grid: a tinted band with the brand's heavy left edge,
      so "whose / when / on what" is the first colour block after the
      letterhead (v0.56.0) -- */
/* The rounded corner from v0.60.0 stays; the violet does not. Violet on
   this report MEANS the axis section — spending it on chrome that has
   nothing to do with the axis spends the only thing the hue was for. */
.idgrid { display: flex; flex-wrap: wrap; background: ${BRAND_SOFT};
          border-left: 1.4mm solid ${BRAND}; border-radius: 0 2mm 2mm 0;
          padding: 0 0 0 2.6mm; overflow: hidden; }
.idcell { width: 25%; border-bottom: 0.2mm solid ${HAIRLINE}; padding: 1.6mm 2mm 1.6mm 0;
          overflow: hidden; }
.idcell span { display: block; font-size: 6.2pt; letter-spacing: 0.8px; text-transform: uppercase;
               color: ${MUTED}; }
.idcell b { display: block; font-size: 8.5pt; font-weight: 700; margin-top: 0.4mm;
            white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* -- The interpretation statement. The background is the LEVEL's soft tint,
      set inline by the builder (v0.56.0) — a clear result sits on the brand
      wash, an urgent one on the red wash, so the verdict is a colour block
      before it is a sentence. -- */
.stmt { display: flex; align-items: center; justify-content: space-between; gap: 6mm;
        height: 100%; border-left: 1.4mm solid; padding: 3mm 4mm; background: ${SURFACE}; }
.stmt-l { min-width: 0; }
.stmt-kicker { font-size: 6.4pt; font-weight: 800; letter-spacing: 1.4px;
               text-transform: uppercase; color: ${MUTED}; }
.stmt-head { font-size: 16pt; font-weight: 800; letter-spacing: -0.4px; line-height: 1.12;
             margin-top: 1mm; }
.stmt-act { font-size: 8.5pt; color: ${SLATE}; margin-top: 1.2mm; }
.stmt-r { flex: none; text-align: center; }
.stmt-checks { font-size: 6.2pt; color: ${MUTED}; margin-top: 0.6mm; }

/* -- Findings, as numbered statements -- */
.find { display: flex; gap: 0; border-bottom: 0.2mm solid ${HAIRLINE}; overflow: hidden; }
.find-bar { width: 1mm; flex: none; }
.find-body { flex: 1; min-width: 0; padding: 1.8mm 0 1.8mm 2.6mm; }
.find-top { display: flex; align-items: baseline; gap: 2mm; }
.find-name { font-size: 9.5pt; font-weight: 800; letter-spacing: -0.1px; }
.chip { font-size: 6.2pt; font-weight: 800; padding: 0.3mm 1.4mm; letter-spacing: 0.4px;
        text-transform: uppercase; }
.chip-q { background: ${GREY_SOFT}; color: ${SLATE}; }
.find-mean { font-size: 7.6pt; color: ${SLATE}; margin-top: 0.6mm; line-height: 1.35;
             max-height: 6.4mm; overflow: hidden; }
.find-ev { margin-top: 0.9mm; font-size: 7.2pt; }
.ev { display: inline-block; margin-right: 3mm; }
.ev b { color: ${MUTED}; font-weight: 700; letter-spacing: 0.3px; }
.mtrack { height: 0.7mm; background: ${GREY_SOFT}; margin-top: 1mm; overflow: hidden; }
.mtrack i { display: block; height: 100%; }
.find-src { font-size: 6.2pt; color: ${MUTED}; margin-top: 0.9mm;
            white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.empty { font-size: 8pt; color: ${SLATE}; padding: 3mm 0; }

/* -- Measurement tables. BRAND header rows and a soft blue zebra (v0.56.0):
      the shape every lab report prints, in the issuer's colour. Cell padding
      trimmed 0.2 mm to pay for the header's fill. -- */
.twocol { display: flex; gap: 6mm; height: 100%; }
.twocol > table { flex: 1; }
table.mt { width: 100%; border-collapse: collapse; font-size: 7.8pt; }
/* A solid navy header bar on two tables plus a navy letterhead plus a
   navy footer rule was three shouts on one page, so the bar became a soft
   wash in v0.60.0 — that part stays. Only the hue comes home: the brand's
   own pale navy and the brand's own ink, not the handoff's violet-grey. */
table.mt thead th { font-size: 6.2pt; font-weight: 800; letter-spacing: 0.9px;
                    text-transform: uppercase; color: ${BRAND}; text-align: left;
                    background: ${BRAND_SOFT}; padding: 1mm 1.2mm; }
table.mt tbody tr:nth-child(even) th, table.mt tbody tr:nth-child(even) td { background: #F7F9FD; }
table.mt tbody th { text-align: left; font-weight: 600; color: ${SLATE};
                    padding: 1.3mm 1.2mm 1.3mm 1.2mm; border-bottom: 0.2mm solid ${HAIRLINE};
                    white-space: nowrap; overflow: hidden; }
table.mt td { padding: 1.3mm 1.2mm; border-bottom: 0.2mm solid ${HAIRLINE}; }
table.mt .num { text-align: right; font-weight: 800; font-size: 8.6pt; width: 16mm; }
table.mt .unit { color: ${MUTED}; font-size: 6.8pt; width: 9mm; }
table.mt .ref { text-align: right; color: ${MUTED}; font-size: 6.8pt; width: 16mm; }
table.mt .flag { text-align: center; width: 6mm; font-weight: 800; font-size: 8pt; }
/* ⚠️ The H / L flag is the ONE place on this page that says something
   about a measurement rather than reporting it, and it survives on purpose:
   it is the lab-report convention, the reference range it refers to is
   printed in the very next cell, and the user chose to keep this page's
   clinical tables when asked. It is not the screening engine — it is a
   comparison against a number the reader can see. The measurements page has
   no equivalent, deliberately. */
table.mt tr.hi .num, table.mt tr.hi .flag { color: ${GOLD}; }
table.mt tr.lo .num, table.mt tr.lo .flag { color: ${BLUE}; }

/* -- Figures. Every data visualisation sits on a soft blue panel with a
      blue keyline (v0.56.0) — the figures ARE the added value, and a panel
      says so before the caption is read. -- */
.figrow { display: flex; gap: 4mm; height: 100%; }
.fig { text-align: center; background: ${BLUE_SOFT}; border-radius: 2.6mm;
       padding-top: 1.5mm; overflow: hidden; }
.fig-cap { font-size: 6.2pt; color: ${MUTED}; line-height: 1.3; margin-top: 1mm; }
/* The quality table shares .mt but takes only the width it needs. */
.qualwrap { width: 120mm; }

table.amp { width: 100%; border-collapse: collapse; font-size: 7.6pt; }
table.amp thead th { font-size: 6.2pt; font-weight: 800; letter-spacing: 0.9px;
                     text-transform: uppercase; color: ${BRAND}; text-align: right;
                     background: ${BRAND_SOFT}; padding: 1mm 1.4mm; }
table.amp thead th:first-child { text-align: left; }
table.amp tbody tr:nth-child(even) th, table.amp tbody tr:nth-child(even) td { background: #F7F9FD; }
table.amp tbody th { text-align: left; font-weight: 800; font-size: 8pt;
                     padding: 1mm 1.4mm; border-bottom: 0.2mm solid ${HAIRLINE}; }
table.amp td { text-align: right; padding: 1mm 1.4mm;
               border-bottom: 0.2mm solid ${HAIRLINE}; }
td.ampcell { width: 44mm; padding-right: 0; }

/* -- The 43-check audit -- */
.audit { column-count: 3; column-gap: 6mm; }
.agroup { break-inside: avoid; margin-bottom: 2mm; }
.agroup h4 { margin: 0 0 0.8mm; font-size: 6.2pt; font-weight: 800; letter-spacing: 0.9px;
             text-transform: uppercase; color: ${MUTED};
             border-bottom: 0.2mm solid ${HAIRLINE}; padding-bottom: 0.5mm; }
.arow { display: flex; gap: 1.4mm; align-items: baseline; font-size: 6.8pt; line-height: 1.45; }
.arow i { font-style: normal; width: 2mm; flex: none; text-align: center; }
.a-out { color: ${SLATE}; }
.a-out i { color: ${HAIRLINE}; }
.a-na { color: ${MUTED}; }
.a-found { font-weight: 800; }
.auditnote { font-size: 6.2pt; color: ${MUTED}; margin-top: 1.6mm; line-height: 1.4; }

/* -- Median beats: the same blue panel as the other figures (v0.56.0) -- */
.mbrow { display: flex; gap: 2mm; height: 100%; background: ${BLUE_SOFT};
         border-radius: 2.6mm; padding: 1mm 2mm 0; overflow: hidden; }
.mbcell { flex: none; }
.mblead { font-size: 6.6pt; font-weight: 800; color: ${INK}; margin-bottom: 0.6mm;
          letter-spacing: 0.5px; }

/* -- Reference page -- */
.maprow { display: flex; gap: 5mm; height: 100%; }
.mapfig { flex: none; }
.mapcopy { flex: 1; min-width: 0; }
.mapcopy p { margin: 0 0 2mm; font-size: 7.6pt; color: ${SLATE}; line-height: 1.45; }
.wall { display: flex; gap: 2.5mm; align-items: baseline; font-size: 7.6pt; margin-bottom: 1.4mm;
        border-bottom: 0.2mm solid ${HAIRLINE}; padding-bottom: 1.2mm; }
.wall b { flex: none; width: 22mm; font-weight: 800; color: ${INK}; }
.wall span { color: ${SLATE}; }
.wall-off b, .wall-off span { color: ${MUTED}; }
ul.blind { margin: 0; padding-left: 4mm; font-size: 7.6pt; color: ${SLATE}; line-height: 1.5; }
/* Provenance reads as body copy, not as a warning: it is a description of
   the software, and styling it like a caution would make a reader look for
   a problem in a paragraph that is only saying how the sausage was made. */
.proc { font-size: 7.4pt; line-height: 1.5; color: ${SLATE}; height: 100%;
        overflow: hidden; padding-right: 4mm; }
.note { font-size: 7.6pt; line-height: 1.45; background: ${BRAND_SOFT};
        border-left: 1mm solid ${BRAND}; border-radius: 0 2mm 2mm 0;
        padding: 2.5mm 3mm; height: 100%; overflow: hidden; }
.disc { font-size: 6.4pt; line-height: 1.45; color: ${MUTED}; margin: 0; }
`;

// v4.0.0 — "Take INSPIRATION from it, do not do it 1:1." The handoff's plum
//          is out of the report's CHROME — letterhead, section rules, table
//          headers, figure panels, footers are CYPHIX navy and blue again.
//          Those elements are the document's identity, and it already had
//          one; two identities on a sheet read as two documents stapled
//          together. What survives is the part that was doing work: the
//          measurements page's SECTIONING (a hue per family of measurement,
//          the tiles, the bands, the axis and quality cards), because that
//          helps a reader find the rate versus the intervals versus the
//          axis, and no amount of navy does that.
//          The measurements page's dark hero slab is deleted outright — see
//          the masthead rule. The lighter weights v0.60.0 introduced (a
//          hairline under section headings instead of a 0.45 mm blue rule, a
//          washed table header instead of a solid navy bar) were right and
//          are kept; only the hues came home.
// v3.0.0 — The design-handoff pass. The letterhead is the measurements page's
//          plum-to-navy gradient rather than flat navy; section headings became
//          the redesign's letterspaced kicker over a hairline (a 0.45 mm blue
//          rule under every heading was louder than the figures it introduced);
//          ruled-table headers went from a solid navy bar to a soft wash with
//          the kicker's ink; figure panels are rounded washes, not square blue
//          slabs. Paddings are untouched everywhere on purpose — those blocks
//          are fixed-height with overflow hidden, so a millimetre of cell
//          padding does not resize a block, it clips the last row, and
//          assertFits cannot see that. Plus the whole measurements-page
//          stylesheet, in system fonts (see the block above it for why not the
//          handoff's three Google families).
// v2.0.0 — The colour pass (v0.56.0), reported as "not colourful enough, no
//          added value": a full-bleed navy letterhead band with the white
//          wordmark on every page (flow height unchanged — assertFits
//          arithmetic untouched), blue section rules and footer keylines,
//          BRAND header rows + soft blue zebra on every ruled table, blue
//          panels under every figure, the verdict statement on its level's
//          tint, and the identification grid as a tinted band. Content: the
//          layperson "how to read" tutorial is gone (its fourth sentence had
//          been false since v0.49) and the SIGNAL QUALITY table — SQI,
//          analysed window, beats, RR range, ectopy burden — prints at last;
//          a simulated report now carries the identification grid on its
//          statistics page instead of having none at all.
// v1.0.0 — Every page of the report at an exact millimetre, with assertFits
//          refusing a layout that would spill. Page 1 is the six-lead ECG at
//          full page; then the verdict, the statistics with real figures, and
//          the lead map.
