/* ==================================================================
   BLE feature slice — connection status + coarse live stats for the UI.
   Per-sample ECG data NEVER passes through Redux (root CLAUDE.md §3.2):
   the monitor reads the ring buffer directly. This slice only carries
   low-rate state a screen needs to render chrome, mirroring the web's
   bleSlice field for field.
   ================================================================== */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { BleStatus } from '@cyphix/shared';

export interface BleState {
  status: BleStatus;
  deviceName: string | null;
  heartRate: number;
  /** Leads clamped at the BLE int16 rail — surfaced, never hidden. */
  railed: { I: boolean; II: boolean };
  error: string | null;
}

const initialState: BleState = {
  status: 'disconnected',
  deviceName: null,
  heartRate: 0,
  railed: { I: false, II: false },
  error: null,
};

const bleSlice = createSlice({
  name: 'ble',
  initialState,
  reducers: {
    statusChanged(state, action: PayloadAction<{ status: BleStatus; detail?: string }>) {
      state.status = action.payload.status;
      state.error =
        action.payload.status === 'error' ? (action.payload.detail ?? 'BLE error') : null;
      if (action.payload.status === 'disconnected') {
        state.deviceName = null;
        state.heartRate = 0;
        state.railed = { I: false, II: false };
      }
    },
    deviceNamed(state, action: PayloadAction<string>) {
      state.deviceName = action.payload;
    },
    heartRateUpdated(state, action: PayloadAction<number>) {
      state.heartRate = action.payload;
    },
    railed(state, action: PayloadAction<{ I: boolean; II: boolean }>) {
      state.railed = action.payload;
    },
  },
});

export const { statusChanged, deviceNamed, heartRateUpdated, railed } = bleSlice.actions;
export default bleSlice.reducer;

// v1.0.0 — Web-parity BLE UI state (status/name/HR/rail); samples stay off Redux.
