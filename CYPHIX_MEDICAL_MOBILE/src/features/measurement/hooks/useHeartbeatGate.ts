/* ==================================================================
   useHeartbeatGate — "is a real heartbeat present, right now?"

   ══ WHY THIS EXISTS ══
   The patient's hands are BUSY during a limb recording: the watch is on
   one wrist, the other hand touches the crown, a leg completes the
   circuit. Asking them to press "Start" at that exact moment is absurd —
   they physically cannot. So the recording must arm itself the instant
   the hardware proves it is seeing a heart.

   ══ WHAT COUNTS AS PROOF ══
   Not "the signal is non-zero". We reuse the FROZEN Pan-Tompkins
   validator (services/ecg/qrsValidator.ts) — the same gate the clinical
   pipeline already trusts. It requires several R-peaks whose RR intervals
   are ALL physiologically plausible (300–1500 ms ⇒ 40–200 BPM) and whose
   rhythm regularity (SQI) exceeds 40. Noise, a loose electrode, a flat
   line, or a hand brushing the sensor cannot satisfy that.

   ══ SIGNAL PATH — BEAT DETECTION RUNS ON THE CLEAN TRACE ══
     BLE ring buffer (raw Lead II, mV)
       → filterSample()   : the SAME display chain SixLeadMonitor draws
       → feedValidator()  : Pan-Tompkins → {ready, hr, sqi, peaksFound}

   Detection deliberately runs on the filtered signal, not on raw. Two
   reasons: it is what the reference monitor does, and it means the gate
   and the patient are looking at the same thing — we can never claim
   "no heartbeat" over a trace that visibly has one, or vice versa. The
   live BPM shown during measurement comes from this same validator.

   Filtering costs nothing diagnostically here: the gate only decides
   WHEN to start recording. The recording itself is raw.

   Per-sample work stays in refs (320 Hz through React state would melt
   the UI); the verdict is published to state at ~10 Hz, which is all a
   progress readout needs.
   ================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useBle } from '@/features/ble/useBle';
import { createDisplayFilter, filterSample } from '@cyphix/shared';
import { createSignalValidator, feedValidator } from '@cyphix/shared';
import type { ValidatorResult } from '@cyphix/shared';

/** How often the verdict is published to React (ms). */
const PUBLISH_MS = 100;

/**
 * How long a failed search is shown before it starts over.
 *
 * ⚠️ THIS IS A SAFETY REQUIREMENT, NOT POLISH. The validator gives up after
 * 20 s and reports `failed`. On a screen where the capture arms itself and
 * the patient's hands are holding the device, a terminal failure state
 * would strand them: they cannot reach a "try again" button without
 * breaking the very contact the measurement needs. So the search restarts
 * by itself, indefinitely, while the failure reason stays on screen long
 * enough to read and act on.
 */
const RETRY_AFTER_FAIL_MS = 2500;

/**
 * Sample-to-sample change (mV) below which the line is considered flat.
 * Matches the frozen validator's own lead-off criterion (0.5 µV) so both
 * agree on what "no signal" means.
 */
const FLAT_DELTA_MV = 0.0005;

/**
 * Consecutive flat samples before we call the line dead (2 s at 320 Hz).
 *
 * Comfortably longer than any gap WITHIN a real recording: even at 30 BPM
 * the quiet stretch between complexes is ~1.6 s, and a real electrode
 * always carries some noise, so this only trips on a genuinely dead line.
 */
const FLAT_SAMPLES_FOR_DEAD = 320 * 2;

