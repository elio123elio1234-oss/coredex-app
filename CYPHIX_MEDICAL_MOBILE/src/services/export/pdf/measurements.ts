/* ==================================================================
   The MEASUREMENTS page — page 3 of the report, from the design handoff
   "Clinical data export to PDF" (ECG Report A4).

   ══ WHY THIS PAGE EXISTS ALONGSIDE THE STATISTICS PAGE ══
   It is the same numbers as the statistics page, composed for a different
   reader. The statistics page is a clinician's page: ruled tables with
   reference columns and H/L flags, a median beat, a Poincaré cloud, a
   tachogram — dense, scannable, and unreadable to anyone else. This page is
   the one a patient can hold: the rate as a headline, one hue per family of
   measurement, and every interval drawn against its band so "131 ms" is a
   position before it is a number.

   Both were kept deliberately. The user's answer when asked was to keep the
   clinical figures rather than let the redesign drop them, so the report
   grew a page instead of losing one.

   ══ THE RULES THIS PAGE OBEYS ══
   1. **Measurements only.** No finding, no normal/abnormal, no suggested
      diagnosis. The handoff's per-interval call-outs ("within range",
      "2 ms below range") were dropped at the user's instruction: they are a
      statement about the measurement, which is exactly what v0.59.0 took
      out of this document. The shaded band and the marker stay — a reader
      can see where the marker sits without being told what it means.
   2. **Colour sections, it never grades.** The rhythm tile is amber when
      the rhythm is regular. The steadiness ring is green at 12 % and at
      98 %. The axis chip is the axis section's violet, NOT the handoff's
      green "normal" pill — a chip that turned green for one classification
      and not another is a verdict wearing a label's clothes.
   3. **Every box has an explicit height in millimetres** and the heights
      are asserted to fit (`theme.ts`). Nothing is `auto`, nothing wraps.
      A torn report is worse than a failed export because it looks fine on
      the phone that made it.
   4. **A measurement that could not be made prints "—".** Never 0, never
      blank, on any tile, bar or cell.
   ================================================================== */

import { LIMB_LEAD_ORDER, type EcgAnalysis } from '@cyphix/shared';
import { hexaxial, sparkTrace, waveColumn } from './figures';
import type { PdfLabels } from './labels';
import { pageShell } from './pages';
import { R_AX_INK, R_Q_RING, R_Q_TRACK, R_TRACE, R_WAVE_INKS } from './reportPalette';
import { BODY_H, COL_W, assertFits, esc, mm } from './theme';

/** What the page shell needs, minus the fields this page fills itself. */
export interface PageChrome {
  brand: string;
  subtitle: string;
}

/* ── Block heights, in millimetres, declared before anything is drawn ── */
const H_HERO = 44;
const H_GAP = 2.5;
const H_TILES = 32;
const H_MAIN = 92;
const H_AMP_TITLE = 7;
/* 44, not the 52 the first render used: the panel is `height:100%` of its
   block, so an over-tall block is not slack at the bottom of the page — it is
   a band of empty white INSIDE a bordered card. Measured off the render. */
const H_AMPS = 48;
const H_NOTE = 16;

/** The reference bands. The SAME numbers the statistics page and the app's
    Values screen use — this page does not get a second opinion about them. */
const REF = {
  pr: { min: 60, max: 320, low: 120, high: 200 },
  qrs: { min: 40, max: 200, low: 80, high: 120 },
  qt: { min: 200, max: 600, low: 300, high: 440 },
  qtc: { min: 280, max: 600, low: 350, high: 450 },
} as const;

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const pc = (fraction: number): string => `${(fraction * 100).toFixed(2)}%`;

/** A measured number, or an em dash. Never 0, never blank. */
function num(v: number | null | undefined, digits = 0): string {
  return v === null || v === undefined ? '—' : v.toFixed(digits);
}

/* ══════════════════ The pieces ══════════════════ */

function chip(text: string, cls: string): string {
  return `<span class="mchip ${cls}">${esc(text)}</span>`;
}

