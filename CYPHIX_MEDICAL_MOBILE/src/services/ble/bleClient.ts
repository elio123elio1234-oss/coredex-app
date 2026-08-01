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

import type { BleStatus, EcgBufferView } from '@cyphix/shared';
import { BUFFER_SIZE, EcgSimulator, SAMPLE_RATE } from '@cyphix/shared';
import { CyphixBleNative, type EcgBatchEvent } from '../../../modules/cyphix-ble';

export type BleDataListener = (buffer: EcgBufferView) => void;

export interface BleClientCallbacks {
  onStatusChange?: (status: BleStatus, detail?: string) => void;
  onDeviceNameChange?: (name: string) => void;
  onHeartRate?: (bpm: number) => void;
  onSignalRail?: (railed: { I: boolean; II: boolean }) => void;
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

  getBuffer(): EcgBufferView {
    return this.data;
  }

  subscribe(listener: BleDataListener): () => void {
    this.subs.add(listener);
    return () => this.subs.delete(listener);
  }

  /** Connect to real hardware. Falls back to nothing — the caller decides. */
  async connect(): Promise<void> {
    if (!CyphixBleNative) {
      this.cb.onStatusChange?.('error', 'No Bluetooth in this build — use the simulator');
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

    this.cb.onStatusChange?.('streaming');
  }

  async disconnect(): Promise<void> {
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

// v1.0.0 — Web-parity client: shared EcgSimulator, ring buffer, subscribe/getBuffer.
