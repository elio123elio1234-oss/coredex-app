/* ==================================================================
   ecgExport — take a recording out of the system as data.

   ★ SHARED, AND ONLY THE PURE HALF. The web's copy of this module also
   holds `downloadText` / `downloadBytes`, which build a Blob and click an
   `<a download>`. That is DOM, and DOM is banned here (root CLAUDE.md
   §2.1) — a phone has no download folder to click into; it has a share
   sheet. So the BUILDERS live here, identical for every platform, and each
   app supplies its own six-line delivery adapter:

     web    → Blob + object URL + <a download>
     mobile → expo-file-system write + expo-sharing share sheet

   ══ WHAT IS EXPORTED ══
   The RAW measured channels, plus the four derived leads computed from
   them. Raw, not filtered: an export exists so the recording can be
   re-analysed by something else, and handing another tool our filtered
   opinion of the signal would poison exactly that use. The header states
   the units, sample rate and provenance so the file is self-describing
   when it turns up on someone's disk a year from now.

   ⚠️ A simulated recording is watermarked in the header AND the filename.
   Synthetic data escaping into an analysis set as if it were a patient's
   is the single worst outcome this module could enable.
   ================================================================== */

import { decodeChannel } from './recordingCodec';
import { deriveLeads } from './ecgDSP';
import { LIMB_LEAD_ORDER } from '../types/ecg';
import type { StoredRecording } from '../types/recording';

/** Build the CSV text for a recording. Pure — no IO, so it is testable. */
export function buildRecordingCsv(recording: StoredRecording): string {
  const rawI = decodeChannel(recording.channels.leadI);
  const rawII = decodeChannel(recording.channels.leadII);
  const n = Math.min(rawI.length, rawII.length);
  const fs = recording.sampleRate;

  const lines: string[] = [
    '# CYPHIX ECG export',
    `# recording_id: ${recording.id}`,
    `# recorded_at: ${recording.recordedAt}`,
    `# sample_rate_hz: ${fs}`,
    `# duration_s: ${(n / fs).toFixed(3)}`,
    `# lead_set: ${recording.type}`,
    '# units: millivolts (mV)',
    '# signal: RAW measured channels (Lead I, Lead II); derived leads are exact algebra',
    '# derivation: III=II-I  aVR=-(I+II)/2  aVL=I-II/2  aVF=II-I/2',
    recording.isSimulated
      ? '# ⚠️ SOURCE: SIMULATOR — SYNTHETIC SIGNAL, NOT A PATIENT RECORDING'
      : '# source: device',
    ['time_s', ...LIMB_LEAD_ORDER].join(','),
  ];

  for (let i = 0; i < n; i++) {
    const s = deriveLeads(rawI[i], rawII[i]);
    lines.push(
      [(i / fs).toFixed(5), ...LIMB_LEAD_ORDER.map((lead) => s[lead].toFixed(5))].join(','),
    );
  }

  return lines.join('\n');
}

/** Filename that says what the file is without opening it. */
export function recordingFilename(recording: StoredRecording, extension: string): string {
  const stamp = recording.recordedAt.replace(/[:.]/g, '-');
  const sim = recording.isSimulated ? 'SIMULATED-' : '';
  return `${sim}cyphix-ecg-${stamp}.${extension}`;
}

/* ==================================================================
   EDF+ — the format sleep labs, Holter systems and research toolboxes
   (EDFbrowser, MNE, pyEDFlib, WFDB) all read without conversion.

   Structure: an ASCII header of fixed-width fields, then a per-signal
   header block, then data records of int16 samples. Every field is
   SPACE-PADDED to an exact width — readers index by byte offset, so a
   field one character short silently shifts everything after it.

   Physical→digital mapping: each channel declares its physical range in
   mV against a fixed digital range of ±32767, and the reader rescales.
   The physical maximum is derived PER RECORDING from the actual data
   rather than assumed, so a low-voltage trace uses the full int16
   resolution instead of being squeezed into a fraction of it.
   ================================================================== */

const EDF_DIGITAL_MAX = 32767;
const EDF_DIGITAL_MIN = -32768;
/** One data record per second — the conventional choice, and it makes the
    record count equal the duration in seconds. */
const EDF_RECORD_SEC = 1;

/** Pad/truncate to an exact field width. EDF is byte-addressed. */
function edfField(value: string, width: number): string {
  return value.length > width ? value.slice(0, width) : value.padEnd(width, ' ');
}

function edfDate(d: Date): { date: string; time: string } {
  const p = (n: number) => String(n).padStart(2, '0');
  return {
    date: `${p(d.getDate())}.${p(d.getMonth() + 1)}.${p(d.getFullYear() % 100)}`,
    time: `${p(d.getHours())}.${p(d.getMinutes())}.${p(d.getSeconds())}`,
  };
}

/**
 * Build an EDF+ file for a recording. Returns bytes, not text — EDF is a
 * binary format and must never be routed through a string encoder.
 */
