/* ==================================================================
   LimbPrep (organism) — the two confirmed set-up steps a patient does
   BEFORE the limb (6-lead) recording, ported from the web organism:
     1. Wear the watch on the left wrist — confirm.
     2. Rest that hand (watch down) on the left thigh — confirm.
   Then the live screen takes over, where touching the watch with the
   other hand arms the recording on its own (step 3, no confirmation).

   ══ THE LAYOUT IS THE WEB'S, COLUMN FOR COLUMN ══
   `.prep-stage` in tests.css is one vertical stack, and this is that
   stack:

        ┌──────────────────────────────────────────┐
        │ Exit                          Step 1 of 2│  .prep-top
        ├──────────────────────────────────────────┤
        │                                          │
        │            ┌──────────────┐              │  .prep-body
        │            │   16:9 photo │              │   (flex 1,
        │            └──────────────┘              │    centred)
        │        Wear the watch on your …          │
        │                 ●  ○                     │
        │                                          │
        ├──────────────────────────────────────────┤
        │        ✓  The watch is on my left wrist  │  .prep-confirm
        └──────────────────────────────────────────┘

   An earlier version put the picture in a left column with the button
   in a right rail whenever the stage was landscape. The exam is ALWAYS
   landscape, so that rail was the layout the patient always got: a
   picture off to one side, a button floating beside it and the Exit
   link stranded in the middle of the screen. It is gone. One stack, one
   instruction, one big button — the same thing an elderly patient sees
   on the web.

   ══ WHY THE PICTURE FITS NOW ══
   The frame is a plain 16:9 rectangle, exactly like `.prep-image`
   (`width: min(94vw, 600px); aspect-ratio: 16/9`), fitted into the slot
   that is actually left over after the fixed rows. Nothing is derived
   from `Image.resolveAssetSource` any more: when that returned nothing
   useful the frame's shape came out wrong and `overflow: hidden` then
   clipped the photo to a corner. The frame's shape is now a constant, so
   it cannot be wrong, and `contain` guarantees the whole photograph is
   inside it.
   ================================================================== */

import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  type LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { LIMB_PREP_IMAGES } from '@/config/measurementGuides';
import { useTheme } from '@/theme/useTheme';

interface Props {
  onDone: () => void;
  onExit: () => void;
}

/** `.prep-image { width: min(94vw, 600px); aspect-ratio: 16/9 }` */
const IMAGE_MAX_W = 600;
const IMAGE_W_FRACTION = 0.94;
const IMAGE_ASPECT = 16 / 9;
/** `.prep-confirm { width: min(92vw, 520px) }` */
const CONFIRM_MAX_W = 520;
const CONFIRM_W_FRACTION = 0.92;

/**
 * ★ Below this stage height every piece of chrome shrinks — see COMPACT below.
 * A phone held sideways is ~390 pt tall; the web's design was measured on a
 * viewport several times that.
 */
const COMPACT_H = 500;

/* ══════════════════════════════════════════════════════════════════════
   ★ WHY THERE ARE TWO SETS OF NUMBERS ★

   The web's chrome — an 18px-padded button with 21px text, a 34px
   headline, 28px gaps — costs about 140 px of height. On a desktop
   viewport that is a tenth of the page. On a phone in landscape it is
   nearly HALF of it, and the photograph the whole screen exists to show
   was getting ~146 px: too small to tell which wrist the watch is on,
   which is the one thing step 1 has to communicate.

   So on a short stage the chrome is cut to what a finger and an eye
   actually need, and every pixel saved goes to the picture (146 → ~220,
   more than double the area). The button stays above the 44 pt tap-target
   floor; the title stays above 16 px. Nothing is truncated or hidden —
   the layout is identical, only tighter.
   ══════════════════════════════════════════════════════════════════════ */
const ROOMY = {
  padV: 14,
  padH: 32,
  topPadV: 8,
  backSize: 15,
  gap: 16,
  titleMax: 34,
  titleMin: 23,
  dot: 9,
  dotActive: 26,
  confirmPadV: 18,
  confirmFont: 19,
  confirmIcon: 22,
  /** `.prep-image { max-height: 54vh }` */
  imageMaxHFraction: 0.54,
} as const;

const COMPACT = {
  padV: 10,
  padH: 20,
  topPadV: 2,
  backSize: 14,
  gap: 10,
  titleMax: 22,
  titleMin: 16,
  dot: 7,
  dotActive: 20,
  confirmPadV: 13,
  confirmFont: 16,
  confirmIcon: 18,
  /** The flex slot already bounds the picture here; this only stops a
      near-square stage from turning it into a poster. */
  imageMaxHFraction: 0.78,
} as const;

