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
      /** True once samples are flowing — the gate for recording. */
      isStreaming: status === 'streaming',
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
    [status, deviceName, heartRate, railed, error, client, connect, connectSimulator, disconnect, subscribe, getBuffer],
  );
}

// v1.0.0 — Web-parity BLE hook surface.
