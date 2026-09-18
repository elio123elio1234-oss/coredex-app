/* ==================================================================
   LeadDebugScreen — ⚠️ TEMPORARY hardware bring-up screen.

   Asked for the day firmware v3 went on the board: "how can I see that
   it records two leads? A debug screen where I see only Lead I, Lead II
   and the second Lead II — no intros, no timed recording, just to see
   the signal is live. Only for this debug, and then we switch it off as
   if it had never been."

   So: connect, three live traces, the numbers that prove the third
   channel is real — and nothing else. It records nothing, saves
   nothing, gates nothing and starts no timer.

   ── HOW IT GOES AWAY ──
   `LEAD_DEBUG_SCREEN_ENABLED = false` (config/featureFlags.ts). The
   route is then not registered and the Settings row is not rendered;
   this file, LeadDebugMonitor and useLeadDebug become unreachable. It
   is JS-only, so switching it off is a one-minute OTA.

   ── ENGLISH ON PURPOSE ──
   Like the build label and the session diagnostic in Settings → About:
   this is a developer readout, and a bug report should quote strings
   that can be grepped for. It is not patient copy and is not in the
   i18n tables — which also means deleting it leaves no orphan keys.

   The connection is the app-wide BleProvider's, exactly as in Settings:
   leaving this screen does not drop the link.
   ================================================================== */

import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import SettingsChip from '@/components/atoms/SettingsChip';
import SegmentedControl from '@/components/molecules/SegmentedControl';
import LeadDebugMonitor from '@/components/organisms/LeadDebugMonitor';
import { useBle } from '@/features/ble/useBle';
import { useLeadDebug } from '@/features/debug/useLeadDebug';
import { useTheme } from '@/theme/useTheme';

type ViewMode = 'filtered' | 'raw';

const MODE_OPTIONS: readonly { value: ViewMode; label: string }[] = [
  { value: 'filtered', label: 'Filtered (as on the exam)' },
  { value: 'raw', label: 'Raw' },
];

const NO_SECOND_COPY =
  'No second Lead II in this stream.\nThe device runs firmware older than v3 (or this is the simulator).';

