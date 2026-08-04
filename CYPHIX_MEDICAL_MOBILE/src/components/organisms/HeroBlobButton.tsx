/* ==================================================================
   HeroBlobButton (organism) — the patient home's single focal control,
   ported from the web organism of the same name.

   ── WHAT THE CONNECTED STATE LOOKS LIKE, AND WHY (v5.0.0) ──
   The web fills the blob with navy and morphs a white "core" in its
   middle, with the action's name in text UNDER the shape. On a phone
   that composition failed as a control: the white core reads as a
   heart-ish blob of decoration, and a caption below a picture is a
   caption — nothing on screen says the shape is the thing you press.

   So on connect the middle now carries the ACTION, not an ornament:

     • the white morphing core is gone. The grey idle core it used to
       come from now grows ~55 % as it dissolves, so the dot in the
       middle reads as OPENING INTO the label rather than being swapped
     • a play glyph + the button's own words sit inside the blob, in
       white on the brand navy, arriving at 45 % of the fill so you
       read "it filled with colour" THEN "it says Start Test"
     • the blob casts a real navy drop shadow, so it sits ABOVE the
       page instead of being printed on it — the cheapest and oldest
       signal that a thing can be pressed
     • the caption below collapses as the label moves inside, so the
       words exist in exactly one place at a time

   The DISCONNECTED state is deliberately untouched (user's call): same
   grey blob, same white disc, same core, same caption underneath.

   Everything else still comes from `.hero-orb` in ecg.css:

     • the blob outline is the CSS elliptical border-radius drawn as a
       real path (blobShape.ts), morphing on the verbatim
       @keyframes morphingBlob, 8 s ease-in-out
     • the fills are the CSS gradients: #e5e5ea→#f2f2f7 disconnected,
       #1e3f66→#0A2540 connected, both at 135°
     • particles emit outward with the same distances (90–150 px),
       durations (1.5–3.5 s) and ~20% green mix — and, like the web's
       negative `animation-delay`, they start ALREADY IN FLIGHT

   ── WHY IT IS SMOOTH ──
   v3 drove the morph from `setInterval` + `setState` at 25 Hz: a React
   re-render and a JS-thread path rebuild EVERY frame, with 65 separately
   animated particle views competing for the same thread. That is what
   made it judder. Now two Reanimated clocks run on the UI thread and
   every shape is a `useDerivedValue` — React renders this component once
   and then never again for the duration of the animation. The press
   scale is a shared value for the same reason.

   ── LAYERING (load-bearing, do not "simplify") ──
   The tap target is an EMPTY Pressable laid OVER the Skia canvas, not a
   Pressable wrapped AROUND it. A Skia <Canvas/> is a native view that can
   claim the touch, and when it does an enclosing Pressable never fires —
   a button that looks alive and does nothing.

   ⚠️ The canvas is BIGGER than the orb (BOX = ORB + 2·PAD). A drop
   shadow is drawn by Skia into the canvas's own pixels, so a canvas cut
   to the blob's exact size clips the shadow off. PAD is the room the
   shadow needs; the orb box carries `marginVertical: -PAD` so the extra
   pixels cost the layout nothing.

   Presentational: no BLE/auth logic here.
   ================================================================== */

import {
  Canvas,
  Group,
  LinearGradient as SkGradient,
  Path,
  Shadow,
  vec,
} from '@shopify/react-native-skia';
import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@/theme/useTheme';
import { blobPathAt, CORE_BOX, CORE_SCALE, corePathAt } from './blobShape';

/** .hero-orb { width: 150px; height: 150px } */
const ORB = 150;
/** .hero-blob { width: 120px; height: 120px } */
const BLOB = 120;
/** Breathing room around the orb so the drop shadow is not clipped. */
const PAD = 44;
/** The Skia canvas: the orb plus the shadow's room on every side. */
const BOX = ORB + PAD * 2;
/** .connected-blob { transform: scale(1.25) } */
const CONNECTED_SCALE = 1.25;
/** Both blob and core run an 8 s cycle. */
const CYCLE_MS = 8000;
/** 65 emitting particles — verbatim from the reference. */
const DOT_COUNT = 65;
/** `transition: all 1.2s cubic-bezier(.25,1,.5,1)` on .hero-blob. */
const CONNECT_MS = 1200;
/** `breatheIn 1.5s`, fired once on connect. */
const BREATHE_MS = 1500;
/** triggerConnectionMagic(): 70 halo dots, `haloFade 1.8s`, delay 0–0.4 s. */
const HALO_COUNT = 70;
const HALO_MS = 1800;
const HALO_MAX_DELAY = 400;

