/* ==================================================================
   bleClient — the app-facing ECG source (service layer, no React).
   Mirrors the web BluetoothClient's contract so the measurement hooks
   are portable: same ring buffer, same subscribe/getBuffer, same
   simulator semantics.

   Two backends behind ONE interface:
     • CyphixBleNative — the Swift/Kotlin bridge (dev builds, production)
     • EcgSimulator    — the SHARED synthetic source from @cyphix/shared,
                         the identical waveform generator the web uses, so
                         a demo recording looks the same on every platform

   ⚠️ A simulated signal is NOT a patient signal. `isSimulated()` must be
   surfaced by every screen that shows it (web CLAUDE.md §6).
   ================================================================== */

import { AppState, PermissionsAndroid, Platform, type AppStateStatus } from 'react-native';
import type { BleStatus, EcgBufferView } from '@cyphix/shared';
import { BUFFER_SIZE, EcgSimulator, SAMPLE_RATE, STREAM_STALE_MS } from '@cyphix/shared';
import { CyphixBleNative, type EcgBatchEvent } from '../../../modules/cyphix-ble';

export type BleDataListener = (buffer: EcgBufferView) => void;

export interface BleClientCallbacks {
  onStatusChange?: (status: BleStatus, detail?: string) => void;
  onDeviceNameChange?: (name: string) => void;
  onHeartRate?: (bpm: number) => void;
  onSignalRail?: (railed: { I: boolean; II: boolean }) => void;
  /**
   * Samples stopped arriving (or started again). The link may still be
   * "connected" — this says nothing is coming through it, which is the only
   * honest thing to tell a screen that is drawing a waveform.
   */
  onStaleChange?: (stale: boolean) => void;
}

/** Simulator batch cadence — matches the native bridge's 10 Hz flush. */
const SIM_TICK_MS = 100;

/* Live R-peak detection for the status line only. The clinical gate is the
   frozen Pan-Tompkins validator in @cyphix/shared, never this. */
const HR_THRESHOLD_MV = 0.5;

export class BleClient {
  private readonly cb: BleClientCallbacks;
  private subs = new Set<BleDataListener>();
  private nativeSubs: { remove(): void }[] = [];

  private simulator: EcgSimulator | null = null;
  private simTimer: ReturnType<typeof setInterval> | null = null;
  private simulated = false;

  private readonly data: EcgBufferView = {
    leadI: new Float32Array(BUFFER_SIZE),
    leadII: new Float32Array(BUFFER_SIZE),
    writeIdx: 0,
    totalSamples: 0,
    lastSeq: -1,
    droppedPackets: 0,
  };

  private hr = { lastPeakIdx: 0, intervals: [] as number[], above: false };

  /* ---- staleness watchdog (root CLAUDE.md §3.2) ---- */
  private lastBatchAt = 0;
  private stale = false;
  private staleTimer: ReturnType<typeof setInterval> | null = null;
  private appStateSub: { remove(): void } | null = null;

  constructor(callbacks: BleClientCallbacks) {
    this.cb = callbacks;
  }

  /** True when the native BLE module is present (a dev build, not Expo Go). */
  static get isSupported(): boolean {
    return CyphixBleNative != null;
  }

  isSimulated(): boolean {
    return this.simulated;
  }

  /** True when nothing has arrived for STREAM_STALE_MS — the trace is frozen. */
  isStale(): boolean {
    return this.stale;
  }

  /* ================================================================
     STALENESS — the difference between "connected" and "delivering".

     A BLE link can sit perfectly connected while nothing comes down it:
     the phone locks, the app backgrounds, the device slides off the
     patient, the ESP32 browns out. In every one of those cases the last
     drawn waveform stays on screen, and a screen that keeps calling it
     live is showing a frozen trace as a patient's heart.
  ================================================================ */

  private startWatchdog(): void {
    this.stopWatchdog();
    /* Deliberately 0, not `Date.now()`: nothing has arrived YET, and a link
       that has not started delivering is not the same thing as one that has
       stopped. Seeding it with "now" would raise a stale warning during the
       ordinary seconds of scanning and connecting — crying frozen at a trace
       that has never drawn. Every check below is therefore gated on having
       received at least one batch. */
    this.lastBatchAt = 0;
    this.setStale(false);

    this.staleTimer = setInterval(() => {
      if (this.lastBatchAt === 0) return; // never started — not stale
      if (Date.now() - this.lastBatchAt > STREAM_STALE_MS) this.setStale(true);
    }, STREAM_STALE_MS / 3);

    // Backgrounding is KNOWN silence, not suspected silence: iOS stops
    // delivering CoreBluetooth notifications to a suspended app, and JS
    // timers stop running too — so the interval above cannot be relied on
    // to notice. Mark it stale on the way out, while we still execute.
    this.appStateSub = AppState.addEventListener('change', (s: AppStateStatus) => {
      if (s === 'active') {
        // Do NOT clear stale here. The next real batch does that; saying
        // "live again" before a sample has arrived is the same lie.
        if (this.lastBatchAt !== 0) this.lastBatchAt = Date.now();
      } else if (this.lastBatchAt !== 0) {
        this.setStale(true);
      }
    });
  }

  private stopWatchdog(): void {
    if (this.staleTimer) clearInterval(this.staleTimer);
    this.staleTimer = null;
    this.appStateSub?.remove();
    this.appStateSub = null;
    this.setStale(false);
  }

  private setStale(next: boolean): void {
    if (next === this.stale) return;
    this.stale = next;
    this.cb.onStaleChange?.(next);
  }

  getBuffer(): EcgBufferView {
    return this.data;
  }

  subscribe(listener: BleDataListener): () => void {
    this.subs.add(listener);
    return () => this.subs.delete(listener);
  }