/**
 * How long the signal may stream continuously with ZERO confirmed beats
 * before we tear the validator down and recalibrate (6 s at 320 Hz).
 *
 * ⚠️ THE BUG THIS FIXES — real hardware only, invisible in the simulator.
 * When the patient first presses the electrodes on, the trace spends a few
 * seconds as a large motion / filter-settling transient before it calms into
 * a clean ECG. The Pan-Tompkins adaptive threshold does its learning in the
 * first ~3 s (settle 1.2 s + learn 2 s), so it calibrates its signal level to
 * THAT transient and locks high. Once the trace is a normal-amplitude wave,
 * no QRS can clear the inflated threshold — and the validator's level only
 * moves on a *detected* beat, so with zero detections the threshold never
 * comes back down. It detects nothing, forever, on that validator instance.
 * The simulator streams clean beats from the first sample with no onset
 * transient, which is exactly why the bug never showed there.
 *
 * The validator's own 20 s timeout + auto-retry would eventually recover, but
 * ~22 s of "looking for your heartbeat" over a visibly perfect trace is not
 * acceptable. A settled, REAL heartbeat yields its first confirmed R-peak
 * within ~4.7 s even at the 40 BPM floor (settle 1.2 + learn 2 + one 1.5 s
 * RR). So 6 s of continuous live signal without a SINGLE beat is proof the
 * threshold locked onto a transient — rebuild and recalibrate on the trace
 * as it looks NOW. The filter is deliberately kept (see below).
 */
const RECALIBRATE_AFTER_SAMPLES = 320 * 6;

/** Beats the UI shows as "found" before the validator's own gate opens. */
export interface HeartbeatGate {
  /** True only when the validator is fully satisfied — safe to record. */
  ready: boolean;
  /** Confirmed R-peaks so far (drives the "we can feel it" readout). */
  peaksFound: number;
  status: ValidatorResult['status'];
  failReason?: ValidatorResult['failReason'];
  /** Live heart rate from the RR intervals (0 until two beats are seen). */
  hr: number;
  /** Rhythm regularity 0–100. */
  sqi: number;
  /** Restart the search from scratch (new attempt, new calibration). */
  reset: () => void;
}

