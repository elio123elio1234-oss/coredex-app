/* ==================================================================
   ThinkingOrb (atom) — the `thinking-orbs` animation, painted with Skia.

   ══════════════════════════════════════════════════════════════════
   ★ WHY THE PACKAGE'S OWN COMPONENT IS NOT USED, AND CANNOT BE
   ══════════════════════════════════════════════════════════════════
   `thinking-orbs` ships a React component, and it is a WEB component.
   Its README says so in the first sentence — "rendered on a plain 2D
   canvas … works identically in Chrome, Safari and Firefox" — and the
   published bundle backs it up: `<canvas>.getContext('2d')`,
   `matchMedia` (six call sites, for the auto theme),
   `document.visibilityState`, `devicePixelRatio`. None of those exist
   in React Native. `import { ThinkingOrb } from 'thinking-orbs'` does
   not render badly here; it throws.

   ★ But the author separated the maths from the paint ON PURPOSE, and
   said who for. From `engine/registry.d.ts`:

       "The portable surface: pure geometry, no canvas. The React Native
        port imports exactly these functions, so its output is identical
        to the web's by construction rather than by re-implementation."

   and from `engine/core.d.ts`, on `finalizeFrame`:

       "…every value is final and the array order is the order to draw
        in. That is what lets the RN and SwiftUI ports share this output
        verbatim — a port draws the list, it never re-derives anything."

   So this file is that port, and it is deliberately STUPID: it asks
   `MODE_FRAMES[mode](size, t, opts)` for a finished frame and draws the
   list. It computes no geometry, sorts nothing, and re-derives nothing.
   Every tuning decision stays in the package, which is the only way an
   upgrade can ever be a version bump rather than a re-port.

   ⚠️ The import is `thinking-orbs/engine`, never `thinking-orbs`. The
   root entry is the web component. The subpath is a separate bundle
   with **zero** DOM references (verified against the published tarball,
   not inferred from the docs), and `sideEffects: false`, so nothing of
   the web half can be dragged in by accident. Metro resolves it because
   `unstable_enablePackageExports` is on by default from SDK 53.

   ── WHY SKIA AND NOT SVG OR VIEWS ──
   A frame is 100–200 dots. As `<View>`s or `react-native-svg` nodes
   that is 200 nodes through React reconciliation per frame; as one Skia
   `Picture` it is 200 `drawCircle` calls inside a single native node,
   and the tree never changes shape. Skia is already a dependency (root
   `CLAUDE.md` §3.1, it draws the ECG).

   ══════════════════════════════════════════════════════════════════
   ★ WHY THE GEOMETRY RUNS ON THE JS THREAD, WHICH LOOKS WRONG
   ══════════════════════════════════════════════════════════════════
   `ModeFrame` is documented as "closure-free and Math-only so the same
   function can run inside a Reanimated worklet on the React Native UI
   thread" — so the obvious build is a worklet, and it is not available
   to us. Workletisation is a BUILD step: the Babel plugin transforms
   functions carrying `'worklet'` in **our** source. An imported
   third-party function has no directive and cannot be given one, and
   calling a plain function from a worklet throws rather than falling
   back. Shipping that discovery from the device is a wasted release.

   So the frame is built in JS and handed to Skia as a finished
   `SkPicture`. That is honest for THIS screen and would not be for a
   scroll: the caller shows this while waiting on a cold server — the
   thread is blocked on a socket, not on work — and `BootSplash` only
   raises the orb after the fast path is over, precisely because the
   first two seconds are the busy ones.

   ⚠️ If this is ever wanted somewhere the JS thread is working, the fix
   is NOT to move the loop — it is to re-implement the nine modes as
   worklets, and the package publishes golden vectors for exactly that.

   ⚠️ AND IT IS BOUNDED WORK. Each frame builds a fresh `SkPicture`, a
   native object freed by JS garbage collection rather than promptly. At
   30 fps that is ~1 800 small pictures a minute, which is fine for a
   splash that has a 60 s ceiling over it (`RECOVERY_TIMEOUT_MS`) and is
   NOT fine as ambient chrome somewhere it could run for an hour.
   ================================================================== */

import { Canvas, Picture, PaintStyle, Skia, createPicture } from '@shopify/react-native-skia';
import type { SkPicture } from '@shopify/react-native-skia';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { MODE_FRAMES, resolvePreset, type OrbState } from 'thinking-orbs/engine';

/**
 * The two design sizes the package actually ships, in its own units.
 *
 * ★ NEITHER IS "the size on screen". From its own type docs: "64
 * (chat-avatar scale) and 20 (inline-text scale). Each size carries its
 * own dot count, dot size and speed tuning — **they are separate
 * designs, not a scale factor**."
 *
 * So the geometry is always asked for at one of these two, and the
 * PICTURE is scaled to whatever the screen needs. Asking for geometry at
 * an arbitrary 132 px would apply 64's tuning to a frame it was not
 * tuned for; scaling the picture enlarges a tuned design as vectors
 * instead of inventing an untuned one.
 *
 * ⚠️ And picking the WRONG one of the two is how a small orb turns to
 * mush. The 64 design puts ~566 dots on a ribbon at radius multiplier
 * 0.395; scaled to a 28 pt badge those dots land at a fraction of a
 * pixel each. The 20 design carries roughly half the dots at 1.011 — it
 * is drawn sparser and fatter precisely so it survives being small.
 * Callers pick by FOOTPRINT, not by preference.
 */
