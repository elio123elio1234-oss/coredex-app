/* ==================================================================
   useLimbRecorder — capture a fixed-length limb recording, then produce a
   filtered 6-lead report with automated measurements.

   FLOW:
     record raw Lead I + Lead II for N seconds
       → deriveLeads()        : I, II + III, aVR, aVL, aVF
       → reportFilterLeads()  : median baseline + notch + Savitzky-Golay
       → analyseLimbEcg()     : rate, rhythm, axis, intervals, amplitudes
       → 6 clean strips + a measurement sheet for the report

   Progress/phase are React state (they change ~1×/sec, not per sample).
   The raw samples are captured in a ref (per-sample, high rate).

   ── STARTING ──
   The recorder exposes `start()` but does not decide WHEN. The page arms
   it from the heartbeat gate (useHeartbeatGate), because during a limb
   recording the patient's hands are physically occupied holding the
   device and cannot press anything.
   ================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useBle } from '@/features/ble/useBle';
import { deriveLeads } from '@cyphix/shared';
import { reportFilterLeads } from '@cyphix/shared';
import { analyseLimbEcg } from '@cyphix/shared';
import { LIMB_LEAD_ORDER, type LimbLeadName } from '@cyphix/shared';
import { GUIDED_REC_SECS } from '@cyphix/shared';
import type { EcgAnalysis } from '@cyphix/shared';

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

  const rawRef = useRef<{ I: number[]; II: number[] }>({ I: [], II: [] });
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
      for (let i = pi; i < ni; i++) {
        rawRef.current.I.push(b.leadI[i % size]);
        rawRef.current.II.push(b.leadII[i % size]);
      }
      bleLastIdxRef.current = ni;
    });
  }, [subscribe, getBuffer]);

  const finish = useCallback(() => {
    const raw = rawRef.current;
    const n = Math.min(raw.I.length, raw.II.length);
    const fs = bleRef.current.SAMPLE_RATE;

    // Build the six derived limb leads sample by sample.
    const derived: Record<LimbLeadName, Float32Array> = {
      I: new Float32Array(n),
      II: new Float32Array(n),
      III: new Float32Array(n),
      aVR: new Float32Array(n),
      aVL: new Float32Array(n),
      aVF: new Float32Array(n),
    };
    for (let i = 0; i < n; i++) {
      const s = deriveLeads(raw.I[i], raw.II[i]);
      LIMB_LEAD_ORDER.forEach((l) => {
        derived[l][i] = s[l];
      });
    }

    const filtered = reportFilterLeads(derived, fs, 'II') as Record<LimbLeadName, Float32Array>;

    // Measure the FILTERED trace — the same waveform the report prints and
    // a clinician reads. Measuring the raw signal instead would produce
    // numbers that cannot be checked against the printed strips.
    const analysis = analyseLimbEcg(filtered, fs);

    setReport({
      filtered,
      rawLeadI: Float32Array.from(raw.I.slice(0, n)),
      rawLeadII: Float32Array.from(raw.II.slice(0, n)),
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
    rawRef.current = { I: [], II: [] };
    bleLastIdxRef.current = bleRef.current.getBuffer()?.writeIdx ?? 0;
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

// v2.1.0 — Also returns the raw measured channels so Scan History can persist them unfiltered.
