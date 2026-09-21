/* ==================================================================
   SendRequestButton (molecule) — the one action on the request form,
   with the border beam around it WHILE IT IS SENDING.

        ╭──────────────────────╮        at rest: a plain filled pill
        │    Send request      │
        ╰──────────────────────╯

        ╭━━━━┓─────────────────╮        sending: light runs the edge
        │    Sending…          │
        ╰──────────────────────╯

   ══ ★ WHY THE BEAM LIVES HERE AND NOWHERE ELSE ══
   It was on the message box, and on a screen that submits a medical
   request that was wrong twice over: it lit an input nobody had touched,
   and it ran while somebody was typing, which is the moment a form should
   be at its quietest. Asked for directly — *"only on the send button,
   while sending"*.

   That placement also gives the animation the only honest meaning it has
   here: **work is in flight**. It is not decoration on a field; it is the
   app saying the request has left and has not landed yet. The same
   distinction `BootSplash` draws with the orb.

   ⚠️ It is therefore NOT a loading spinner that happens to be pretty. It
   appears with `sending` and goes when `sending` goes, so if the request
   fails the light stops and the failure is stated in words — a beam that
   kept turning would say "still working" about something that had already
   given up.
   ================================================================== */

import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import BorderBeam from '@/components/atoms/BorderBeam';
import FailSoft from '@/components/atoms/FailSoft';
import { useIsDark, useTheme } from '@/theme/useTheme';

/** A pill. The radius is half the height, and the beam's ring matches. */
const HEIGHT = 52;
const RADIUS = HEIGHT / 2;

export interface SendRequestButtonProps {
  label: string;
  sendingLabel: string;
  onPress: () => void;
  disabled?: boolean;
  sending?: boolean;
}

export default function SendRequestButton({
  label,
  sendingLabel,
  onPress,
  disabled = false,
  sending = false,
}: SendRequestButtonProps) {
  const t = useTheme();
  const dark = useIsDark();
  const [box, setBox] = useState({ w: 0, h: 0 });

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    /* A zero is never a measurement — `BorderBeam` refuses to draw from
       one, so this simply stays 0 until the first real layout. */
    if (width > 0 && height > 0) setBox({ w: width, h: height });
  };

  const live = !disabled && !sending;

  return (
    <View style={styles.wrap} onLayout={onLayout}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={sending ? sendingLabel : label}
        accessibilityState={{ disabled: disabled || sending, busy: sending }}
        disabled={disabled || sending}
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onPress();
        }}
        style={({ pressed }) => [
          styles.pill,
          {
            /* Disabled is a surface tint rather than a dimmed navy: a faded
               dark pill on a dark page reads as something that failed to
               render, not as something waiting for you. */
            backgroundColor: live ? t.accent : t.bgSoft,
            borderColor: live ? t.accent : t.border,
            opacity: pressed ? 0.75 : 1,
          },
        ]}
      >
        <Text
          style={[styles.text, { color: live ? t.surface : t.textTertiary }]}
          numberOfLines={1}
        >
          {sending ? sendingLabel : label}
        </Text>
      </Pressable>

      {/* ★ ABOVE the pill, and ONLY while sending.

          Under it, the pill's own opaque fill hid everything except the
          outermost blurred halo — the crisp ring and the inner glow, which
          are the whole effect, were painted and then covered up. Above it,
          the light actually runs the button's edge.

          ⚠️ And that is safe here only because of the `sending &&`: a Skia
          canvas is a native view that can claim a touch, and one parked
          over a live button would leave a control that animates perfectly
          and does nothing (mobile CLAUDE.md §1). While this canvas exists
          the `Pressable` beneath it is already `disabled`, so there is no
          tap for it to steal; the moment the button is pressable again,
          the canvas is gone. */}
      {sending && (
        <FailSoft label="send beam" fallback={null}>
          <BorderBeam
            width={box.w}
            height={box.h}
            radius={RADIUS}
            active
            /* No `energy` — there is nobody typing to react to. The beam
               means "work is in flight", so it runs at full strength; see
               `BorderBeam`'s `ownEnergy`. */
            theme={dark ? 'dark' : 'light'}
          />
        </FailSoft>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  /* ⚠️ `overflow: 'visible'` — the beam's canvas is larger than the button
     and sits outside it. Clipping here would leave only the stroke, which
     looks like the effect not working rather than like it being clipped. */
  wrap: { overflow: 'visible' },
  pill: {
    height: HEIGHT,
    borderRadius: RADIUS,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  text: { fontSize: 16.5, fontWeight: '700' },
});

// v1.1.0 — The beam moved ON TOP of the pill and is now mounted only while
//          sending. Underneath, the pill's opaque fill covered the crisp ring
//          and the inner glow and left only a faint outer halo — it ran, and it
//          could not be seen. Mounting it only while `sending` is what makes
//          drawing over the control safe: the button beneath is disabled for
//          exactly as long as the canvas exists.
// v1.0.0 — The request form's single action, with `BorderBeam` around it only
//          while the send is in flight — the one place on this screen where an
//          animation means something ("work is in flight") rather than
//          decorating a field somebody is trying to type into.
