/* ==================================================================
   recordingPdf — the printable report, as a real document.

   ══ WHY THIS EXISTS AT ALL ══
   The web's "Print report" is `window.print()`: the browser renders the
   page it is already showing onto paper. A phone has no print dialog and no
   page — the report on screen is a scrolling native view, and there is
   nothing for an OS printer to take a snapshot of. So the PDF has to be
   BUILT, and this is the only file in the app that emits HTML.

   ══ IT IS THE SAME SHEET, NOT A SCREENSHOT ══
   The strips below are drawn from `buildEcgPath` / `buildEcgGrid` in
   `@cyphix/shared` — the exact functions the on-screen report and the web
   report use. So an interval measured with a ruler on this printout lands
   on the same value as one measured on the web sheet: 25 mm/s, 10 mm/mV,
   1 mm minor grid, 5 mm major grid, and a 1 mV calibration pulse so the
   gain is verifiable by eye rather than trusted from a label.

   ══ IT PAGINATES LIKE A MACHINE PRINTOUT, NOT LIKE A SCREEN ══
   182 mm of A4 column holds (182 − 9) / 25 ≈ 6.9 s. A 10 s recording
   therefore becomes TWO sheets of six leads each, consecutive in time —
   which is what a six-channel machine does with a long capture. The
   alternative, drawing the first 6.9 s and captioning "6.9 s of 10 s",
   would quietly discard three seconds of a clinical recording from the one
   artefact that gets filed and emailed.

   ⚠️ COLOURS ARE PRINT COLOURS. The dark theme's green-on-navy paper is a
   screen affordance; on a printer it is a solid navy rectangle. This sheet
   is always white paper with the blue grid and the navy trace — the same
   `--ecg-*` light tokens the web prints with.
   ================================================================== */

import { File } from 'expo-file-system';
import * as Print from 'expo-print';
import {
  buildCalibrationPulse,
  buildEcgGrid,
  buildEcgPath,
  decodeChannel,
  deriveLeads,
  LIMB_LEAD_ORDER,
  reportFilterLeads,
  analyseLimbEcg,
  recordingFilename,
  STANDARD_MM_PER_MV,
  STANDARD_MM_PER_SEC,
  type LimbLeadName,
  type StoredRecording,
} from '@cyphix/shared';
import { shareFile } from './recordingExport';

/** A4 portrait, 14 mm margins — 182 mm of usable column. */
const SHEET_MM = 182;
/** Space reserved at the left of each strip for the calibration pulse. */
const CAL_WIDTH_MM = 9;
/** 30 mm ≙ ±1.5 mV at 10 mm/mV. A multiple of 5 so the grid tiles unbroken. */
const STRIP_MM = 30;

/* report.css `:root` — the print palette, verbatim. */
const PAPER = '#FFFFFF';
const GRID_MINOR = 'rgba(0, 82, 255, 0.15)';
const GRID_MAJOR = 'rgba(0, 82, 255, 0.30)';
const TRACE = '#0A2540';
const MARKER = 'rgba(0, 82, 255, 0.55)';

