/* ==================================================================
   ChatComposer (molecule) — the message box, with light on its border.

     ╭─────────────────────────────╮
     │  Write a message…           │   one line to start; it grows
     │                        (↑)  │   attached study · send
     ╰─────────────────────────────╯

   ══ WHERE THE SHAPE COMES FROM ══
   The layout is the one in the reference the user pointed at: a rounded
   box with the text at the top and a round send button at the bottom-end.
   Only the CONTROLS are different, because this app has no agents to pick
   — the top-start button attaches an ECG study, and the chip is that
   study rather than a model name. That mapping is the web's own composer
   (attach · text · send) rearranged, so the two platforms stay one
   feature.

   ══ ★ v2 — THREE OF THE FIVE REPORTS LANDED HERE ══
   Reported from a phone, and answered rather than argued with:

   • *"the box is very tall from the start and does not depend on how much
     text I wrote"* — it opened at a fixed ~116 pt because the field had a
     44 pt minimum and the box padded generously around it. It now starts
     at ONE LINE and grows with the content up to `MAX_INPUT`, after which
     the field scrolls inside itself. Nothing else on the screen moves.

   • *"you can never get out of typing mode"* — there was no way to
     dismiss the keyboard: a multiline field ignores Return, and nothing
     else blurred it. The field is blurred by tapping the thread above it
     (`ChatScreen`), by sending, and by the Android back button, which the
     system already routes to the keyboard first.

   • *"the animation is too bright and has nothing to do with how fast I
     type — it looks like fireworks"* — the beam ran at a fixed speed and
     a fixed brightness. This component now owns an `energy` value that
     rises on every keystroke and decays over `COOL_MS`, and hands it to
     `BorderBeam`, which uses it for BOTH brightness and speed. Type fast
     and the border keeps up; stop and it settles to a quiet drift.

   ══ ★ WHEN THE LIGHT IS THERE AT ALL ══
   `active={focused || sending}`, and `BorderBeam` draws **nothing** when
   that is false — not a dimmed arc, nothing. An untouched input is an
   input. (v1 rested at 30 % and was reported as "a little coloured strip"
   on a box nobody had touched.)

   ⚠️ `sending` keeps it alive after the keyboard closes, which is the one
   case where "listening" is the wrong word and "working" is the right
   one.

   ══ WHAT THE BEAM MAY NOT DO ══
   It is wrapped in `FailSoft` over a real 1 px border, so a thrown beam
   leaves an ordinary input. ⚠️ That is protection against a React throw
   and NOT against a native Skia crash — see `BorderBeam`'s header, where
   the one real crash this feature has had is written down.

   ⚠️ The canvas is `pointerEvents="none"` and is rendered BEFORE the
   content, so it sits underneath. Mobile `CLAUDE.md` §1 records what
   happens otherwise: a Skia canvas is a native view that will claim the
   touch, and the control above it then animates perfectly and does
   nothing.
   ================================================================== */

