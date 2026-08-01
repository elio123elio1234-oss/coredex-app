/* ==================================================================
   Pan-Tompkins Lite QRS Detector — ported VERBATIM from BEATALIGN
   (extracted from my-ecg-app/src/components/SixLeadECGScreen.jsx).

   PURPOSE (the safety gate):
   Before we record and present anything as an ECG, we must PROVE the
   signal is a real heartbeat and not noise, a loose electrode, or a
   flat line. This validator watches filtered Lead II and only reports
   `ready: true` once it has seen several physiologically plausible,
   regular R-peaks. Recording must not start until then.

   PIPELINE (classic Pan-Tompkins):
     Bandpass (already applied by ecgDSP)
       → 5-point Derivative      (emphasise the steep QRS slope)
       → Squaring                (make everything positive, boost peaks)
       → Moving Window Integration (150 ms — measures QRS energy)
       → Adaptive Threshold      (self-tuning signal vs noise levels)
       → Refractory period       (200 ms — one beat can't repeat instantly)

   Reference: Pan & Tompkins, IEEE Trans. Biomed. Eng., 1985.
   ⚠️ FROZEN: constants (0.125/0.875 learning rates, 0.25 threshold
   factor, 300–1500 ms RR window, SQI > 40) are clinically tuned.
   ================================================================== */

import type { ValidatorResult } from '../types/ecg';

/** Let the IIR filters settle before trusting any sample. */
const CALIBRATION_SETTLE_MS = 1200;
/** Need this many consistent R-peaks before we call the signal valid. */
const CALIBRATION_MIN_PEAKS = 3;
/** Give up after this long and report a failure reason. */
const CALIBRATION_MAX_WAIT = 20000;

export interface QrsValidator {
  startTime: number;
  sampleCount: number;
  settled: boolean;

  /** 5-point derivative delay line: x[n-4]..x[n] */
  delayLine: Float32Array;
  dlIdx: number;

  /** Moving-window-integration ring buffer. */
  mwiBuffer: Float32Array;
  mwiIdx: number;
  mwiSum: number;
  MWI_LEN: number;

  /** Adaptive thresholds (Pan-Tompkins SPKI/NPKI). */
  signalLevel: number;
  noiseLevel: number;
  threshold1: number;
  threshold2: number;
  peakVal: number;
  peakIdx: number;

  /** QRS detection state. */
  REFRACTORY: number;
  inRefractory: boolean;
  refractoryEnd: number;
  risingEdge: boolean;
  lastQRSIdx: number;

  /** Confirmed beats. */
  rrIntervals: number[];
  peakTimes: number[];
  totalPeaks: number;

  /** Lead-off / signal quality. */
  flatCount: number;
  lastVal: number;
  hasSignal: boolean;
}

export function createSignalValidator(sampleRate: number): QrsValidator {
  const MWI_LEN = Math.round(sampleRate * 0.15); // 150 ms (~48 @ 320 Hz)
  const REFRACTORY = Math.round(sampleRate * 0.2); // 200 ms → max 300 BPM

  return {
    startTime: Date.now(),
    sampleCount: 0,
    settled: false,

    delayLine: new Float32Array(5),
    dlIdx: 0,

    mwiBuffer: new Float32Array(MWI_LEN),
    mwiIdx: 0,
    mwiSum: 0,
    MWI_LEN,

    signalLevel: 0,
    noiseLevel: 0,
    threshold1: 0,
    threshold2: 0,
    peakVal: 0,
    peakIdx: 0,

    REFRACTORY,
    inRefractory: false,
    refractoryEnd: 0,
    risingEdge: false,
    lastQRSIdx: -sampleRate,

    rrIntervals: [],
    peakTimes: [],
    totalPeaks: 0,

    flatCount: 0,
    lastVal: 0,
    hasSignal: false,
  };
}

/**
 * Feed ONE filtered Lead II sample. Call for every sample that arrives.
 * Returns the current verdict; recording should only begin when
 * `ready === true && status === 'valid'`.
 */
