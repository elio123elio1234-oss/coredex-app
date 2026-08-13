/* ==================================================================
   recordingPdf — the clinical report, as a real document.

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

import { File } from 'expo-file-system';
import * as Print from 'expo-print';
import { recordingFilename } from '@cyphix/shared';
import { buildRecordingHtml, type ReportInput } from './pdf/document';
import { shareFile } from './recordingExport';

export type { PdfLabels } from './pdf/labels';
export { buildRecordingHtml } from './pdf/document';
export type { ReportInput } from './pdf/document';

/** Render the report to a PDF and hand it to the OS share sheet. */
export async function shareRecordingPdf(
  input: ReportInput,
  dialogTitle: string,
): Promise<void> {
  const { uri } = await Print.printToFileAsync({
    html: buildRecordingHtml(input),
    base64: false,
    /* A4 in POINTS (72 dpi): 210 mm = 595.28 pt, 297 mm = 841.89 pt. Passed
       explicitly because the default paper size follows the device locale —
       a phone set to US English gets Letter, which is 6 mm narrower and
       18 mm shorter than the millimetre geometry every page is built to.
       That mismatch is invisible on screen and shears the sheet in print. */
    width: 595.28,
    height: 841.89,
    margins: { left: 0, right: 0, top: 0, bottom: 0 },
  });
  /* `printToFileAsync` writes to a cache path with a random name, which is
     what the recipient would see as the filename. Re-share it under the
     name the web export uses so a study is identifiable in a mailbox. */
  const pdf = new File(uri);
  await shareFile(
    recordingFilename(input.recording, 'pdf'),
    await pdf.bytes(),
    'application/pdf',
    dialogTitle,
  );
  pdf.delete();
}

// v2.0.0 — Rebuilt after "not laid out for the page, graphs stretch across two
//          pages, tables dated, ugly". Every box is sized in millimetres and
//          `assertFits` throws while building rather than letting a page spill;
//          A4 is passed to the printer explicitly so a US locale cannot silently
//          substitute Letter. Page 1 is the six-lead ECG at full page, then the
//          verdict with its evidence, then statistics with real figures (hexaxial
//          dial, Poincaré, tachogram, signed amplitude bars), then the lead map.
// v1.0.0 — Builds the printable A4 sheet from the SHARED mm geometry.