export function useHeartbeatGate(enabled: boolean = true): HeartbeatGate {
  const ble = useBle();
  const { subscribe, getBuffer, SAMPLE_RATE } = ble;

  const [result, setResult] = useState<ValidatorResult>({
    ready: false,
    peaksFound: 0,
    status: 'settling',
    hr: 0,
    sqi: 0,
  });

  // Per-sample state — refs only, never React state.
  const validatorRef = useRef(createSignalValidator(SAMPLE_RATE));
  const filterRef = useRef(createDisplayFilter());
  const lastBleIdxRef = useRef(0);
  const latestRef = useRef<ValidatorResult>(result);

  /* ---- Signal-presence tracking (drives calibration restart) ----
     Starts "dead" so the first real sample always begins a fresh
     calibration, whether the screen opened before or after the signal. */
  const flatRunRef = useRef(0);
  const lastRawRef = useRef(0);
  const signalDeadRef = useRef(true);
  /* Consecutive live samples since the current validator was built — drives
     the recalibration watchdog that breaks a threshold locked on a transient. */
  const aliveRunRef = useRef(0);

  // Bumping this re-runs the subscription effect, which is what actually
  // rebuilds the validator — so "reset" means one thing in one place.
  const [generation, setGeneration] = useState(0);

  const reset = useCallback(() => {
    latestRef.current = { ready: false, peaksFound: 0, status: 'settling', hr: 0, sqi: 0 };
    setResult(latestRef.current);
    setGeneration((g) => g + 1);
  }, []);

  /* ---- Feed every arriving sample through the frozen validator ---- */
  useEffect(() => {
    if (!enabled) return;

    // A fresh attempt starts a fresh calibration: the validator's settle
    // window and adaptive thresholds are only valid for one continuous run.
    validatorRef.current = createSignalValidator(SAMPLE_RATE);
    filterRef.current = createDisplayFilter();
    lastBleIdxRef.current = getBuffer()?.writeIdx ?? 0;
    flatRunRef.current = 0;
    signalDeadRef.current = true;
    aliveRunRef.current = 0;

    return subscribe(() => {
      const b = getBuffer();
      if (!b) return;
      const ni = b.writeIdx;
      const pi = lastBleIdxRef.current;
      if (ni <= pi) return;

      const size = b.leadII.length;
      for (let i = pi; i < ni; i++) {
        const rawII = b.leadII[i % size];

        /* ── Is there a signal at all? ──
           ⚠️ THIS IS WHY THE GATE USED TO TAKE ~30 s. The validator's 20 s
           calibration timeout runs on WALL CLOCK from the moment it is
           built. Built when the screen opened, it burned the entire window
           against a dead line, reported `failed`, and only the auto-retry
           afterwards got a fresh one — by which time ~27 s had passed and
           the patient had been staring at "looking for your heartbeat".
           Calibration must begin when the SIGNAL begins, not when the
           screen does. */
        const delta = Math.abs(rawII - lastRawRef.current);
        lastRawRef.current = rawII;
        if (delta < FLAT_DELTA_MV) flatRunRef.current++;
        else flatRunRef.current = 0;

        const alive = flatRunRef.current < FLAT_SAMPLES_FOR_DEAD;
        if (alive && signalDeadRef.current) {
          // The line just came back. Restart calibration from this instant:
          // fresh settle window, fresh adaptive thresholds, fresh timeout.
          // The filter is rebuilt too — it would otherwise ring for seconds
          // on the step from a flat line into a live one.
          validatorRef.current = createSignalValidator(SAMPLE_RATE);
          filterRef.current = createDisplayFilter();
          signalDeadRef.current = false;
          aliveRunRef.current = 0;
        } else if (!alive) {
          signalDeadRef.current = true;
          aliveRunRef.current = 0;
        }

        /* ── Recalibration watchdog ──
           The signal is live and staying live, yet the validator has found
           not one beat in RECALIBRATE_AFTER_SAMPLES. That only happens when
           the adaptive threshold calibrated on the electrode-onset transient
           and locked too high to ever clear (see the constant's note). Give
           it a FRESH validator so it relearns its levels on the trace as it
           looks now — clean.

           Only the validator is rebuilt, NOT the filter: unlike the dead→live
           step above, the filter is already settled on a live trace, and
           zeroing it here would inject the very transient we are recovering
           from. Once one beat is found (peaksFound > 0) this never fires, so a
           slow-but-real calibration is left alone; the 20 s validator timeout
           remains the backstop for the rarer "some beats, then stuck" case. */
        if (
          !signalDeadRef.current &&
          ++aliveRunRef.current >= RECALIBRATE_AFTER_SAMPLES &&
          latestRef.current.peaksFound === 0
        ) {
          validatorRef.current = createSignalValidator(SAMPLE_RATE);
          aliveRunRef.current = 0;
        }

        const filtered = filterSample(filterRef.current, rawII);
        latestRef.current = feedValidator(validatorRef.current, filtered, SAMPLE_RATE);
      }
      lastBleIdxRef.current = ni;
    });
  }, [enabled, subscribe, getBuffer, SAMPLE_RATE, generation]);

  /* ---- Publish the verdict at a rate React can live with ---- */
  useEffect(() => {
    if (!enabled) return;
    const iv = setInterval(() => setResult(latestRef.current), PUBLISH_MS);
    return () => clearInterval(iv);
  }, [enabled]);

  /* ---- Never leave the patient stranded on a failed search ---- */
  useEffect(() => {
    if (!enabled || result.status !== 'failed') return;
    const timer = setTimeout(reset, RETRY_AFTER_FAIL_MS);
    return () => clearTimeout(timer);
  }, [enabled, result.status, reset]);

  return {
    ready: result.ready,
    peaksFound: result.peaksFound,
    status: result.status,
    failReason: result.failReason,
    hr: result.hr,
    sqi: result.sqi,
    reset,
  };
}

// v1.2.0 — Calibration now restarts at SIGNAL onset, not screen open (killed the ~30 s dead-line delay).
// v1.3.0 — Recalibration watchdog: rebuild the validator (not the filter) after 6 s of live signal with zero beats, so a threshold that locked on the electrode-onset transient recovers in ~6 s instead of ~22 s. Fixes real-hardware "no heartbeat detected over a clean trace".
