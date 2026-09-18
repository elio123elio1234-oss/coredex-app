/* ==================================================================
   useLeadDebug — the three MEASURED channels of a dual-Lead-II device,
   side by side, for the temporary bring-up screen (LeadDebugScreen).

   ⚠️ TEMPORARY DIAGNOSTIC. Gated by LEAD_DEBUG_SCREEN_ENABLED; when that
   flag is false nothing imports this file and it is dead code.

   ── WHY IT EXISTS ──
   The second Lead II copy is, by design, RECORDED AND NEVER DRAWN
   (bleClient header). That is right for a patient and useless for the
   person who just soldered a fifth electrode on: there was no screen in
   the app that could answer "is the third channel actually arriving?".
   This reads the same ring buffer every other screen reads — it adds no
   second path into the hardware — and shows what is in it.

   ── WHAT IT DOES NOT DO ──
   No recording, no timer, no gate, no save, no Einthoven derivation.
   Three independent display chains are fine HERE (and would be wrong in
   SixLeadMonitor) because nothing is derived from their outputs.

   The numbers that matter are the last two:
     • `corr`      — II-a vs II-b over the visible window. The same lead
                     from two electrodes should sit near 1.
     • `diffRmsUv` — RMS of (II-a − II-b). This must be SMALL BUT NOT
                     ZERO. Exactly zero means the two "copies" are one
                     measurement duplicated somewhere in the pipeline —
                     the one failure that would look perfect on a trace.
   ================================================================== */

import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import { createDisplayFilter, filterSample, type DisplayFilter } from '@cyphix/shared';
import { useBle } from '@/features/ble/useBle';

/** Visible window per trace — the monitor's own 3 seconds. */
export const LEAD_DEBUG_WINDOW_S = 3;
/** Readout cadence. Low-rate chrome only — samples never enter React state. */
const STATS_MS = 500;
/** Rate is measured across this many readout ticks (2 s): long enough to
    average out the 10 Hz native flush, short enough to show a stall. */
const RATE_TICKS = 4;

export type LeadDebugChannel = 'I' | 'IIa' | 'IIb';

export interface LeadDebugRings {
  I: Float32Array;
  IIa: Float32Array;
  IIb: Float32Array;
  /** Samples written so far; ring index is `written % capacity`. */
  written: number;
  capacity: number;
  /** The stream currently carries a second Lead II copy. */
  hasSecondCopy: boolean;
}

export interface LeadDebugStats {
  hasSecondCopy: boolean;
  /** Measured, not nominal. Null until two seconds of samples exist. */
  sampleRateHz: number | null;
  totalSamples: number;
  droppedPackets: number;
  /** Peak-to-peak over the window, mV. Null when the channel is absent. */
  p2pMv: Record<LeadDebugChannel, number | null>;
  corr: number | null;
  diffRmsUv: number | null;
}

const EMPTY_STATS: LeadDebugStats = {
  hasSecondCopy: false,
  sampleRateHz: null,
  totalSamples: 0,
  droppedPackets: 0,
  p2pMv: { I: null, IIa: null, IIb: null },
  corr: null,
  diffRmsUv: null,
};

function freshFilters(): Record<LeadDebugChannel, DisplayFilter> {
  return { I: createDisplayFilter(), IIa: createDisplayFilter(), IIb: createDisplayFilter() };
}

/**
 * @param filtered  true: the live monitor's display chain per channel (what the
 *                  exam screen looks like). false: raw samples — only the
 *                  window mean is removed at draw time, so electrode drift,
 *                  mains and muscle noise are all visible as they arrive.
 */
