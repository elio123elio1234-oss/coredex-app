/* ==================================================================
   BorderBeam (atom) — a soft light that travels around a rounded box's
   border WHILE SOMEBODY IS TYPING, and is not there otherwise.

        ╭───┈┈┈──────────╮      the lit arc drifts; it brightens and
        │                │      speeds up with the typing, and cools
        ╰────────────────╯      down again when the hands stop

   ══ WHY THIS IS A PORT AND NOT AN INSTALL ══
   Asked for as *"npm install border-beam"*, and that package cannot run
   here. Unlike `thinking-orbs` — by the same author, and split into a
   portable `engine` precisely so a React Native port could share it —
   `border-beam` is CSS all the way down: `@keyframes`, `conic-gradient`,
   `filter: blur()/hue-rotate()`, `window.matchMedia`. React Native has
   none of those. So this is a port of the DESIGN, and the package is not
   a dependency and is not in `SOUP.md`.

   ══ ★ v3 — WHAT WAS WRONG WITH v2, IN THE USER'S OWN WORDS ══
   All five reported from a phone, and every one of them is answered here
   rather than argued with:

     1. *"you can never get out of typing mode"* — nothing dismissed the
        keyboard. Fixed in `ChatScreen`/`ChatComposer`, not here.
     2. *"the animation is too bright and has nothing to do with how fast
        I type — it looks like fireworks"* — it was a bright, fixed-speed
        spin. It is now DRIVEN BY TYPING: `energy` rises on each
        keystroke and decays, and it moves both the brightness and the
        speed. Idle-but-focused is deliberately very quiet.
     3. *"when you just open the tab, before typing at all, there is a
        little coloured strip on the box"* — v2 rested at 0.3 opacity,
        which is a coloured arc parked on an untouched input. **At rest
        this component now draws NOTHING.** `REST_OPACITY` is 0.
     4. the box's height — fixed in `ChatComposer`.
     5. *"the app crashed"* — see below. The most likely cause is gone.

   ══ ⚠️ THE CRASH, AND WHY THE FIX IS A DELETION ══
   v2 built its ring with `Skia.Path.Make()` inside a `useMemo` keyed on
   the measured size. That hands React a NATIVE object whose lifetime it
   does not manage, and recreates it every time the box is measured — a
   use-after-free waiting for a layout pass, and exactly the kind of thing
   that takes a whole app down rather than throwing where `FailSoft` could
   catch it. (`FailSoft` catches React renders. It cannot catch a native
   crash, which is why "it is wrapped" was not the protection it sounded
   like.)

   There is no manual Skia object here any more: the ring is a declarative
   `<RoundedRect style="stroke">`, and every value it needs is computed
   AFTER the zero-size guard. **Do not reintroduce `Skia.Path.Make()` for
   a shape a primitive already draws.**

   ══ HOW IT IS DRAWN ══
   One rounded rectangle, stroked with a `SweepGradient`, drawn three
   times at different widths and blurs for the bloom, the inner glow and
   the crisp edge. No masks.

   ⚠️ The rotation is written out by hand as
   `translate(centre) · rotate(θ) · translate(−centre)` on the SHADER. A
   gradient's `transform` is a local matrix on shader space, and `origin`
   does not wrap it — without the explicit translates the rotation happens
   about (0, 0) and swings the sweep's centre off the box, which makes the
   beam vanish. Rotating the GROUP is not the alternative: the ring would
   turn with it.

   ══ ★ THE COST ARGUMENT ══
   `ThinkingOrb`'s header warns that a Skia animation is "fine for a
   splash that has a 60 s ceiling over it and NOT fine as ambient chrome
   somewhere it could run for an hour". A composer is exactly that. So:
   the scene is declared once, one matrix changes per frame on the UI
   thread, the frame callback is only ACTIVE while the caller says so, and
   at rest nothing is drawn at all.

   Reduce Motion (live, not read once) and backgrounding stop it too.
   ================================================================== */

