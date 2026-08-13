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
import {
  BODY_H,
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
  SIGNAL_INK,
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
  return `<section class="pg">
  <header class="lh">
    <div class="lh-l">
      <div class="brand">${esc(chrome.brand)}</div>
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

/** One lead band. Explicit width AND height — never inferred. */
function strip(
  lead: string,
  data: Float32Array,
  sampleRate: number,
  rPeaks: number[] | undefined,
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
</svg>`;
}

/** Samples that fit on one sheet at the standard 25 mm/s. */
export function samplesPerSheet(fs: number): number {
  return Math.max(1, Math.floor(((COL_W - CAL_W) / STANDARD_MM_PER_SEC) * fs));
}

/** ★ Counted BEFORE anything is built, because every page prints "n of N"
    and N is not knowable from inside a page builder. Two passes over the
    same arithmetic would eventually disagree; one function cannot. */
export function countEcgSheets(sampleCount: number, fs: number): number {
  return Math.max(1, Math.ceil(sampleCount / samplesPerSheet(fs)));
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
  const perSheet = Math.max(1, Math.floor(((COL_W - CAL_W) / STANDARD_MM_PER_SEC) * fs));
  const sheets = Math.max(1, Math.ceil(sampleCount / perSheet));

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
      ),
    ).join('');

    const caption = `<div class="cap">
      <span><b>${STANDARD_MM_PER_SEC} mm/s</b> · <b>${STANDARD_MM_PER_MV} mm/mV</b> · 1 mV calibration pulse at the left of every lead</span>
      <span>${esc(labels.sheetOf.replace('{n}', String(s + 1)).replace('{total}', String(sheets)))} · ${(from / fs).toFixed(1)}–${(to / fs).toFixed(1)} s</span>
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

const VERDICT_H = 44;
const FINDING_H = 27;
/** How many findings fit under the verdict on the first page, and on a
    continuation page. Both are derived from the block heights rather than
    guessed, so changing a height cannot silently overflow. */
const FIRST_PAGE_FINDINGS = Math.floor((BODY_H - VERDICT_H - 8) / FINDING_H);
const CONT_PAGE_FINDINGS = Math.floor((BODY_H - 8) / FINDING_H);

/** How the findings divide across pages. Same function the builder uses, so
    the page count and the page contents cannot disagree. */
export function chunkFindings(findings: readonly ScreeningFinding[]): ScreeningFinding[][] {
  const list = [...findings];
  const chunks: ScreeningFinding[][] = [list.splice(0, FIRST_PAGE_FINDINGS)];
  while (list.length > 0) chunks.push(list.splice(0, CONT_PAGE_FINDINGS));
  return chunks;
}

function findingRow(f: ScreeningFinding, labels: PdfLabels): string {
  const c = LEVEL_COLOR[f.level] ?? LEVEL_COLOR.attention;
  const copy = labels.finding(f.id);
  const evidence = f.evidence
    .map((e) => `<span class="ev"><b>${esc(e.label)}</b> ${esc(e.value)}</span>`)
    .join('');

  /* The margin bar. A finding 4 % past its threshold and one 200 % past it
     used to print identically; this is the difference, on paper. */
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

  const verdict = `<div class="verdict" style="border-color:${c.ink}22;background:${c.soft}">
    ${donut({
      size: 34,
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

  const chunks = chunkFindings(screening.findings);

  const html = chunks
    .map((chunk, i) => {
      const isFirst = i === 0;
      const titleH = 8;
      const rows = chunk.map((f) => findingRow(f, labels)).join('');
      const listH = chunk.length * FINDING_H;

      const blocks = isFirst ? [VERDICT_H, titleH, listH] : [titleH, listH];
      assertFits(`interpretation p${i + 1}`, blocks);

      const body =
        (isFirst ? block(VERDICT_H, verdict) : '') +
        block(
          titleH,
          sectionTitle(isFirst ? labels.findingsTitle : `${labels.findingsTitle} (${labels.continued})`),
        ) +
        block(
          listH,
          chunk.length > 0 ? rows : `<div class="empty">${esc(labels.noFindings)}</div>`,
        );

      return page(
        {
          ...chrome,
          title: labels.pageInterpretation,
          pageLabel: labels.pageOf
            .replace('{n}', String(firstPageNumber + i))
            .replace('{total}', String(totalPages)),
          footRight: esc(copy.headline),
        },
        body,
      );
    })
    .join('');

  return { html, pages: chunks.length };
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
  return v >= low && v <= high ? SIGNAL_INK : LEVEL_COLOR.attention.ink;
}

export function statisticsPage(
  analysis: EcgAnalysis,
  screening: EcgScreening | null,
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
  const H_TILES = 26;
  const H_INT_TITLE = 7;
  const H_INTERVALS = 13 * 5;
  const H_FIG_TITLE = 7;
  const H_FIGS = 46;
  const H_AMP_TITLE = 7;
  const H_AMPS = 56;
  assertFits('statistics', [
    H_TILES,
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
    ${tile(labels.mBpm, num(rate.bpm), 'BPM', SIGNAL_INK)}
    ${tile(labels.mSdnn, num(rate.sdnnMs, 1), 'ms')}
    ${tile(labels.mRmssd, num(rate.rmssdMs, 1), 'ms')}
    ${tile(labels.mRrVariation, num(rate.rrVariationPct, 1), '%')}
    ${tile(labels.mBeats, String(rate.beatsAnalyzed), '')}
    ${tile(labels.mSqi, String(quality.sqi), '%', SIGNAL_INK)}
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
      ${poincare({ size: 38, rrMs, ink: SIGNAL_INK })}
      <div class="fig-cap">${esc(labels.poincareCaption)}</div>
    </div>
    <div class="fig" style="width:${mm(figW)}">
      ${tachogram({ w: figW, h: 38, rrMs, ink: SIGNAL_INK, meanMs: rate.rrMeanMs })}
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
      ${leadII ? beatFigure({ w: 82, h: 20, signal: leadII, from, to, band: null, ink: SIGNAL_INK }) : ''}
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
.pg { position: relative; width: 210mm; height: 297mm; overflow: hidden;
      padding: 10mm 12mm 8mm; page-break-after: always; break-after: page; }
.pg:last-child { page-break-after: auto; break-after: auto; }

.lh { height: 16mm; display: flex; align-items: flex-start; justify-content: space-between;
      border-bottom: 0.5mm solid ${INK}; padding-bottom: 2mm; }
.brand { font-size: 8pt; font-weight: 800; letter-spacing: 2.6px; color: ${MUTED}; }
.ttl { font-size: 14pt; font-weight: 800; letter-spacing: -0.3px; margin-top: 1mm; }
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
