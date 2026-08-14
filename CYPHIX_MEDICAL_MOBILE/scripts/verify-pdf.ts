/* ==================================================================
   verify-pdf — the report's arithmetic, checked in Node.

   A PDF cannot be diffed, so the only reliable check is the one the
   v0.48–v0.50 rebuilds did by hand: build the HTML for a spread of
   awkward recordings and assert on its structure. This file makes that
   repeatable:

       npx tsx scripts/verify-pdf.ts

   It exercises `buildRecordingHtml` (pure by design — no expo imports)
   across nine cases and asserts:
     · building never throws (assertFits holds on every page),
     · the printed "Page n of N" agrees with the actual page count,
     · every page carries the letterhead band,
     · the identification grid exists in EVERY case, simulated included,
     · the signal-quality table exists,
     · the patient name appears when passed and never when not,
     · no unsized SVGs, no percentage dimensions, no NaN/undefined.

   ★ This proves the ARITHMETIC, not that the sheet is beautiful — that
   still needs a human and a printer (CLAUDE.md §6.4).
   ================================================================== */

import { encodeChannel, type StoredRecording } from '@cyphix/shared';
import { buildRecordingHtml } from '../src/services/export/pdf/document';
import type { PdfLabels } from '../src/services/export/pdf/labels';

/* ── A crude but numerically honest synthetic ECG ──
   One beat template resampled at a given rate; not physiology, just a
   signal with real R peaks the DSP can chew on. */
function synth(seconds: number, bpm: number, amp = 1, jitterPct = 0): Float32Array {
  const fs = 320;
  const n = Math.round(seconds * fs);
  const out = new Float32Array(n);
  let nextBeat = 0.3 * fs;
  let period = (60 / bpm) * fs;
  for (let i = 0; i < n; i++) {
    if (i >= nextBeat) {
      const jitter = 1 + ((Math.sin(i * 12.9898) * 43758.5453) % 1) * jitterPct;
      period = (60 / bpm) * fs * Math.abs(jitter || 1);
      nextBeat = i + period;
    }
    const sinceBeat = i - (nextBeat - period);
    const tMs = (sinceBeat / fs) * 1000;
    let v = 0;
    if (tMs >= 0 && tMs < 80) v = -0.1 * Math.sin((tMs / 80) * Math.PI); // Q-ish
    if (tMs >= 80 && tMs < 120) v = amp * Math.sin(((tMs - 80) / 40) * Math.PI); // R
    if (tMs >= 120 && tMs < 160) v = -0.25 * Math.sin(((tMs - 120) / 40) * Math.PI); // S
    if (tMs >= 250 && tMs < 400) v = 0.25 * amp * Math.sin(((tMs - 250) / 150) * Math.PI); // T
    if (tMs >= -200 && tMs < -40) v = 0.12 * Math.sin(((tMs + 200) / 160) * Math.PI); // P
    out[i] = v + 0.01 * Math.sin(i / 9); // a whisper of noise
  }
  return out;
}

function rec(
  id: string,
  seconds: number,
  bpm: number,
  opts: Partial<StoredRecording> & { amp?: number; jitterPct?: number } = {},
): StoredRecording {
  const { amp = 1, jitterPct = 0, ...rest } = opts;
  const leadI = synth(seconds, bpm, amp * 0.8, jitterPct);
  const leadII = synth(seconds, bpm, amp, jitterPct);
  return {
    id,
    kind: 'EcgRecording',
    subject: 'Patient/pat-verify',
    recordedAt: '2026-08-14T10:30:00.000Z',
    type: 'limb',
    sampleRate: 320,
    durationSec: seconds,
    channels: { leadI: encodeChannel(leadI), leadII: encodeChannel(leadII) },
    isSimulated: false,
    summary: {
      bpm,
      sqi: 90,
      qrsMs: 90,
      qtcMs: 400,
      prMs: 160,
      axisDegrees: 45,
      beatsAnalyzed: 10,
      insufficient: false,
    },
    annotations: [],
    ...rest,
  };
}

