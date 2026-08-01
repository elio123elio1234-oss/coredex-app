/* ==================================================================
   cyphix-ble — JS face of the native BLE bridge.

   The heavy lifting (scan, GATT, notify parsing, ring buffering) runs
   in Swift (ios/CyphixBleModule.swift) and Kotlin
   (android/.../CyphixBleModule.kt), OFF the JS thread. JS receives:
     • onStatusChange   — connection lifecycle (low rate)
     • onEcgBatch       — batched mV samples, ≤ ~10 Hz emission
     • onHeartRate      — live bpm (low rate)
     • onLeadOff        — hardware LOD bits
     • onSignalRail     — int16 saturation latch (never hide it)

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
  leadII: number[];
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
};

declare class CyphixBleNativeModule extends NativeModule<CyphixBleEvents> {
  /** Scan for the CYPHIX service UUID, connect, subscribe to notifications. */
  connect(): Promise<void>;
  disconnect(): Promise<void>;
}

/** null in Expo Go / web — callers must fall back to the simulator. */
export const CyphixBleNative = requireOptionalNativeModule<CyphixBleNativeModule>('CyphixBle');

// v0.1.0 — Typed optional native module handle + event contracts.