import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import {
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type LayoutChangeEvent,
  type NativeSyntheticEvent,
  type TextInputContentSizeChangeEventData,
} from 'react-native';
import {
  cancelAnimation,
  Easing,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import BorderBeam, { type BeamVariant } from '@/components/atoms/BorderBeam';
import FailSoft from '@/components/atoms/FailSoft';
import { RADIUS } from '@/theme/tokens';
import { useIsDark, useTheme } from '@/theme/useTheme';

/** The box's own corner radius. The beam's ring is cut to the same number. */
const BOX_RADIUS = RADIUS.lg + 4;

/**
 * One line of the field at its own type size, and the ceiling it grows to.
 *
 * ⚠️ `MIN_INPUT` is a LINE, not a tap target. It was 44 — the tap-target
 * minimum — which is the right number for a button and the wrong one for a
 * field whose height is supposed to say how much has been written. The
 * whole box is the target here, and it is far larger than 44 either way.
 */
const MIN_INPUT = 24;
const MAX_INPUT = 116;

/** What one keystroke adds to the beam's energy, and how long it takes to fade. */
const KEYSTROKE = 0.34;
const COOL_MS = 1600;

export interface ChatComposerProps {
  placeholder: string;
  /** Called with the trimmed draft. The composer clears itself. */
  onSend: (text: string) => void;
  /** Opens the study picker. Omit and the attach button is not rendered. */
  onAttach?: () => void;
  /** The attached study's label, or null. Shown as a chip along the bottom. */
  attachmentLabel?: string | null;
  onClearAttachment?: () => void;
  /** True while a send is in flight — the beam stays alive, send is locked. */
  sending?: boolean;
  rtl?: boolean;
  variant?: BeamVariant;
  /** Accessible labels, already localised. */
  labels: { attach: string; send: string; clear: string };
}

export default function ChatComposer({
  placeholder,
  onSend,
  onAttach,
  attachmentLabel = null,
  onClearAttachment,
  sending = false,
  rtl = false,
  variant = 'ocean',
  labels,
}: ChatComposerProps) {
  const t = useTheme();
  const dark = useIsDark();

  const [text, setText] = useState('');
  const [focused, setFocused] = useState(false);
  /** The field's own height, driven by its content. See `MIN_INPUT`. */
  const [inputH, setInputH] = useState(MIN_INPUT);
  /* The box's own size, for the beam's ring. A zero is never a measurement
     — `BorderBeam` refuses to draw from one — so this stays 0 until the
     first real layout and the beam simply is not there for that frame. */
  const [box, setBox] = useState({ w: 0, h: 0 });

  /**
   * ★ How hard the writing is going, 0–1.
   *
   * A shared value rather than state: it is written on every keystroke and
   * read on the UI thread by Skia, so putting it in React would re-render
   * the composer at typing rate for a number nothing in React reads.
   */
  const energy = useSharedValue(0);
  const stoke = () => {
    cancelAnimation(energy);
    /* Add to whatever is left rather than restarting from zero — that is
       what makes FAST typing sit higher than slow typing instead of every
       keystroke producing the same flash. */
    energy.value = Math.min(1, energy.value + KEYSTROKE);
    energy.value = withTiming(0, { duration: COOL_MS, easing: Easing.out(Easing.quad) });
  };

  const canSend = (text.trim().length > 0 || attachmentLabel !== null) && !sending;

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) setBox({ w: width, h: height });
  };

  const onContentSize = (e: NativeSyntheticEvent<TextInputContentSizeChangeEventData>) => {
    const h = Math.min(MAX_INPUT, Math.max(MIN_INPUT, Math.ceil(e.nativeEvent.contentSize.height)));
    /* Only on a real change: Android fires this on nearly every keystroke,
       and setting an identical height would re-render the box (and re-measure
       it, and re-lay out the beam) for nothing. */
    setInputH((prev) => (prev === h ? prev : h));
  };

  const submit = () => {
    if (!canSend) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSend(text.trim());
    setText('');
    setInputH(MIN_INPUT);
    /* Sending is the end of a thought: put the keyboard away rather than
       leaving the patient in a mode they have to discover how to leave. */
    Keyboard.dismiss();
  };

  const align = rtl ? ('right' as const) : ('left' as const);

  return (
    <View
      style={[styles.box, { backgroundColor: t.surface, borderColor: t.border }]}
      onLayout={onLayout}
    >
      {/* ── The light. First child, so it is beneath everything, and
             decoration so a React throw costs nothing but itself. ── */}
      <FailSoft
        label="composer beam"
        /* Nothing. The box's own 1 px border IS the fallback, so a thrown
           beam leaves a perfectly ordinary input rather than a hole. */
        fallback={null}
      >
        <BorderBeam
          width={box.w}
          height={box.h}
          radius={BOX_RADIUS}
          active={focused || sending}
          energy={energy}
          theme={dark ? 'dark' : 'light'}
          variant={variant}
        />
      </FailSoft>

      {/* ── Top row: attach ── */}
      {onAttach && (
        <View style={[styles.topRow, rtl && styles.rowRtl]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={labels.attach}
            onPress={() => {
              void Haptics.selectionAsync();
              onAttach();
            }}
            style={({ pressed }) => [
              styles.round,
              { backgroundColor: t.bgSoft, borderColor: t.border, opacity: pressed ? 0.6 : 1 },
            ]}
            hitSlop={8}
          >
            <Ionicons name="pulse" size={18} color={t.textSecondary} />
          </Pressable>
        </View>
      )}

      {/* ── The field ── */}
      <TextInput
        style={[styles.input, { color: t.textPrimary, textAlign: align, height: inputH }]}
        value={text}
        onChangeText={(next) => {
          setText(next);
          stoke();
        }}
        onContentSizeChange={onContentSize}
        placeholder={placeholder}
        placeholderTextColor={t.textTertiary}
        multiline
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        accessibilityLabel={placeholder}
        /* `default`, not `send`: the field is multiline, so Return has to
           make a new line. Sending is the button's job, which is also the
           only way to send with an attachment and no text. */
        returnKeyType="default"
        editable={!sending}
      />

      {/* ── Bottom row: the chips, and send ── */}
      <View style={[styles.bottomRow, rtl && styles.rowRtl]}>
        <View style={[styles.chips, rtl && styles.rowRtl]}>
          {attachmentLabel !== null && (
            <View style={[styles.chip, { backgroundColor: t.bgSoft, borderColor: t.border }]}>
              <Ionicons name="pulse" size={13} color={t.textSecondary} />
              <Text style={[styles.chipText, { color: t.textSecondary }]} numberOfLines={1}>
                {attachmentLabel}
              </Text>
              {onClearAttachment && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={labels.clear}
                  onPress={onClearAttachment}
                  hitSlop={8}
                >
                  <Ionicons name="close" size={14} color={t.textTertiary} />
                </Pressable>
              )}
            </View>
          )}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={labels.send}
          accessibilityState={{ disabled: !canSend }}
          disabled={!canSend}
          onPress={submit}
          style={({ pressed }) => [
            styles.round,
            styles.send,
            {
              /* The send button is the one thing on this box allowed to be
                 solid: it is the only control whose state has to be readable
                 at a glance. Disabled is a surface tint, not a greyed navy —
                 a dimmed dark circle on a dark box reads as an icon that
                 failed to load. */
              backgroundColor: canSend ? t.accent : t.bgSoft,
              borderColor: canSend ? t.accent : t.border,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
          hitSlop={8}
        >
          <Ionicons name="arrow-up" size={18} color={canSend ? t.surface : t.textTertiary} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderRadius: BOX_RADIUS,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    gap: 8,
    /* ⚠️ The beam's canvas is larger than this box and is positioned
       outside it. `overflow: 'hidden'` here would clip the halo away and
       leave only the stroke — the effect would look "not working" rather
       than clipped, which is the hardest kind of visual bug to diagnose. */
    overflow: 'visible',
  },
  rowRtl: { flexDirection: 'row-reverse' },
  topRow: { flexDirection: 'row', alignItems: 'center' },
  input: {
    fontSize: 16.5,
    lineHeight: 22,
    /* No vertical padding: the height IS the content height now, and
       padding on top of it would make every line taller than a line. */
    paddingTop: 0,
    paddingBottom: 0,
    textAlignVertical: 'top',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  chips: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    maxWidth: 220,
  },
  chipText: { fontSize: 12.5, flexShrink: 1 },
  round: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  send: { marginStart: 'auto' },
});

// v2.0.0 — Answers three of five reports from a phone. ★ THE BOX STARTS AT ONE
//          LINE and grows with the content (`MIN_INPUT` was 44, a tap-target
//          number used for a field whose height is supposed to mean something).
//          ★ SENDING DISMISSES THE KEYBOARD — "you can never get out of typing
//          mode". ★ AND THE BEAM IS DRIVEN BY TYPING: `energy` rises on every
//          keystroke and decays over COOL_MS, and BorderBeam spends it on both
//          brightness and speed, so fast typing sits higher than slow typing
//          instead of every keystroke producing the same flash.
