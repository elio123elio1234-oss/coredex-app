/* ==================================================================
   ConnectionStrip (organism) — one quiet line under the status bar,
   saying whether what is on screen was just confirmed by the server or
   is the last thing this phone was told.

   ══ WHY THIS EXISTS ══
   The app opens on a session restored from the device, without waiting
   for a server (`AuthGate` v2.0.0). That is the right behaviour and it
   creates exactly one obligation: a patient looking at their record is
   entitled to know which of those two they are looking at. An app that
   silently renders cached data as though it were live is the same class
   of lie as a frozen ECG trace drawn as a live one.

   ══ HOW IT GOT HERE — THREE VERSIONS, EACH ONE QUIETER ══
   ① A coloured toast: `successSoft` / `attentionSoft` plate, hairline
      border, coloured status dot, sliding down from off-screen. A web
      notification banner, sitting above a Liquid Glass dock. Reported as
      ugly, and it was.
   ② A monochrome glass capsule — the dock's own material, no colour, no
      status dot. Right material, still a container.
   ③ **No container at all.** The words alone, which is where this should
      have started: the capsule was drawing a box around two words to
      announce that they were a thing worth putting in a box. Once the
      text is legible, the frame around it is pure decoration, and
      decoration on a status line is exactly what makes chrome feel
      bolted on.

   ══ AND WHY "CONNECTED" IS NOT A STATE HERE ══
   Reconnecting is not an achievement. A badge for it would appear
   *after* everything was already fine — an interruption caused by the
   absence of a problem. The notice disappearing IS the confirmation, so
   the line simply fades out. Live and settled draws nothing at all; a
   permanent "online" badge stops being read within a day, and then it is
   not read on the day it matters either.

   ══ pointerEvents ══
   `none`, at every level. This floats over whatever screen is up —
   including the landscape exam — and a strip that can eat a touch is a
   strip that can break a measurement. It is information, never a control.
   ================================================================== */

import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ENV } from '@/config/env';
import { useSync } from '@/features/sync/useSync';
import { useTranslation } from '@/i18n/useTranslation';
import { useAppSelector } from '@/store/hooks';
import { useTheme } from '@/theme/useTheme';

/**
 * Say nothing at all for the first moment after the app opens.
 *
 * ★ Not cosmetic. A restored session starts as `offline` by definition —
 * that is what "we have not asked yet" means — and the revalidation that
 * corrects it is dispatched from an effect, i.e. after this has already
 * rendered once. Without the grace, every single cold start would flash
 * the offline notice before settling, including the ones with full
 * signal. A line that cries wolf on every launch is one nobody reads on
 * the launch that matters.
 */
const SETTLE_MS = 900;

/** RN's `small` indicator is a fixed ~20 pt, which is a spinner with its
    own opinions next to 12 pt type. Scaled down to sit on the text's cap
    height rather than tower over it. */
const SPINNER_SCALE = 0.62;

type Strip = 'connecting' | 'offline';

