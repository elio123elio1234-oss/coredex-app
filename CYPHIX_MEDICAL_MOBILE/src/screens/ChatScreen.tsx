/* ==================================================================
   ChatScreen — messages with the care team.

   ══ ⚠️ WHAT THIS SCREEN IS TODAY, STATED PLAINLY ══
   **Appearance only.** This app has no `messageApi` — `services/api/
   endpoints/` holds photo, profile, recording and sync, and nothing else —
   so there is no thread to load and no send to make. This round was asked
   for as *"let's build just the LOOK of the chat tab in the native app
   first"*, to judge the composer's border effect on a real phone.

   So the screen is honest about it rather than pretending: the thread area
   says the conversation is not connected on this device yet (the copy the
   locale already carried), and the composer is fully alive — you can focus
   it, type in it, watch the light turn — but its send button hands the
   draft to a callback that has nowhere to take it, and says so.

   What must NOT happen next, and is the reason this is written down: the
   draft must not be pushed into local state to make the screen look like
   it works. A message that appears in a care-team thread and was never
   sent to anybody is the worst possible thing for this screen to do.

   When `messageApi` lands, `onSend` becomes the mutation and `ThreadArea`
   becomes the real list. Nothing else here changes.

   ══ THE COMPOSER IS PINNED, THE THREAD SCROLLS ══
   Standard messaging shape: the composer sits above the dock and rises
   with the keyboard.
   ================================================================== */

import { useState } from 'react';
import { KeyboardAvoidingView, StyleSheet, Text, View } from 'react-native';
import ChatComposer from '@/components/molecules/ChatComposer';
import PatientShell from '@/components/templates/PatientShell';
import { useTranslation } from '@/i18n/useTranslation';
import { useTheme } from '@/theme/useTheme';

export default function ChatScreen() {
  const t = useTheme();
  const { t: tr, rtl } = useTranslation();

  /* Held only so the send button has a state to be in. It is deliberately
     NOT rendered into the thread — see the header. */
  const [sending] = useState(false);

  return (
    <PatientShell>
      {/* ⚠️ `padding` on BOTH platforms, not iOS-only.
          The usual advice is to leave Android to `adjustResize`, and on this
          app that is wrong: it is edge-to-edge (Android 15 makes that
          mandatory), the window therefore does NOT resize when the keyboard
          opens, and the composer sat completely hidden behind it — typed
          into, invisible. Seen on an emulator; a bundle cannot tell. */}
      <KeyboardAvoidingView style={styles.root} behavior="padding">
        <Text style={[styles.title, { color: t.textPrimary }]}>{tr('chatTitle')}</Text>

        {/* The thread's place. One centred line today, a list tomorrow. */}
        <View style={styles.thread}>
          <Text
            style={[styles.empty, { color: t.textSecondary, textAlign: rtl ? 'right' : 'left' }]}
          >
            {tr('chatEmptyBody')}
          </Text>
        </View>

        <ChatComposer
          placeholder={tr('chatPlaceholder')}
          rtl={rtl}
          sending={sending}
          labels={{
            attach: tr('chatAttach'),
            send: tr('chatSend'),
            clear: tr('close'),
          }}
          /* ⚠️ Nowhere to go yet, and that is the truth of this build. The
             draft is dropped rather than shown as a sent message — see the
             header for why faking it would be the wrong kind of demo. */
          onSend={() => {}}
        />
      </KeyboardAvoidingView>
    </PatientShell>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, gap: 14 },
  title: { fontSize: 32, fontWeight: '800', textAlign: 'center' },
  /* The thread takes whatever is left, so the composer is pinned to the
     bottom of the shell's content box without being absolutely positioned
     — which would put it over the dock rather than above it. */
  thread: { flex: 1, justifyContent: 'center' },
  empty: { fontSize: 14.5, lineHeight: 21 },
});

// v1.0.1 — `KeyboardAvoidingView` is `padding` on BOTH platforms. Leaving
//          Android to `adjustResize` is the usual advice and is wrong here: the
//          app is edge-to-edge, so the window does not resize and the composer
//          was hidden behind the keyboard entirely — typed into, invisible.
// v1.0.0 — The tab's appearance: a pinned composer carrying `BorderBeam`, with
//          the thread still an empty state because this app has no messageApi.
//          The draft is dropped on send rather than echoed into the thread — a
//          message that looks sent and was not is the one thing this screen must
//          never do.
