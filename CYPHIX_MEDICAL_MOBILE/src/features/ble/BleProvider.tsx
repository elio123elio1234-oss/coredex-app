/* ==================================================================
   BleProvider — one BleClient for the whole app, mirroring the web's
   BleContext. The client MUST outlive individual screens: navigating
   from Home into the measurement flow cannot drop the connection or
   reset the ring buffer mid-recording.
   ================================================================== */

import { createContext, useEffect, useRef, type ReactNode } from 'react';
import { useAppDispatch } from '@/store/hooks';
import { BleClient } from '@/services/ble/bleClient';
import { deviceNamed, heartRateUpdated, railed, staleChanged, statusChanged } from './bleSlice';

export const BleContext = createContext<BleClient | null>(null);

export function BleProvider({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();
  const ref = useRef<BleClient | null>(null);

  if (ref.current === null) {
    ref.current = new BleClient({
      onStatusChange: (status, detail) => dispatch(statusChanged({ status, detail })),
      onDeviceNameChange: (name) => dispatch(deviceNamed(name)),
      onHeartRate: (bpm) => dispatch(heartRateUpdated(bpm)),
      onSignalRail: (r) => dispatch(railed(r)),
      onStaleChange: (s) => dispatch(staleChanged(s)),
    });
  }

  useEffect(() => {
    const client = ref.current;
    return () => {
      void client?.disconnect();
    };
  }, []);

  return <BleContext.Provider value={ref.current}>{children}</BleContext.Provider>;
}

// v1.1.0 — Also carries the client's staleness signal into Redux.