export function useLeadDebug(filtered: boolean): {
  rings: MutableRefObject<LeadDebugRings>;
  stats: LeadDebugStats;
} {
  const { subscribe, getBuffer, SAMPLE_RATE } = useBle();
  const capacity = Math.max(1, Math.round(LEAD_DEBUG_WINDOW_S * SAMPLE_RATE));

  const rings = useRef<LeadDebugRings>({
    I: new Float32Array(capacity),
    IIa: new Float32Array(capacity),
    IIb: new Float32Array(capacity),
    written: 0,
    capacity,
    hasSecondCopy: false,
  });
  const filters = useRef(freshFilters());
  const lastIdx = useRef(0);
  const [stats, setStats] = useState<LeadDebugStats>(EMPTY_STATS);

  /* Stable subscribe/getBuffer only — never the whole `ble` object (the
     SixLeadMonitor lesson: that re-subscribed on every parent render). */
  useEffect(() => {
    const r = rings.current;
    r.written = 0;
    r.hasSecondCopy = false;
    filters.current = freshFilters();
    lastIdx.current = getBuffer()?.writeIdx ?? 0;

    return subscribe(() => {
      const b = getBuffer();
      if (!b) return;
      const ni = b.writeIdx;
      let pi = lastIdx.current;
      if (ni <= pi) return;
      if (ni - pi > capacity) pi = ni - capacity;

      const iib = b.leadIIb;
      // A stream that gains or loses its third channel starts a fresh window:
      // half a ring of one device and half of another is not a trace.
      if ((iib !== undefined) !== r.hasSecondCopy) {
        r.hasSecondCopy = iib !== undefined;
        r.written = 0;
        filters.current = freshFilters();
      }

      const size = b.leadI.length;
      const f = filters.current;
      for (let i = pi; i < ni; i++) {
        const w = r.written % capacity;
        const vI = b.leadI[i % size];
        const vA = b.leadII[i % size];
        r.I[w] = filtered ? filterSample(f.I, vI) : vI;
        r.IIa[w] = filtered ? filterSample(f.IIa, vA) : vA;
        if (iib) {
          const vB = iib[i % size];
          r.IIb[w] = filtered ? filterSample(f.IIb, vB) : vB;
        }
        r.written++;
      }
      lastIdx.current = ni;
    });
  }, [subscribe, getBuffer, capacity, filtered]);

  /* ── Readouts, at 2 Hz ── */
  useEffect(() => {
    const history: { at: number; total: number }[] = [];

    const iv = setInterval(() => {
      const b = getBuffer();
      const r = rings.current;
      const total = b?.totalSamples ?? 0;

      history.push({ at: Date.now(), total });
      if (history.length > RATE_TICKS + 1) history.shift();
      const first = history[0];
      const last = history[history.length - 1];
      const dt = (last.at - first.at) / 1000;
      const sampleRateHz =
        history.length > RATE_TICKS && dt > 0 ? (last.total - first.total) / dt : null;

      const n = Math.min(r.written, capacity);
      const p2p = (x: Float32Array): number | null => {
        if (n < 2) return null;
        let lo = Infinity;
        let hi = -Infinity;
        for (let i = 0; i < n; i++) {
          if (x[i] < lo) lo = x[i];
          if (x[i] > hi) hi = x[i];
        }
        return hi - lo;
      };

      let corr: number | null = null;
      let diffRmsUv: number | null = null;
      if (r.hasSecondCopy && n >= SAMPLE_RATE) {
        let ma = 0;
        let mb = 0;
        for (let i = 0; i < n; i++) {
          ma += r.IIa[i];
          mb += r.IIb[i];
        }
        ma /= n;
        mb /= n;
        let saa = 0;
        let sbb = 0;
        let sab = 0;
        let sdd = 0;
        for (let i = 0; i < n; i++) {
          const a = r.IIa[i] - ma;
          const c = r.IIb[i] - mb;
          saa += a * a;
          sbb += c * c;
          sab += a * c;
          sdd += (a - c) * (a - c);
        }
        corr = saa > 0 && sbb > 0 ? sab / Math.sqrt(saa * sbb) : null;
        diffRmsUv = 1000 * Math.sqrt(sdd / n);
      }

      setStats({
        hasSecondCopy: r.hasSecondCopy,
        sampleRateHz,
        totalSamples: total,
        droppedPackets: b?.droppedPackets ?? 0,
        p2pMv: { I: p2p(r.I), IIa: p2p(r.IIa), IIb: r.hasSecondCopy ? p2p(r.IIb) : null },
        corr,
        diffRmsUv,
      });
    }, STATS_MS);
    return () => clearInterval(iv);
  }, [getBuffer, capacity, SAMPLE_RATE]);

  return { rings, stats };
}

// v1.0.0 — TEMPORARY (behind LEAD_DEBUG_SCREEN_ENABLED): three display rings
//          for Lead I / II-a / II-b off the shared BLE buffer, plus measured
//          sample rate, peak-to-peak, and the II-a↔II-b correlation and
//          difference that prove the second copy is a second electrode.
