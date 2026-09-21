/* ==================================================================
   BorderBeam (atom) — a coloured light that runs around a rounded box's
   border.

        ╭━━━━┓────────────╮      the lit arc travels; the rest of the
        │                 │      edge stays a quiet hairline
        ╰─────────────────╯

   ══ WHY THIS IS A PORT AND NOT AN INSTALL ══
   Asked for as *"npm install border-beam"*, and that package cannot run
   here. Unlike `thinking-orbs` — by the same author, and split into a
   portable `engine` precisely so the React Native port could share it —
   `border-beam` is CSS all the way down: `@keyframes` (21 of them),
   `conic-gradient`, `radial-gradient`, `filter: blur()/hue-rotate()`,
   `window.matchMedia`. React Native has none of those. There is no
   subpath to import and nothing to salvage but the DESIGN, so the
   package is NOT a dependency of this app and is not in `SOUP.md`.

   What IS taken from it, read out of the published bundle rather than
   eyeballed off a screenshot:

     • the `ocean` and `colorful` palettes;
     • the sweep's own ramp — transparent until 54 % of the turn, up
       through .1 / .3 / .6 to a .75 peak at 66 %, back down, gone by
       78 % — which is what gives the light a head and a tail instead of
       a hard edge;
     • 360° linear per `SPIN_MS`, default 1.96 s, the package's own
       `duration` default for the rotate family.

   ══ ★ HOW IT IS DRAWN — ONE STROKED PATH, NO MASKS ══
   The ring is a rounded-rectangle `Path` stroked with a `SweepGradient`.
   Three copies of it at different stroke widths and blurs make the bloom,
   the inner glow and the crisp edge. That is the whole scene.

   ⚠️ **THIS IS THE SECOND DESIGN, AND THE FIRST ONE IS WHY.** The CSS
   original is a fixed cloud of nine radial blobs with a conic WINDOW
   sweeping over it, so its light changes colour as it passes each corner.
   Reproducing that needs `ring ∩ window` as a mask, and two Skia builds
   of it rendered **nothing at all** on a device:

     1. the sweep painted into a `DiffRect` — a `DiffRect` carrying a
        shader child does not yield the alpha a `<Mask>` reads, though the
        same `DiffRect` with `color="white"` masks perfectly;
     2. the sweep as a second, nested `<Mask>` over a rotating square.

   `strength={4}` against both changed nothing, which is what ruled out
   "too faint" and pointed at the shape rather than the numbers. A third
   attempt rotated the cloud instead of the window — it drew, and it was
   both wrong (the colour travelled with the beam instead of belonging to
   the corner) and far too weak, because the package's blob sizes are
   ABSOLUTE PIXELS tuned for a ~400 pt card and this composer is nearly
   twice that.

   So the blobs are gone and the colour lives in the sweep itself. What
   that costs: the beam carries its own blue→purple gradient rather than
   picking up a different hue at each corner. What it buys: it draws, it
   is one primitive instead of six offscreen layers, and every part of it
   is something Skia is obviously good at.

   ⚠️ THE ROTATION IS WRITTEN OUT BY HAND, and that is load-bearing:

       translate(centre) · rotate(θ) · translate(−centre)

   `transform` + `origin` on a gradient was tried and made the beam
   vanish — a gradient's transform is a local matrix on shader space, and
   without an origin that actually wraps it the rotation happens about
   (0, 0), swinging the sweep's centre off the box entirely. Rotating the
   GROUP instead is not an option either: the ring would turn with it, and
   a rounded rectangle spinning inside the box it is meant to trace is not
   subtle.

   ══ ★ IT RUNS ON THE UI THREAD, AND THAT IS THE COST ARGUMENT ══
   `ThinkingOrb`'s header warns that its per-frame picture building is
   "fine for a splash that has a 60 s ceiling over it and NOT fine as
   ambient chrome somewhere it could run for an hour" — and a composer is
   exactly that kind of chrome. This beam is not built that way: the scene
   is declared ONCE and the only thing that changes per frame is one
   matrix, a Reanimated shared value Skia reads on the UI thread. React
   renders this component when its props change, not once per frame.

   Necessary and not sufficient, so it is also switched off: `active`
   gates the spin, and at rest the ring holds a fixed angle at
   `REST_OPACITY` — a static gradient edge that costs nothing.

   ⚠️ THREE THINGS THAT WOULD OTHERWISE BE MISSED
   • **Reduce Motion.** An animation that circles a text field is exactly
     what that setting exists to stop. Honoured live, not read once.
   • **Background.** A spin left running while the app is away is battery
     spent on nothing anyone can see.
   • **Zero size.** A measured width of 0 is not a measurement; drawing
     from it produces `NaN` geometry, and Skia is not obliged to survive
     that. It renders nothing until the parent has been laid out.
   ================================================================== */