export function feedValidator(
  v: QrsValidator,
  filteredLeadII: number,
  sampleRate: number,
): ValidatorResult {
  v.sampleCount++;

  /* ═══ Phase 0: let the filters settle ═══ */
  if (!v.settled) {
    if (Date.now() - v.startTime > CALIBRATION_SETTLE_MS) {
      v.settled = true;
    }
    // Still prime the delay line so it's warm when we start.
    v.delayLine[v.dlIdx % 5] = filteredLeadII;
    v.dlIdx++;
    v.lastVal = filteredLeadII;
    return { ready: false, peaksFound: 0, status: 'settling', hr: 0, sqi: 0 };
  }

  const x = filteredLeadII;

  /* ═══ Phase 1: lead-off / flat-line detection ═══ */
  const diff = Math.abs(x - v.lastVal);
  v.lastVal = x;
  if (diff < 0.0005) {
    // < 0.5 µV change → electrode probably not on skin
    v.flatCount++;
  } else {
    v.flatCount = 0;
    v.hasSignal = true;
  }
  const isFlat = v.flatCount > sampleRate * 2; // flat for 2 s → lead-off

  /* ═══ Phase 2: 5-point derivative ═══ */
  v.delayLine[v.dlIdx % 5] = x;
  v.dlIdx++;
  const dl = v.delayLine;
  const n = v.dlIdx;
  const derivative =
    (-dl[(n - 4 + 500) % 5] -
      2 * dl[(n - 3 + 500) % 5] +
      2 * dl[(n - 1 + 500) % 5] +
      dl[n % 5]) /
    8.0;

  /* ═══ Phase 3: squaring ═══ */
  const squared = derivative * derivative;

  /* ═══ Phase 4: moving window integration ═══ */
  const oldVal = v.mwiBuffer[v.mwiIdx % v.MWI_LEN];
  v.mwiBuffer[v.mwiIdx % v.MWI_LEN] = squared;
  v.mwiIdx++;
  v.mwiSum += squared - oldVal;
  const mwi = Math.max(0, v.mwiSum / v.MWI_LEN);

  /* ═══ Phase 5: adaptive thresholding ═══ */
  const learningPhase = v.sampleCount < sampleRate * 2;

  if (learningPhase) {
    // First 2 s: just learn how big a QRS looks on this body/electrode.
    if (mwi > v.signalLevel) v.signalLevel = mwi;
    v.threshold1 = v.signalLevel * 0.25;
    v.threshold2 = v.threshold1 * 0.5;
    return { ready: false, peaksFound: 0, status: 'searching', hr: 0, sqi: 0 };
  }

  let qrsDetected = false;

  if (v.inRefractory) {
    if (v.sampleCount >= v.refractoryEnd) {
      v.inRefractory = false;
    }
    // Keep tracking the peak even inside refractory (for level updates).
    if (mwi > v.peakVal) {
      v.peakVal = mwi;
      v.peakIdx = v.sampleCount;
    }
  }

  if (!v.inRefractory) {
    // Rising edge → candidate QRS
    if (mwi > v.threshold1) {
      if (!v.risingEdge) {
        v.risingEdge = true;
        v.peakVal = mwi;
        v.peakIdx = v.sampleCount;
      } else if (mwi > v.peakVal) {
        v.peakVal = mwi;
        v.peakIdx = v.sampleCount;
      }
    }
    // Falling edge → confirm the QRS
    else if (v.risingEdge && mwi < v.threshold1 * 0.5) {
      v.risingEdge = false;

      /* ⚠️ MEASURE PEAK-TO-PEAK, NOT FALLING-EDGE-TO-PEAK.
         This used to read `v.sampleCount - v.lastQRSIdx` — the CURRENT
         sample (the falling edge) minus the PREVIOUS beat's peak index,
         because line 228 below stores `v.peakIdx`. The two ends of the
         interval were therefore measured at different points in the beat.

         The falling edge trails the peak by however long the 150 ms
         integration window takes to decay past half threshold — roughly
         60 ms — so EVERY R-R came out ~60 ms too long, and the reported
         heart rate was biased low by an amount that grows with rate:
           68 → 63 (−5)   100 → 92 (−8)   150 → 132 (−18)
         Measured on synthetic beats at exact known rates, identical with
         and without noise, which is what identified it as arithmetic
         rather than missed detections. */
      const sinceLast = v.peakIdx - v.lastQRSIdx;
      if (sinceLast > v.REFRACTORY) {
        qrsDetected = true;
        v.totalPeaks++;

        if (v.lastQRSIdx > 0) {
          const rrMs = (sinceLast / sampleRate) * 1000;
          v.rrIntervals.push(rrMs);
          if (v.rrIntervals.length > 8) v.rrIntervals.shift();
        }
        v.peakTimes.push(Date.now());
        if (v.peakTimes.length > 10) v.peakTimes.shift();

        v.lastQRSIdx = v.peakIdx;

        // SPKI = 0.125 · PEAKI + 0.875 · SPKI
        v.signalLevel = 0.125 * v.peakVal + 0.875 * v.signalLevel;
      }

      v.inRefractory = true;
      v.refractoryEnd = v.sampleCount + v.REFRACTORY;
      v.peakVal = 0;
    }
  }

  // NPKI = 0.125 · PEAKI + 0.875 · NPKI
  if (!qrsDetected && !v.risingEdge && v.peakVal > 0 && mwi < v.threshold2) {
    v.noiseLevel = 0.125 * v.peakVal + 0.875 * v.noiseLevel;
  }

  // TH1 = NPKI + 0.25 · (SPKI − NPKI)
  v.threshold1 = v.noiseLevel + 0.25 * (v.signalLevel - v.noiseLevel);
  v.threshold2 = v.threshold1 * 0.5;
  if (v.threshold1 < 1e-10) v.threshold1 = 1e-10;

  /* ═══ Phase 6: validate consistency ═══ */
  const peaks = v.peakTimes;
  const rr = v.rrIntervals;

  let hr = 0;
  let sqi = 0;
  if (rr.length >= 2) {
    const avgRR = rr.reduce((a, b) => a + b, 0) / rr.length;
    hr = Math.round(60000 / avgRR);
    // SQI = how regular the rhythm is (low RR variation → high score).
    const variance = rr.reduce((s, val) => s + (val - avgRR) ** 2, 0) / rr.length;
    const cv = Math.sqrt(variance) / avgRR;
    sqi = Math.max(0, Math.min(100, Math.round((1 - cv) * 100)));
  }

  if (peaks.length >= CALIBRATION_MIN_PEAKS && rr.length >= CALIBRATION_MIN_PEAKS - 1) {
    // Every RR interval must be physiologically valid (40–200 BPM).
    let allValid = true;
    for (const interval of rr) {
      if (interval < 300 || interval > 1500) {
        allValid = false;
        break;
      }
    }
    if (allValid && sqi > 40) {
      return { ready: true, peaksFound: peaks.length, status: 'valid', hr, sqi };
    }
  }

  /* ═══ Timeout → fail with a reason the UI can explain ═══ */
  if (Date.now() - v.startTime > CALIBRATION_MAX_WAIT) {
    let failReason: ValidatorResult['failReason'] = 'timeout';
    if (isFlat) failReason = 'lead_off';
    else if (!v.hasSignal) failReason = 'no_signal';
    else if (peaks.length < CALIBRATION_MIN_PEAKS) failReason = 'few_peaks';
    else failReason = 'irregular';
    return { ready: false, peaksFound: peaks.length, status: 'failed', hr, sqi, failReason };
  }

  /* ═══ In-progress status ═══ */
  let status: ValidatorResult['status'] = 'searching';
  if (isFlat) status = 'lead_off';
  else if (peaks.length > 0) status = 'detecting';

  return { ready: false, peaksFound: peaks.length, status, hr, sqi };
}

// v1.2.0 — R-R now measured peak-to-peak, not falling-edge-to-peak; removes a ~60 ms bias that made every reported heart rate read low (−5 at 68 BPM, −18 at 150).