/* English labels, spelled out — the harness must not import React hooks. */
const labels: PdfLabels = {
  brand: 'CYPHIX MEDICAL',
  title: 'Six-lead ECG report with a deliberately over-long title string',
  recorded: 'Recorded',
  duration: 'Duration',
  leads: 'Leads',
  leadSet: '6 limb',
  sampleRate: 'Sample rate',
  device: 'Device',
  patient: 'Patient',
  simulated: 'SIMULATION',
  pageEcg: 'Six-lead ECG',
  pageInterpretation: 'Interpretation',
  pageStatistics: 'Measurements & statistics',
  pageReference: 'Reference',
  sheetWindow: '{from}-{to} s of {total} s recorded',
  pageOf: 'Page {n} of {total}',
  continued: 'continued',
  checksRan: '{done} of {total} checks ran',
  findingsTitle: 'Findings',
  noFindings: 'No representative beat could be built.',
  criterion: 'Criterion',
  borderlineNote: 'borderline',
  auditTitle: 'Checks performed',
  auditNote: 'not evaluated means the measurement it needs was unavailable.',
  medianBeatTitle: 'Median beat',
  medianBeatCaption: '{used} used, {rejected} rejected',
  statsRate: 'Rate & intervals',
  statsIntervals: 'Intervals',
  statsAxis: 'Axis',
  statsVariability: 'Variability',
  statsAmplitudes: 'Amplitudes',
  statsQuality: 'Signal quality',
  refRange: 'Reference ranges',
  measureCol: 'Measurement',
  resultCol: 'Result',
  refCol: 'Reference',
  mBpm: 'Heart rate',
  mRrMean: 'Mean RR',
  mRrRange: 'RR range',
  mSdnn: 'SDNN',
  mRmssd: 'RMSSD',
  mRrVariation: 'RR variation',
  mBeats: 'Beats analysed',
  mSqi: 'Signal quality',
  mAnalysed: 'Analysed window',
  mEctopy: 'Ectopy burden',
  poincareCaption: 'Poincare plot',
  tachogramCaption: 'RR tachogram',
  axisCaption: 'Frontal axis',
  ampLead: 'Lead',
  ampUnit: 'millivolts',
  leadMapTitle: 'What the leads see',
  leadMapCaption: 'The six limb leads view the heart in the frontal plane.',
  wallInferior: 'inferior wall',
  wallLateral: 'lateral wall',
  wallNotSeen: 'not recorded by this test',
  blindTitle: 'What this test cannot see',
  disclaimer:
    'This report was produced by an automated screening layer and is not a diagnosis. An over-long disclaimer string to stress the last block of the last page without mercy.',
  noteTitle: 'Clinical note',
  finding: (id) => ({
    name: `Finding ${id} with an over-long name to stress the row`,
    meaning: 'A meaning sentence long enough to hit the clamp on the finding row body.',
    cause: 'A cause.',
  }),
  level: (l) => ({ headline: `Level ${l}`, action: `Action for ${l}` }),
  category: (c) => `cat ${c}`,
  confidence: (c) => `conf ${c}`,
  blindSpot: (b) => `blind spot ${b} described at some length for the bullet list`,
};

interface Case {
  name: string;
  recording: StoredRecording;
  patientName?: string;
}

const cases: Case[] = [
  { name: 'normal 10 s', recording: rec('r1', 10, 75), patientName: 'Noa Example-Levi' },
  { name: 'simulated', recording: rec('r2', 10, 75, { isSimulated: true }) },
  { name: 'short 3 s', recording: rec('r3', 3, 75), patientName: 'A Very Long Patient Name That Wraps' },
  { name: 'long 30 s', recording: rec('r4', 30, 75) },
  { name: 'brady 40', recording: rec('r5', 10, 40), patientName: 'Noa Example-Levi' },
  { name: 'tachy 150', recording: rec('r6', 10, 150) },
  { name: 'low voltage', recording: rec('r7', 10, 75, { amp: 0.25 }) },
  { name: 'irregular', recording: rec('r8', 10, 75, { jitterPct: 0.5 }) },
  {
    name: 'long device label + note',
    recording: rec('r9', 10, 75, {
      deviceLabel:
        'CYPHIX six-lead prototype rev C with an unreasonably long provenance label 0123456789',
      note: 'A clinical note long enough to fill its block on the reference page and then some, twice over, to stress the clamp.',
    }),
    patientName: 'Noa Example-Levi',
  },
];

let failures = 0;
const fail = (name: string, msg: string) => {
  failures++;
  console.error(`  FAIL [${name}] ${msg}`);
};

for (const c of cases) {
  let html: string;
  try {
    html = buildRecordingHtml({
      recording: c.recording,
      labels,
      patientName: c.patientName,
      patient: c.patientName ? { sex: 'female', ageYears: 62 } : {},
    });
  } catch (e) {
    fail(c.name, `build threw: ${(e as Error).message}`);
    continue;
  }

  const pages = (html.match(/class="pg"/g) ?? []).length;
  const bands = (html.match(/class="lh"/g) ?? []).length;
  const declared = html.match(/Page 1 of (\d+)/);

  if (!declared) fail(c.name, 'no "Page 1 of N" footer found');
  else if (Number(declared[1]) !== pages)
    fail(c.name, `declares ${declared[1]} pages but renders ${pages}`);
  if (bands !== pages) fail(c.name, `letterhead bands ${bands} != pages ${pages}`);
  if (!html.includes('class="idgrid"'))
    fail(c.name, 'identification grid missing (must exist even when simulated)');
  if (!html.includes(labels.statsQuality)) fail(c.name, 'signal-quality table missing');
  if (c.patientName && !html.includes(c.patientName.replace(/&/g, '&amp;')))
    fail(c.name, 'patient name missing from the document');
  if (!c.patientName && html.includes('Noa Example-Levi'))
    fail(c.name, 'a patient name leaked into an anonymous report');
  if (c.recording.isSimulated && html.includes(labels.pageInterpretation + '</div>'))
    fail(c.name, 'simulated report appears to carry an interpretation page');
  if (/width="100%"/.test(html)) fail(c.name, 'unsized (percentage-width) SVG found');
  if (/NaN|undefined/.test(html)) fail(c.name, 'NaN/undefined leaked into the document');
  if (/\{n\}|\{total\}|\{from\}|\{to\}/.test(html)) fail(c.name, 'unresolved placeholder');

  console.log(`  ok   [${c.name}] ${pages} pages, ${(html.length / 1024).toFixed(0)} kB`);
}

if (failures > 0) {
  console.error(`\n${failures} failure(s).`);
  process.exit(1);
}
console.log('\nAll cases passed. This proves the arithmetic, not the beauty (CLAUDE.md §6.4).');

// v1.0.0 — Repeatable Node harness for the report: nine awkward recordings,
//          structural assertions instead of eyeballs.
