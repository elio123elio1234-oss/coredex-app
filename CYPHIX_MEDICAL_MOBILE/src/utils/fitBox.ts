/* ==================================================================
   fitBox — the largest rectangle of a given aspect that fits a slot.

   Used wherever a PHOTOGRAPH goes on screen. The mistake this exists to
   prevent: choosing a frame from the layout (a viewport fraction, a flex
   remainder) and letting `resizeMode="contain"` letterbox the picture
   inside it. That leaves the photo floating in empty bands whenever the
   frame's proportions differ from the artwork's — which, in landscape,
   they always do.

   Size the FRAME to the picture instead, then the picture fills it edge
   to edge with nothing cropped and nothing wasted.
   ================================================================== */

export interface Box {
  width: number;
  height: number;
}

/** The largest `aspect`-shaped (w ÷ h) box that fits inside `maxW × maxH`. */
export function fitBox(maxW: number, maxH: number, aspect: number): Box {
  if (!(maxW > 0) || !(maxH > 0) || !(aspect > 0)) return { width: 0, height: 0 };
  let width = maxW;
  let height = width / aspect;
  if (height > maxH) {
    height = maxH;
    width = height * aspect;
  }
  return { width: Math.floor(width), height: Math.floor(height) };
}

// v1.0.0 — Frame-to-picture fitting, shared by the prep and measurement screens.
