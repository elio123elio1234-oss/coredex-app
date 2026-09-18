/* ==================================================================
   useLimbRecorder — capture a fixed-length limb recording, then produce a
   filtered 6-lead report with automated measurements.

   FLOW:
     record raw Lead I + Lead II (+ Lead II-b, when the device sends it)
       → limbLeadsFromRaw()   : fuse the two Lead II copies if there are
                                two, then deriveLeads(): I, II + III, aVR,
                                aVL, aVF
       → reportFilterLeads()  : median baseline + notch + Savitzky-Golay
       → analyseLimbEcg()     : rate, rhythm, axis, intervals, amplitudes
       → 6 clean strips + a measurement sheet for the report

   Progress/phase are React state (they change ~1×/sec, not per sample).
   The raw samples are captured in a ref (per-sample, high rate).

   ── THE SECOND LEAD II COPY (firmware v3+) ──
   A dual-Lead-II device streams Lead II twice; the second copy is never
   drawn live, only captured here. It is kept for a recording ONLY if the
   buffer carried it from the first captured sample through the last. If
   it appears or disappears part-way, the third channel is dropped for that
   recording: a copy shorter than the others cannot be aligned with them
   after the fact, and a recording with two channels is a complete, normal
   recording. The fuse-or-not decision itself is not made here — it is
   `limbLeadsFromRaw`'s, the same function every reader of the stored
   record uses, so this report and the History view of it agree.

   ── STARTING ──
   The recorder exposes `start()` but does not decide WHEN. The page arms
   it from the heartbeat gate (useHeartbeatGate), because during a limb
   recording the patient's hands are physically occupied holding the
   device and cannot press anything.
   ================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useBle } from '@/features/ble/useBle';
import { limbLeadsFromRaw } from '@cyphix/shared';
import { reportFilterLeads } from '@cyphix/shared';
import { analyseLimbEcg } from '@cyphix/shared';
import type { LimbLeadName } from '@cyphix/shared';
import { GUIDED_REC_SECS } from '@cyphix/shared';
import type { EcgAnalysis, LeadFusionInfo } from '@cyphix/shared';

export type LimbRecorderPhase = 'idle' | 'recording' | 'done';

export interface LimbReport {
  filtered: Record<LimbLeadName, Float32Array>;
  /**
   * The RAW measured channels, kept alongside the filtered report.
   *
   * Scan History persists these, not the filtered leads, so a reviewer can
   * later switch the DSP stages off and see what the electrodes actually
   * produced. Filtering is a reading decision; it must not be baked into
   * the stored record. See types/recording.ts.
   */
  rawLeadI: Float32Array;
  rawLeadII: Float32Array;
  /** The second measured copy of Lead II — present only when the device
      streamed one for the WHOLE capture. Same length as the other two. */
  rawLeadIIb?: Float32Array;
  /** What the fusion did to this report's Lead II. null = not attempted
      (one copy); `mode: 'single'` = attempted and declined, with the reason. */
  fusion: LeadFusionInfo | null;
  heartRate: number;
  analysis: EcgAnalysis;
  sampleRate: number;
  recordedAt: Date;
  isSimulated: boolean;
}

export interface UseLimbRecorderOptions {
  durationSec?: number;
  /**
   * Live heart rate to stamp on the report. Prefer the Pan-Tompkins gate's
   * value over the BLE client's simple threshold detector: the gate rejects
   * physiologically impossible intervals, the threshold detector does not.
   */
  liveHeartRate?: number;
}