export default function ConnectionStrip() {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const insets = useSafeAreaInsets();
  const sessionMode = useAppSelector((s) => s.auth.sessionMode);
  const revalidating = useAppSelector((s) => s.auth.revalidating);
  const signedIn = useAppSelector((s) => s.auth.user !== null);
  const sync = useSync();

  const [settled, setSettled] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(true), SETTLE_MS);
    return () => clearTimeout(timer);
  }, []);

  /**
   * ★ ONE signal, fed from the transport.
   *
   * An earlier version read `sessionMode` AND the sync engine's phase,
   * because `sessionMode` only ever moved towards `live` and could not
   * report a phone that connected at boot and walked into a basement.
   * Reading two half-truths did not make a whole one: the sync phase only
   * changes when a sync RUNS, so when the network came back under an app
   * already open, neither signal moved and the notice sat there until the
   * app was restarted. Reported, and correctly.
   *
   * `sessionMode` now moves in both directions, dispatched by
   * `httpBaseQuery` from every single request — the only layer that
   * actually knows, and the one thing that cannot go stale while the app
   * is being used. So there is one signal again, and it is the true one.
   */
  const enabled = ENV.hasBackend && signedIn && settled;
  const state: Strip | null = !enabled
    ? null
    : sessionMode === 'live'
      ? null
      : revalidating || sync.phase === 'syncing'
        ? 'connecting'
        : 'offline';

  /* ── The fade ──
     Opacity ONLY, and that is a consequence of losing the capsule rather
     than a separate decision. A container can settle — scale up a few per
     cent and read as a small object arriving. Bare words cannot: scaling
     text reads as a zoom, which is the loudest thing this line could
     possibly do. So it simply appears.

     Driven by a shared value rather than Reanimated's layout presets, so
     the line stays MOUNTED at zero opacity. That is what lets
     `offline → connecting` change the words in place instead of the whole
     thing leaving and re-entering every time the sync engine wakes up.
     Free: it is absolutely positioned and never takes a touch. */
  const shown = useSharedValue(0);
  const visible = state !== null;
  useEffect(() => {
    shown.value = withTiming(visible ? 1 : 0, { duration: visible ? 260 : 200 });
  }, [visible, shown]);

  const fadeStyle = useAnimatedStyle(() => ({ opacity: shown.value }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.root, { top: insets.top + 8 }, fadeStyle]}
    >
      <View style={styles.row}>
        <View style={styles.slot}>
          {state === 'connecting' ? (
            <ActivityIndicator
              size="small"
              color={t.textTertiary}
              style={{ transform: [{ scale: SPINNER_SCALE }] }}
            />
          ) : (
            /* Outline, not filled: a filled glyph is a status, an outline
               is a note. This is a note. */
            <Ionicons name="cloud-offline-outline" size={13} color={t.textTertiary} />
          )}
        </View>
        <Text
          style={[styles.label, { color: t.textSecondary }]}
          numberOfLines={1}
          allowFontScaling={false}
        >
          {state === 'connecting' ? tr('connConnecting') : tr('connOffline')}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  /* Centred rather than full-bleed: a full-width bar reads as a system
     alert and pulls the eye off the screen's own content. A line is an
     aside. */
  root: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 50 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: '86%' },
  /* A fixed box for the glyph so swapping a 13 pt icon for a scaled
     spinner does not shift the label sideways by a pixel or two — the
     kind of twitch that is only ever noticed subconsciously, as
     cheapness. */
  slot: { width: 14, height: 14, alignItems: 'center', justifyContent: 'center' },
  /* 12 pt medium, not semibold: this is a caption, and with no container
     left to carry the emphasis, weight is the only loud thing available
     at this size. */
  label: { fontSize: 12, fontWeight: '500', letterSpacing: 0.1 },
});

// v1.3.0 — The capsule is gone. Once the words are legible the frame around
//          them is decoration, and it was drawing a box around two words to
//          announce they were worth putting in a box. Opacity-only now: a
//          container can settle by scaling, bare text scaling reads as a zoom.
// v1.2.0 — Reads ONE signal (`auth.sessionMode`) again, now that the transport
//          moves it in both directions. Pairing it with the sync engine's phase
//          was meant to cover the basement case and did not: the phase only
//          changes when a sync RUNS, so a network that returned under an open app
//          moved neither signal and the notice stayed up until a restart.
// v1.1.0 — Reported as ugly and un-native, and three things were wrong. The
//          green "Connected" badge is GONE — reconnecting is not an achievement,
//          and the honest confirmation is the notice disappearing. The coloured
//          plate became the dock's own GlassSurface, monochrome.
// v1.0.0 — Says whether the record on screen was just confirmed by the server
//          or is the device's own copy — the obligation created by letting the
//          app open on a restored session. Silent in the steady state.
