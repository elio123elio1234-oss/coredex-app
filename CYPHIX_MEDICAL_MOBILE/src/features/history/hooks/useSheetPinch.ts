/* ==================================================================
   useSheetPinch — two fingers on the ECG sheet, the way two fingers
   work on a photograph.

   ══ WHY IT CANNOT SIMPLY DRIVE `windowMm` ══
   The obvious implementation is to set the zoom from the gesture, frame
   by frame, exactly as the +/− buttons do. It would be honest and it
   would be a slideshow.

   Zoom on this sheet is a LAYOUT quantity: `ptPerMm = viewport / windowMm`
   decides the width of every tile and the height of every band, so
   changing it re-lays out and re-rasterises 24 `<Svg>` views — six leads ×
   four tiles — each carrying a millimetre grid and a decimated trace. The
   path STRINGS are already memoised on geometry that excludes the zoom
   (see `EcgReviewStrip`), so nothing is rebuilt in JS — but
   react-native-svg still redraws every tile when its size changes, and
   sixty times a second is not what that library is for.

   So: a transform on the UI thread while the fingers are down, and one
   committed `windowMm` when they lift.

   ══════════════════════════════════════════════════════════════════
   ★ v2.0.0 — WHY THE FIRST VERSION WAS A MESS, IN THREE PARTS
   ══════════════════════════════════════════════════════════════════
   Reported from the phone with four screenshots: *"it is not stable at
   all, not smooth at all, there are glitches."* All three causes were
   here, and none of them was the maths.

   ① **`transformOrigin` NEVER APPLIED.** v1 set `transformOrigin: 'left
      top'` in a StyleSheet and wrote every equation for a top-left
      origin. Reanimated's `transformOrigin` support lives in its CSS
      engine (`src/css/`), not on the `useAnimatedStyle` path — so the row
      scaled about its CENTRE while the algebra assumed a corner. That is
      the screenshot of the whole sheet shrunk into the middle of the card
      with white all round it, and the one with the paper shoved right
      leaving a white column under the lead labels.

      ⚠️ THE FIX IS NOT TO MAKE `transformOrigin` WORK. It is to stop
      depending on it: React Native's own default is the centre, that is
      the one behaviour guaranteed everywhere, so the centre is folded
      into the equations and the style property is gone. If a later
      version reintroduces `transformOrigin`, every sign below is wrong.

   ② **THE GESTURE WAS REBUILT ON EVERY RENDER.** v1 memoised it — and put
      `commit` in the dependency list, which depends on `onCommit`, which
      the screen passed as a fresh arrow (`onZoomCommit={(mm) => …}`). So
      the memo hit never happened, and `onBegin` → `setPinching(true)` →
      re-render handed `GestureDetector` a brand-new gesture in the middle
      of a live pinch. The file it lives in has carried a warning about
      exactly this since v0.16.0, for `PanResponder`. The screen memoises
      its callback now, and this hook no longer captures anything that
      changes per render.

   ③ **A STALE `liveMm` LEFT A TRANSFORM BEHIND.** The scale was
      `windowMm / liveMm`, and `liveMm` only moves during a pinch — so
      pressing + or Fit afterwards made those two disagree and the sheet
      was drawn scaled with nobody touching it. There is an explicit
      `active` flag now: zero means identity, full stop, and it is the
      first thing the worklet reads.

   ══ THE SHAPE OF THE FIX: EVERYTHING IS A CONSTANT ══
   The transform is now a pure function of the live scale `k` and of
   values captured ONCE, at `onStart`. It reads no scroll offset, no
   layout, nothing that can move underneath it. A gesture cannot drift,
   because there is nothing left for it to drift against.

       tx = (1 − k) · (fx0 − rowW/2)
       ty = (1 − k) · (fy0 + scrollY0 − rowH/2)

   Both are the same statement — *hold the point that was under the
   fingers still while everything scales about the view's centre* — solved
   once for a row whose horizontal scroll is INSIDE it and whose vertical
   scroll is OUTSIDE it. That asymmetry is the only reason the two lines
   differ, and it is why `scrollY0` appears in one and not the other.

   ══ AND WHY IT LANDS WITHOUT A SNAP ══
   On release the committed zoom is exactly the zoom the fingers asked for
   (both are clamped to the same bounds, so the clamp cannot introduce a
   difference). So on the render the commit causes, `k` is exactly 1,
   which makes `tx` and `ty` exactly 0 — the transform resolves to
   identity in the SAME React commit that re-lays out the tiles, rather
   than one frame later. `[windowMm]` on the worklet is what makes that
   true; drop it and the sheet is drawn double-scaled for a frame.

   ⚠️ One consequence of the two-phase design, and it is the standard one:
   **pinching OUT does not reveal more paper until you let go.** There is
   no more content inside a transform to show, so the strip shrinks with
   blank around it and the extra seconds appear on release. A photograph
   behaves the same way; the alternative is the slideshow at the top.
   ================================================================== */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { LayoutChangeEvent, ScrollView } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';
