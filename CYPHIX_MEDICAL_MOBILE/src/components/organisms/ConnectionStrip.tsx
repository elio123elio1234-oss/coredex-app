/* ==================================================================
   ConnectionStrip (organism) — one line at the top of the app saying
   whether what is on screen was just confirmed by the server, or is the
   last thing this phone was told.

   ══ WHY THIS EXISTS ══
   The app now opens on a session restored from the device, without
   waiting for a server (`AuthGate` v2.0.0). That is the right behaviour
   and it creates exactly one new obligation: a patient looking at their
   record is entitled to know which of those two things they are looking
   at. An app that silently renders cached data as though it were live is
   the same class of lie as a frozen ECG trace drawn as a live one — the
   thing `FRAME_STALE_MS` exists to prevent — and the honest answer costs
   one line of chrome.

   ══ WHAT IT SAYS, AND WHEN IT SHUTS UP ══
     connecting → a revalidation or a sync is in flight, and we are not
                  live yet. "Working on it", not an error.
     offline    → we asked and got no answer. The record on screen is the
                  device's own copy.
     connected  → shown for a moment when we go live, then gone. Without
                  it, reconnecting is invisible and the patient is left
                  watching a strip disappear with no idea whether that
                  meant success.
     (nothing)  → live and settled. ★ The steady state draws NOTHING. A
                  permanent "online" badge is a permanent distraction that
                  stops being read within a day, and then the one time it
                  matters it is not read either.

   ══ pointerEvents ══
   `none`, at every level. This floats over whatever screen is up —
   including the landscape exam — and a strip that can eat a touch is a
   strip that can break a measurement. It is information, never a
   control.
   ================================================================== */

import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ENV } from '@/config/env';
import { useSync } from '@/features/sync/useSync';
import { useTranslation } from '@/i18n/useTranslation';
import { useAppSelector } from '@/store/hooks';
import { useTheme } from '@/theme/useTheme';

/** How long "Connected" stays up before the strip goes quiet. Long enough
    to be read at a glance, short enough not to become chrome. */
const CONFIRM_MS = 1800;

/**
 * Say nothing at all for the first moment after the app opens.
 *
 * ★ Not cosmetic. A restored session starts as `offline` by definition —
 * that is what "we have not asked yet" means — and the revalidation that
 * corrects it is dispatched from an effect, i.e. after this has already
 * rendered once. Without the grace, every single cold start would flash
 * "Offline · showing saved data" before settling, including the ones with
 * full signal. A banner that cries wolf on every launch is one nobody
 * reads on the launch that matters.
 */
const SETTLE_MS = 900;

type Strip = 'connecting' | 'offline' | 'connected' | null;

export default function ConnectionStrip() {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const insets = useSafeAreaInsets();
  const sessionMode = useAppSelector((s) => s.auth.sessionMode);
  const revalidating = useAppSelector((s) => s.auth.revalidating);
  const signedIn = useAppSelector((s) => s.auth.user !== null);
  const sync = useSync();

  /* The confirmation is a MOMENT, not a state, so it is the one thing
     here that needs its own timer rather than being derived. */
  const [confirming, setConfirming] = useState(false);
  const [settled, setSettled] = useState(false);
  const live = sessionMode === 'live';

  useEffect(() => {
    const timer = setTimeout(() => setSettled(true), SETTLE_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!live) return;
    setConfirming(true);
    const timer = setTimeout(() => setConfirming(false), CONFIRM_MS);
    return () => clearTimeout(timer);
  }, [live]);

  /* With no backend configured this whole concept is meaningless: the
     build is the device mock, there is no server to be offline FROM, and
     a permanent "offline" banner over a working demo would be a bug
     report waiting to happen. */
  if (!ENV.hasBackend || !signedIn || !settled) return null;

  /**
   * ★ Reachability is BOTH signals, and it has to be.
   *
   * `sessionMode` only ever moves towards `live` — a confirmed session
   * stays confirmed, because losing signal does not un-confirm anything
   * the server said. So on its own it could not report a phone that went
   * live at boot and walked into a basement an hour later. The sync
   * engine's phase is the one that goes the other way: it is the thing
   * that has actually tried to reach the server most recently. Reading
   * only one of them leaves one direction of the truth unsayable.
   */
  const reachable = live && sync.phase !== 'offline';

  let state: Strip = null;
  if (!reachable) {
    state = revalidating || sync.phase === 'syncing' ? 'connecting' : 'offline';
  } else if (confirming) {
    state = 'connected';
  }

  if (state === null) return null;

  const tone =
    state === 'offline'
      ? { bg: t.attentionSoft, fg: t.textPrimary, dot: t.attention }
      : state === 'connected'
        ? { bg: t.successSoft, fg: t.textPrimary, dot: t.success }
        : { bg: t.surfaceHover, fg: t.textSecondary, dot: t.textTertiary };

  const label =
    state === 'offline'
      ? tr('connOffline')
      : state === 'connected'
        ? tr('connLive')
        : tr('connConnecting');

  return (
    <Animated.View
      pointerEvents="none"
      entering={FadeInUp.duration(220)}
      exiting={FadeOutUp.duration(220)}
      style={[styles.root, { top: insets.top + 6 }]}
    >
      <View style={[styles.pill, { backgroundColor: tone.bg, borderColor: t.border }]}>
        <View style={[styles.dot, { backgroundColor: tone.dot }]} />
        <Text style={[styles.label, { color: tone.fg }]} numberOfLines={1}>
          {label}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  /* Centred rather than full-bleed: a full-width bar reads as a system
     alert and shifts the eye away from the screen's own content. A pill
     is a note. */
  root: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 50 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: '90%',
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  label: { fontSize: 12, fontWeight: '600', letterSpacing: 0.2 },
});

// v1.0.0 — Says whether the record on screen was just confirmed by the server
//          or is the device's own copy — the obligation created by letting the
//          app open on a restored session. Silent in the steady state.
