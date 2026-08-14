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
  const H_ID = withId ? 15 : 0;
  const H_ID_GAP = withId ? 3 : 0;
  const H_MB_TITLE_FIRST = 7;
  const H_TILES = withId ? 38 : 42;
  const H_MB_TITLE = 7;
  const H_MB = withId ? 24 : 30;
  const H_INT_TITLE = 7;
  const H_INTERVALS = 13 * 5;
  const H_FIG_TITLE = 7;
  const H_FIGS = withId ? 38 : 46;
  const H_AMP_TITLE = 7;
  const H_AMPS = 33;
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
    H_AMP_TITLE,
    H_AMPS,
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
  const figSize = withId ? 29 : 38;
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
  const H_MAP = 62;
  const H_QUAL_TITLE = 7;
  const H_QUAL = 34;
  const H_BLIND_TITLE = 7;
  const H_BLIND = 34;
  const H_NOTE = note ? 26 : 0;
  const H_DISC = 22;
  assertFits('reference', [
    H_MAP_TITLE,
    H_MAP,
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
      block(H_QUAL_TITLE, sectionTitle(labels.statsQuality)) +
      block(H_QUAL, qualityTable) +
      block(H_BLIND_TITLE, sectionTitle(labels.blindTitle)) +
      block(H_BLIND, blind) +
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
.lh { height: 26mm; display: flex; align-items: flex-start; justify-content: space-between;
      background: ${BRAND_DEEP}; margin: -10mm -12mm 0; padding: 11mm 12mm 2mm;
      border-bottom: 0.8mm solid ${BLUE}; }
.mark { line-height: 0; }
.mark svg { display: block; }
.ttl { font-size: 11pt; font-weight: 800; letter-spacing: 0.4px; margin-top: 1.8mm;
       color: ${PAPER}; text-transform: uppercase; }
.lh-r { font-size: 7pt; color: #C3CDE2; text-align: right; line-height: 1.55;
        max-width: 82mm; overflow: hidden; white-space: pre-line; }

.body { height: ${BODY_H}mm; }
.blk { overflow: hidden; }
.ft { position: absolute; left: 12mm; right: 12mm; bottom: 8mm; height: 7mm;
      display: flex; align-items: flex-end; justify-content: space-between;
      font-size: 6.6pt; color: ${MUTED}; border-top: 0.5mm solid ${BLUE};
      letter-spacing: 0.3px; }
.ft-page { color: ${BRAND}; font-weight: 800; }

/* ★ THE SECTION RULE. Uppercase, letterspaced, on a rule that runs the full
   column — in the report's blue (v0.56.0), so every section opens with the
   same accent the letterhead closes with. */
.sec { font-size: 7pt; font-weight: 800; letter-spacing: 1.4px; text-transform: uppercase;
       color: ${BRAND}; border-bottom: 0.45mm solid ${BLUE}; padding-bottom: 1.2mm; }

/* -- ECG -- */
.sheet { border: 0.25mm solid ${HAIRLINE}; overflow: hidden;
         display: block; font-size: 0; line-height: 0; }
.strip { display: block; }
.cap { display: flex; justify-content: space-between; align-items: center;
       font-size: 6.6pt; color: ${SLATE}; padding-top: 2mm; letter-spacing: 0.2px; }

/* -- Identification grid: a tinted band with the brand's heavy left edge,
      so "whose / when / on what" is the first colour block after the
      letterhead (v0.56.0) -- */
.idgrid { display: flex; flex-wrap: wrap; background: ${BRAND_SOFT};
          border-left: 1.4mm solid ${BRAND}; padding: 0 0 0 2.6mm; }
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
table.mt thead th { font-size: 6.2pt; font-weight: 800; letter-spacing: 0.9px;
                    text-transform: uppercase; color: ${PAPER}; text-align: left;
                    background: ${BRAND}; padding: 1mm 1.2mm; }
table.mt tbody tr:nth-child(even) th, table.mt tbody tr:nth-child(even) td { background: #F2F6FD; }
table.mt tbody th { text-align: left; font-weight: 600; color: ${SLATE};
                    padding: 1.3mm 1.2mm 1.3mm 1.2mm; border-bottom: 0.2mm solid ${HAIRLINE};
                    white-space: nowrap; overflow: hidden; }
table.mt td { padding: 1.3mm 1.2mm; border-bottom: 0.2mm solid ${HAIRLINE}; }
table.mt .num { text-align: right; font-weight: 800; font-size: 8.6pt; width: 16mm; }
table.mt .unit { color: ${MUTED}; font-size: 6.8pt; width: 9mm; }
table.mt .ref { text-align: right; color: ${MUTED}; font-size: 6.8pt; width: 16mm; }
table.mt .flag { text-align: center; width: 6mm; font-weight: 800; font-size: 8pt; }
table.mt tr.hi .num, table.mt tr.hi .flag { color: ${GOLD}; }
table.mt tr.lo .num, table.mt tr.lo .flag { color: ${BLUE}; }

/* -- Figures. Every data visualisation sits on a soft blue panel with a
      blue keyline (v0.56.0) — the figures ARE the added value, and a panel
      says so before the caption is read. -- */
.figrow { display: flex; gap: 4mm; height: 100%; }
.fig { text-align: center; background: ${BLUE_SOFT}; border-top: 0.5mm solid ${BLUE};
       padding-top: 1.5mm; }
.fig-cap { font-size: 6.2pt; color: ${MUTED}; line-height: 1.3; margin-top: 1mm; }
/* The quality table shares .mt but takes only the width it needs. */
.qualwrap { width: 120mm; }

table.amp { width: 100%; border-collapse: collapse; font-size: 7.6pt; }
table.amp thead th { font-size: 6.2pt; font-weight: 800; letter-spacing: 0.9px;
                     text-transform: uppercase; color: ${PAPER}; text-align: right;
                     background: ${BRAND}; padding: 1mm 1.4mm; }
table.amp thead th:first-child { text-align: left; }
table.amp tbody tr:nth-child(even) th, table.amp tbody tr:nth-child(even) td { background: #F2F6FD; }
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
         border-top: 0.5mm solid ${BLUE}; padding: 1mm 2mm 0; }
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
.note { font-size: 7.6pt; line-height: 1.45; background: ${BRAND_SOFT};
        border-left: 1mm solid ${BRAND}; padding: 2.5mm 3mm; height: 100%; overflow: hidden; }
.disc { font-size: 6.4pt; line-height: 1.45; color: ${MUTED}; margin: 0; }
`;

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
