/* ==================================================================
   useSheetPinch — two fingers on the ECG sheet, the way two fingers
   work on a photograph.

   Asked for as: *"when I'm looking at an ECG report, can pinching with
   two fingers zoom like on a picture, and be smooth?"*

   ══ WHY IT CANNOT SIMPLY DRIVE `windowMm` ══
   The obvious implementation is to set the zoom from the gesture, frame
   by frame, exactly as the +/− buttons do. It would be honest and it
   would be a slideshow.

   Zoom on this sheet is a LAYOUT quantity: `ptPerMm = viewport / windowMm`
   decides the width of every tile and the height of every band, so
   changing it re-lays out and re-rasterises 24 `<Svg>` views — six leads ×
   four tiles — each carrying a millimetre grid and a decimated trace. The
   path STRINGS are already memoised on geometry that excludes the zoom
   (see `EcgReviewStrip`, which is why dragging the ghost is fast), so
   nothing is rebuilt in JS — but react-native-svg still redraws every tile
   when its size changes, and doing that sixty times a second is not what
   that library is for.

   ══ SO: A TRANSFORM WHILE THE FINGERS ARE DOWN, A COMMIT WHEN THEY LIFT ══
   The same two-phase trick every photo viewer uses. While pinching, the
   sheet is scaled and translated on the UI thread by Reanimated — no React
   render, no re-rasterisation, nothing crossing the bridge. On release the
   real `windowMm` is committed once, the tiles redraw at the new scale
   (crisp again, because they are vectors and not a stretched bitmap), and
   the transform goes away.

   ⚠️ One consequence, and it is the standard one: **pinching OUT does not
   reveal more paper until you let go.** There is no more content inside
   the transform to show, so the strip shrinks with blank around it and the
   extra seconds appear on release. That is how a photo behaves too, and
   the alternative is the slideshow above.

   ══════════════════════════════════════════════════════════════════
   ★ THE ANCHOR IS IN MILLIMETRES, AND THAT IS THE WHOLE TRICK
   ══════════════════════════════════════════════════════════════════
   The hard part of a pinch inside a ScrollView is not the scaling, it is
   the hand-off: the transform is ours and lives on the UI thread, the
   scroll offset is the platform's and can only be set from JS, after a
   layout. Anything that assumes both land in the same frame will flash.

   Nothing here assumes it. The point under the fingers is remembered as a
   position on the PAPER, in millimetres — which is the one coordinate that
   does not change when the zoom does. The live transform is then written
   as "put paper-mm X under the finger, GIVEN whatever scroll offset the
   scroll view currently has":

       tx = focalX − k · (anchorMm · ptPerMm − scrollX)

   Feed that the committed `ptPerMm` and the real `scrollX` and it lands on
   zero by itself, at the exact moment the scroll actually arrives —
   whether that is this frame or three frames later. There is no window in
   which the sheet is drawn in the wrong place, because the formula never
   describes a place the sheet is not.

   `settle` then eases the transform out over 160 ms, so the one case the
   formula cannot fix — a scroll CLAMPED at the end of the paper, where the
   anchor is unreachable and the residual is real — reads as a settle
   rather than a snap. In the common case it animates from zero to zero and
   nobody sees it.

   ══ WHY THE SCROLLS ARE FROZEN FOR THE DURATION ══
   A `ScrollView`'s own pan recogniser happily tracks two fingers, so
   without this the paper would scroll AND scale, at different rates,
   fighting over the same drag. Same family of bug as the two in
   `EcgReviewSheet`'s header, and the same fix: take the gesture away from
   the scroll before it can claim it.
   ================================================================== */

