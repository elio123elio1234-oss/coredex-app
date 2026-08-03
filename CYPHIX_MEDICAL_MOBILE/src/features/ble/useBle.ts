/* ==================================================================
   useBle — the ONLY way components touch the ECG hardware.
   Field-for-field the same surface as the web hook of the same name, so
   the measurement hooks port across unchanged.
   ================================================================== */

import { useCallback, useContext, useMemo } from 'react';
import type { EcgBufferView } from '@cyphix/shared';
import { SAMPLE_RATE } from '@cyphix/shared';
import { useAppSelector } from '@/store/hooks';
import { BleClient, type BleDataListener } from '@/services/ble/bleClient';
import { BleContext } from './BleProvider';

export function useBle() {
  const client = useContext(BleContext);

  const status = useAppSelector((s) => s.ble.status);
  const deviceName = useAppSelector((s) => s.ble.deviceName);
  const heartRate = useAppSelector((s) => s.ble.heartRate);
  const railed = useAppSelector((s) => s.ble.railed);
  const stale = useAppSelector((s) => s.ble.stale);
  const error = useAppSelector((s) => s.ble.error);

  const connect = useCallback(async () => {
    await client?.connect();
  }, [client]);

  const connectSimulator = useCallback(() => {
    client?.connectSimulator();
  }, [client]);

  const disconnect = useCallback(() => {
    void client?.disconnect();
  }, [client]);

  const subscribe = useCallback(
    (listener: BleDataListener) => client?.subscribe(listener) ?? (() => {}),
    [client],
  );

  const getBuffer = useCallback((): EcgBufferView | null => client?.getBuffer() ?? null, [client]);

  return useMemo(
    () => ({
      status,
      deviceName,
      heartRate,
      railed,
      error,
      /**
       * The link is up but nothing is coming through it — phone locked, app
       * backgrounded, device dropped. The trace on screen is frozen.
       */
      isStale: stale,
      /**
       * True once samples are ACTUALLY flowing — the gate for recording.
       *
       * ⚠️ `status === 'streaming'` alone is not that gate. Status describes
       * the LINK; it stays 'streaming' while a locked phone delivers nothing,
       * so a recording begun on it would be committed against silence and a
       * frozen waveform would keep being drawn as live (root CLAUDE.md §3.2).
       */
      isStreaming: status === 'streaming' && !stale,
      isConnected: status === 'streaming' || status === 'connected',
      /** False in Expo Go: no native module, so only the simulator can run. */
      isSupported: BleClient.isSupported,
      /** True when the signal is synthetic — the UI MUST surface this. */
      isSimulated: client?.isSimulated() ?? false,
      connect,
      connectSimulator,
      disconnect,
      subscribe,
      getBuffer,
      SAMPLE_RATE,
    }),
    [status, deviceName, heartRate, railed, stale, error, client, connect, connectSimulator, disconnect, subscribe, getBuffer],
  );
}

// v1.1.0 — `isStreaming` now means samples are really arriving, not just that
//          the link is up; adds `isStale` for screens that must say so.
