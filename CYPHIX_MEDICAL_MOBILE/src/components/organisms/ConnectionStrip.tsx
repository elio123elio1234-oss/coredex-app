/* ==================================================================
   ConnectionStrip (organism) — one quiet capsule under the status bar,
   saying whether what is on screen was just confirmed by the server or
   is the last thing this phone was told.

   ══ WHY THIS EXISTS ══
   The app opens on a session restored from the device, without waiting
   for a server (`AuthGate` v2.0.0). That is the right behaviour and it
   creates exactly one obligation: a patient looking at their record is
   entitled to know which of those two they are looking at. An app that
   silently renders cached data as though it were live is the same class
   of lie as a frozen ECG trace drawn as a live one.

   ══ v1.1.0 — WHAT WAS WRONG WITH THE FIRST VERSION ══
   Reported from the phone: the "Connected" capsule was ugly and did not
   feel native. Three separate faults, and the first is the interesting
   one:

   ① **"Connected" should never have existed.** Reconnecting is not an
      achievement, and a green success badge for it is a UI congratulating
      itself for doing its job. The honest confirmation is that the notice
      which WAS there is now gone — so the capsule simply dissolves. That
      also removes the worst moment in the old design: a green pill
      appearing *after* everything was already fine, i.e. a new
      interruption caused by the absence of a problem.

   ② **It was a coloured rectangle next to a glass dock.** The app's
      native feel IS the material: the dock is Liquid Glass on iOS 26. A
      flat `successSoft` / `attentionSoft` plate with a hairline border
      and a coloured status dot is a web toast, and sitting it above a
      glass bar is exactly the inconsistency that reads as improvised.
      It is now `GlassSurface` — the same atom, the same tint arithmetic,
      the same rim treatment — and it is MONOCHROME. Nothing here is
      urgent enough to spend a colour on; `attention` and `danger` mean
      specific things in this app and neither of them is "the wifi".

   ③ **It slid down like a notification banner.** A banner arrives from
      off-screen because it comes from elsewhere. This is the app talking
      about itself, so it settles into place instead: a spring on scale
      from 0.94 with opacity, and no translation at all.

   ══ WHEN IT SHUTS UP ══
   Live and settled draws NOTHING. A permanent "online" badge stops being
   read within a day, and then it is not read on the day it matters
   either.

   ══ pointerEvents ══
   `none`, at every level. This floats over whatever screen is up —
   including the landscape exam — and a strip that can eat a touch is a
   strip that can break a measurement. It is information, never a control.
   ================================================================== */

import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import GlassSurface, { IS_LIQUID_GLASS } from '@/components/atoms/GlassSurface';
import { ENV } from '@/config/env';
import { useSync } from '@/features/sync/useSync';
import { useTranslation } from '@/i18n/useTranslation';
import { useAppSelector } from '@/store/hooks';
import { useIsDark, useTheme } from '@/theme/useTheme';

/**
 * Say nothing at all for the first moment after the app opens.
 *
 * ★ Not cosmetic. A restored session starts as `offline` by definition —
 * that is what "we have not asked yet" means — and the revalidation that
 * corrects it is dispatched from an effect, i.e. after this has already
 * rendered once. Without the grace, every single cold start would flash
 * the offline notice before settling, including the ones with full
 * signal. A banner that cries wolf on every launch is one nobody reads on
 * the launch that matters.
 */
const SETTLE_MS = 900;

/** RN's `small` indicator is a fixed ~20 pt, which is a spinner with its
    own opinions next to 12 pt type. Scaled down to sit on the text's
    cap height rather than tower over it. */
const SPINNER_SCALE = 0.62;

type Strip = 'connecting' | 'offline';

