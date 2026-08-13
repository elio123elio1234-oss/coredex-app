/* ==================================================================
   document — the clinical report as HTML. PURE: no expo, no React.

   ══ WHY THIS EXISTS AT ALL ══
   The web's "Print report" is `window.print()`: the browser renders the
   page it is already showing onto paper. A phone has no print dialog and no
   page — the report on screen is a scrolling native view, and there is
   nothing for an OS printer to take a snapshot of. So the document has to
   be BUILT, and this file plus `pdf/` is the only place in the app that
   emits HTML.

   ══ WHAT CHANGED IN v2, AND WHY ══
   Reported: *"the PDF is not laid out for the page, the graphs stretch
   across two pages, the tables are colourless and dated, it is ugly."*

   The stretching was a missing constraint, not a styling mistake: strips
   were `<svg width="100%">` with no height, so the height was inferred from
   an aspect ratio against whatever column the print engine had decided on,
   and `.page` had no height ceiling. Any growth above — a long device name
   wrapping the letterhead is enough — pushed the sixth lead past 297 mm and
   the engine started a new page mid-trace.

   Everything is now sized in millimetres and `assertFits` throws while
   BUILDING if a page's blocks would exceed the body. A torn report is worse
   than a failed export precisely because it looks fine on the phone that
   made it.

   ══ IT IS THE SAME RULER AS THE SCREEN AND THE WEB ══
   The strips are drawn by `buildEcgPath` / `buildEcgGrid` from
   `@cyphix/shared` — the exact functions the on-screen report and the web
   report use. An interval measured with a ruler on this printout lands on
   the same value as one measured on the web sheet: 25 mm/s, 10 mm/mV, 1 mm
   minor grid, 5 mm major grid, and a 1 mV calibration pulse at the left of
   every lead so the gain is verifiable by eye rather than trusted.

   ══ IT PAGINATES LIKE A MACHINE PRINTOUT ══
   186 mm of column at 25 mm/s holds (186 − 9) / 25 ≈ 7.1 s. A 10 s
   recording is therefore TWO full-page six-lead sheets, consecutive in
   time, which is what a six-channel machine does with a long capture.
   Drawing the first 7 s and captioning "7 of 10 s" would quietly discard
   three seconds of a clinical recording from the one artefact that gets
   filed and emailed.

   ⚠️ COLOURS ARE PRINT COLOURS. The dark theme's green-on-navy paper is a
   screen affordance; on a printer it is a solid navy rectangle nobody can
   write on. This document is always white paper with the brand's blue grid
   and navy trace.
   ================================================================== */

import {
  analyseLimbEcg,
  decodeChannel,
  deriveLeads,
  LIMB_LEAD_ORDER,
  reportFilterLeads,
  screenLimbEcg,
  type EcgScreening,
  type LimbLeadName,
  type ScreeningContext,
  type StoredRecording,
} from '@cyphix/shared';
import type { PdfLabels } from './labels';
import {
  countEcgSheets,
  chunkFindings,
  ecgPages,
  interpretationPages,
  referencePage,
  statisticsPage,
  REPORT_CSS,
} from './pages';
import { esc } from './theme';

export interface ReportInput {
  recording: StoredRecording;
  labels: PdfLabels;
  /** Moves a threshold, never a rule. Omit and the engine takes the more
      conservative limit — see `screenLimbEcg`. */
  patient?: ScreeningContext;
  /** Shown in the letterhead. Never inferred from the account. */
  patientName?: string;
}

/**
 * Build the report HTML.
 *
 * Exported separately from the print call so the whole document can be
 * generated and asserted on in Node — which is how the page arithmetic is
 * actually verified, since a PDF cannot be diffed.
 */
export function buildRecordingHtml(input: ReportInput): string {
  const { recording, labels, patient = {}, patientName } = input;

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

  /* The full standard chain, with every stage ON. A printed sheet is the
     artefact that gets filed, and filing the unfiltered signal because the
     reader happened to have a stage switched off would misrepresent the
     study. */
  const leads = reportFilterLeads(derived, fs, 'II', {
    baseline: true,
    notch: true,
    smoothing: true,
  }) as Record<LimbLeadName, Float32Array>;
  const analysis = analyseLimbEcg(leads, fs);

  /* ★ A SIMULATED RECORDING IS NOT SCREENED, HERE EITHER.
     The same rule the app obeys (`useScreening`, mobile CLAUDE.md §4), and
     it binds harder in a PDF: a document leaves the phone, gets emailed,
     and is read by someone with no way to know the trace came from a bench
     generator rather than a heart. The interpretation page is omitted
     entirely and the letterhead carries the SIMULATED banner. */
  const screening: EcgScreening | null = recording.isSimulated
    ? null
    : screenLimbEcg(leads, analysis, patient);

  /* ── Page numbering, counted before anything is built ── */
  const ecgSheets = countEcgSheets(n, fs);
  const interpChunks = screening ? chunkFindings(screening.findings).length : 0;
  const totalPages = ecgSheets + interpChunks + 2;

  const when = new Date(recording.recordedAt).toLocaleString();
  const chrome = {
    brand: labels.brand,
    subtitle: [
      patientName ? `${labels.patient}: ${patientName}` : '',
      `${labels.recorded}: ${when}`,
      `${labels.duration}: ${recording.durationSec.toFixed(1)} s · ${labels.sampleRate}: ${fs} Hz`,
      recording.deviceLabel ? `${labels.device}: ${recording.deviceLabel}` : '',
    ]
      .filter(Boolean)
      .join('\n'),
  };

  let pageNo = 1;

  const ecg = ecgPages(leads, analysis, n, chrome, labels, totalPages, pageNo);
  pageNo += ecg.pages;

  const interp = screening
    ? interpretationPages(screening, chrome, labels, totalPages, pageNo)
    : { html: '', pages: 0 };
  pageNo += interp.pages;

  const stats = statisticsPage(analysis, screening, chrome, labels, totalPages, pageNo);
  pageNo += 1;

  const reference = referencePage(
    screening,
    leads.II ?? null,
    analysis,
    recording.note ?? null,
    chrome,
    labels,
    totalPages,
    pageNo,
  );

  const simBanner = recording.isSimulated
    ? `<div class="simfloat">${esc(labels.simulated)}</div>`
    : '';

  return `<!doctype html><html><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${esc(labels.title)}</title>
<style>${REPORT_CSS}
/* The simulated banner floats over the first sheet rather than taking a
   block of its own, so a demo export has exactly the same pagination as a
   real one — a layout that changes shape with the data is a layout that has
   only been checked with one kind of data. */
.simfloat { position: absolute; top: 27mm; left: 12mm; z-index: 5;
            font-size: 8pt; font-weight: 800; color: #D32B21;
            background: #FBE6E4; padding: 1mm 2.4mm; border-radius: 1mm; }
</style></head><body>
${ecg.html.replace('<div class="body">', `${simBanner}<div class="body">`)}
${interp.html}
${stats}
${reference}
</body></html>`;
}


// v1.0.0 - The document builder, split out of recordingPdf so it imports NOTHING
//          from expo and can therefore be built and asserted on in Node. That is
//          not a nicety: a PDF cannot be diffed, so the page arithmetic is only
//          checkable if the HTML can be produced without a printer.
