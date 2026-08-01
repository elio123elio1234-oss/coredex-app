/* ==================================================================
   recordingExport — the DELIVERY half of taking a recording out.

   The builders (`buildRecordingCsv`, `buildRecordingEdf`,
   `recordingFilename`) live in `@cyphix/shared` and are identical on every
   platform, so a CSV exported from the phone and one exported from the
   browser are byte-for-byte the same file. Only the last step differs:

     web    → Blob + object URL + a synthetic <a download> click
     mobile → write into the cache directory, hand the URI to the OS share
              sheet (AirDrop, Files, Mail, Drive, a hospital's own app…)

   ★ A phone has no downloads folder to click into. Writing the file and
   stopping would produce a file nobody can reach — sandboxed, invisible in
   Files, gone at the next cache sweep. The share sheet IS the export on
   this platform; a returned `shared: false` means the user dismissed it,
   which is a normal outcome and not an error.

   ══ WHY THE CACHE DIRECTORY AND NOT DOCUMENTS ══
   The file is a hand-off, not a stored artefact. The recording itself
   already lives in the app's store; a second copy sitting in Documents
   forever is unmanaged PHI, and the whole point of an export is that it
   leaves. `Paths.cache` lets the OS reclaim it, and the share sheet has
   already copied it wherever the user chose by then.
   ================================================================== */

import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export interface ExportResult {
  /** False when the OS share sheet is unavailable or the user dismissed it. */
  shared: boolean;
  uri: string;
}

/**
 * Write bytes or text into the cache and offer them to the share sheet.
 *
 * `bytes` is written raw — an EDF+ routed through a UTF-8 text encoder is
 * silently corrupted (every byte above 0x7F becomes two), which is exactly
 * the kind of corruption a reader would only discover after trusting it.
 */
export async function shareFile(
  filename: string,
  content: string | Uint8Array,
  mimeType: string,
  dialogTitle: string,
): Promise<ExportResult> {
  const file = new File(Paths.cache, filename);
  // `overwrite` matters: exporting the same study twice in one session must
  // replace the file, not throw.
  file.create({ overwrite: true });
  file.write(content);

  if (!(await Sharing.isAvailableAsync())) {
    return { shared: false, uri: file.uri };
  }
  await Sharing.shareAsync(file.uri, { mimeType, dialogTitle, UTI: utiFor(filename) });
  return { shared: true, uri: file.uri };
}

/**
 * iOS routes a share by Uniform Type Identifier, not by MIME type, and gets
 * the receiving-app list wrong without one — a CSV offered as
 * `public.data` shows no spreadsheet apps at all. Android ignores this.
 */
function utiFor(filename: string): string {
  if (filename.endsWith('.csv')) return 'public.comma-separated-values-text';
  if (filename.endsWith('.pdf')) return 'com.adobe.pdf';
  // EDF+ has no registered UTI. `public.data` is the honest generic answer:
  // it offers Files and Mail, which is where a research export goes.
  return 'public.data';
}

// v1.0.0 — Mobile delivery for exports: cache write + OS share sheet, with the
//          UTI iOS needs to offer the right destinations.