/** Copy the caller supplies, so this service holds no locale of its own. */
export interface PdfLabels {
  title: string;
  brand: string;
  recorded: string;
  duration: string;
  leads: string;
  leadSet: string;
  sampleRate: string;
  device: string;
  simulated: string;
  sheetOf: string;
  measurements: string;
  disclaimer: string;
  note: string;
  /** Row labels for the measurement table. */
  rows: { label: string; value: string }[];
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** One lead band of one sheet, as an inline SVG. */
function stripSvg(
  lead: string,
  data: Float32Array,
  sampleRate: number,
  rPeaks: number[] | undefined,
): string {
  const baselineMm = STRIP_MM / 2;
  const grid = buildEcgGrid(SHEET_MM, STRIP_MM);
  const path = buildEcgPath(data, {
    sampleRate,
    mmPerSec: STANDARD_MM_PER_SEC,
    mmPerMv: STANDARD_MM_PER_MV,
    baselineMm,
    xOffsetMm: CAL_WIDTH_MM,
    // 8 buckets/mm is the shared default and was tuned for exactly this
    // 182 mm column; a printer resolves far more than a screen does.
    bucketsPerMm: 8,
    clipMm: baselineMm - 0.6,
  });
  const cal = buildCalibrationPulse(baselineMm, STANDARD_MM_PER_MV, STANDARD_MM_PER_SEC, 1);
  const ticks = (rPeaks ?? [])
    .map((r) => CAL_WIDTH_MM + (r / sampleRate) * STANDARD_MM_PER_SEC)
    .filter((x) => x <= SHEET_MM - 1)
    .map(
      (x) =>
        `<line x1="${x.toFixed(2)}" y1="0.6" x2="${x.toFixed(2)}" y2="2.2" stroke="${MARKER}" stroke-width="0.25"/>`,
    )
    .join('');

  return `<svg class="strip" viewBox="0 0 ${SHEET_MM} ${STRIP_MM}" preserveAspectRatio="xMidYMid meet">
  <rect width="${SHEET_MM}" height="${STRIP_MM}" fill="${PAPER}"/>
  <path d="${grid.minor}" fill="none" stroke="${GRID_MINOR}" stroke-width="0.1"/>
  <path d="${grid.major}" fill="none" stroke="${GRID_MAJOR}" stroke-width="0.2"/>
  <path d="${cal}" fill="none" stroke="${TRACE}" stroke-width="0.18" stroke-linejoin="round" opacity="0.85"/>
  ${ticks}
  <path d="${path}" fill="none" stroke="${TRACE}" stroke-width="0.22" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="1.6" y="4.2" font-size="3.2" font-weight="700" fill="${TRACE}">${esc(lead)}</text>
</svg>`;
}

/**
 * Build the report HTML. Exported separately from the print call so the
 * document can be tested — and so a future "email this" path can reuse it.
 */
export function buildRecordingHtml(recording: StoredRecording, labels: PdfLabels): string {
  const rawI = decodeChannel(recording.channels.leadI);
  const rawII = decodeChannel(recording.channels.leadII);
  const n = Math.min(rawI.length, rawII.length);
  const fs = recording.sampleRate;

  const derived: Record<LimbLeadName, Float32Array> = {
    I: new Float32Array(n),
    II: new Float32Array(n),
    III: new Float32Array(n),
    aVR: new Float32Array(n),
    aVL: new Float32Array(n),
    aVF: new Float32Array(n),
  };
  for (let i = 0; i < n; i++) {
    const s = deriveLeads(rawI[i], rawII[i]);
    for (const lead of LIMB_LEAD_ORDER) derived[lead][i] = s[lead];
  }
  /* The full standard chain — a printed sheet is the artefact that gets
     filed, and filing the unfiltered signal because the reader happened to
     have a stage switched off would misrepresent the study. */
  const leads = reportFilterLeads(derived, fs, 'II', {
    baseline: true,
    notch: true,
    smoothing: true,
  }) as Record<LimbLeadName, Float32Array>;
  const analysis = analyseLimbEcg(leads, fs);

  const perSheet = Math.max(1, Math.floor(((SHEET_MM - CAL_WIDTH_MM) / STANDARD_MM_PER_SEC) * fs));
  const sheets = Math.max(1, Math.ceil(n / perSheet));

  const provenance = [
    `${labels.recorded}: ${new Date(recording.recordedAt).toLocaleString()}`,
    `${labels.duration}: ${recording.durationSec.toFixed(1)} s`,
    `${labels.leads}: ${labels.leadSet}`,
    `${labels.sampleRate}: ${fs} Hz`,
    recording.deviceLabel ? `${labels.device}: ${esc(recording.deviceLabel)}` : '',
  ]
    .filter(Boolean)
    .map((line) => `<span>${line}</span>`)
    .join('');

  const pages = Array.from({ length: sheets }, (_, s) => {
    const from = s * perSheet;
    const to = Math.min(n, from + perSheet);
    const strips = LIMB_LEAD_ORDER.map((lead) =>
      stripSvg(
        lead,
        leads[lead].subarray(from, to),
        fs,
        /* Lead II carries the ticks: it is the rhythm strip the rate was
           computed from, and marking all six would imply six independent
           detections. Re-based onto this sheet's own window. */
        lead === 'II'
          ? analysis.rPeaks.filter((r) => r >= from && r < to).map((r) => r - from)
          : undefined,
      ),
    ).join('');

    return `<section class="page">
      <header class="letterhead">
        <div class="brand">${esc(labels.brand)}</div>
        <h1>${esc(labels.title)}</h1>
        <div class="meta">${provenance}</div>
        ${recording.isSimulated ? `<p class="sim">${esc(labels.simulated)}</p>` : ''}
      </header>
      <div class="sheet">${strips}</div>
      <footer class="foot">
        <span>${STANDARD_MM_PER_SEC} mm/s · ${STANDARD_MM_PER_MV} mm/mV</span>
        <span>${esc(labels.sheetOf.replace('{n}', String(s + 1)).replace('{total}', String(sheets)))}</span>
        <span>${(from / fs).toFixed(1)}–${(to / fs).toFixed(1)} s</span>
      </footer>
    </section>`;
  }).join('');

  const table = labels.rows
    .map((r) => `<tr><th>${esc(r.label)}</th><td>${esc(r.value)}</td></tr>`)
    .join('');

  return `<!doctype html><html><head><meta charset="utf-8"/>
<style>
  @page { size: A4 portrait; margin: 14mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: -apple-system, "Helvetica Neue", Roboto, sans-serif;
         color: #0A2540; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .page { page-break-after: always; }
  .page:last-child { page-break-after: auto; }
  .letterhead { border-bottom: 1.5px solid #0A2540; padding-bottom: 6px; margin-bottom: 8px; }
  .brand { font-size: 11px; font-weight: 800; letter-spacing: 3px; color: #7A829E; }
  h1 { font-size: 16px; margin: 2px 0 5px; }
  .meta { display: flex; flex-wrap: wrap; gap: 4px 14px; font-size: 9px; color: #64748B; }
  .sim { margin: 6px 0 0; padding: 4px 8px; font-size: 10px; font-weight: 700;
         color: #E5342A; background: rgba(229,52,42,0.10); border-radius: 4px; }
  /* No gap between bands, so the millimetre grid runs unbroken lead I → aVF
     the way a six-channel printout does. */
  .sheet { display: block; border: 1px solid #E5E7EB; }
  .strip { display: block; width: 100%; }
  .foot { display: flex; justify-content: space-between; font-size: 8.5px;
          color: #94A3B8; margin-top: 5px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 10px; }
  th, td { text-align: left; padding: 4px 6px; border-bottom: 1px solid #E5E7EB; }
  th { width: 46%; font-weight: 600; color: #64748B; }
  td { font-variant-numeric: tabular-nums; }
  .disclaimer { font-size: 8.5px; line-height: 1.45; color: #94A3B8; margin-top: 10px; }
  .note { font-size: 10px; line-height: 1.5; margin-top: 8px; padding: 8px;
          background: #F3F4F6; border-radius: 6px; white-space: pre-wrap; }
</style></head><body>
${pages}
<section class="page">
  <header class="letterhead">
    <div class="brand">${esc(labels.brand)}</div>
    <h1>${esc(labels.measurements)}</h1>
  </header>
  <table>${table}</table>
  ${recording.note ? `<div class="note"><strong>${esc(labels.note)}</strong><br/>${esc(recording.note)}</div>` : ''}
  <p class="disclaimer">${esc(labels.disclaimer)}</p>
</section>
</body></html>`;
}

/** Render the sheet to a PDF and hand it to the OS share sheet. */
export async function shareRecordingPdf(
  recording: StoredRecording,
  labels: PdfLabels,
  dialogTitle: string,
): Promise<void> {
  const { uri } = await Print.printToFileAsync({
    html: buildRecordingHtml(recording, labels),
    base64: false,
  });
  /* `printToFileAsync` writes to a cache path with a random name, which is
     what the recipient would see as the filename. Re-share it under the
     name the web export uses so a study is identifiable in a mailbox. */
  const pdf = new File(uri);
  await shareFile(
    recordingFilename(recording, 'pdf'),
    await pdf.bytes(),
    'application/pdf',
    dialogTitle,
  );
  pdf.delete();
}

// v1.0.0 — Builds the printable A4 sheet from the SHARED mm geometry (so a
//          ruler agrees with the web print), paginating a long capture across
//          consecutive six-lead sheets rather than truncating it.