export function buildRecordingEdf(recording: StoredRecording): Uint8Array {
  const rawI = decodeChannel(recording.channels.leadI);
  const rawII = decodeChannel(recording.channels.leadII);
  const fs = Math.round(recording.sampleRate);
  const n = Math.min(rawI.length, rawII.length);

  const records = Math.max(1, Math.floor(n / fs / EDF_RECORD_SEC));
  const samplesPerRecord = fs * EDF_RECORD_SEC;
  const usable = records * samplesPerRecord;

  // All six leads, derived once so the file is directly usable.
  const channels = LIMB_LEAD_ORDER.map((lead) => {
    const data = new Float32Array(usable);
    for (let i = 0; i < usable; i++) data[i] = deriveLeads(rawI[i], rawII[i])[lead];
    return { lead, data };
  });

  // Symmetric physical range per channel, from the data itself.
  const ranges = channels.map(({ data }) => {
    let peak = 0;
    for (let i = 0; i < data.length; i++) peak = Math.max(peak, Math.abs(data[i]));
    // Never zero: a flat channel would give a divide-by-zero scale factor.
    return Math.max(peak, 0.001);
  });

  const ns = channels.length;
  const { date, time } = edfDate(new Date(recording.recordedAt));

  /* ---- Fixed 256-byte main header ---- */
  let header = '';
  header += edfField('0', 8); // version
  header += edfField(
    // EDF+ patient id: code sex birthdate name, spaces are separators.
    `${recording.subject.replace(/[/\s]/g, '-')} X X CYPHIX-SUBJECT`,
    80,
  );
  header += edfField(
    `Startdate ${date} CYPHIX ECG ${recording.isSimulated ? 'SIMULATED-NOT-A-PATIENT' : 'device'}`,
    80,
  );
  header += edfField(date, 8);
  header += edfField(time, 8);
  header += edfField(String(256 + ns * 256), 8); // header bytes
  header += edfField('EDF+C', 44); // continuous recording
  header += edfField(String(records), 8);
  header += edfField(String(EDF_RECORD_SEC), 8);
  header += edfField(String(ns), 4);

  /* ---- Per-signal header: each field repeats for ALL signals ---- */
  header += channels.map((c) => edfField(c.lead, 16)).join(''); // labels
  header += channels.map(() => edfField('CYPHIX ADS1293', 80)).join(''); // transducer
  header += channels.map(() => edfField('mV', 8)).join(''); // physical dimension
  header += ranges.map((r) => edfField((-r).toFixed(4), 8)).join(''); // physical min
  header += ranges.map((r) => edfField(r.toFixed(4), 8)).join(''); // physical max
  header += channels.map(() => edfField(String(EDF_DIGITAL_MIN), 8)).join('');
  header += channels.map(() => edfField(String(EDF_DIGITAL_MAX), 8)).join('');
  header += channels.map(() => edfField('HP:0.05Hz LP:100Hz N:50Hz', 80)).join('');
  header += channels.map(() => edfField(String(samplesPerRecord), 8)).join('');
  header += channels.map(() => edfField('', 32)).join(''); // reserved

  const headerBytes = new Uint8Array(header.length);
  for (let i = 0; i < header.length; i++) headerBytes[i] = header.charCodeAt(i) & 0xff;

  /* ---- Data records: int16 little-endian, signal by signal ---- */
  const dataBytes = new Uint8Array(records * ns * samplesPerRecord * 2);
  const dv = new DataView(dataBytes.buffer);
  let offset = 0;
  for (let r = 0; r < records; r++) {
    for (let c = 0; c < ns; c++) {
      const { data } = channels[c];
      const scale = EDF_DIGITAL_MAX / ranges[c];
      for (let s = 0; s < samplesPerRecord; s++) {
        const v = data[r * samplesPerRecord + s] * scale;
        const clamped = Math.max(EDF_DIGITAL_MIN, Math.min(EDF_DIGITAL_MAX, Math.round(v)));
        dv.setInt16(offset, clamped, true);
        offset += 2;
      }
    }
  }

  const out = new Uint8Array(headerBytes.length + dataBytes.length);
  out.set(headerBytes, 0);
  out.set(dataBytes, headerBytes.length);
  return out;
}

/**
 * Base64 of arbitrary bytes — the only shape a binary payload can take on
 * its way to a file on a phone (`expo-file-system` writes strings, and an
 * EDF routed through a UTF-8 text encoder is silently corrupted: every byte
 * above 0x7F becomes two).
 *
 * Deliberately here rather than in `recordingCodec`, which is about
 * waveform CHANNELS specifically.
 */
export function bytesToBase64(bytes: Uint8Array): string {
  const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let out = '';
  let i = 0;
  for (; i + 2 < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + B64[(n >> 6) & 63] + B64[n & 63];
  }
  const rest = bytes.length - i;
  if (rest === 1) {
    const n = bytes[i] << 16;
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + '==';
  } else if (rest === 2) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8);
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + B64[(n >> 6) & 63] + '=';
  }
  return out;
}

// v1.0.0 — Shared CSV + EDF+ builders (the pure half of the web's ecgExport);
//          delivery stays per-platform. Adds bytesToBase64 for binary IO.
