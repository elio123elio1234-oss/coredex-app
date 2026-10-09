/* ==================================================================
   Invite CSV — a clinic's patient list as text, parsed the same way on
   every platform (LAUNCH_PLAN 4.3; hole A8). Pure logic: no I/O.

   Accepts what a front desk actually exports: a header row or none,
   commas / semicolons / tabs, quoted cells, blank lines. With a header,
   the columns are found by name (e-mail · a label for the list · the
   treating clinician's id); without one, the first column is the
   address and the second the label. Every line without a usable
   address is reported, not dropped silently.
   ================================================================== */

import type { BulkInviteRow } from './contract';

export interface ParsedInviteCsv {
  rows: BulkInviteRow[];
  /** One line each: "line 4: no e-mail address". */
  errors: string[];
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HEADER_EMAIL = /^(e-?mail|email address|mail|כתובת|מייל|אימייל)$/i;
const HEADER_HINT = /^(hint|label|name|patient|patient name|full name|שם|מטופל|תווית)$/i;
const HEADER_CLINICIAN = /^(clinician|clinician id|doctor|assigned|assigned clinician|רופא)$/i;

/** The delimiter is whichever of `,` `;` `\t` the first line uses most. */
function detectDelimiter(firstLine: string): string {
  const counts: Array<[string, number]> = [',', ';', '\t'].map((d) => [d, firstLine.split(d).length - 1]);
  counts.sort((a, b) => b[1] - a[1]);
  return counts[0]![1] > 0 ? counts[0]![0] : ',';
}

/** One line → cells; quotes wrap a cell and `""` is a literal quote. */
function splitLine(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delimiter) {
      cells.push(cell);
      cell = '';
    } else cell += ch;
  }
  cells.push(cell);
  return cells.map((c) => c.trim());
}

export function parseInviteCsv(text: string): ParsedInviteCsv {
  const lines = text.split(/\r?\n/);
  const rows: BulkInviteRow[] = [];
  const errors: string[] = [];
  const firstIdx = lines.findIndex((l) => l.trim().length > 0);
  if (firstIdx < 0) return { rows, errors };
  const delimiter = detectDelimiter(lines[firstIdx]!);
  const first = splitLine(lines[firstIdx]!, delimiter);

  /* A header is a first line with a recognisable e-mail column and no
     address in it. */
  let emailCol = 0;
  let hintCol: number | null = 1;
  let clinicianCol: number | null = null;
  let start = firstIdx;
  const headerEmail = first.findIndex((c) => HEADER_EMAIL.test(c));
  if (headerEmail >= 0 && !first.some((c) => EMAIL_RE.test(c))) {
    emailCol = headerEmail;
    const h = first.findIndex((c) => HEADER_HINT.test(c));
    hintCol = h >= 0 ? h : null;
    const k = first.findIndex((c) => HEADER_CLINICIAN.test(c));
    clinicianCol = k >= 0 ? k : null;
    start = firstIdx + 1;
  }

  for (let n = start; n < lines.length; n++) {
    const raw = lines[n]!;
    if (raw.trim().length === 0) continue;
    const cells = splitLine(raw, delimiter);
    const email = (cells[emailCol] ?? '').toLowerCase();
    if (!EMAIL_RE.test(email)) {
      errors.push(`line ${n + 1}: no e-mail address`);
      continue;
    }
    const hint = hintCol !== null ? cells[hintCol] : undefined;
    const clinician = clinicianCol !== null ? cells[clinicianCol] : undefined;
    rows.push({
      email,
      ...(hint ? { patientHint: hint } : {}),
      ...(clinician ? { assignedClinicianId: clinician } : {}),
    });
  }
  return { rows, errors };
}

// v1.0.0 — parseInviteCsv: header-aware, delimiter-tolerant, every bad line reported (4.3).