/**
 * How far into the 1.2 s fill the label starts arriving.
 *
 * Not 0: two things changing at once read as one blurry event. The colour
 * lands first, the words follow — which is also the order you'd say it in.
 */
const LABEL_START = 0.45;
/** The caption slot under the orb: 26 px line + its 8 px gap to the status. */
const TITLE_SLOT = 40;

/**
 * The particle clock's period.
 *
 * Every dot's duration below is an exact divisor of this, so when the clock
 * wraps, every dot is exactly at the start of a cycle — the field loops
 * seamlessly forever instead of visibly reseating once a minute.
 */
const EMIT_LOOP_MS = 42000;
/** 1.5–3.5 s, the web's range, restricted to exact divisors of the loop. */
const EMIT_DURATIONS = [1500, 1750, 2000, 2100, 2625, 3000, 3500];

/** @keyframes emitDot's timing function. */
const emitEase = Easing.bezier(0.25, 1, 0.5, 1).factory();

interface Props {
  connected: boolean;
  title: string;
  subtitle: string;
  onPress: () => void;
  disabled?: boolean;
}

interface Dot {
  id: number;
  tx: number;
  ty: number;
  duration: number;
  /** Milliseconds already elapsed on mount — the web's negative delay. */
  offset: number;
  color: string;
}

/** dist 90–150px, ~20% green — verbatim from the reference. */
function makeDots(): Dot[] {
  return Array.from({ length: DOT_COUNT }, (_, i) => {
    const angle = Math.random() * Math.PI * 2;
    const distance = 90 + Math.random() * 60;
    const duration = EMIT_DURATIONS[Math.floor(Math.random() * EMIT_DURATIONS.length)];
    return {
      id: i,
      tx: Math.cos(angle) * distance,
      ty: Math.sin(angle) * distance,
      duration,
      offset: Math.random() * duration,
      color: Math.random() > 0.2 ? '#0A2540' : '#34C759',
    };
  });
}

interface HaloDot {
  id: string;
  hx: number;
  hy: number;
  delay: number;
  color: string;
}

/**
 * `triggerConnectionMagic()` from the reference: a ring of dots that pops
 * outward the instant the device connects. Unlike the emitting particles
 * these START at their offset — they flash in place, then drift 20 %
 * further out and vanish.
 */
function makeHalo(): HaloDot[] {
  return Array.from({ length: HALO_COUNT }, (_, i) => {
    const angle = Math.random() * Math.PI * 2;
    const distance = 80 + Math.random() * 40;
    return {
      id: `h_${i}`,
      hx: Math.cos(angle) * distance,
      hy: Math.sin(angle) * distance,
      delay: Math.random() * HALO_MAX_DELAY,
      color: Math.random() > 0.4 ? '#0A2540' : '#34C759',
    };
  });
}

/** @keyframes haloFade — 0 → scale 1.5 @40% → gone, drifting 1.2× out. */
function Halo({ dot }: { dot: HaloDot }) {
  const p = useSharedValue(0);

  useEffect(() => {
    p.value = withDelay(
      dot.delay,
      withTiming(1, { duration: HALO_MS, easing: Easing.bezier(0.4, 0, 0.2, 1) }),
    );
  }, [dot, p]);

  const style = useAnimatedStyle(() => {
    const scale = interpolate(p.value, [0, 0.4, 1], [0, 1.5, 0]);
    const opacity = interpolate(p.value, [0, 0.4, 1], [0, 0.8, 0]);
    const drift = interpolate(p.value, [0, 1], [1, 1.2]);
    return {
      opacity,
      transform: [
        { translateX: dot.hx * drift },
        { translateY: dot.hy * drift },
        { scale },
      ],
    };
  });

  return (
    <Animated.View
      style={[styles.dot, style, { backgroundColor: dot.color, shadowColor: dot.color }]}
    />
  );
}

