/* ==================================================================
   cyphix-ble — JS face of the native BLE bridge.

   The heavy lifting (scan, GATT, notify parsing, ring buffering) runs
   in Swift (ios/CyphixBleModule.swift) and Kotlin
   (android/.../CyphixBleModule.kt), OFF the JS thread. JS receives:
     • onStatusChange   — connection lifecycle (low rate)
     • onEcgBatch       — batched mV samples, ≤ ~10 Hz emission
     • onHeartRate      — live bpm (low rate)
     • onLeadOff        — hardware LOD bits (bit 3 = LL#2, 3-channel stream only)
     • onSignalRail     — int16 saturation latch (never hide it)
     • onDeviceFlags    — the 3-channel packet's flags byte, on change
                          (firmware v3+ only; never fires on a legacy device)

   DUAL LEAD II (firmware v3+): the native halves subscribe to the 3-channel
   characteristic when the device has one, else to the legacy one. Either way
   `leadII` is the same electrode pair; `leadIIb` is ALWAYS in the batch and
   EMPTY on a legacy device, which is how JS tells the two apart.

   In Expo Go the native module does not exist → `CyphixBleNative` is
   null and the app falls back to the simulator (services/ble/bleClient).
   ================================================================== */

import { NativeModule, requireOptionalNativeModule } from 'expo';
import type { BleStatus } from '@cyphix/shared';

export interface BleStatusEvent {
  status: BleStatus;
  detail?: string;
  deviceName?: string;
}

/** One batch of decoded samples, already converted to millivolts. */
export interface EcgBatchEvent {
  leadI: number[];
  /** Lead II as every device measures it (copy A on a dual-Lead-II device). */
  leadII: number[];
  /**
   * The second measured copy of Lead II. Same length as `leadII` on the
   * 3-channel stream; ALWAYS present and EMPTY on a legacy device.
   */
  leadIIb: number[];
  /** Monotonic total-sample cursor after this batch (mirrors EcgBufferView.writeIdx). */
  writeIdx: number;
  droppedPackets: number;
}

/* A type alias, not an interface: Expo's EventsMap constraint is an index
   signature, which only structural type aliases satisfy. */
export type CyphixBleEvents = {
  onStatusChange: (event: BleStatusEvent) => void;
  onEcgBatch: (event: EcgBatchEvent) => void;
  onHeartRate: (event: { bpm: number }) => void;
  onLeadOff: (event: { lodBits: number }) => void;
  onSignalRail: (event: { I: boolean; II: boolean }) => void;
  /** Raw flags byte — test with the ECG3_FLAG_* masks from @cyphix/shared. */
  onDeviceFlags: (event: { flags: number }) => void;
};

declare class CyphixBleNativeModule extends NativeModule<CyphixBleEvents> {
  /** Scan for the CYPHIX service UUID, connect, subscribe to notifications. */
  connect(): Promise<void>;
  disconnect(): Promise<void>;
}

/** null in Expo Go / web — callers must fall back to the simulator. */
export const CyphixBleNative = requireOptionalNativeModule<CyphixBleNativeModule>('CyphixBle');

// v0.2.0 — Dual Lead II: `EcgBatchEvent.leadIIb` (always present, empty on a
//          legacy device) and the `onDeviceFlags` event.
// v0.1.0 — Typed optional native module handle + event contracts.