/** The web's CheckIcon at the size `.prep-confirm` uses. */
function CheckIcon({ size = 22, color = '#FFFFFF' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20 6L9 17l-5-5"
        stroke={color}
        strokeWidth={2.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/* Confirmations are verbatim from the web locale (en.ts limbPrep*).
   ★ The step-2 TITLE is shortened. The web's line —
       "Rest that hand on your left thigh — the back of the watch touching
        your leg"
   is 74 characters against step 1's 33, so it wrapped to a second line and
   step 2's photograph came out visibly SMALLER than step 1's. Two pictures
   of the same procedure at two different sizes reads as a glitch, and the
   detail it was spending that line on — which way round the watch sits — is
   the one thing the photograph itself shows unambiguously. Both titles are
   now one short line. Recorded in PARITY.md. */
const STEPS = [
  {
    img: LIMB_PREP_IMAGES.wear,
    title: 'Wear the watch on your left wrist',
    confirm: 'The watch is on my left wrist',
  },
  {
    img: LIMB_PREP_IMAGES.rest,
    title: 'Rest that hand on your left thigh',
    confirm: 'My hand is resting on my left leg',
  },
];

export default function LimbPrep({ onDone, onExit }: Props) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);

  /* ── Why every photograph is mounted from the first render ──
     Swapping `source` on one <Image> makes RN fetch and decode the new
     asset at the moment of the tap — and in a dev build the "file" is an
     HTTP request to Metro — so the frame went blank for a beat and the
     step change felt broken. Both photographs are therefore mounted at
     once and only their OPACITY changes: by the time the patient taps,
     the next one has long since decoded, and the swap is a crossfade with
     nothing to load. */
  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fade, {
      toValue: step,
      duration: 220,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [step, fade]);
  /** The whole stage, for the viewport-relative sizes the web uses. */
  const [stage, setStage] = useState({ width: 0, height: 0 });
  /** What the picture actually has left after the title, dots and button. */
  const [slot, setSlot] = useState({ width: 0, height: 0 });
  const s = STEPS[step];

  const measure =
    (set: (v: { width: number; height: number }) => void) => (e: LayoutChangeEvent) => {
      const { width, height } = e.nativeEvent.layout;
      set({ width, height });
    };

  const compact = stage.height > 0 && stage.height < COMPACT_H;
  const M = compact ? COMPACT : ROOMY;

  /* ── The picture's frame: the web's 16:9 box, shrunk to what fits ──
     `.prep-image` is `min(94vw, 600px)` wide at 16:9 with a 54vh ceiling.
     The slot measured above is the flex remainder, which is the same job
     `.prep-body { flex: 1 }` does when the viewport is too short — so the
     ceiling is whichever of the two is tighter. */
  const frameW0 = Math.min(slot.width * IMAGE_W_FRACTION, IMAGE_MAX_W);
  const frameH0 = Math.min(slot.height, stage.height * M.imageMaxHFraction);
  const frameW = Math.min(frameW0, frameH0 * IMAGE_ASPECT);
  const frameH = frameW / IMAGE_ASPECT;

  /* `.prep-title { font-size: clamp(23px, 5vw, 34px) }`.
     ★ Deliberate departure, recorded in PARITY.md: the web's `5vw` assumes
     the viewport's WIDTH is its short edge. The exam is landscape, where
     width is the LONG edge, so 5vw pins the headline at its ceiling and a
     three-line title then eats the photograph it is captioning. The size is
     therefore driven by the stage HEIGHT, which is the short edge here —
     the same proportion the web produces on the viewport it was built for. */
  const titleSize = Math.max(
    M.titleMin,
    Math.min(M.titleMax, stage.width * 0.05, stage.height * 0.05),
  );
  /* Let the headline use the full stage on a short screen: at 20px the
     longest step title fits on ONE line across a phone's long edge, and the
     line it saves goes straight into the picture. Never truncated — if it
     does wrap, it wraps. */
  const titleMaxW = compact ? Math.max(360, slot.width) : 640;

  const confirmW = Math.min(stage.width * CONFIRM_W_FRACTION, CONFIRM_MAX_W);

  const next = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (step < STEPS.length - 1) setStep(step + 1);
    else onDone();
  };
  const back = () => {
    void Haptics.selectionAsync();
    if (step > 0) setStep(step - 1);
    else onExit();
  };

  return (
    <View
      style={[
        styles.stage,
        {
          backgroundColor: t.bg,
          /* `.prep-stage` padding, plus whatever the notch needs. Landscape
             puts the notch on a SIDE, so left/right carry the inset. */
          paddingTop: Math.max(insets.top, M.padV),
          paddingBottom: Math.max(insets.bottom, M.padV),
          paddingLeft: Math.max(insets.left, M.padH),
          paddingRight: Math.max(insets.right, M.padH),
        },
      ]}
      onLayout={measure(setStage)}
    >
      {/* ── .prep-top ── */}
      <View style={styles.top}>
        <Pressable
          accessibilityRole="button"
          onPress={back}
          hitSlop={14}
          style={{ paddingVertical: M.topPadV, paddingHorizontal: 4 }}
        >
          <Text style={[styles.back, { color: t.textSecondary, fontSize: M.backSize }]}>
            {step === 0 ? 'Exit' : 'Back'}
          </Text>
        </Pressable>
        <Text style={[styles.progress, { color: t.textTertiary }]}>
          Step {step + 1} of {STEPS.length}
        </Text>
      </View>

      {/* ── .prep-body ── */}
      <View style={[styles.body, { gap: M.gap }]}>
        {/* The picture absorbs the leftover height; the title and dots below
            keep their natural size, so nothing ever pushes the button off. */}
        <View style={styles.imageSlot} onLayout={measure(setSlot)}>
          {frameW > 0 && (
            <View
              style={[
                styles.imageFrame,
                { width: frameW, height: frameH, borderColor: t.border },
              ]}
            >
              {/* ★ `contain`, never `cover`. Cropping a patient instruction can
                  hide the very thing being pointed at, so the failure mode has
                  to be a border, never a missing hand. The artwork is drawn on
                  white, so any residual band disappears into the frame. */}
              {STEPS.map((st, i) => (
                <Animated.Image
                  key={i}
                  source={st.img}
                  style={[
                    StyleSheet.absoluteFill,
                    {
                      opacity:
                        STEPS.length < 2
                          ? 1
                          : fade.interpolate({
                              inputRange: [i - 1, i, i + 1],
                              outputRange: [0, 1, 0],
                              extrapolate: 'clamp',
                            }),
                    },
                  ]}
                  resizeMode="contain"
                  accessibilityIgnoresInvertColors
                  accessibilityElementsHidden={i !== step}
                />
              ))}
            </View>
          )}
        </View>

        {/* ★ A FIXED height, not an auto one.
            The photograph's slot is the flex remainder, so anything above it
            that changes size between steps changes the PICTURE's size too —
            which is exactly how step 2 ended up with a smaller photograph
            than step 1. Reserving one line makes the remainder identical on
            every step regardless of copy. `adjustsFontSizeToFit` is the
            safety net: a longer string (or a future translation) shrinks
            slightly rather than being cut off, because a truncated clinical
            instruction is worse than a small one. */}
        <View style={{ height: titleSize * 1.22, justifyContent: 'center' }}>
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.72}
            style={[
              styles.title,
              {
                color: t.textPrimary,
                fontSize: titleSize,
                lineHeight: titleSize * 1.22,
                maxWidth: titleMaxW,
              },
            ]}
          >
            {s.title}
          </Text>
        </View>

        <View style={styles.dots}>
          {STEPS.map((_, i) => (
            <View
              key={i}
              style={[
                { width: M.dot, height: M.dot, borderRadius: M.dot / 2 },
                i === step
                  ? { width: M.dotActive, borderRadius: 999, backgroundColor: t.brandNavy }
                  : { backgroundColor: t.border },
              ]}
            />
          ))}
        </View>
      </View>

      {/* ── .prep-confirm ── */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={s.confirm}
        onPress={next}
        style={({ pressed }) => [
          styles.confirmWrap,
          { width: confirmW, transform: [{ scale: pressed ? 0.99 : 1 }] },
        ]}
      >
        {/* `linear-gradient(150deg, #59bf6a, #2f9a44)` — 150° in CSS runs from
            the top-left down, hence the start/end points below. */}
        <LinearGradient
          colors={['#59BF6A', '#2F9A44']}
          start={{ x: 0.25, y: 0 }}
          end={{ x: 0.75, y: 1 }}
          style={[styles.confirm, { paddingVertical: M.confirmPadV }]}
        >
          <CheckIcon size={M.confirmIcon} />
          <Text style={[styles.confirmText, { fontSize: M.confirmFont }]} numberOfLines={2}>
            {s.confirm}
          </Text>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { flex: 1 },
  /* .prep-top */
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { fontWeight: '800' },
  progress: { fontSize: 13, fontWeight: '800' },
  /* .prep-body { flex: 1; align-items: center; justify-content: center; gap: … } */
  body: { flex: 1, minHeight: 0, alignItems: 'center', justifyContent: 'center' },
  imageSlot: { alignSelf: 'stretch', flex: 1, minHeight: 0, alignItems: 'center', justifyContent: 'center' },
  /* .prep-image — radius 28, --shadow-lg, on the artwork's own white ground. */
  imageFrame: {
    borderRadius: 28,
    borderWidth: 1,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    shadowColor: '#0A2540',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  image: { width: '100%', height: '100%' },
  /* .prep-title { max-width: 640px; text-align: center } */
  title: { fontWeight: '800', textAlign: 'center' },
  /* .prep-dots */
  dots: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  /* .prep-confirm */
  confirmWrap: {
    alignSelf: 'center',
    borderRadius: 18,
    shadowColor: '#2F9A44',
    shadowOpacity: 0.45,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  confirm: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 24,
    borderRadius: 18,
  },
  confirmText: { color: '#FFFFFF', fontWeight: '800', flexShrink: 1 },
});

// v5.2.0 — Both photographs mount at once and crossfade (no decode on tap),
//          and the title's height is fixed so every step's picture is the
//          SAME size; step-2 copy shortened to one line.
