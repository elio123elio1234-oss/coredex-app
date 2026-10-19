/* ==================================================================
   heroScene — the geometry of "out of the screen".

   At rest the dark display fills the viewport under the bar. Scrolling
   zooms OUT: the display shrinks onto the screen of the frontal watch
   render (phase A), then the watch steps right while the module render
   arrives on its left, as on the one-pager (phase B), and the callouts
   draw. Everything here is pure arithmetic on rectangles, so the
   component only writes the numbers into styles.

   The display element keeps its full layout size the whole time (so the
   canvas never re-allocates): a uniform scale plus a clip-path crop of
   its top-left region make it the watch's screen.
   ================================================================== */

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** The frontal watch render (watch-front.webp) and its display, in image px. */
export const WATCH = { w: 642, h: 999, screen: { x: 56, y: 296, w: 486, h: 538, r: 108 } } as const;
/** The module render (watch-module.webp). */
export const MODULE = { w: 1142, h: 1389 } as const;
export const SCREEN_ASPECT = WATCH.screen.w / WATCH.screen.h;

export interface SceneLayout {
  vw: number;
  vh: number;
  compact: boolean;
  /** The display at rest. */
  full: Rect;
  radius: number;
  /** Inner metrics of the display (padding, where the leads sit). */
  pad: number;
  leadsTop: number;
  leadsH: number;
  /** Height of the display's top region that becomes the watch screen. */
  cropH: number;
  /** The watch alone, centred (end of phase A). */
  watchA: Rect;
  /** Module + watch side by side (end of phase B). */
  watchB: Rect;
  moduleB: Rect;
}

export function sceneLayout(vw: number, vh: number): SceneLayout {
  const compact = vw < 900;
  const nav = compact ? 60 : 72;
  const edge = compact ? 10 : 16;
  const full = { x: edge, y: nav, w: vw - edge * 2, h: vh - nav - edge };

  const pad = compact ? 18 : 32;
  const leadsTop = pad + (compact ? 52 : 64);
  // Short laptops (≤ 760 tall) give the headline band more room, so the
  // hero's title stays the largest type on the page.
  const leadsH = Math.round(full.h * (compact ? 0.36 : vh <= 760 ? 0.42 : 0.48));
  const cropH = leadsTop + leadsH + (compact ? 16 : 24);

  const ar = WATCH.w / WATCH.h;
  const mr = MODULE.w / MODULE.h;

  const hA = compact ? Math.min(vh * 0.62, (vw - 56) / ar) : Math.min(vh * 0.8, 780);
  const watchA = { x: (vw - hA * ar) / 2, y: nav + (vh - nav - hA) / 2, w: hA * ar, h: hA };

  let moduleB: Rect;
  let watchB: Rect;
  if (compact) {
    // Phones: the pair overlaps — module up-left behind, watch down-right in
    // front — so it fills the frame instead of standing small in a row.
    const hB = Math.min(vh * 0.46, (vw * 0.78) / mr, (vw * 0.6) / ar);
    const top = nav + 28;
    moduleB = { x: 16, y: top, w: hB * mr, h: hB };
    watchB = { x: vw - 16 - hB * ar, y: top + hB * 0.3, w: hB * ar, h: hB };
  } else {
    // Desktop: side by side, as on the one-pager, with room for the callouts.
    const gap = vw * 0.07;
    const hB = Math.min(vh * 0.64, 620, (vw - 400 - gap) / (ar + mr));
    const cy = nav + (vh - nav) * 0.46;
    const mW = hB * mr;
    const x0 = (vw - (mW + gap + hB * ar)) / 2;
    moduleB = { x: x0, y: cy - hB / 2, w: mW, h: hB };
    watchB = { x: x0 + mW + gap, y: cy - hB / 2, w: hB * ar, h: hB };
  }

  return { vw, vh, compact, full, radius: compact ? 26 : 40, pad, leadsTop, leadsH, cropH, watchA, watchB, moduleB };
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
/** Progress of `p` through the window [a, b], clamped to 0..1. */
export const seg = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpRect = (a: Rect, b: Rect, t: number): Rect => ({
  x: lerp(a.x, b.x, t),
  y: lerp(a.y, b.y, t),
  w: lerp(a.w, b.w, t),
  h: lerp(a.h, b.h, t),
});

/** Where the display sits inside a watch image box. */
export function screenOf(box: Rect): Rect & { r: number } {
  const k = box.h / WATCH.h;
  return {
    x: box.x + WATCH.screen.x * k,
    y: box.y + WATCH.screen.y * k,
    w: WATCH.screen.w * k,
    h: WATCH.screen.h * k,
    r: WATCH.screen.r * k,
  };
}

/** The watch image box whose display is centred on `v` at v's height. */
function watchAround(v: Rect): Rect {
  const k = v.h / WATCH.screen.h;
  return {
    x: v.x + v.w / 2 - (WATCH.screen.x + WATCH.screen.w / 2) * k,
    y: v.y - WATCH.screen.y * k,
    w: WATCH.w * k,
    h: WATCH.h * k,
  };
}

export interface SceneFrame {
  /** Display transform (origin top-left) and crop. */
  tx: number;
  ty: number;
  scale: number;
  clip: string;
  watch: Rect;
  watchOpacity: number;
  module: Rect;
  moduleOpacity: number;
  /** The headline band inside the display. */
  copy: number;
  /** The sentence under the pair, and the callouts. */
  statement: number;
  callouts: number;
  /** The "illustrative" note that bridges the zoom, between headline and plate caption. */
  note: number;
}

/** Phase windows on the scene's 0..1 scroll progress. */
export const PHASE = { a: [0.06, 0.5], b: [0.56, 0.8] } as const;

export function sceneFrame(p: number, L: SceneLayout): SceneFrame {
  const a = easeInOut(seg(p, PHASE.a[0], PHASE.a[1]));
  const b = easeInOut(seg(p, PHASE.b[0], PHASE.b[1]));

  let v: Rect;
  let r: number;
  let watch: Rect;
  if (b <= 0) {
    const t = screenOf(L.watchA);
    v = lerpRect(L.full, t, a);
    r = lerp(L.radius, t.r, a);
    watch = watchAround(v);
  } else {
    watch = lerpRect(L.watchA, L.watchB, b);
    const t = screenOf(watch);
    v = t;
    r = t.r;
  }

  const ch = lerp(L.full.h, L.cropH, a);
  const scale = v.h / ch;
  const cw = Math.min(L.full.w, v.w / scale);

  const copy = 1 - seg(p, 0.015, 0.13);
  const statement = seg(p, 0.76, 0.88);

  return {
    tx: v.x - L.full.x,
    ty: v.y - L.full.y,
    scale,
    clip: `inset(0px ${(L.full.w - cw).toFixed(2)}px ${(L.full.h - ch).toFixed(2)}px 0px round ${(r / scale).toFixed(2)}px)`,
    watch,
    watchOpacity: seg(a, 0.3, 0.8),
    module: { ...L.moduleB, x: L.moduleB.x - (1 - b) * 56 },
    // Arrives once the watch has mostly stepped aside, so the two never cross.
    moduleOpacity: easeInOut(seg(b, 0.35, 1)),
    copy,
    statement,
    callouts: seg(p, 0.8, 0.95),
    note: Math.min(1 - copy, 1 - statement),
  };
}

// v0.6.0 — layout + per-frame geometry for the hero's zoom out of the display into the watch