import { useCallback, useMemo, useRef, useState } from 'react';
import type { ScrollView } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';
import { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

/** How long the transform takes to hand back to the scroll views. */
const SETTLE_MS = 160;

/** Below this, a commit would change nothing anybody could see. */
const MM_EPSILON = 0.25;

export interface SheetPinchArgs {
  /** Viewport, in points. Zero before the first layout. */
  box: { width: number; height: number };
  /** The committed zoom: millimetres of paper across the viewport. */
  windowMm: number;
  /** Points per millimetre at the committed zoom. */
  ptPerMm: number;
  /** Total paper laid out, in mm, at the committed zoom. */
  paperMm: number;
  /** Height of one lead band, in mm, and how many there are. */
  stripHeightMm: number;
  leadCount: number;
  /** How far the zoom may travel. The gesture is clamped to these, so it
      meets a wall at the limits instead of committing to a rejected value. */
  minMm: number;
  maxMm: number;
  /** Commit. Called ONCE, on release. */
  onCommit: (windowMm: number) => void;
}

export function useSheetPinch({
  box,
  windowMm,
  ptPerMm,
  paperMm,
  stripHeightMm,
  leadCount,
  minMm,
  maxMm,
  onCommit,
}: SheetPinchArgs) {
  const hScrollRef = useRef<ScrollView>(null);
  const vScrollRef = useRef<ScrollView>(null);
  /** Freezes both scrolls. React state, because `scrollEnabled` is a prop. */
  const [pinching, setPinching] = useState(false);

  /* Where the scrolls actually are. Written from their `onScroll`, and
     written OPTIMISTICALLY by the commit — see `commit` for why that is
     not a lie: it writes the value it is about to clamp the scroll to. */
  const scrollX = useSharedValue(0);
  const scrollY = useSharedValue(0);

  /** The paper position under the fingers, in mm. Survives the zoom. */
  const anchorMmX = useSharedValue(0);
  const anchorMmY = useSharedValue(0);
  /** Where the fingers are now, in viewport points. */
  const focalX = useSharedValue(0);
  const focalY = useSharedValue(0);
  /** The zoom the fingers are asking for, live. */
  const liveMm = useSharedValue(windowMm);
  /** 1 while the transform is in charge, 0 once the scrolls are. */
  const settle = useSharedValue(0);
  /* `onStart` ran and took an anchor. Without it, a gesture that began
     before the first layout (no `ptPerMm`, so no anchor to take) would
     still reach `onEnd` and commit a zoom measured from nothing. */
  const armed = useSharedValue(false);

  /* What the commit is waiting to apply to the scroll views. A ref rather
     than state: it must not cause a render of its own, and it is consumed
     by the layout effect that runs on the render the COMMIT causes. */
  const pending = useRef<{ x: number; y: number } | null>(null);

  const commit = useCallback(
    (targetMm: number, fx: number, fy: number, aMmX: number, aMmY: number) => {
      const target = Math.min(maxMm, Math.max(minMm, targetMm));
      /* Nothing to commit — the gesture was a nudge, or it spent the whole
         time against a limit. The parent will not re-render, so the layout
         effect below will not run, so the transform has to be released from
         here or it would stay applied over a sheet nobody is pinching. That
         is not hypothetical: it is what a pinch that bottoms out at
         MIN_WINDOW_MM does. */
      if (Math.abs(target - windowMm) < MM_EPSILON) {
        settle.value = withTiming(0, { duration: SETTLE_MS });
        return;
      }

      const nextPtPerMm = box.width / target;
      const maxX = Math.max(0, Math.max(paperMm, target) * nextPtPerMm - box.width);
      const maxY = Math.max(0, stripHeightMm * nextPtPerMm * leadCount - box.height);
      const x = Math.min(maxX, Math.max(0, aMmX * nextPtPerMm - fx));
      const y = Math.min(maxY, Math.max(0, aMmY * nextPtPerMm - fy));

      pending.current = { x, y };
      /* ★ Told BEFORE the scroll view is. The transform reads these to work
         out how much of the anchoring it still has to do itself, and the
         values written here are exactly the ones the scroll is about to be
         clamped to — so by the time the new layout lands the formula has
         already resolved to zero, instead of describing the sheet's old
         position for however many frames the scroll takes to arrive. */
      scrollX.value = x;
      scrollY.value = y;
      onCommit(target);
    },
    [
      box.width,
      box.height,
      paperMm,
      stripHeightMm,
      leadCount,
      minMm,
      maxMm,
      windowMm,
      onCommit,
      scrollX,
      scrollY,
      settle,
    ],
  );

  /**
   * Apply the scroll the commit worked out, and release the transform.
   * The caller runs this from a layout effect keyed on `windowMm`, i.e. on
   * the render the commit caused, once the tiles have their new sizes.
   */
  const applyPending = useCallback(() => {
    const p = pending.current;
    if (!p) return;
    pending.current = null;
    hScrollRef.current?.scrollTo({ x: p.x, animated: false });
    vScrollRef.current?.scrollTo({ y: p.y, animated: false });
    settle.value = withTiming(0, { duration: SETTLE_MS });
  }, [settle]);

  const noteScrollX = useCallback(
    (x: number) => {
      scrollX.value = x;
    },
    [scrollX],
  );
  const noteScrollY = useCallback(
    (y: number) => {
      scrollY.value = y;
    },
    [scrollY],
  );

  /* ⚠️ MEMOISED, AND NOT ON `pinching`. The sheet's header records what a
     responder rebuilt mid-gesture costs, and the same trap is reachable
     here from a different direction: `onBegin` sets React state, that state
     re-renders this component, and an un-memoised builder would hand
     `GestureDetector` a brand-new gesture in the middle of a live pinch.

     Everything the gesture MUTATES lives in shared values, which survive a
     rebuild; everything it READS is a prop that cannot change while two
     fingers are down (the commit is the only thing that moves `windowMm`,
     and it happens on release). So the dependency list is exactly those
     reads — no more, so a re-render cannot churn it, and no fewer, so the
     next gesture cannot run on last gesture's zoom. */
  const gesture = useMemo(
    () =>
      Gesture.Pinch()
        /* ★ FREEZE ON `onBegin`, ANCHOR ON `onStart`, and they are different
           moments on purpose. `onBegin` is the second finger touching down;
           `onStart` is the pinch being recognised, which needs movement. A
           `ScrollView` will happily start panning in between, and taking its
           scroll away at the earlier of the two is what stops the paper
           scrolling and scaling at once. */
        .onBegin(() => {
          runOnJS(setPinching)(true);
        })
        .onStart((e) => {
          if (ptPerMm <= 0) return;
          /* mm, not points: the one coordinate the zoom does not change. */
          anchorMmX.value = (scrollX.value + e.focalX) / ptPerMm;
          anchorMmY.value = (scrollY.value + e.focalY) / ptPerMm;
          focalX.value = e.focalX;
          focalY.value = e.focalY;
          liveMm.value = windowMm;
          settle.value = 1;
          armed.value = true;
        })
        .onUpdate((e) => {
          if (!armed.value) return;
          /* Clamped HERE rather than at the commit, so the sheet stops moving
             when the limit is reached. A gesture that keeps responding and
             then quietly discards the excess on release feels broken. */
          liveMm.value = Math.min(maxMm, Math.max(minMm, windowMm / e.scale));
          focalX.value = e.focalX;
          focalY.value = e.focalY;
        })
        .onEnd((_e, success) => {
          if (!success || !armed.value) return;
          runOnJS(commit)(
            liveMm.value,
            focalX.value,
            focalY.value,
            anchorMmX.value,
            anchorMmY.value,
          );
        })
        .onFinalize((_e, success) => {
          runOnJS(setPinching)(false);
          /* Cancelled — an interrupting touch, a navigation. Put the sheet
             back rather than leaving it half-zoomed with nothing coming. */
          if (!success && armed.value) settle.value = withTiming(0, { duration: SETTLE_MS });
          armed.value = false;
        }),
    [
      windowMm,
      ptPerMm,
      minMm,
      maxMm,
      commit,
      anchorMmX,
      anchorMmY,
      focalX,
      focalY,
      liveMm,
      settle,
      armed,
      scrollX,
      scrollY,
    ],
  );

  /* ⚠️ `[windowMm, ptPerMm]` is load-bearing. The worklet CAPTURES them, so
     the commit's re-render rebuilds it with the new zoom in the same React
     commit that re-lays out the tiles — which is what makes `k` exactly 1 at
     that instant instead of one frame later. Drop the deps and the sheet is
     drawn double-scaled for a frame on every pinch. */
  const rowStyle = useAnimatedStyle(() => {
    const s = settle.value;
    if (s === 0 || ptPerMm <= 0) {
      return { transform: [{ translateX: 0 }, { translateY: 0 }, { scale: 1 }] };
    }
    const k = windowMm / liveMm.value;
    /* The horizontal scroll lives INSIDE the transformed row and the
       vertical one OUTSIDE it, which is why the two lines are not
       symmetrical. They are the same equation solved for a different
       origin; see the header. */
    const tx = focalX.value - k * (anchorMmX.value * ptPerMm - scrollX.value);
    const ty = focalY.value + scrollY.value - k * (anchorMmY.value * ptPerMm);
    return {
      transform: [{ translateX: tx * s }, { translateY: ty * s }, { scale: 1 + (k - 1) * s }],
    };
  }, [windowMm, ptPerMm]);

  return {
    gesture,
    rowStyle,
    pinching,
    hScrollRef,
    vScrollRef,
    noteScrollX,
    noteScrollY,
    applyPending,
  };
}

// v1.0.0 — Pinch-to-zoom on the review sheet: a UI-thread transform while the
//          fingers are down, one committed `windowMm` when they lift. The
//          anchor is kept in paper millimetres, so the hand-off to the scroll
//          views cannot flash however late the scroll lands.
