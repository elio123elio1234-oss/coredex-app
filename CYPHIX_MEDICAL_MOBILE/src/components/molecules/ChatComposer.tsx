/* ==================================================================
   ChatComposer (molecule) — the message box, with light on its border.

     ╭─────────────────────────────────╮
     │ (◎)                             │   attach an ECG
     │                                 │
     │  Write a message…               │
     │                                 │
     │  [ 7 Aug · Limb (6)  ✕ ]   (↑)  │   attached study · send
     ╰─────────────────────────────────╯

   ══ WHERE THE SHAPE COMES FROM ══
   The layout is the one in the reference the user pointed at: a tall
   rounded box with a round button at the top-start, the text in the
   middle, chips along the bottom-start and the send button as a circle at
   the bottom-end. Only the CONTROLS are different, because this app has
   no agents to pick — the top-start button attaches an ECG study, and the
   chip is that study rather than a model name.

   That mapping is not a liberty: it is the web's own `ChatComposer`
   (attach · text · send, plus a coded consult reason in clinic mode)
   rearranged into the taller shape, so the two platforms stay the same
   feature. Only the arrangement changed.

   ══ ★ WHEN THE LIGHT MOVES, AND WHY IT IS NOT ALWAYS ══
   `active={focused || sending}`. At rest the border is a still gradient
   edge; touch the field and it turns.

   Chosen deliberately over "always on", which is what the reference does.
   Two reasons, and the first is written into this codebase already:

   1. `ThinkingOrb`'s header states that a Skia animation is "fine for a
      splash that has a 60 s ceiling over it" and "NOT fine as ambient
      chrome somewhere it could run for an hour". A composer is on screen
      for as long as the tab is open, which is exactly that. `BorderBeam`
      is cheaper than the orb (a transform, not a per-frame picture), but
      cheap is not free and this screen belongs to someone whose phone has
      to last the day.
   2. It makes the animation MEAN something. A border that lights when you
      touch the field is the app saying it is listening; a border that
      turns forever is decoration, and decoration on a medical screen is
      the thing every other surface in this app was stripped of.

   ⚠️ `sending` keeps it turning after the keyboard closes, which is the
   one case where "listening" is the wrong word and "working" is the right
   one — the same distinction the boot orb draws.

   ══ WHAT THE BEAM MAY NOT DO ══
   It is wrapped in `FailSoft`. The box has a real 1 px border of its own,
   so if Skia throws — or is simply absent, as it is in Expo Go — what is
   left is a perfectly ordinary input, not a broken screen. The beam is
   decoration by that file's own definition, and nothing a patient needs
   is behind it.

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
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import BorderBeam, { type BeamVariant } from '@/components/atoms/BorderBeam';
import FailSoft from '@/components/atoms/FailSoft';
import { RADIUS } from '@/theme/tokens';
import { useIsDark, useTheme } from '@/theme/useTheme';

/** The box's own corner radius. The beam's ring is cut to the same number. */
const BOX_RADIUS = RADIUS.lg + 6;
/** Room for roughly five lines before the field starts scrolling itself. */
const INPUT_MAX_HEIGHT = 112;
const INPUT_MIN_HEIGHT = 44;

export interface ChatComposerProps {
  placeholder: string;
  /** Called with the trimmed draft. The composer clears itself. */
  onSend: (text: string) => void;
  /** Opens the study picker. Omit and the attach button is not rendered. */
  onAttach?: () => void;
  /** The attached study's label, or null. Shown as a chip along the bottom. */
  attachmentLabel?: string | null;
  onClearAttachment?: () => void;
  /** True while a send is in flight — the beam keeps turning, send is locked. */
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
  /* The box's own size, for the beam's ring. A zero is never a measurement
     — `BorderBeam` refuses to draw from one — so this stays 0 until the
     first real layout and the beam simply is not there for that frame. */
  const [box, setBox] = useState({ w: 0, h: 0 });

  const canSend = (text.trim().length > 0 || attachmentLabel !== null) && !sending;

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) setBox({ w: width, h: height });
  };

  const submit = () => {
    if (!canSend) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSend(text.trim());
    setText('');
  };

  const align = rtl ? ('right' as const) : ('left' as const);

  return (
    <View
      style={[
        styles.box,
        {
          backgroundColor: t.surface,
          borderColor: t.border,
        },
      ]}
      onLayout={onLayout}
    >
      {/* ── The light. First child, so it is beneath everything, and
             decoration so a throw costs nothing but itself. ── */}
      <FailSoft
        label="composer beam"
        /* Nothing. The box's own 1 px border IS the fallback, so a thrown
           beam leaves a perfectly ordinary input rather than a hole — and
           unlike the boot orb's ring, there is no ambiguity to create here:
           Settings › About names anything this boundary caught. */
        fallback={null}
      >
        <BorderBeam
          width={box.w}
          height={box.h}
          radius={BOX_RADIUS}
          active={focused || sending}
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
              {
                backgroundColor: t.bgSoft,
                borderColor: t.border,
                opacity: pressed ? 0.6 : 1,
              },
            ]}
            hitSlop={8}
          >
            <Ionicons name="pulse" size={19} color={t.textSecondary} />
          </Pressable>
        </View>
      )}

      {/* ── The field ── */}
      <TextInput
        style={[styles.input, { color: t.textPrimary, textAlign: align }]}
        value={text}
        onChangeText={setText}
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
            <View
              style={[styles.chip, { backgroundColor: t.bgSoft, borderColor: t.border }]}
            >
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
              /* The send button is the one thing on this box that is allowed
                 to be solid: it is the only control whose state the patient
                 has to be able to read at a glance. Disabled is a surface
                 tint, not a greyed-out navy, because a dimmed dark circle on
                 a dark box reads as an icon that failed to load. */
              backgroundColor: canSend ? t.accent : t.bgSoft,
              borderColor: canSend ? t.accent : t.border,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
          hitSlop={8}
        >
          <Ionicons
            name="arrow-up"
            size={20}
            color={canSend ? t.surface : t.textTertiary}
          />
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
    paddingTop: 12,
    paddingBottom: 12,
    gap: 10,
    /* ⚠️ The beam's canvas is larger than this box and is positioned
       outside it. `overflow: 'hidden'` here would clip the halo away and
       leave only the stroke — the effect would look "not working" rather
       than clipped, which is the hardest kind of visual bug to diagnose. */
    overflow: 'visible',
  },
  rowRtl: { flexDirection: 'row-reverse' },
  topRow: { flexDirection: 'row', alignItems: 'center' },
  input: {
    minHeight: INPUT_MIN_HEIGHT,
    maxHeight: INPUT_MAX_HEIGHT,
    fontSize: 16.5,
    lineHeight: 22,
    /* iOS pads a multiline input from the top by default and Android does
       not; both are set so the first line sits where it looks like it
       should on either. */
    paddingTop: 4,
    paddingBottom: 4,
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
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    maxWidth: 220,
  },
  chipText: { fontSize: 12.5, flexShrink: 1 },
  round: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /* The send circle carries no border of its own when it is live — the fill
     is the affordance, and a ring around a filled circle reads as a second
     edge next to the box's. */
  send: { marginStart: 'auto' },
});

// v1.0.0 — The reference's box shape with this app's controls: attach an ECG,
//          write, send. The border carries `BorderBeam`, turning only while the
//          field is focused or a send is in flight — see the header for why not
//          always. Wrapped in FailSoft over a real 1 px border, so the worst
//          case is an ordinary input.