/** One tinted tile: kicker, big number, unit. `tone` picks the hue. */
function tile(opts: {
  label: string;
  value: string;
  unit?: string;
  tone: 'red' | 'blue' | 'violet' | 'amber' | 'plain';
  /** Word-valued measurements (a rhythm class) take a smaller size. */
  small?: boolean;
}): string {
  const { label, value, unit, tone, small } = opts;
  return `<div class="mtile mtile-${tone}">
    <div class="mtile-k">${esc(label)}</div>
    <div class="mtile-v${small ? ' mtile-v-s' : ''}">${esc(value)}${
      unit ? `<span class="mtile-u">${esc(unit)}</span>` : ''
    }</div>
  </div>`;
}

/**
 * One interval against its band.
 *
 * The marker is CLAMPED into the track; the printed number never is. A
 * 700 ms QT on a 200–600 scale would otherwise put the dot off the paper
 * and silently disappear — the clamp moves a dot, never a measurement.
 */
function intervalRow(opts: {
  label: string;
  value: number | null;
  low: number;
  high: number;
  min: number;
  max: number;
  refLabel: string;
}): string {
  const { label, value, low, high, min, max, refLabel } = opts;
  const span = max - min || 1;
  const bandFrom = clamp01((low - min) / span);
  const bandTo = clamp01((high - min) / span);
  const at = value === null ? null : clamp01((value - min) / span);

  return `<div class="irow">
    <div class="irow-top">
      <span class="irow-l">${esc(label)}</span>
      <span class="irow-v${value === null ? ' irow-v-na' : ''}">${num(value)}${
        value === null ? '' : '<span class="irow-u">ms</span>'
      }</span>
    </div>
    <div class="itrack">
      <div class="iband" style="left:${pc(bandFrom)};width:${pc(Math.max(0, bandTo - bandFrom))}"></div>
      ${at === null ? '' : `<div class="idot" style="left:${pc(at)}"></div>`}
    </div>
    <div class="irow-ref">${esc(refLabel)} ${low}–${high} ms</div>
  </div>`;
}

/* ══════════════════ The page ══════════════════ */

