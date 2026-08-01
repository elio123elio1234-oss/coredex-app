/* ==================================================================
   Scan/electrode domain types shared across platforms. Only the pieces
   the measurement pipeline needs live here; the full scan geometry
   (keypoints, virtual points, connections) stays in the web app until
   the ONNX pose pipeline is ported to mobile.
   ================================================================== */

/** The six precordial electrodes, in protocol order. */
export type ElectrodeName = 'V1' | 'V2' | 'V3' | 'V4' | 'V5' | 'V6';

export interface Point2D {
  x: number;
  y: number;
}

export type ElectrodeMap = Record<ElectrodeName, Point2D>;

// v1.0.0 — Electrode naming shared by the measurement constants.