import {
  Blur,
  Canvas,
  Group,
  Paint,
  RoundedRect,
  rect,
  rrect,
  SweepGradient,
  vec,
} from '@shopify/react-native-skia';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, AppState, StyleSheet } from 'react-native';
import {
  useDerivedValue,
  useFrameCallback,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

/** Which palette the light is painted in. */
export type BeamVariant = 'ocean' | 'colorful';

/**
 * ★ THE RAMP — a long, soft comet rather than a spark.
 *
 * ⚠️ Widened and dimmed from the package's own window (which peaks at .75
 * over a quarter turn) after it was reported as looking "like fireworks".
 * A short bright arc on a dark screen reads as a flash going past; a
 * longer, gentler one reads as light moving. The peak is .5 and the lit
 * span is about 40 % of the turn.
 */
const STOPS = [0, 0.48, 0.55, 0.62, 0.68, 0.74, 0.8, 0.88, 1];
const ALPHA = [0, 0, 0.12, 0.32, 0.5, 0.38, 0.18, 0, 0];

/** `ocean` — blue into purple. The navy's own hue family. */
const OCEAN = [
  '60, 120, 255',
  '60, 120, 255',
  '70, 130, 255',
  '100, 80, 220',
  '130, 70, 255',
  '140, 100, 240',
  '110, 110, 235',
  '90, 110, 230',
  '90, 110, 230',
];

/** `colorful` — the package's rainbow, kept so the choice stays a prop. */
const COLORFUL = [
  '255, 50, 100',
  '255, 50, 100',
  '255, 120, 40',
  '240, 50, 180',
  '180, 40, 240',
  '100, 70, 255',
  '40, 140, 255',
  '30, 185, 170',
  '30, 185, 170',
];

const PALETTES: Record<BeamVariant, readonly string[]> = {
  ocean: OCEAN,
  colorful: COLORFUL,
};

/**
 * ★ SPEED IS TYPING SPEED.
 *
 * Turns per second at `energy` 0 and the extra it gains at `energy` 1.
 * The base is slow on purpose — 0.11 turns/s is one lap in about nine
 * seconds, which is a drift rather than a spin, and is what the border
 * does while somebody is thinking about what to write. Typing hard takes
 * it to roughly one lap every two seconds.
 */
const BASE_TURNS = 0.11;
const TYPING_TURNS = 0.4;

/**
 * The three passes over the same ring, at `energy` 1.
 *
 * ⚠️ Roughly HALF v2's values, and even these are multiplied by
 * `QUIET + (1 − QUIET) × energy` — so a focused, untouched field sits at
 * about a quarter of what is written here. "Too bright" was a fair
 * report: a message box is furniture, and furniture does not glow at you.
 */
const BANDS = [
  { width: 16, blur: 10, dark: 0.3, light: 0.26 },
  { width: 5, blur: 3, dark: 0.34, light: 0.28 },
  { width: 1.4, blur: 0, dark: 0.5, light: 0.42 },
] as const;

/** How much of the peak is shown when focused but not typing. */
const QUIET = 0.26;

/** Room for the halo outside the box. The canvas grows by this. */
const BLOOM_PAD = 20;

/**
 * ★ ZERO. At rest this component draws nothing at all.
 *
 * v2 rested at 0.3, which put a small coloured arc on a box nobody had
 * touched — reported as exactly that. An input at rest is an input.
 */
const REST_OPACITY = 0;
/** Long enough to read as the light coming up, short enough to feel instant. */
const FADE_MS = 360;

export interface BorderBeamProps {
  /** The box's own size in points, as measured by its parent. */
  width: number;
  height: number;
  /** The box's corner radius, so the ring follows the actual corners. */
  radius: number;
  /** True while the beam should be present at all. */
  active: boolean;
  /**
   * ★ 0–1, how hard the writing is going right now. Drives BOTH the
   * brightness and the speed, which is what makes the border feel like it
   * is reacting to the person rather than running on its own clock.
   * Owned by the caller because only the caller sees the keystrokes.
   */
  energy?: SharedValue<number>;
  variant?: BeamVariant;
  /** Which set of band opacities to use. */
  theme: 'dark' | 'light';
}

export default function BorderBeam({
  width,
  height,
  radius,
  active,
  energy,
  variant = 'ocean',
  theme,
}: BorderBeamProps) {
  const spin = useSharedValue(0);
  const level = useSharedValue(active ? 1 : REST_OPACITY);
  /* ★ A private fallback so `energy` can be optional without the worklets
     having to test for it on every frame — and it sits at 1, NOT 0.

     ⚠️ That is the difference between the two things this component is
     asked to say. With an `energy` source it is reacting to a person, and
     0 (hands still) must be quiet. With no source there is nothing to
     react to: the caller turned it on because WORK IS IN FLIGHT, and work
     in flight is not "quiet" — it is the full beam at the full speed.
     Defaulting to 0 made the send button's beam `1 × (0.26) × 0.5` of the
     band opacity, which on a navy pill is nothing at all: the animation
     ran perfectly and could not be seen. */
  const ownEnergy = useSharedValue(1);
  const heat = energy ?? ownEnergy;

  /* ⚠️ REACT STATE, not a shared value. The effect below has to RE-RUN
     when this changes, and a shared value read during render neither
     re-renders nor re-runs an effect — the beam would keep moving for the
     rest of the session after the reader switched Reduce Motion on, which
     is the exact failure the setting exists to prevent. */
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

  /* ★ The angle is advanced per FRAME rather than by `withRepeat`, because
     the speed has to change continuously with `energy` and a repeating
     timing animation has its duration baked in at the moment it starts. */
  const frame = useFrameCallback((info) => {
    const dt = Math.min(0.05, (info.timeSincePreviousFrame ?? 16) / 1000);
    spin.value = (spin.value + dt * (BASE_TURNS + TYPING_TURNS * heat.value)) % 1;
  }, false);

  useEffect(() => {
    const moving = active && !reduceMotion;
    frame.setActive(moving);
    level.value = withTiming(active ? 1 : REST_OPACITY, { duration: FADE_MS });

    /* Backgrounded, nothing here is on screen and the frame callback would
       keep being run for a view nobody can see. */
    const sub = AppState.addEventListener('change', (state) => {
      frame.setActive(moving && state === 'active');
    });
    return () => {
      sub.remove();
      frame.setActive(false);
    };
  }, [active, reduceMotion, frame, level]);

  const cx = BLOOM_PAD + width / 2;
  const cy = BLOOM_PAD + height / 2;

  /** Rotate about the ring's centre — see the header for why by hand. */
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

  /** Presence × how hard the typing is going. */
  const strength = useDerivedValue(
    () => level.value * (QUIET + (1 - QUIET) * heat.value),
    [],
  );

  /* ⚠️ After the hooks, never before them: an early return above would
     make the hook order depend on whether the parent had been laid out. */
  if (!(width > 0) || !(height > 0)) return null;

  const rgb = PALETTES[variant];
  const colors = ALPHA.map((a, i) => `rgba(${rgb[i]}, ${a})`);

  /* Inset by half the crisp stroke so the drawn edge sits ON the box's
     border rather than half outside it. Computed here, after the guard —
     there is no native object to keep alive between renders. */
  const inset = BANDS[BANDS.length - 1].width / 2;
  const ring = rrect(
    rect(BLOOM_PAD + inset, BLOOM_PAD + inset, width - inset * 2, height - inset * 2),
    Math.max(0, radius - inset),
    Math.max(0, radius - inset),
  );

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
      {/* One strength for the whole thing, so the three bands cannot drift
          out of step with each other as the typing rises and falls. */}
      <Group opacity={strength}>
        {BANDS.map((band, i) => {
          const pass = (
            <RoundedRect rect={ring} style="stroke" strokeWidth={band.width}>
              <SweepGradient c={vec(cx, cy)} colors={colors} positions={STOPS} transform={turn} />
            </RoundedRect>
          );
          return band.blur > 0 ? (
            <Group key={i} layer={<Paint opacity={band[theme]}><Blur blur={band.blur} /></Paint>}>
              {pass}
            </Group>
          ) : (
            <Group key={i} layer={<Paint opacity={band[theme]} />}>
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

// v3.1.0 — `energy` is optional, and WITHOUT it the beam now runs at FULL
//          strength instead of at the hands-still floor. A caller that passes no
//          energy (the send button) is not saying "nobody is typing", it is
//          saying "work is in flight" — and the old 0 default multiplied the
//          brightness down to ~6 % alpha, which drew a beam nobody could see.
// v3.0.0 — Answers five reports from a phone. ★ DRIVEN BY TYPING: `energy`
//          moves both the brightness and the speed, so the border reacts to the
//          person instead of running on its own clock ("it has nothing to do
//          with how fast I type"). ★ MUCH DIMMER and a longer, softer comet
//          ("too bright… like fireworks"). ★ NOTHING AT REST — v2 parked a
//          coloured arc on an untouched box ("there is a little coloured strip
//          before I type at all"). ⚠️ AND THE LIKELY CRASH IS DELETED:
//          `Skia.Path.Make()` in a `useMemo` handed React a native object it
//          does not manage and rebuilt it on every measurement. It is a
//          declarative `<RoundedRect style="stroke">` now, with every value
//          computed after the zero-size guard. FailSoft could never have caught
//          that — it catches React renders, not native crashes.
// v2.0.0 — One stroked path with a SweepGradient, after three mask-based builds
//          of the CSS original's conic window drew nothing at all.