function BackChevron({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M15 18l-6-6 6-6" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export default function LeadDebugScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const nav = useNavigation<{ goBack: () => void }>();
  const ble = useBle();
  const [mode, setMode] = useState<ViewMode>('filtered');
  const [box, setBox] = useState({ width: 0, height: 0 });
  const { rings, stats } = useLeadDebug(mode === 'filtered');

  const onBox = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    // A zero is never a measurement (History v0.58.4 paid for that one).
    if (width > 0 && height > 0 && (width !== box.width || height !== box.height)) {
      setBox({ width, height });
    }
  };

  /* ── The link, in words ── */
  let link: string;
  if (ble.isSimulated) link = 'SIMULATED signal - not a device';
  else if (ble.status === 'streaming') link = ble.isStale ? 'Connected - NO SAMPLES ARRIVING' : 'Streaming';
  else if (ble.status === 'connected') link = 'Connected, waiting for samples';
  else if (ble.status === 'connecting') link = 'Scanning / connecting...';
  else if (ble.status === 'error') link = ble.error ?? 'Bluetooth error';
  else link = 'Not connected';

  const live = ble.isStreaming;

  /* ── The verdict on the third channel ── */
  let copyLine = '-';
  let copyTone: 'neutral' | 'ok' | 'warn' = 'neutral';
  if (live && !stats.hasSecondCopy) {
    copyLine = '2-channel stream: no II-b';
    copyTone = 'warn';
  } else if (live && stats.corr !== null && stats.diffRmsUv !== null) {
    if (stats.diffRmsUv === 0) {
      copyLine = 'II-b is IDENTICAL to II-a: duplicated, not a second electrode';
      copyTone = 'warn';
    } else {
      copyLine = `r = ${stats.corr.toFixed(3)} · II-a - II-b = ${stats.diffRmsUv.toFixed(0)} uV RMS`;
      copyTone = stats.corr >= 0.9 ? 'ok' : 'warn';
    }
  } else if (live) {
    copyLine = 'measuring...';
  }

  const rows: { k: string; v: string; tone?: 'neutral' | 'ok' | 'warn' }[] = [
    { k: 'Device', v: ble.deviceName || '-' },
    {
      k: 'Stream',
      v: !live
        ? '-'
        : stats.hasSecondCopy
          ? '3-channel (firmware v3)'
          : ble.isSimulated
            ? 'simulator (2-channel)'
            : '2-channel (legacy firmware)',
      tone: !live ? 'neutral' : stats.hasSecondCopy ? 'ok' : 'warn',
    },
    {
      k: 'Rate',
      v:
        stats.sampleRateHz === null
          ? '-'
          : `${stats.sampleRateHz.toFixed(0)} Hz (nominal ${ble.SAMPLE_RATE}) · lost packets ${stats.droppedPackets}`,
    },
    {
      k: 'Electrodes',
      v: !live
        ? '-'
        : [
            ble.rldFault ? 'RLD FAULT' : 'RLD ok',
            ble.secondLegOff ? 'LL#2 OFF' : 'LL#2 on',
            ble.railed.I ? 'I RAILED' : null,
            ble.railed.II ? 'II RAILED' : null,
          ]
            .filter(Boolean)
            .join(' · '),
      tone: !live ? 'neutral' : ble.rldFault || ble.secondLegOff || ble.railed.I || ble.railed.II ? 'warn' : 'ok',
    },
    { k: 'II-a vs II-b', v: copyLine, tone: copyTone },
  ];

  const inkFor = (tone?: 'neutral' | 'ok' | 'warn') =>
    tone === 'ok' ? t.success : tone === 'warn' ? t.danger : t.textPrimary;

  return (
    <View style={[styles.root, { backgroundColor: t.bg, paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View style={[styles.topBar, { paddingTop: insets.top + 6 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={12}
          onPress={() => {
            void Haptics.selectionAsync();
            nav.goBack();
          }}
          style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}
        >
          <BackChevron color={t.textPrimary} />
          <Text style={[styles.backLabel, { color: t.textPrimary }]}>Settings</Text>
        </Pressable>
        <SettingsChip label="TEMPORARY DEBUG" tone="warn" />
      </View>

      <View style={styles.head}>
        <Text style={[styles.title, { color: t.textPrimary }]}>Lead debug</Text>
        <Text style={[styles.sub, { color: t.textSecondary }]}>
          Live signal only. Nothing here is recorded or saved.
        </Text>
      </View>

      <View style={styles.controls}>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            if (ble.isConnected || ble.status === 'connecting') ble.disconnect();
            else if (ble.isSupported) void ble.connect();
            else ble.connectSimulator();
          }}
          style={({ pressed }) => [
            styles.connect,
            {
              backgroundColor: ble.isConnected || ble.status === 'connecting' ? t.dangerSoft : t.accentSoft,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Text
            style={[
              styles.connectText,
              { color: ble.isConnected || ble.status === 'connecting' ? t.danger : t.textPrimary },
            ]}
          >
            {ble.isConnected || ble.status === 'connecting'
              ? 'Disconnect'
              : ble.isSupported
                ? 'Connect device'
                : 'Start simulator (no Bluetooth in this build)'}
          </Text>
        </Pressable>
        <Text numberOfLines={2} style={[styles.link, { color: live ? t.success : t.textSecondary }]}>
          {link}
        </Text>
      </View>

      <View style={styles.modeRow}>
        <SegmentedControl options={MODE_OPTIONS} value={mode} onChange={setMode} accessibilityLabel="Trace mode" />
      </View>

      {/* The traces take whatever height is left — measured, never assumed. */}
      <View style={styles.monitor} onLayout={onBox}>
        {box.width > 0 ? (
          <LeadDebugMonitor
            width={box.width}
            height={box.height}
            rings={rings}
            p2pMv={stats.p2pMv}
            noSecondCopyText={live ? NO_SECOND_COPY : 'Connect a device to see Lead II-b.'}
          />
        ) : null}
      </View>

      <View style={[styles.table, { backgroundColor: t.surface, borderColor: t.border }]}>
        {rows.map((r, i) => (
          <View
            key={r.k}
            style={[styles.tr, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.border }]}
          >
            <Text style={[styles.tk, { color: t.textSecondary }]}>{r.k}</Text>
            <Text numberOfLines={2} style={[styles.tv, { color: inkFor(r.tone) }]}>
              {r.v}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 14 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 2 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingVertical: 6 },
  backLabel: { fontSize: 17, fontWeight: '600' },
  head: { paddingHorizontal: 4, paddingBottom: 8 },
  title: { fontSize: 26, fontWeight: '800' },
  sub: { fontSize: 13, marginTop: 2 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 8 },
  connect: { minHeight: 44, borderRadius: 12, paddingHorizontal: 16, justifyContent: 'center', flexShrink: 1 },
  connectText: { fontSize: 15, fontWeight: '700' },
  link: { flex: 1, fontSize: 13, fontWeight: '700' },
  modeRow: { paddingBottom: 8 },
  monitor: { flex: 1, minHeight: 180 },
  table: { marginTop: 8, borderRadius: 14, borderWidth: 1, paddingHorizontal: 12 },
  tr: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7 },
  tk: { width: 86, fontSize: 12, fontWeight: '700' },
  tv: { flex: 1, fontSize: 12.5, fontWeight: '700', fontVariant: ['tabular-nums'] },
});

// v1.0.0 — TEMPORARY (behind LEAD_DEBUG_SCREEN_ENABLED): connect, watch Lead I /
//          II-a / II-b live, read the rate, the electrode states and the
//          II-a↔II-b agreement. No recording, no timer, no save.