import { runOnJS, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

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
  /**
   * Commit. Called ONCE, on release.
   *
   * ⚠️ MUST BE STABLE (`useCallback`). A fresh arrow here re-creates the
   * gesture on every render — see ② in the header, which is what a fresh
   * arrow cost the first time.
   */
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

  /* Where the scrolls are. Mirrored into shared values because `onStart` is
     a worklet and cannot read a ref — and read ONLY there, once, so a stale
     frame during a flick can cost at most the start of one gesture and can
     never accumulate. */
  const scrollXRef = useRef(0);
  const scrollYRef = useRef(0);
  const scrollX = useSharedValue(0);
  const scrollY = useSharedValue(0);

  /* The transformed row's own layout size. Measured rather than inferred:
     the equations need its CENTRE, and guessing it from the viewport is
     right for the width and wrong for the height the moment the sheet is
     taller than the screen — which is most zoom levels. */
  const rowW = useSharedValue(0);
  const rowH = useSharedValue(0);

  /* ── Captured at `onStart`, constant for the gesture ── */
  const fx0 = useSharedValue(0);
  const fy0 = useSharedValue(0);
  const sx0 = useSharedValue(0);
  const sy0 = useSharedValue(0);
  /** The zoom the fingers are asking for, live. */
  const liveMm = useSharedValue(windowMm);
  /** 1 while the transform is in charge. 0 means identity, unconditionally. */
  const active = useSharedValue(0);

  /* ⚠️ THE PROPS THE WORKLETS NEED, MIRRORED — AND DECLARED UP HERE FOR A
     REASON. Reanimated's plugin captures a worklet's closure BY VALUE when
     the worklet is created, so a shared value referenced by the gesture
     below must already exist when the `useMemo` factory runs. Declared
     underneath it, they would be read in the temporal dead zone.
     Synced from an effect rather than written during render, which
     Reanimated warns about — and harmless here, because none of the three
     can change while two fingers are down. */
  const windowMmSv = useSharedValue(windowMm);
  const minMmSv = useSharedValue(minMm);
  const maxMmSv = useSharedValue(maxMm);
  useEffect(() => {
    windowMmSv.value = windowMm;
    minMmSv.value = minMm;
    maxMmSv.value = maxMm;
  }, [windowMm, minMm, maxMm, windowMmSv, minMmSv, maxMmSv]);

  /* What the commit is waiting to apply to the scroll views. A ref, so it
     causes no render of its own; consumed by the layout effect that runs on
     the render the COMMIT causes. */
  const pending = useRef<{ x: number; y: number } | null>(null);

  const onRowLayout = useCallback(
    (e: LayoutChangeEvent) => {
      /* The LAYOUT size, which is what `onLayout` reports — a transform does
         not change it. That is exactly what the centre-origin maths wants. */
      rowW.value = e.nativeEvent.layout.width;
      rowH.value = e.nativeEvent.layout.height;
    },
    [rowW, rowH],
  );

  const release = useCallback(() => {
    active.value = 0;
  }, [active]);

  /* ⚠️ Everything `commit` reads is boxed in a ref, so the callback itself
     never changes identity and the gesture below can be memoised for real.
     v1 put these values in a dependency list and rebuilt the gesture on
     every render — see ② in the header. */
  const geo = useRef({ box, windowMm, paperMm, stripHeightMm, leadCount, minMm, maxMm, onCommit });
  useEffect(() => {
    geo.current = { box, windowMm, paperMm, stripHeightMm, leadCount, minMm, maxMm, onCommit };
  }, [box, windowMm, paperMm, stripHeightMm, leadCount, minMm, maxMm, onCommit]);

  const commit = useCallback(
    (targetMm: number, fx: number, fy: number, startX: number, startY: number) => {
      const g = geo.current;
      const target = Math.min(g.maxMm, Math.max(g.minMm, targetMm));
      /* Nothing to commit — a nudge, or a gesture spent entirely against a
         limit. The screen will not re-render, so the transform has to be let
         go from here or it would stay applied over a sheet nobody is
         pinching. Not hypothetical: it is what pinching past MIN does. */
      if (Math.abs(target - g.windowMm) < MM_EPSILON || g.box.width <= 0) {
        release();
        return;
      }

      /* Points grow by exactly the ratio the window shrank by. */
      const kEff = g.windowMm / target;
      const nextPtPerMm = g.box.width / target;
      const maxX = Math.max(0, Math.max(g.paperMm, target) * nextPtPerMm - g.box.width);
      const maxY = Math.max(0, g.stripHeightMm * nextPtPerMm * g.leadCount - g.box.height);

      pending.current = {
        x: Math.min(maxX, Math.max(0, (startX + fx) * kEff - fx)),
        y: Math.min(maxY, Math.max(0, (startY + fy) * kEff - fy)),
      };
      g.onCommit(target);

      /* ★ THE BACKSTOP, AND IT IS NOT PARANOIA. Everything above assumes
         the screen accepts the commit and re-renders, which is what frees
         the transform. If anything swallows it — a clamp upstream, an
         unmounted screen, a value the reducer decides is equal — v1 left the
         sheet permanently scaled, with no way back but leaving the study.
         Two frames later, if nobody consumed the pending scroll, let go
         anyway: a zoom that did not take is a disappointment, a sheet stuck
         at 0.4× is a broken screen. */
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          if (!pending.current) return;
          pending.current = null;
          release();
        }),
      );
    },
    [release],
  );

  /**
   * Apply the scroll the commit worked out, and let the transform go.
   * The caller runs this from a layout effect keyed on `windowMm` — i.e. on
   * the render the commit caused, once the tiles have their new sizes, which
   * is the earliest a `scrollTo` can land where it is asked to rather than be
   * clamped against the old content width.
   *
   * ★ It runs on EVERY zoom change, not only a pinch's: `release()` is what
   * guarantees a +/− or Fit can never be drawn through a transform left over
   * from a previous gesture (③ in the header).
   */
  const onZoomChanged = useCallback(() => {
    const p = pending.current;
    pending.current = null;
    if (p) {
      hScrollRef.current?.scrollTo({ x: p.x, animated: false });
      vScrollRef.current?.scrollTo({ y: p.y, animated: false });
      scrollXRef.current = p.x;
      scrollYRef.current = p.y;
      scrollX.value = p.x;
      scrollY.value = p.y;
    }
    release();
  }, [release, scrollX, scrollY]);

  const noteScrollX = useCallback(
    (x: number) => {
      scrollXRef.current = x;
      scrollX.value = x;
    },
    [scrollX],
  );
  const noteScrollY = useCallback(
    (y: number) => {
      scrollYRef.current = y;
      scrollY.value = y;
    },
    [scrollY],
  );

  /* ⚠️ MEMOISED ON `[commit, release]` — BOTH OF WHICH ARE STABLE FOR THE
     LIFE OF THE SCREEN. That is the point: `onBegin` sets React state, so
     the component re-renders mid-pinch, and a gesture rebuilt then is the
     v0.16.0 trap in a new costume. Everything the worklets read is either a
     shared value (survives anything) or boxed in `geo` (read at call time,
     never captured). */
  const gesture = useMemo(
    () =>
      Gesture.Pinch()
        /* ★ FREEZE ON `onBegin`, ANCHOR ON `onStart`, and they are different
           moments on purpose. `onBegin` is the second finger touching down;
           `onStart` is the pinch being recognised, which needs movement. A
           ScrollView will happily start panning in between, and taking its
           scroll away at the earlier of the two is what stops the paper
           scrolling and scaling at once. */
        .onBegin(() => {
          runOnJS(setPinching)(true);
        })
        .onStart((e) => {
          /* Every value the transform will use, taken once. Nothing below
             re-reads the scroll or the layout, so nothing can drift. */
          fx0.value = e.focalX;
          fy0.value = e.focalY;
          sx0.value = scrollX.value;
          sy0.value = scrollY.value;
          liveMm.value = windowMmSv.value;
          active.value = 1;
        })
        .onUpdate((e) => {
          if (active.value === 0) return;
          /* Clamped HERE rather than at the commit, so the sheet stops moving
             when a limit is reached — and so the commit's clamp can never
             disagree with the gesture, which is what keeps `k` exactly 1 on
             the landing render. */
          const min = minMmSv.value;
          const max = maxMmSv.value;
          liveMm.value = Math.min(max, Math.max(min, windowMmSv.value / e.scale));
        })
        .onEnd((_e, success) => {
          if (!success || active.value === 0) return;
          runOnJS(commit)(liveMm.value, fx0.value, fy0.value, sx0.value, sy0.value);
        })
        .onFinalize((_e, success) => {
          runOnJS(setPinching)(false);
          /* Cancelled — an interrupting touch, a navigation away. Put the
             sheet back rather than leaving it half-zoomed with no commit
             coming to release it. A successful end is released by the commit
             (or by its backstop). */
          if (!success) runOnJS(release)();
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [commit, release],
  );

  /* ⚠️ `[windowMm]` is load-bearing. The worklet CAPTURES it, so the commit's
     re-render rebuilds this with the new zoom in the same React commit that
     re-lays out the tiles — which is what makes `k` exactly 1 at that instant
     instead of one frame later. */
  const rowStyle = useAnimatedStyle(() => {
    /* ① The unconditional escape. Anything that is not a live pinch is
       identity, whatever the other values happen to hold. */
    if (active.value === 0) {
      return { transform: [{ translateX: 0 }, { translateY: 0 }, { scale: 1 }] };
    }
    const k = windowMm / liveMm.value;
    /* ② React Native's DEFAULT transform origin is the view's centre, and
       these two lines are written for it. See ① in the header for what
       assuming a corner cost. */
    const tx = (1 - k) * (fx0.value - rowW.value / 2);
    const ty = (1 - k) * (fy0.value + sy0.value - rowH.value / 2);
    return { transform: [{ translateX: tx }, { translateY: ty }, { scale: k }] };
  }, [windowMm]);

  return {
    gesture,
    rowStyle,
    pinching,
    hScrollRef,
    vScrollRef,
    scrollXRef,
    scrollYRef,
    noteScrollX,
    noteScrollY,
    onRowLayout,
    onZoomChanged,
  };
}

// v2.0.0 — Reported as unstable, with screenshots, and all three causes were
//          here. (1) `transformOrigin: 'left top'` never applied — Reanimated
//          honours it only on its CSS engine, not on `useAnimatedStyle` — so
//          the row scaled about its CENTRE against algebra written for a
//          corner. The centre is folded into the equations now and the style
//          property is gone, because the default is the one behaviour
//          guaranteed everywhere. (2) The gesture was rebuilt on every render
//          (a fresh `onCommit` arrow defeated the memo), including mid-pinch.
//          (3) A stale `liveMm` left the sheet scaled after a +/− or Fit; an
//          explicit `active` flag now means identity, unconditionally.
//          The transform is a pure function of the live scale and values
//          captured once at `onStart`: it reads no scroll and no layout while
//          running, so it has nothing left to drift against.
// v1.0.0 — Pinch-to-zoom on the review sheet: a UI-thread transform while the
//          fingers are down, one committed `windowMm` when they lift.
