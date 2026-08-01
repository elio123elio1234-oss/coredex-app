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
import { useState } from 'react';
import {
  Image,
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
/** `.prep-image { max-height: 54vh }` */
const IMAGE_MAX_H_FRACTION = 0.54;
/** `.prep-confirm { width: min(92vw, 520px) }` */
const CONFIRM_MAX_W = 520;
const CONFIRM_W_FRACTION = 0.92;

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

/* Text copied verbatim from the web locale (en.ts limbPrep*). */
const STEPS = [
  {
    img: LIMB_PREP_IMAGES.wear,
    title: 'Wear the watch on your left wrist',
    confirm: 'The watch is on my left wrist',
  },
  {
    img: LIMB_PREP_IMAGES.rest,
    title: 'Rest that hand on your left thigh — the back of the watch touching your leg',
    confirm: 'My hand is resting on my left leg',
  },
];

export default function LimbPrep({ onDone, onExit }: Props) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
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

  /* ── The picture's frame: the web's 16:9 box, shrunk to what fits ──
     `.prep-image` is `min(94vw, 600px)` wide at 16:9 with a 54vh ceiling.
     The slot measured above is the flex remainder, which is the same job
     `.prep-body { flex: 1 }` does when the viewport is too short — so the
     ceiling is whichever of the two is tighter. */
  const frameW0 = Math.min(slot.width * IMAGE_W_FRACTION, IMAGE_MAX_W);
  const frameH0 = Math.min(slot.height, stage.height * IMAGE_MAX_H_FRACTION);
  const frameW = Math.min(frameW0, frameH0 * IMAGE_ASPECT);
  const frameH = frameW / IMAGE_ASPECT;

  /* `.prep-title { font-size: clamp(23px, 5vw, 34px) }`.
     ★ One deliberate departure, recorded in PARITY.md: the web's `5vw`
     assumes the viewport's WIDTH is its short edge. The exam is landscape,
     where width is the LONG edge, so 5vw pins the headline at its 34px
     ceiling on a phone and a three-line title then eats the photograph it
     is captioning. The ceiling is therefore also tied to the stage height,
     which is the short edge here — the same proportion the web produces on
     the viewport it was designed for. */
  const titleSize = Math.max(
    23,
    Math.min(34, stage.width * 0.05, Math.max(23, stage.height * 0.075)),
  );

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
          paddingTop: Math.max(insets.top, 14),
          paddingBottom: Math.max(insets.bottom, 20),
          paddingLeft: Math.max(insets.left, 32),
          paddingRight: Math.max(insets.right, 32),
        },
      ]}
      onLayout={measure(setStage)}
    >
      {/* ── .prep-top ── */}
      <View style={styles.top}>
        <Pressable accessibilityRole="button" onPress={back} hitSlop={12} style={styles.backHit}>
          <Text style={[styles.back, { color: t.textSecondary }]}>
            {step === 0 ? 'Exit' : 'Back'}
          </Text>
        </Pressable>
        <Text style={[styles.progress, { color: t.textTertiary }]}>
          Step {step + 1} of {STEPS.length}
        </Text>
      </View>

      {/* ── .prep-body ── */}
      <View style={styles.body}>
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
              <Image
                source={s.img}
                style={styles.image}
                resizeMode="contain"
                accessibilityIgnoresInvertColors
              />
            </View>
          )}
        </View>

        <Text
          style={[
            styles.title,
            { color: t.textPrimary, fontSize: titleSize, lineHeight: titleSize * 1.25 },
          ]}
        >
          {s.title}
        </Text>

        <View style={styles.dots}>
          {STEPS.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === step
                  ? { width: 26, borderRadius: 999, backgroundColor: t.brandNavy }
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
          style={styles.confirm}
        >
          <CheckIcon size={22} />
          <Text style={styles.confirmText} numberOfLines={2}>
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
  backHit: { paddingVertical: 8, paddingHorizontal: 4 },
  back: { fontSize: 15, fontWeight: '800' },
  progress: { fontSize: 13, fontWeight: '800' },
  /* .prep-body { flex: 1; align-items: center; justify-content: center; gap: … } */
  body: { flex: 1, minHeight: 0, alignItems: 'center', justifyContent: 'center', gap: 16 },
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
  title: { fontWeight: '800', textAlign: 'center', maxWidth: 640 },
  /* .prep-dots */
  dots: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 9, height: 9, borderRadius: 5 },
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
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 18,
  },
  confirmText: { color: '#FFFFFF', fontSize: 19, fontWeight: '800', flexShrink: 1 },
});

// v5.0.0 — One column, exactly like the web `.prep-stage`: the landscape
//          side-rail variant is gone and the 16:9 frame is a constant shape.
