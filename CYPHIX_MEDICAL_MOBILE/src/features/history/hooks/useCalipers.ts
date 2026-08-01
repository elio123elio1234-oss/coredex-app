/* ==================================================================
   useCalipers — the virtual calipers, for a finger.

   ══ WHY THIS IS NOT THE WEB'S STATE MACHINE ══
   The web caliper is: hover to read → click to pin the first marker → click
   to freeze → click to start over. Every step of that depends on a HOVER
   state, which a touch screen does not have, and on the pointer being a
   1-pixel arrow, which a fingertip is not (~9 mm of contact patch — at
   25 mm/s that is 360 ms of ECG under the finger, wider than a QRS).

   Ported literally it would be a tool that measures whatever you cannot
   see. So the model is the same and the interaction is inverted:

     tap Calipers   BOTH markers appear at once, a third and two thirds of
                    the way across the window, already measuring. Nothing
                    is hidden behind a mode the reader has to discover.

     drag a marker  it follows the finger RELATIVELY — the crosshair moves
                    by the same delta the finger did, so it never teleports
                    under the fingertip and stays visible while it is being
                    positioned. Grab anywhere in the 48 pt pad; the point
                    you are moving is the one you can still see.

     zoom           the way to be precise. The scale is FIXED at 25 mm/s, so
                    zooming in spends more screen on less time: at the 40 mm
                    window a millisecond is ~0.1 pt of finger travel instead
                    of ~0.03. Precision comes from the zoom, never from
                    rescaling the trace.

   Δt, the rate that interval implies, and ΔmV are read off a chip pinned
   ABOVE the sheet — never next to the markers, where a hand covers it.

   ══ WHY Δt CARRIES A BPM ══
   The single most common caliper measurement in cardiology is one R-R
   interval, and the number actually wanted from it is a rate. Showing
   "840 ms" and making the reader compute 60000/840 in their head is a
   pointless tax, so both are displayed. It is labelled as the rate implied
   by THAT interval — an instantaneous rate, not the recording's mean.

   ══ COORDINATES ══
   Everything here is in the strip's MILLIMETRE space, matching real ECG
   paper, exactly as on the web. The component owns the pt⇄mm conversion
   (it is the thing that knows how wide the viewport is); this hook never
   sees a pixel, which is what keeps a measurement independent of the
   device's screen density.
   ================================================================== */

import { useCallback, useEffect, useMemo, useState } from 'react';

/** A point in the strip's mm space, with what it means clinically. */
export interface CaliperPoint {
  xMm: number;
  yMm: number;
}

export interface CaliperDelta {
  ms: number;
  mv: number;
  /** Rate implied by treating Δt as one R-R interval. Null if Δt is 0. */
  impliedBpm: number | null;
}

/** Geometry needed to translate mm ⇄ clinical units. */
export interface CaliperGeometry {
  mmPerSec: number;
  mmPerMv: number;
  /** X position (mm) where t = 0 — the trace start, after the cal pulse. */
  xOffsetMm: number;
  /** Y position (mm) of the isoelectric line, within the band. */
  baselineMm: number;
}

export type CaliperHandle = 'a' | 'b';

export interface UseCalipersResult {
  /** The two markers, in mm. Null until the tool is placed. */
  a: CaliperPoint | null;
  b: CaliperPoint | null;
  /** Which lead the measurement belongs to (only one at a time). */
  lead: string | null;
  delta: CaliperDelta | null;
  /** Time of each marker, in seconds from the start of the recording. */
  timeSec: (p: CaliperPoint) => number;
  /** Amplitude of each marker, in mV from the isoelectric line. */
  mv: (p: CaliperPoint) => number;
  /** Drop both markers into the given window (mm), on the given lead. */
  place: (lead: string, windowStartMm: number, windowMm: number, bandHeightMm: number) => void;
  /** Move one marker by a delta in mm, clamped to the paper. */
  nudge: (handle: CaliperHandle, dxMm: number, dyMm: number) => void;
  clear: () => void;
}

/** Paper bounds so a marker cannot be dragged off the recording. */
export interface CaliperBounds {
  minXMm: number;
  maxXMm: number;
  minYMm: number;
  maxYMm: number;
}

export function useCalipers(
  geometry: CaliperGeometry,
  bounds: CaliperBounds,
  enabled: boolean,
): UseCalipersResult {
  const [a, setA] = useState<CaliperPoint | null>(null);
  const [b, setB] = useState<CaliperPoint | null>(null);
  const [lead, setLead] = useState<string | null>(null);

  const clear = useCallback(() => {
    setA(null);
    setB(null);
    setLead(null);
  }, []);

  /* Losing the permission — or switching the tool off — must drop the
     measurement rather than leave a frozen readout on screen with no way to
     clear it. */
  useEffect(() => {
    if (!enabled) clear();
  }, [enabled, clear]);

  const place = useCallback(
    (onLead: string, windowStartMm: number, windowMm: number, bandHeightMm: number) => {
      /* A third and two thirds across the VISIBLE window, both on the
         baseline. Two beats are ~1.7 s apart at 70 bpm ≙ 42 mm, and a third
         of the default 100 mm window is 33 mm — so the markers open roughly
         one beat apart, which is the measurement being taken nine times out
         of ten. */
      const y = bandHeightMm / 2;
      setA({ xMm: windowStartMm + windowMm / 3, yMm: y });
      setB({ xMm: windowStartMm + (windowMm * 2) / 3, yMm: y });
      setLead(onLead);
    },
    [],
  );

  const nudge = useCallback(
    (handle: CaliperHandle, dxMm: number, dyMm: number) => {
      const clamp = (p: CaliperPoint): CaliperPoint => ({
        xMm: Math.min(Math.max(p.xMm + dxMm, bounds.minXMm), bounds.maxXMm),
        yMm: Math.min(Math.max(p.yMm + dyMm, bounds.minYMm), bounds.maxYMm),
      });
      if (handle === 'a') setA((p) => (p ? clamp(p) : p));
      else setB((p) => (p ? clamp(p) : p));
    },
    [bounds.minXMm, bounds.maxXMm, bounds.minYMm, bounds.maxYMm],
  );

  const timeSec = useCallback(
    (p: CaliperPoint) => (p.xMm - geometry.xOffsetMm) / geometry.mmPerSec,
    [geometry.xOffsetMm, geometry.mmPerSec],
  );
  const mv = useCallback(
    (p: CaliperPoint) => (geometry.baselineMm - p.yMm) / geometry.mmPerMv,
    [geometry.baselineMm, geometry.mmPerMv],
  );

  const delta = useMemo<CaliperDelta | null>(() => {
    if (!a || !b) return null;
    const ms = (Math.abs(b.xMm - a.xMm) / geometry.mmPerSec) * 1000;
    return {
      ms,
      mv: (a.yMm - b.yMm) / geometry.mmPerMv,
      impliedBpm: ms > 0 ? 60000 / ms : null,
    };
  }, [a, b, geometry.mmPerSec, geometry.mmPerMv]);

  return { a, b, lead, delta, timeSec, mv, place, nudge, clear };
}

// v1.0.0 — Touch calipers: two persistent, relatively-dragged crosshairs in mm
//          space; same Δt / implied-BPM / ΔmV readout as the web tool.
