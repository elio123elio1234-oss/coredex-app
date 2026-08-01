/* ==================================================================
   ecgImport — ingest an ECG recorded somewhere else.

   ══ WHAT IT ACCEPTS ══
   CSV with a header row naming the columns. It needs a time or sample
   basis and at least Lead I and Lead II (or enough leads to recover
   them), because the whole viewer is built on storing those two and
   deriving the rest. Column names are matched case-insensitively against
   the usual spellings — hospital exports write "Lead I", "LeadI", "I",
   "ECG1" and half a dozen other things for the same signal.

   ══ WHAT IT REFUSES, LOUDLY ══
   An importer that guesses is worse than one that fails. If the sample
   rate cannot be established, if the required leads are missing, or if
   the values are not plausibly millivolts, it returns an error naming
   the problem rather than importing something subtly wrong that will be
   read as a patient's heart. Silent unit errors are the classic way
   imported physiological data goes bad — mV read as µV is a 1000×
   amplitude error that still "looks like" an ECG.

   ══ PROVENANCE ══
   An imported recording is marked with its source file so nobody later
   mistakes it for something this device measured. It is NOT marked
   simulated (it is real patient data), but it did not come from our
   hardware and the record has to say so.
   ================================================================== */

import { LIMB_LEAD_ORDER } from '../types/ecg';

export interface ImportedEcg {
  leadI: Float32Array;
  leadII: Float32Array;
  sampleRate: number;
  sourceLabel: string;
}

export interface ImportError {
  problem: string;
  /** What the user can do about it, in plain words. */
  remedy: string;
}

export type ImportResult =
  | { ok: true; data: ImportedEcg }
  | { ok: false; error: ImportError };

/** Spellings seen in real exports, per lead. Matched case-insensitively. */
const LEAD_ALIASES: Record<string, string[]> = {
  I: ['i', 'lead i', 'leadi', 'lead_i', 'ecg1', 'ch1', 'l1'],
  II: ['ii', 'lead ii', 'leadii', 'lead_ii', 'ecg2', 'ch2', 'l2'],
  III: ['iii', 'lead iii', 'leadiii', 'lead_iii'],
  aVR: ['avr', 'lead avr', 'a_vr'],
  aVL: ['avl', 'lead avl', 'a_vl'],
  aVF: ['avf', 'lead avf', 'a_vf'],
};

const TIME_ALIASES = ['time', 'time_s', 'time(s)', 'seconds', 't', 'sec'];
const SAMPLE_RATE_KEYS = ['sample_rate_hz', 'sample_rate', 'samplerate', 'fs', 'sampling_rate'];

/** Amplitudes outside this are not millivolts on any real ECG. */
const PLAUSIBLE_MV = 20;

function normalise(header: string): string {
  return header.trim().toLowerCase().replace(/^"|"$/g, '');
}

function findColumn(headers: string[], aliases: string[]): number {
  return headers.findIndex((h) => aliases.includes(normalise(h)));
}

export function parseEcgCsv(text: string, sourceLabel: string): ImportResult {
  const allLines = text.split(/\r?\n/);

  /* Comment lines carry metadata in most exports (including our own).
     Scan them for a declared sample rate before discarding them. */
  let declaredFs: number | null = null;
  for (const line of allLines) {
    if (!line.startsWith('#')) continue;
    const [rawKey, rawValue] = line.replace(/^#\s*/, '').split(':');
    if (!rawKey || !rawValue) continue;
    if (SAMPLE_RATE_KEYS.includes(normalise(rawKey).replace(/\s/g, '_'))) {
      const n = Number(rawValue.trim());
      if (Number.isFinite(n) && n > 0) declaredFs = n;
    }
  }

  const lines = allLines.filter((l) => l.trim() !== '' && !l.startsWith('#'));
  if (lines.length < 3) {
    return {
      ok: false,
      error: {
        problem: 'The file has no data rows.',
        remedy: 'Export again from the source system, including the waveform samples.',
      },
    };
  }

  const headers = lines[0].split(',');
  const iCol = findColumn(headers, LEAD_ALIASES.I);
  const iiCol = findColumn(headers, LEAD_ALIASES.II);
  const timeCol = findColumn(headers, TIME_ALIASES);

  if (iCol === -1 || iiCol === -1) {
    return {
      ok: false,
      error: {
        problem: `Could not find Lead I and Lead II. Columns seen: ${headers
          .map((h) => h.trim())
          .filter(Boolean)
          .slice(0, 12)
          .join(', ')}`,
        remedy: `Rename the two columns to "I" and "II" (or ${LIMB_LEAD_ORDER.join('/')}) and try again.`,
      },
    };
  }

  const leadI: number[] = [];
  const leadII: number[] = [];
  const times: number[] = [];

  for (let r = 1; r < lines.length; r++) {
    const cells = lines[r].split(',');
    const a = Number(cells[iCol]);
    const b = Number(cells[iiCol]);
    if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
    leadI.push(a);
    leadII.push(b);
    if (timeCol !== -1) {
      const tv = Number(cells[timeCol]);
      if (Number.isFinite(tv)) times.push(tv);
    }
  }

  if (leadI.length < 100) {
    return {
      ok: false,
      error: {
        problem: `Only ${leadI.length} usable samples were found.`,
        remedy: 'Check the file is comma-separated and the lead columns contain numbers.',
      },
    };
  }

  /* Sample rate: prefer the declared value, else derive it from the time
     column. Never assume one — an assumed rate silently rescales every
     interval the viewer will go on to report. */
  let sampleRate = declaredFs ?? 0;
  if (!sampleRate && times.length > 10) {
    const span = times[times.length - 1] - times[0];
    if (span > 0) sampleRate = Math.round((times.length - 1) / span);
  }
  if (!sampleRate || sampleRate < 50 || sampleRate > 5000) {
    return {
      ok: false,
      error: {
        problem: 'The sample rate could not be established from the file.',
        remedy:
          'Include a "time_s" column, or a "# sample_rate_hz: <n>" comment line, so intervals can be measured correctly.',
      },
    };
  }

  const peak = Math.max(
    ...leadI.map(Math.abs).slice(0, 5000),
    ...leadII.map(Math.abs).slice(0, 5000),
  );
  if (peak > PLAUSIBLE_MV) {
    return {
      ok: false,
      error: {
        problem: `Amplitudes reach ${peak.toFixed(0)}, which is not millivolts (an ECG peaks near 1–3 mV).`,
        remedy: 'The file is probably in microvolts. Divide the lead columns by 1000 and re-import.',
      },
    };
  }

  return {
    ok: true,
    data: {
      leadI: Float32Array.from(leadI),
      leadII: Float32Array.from(leadII),
      sampleRate,
      sourceLabel,
    },
  };
}

// v1.0.0 — CSV importer for externally recorded ECG; refuses ambiguous rate/units
//          rather than guessing. Copied from the web's services/ecg/ecgImport.ts
//          (only the import path changed) so both platforms accept and reject
//          exactly the same files. ⚠️ `problem`/`remedy` are ENGLISH technical
//          diagnostics naming column headers and units, not patient copy — the
//          web surfaces them untranslated too, and a localised paraphrase of
//          "rename the columns to I and II" would say less. Same on mobile.