export type OrbDesign = 64 | 20;

/**
 * Frame interval. 30 fps, not 60, and that is a choice rather than a
 * limit: this runs on the JS thread (see the header), the orb is a
 * waiting indicator rather than something a finger is tracking, and
 * halving the rate halves the cost of being wrong about how idle the
 * thread really is. Dots drifting at 30 fps read as smooth; the artefact
 * that gives a low rate away is a hard edge crossing the screen, and
 * there are none here.
 */
const FRAME_MS = 33;

interface Props {
  /** Which of the nine animations. See `thinking-orbs`' own type. */
  state: OrbState;
  /** Rendered edge length in points. The design is scaled to it. */
  size: number;
  /**
   * Which of the package's two tuned designs to draw. Choose by the
   * FOOTPRINT this will occupy, not by taste: `20` up to roughly 40 pt,
   * `64` above it. See `OrbDesign`.
   */
  design?: OrbDesign;
  /** The darkest ink — what a dot at the FRONT of the orb is painted. */
  ink: string;
  /** The page behind it. A dot at the BACK fades into this. */
  paper: string;
  /** Multiplier on the preset's own speed. */
  speed?: number;
}

/** `#RRGGBB` → normalised RGB, once per colour rather than per dot. */
function rgb(hex: string): [number, number, number] {
  const c = Skia.Color(hex);
  return [c[0] ?? 0, c[1] ?? 0, c[2] ?? 0];
}

export default function ThinkingOrb({ state, size, design = 64, ink, paper, speed = 1 }: Props) {
  const [picture, setPicture] = useState<SkPicture | null>(null);
  const preset = useMemo(() => resolvePreset(state, design), [state, design]);
  const near = useMemo(() => rgb(ink), [ink]);
  const far = useMemo(() => rgb(paper), [paper]);

  /* Live refs so the animation loop is started ONCE. In the dependency
     array these would tear down the timer and restart the clock on every
     parent render — the orb would stutter for a reason with nothing to do
     with the orb. Same lesson as `OverlayLayer`'s back-button listener. */
  const look = useRef({ preset, near, far, size, speed, design });
  look.current = { preset, near, far, size, speed, design };

  useEffect(() => {
    /* One Paint and one colour buffer for the whole animation. `setColor`
       takes a Float32Array, so a fresh colour per dot would be ~200
       allocations per frame, 6 000 a second, all of them garbage. */
    const brush = Skia.Paint();
    brush.setAntiAlias(true);
    const color = new Float32Array(4);

    const started = Date.now();
    let live = true;

    const tick = () => {
      if (!live) return;
      const { preset: p, near: n, far: f, size: s, speed: sp, design: dz } = look.current;
      const t = ((Date.now() - started) / 1000) * p.speed * sp;
      const frame = MODE_FRAMES[p.mode](dz, t, p.opts);
      const scale = s / dz;

      /* `white` is the package's ink value: 0 = darkest = nearest. On a
         light page that maps straight onto "how much of the paper shows
         through", so the depth language survives verbatim and the orb is
         drawn in the brand's ink rather than in generic grey. */
      const paintDepth = (white: number, alpha: number) => {
        color[0] = n[0] + (f[0] - n[0]) * white;
        color[1] = n[1] + (f[1] - n[1]) * white;
        color[2] = n[2] + (f[2] - n[2]) * white;
        color[3] = alpha;
        brush.setColor(color);
      };

      setPicture(
        createPicture(
          (canvas) => {
            canvas.scale(scale, scale);
            /* Lines first, so nodes sit on top of their own edges — the
               package's `paintFrame` draws them in this order and the
               `connecting` mode depends on it. */
            brush.setStyle(PaintStyle.Stroke);
            for (const l of frame.lines) {
              paintDepth(l.white, l.a ?? 1);
              brush.setStrokeWidth(l.w);
              canvas.drawLine(l.x1, l.y1, l.x2, l.y2, brush);
            }
            brush.setStyle(PaintStyle.Fill);
            /* Array order IS draw order — already z-sorted far→near by
               `finalizeFrame`. Re-sorting here would be re-deriving. */
            for (const d of frame.dots) {
              paintDepth(d.white, d.a ?? 1);
              canvas.drawCircle(d.x, d.y, d.r, brush);
            }
          },
          { width: s, height: s },
        ),
      );
    };

    tick();
    const timer = setInterval(tick, FRAME_MS);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, []);

  return (
    <View style={{ width: size, height: size }} pointerEvents="none">
      <Canvas style={StyleSheet.absoluteFill}>
        {/* Nothing until the first frame exists. `Picture` will not take a
            null, and an empty placeholder picture would be one more object
            per mount for a single frame nobody sees. */}
        {picture && <Picture picture={picture} />}
      </Canvas>
    </View>
  );
}

// v1.0.0 — The `thinking-orbs` animation on Skia. The package's own component is
//          a WEB component (canvas 2D, matchMedia, document) and throws in React
//          Native — but its author split the geometry out for exactly this, and
//          says so in `engine/registry.d.ts`: "the React Native port imports
//          exactly these functions". So this draws the finished frame and
//          derives nothing, which keeps an upgrade a version bump. Imports
//          `thinking-orbs/engine` (verified DOM-free against the published
//          tarball), never the root entry. The geometry runs on the JS thread
//          because workletising an imported function is impossible — the Babel
//          plugin only transforms our own source — and that is acceptable only
//          because the caller shows this while blocked on a socket.