/** One dot. Reads the shared clock; never re-renders. */
function Particle({ dot, clock }: { dot: Dot; clock: { value: number } }) {
  const style = useAnimatedStyle(() => {
    const p = emitEase(((clock.value + dot.offset) % dot.duration) / dot.duration);
    // @keyframes emitDot: opacity .8 → 0, scale .5 → 1.5
    return {
      opacity: 0.8 * (1 - p),
      transform: [
        { translateX: dot.tx * p },
        { translateY: dot.ty * p },
        { scale: 0.5 + p },
      ],
    };
  });

  return (
    <Animated.View
      style={[styles.dot, style, { backgroundColor: dot.color, shadowColor: dot.color }]}
    />
  );
}

export default function HeroBlobButton({
  connected,
  title,
  subtitle,
  onPress,
  disabled,
}: Props) {
  const t = useTheme();
  const dots = useMemo(makeDots, []);
  const dim = disabled ? 0.55 : 1;

  /* ── Two UI-thread clocks. Nothing below ever re-renders React. ── */
  const morph = useSharedValue(0); // 0→1 across the 8 s blob cycle
  const emit = useSharedValue(0); // 0→EMIT_LOOP_MS, particle time in ms

  useEffect(() => {
    morph.value = 0;
    morph.value = withRepeat(
      withTiming(1, { duration: CYCLE_MS, easing: Easing.linear }),
      -1,
      false,
    );
    emit.value = 0;
    emit.value = withRepeat(
      withTiming(EMIT_LOOP_MS, { duration: EMIT_LOOP_MS, easing: Easing.linear }),
      -1,
      false,
    );
  }, [morph, emit]);

  /* ── The blob outline, as the real CSS border-radius shape ── */
  const blobPath = useDerivedValue(
    () => blobPathAt(BLOB, BLOB, morph.value, connected),
    [connected],
  );

  /* ── The core ──
     Only the IDLE core survives: a static circle, the 0 % frame of
     `@keyframes morphingCore`. The connected state's white morphing core
     is deliberately gone — the middle of a button belongs to its label.
     It does not simply vanish: it grows as it fades (below), so the dot
     reads as opening into the words rather than being replaced by them. */
  const corePath = useMemo(() => corePathAt(0), []);
  const coreSide = CORE_BOX * CORE_SCALE;

  /* ── The 1.2 s connect transition + the 1.5 s breathe ──
     `.hero-blob { transition: all 1.2s cubic-bezier(.25,1,.5,1) }` and
     `.premium-start-btn { transition: background 1.2s }`: the scale, the
     gradient and the white disc all CROSS-FADE. v0.5 snapped between them. */
  const conn = useSharedValue(connected ? 1 : 0);
  const breathe = useSharedValue(1);
  const press = useSharedValue(1);
  const [halo, setHalo] = useState<HaloDot[] | null>(null);

  useEffect(() => {
    conn.value = withTiming(connected ? 1 : 0, {
      duration: CONNECT_MS,
      easing: Easing.bezier(0.25, 1, 0.5, 1),
    });
    if (!connected) {
      setHalo(null);
      return;
    }
    // @keyframes breatheIn: 1 → .92 @40% → 1
    breathe.value = withSequence(
      withTiming(0.92, { duration: BREATHE_MS * 0.4, easing: Easing.bezier(0.4, 0, 0.2, 1) }),
      withTiming(1, { duration: BREATHE_MS * 0.6, easing: Easing.bezier(0.4, 0, 0.2, 1) }),
    );
    setHalo(makeHalo());
    const timer = setTimeout(() => setHalo(null), HALO_MS + HALO_MAX_DELAY + 200);
    return () => clearTimeout(timer);
  }, [connected, conn, breathe]);

  /* .connected-blob { transform: scale(1.25) }, eased over 1.2 s. */
  const blobTransform = useDerivedValue(() => {
    const s = (1 + (CONNECTED_SCALE - 1) * conn.value) * breathe.value;
    return [
      { translateX: BOX / 2 },
      { translateY: BOX / 2 },
      { scale: s },
      { translateX: -BOX / 2 },
      { translateY: -BOX / 2 },
    ];
  }, []);

  /* The idle core grows ~55 % about its own centre while it dissolves. */
  const coreTransform = useDerivedValue(() => {
    const g = 1 + 0.55 * conn.value;
    const side = coreSide * g;
    return [
      { translateX: (BLOB - side) / 2 },
      { translateY: (BLOB - side) / 2 },
      { scale: CORE_SCALE * g },
    ];
  }, [coreSide]);

  const connectedOpacity = useDerivedValue(() => conn.value, []);
  const disconnectedOpacity = useDerivedValue(() => 1 - conn.value, []);

  /* .premium-start-btn:active { transform: scale(.96) } — on the UI thread,
     and springing back rather than snapping, so the press has a release. */
  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: press.value }],
    opacity: dim,
  }));
  /* .premium-start-btn.is-active { background: rgba(255,255,255,0) } */
  const discStyle = useAnimatedStyle(() => ({
    transform: [{ scale: press.value }],
    opacity: (1 - conn.value) * dim,
  }));
  /* The label rises the last 8 px into place as it arrives. */
  const faceStyle = useAnimatedStyle(() => {
    const p = Math.min(1, Math.max(0, (conn.value - LABEL_START) / (1 - LABEL_START)));
    return {
      opacity: p * dim,
      transform: [{ scale: press.value }, { translateY: (1 - p) * 8 }],
    };
  });
  /* The caption collapses as its words move inside the button, so the
     action is never named twice — and nothing jumps when it goes. */
  const titleSlotStyle = useAnimatedStyle(() => ({
    height: TITLE_SLOT * (1 - conn.value),
    opacity: Math.max(0, 1 - conn.value * 2),
  }));

  const handlePress = () => {
    if (disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };

  const blobOffset = PAD + (ORB - BLOB) / 2;

  return (
    <View style={styles.wrap}>
      <View style={styles.orb}>
        {/* ── layer 1: the white disc, fading out over 1.2 s (not snapping) ── */}
        <Animated.View style={[styles.idleDisc, discStyle]} pointerEvents="none" />

        {/* ── layer 2: emitted particles ── */}
        {!connected && (
          <View style={styles.particleOrigin} pointerEvents="none">
            {dots.map((d) => (
              <Particle key={d.id} dot={d} clock={emit} />
            ))}
          </View>
        )}

        {/* ── layer 2b: the connection halo — one burst, on connect ── */}
        {halo && (
          <View style={styles.particleOrigin} pointerEvents="none">
            {halo.map((d) => (
              <Halo key={d.id} dot={d} />
            ))}
          </View>
        )}

        {/* ── layer 3: the blob + core. NON-INTERACTIVE by construction. ── */}
        <Animated.View style={[styles.canvasWrap, pressStyle]} pointerEvents="none">
          <Canvas style={{ width: BOX, height: BOX }}>
            <Group transform={blobTransform}>
              <Group transform={[{ translateX: blobOffset }, { translateY: blobOffset }]}>
                {/* The two gradients CROSS-FADE over 1.2 s, the way the CSS
                    `transition: background 1.2s` does — one flat swap read
                    as the blob "popping" into navy. */}
                <Group opacity={disconnectedOpacity}>
                  <Path path={blobPath}>
                    {/* linear-gradient(135deg, …) — top-left to bottom-right. */}
                    <SkGradient
                      start={vec(0, 0)}
                      end={vec(BLOB, BLOB)}
                      colors={['#e5e5ea', '#f2f2f7']}
                    />
                  </Path>
                </Group>
                <Group opacity={connectedOpacity}>
                  <Path path={blobPath}>
                    <SkGradient
                      start={vec(0, 0)}
                      end={vec(BLOB, BLOB)}
                      colors={['#1e3f66', '#0A2540']}
                    />
                    {/* The lift. Cast in the brand navy rather than black:
                        a grey shadow under a navy shape reads as dirt. */}
                    <Shadow dx={0} dy={12} blur={10} color="rgba(10, 37, 64, 0.30)" />
                  </Path>
                </Group>

                {/* .core-scaler { transform: scale(4.5) } around a 12×12 path. */}
                <Group opacity={disconnectedOpacity} transform={coreTransform}>
                  <Path path={corePath} color="#d1d1d6" />
                </Group>
              </Group>
            </Group>
          </Canvas>
        </Animated.View>

        {/* ── layer 3b: THE BUTTON FACE — the action, inside the shape ── */}
        <Animated.View style={[styles.face, faceStyle]} pointerEvents="none">
          <View style={styles.play} />
          <Text style={styles.faceLabel} numberOfLines={2}>
            {title}
          </Text>
        </Animated.View>

        {/* ── layer 4: THE TAP TARGET. Empty, on top, owns every touch. ── */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={title}
          accessibilityHint={subtitle}
          accessibilityState={{ disabled: !!disabled }}
          disabled={disabled}
          onPressIn={() => {
            press.value = withTiming(0.96, { duration: 90, easing: Easing.out(Easing.quad) });
          }}
          onPressOut={() => {
            press.value = withSpring(1, { damping: 14, stiffness: 220, mass: 0.6 });
          }}
          onPress={handlePress}
          hitSlop={16}
          style={styles.hit}
        />
      </View>

      <View style={styles.status}>
        <Animated.View style={[styles.titleSlot, titleSlotStyle]}>
          <Text style={[styles.title, { color: t.textPrimary }]} numberOfLines={1}>
            {title}
          </Text>
        </Animated.View>
        <Text style={[styles.sub, { color: t.textSecondary }]}>{subtitle}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  /* .hero-orb-wrap { gap: clamp(22px, 5vh, 44px) } */
  wrap: { alignItems: 'center', gap: 30 },
  /* The box is BOX wide so Skia has room to draw the shadow; the negative
     margin gives those pixels back to the layout, so the gap above and
     below stays exactly what it was before the shadow existed. */
  orb: {
    width: BOX,
    height: BOX,
    marginVertical: -PAD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  particleOrigin: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 0,
    height: 0,
    zIndex: 10,
  },
  /* .orb-dot { width: 3px; height: 3px; border-radius: 50% } */
  dot: {
    position: 'absolute',
    top: -1.5,
    left: -1.5,
    width: 3,
    height: 3,
    borderRadius: 1.5,
    shadowOpacity: 0.9,
    shadowRadius: 3,
  },
  /* .premium-start-btn — white, soft shadow. Sits under the blob, and is
     inset by PAD because the box around it is the shadow's room. */
  idleDisc: {
    position: 'absolute',
    top: PAD,
    left: PAD,
    width: ORB,
    height: ORB,
    borderRadius: ORB / 2,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOpacity: 0.06,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
    zIndex: 5,
  },
  canvasWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 15,
  },
  /* The face is the ORB, not the box: centred on the blob, not on the
     shadow's padding. */
  face: {
    position: 'absolute',
    top: PAD,
    left: PAD,
    width: ORB,
    height: ORB,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    zIndex: 20,
  },
  /* A play triangle drawn with borders — no icon font, no asset, and it
     cannot arrive as a colour emoji the way "▶" does on iOS. */
  play: {
    width: 0,
    height: 0,
    borderTopWidth: 8,
    borderBottomWidth: 8,
    borderLeftWidth: 13,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: '#FFFFFF',
    borderStyle: 'solid',
    marginBottom: 10,
  },
  faceLabel: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.2,
    lineHeight: 24,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  hit: {
    position: 'absolute',
    top: PAD,
    left: PAD,
    width: ORB,
    height: ORB,
    borderRadius: ORB / 2,
    zIndex: 30,
  },
  /* .hero-orb-title / .hero-orb-sub */
  status: { alignItems: 'center' },
  titleSlot: { height: TITLE_SLOT, overflow: 'hidden', justifyContent: 'flex-start' },
  title: { fontSize: 26, lineHeight: 32, fontWeight: '800', textAlign: 'center' },
  sub: { fontSize: 16, fontWeight: '500', textAlign: 'center' },
});

// v5.0.0 — The connected orb IS the button: white morphing core out, play
//          glyph + label in, navy drop shadow for lift, caption collapses.
// v4.0.0 — Morph + particles moved onto the UI thread (Reanimated clocks +
//          Skia useDerivedValue). No React re-render per frame → no stutter.