  /**
   * Ask for the Android runtime permissions the GATT scan needs.
   *
   * ⚠️ The Kotlin module is annotated `@SuppressLint("MissingPermission")` and
   * documents that the UI must have obtained these already — but nothing did.
   * Declaring a permission in the manifest does NOT grant it: from Android 6
   * the user must be asked at runtime, and an unasked `startScan` returns no
   * results and throws no error, which looks exactly like "the device isn't
   * here". iOS needs none of this — CoreBluetooth prompts on first use, driven
   * by NSBluetoothAlwaysUsageDescription in app.json.
   */
  private static async ensureAndroidPermissions(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;
    // Android 12 (API 31) split BLE out of location; below it, a scan is
    // still legally a location capability and asks for the location grant.
    const needed =
      Number(Platform.Version) >= 31
        ? [
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          ]
        : [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];

    const result = await PermissionsAndroid.requestMultiple(needed);
    return needed.every((p) => result[p] === PermissionsAndroid.RESULTS.GRANTED);
  }

  /** Connect to real hardware. Falls back to nothing — the caller decides. */
  async connect(): Promise<void> {
    if (!CyphixBleNative) {
      this.cb.onStatusChange?.('error', 'No Bluetooth in this build — use the simulator');
      return;
    }

    if (!(await BleClient.ensureAndroidPermissions())) {
      // Say which thing was refused. "Bluetooth error" would send someone to
      // check the device's battery for a problem that is in Settings.
      this.cb.onStatusChange?.('error', 'Bluetooth permission denied — enable it in Settings');
      return;
    }

    this.simulated = false;
    this.cb.onStatusChange?.('connecting');
    this.nativeSubs = [
      CyphixBleNative.addListener('onStatusChange', (e) => {
        this.cb.onStatusChange?.(e.status, e.detail);
        if (e.deviceName) this.cb.onDeviceNameChange?.(e.deviceName);
      }),
      CyphixBleNative.addListener('onEcgBatch', (e) => this.ingest(e)),
      CyphixBleNative.addListener('onHeartRate', (e) => this.cb.onHeartRate?.(e.bpm)),
      CyphixBleNative.addListener('onSignalRail', (e) => this.cb.onSignalRail?.(e)),
    ];
    this.startWatchdog();
    await CyphixBleNative.connect();
  }

  /**
   * Start the SHARED synthetic signal so the guided protocol can be exercised
   * without the ESP32 present. Never a patient signal — the UI must say so.
   */
  connectSimulator(): void {
    this.stopSimulator();
    this.simulated = true;
    this.simulator = new EcgSimulator(SAMPLE_RATE);
    this.cb.onStatusChange?.('connecting');
    this.cb.onDeviceNameChange?.('SIMULATION');

    const perTick = Math.round((SIM_TICK_MS / 1000) * SAMPLE_RATE);
    this.simTimer = setInterval(() => {
      const samples = this.simulator!.next(perTick);
      this.ingest({
        leadI: samples.map((s) => s.leadI_mV),
        leadII: samples.map((s) => s.leadII_mV),
        droppedPackets: 0,
      });
    }, SIM_TICK_MS);

    // The simulator is watchdogged too. Its timer is throttled in the
    // background exactly like the native path, so the same rule applies:
    // a paused synthetic trace is no more live than a paused real one.
    this.startWatchdog();
    this.cb.onStatusChange?.('streaming');
  }

  async disconnect(): Promise<void> {
    this.stopWatchdog();
    this.stopSimulator();
    for (const s of this.nativeSubs) s.remove();
    this.nativeSubs = [];
    if (CyphixBleNative && !this.simulated) await CyphixBleNative.disconnect();
    this.simulated = false;
    this.cb.onStatusChange?.('disconnected');
  }

  private stopSimulator(): void {
    if (this.simTimer) clearInterval(this.simTimer);
    this.simTimer = null;
    this.simulator = null;
  }

  private ingest(batch: Pick<EcgBatchEvent, 'leadI' | 'leadII' | 'droppedPackets'>): void {
    // Real samples arrived: this is the ONLY thing that clears staleness.
    this.lastBatchAt = Date.now();
    this.setStale(false);

    const { leadI, leadII } = this.data;
    for (let i = 0; i < batch.leadI.length; i++) {
      const idx = this.data.writeIdx % BUFFER_SIZE;
      leadI[idx] = batch.leadI[i];
      leadII[idx] = batch.leadII[i];
      this.detectPeak(batch.leadII[i], this.data.writeIdx);
      this.data.writeIdx++;
      this.data.totalSamples++;
    }
    this.data.droppedPackets = batch.droppedPackets;
    for (const s of this.subs) s(this.data);
  }

  /** Simple threshold crossing — a live number for the status line, nothing more. */
  private detectPeak(v: number, idx: number): void {
    if (v > HR_THRESHOLD_MV && !this.hr.above) {
      this.hr.above = true;
      if (this.hr.lastPeakIdx > 0) {
        const rr = (idx - this.hr.lastPeakIdx) / SAMPLE_RATE;
        if (rr > 0.3 && rr < 2) {
          this.hr.intervals.push(rr);
          if (this.hr.intervals.length > 5) this.hr.intervals.shift();
          const mean = this.hr.intervals.reduce((a, b) => a + b, 0) / this.hr.intervals.length;
          this.cb.onHeartRate?.(Math.round(60 / mean));
        }
      }
      this.hr.lastPeakIdx = idx;
    } else if (v < HR_THRESHOLD_MV * 0.6) {
      this.hr.above = false;
    }
  }
}

// v1.1.0 — Two gaps between "the link is up" and "this is a patient signal":
//          a staleness watchdog (+ AppState) so a frozen trace stops being
//          called live, and the Android runtime permission request the native
//          module always assumed someone else had made.