import {
  Blur,
  Canvas,
  Group,
  Paint,
  Path,
  rect,
  rrect,
  Skia,
  SweepGradient,
  vec,
} from '@shopify/react-native-skia';
import { useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, AppState, StyleSheet } from 'react-native';
import {
  cancelAnimation,
  Easing,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

/** Which palette the light is painted in. */
export type BeamVariant = 'ocean' | 'colorful';

/**
 * ★ THE RAMP — the package's own conic window, with ITS colours in it.
 *
 * Transparent for three quarters of the turn, then a head-and-tail arc
 * whose alpha climbs .1 → .3 → .6 → .75 and back down. Those alpha numbers
 * are the package's; the colours are its palette spread across the lit arc
 * so the beam has a gradient of its own rather than being one flat hue.
 *
 * ⚠️ The ramp IS the effect. Widen it and the border simply glows all the
 * way round; square it off and the light stops reading as something moving
 * and becomes a lit segment being switched on and off.
 */
const STOPS = [0, 0.54, 0.57, 0.6, 0.63, 0.66, 0.69, 0.72, 0.75, 0.78, 1];
const ALPHA = [0, 0, 0.1, 0.3, 0.6, 0.75, 0.6, 0.3, 0.1, 0, 0];

/** `ocean` — blue into purple. The navy's own hue family, so the composer
    reads as expensive rather than as a toy. */
const OCEAN = [
  '60, 120, 255',
  '60, 120, 255',
  '60, 120, 255',
  '70, 130, 255',
  '100, 80, 220',
  '130, 70, 255',
  '140, 100, 240',
  '120, 80, 255',
  '90, 110, 230',
  '90, 110, 230',
  '90, 110, 230',
];

/** `colorful` — the package's rainbow, kept so the choice stays a prop. */
const COLORFUL = [
  '255, 50, 100',
  '255, 50, 100',
  '255, 50, 100',
  '255, 120, 40',
  '240, 50, 180',
  '180, 40, 240',
  '100, 70, 255',
  '40, 140, 255',
  '30, 185, 170',
  '30, 185, 170',
  '30, 185, 170',
];

const PALETTES: Record<BeamVariant, readonly string[]> = {
  ocean: OCEAN,
  colorful: COLORFUL,
};

/** 360° in 1.96 s, linear — the package's `duration` default. */
const SPIN_MS = 1960;

/**
 * The three passes over the same ring.
 *
 * ⚠️ Not three effects — one edge, drawn three times at widths an order
 * apart. The bloom is what the eye reads as "glowing", the core is what it
 * reads as "an edge", and dropping either leaves the other looking like a
 * mistake: bloom alone is a smudge with no object in it, core alone is a
 * coloured hairline nobody would call a glow.
 */
const BANDS = [
  { width: 14, blur: 9, dark: 0.5, light: 0.42 },
  { width: 5, blur: 3, dark: 0.7, light: 0.5 },
  { width: 1.6, blur: 0, dark: 1, light: 0.75 },
] as const;

/** Room for the halo outside the box. The canvas grows by this. */
const BLOOM_PAD = 22;

/** The edge at rest: present, coloured, and not moving. */
const REST_OPACITY = 0.3;
/** Long enough to read as the light coming up, short enough to feel instant. */
const FADE_MS = 420;

export interface BorderBeamProps {
  /** The box's own size in points, as measured by its parent. */
  width: number;
  height: number;
  /** The box's corner radius, so the ring follows the actual corners. */
  radius: number;
  /** True while the beam should TURN. False leaves a static lit edge. */
  active: boolean;
  variant?: BeamVariant;
  /** Which set of band opacities to use. */
  theme: 'dark' | 'light';
  /** Overall strength, 0–1 (or above, to push it). */
  strength?: number;
}

export default function BorderBeam({
  width,
  height,
  radius,
  active,
  variant = 'ocean',
  theme,
  strength = 1,
}: BorderBeamProps) {
  const spin = useSharedValue(0);
  const level = useSharedValue(active ? 1 : REST_OPACITY);

  /* ⚠️ REACT STATE, not a shared value. The spin effect below has to RE-RUN
     when this changes, and a shared value read during render neither
     re-renders nor re-runs an effect — the beam would keep turning for the
     rest of the session after the reader switched Reduce Motion on, which is
     the exact failure the setting exists to prevent. Live for the same
     reason: it can be switched while this screen is open. */
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    let alive = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((on) => {
      if (alive) setReduceMotion(on);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);

  /* ★ The spin is started and stopped here and nowhere else, so there is
     exactly one place that can leave it running. */
  useEffect(() => {
    const spinning = active && !reduceMotion;

    const start = () => {
      /* From wherever it stopped, never from 0 — restarting at zero snaps
         the light back to the top edge, which reads as a glitch rather than
         as the animation resuming. */
      spin.value = withRepeat(
        withTiming(spin.value + 1, { duration: SPIN_MS, easing: Easing.linear }),
        -1,
        false,
      );
    };
    const stop = () => cancelAnimation(spin);

    if (spinning) start();
    else stop();

    level.value = withTiming(active ? 1 : REST_OPACITY, { duration: FADE_MS });

    /* Backgrounded, nothing here is on screen and the shared value would
       keep being written for a view nobody can see. */
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        if (spinning) start();
      } else {
        stop();
      }
    });

    return () => {
      sub.remove();
      stop();
    };
  }, [active, reduceMotion, spin, level]);

  const cx = BLOOM_PAD + width / 2;
  const cy = BLOOM_PAD + height / 2;

  /**
   * ★ Rotate about the ring's centre, written out rather than delegated to
   * an `origin` prop — see the header. This is a SHADER transform: it turns
   * the gradient, and the path it is painted onto does not move.
   */
  const turn = useDerivedValue(
    () => [
      { translateX: cx },
      { translateY: cy },
      { rotate: spin.value * Math.PI * 2 },
      { translateX: -cx },
      { translateY: -cy },
    ],
    [cx, cy],
  );

  /** The rest/active fade, applied to the whole canvas rather than per band. */
  const fade = useDerivedValue(() => level.value, []);

  /* The ring itself. Inset by half the crisp stroke so the drawn edge sits
     ON the box's border rather than half outside it. */
  const ring = useMemo(() => {
    const inset = BANDS[BANDS.length - 1].width / 2;
    const p = Skia.Path.Make();
    p.addRRect(
      rrect(
        rect(
          BLOOM_PAD + inset,
          BLOOM_PAD + inset,
          Math.max(0, width - inset * 2),
          Math.max(0, height - inset * 2),
        ),
        Math.max(0, radius - inset),
        Math.max(0, radius - inset),
      ),
    );
    return p;
  }, [width, height, radius]);

  /* ⚠️ After the hooks, never before them: an early return above would make
     the hook order depend on whether the parent had been laid out yet. */
  if (!(width > 0) || !(height > 0)) return null;

  const rgb = PALETTES[variant];
  const colors = ALPHA.map((a, i) => `rgba(${rgb[i]}, ${a})`);

  return (
    <Canvas
      style={[
        styles.canvas,
        {
          width: width + BLOOM_PAD * 2,
          height: height + BLOOM_PAD * 2,
          left: -BLOOM_PAD,
          top: -BLOOM_PAD,
        },
      ]}
      pointerEvents="none"
    >
      {/* One fade for the whole thing, so the three bands cannot drift out
          of step with each other on the way in or out. */}
      <Group opacity={fade}>
        {BANDS.map((band, i) => {
          const pass = (
            <Path
              path={ring}
              style="stroke"
              strokeWidth={band.width}
              strokeCap="round"
              strokeJoin="round"
            >
              <SweepGradient c={vec(cx, cy)} colors={colors} positions={STOPS} transform={turn} />
            </Path>
          );
          const opacity = band[theme] * strength;
          return band.blur > 0 ? (
            <Group key={i} layer={<Paint opacity={opacity}><Blur blur={band.blur} /></Paint>}>
              {pass}
            </Group>
          ) : (
            <Group key={i} layer={<Paint opacity={opacity} />}>
              {pass}
            </Group>
          );
        })}
      </Group>
    </Canvas>
  );
}

const styles = StyleSheet.create({
  canvas: { position: 'absolute' },
});

// v2.0.0 — Redrawn as ONE STROKED PATH with a SweepGradient, after two mask
//          based builds of the CSS original's "conic window over a fixed blob
//          cloud" rendered nothing on a device and a third drew but was both
//          wrong and far too weak (the package's blob sizes are absolute pixels
//          tuned for a ~400pt card; this composer is nearly twice that). The
//          colour now lives in the sweep, so the beam carries its own
//          blue→purple gradient instead of picking up a hue per corner — the
//          one thing this trade gives up, and it is written down in the header.
//          The rotation is a hand-written translate·rotate·translate on the
//          SHADER: `transform` + `origin` on a gradient made the beam vanish.