export function useLimbRecorder({
  durationSec = GUIDED_REC_SECS,
  liveHeartRate,
}: UseLimbRecorderOptions = {}) {
  const ble = useBle();
  const [phase, setPhase] = useState<LimbRecorderPhase>('idle');
  const [progress, setProgress] = useState(0);
  const [report, setReport] = useState<LimbReport | null>(null);

  /* `IIb: null` = this capture has no usable second copy — never had one, or
     lost it part-way. It is sticky until the next start(). */
  const rawRef = useRef<{ I: number[]; II: number[]; IIb: number[] | null }>({
    I: [],
    II: [],
    IIb: null,
  });
  const recordingRef = useRef(false);
  const bleLastIdxRef = useRef(0);
  const startAtRef = useRef(0);
  const hrRef = useRef(0);

  // Live values read inside the tick without making it a dependency.
  const liveHrRef = useRef(liveHeartRate);
  liveHrRef.current = liveHeartRate;
  const bleRef = useRef(ble);
  bleRef.current = ble;

  // Capture raw samples while recording. Depend on the STABLE subscribe/
  // getBuffer, not the whole `ble` object (which changes every render and
  // would tear down the subscription constantly).
  const { subscribe, getBuffer } = ble;
  useEffect(() => {
    return subscribe(() => {
      if (!recordingRef.current) return;
      const b = getBuffer();
      if (!b) return;
      const ni = b.writeIdx;
      const pi = bleLastIdxRef.current;
      if (ni <= pi) return;
      const size = b.leadI.length;
      const raw = rawRef.current;
      // The copy went away mid-capture (or was never there): two channels
      // from here on, and for good — see the header.
      if (raw.IIb && !b.leadIIb) raw.IIb = null;
      for (let i = pi; i < ni; i++) {
        raw.I.push(b.leadI[i % size]);
        raw.II.push(b.leadII[i % size]);
        if (raw.IIb && b.leadIIb) raw.IIb.push(b.leadIIb[i % size]);
      }
      bleLastIdxRef.current = ni;
    });
  }, [subscribe, getBuffer]);

  const finish = useCallback(() => {
    const raw = rawRef.current;
    const n = Math.min(raw.I.length, raw.II.length);
    const fs = bleRef.current.SAMPLE_RATE;

    const rawLeadI = Float32Array.from(raw.I.slice(0, n));
    const rawLeadII = Float32Array.from(raw.II.slice(0, n));
    // Never mismatched lengths: a copy that is not exactly as long as the
    // other two is not stored and not fused.
    const rawLeadIIb =
      raw.IIb && raw.IIb.length === raw.I.length && n > 0
        ? Float32Array.from(raw.IIb.slice(0, n))
        : undefined;

    // The six limb leads — Lead II fused from its two copies first, when
    // there are two. Nothing frozen changes: `deriveLeads` is called exactly
    // as before, inside `limbLeadsFromRaw`.
    const { leads: derived, fusion } = limbLeadsFromRaw(rawLeadI, rawLeadII, rawLeadIIb, fs);

    const filtered = reportFilterLeads(derived, fs, 'II') as Record<LimbLeadName, Float32Array>;

    // Measure the FILTERED trace — the same waveform the report prints and
    // a clinician reads. Measuring the raw signal instead would produce
    // numbers that cannot be checked against the printed strips.
    const analysis = analyseLimbEcg(filtered, fs);

    setReport({
      filtered,
      rawLeadI,
      rawLeadII,
      rawLeadIIb,
      fusion,
      // The analysis rate comes from the whole recording, so it beats the
      // live estimate; fall back only if too few beats were found.
      heartRate: analysis.rate.bpm ?? hrRef.current,
      analysis,
      sampleRate: fs,
      recordedAt: new Date(),
      isSimulated: bleRef.current.isSimulated,
    });
    setPhase('done');
  }, []);

  // Progress + completion timer.
  useEffect(() => {
    if (phase !== 'recording') return;
    const iv = setInterval(() => {
      /* ⚠️ The stream went silent mid-capture — phone locked, app
         backgrounded, device slipped off. DISCARD the partial rather than
         letting the timer run out and commit it (web CLAUDE.md §6.0.4:
         "device stops streaming → discard partial"). Ten seconds of wall
         clock is not ten seconds of ECG, and a strip padded with silence
         is a strip a clinician would read as asystole. Returning to `idle`
         lets the page re-arm on its own once samples come back. */
      if (bleRef.current.isStale) {
        recordingRef.current = false;
        rawRef.current = { I: [], II: [], IIb: null };
        clearInterval(iv);
        setProgress(0);
        setPhase('idle');
        return;
      }

      const elapsed = (Date.now() - startAtRef.current) / 1000;
      setProgress(Math.min(100, (elapsed / durationSec) * 100));
      hrRef.current = liveHrRef.current || bleRef.current.heartRate || hrRef.current;
      if (elapsed >= durationSec) {
        recordingRef.current = false;
        clearInterval(iv);
        finish();
      }
    }, 100);
    return () => clearInterval(iv);
  }, [phase, durationSec, finish]);

  const start = useCallback(() => {
    const buffer = bleRef.current.getBuffer();
    // The third channel is kept only if it is there from the FIRST sample.
    rawRef.current = { I: [], II: [], IIb: buffer?.leadIIb ? [] : null };
    bleLastIdxRef.current = buffer?.writeIdx ?? 0;
    hrRef.current = liveHrRef.current || bleRef.current.heartRate || 0;
    startAtRef.current = Date.now();
    recordingRef.current = true;
    setReport(null);
    setProgress(0);
    setPhase('recording');
  }, []);

  const reset = useCallback(() => {
    recordingRef.current = false;
    setReport(null);
    setProgress(0);
    setPhase('idle');
  }, []);

  return { phase, progress, report, start, reset };
}

// v2.3.0 — Dual Lead II: captures the second copy when the buffer carries it
//          for the whole recording (dropped otherwise — never mismatched
//          lengths), and derives through the shared `limbLeadsFromRaw`, which
//          fuses the copies before the frozen `deriveLeads`. `LimbReport`
//          gains `rawLeadIIb?` and `fusion`. Stale-discard guard unchanged.
// v2.2.0 — Discards an in-flight capture when the stream goes stale, instead
//          of running the timer out and committing padded silence.