export default function ConnectionStrip() {
  const t = useTheme();
  const dark = useIsDark();
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
   * ★ Reachability is BOTH signals, and it has to be.
   *
   * `sessionMode` only ever moves towards `live` — a confirmed session
   * stays confirmed, because losing signal does not un-confirm anything
   * the server said. So on its own it could not report a phone that went
   * live at boot and walked into a basement an hour later. The sync
   * engine's phase is the one that goes the other way: it is what has
   * actually tried to reach the server most recently. Reading only one of
   * them leaves one direction of the truth unsayable.
   */
  const enabled = ENV.hasBackend && signedIn && settled;
  const reachable = sessionMode === 'live' && sync.phase !== 'offline';
  const state: Strip | null = !enabled
    ? null
    : reachable
      ? null
      : revalidating || sync.phase === 'syncing'
        ? 'connecting'
        : 'offline';

  /* ── The settle ──
     Driven by shared values rather than Reanimated's layout presets, so
     the capsule can be kept MOUNTED and simply be at zero opacity. That
     is what lets `offline → connecting` change the words underneath
     without the whole thing leaving and re-entering, which is the fidget
     the old version had every time the sync engine woke up. Free: it is
     absolutely positioned and never takes a touch. */
  const shown = useSharedValue(0);
  const visible = state !== null;
  useEffect(() => {
    shown.value = visible
      ? withSpring(1, { damping: 18, stiffness: 180, mass: 0.6 })
      : withTiming(0, { duration: 200 });
  }, [visible, shown]);

  const settleStyle = useAnimatedStyle(() => ({
    opacity: shown.value,
    /* 0.94, not 0. A capsule that grows from nothing is a popover; one
       that firms up by 6 % is a thing that was always there arriving. */
    transform: [{ scale: 0.94 + shown.value * 0.06 }],
  }));

  /* Same arithmetic as the dock (`BottomDock`), deliberately: iOS 26 gets
     less tint because Apple's material is doing real work, and the
     BlurView fallback keeps more because an untinted blur over a light
     page really is nearly invisible (the v0.19.2 trap). Two surfaces of
     one material must not be tuned separately or they drift. */
  const tint = IS_LIQUID_GLASS
    ? dark
      ? 'rgba(19,27,44,0.34)'
      : 'rgba(255,255,255,0.38)'
    : dark
      ? 'rgba(19,27,44,0.52)'
      : 'rgba(255,255,255,0.62)';

  const rim = IS_LIQUID_GLASS
    ? dark
      ? 'rgba(255,255,255,0.10)'
      : 'rgba(255,255,255,0.45)'
    : dark
      ? 'rgba(255,255,255,0.14)'
      : 'rgba(200,208,224,0.55)';

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.root, { top: insets.top + 6 }, settleStyle]}
    >
      <GlassSurface dark={dark} tint={tint} style={[styles.pill, { borderColor: rim }]}>
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
      </GlassSurface>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  /* Centred rather than full-bleed: a full-width bar reads as a system
     alert and pulls the eye off the screen's own content. A capsule is an
     aside. */
  root: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 50 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingStart: 10,
    paddingEnd: 13,
    height: 28,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    /* `overflow: hidden` is what makes the BlurView fallback respect the
       radius — without it Android blurs a rectangle behind rounded
       corners and the capsule has square shoulders. */
    overflow: 'hidden',
    maxWidth: '86%',
  },
  /* A fixed box for the glyph so swapping a 13 pt icon for a scaled
     spinner does not shift the label sideways by a pixel or two — the
     kind of twitch that is only ever noticed subconsciously, as
     cheapness. */
  slot: { width: 14, height: 14, alignItems: 'center', justifyContent: 'center' },
  /* 12 pt medium, not 12 pt semibold: this is a caption, and weight is
     the loudest thing available at this size. */
  label: { fontSize: 12, fontWeight: '500', letterSpacing: 0.1 },
});

// v1.1.0 — Reported as ugly and un-native, and three things were wrong. The
//          green "Connected" badge is GONE — reconnecting is not an achievement,
//          and the honest confirmation is the notice disappearing. The coloured
//          plate is now the dock's own GlassSurface, monochrome, with the same
//          tint arithmetic. And it settles (spring on scale from 0.94) instead of
//          sliding in like a notification banner.
// v1.0.0 — Says whether the record on screen was just confirmed by the server
//          or is the device's own copy — the obligation created by letting the
//          app open on a restored session. Silent in the steady state.
