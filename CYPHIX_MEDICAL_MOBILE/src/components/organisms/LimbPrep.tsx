/* ==================================================================
   LimbPrep (organism) — the two confirmed set-up steps a patient does
   BEFORE the limb (6-lead) recording, ported from the web organism:
     1. Wear the watch on the left wrist — confirm.
     2. Rest that hand (watch down) on the left thigh — confirm.
   Then the live screen takes over, where touching the watch with the
   other hand arms the recording on its own (step 3, no confirmation).

   ── THE PICTURES ARE THE WEB'S OWN PHOTOGRAPHS ──
   These are patient instructions: someone shown a photograph on the web
   and a line drawing on the phone is being told two different things
   about how to hold a medical device. `assets/guides/` carries the same
   JPEGs (1100 × ~615, so ≈ 1.79 — near 16:9).

   ── THE FRAME IS SIZED TO THE PHOTOGRAPH, NOT THE OTHER WAY ROUND ──
   Every earlier version picked a frame from the layout (a viewport
   fraction, then a flex remainder) and let `contain` letterbox the photo
   inside it. In landscape that frame came out about 1.12 wide-to-tall
   against a 1.79 photo, so the picture shrank into the middle with wide
   empty bands — "the image doesn't fit its box".

   Now the available box is MEASURED (`onLayout`, so no duplicated padding
   maths), the photo's true aspect comes from the asset itself
   (`Image.resolveAssetSource`, so it stays correct if the artwork is
   replaced), and the frame is the largest rectangle of THAT aspect which
   fits. The photo fills the frame edge to edge: nothing letterboxed,
   nothing cropped.
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
import Svg, { Path } from 'react-native-svg';
import PatientShell from '@/components/templates/PatientShell';
import { LIMB_PREP_IMAGES } from '@/config/measurementGuides';
import { useTheme } from '@/theme/useTheme';
import { fitBox } from '@/utils/fitBox';

interface Props {
  onDone: () => void;
  onExit: () => void;
}

/**
 * Room the text column needs beside the picture before it starts to crowd.
 * Kept tight on purpose: the photograph is width-limited in this layout, so
 * every pixel taken here comes straight out of the instruction picture.
 */
const SIDE_MIN_W = 260;
const GAP = 16;
/** Portrait: the picture may not eat more than this much of the column. */
const PORTRAIT_MAX_H = 0.52;

/** The web's CheckIcon, at the size `.prep-confirm` uses. */
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
  const [step, setStep] = useState(0);
  const [box, setBox] = useState({ width: 0, height: 0 });
  const s = STEPS[step];

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setBox((b) => (b.width === width && b.height === height ? b : { width, height }));
  };

  /* The photograph's own proportions, read off the bundled asset. */
  const asset = Image.resolveAssetSource(s.img);
  const aspect = asset?.height ? asset.width / asset.height : 16 / 9;

  const landscape = box.width > box.height;
  const measured = box.width > 0 && box.height > 0;

  const frame = !measured
    ? { width: 0, height: 0 }
    : landscape
      ? fitBox(box.width - SIDE_MIN_W - GAP, box.height, aspect)
      : fitBox(box.width, box.height * PORTRAIT_MAX_H, aspect);

  const next = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (step < STEPS.length - 1) setStep(step + 1);
    else onDone();
  };
  const back = () => (step > 0 ? setStep(step - 1) : onExit());

  /* ── The three pieces, arranged differently per orientation ── */

  const topBar = (
    <View style={styles.top}>
      <Pressable accessibilityRole="button" onPress={back} hitSlop={12}>
        <Text style={[styles.back, { color: t.textSecondary }]}>
          {step === 0 ? 'Exit' : 'Back'}
        </Text>
      </Pressable>
      <Text style={[styles.progress, { color: t.textTertiary }]}>
        Step {step + 1} of {STEPS.length}
      </Text>
    </View>
  );

  const picture = (
    <View
      style={[
        styles.imageWrap,
        frame,
        /* WHITE, not `surface`. The artwork itself is drawn on white, so any
           residual letterbox band disappears into it instead of reading as
           "the picture doesn't fill its box". */
        { backgroundColor: '#FFFFFF', borderColor: t.border },
      ]}
    >
      {/* ★ `contain`, never `cover`. The frame is computed to be the photo's
          own shape, so the two are equivalent when everything is right — but
          if the frame is ever off (a transient layout during rotation, an
          asset whose dimensions could not be read), `contain` letterboxes
          while `cover` CROPS. Cropping a patient instruction can hide the
          very thing being pointed at, so the failure mode must be an ugly
          border, never a missing hand. */}
      <Image
        source={s.img}
        style={StyleSheet.absoluteFill}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
      />
    </View>
  );

  const caption = (
    <View style={[styles.caption, landscape && styles.captionLandscape]}>
      <Text
        style={[styles.title, landscape && styles.titleLandscape, { color: t.textPrimary }]}
      >
        {s.title}
      </Text>
      <View style={styles.dots}>
        {STEPS.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, { backgroundColor: i === step ? t.accent : t.border }]}
          />
        ))}
      </View>
    </View>
  );

  const confirm = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={s.confirm}
      onPress={next}
      style={({ pressed }) => [
        styles.confirm,
        { backgroundColor: t.accent, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <CheckIcon size={landscape ? 20 : 22} />
      <Text style={[styles.confirmText, landscape && styles.confirmTextLandscape]}>
        {s.confirm}
      </Text>
    </Pressable>
  );

  return (
    <PatientShell chrome={false}>
      <View style={styles.measure} onLayout={onLayout}>
        {!measured ? null : landscape ? (
          <View style={styles.stageRow}>
            {picture}
            <View style={styles.side}>
              {topBar}
              {caption}
              {confirm}
            </View>
          </View>
        ) : (
          <View style={styles.stage}>
            {topBar}
            <View style={styles.body}>
              {picture}
              {caption}
            </View>
            {confirm}
          </View>
        )}
      </View>
    </PatientShell>
  );
}

const styles = StyleSheet.create({
  measure: { flex: 1 },
  stage: { flex: 1, justifyContent: 'space-between', alignItems: 'center' },
  stageRow: { flex: 1, flexDirection: 'row', gap: GAP, alignItems: 'center' },
  side: { flex: 1, justifyContent: 'space-between', minWidth: 0, alignSelf: 'stretch' },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  back: { fontSize: 16, fontWeight: '600' },
  progress: { fontSize: 13, fontWeight: '600' },
  body: { alignItems: 'center', gap: 22 },
  imageWrap: {
    borderRadius: 28,
    borderWidth: 1,
    overflow: 'hidden',
    // --shadow-lg
    shadowColor: '#0A2540',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  caption: { alignItems: 'center', gap: 18 },
  captionLandscape: { alignItems: 'flex-start', gap: 12, flexShrink: 1 },
  /* .prep-title { font-size: clamp(23px, 5vw, 34px); line-height: 1.25 } */
  title: {
    fontSize: 25,
    lineHeight: 31,
    fontWeight: '800',
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  titleLandscape: { fontSize: 20, lineHeight: 25, textAlign: 'left', paddingHorizontal: 0 },
  dots: { flexDirection: 'row', gap: 8 },
  dot: { width: 9, height: 9, borderRadius: 5 },
  confirm: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
    gap: 10,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 16,
  },
  confirmText: { color: '#FFFFFF', fontSize: 18, fontWeight: '800', flexShrink: 1 },
  confirmTextLandscape: { fontSize: 15 },
});

// v4.0.0 — Frame sized to the photograph's measured aspect inside a measured box,
//          so the picture fills it exactly instead of floating in empty bands.