export function measurementsPage(
  analysis: EcgAnalysis,
  /** Filtered lead II — the trace on the band. Null draws an empty band. */
  leadII: Float32Array | null,
  durationSec: number,
  /**
   * ★ A simulated study says so ON THIS PAGE, not only on the ECG sheet.
   *
   * The floating SIMULATED banner lives on the first ECG sheet, which used
   * to be page 1. This page is page 1 now — it carries the headline rate
   * and it is the page somebody photographs and sends — so the claim has to
   * be on it too. Mobile CLAUDE.md §4: synthetic data must never be
   * presentable as a measurement, and "presentable" means the page a reader
   * actually looks at.
   */
  isSimulated: boolean,
  chrome: PageChrome,
  labels: PdfLabels,
  totalPages: number,
  pageNumber: number,
): string {
  const { rate, intervals, axis, amplitudes, quality } = analysis;

  assertFits('measurements', [
    H_HERO,
    H_GAP,
    H_TILES,
    H_GAP,
    H_MAIN,
    H_GAP,
    H_AMP_TITLE,
    H_AMPS,
    H_GAP,
    H_NOTE,
  ]);

  const rhythmWord = labels.regularityName(rate.regularity);
  const secs = `${durationSec.toFixed(1)} s`;
  const hz = `${analysis.sampleRate} Hz`;
  const beats = `${rate.beatsAnalyzed} ${labels.beatsUnit}`;
  const rrRange =
    rate.rrMinMs !== null && rate.rrMaxMs !== null
      ? `${rate.rrMinMs}–${rate.rrMaxMs}`
      : '—';

  /* ── 1. The band ── */
  const traceW = COL_W - 12;
  const hero = `<div class="hero">
    <div class="hero-top">
      <div>
        <div class="hero-k">${esc(labels.heroKicker)}</div>
        <div class="hero-rate">
          <span class="hero-n">${num(rate.bpm)}</span>
          <span class="hero-u">${esc(labels.bpmUnit)}</span>
        </div>
      </div>
      <div class="hero-chips">
        ${isSimulated ? chip(labels.simulated, 'mchip-sim') : ''}${chip(rhythmWord, 'mchip-amber')}${chip(secs, 'mchip-dim')}${chip(hz, 'mchip-dim')}${chip(beats, 'mchip-dim')}
      </div>
    </div>
    <div class="hero-tr">${sparkTrace({ w: traceW, h: 15, samples: leadII, ink: R_TRACE })}</div>
  </div>`;

  /* ── 2. The tiles ── */
  const tiles = `<div class="mtiles">
    ${tile({ label: labels.mBpm, value: num(rate.bpm), unit: labels.bpmUnit, tone: 'red' })}
    ${tile({ label: labels.mRrMean, value: num(rate.rrMeanMs), unit: 'ms', tone: 'blue' })}
    ${tile({ label: labels.mRrRange, value: rrRange, unit: 'ms', tone: 'violet', small: true })}
    ${tile({ label: labels.mRegularity, value: rhythmWord, tone: 'amber', small: true })}
    ${tile({ label: labels.mSdnn, value: num(rate.sdnnMs, 1), unit: 'ms', tone: 'plain' })}
    ${tile({ label: labels.mRmssd, value: num(rate.rmssdMs, 1), unit: 'ms', tone: 'plain' })}
    ${tile({ label: labels.mPBefore, value: num(rate.pBeforeQrsPct), unit: '%', tone: 'plain' })}
    ${tile({ label: labels.mBeats, value: String(rate.beatsAnalyzed), tone: 'plain' })}
  </div>`;

  /* ── 3. Intervals | axis + quality ── */
  const intervalRows = [
    intervalRow({ label: labels.iPr, value: intervals.prMs, ...REF.pr, refLabel: labels.refRange }),
    intervalRow({ label: labels.iQrs, value: intervals.qrsMs, ...REF.qrs, refLabel: labels.refRange }),
    intervalRow({ label: labels.iQt, value: intervals.qtMs, ...REF.qt, refLabel: labels.refRange }),
    intervalRow({
      label: labels.iQtcB,
      value: intervals.qtcBazettMs,
      ...REF.qtc,
      refLabel: labels.refRange,
    }),
    intervalRow({
      label: labels.iQtcF,
      value: intervals.qtcFridericiaMs,
      ...REF.qtc,
      refLabel: labels.refRange,
    }),
  ].join('');

  const sqi = clamp01(quality.sqi / 100);
  const main = `<div class="mmain">
    <div class="mcol-l">
      <div class="mkick">${esc(labels.statsIntervals)}</div>
      <div class="irows">${intervalRows}</div>
      <div class="inote">${esc(labels.intervalsNote)}</div>
    </div>
    <div class="mcol-r">
      <div class="mkick">${esc(labels.statsAxis)}</div>
      <div class="axcard">
        <div class="axdial">${hexaxial({ size: 33, degrees: axis.degrees, ink: R_AX_INK, showDegrees: false })}</div>
        <div class="axread">
          <div class="axdeg">${axis.degrees === null ? '—' : `${axis.degrees}°`}</div>
          <div class="axchip">${esc(labels.axisClassName(axis.classification))}</div>
          <div class="axcap">${esc(labels.axisSector)}</div>
        </div>
      </div>
      <div class="axnets">
        ${tile({ label: labels.axisNetI, value: num(axis.netI, 3), unit: 'mV·s', tone: 'plain', small: true })}
        ${tile({ label: labels.axisNetAvf, value: num(axis.netAvf, 3), unit: 'mV·s', tone: 'plain', small: true })}
      </div>
      <div class="mkick mkick-2">${esc(labels.statsQuality)}</div>
      <div class="qcard">
        <div class="qring">
          <svg width="22mm" height="22mm" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
            <circle cx="32" cy="32" r="26" fill="none" stroke="${R_Q_TRACK}" stroke-width="7"/>
            <circle cx="32" cy="32" r="26" fill="none" stroke="${R_Q_RING}" stroke-width="7"
                    stroke-linecap="round" stroke-dasharray="${(2 * Math.PI * 26).toFixed(1)}"
                    stroke-dashoffset="${(2 * Math.PI * 26 * (1 - sqi)).toFixed(1)}"
                    transform="rotate(-90 32 32)"/>
            <text x="32" y="35" text-anchor="middle" font-size="15" font-weight="700"
                  fill="${R_Q_RING}">${quality.sqi}%</text>
          </svg>
        </div>
        <div class="qbody">
          <div class="qtitle">${esc(labels.mSqi)}</div>
          <div class="qtext">${esc(labels.qualityBody.replace('{beats}', String(rate.beatsAnalyzed)))}</div>
          <div class="qchips">
            <span class="qchip">${esc(`${quality.analysedSeconds.toFixed(1)} s`)}</span>
            <span class="qchip">${esc(hz)}</span>
          </div>
        </div>
      </div>
    </div>
  </div>`;

  /* ── 4. Wave amplitudes ── */
  /* One scale for all six columns — the panel exists to be compared ACROSS
     leads, and a per-lead scale would make aVF's 0.07 mV R wave look the
     same height as lead I's 0.88. */
  const peak = Math.max(
    0.2,
    ...LIMB_LEAD_ORDER.flatMap((l) => {
      const a = amplitudes[l];
      return [a?.pMv ?? 0, a?.qMv ?? 0, a?.rMv ?? 0, a?.sMv ?? 0, a?.tMv ?? 0].map(Math.abs);
    }),
  );
  const ppPeak = Math.max(
    0.1,
    ...LIMB_LEAD_ORDER.map((l) => amplitudes[l]?.qrsAmplitudeMv ?? 0),
  );
  const cellW = COL_W / 6;

  const ampCols = LIMB_LEAD_ORDER.map((lead) => {
    const a = amplitudes[lead];
    const values = [a?.pMv ?? null, a?.qMv ?? null, a?.rMv ?? null, a?.sMv ?? null, a?.tMv ?? null];
    const pp = a?.qrsAmplitudeMv ?? null;
    const nums = values
      .map(
        (v, i) =>
          `<span class="${i === 2 ? 'ampn-strong' : ''}">${v === null ? '—' : v.toFixed(2)}</span>`,
      )
      .join('');
    return `<div class="ampcol">
      <div class="ampfig">${waveColumn({ w: cellW - 4, h: 30, values, inks: R_WAVE_INKS, peak })}</div>
      <div class="ampnums">${nums}</div>
      <div class="amppp"><span>${esc(labels.ampPp)}</span><b>${num(pp, 2)}</b></div>
      <div class="amppptrack">${
        pp === null
          ? ''
          : `<i style="width:${pc(clamp01(pp / ppPeak))}"></i>`
      }</div>
    </div>`;
  }).join('');

  const legend = [labels.ampP, labels.ampQ, labels.ampR, labels.ampS, labels.ampT]
    .map((w, i) => `<span class="lg"><i style="background:${R_WAVE_INKS[i]}"></i>${esc(w)}</span>`)
    .join('');

  const amps = `<div class="amppanel">
    <div class="amphead">${LIMB_LEAD_ORDER.map((l) => `<div>${esc(l)}</div>`).join('')}</div>
    <div class="ampgrid">${ampCols}</div>
  </div>`;

  const ampTitle = `<div class="ampbar">
    <span class="mkick mkick-flat">${esc(labels.statsAmplitudes)}</span>
    <span class="amplegend">${legend}<span class="lg-scale">${esc(
      labels.ampScale.replace('{max}', peak.toFixed(1)),
    )}</span></span>
  </div>`;

  /* ── 5. The statement this page closes on ── */
  const note = `<div class="mfoot">
    <p>${esc(labels.disclaimer)}</p>
    <span class="mfoot-r">${esc(`${secs} · ${hz} · ${beats}`)}</span>
  </div>`;

  const gap = `<div class="blk" style="height:${mm(H_GAP)}"></div>`;
  const blk = (h: number, html: string): string =>
    `<div class="blk" style="height:${mm(h)}">${html}</div>`;

  return pageShell(
    {
      brand: chrome.brand,
      subtitle: chrome.subtitle,
      title: labels.pageMeasurements,
      pageLabel: labels.pageOf
        .replace('{n}', String(pageNumber))
        .replace('{total}', String(totalPages)),
      footRight: `${labels.mAnalysed}: ${quality.analysedSeconds.toFixed(1)} s`,
    },
    blk(H_HERO, hero) +
      gap +
      blk(H_TILES, tiles) +
      gap +
      blk(H_MAIN, main) +
      gap +
      blk(H_AMP_TITLE, ampTitle) +
      blk(H_AMPS, amps) +
      gap +
      blk(H_NOTE, note),
  );
}

// v1.0.0 — The measurements page: the design handoff's A4, with its
//          per-interval "within range" call-outs deliberately dropped and its
//          green "normal axis" pill repainted the section's violet. Colour
//          sections this page; it never grades a measurement.
