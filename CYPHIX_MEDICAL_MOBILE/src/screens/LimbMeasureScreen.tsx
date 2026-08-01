/* ==================================================================
   LimbMeasureScreen — the 6 limb leads: live monitor, then a report.
   A port of the web LimbMeasurePage, layout included.

   FLOW:
     set-up steps → live monitor → (heartbeat proven) → 10 s capture → REPORT

   ══ THE EXAM IS LANDSCAPE ══
   Declared on the route in RootNavigator (`orientation: 'landscape'`), so
   the OS rotates as part of the push and this screen's FIRST layout pass
   already measures the landscape box. Nothing here locks anything — see
   the flicker post-mortem in RootNavigator.

   ══ NOBODY PRESSES ANYTHING (the point of this screen) ══
   Holding this measurement takes BOTH of the patient's hands: the watch
   on one wrist, that hand resting on a leg, the other hand touching the
   crown. Asking them to also press "Record" is physically impossible —
   they would have to break the circuit to start recording it. So the
   capture arms itself the moment the frozen Pan-Tompkins gate proves a
   real, regular heartbeat, and the gate's reasoning stays on screen so
   it is never a black box.

   ══ THE LAYOUT IS THE WEB'S `.limb-stage` ══
   Three rows — a compact bar, the traces, a status foot — where ONLY the
   traces row flexes (`grid-template-rows: auto minmax(0,1fr) auto`). It
   never scrolls: a patient in position cannot reach a scrollbar, and a
   clinician must see all six leads at once.

   ══ ON A PHONE THE TRACES GET EVERYTHING ELSE'S HEIGHT ══
   A landscape phone is ~390 pt tall. Laid out at the web's desktop sizes
   the bar took ~85 of those and the foot ~71, leaving each of the three
   trace rows about 52 pt — a waveform drawn in a letterbox. So on a short
   stage:

     • The countdown moves INTO the bar, beside the BPM and styled like
       it (big number + unit). During a capture the foot then has nothing
       left to show and is not rendered at all, so the traces take the
       whole screen below the bar — which is where the patient's eyes are
       during the ten seconds that matter.
     • The bar drops its second line while idle. The instruction is not
       lost: the guide circle overlaying the traces carries it, in bigger
       type, until the gate starts finding beats.
     • The auto-arm hint is hidden while that same circle is up, because
       the circle's caption already says the recording starts on its own.

   Net: ~52 pt per trace → ~74 idle and ~90 recording. The desktop layout
   is untouched above `COMPACT_H`; the web's countdown ring still lives in
   the foot there.
   ================================================================== */

import { useNavigation } from '@react-navigation/native';
import { useEffect, useRef, useState } from 'react';
import {
  type LayoutChangeEvent,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GUIDED_REC_SECS } from '@cyphix/shared';
import CountdownRing from '@/components/atoms/CountdownRing';
import ExitScanButton from '@/components/atoms/ExitScanButton';
import HeartbeatSearch from '@/components/molecules/HeartbeatSearch';
import MeasurementGuideImage from '@/components/molecules/MeasurementGuideImage';
import LimbPrep from '@/components/organisms/LimbPrep';
import SixLeadMonitor from '@/components/organisms/SixLeadMonitor';
import EcgReport from '@/components/organisms/EcgReport';
import { LIMB_MEASURE_GUIDE_IMAGE } from '@/config/measurementGuides';
import { useBle } from '@/features/ble/useBle';
import { useHeartbeatGate } from '@/features/measurement/hooks/useHeartbeatGate';
import { useLimbRecorder } from '@/features/measurement/hooks/useLimbRecorder';
import { RADIUS } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

/** The validator opens its gate on this many confirmed beats. */
const BEATS_REQUIRED = 3;
/** Below this height the web's small-screen rules apply (see the header). */
const COMPACT_H = 500;
/**
 * The countdown ring inside the status bar.
 *
 * ★ Chosen to be ≤ the bar's existing content height, which the Exit pill
 * sets at ~41 pt. Anything larger grows the bar and is paid for by the six
 * traces below it; at 40 the ring is free.
 */
const BAR_RING_SIZE = 40;

/* Copy is verbatim from the web locale (en.ts). */
const LIMB_TITLE = 'Limb Leads';
const LIMB_HOW_TO =
  'Watch on your left wrist · rest that hand on your left leg · touch the crown with your right hand';
const LIMB_RECORDING_NOW = 'Recording — stay still and breathe normally';
const LIMB_AUTO_HINT = 'Recording starts on its own as soon as we feel a steady heartbeat.';
const LIMB_COUNTDOWN_CAPTION = 'seconds left';
const LIMB_WAITING = 'Waiting for the device to send data…';
const LIMB_GUIDE_CAPTION =
  'Touch the watch with your right hand — recording starts on its own';
const SIMULATION_BANNER = 'SIMULATION — not a real signal';
const RAIL_WARNING =
  'Lead {leads}: the signal is beyond what the Bluetooth link can carry, so it is drawn flat. ' +
  'Re-wet or re-seat that electrode. The electrode is not disconnected — this is a transport limit.';

export default function LimbMeasureScreen() {
  const t = useTheme();
  const nav = useNavigation<{ goBack: () => void }>();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const ble = useBle();

  /* Two set-up steps are confirmed before the live screen. Stays true
     across a "record again" within this visit. */
  const [prepDone, setPrepDone] = useState(false);

  /* The traces row is the only one that flexes, so its pixel size is
     whatever the bar and foot leave behind — measured, never calculated
     from a viewport fraction (Skia needs real numbers). */
  const [monitor, setMonitor] = useState({ width: 0, height: 0 });
  const onMonitorLayout = (e: LayoutChangeEvent) => {
    const { width: w, height: h } = e.nativeEvent.layout;
    setMonitor((m) => (m.width === w && m.height === h ? m : { width: w, height: h }));
  };

  /* The gate's Pan-Tompkins HR is the number worth stamping on a report —
     it rejects physiologically impossible RR intervals; the BLE client's
     threshold detector does not. The gate is created below (it needs the
     recorder's phase), so its value reaches the recorder one render later:
     harmless, because the recorder only reads it when a capture tick fires,
     and the gate freezes at its last verdict during the capture anyway. */
  const gateHrRef = useRef(0);
  const recorder = useLimbRecorder({ liveHeartRate: gateHrRef.current });
  // The gate only runs while we're waiting to record — during the capture
  // it is pointless work on a 320 Hz stream.
  const gate = useHeartbeatGate(recorder.phase === 'idle');
  gateHrRef.current = gate.hr;

  /* ── Arm the capture the instant a real heartbeat is proven ──
     `phase` flips synchronously inside start(), so this cannot double-fire.
     The streaming check is repeated because a device that dropped out
     mid-search must not start a recording. */
  const { phase, start } = recorder;
  useEffect(() => {
    if (prepDone && phase === 'idle' && gate.ready && ble.isStreaming) start();
  }, [prepDone, gate.ready, phase, start, ble.isStreaming]);

  /* ══════════ Report ══════════ */
  if (phase === 'done' && recorder.report) {
    return (
      <EcgReport
        report={recorder.report}
        onRecordAgain={recorder.reset}
        onFinish={() => nav.goBack()}
      />
    );
  }

  /* ══════════ Set-up steps ══════════ */
  if (!prepDone) {
    return <LimbPrep onDone={() => setPrepDone(true)} onExit={() => nav.goBack()} />;
  }

  /* ══════════ Live monitor ══════════ */
  const isRecording = phase === 'recording';
  const secondsLeft = Math.ceil(GUIDED_REC_SECS * (1 - recorder.progress / 100));
  const liveBpm = gate.hr > 0 ? gate.hr : ble.heartRate;
  const railedLeads = [...(ble.railed.I ? ['I'] : []), ...(ble.railed.II ? ['II'] : [])];

  /* Recording hasn't started and no heartbeat is being picked up yet — show
     the "hold it like this" illustration over the (flat) traces so the
     patient knows what to do. It clears the instant beats start arriving.
     UI only; the heartbeat gate and signal path are untouched. */
  const showGuide = phase === 'idle' && gate.peaksFound === 0;

  const compact = height < COMPACT_H;
  const pad = compact ? 10 : 14;
  const gap = compact ? 6 : 12;

  /* ── The bottom inset the traces do NOT have to clear ──
     A home indicator / gesture pill is a thin translucent overlay, and the
     grid underneath it is a DISPLAY with nothing to tap — so reserving its
     full inset costs the traces ~11 pt to protect a card border. The one
     bottom inset that IS opaque system chrome is Android's 3-button nav
     bar, and that is what the > 40 test catches. Same rule, same threshold,
     as `dockMetrics.dockBottomOffset` — see its note. */
  const bottomInset = insets.bottom > 40 ? insets.bottom : 0;

  /* The bar's second line. Verbatim web copy while recording; dropped on a
     short stage while idle, where the guide circle carries the instruction
     instead (see the header). */
  const barSub = isRecording ? LIMB_RECORDING_NOW : compact ? null : LIMB_HOW_TO;

  /* ── What the foot still has to say ──
     On a short stage a capture puts the clock in the bar, so the foot is
     EMPTY and must not be rendered: an empty 8pt-gapped row would quietly
     tax the traces for nothing. */
  const showRing = isRecording && !compact;
  const showGate = !isRecording && ble.isStreaming;
  const showWaiting = !isRecording && !ble.isStreaming;
  // The circle's caption already promises the recording starts on its own.
  const showAutoHint = showGate && !(compact && showGuide);
  const hasFoot = showRing || showGate || showWaiting || railedLeads.length > 0;

  /* `.guide-image-circle { width: clamp(190px, 44vw, 300px) }`, but it also
     has to leave room for its caption inside the traces row. */
  const guideSize = Math.max(
    96,
    Math.min(300, Math.max(190, monitor.width * 0.44), monitor.height - 76),
  );
  /* `.countdown-ring` is 132px; on a short stage it takes what the foot can
     spare, the same way the ring's own `size` prop exists on the web. */
  const ringSize = Math.max(84, Math.min(132, height * 0.32));

  return (
    <View
      style={[
        styles.stage,
        {
          backgroundColor: t.bg,
          gap,
          paddingTop: Math.max(insets.top, pad),
          paddingBottom: Math.max(bottomInset, pad),
          // Landscape puts the notch on a SIDE — the inset is the floor here.
          paddingLeft: Math.max(insets.left, compact ? pad : 18),
          paddingRight: Math.max(insets.right, compact ? pad : 18),
        },
      ]}
    >
      {/* ── .limb-bar — everything the patient needs, nothing to scroll to ── */}
      <View
        style={[
          styles.bar,
          {
            backgroundColor: t.surface,
            borderColor: t.border,
            gap: compact ? 12 : 18,
            paddingVertical: compact ? 8 : 12,
            paddingHorizontal: compact ? 14 : 18,
          },
        ]}
      >
        <View style={styles.barLead}>
          <Text
            style={[styles.barTitle, { color: t.textPrimary, fontSize: compact ? 17 : 19 }]}
            numberOfLines={1}
          >
            {LIMB_TITLE}
          </Text>
          {/* On a short stage the long idle instruction is dropped rather than
              truncated — the guide circle over the traces is showing it, in
              larger type. Truncating a clinical instruction mid-sentence is
              not a smaller version of it. */}
          {barSub != null && (
            <Text
              style={[
                styles.barSub,
                { color: t.textSecondary, fontSize: compact ? 12.5 : 14 },
              ]}
              numberOfLines={compact ? 1 : 2}
            >
              {barSub}
            </Text>
          )}
        </View>

        <View style={styles.barVitals}>
          <View style={styles.bpm}>
            <Text
              allowFontScaling={false}
              style={[styles.bpmValue, { color: t.accent, fontSize: compact ? 30 : 40 }]}
            >
              {liveBpm > 0 ? liveBpm : '--'}
            </Text>
            <Text style={[styles.bpmUnit, { color: t.textTertiary }]}>BPM</Text>
          </View>

          {/* The capture clock. ★ The ring is BAR_RING_SIZE precisely so it
              fits inside the height the bar already has (the Exit pill is
              ~41 pt tall and sets that floor), which means keeping the
              web's draining-circle metaphor on a phone costs the traces
              nothing at all. A bare number would have been cheaper only in
              the sense that it says less. */}
          {isRecording && compact && (
            <View style={styles.barClock}>
              <CountdownRing
                progress={recorder.progress}
                secondsLeft={secondsLeft}
                size={BAR_RING_SIZE}
              />
              <Text style={[styles.bpmUnit, { color: t.textTertiary }]}>SEC LEFT</Text>
            </View>
          )}

          {ble.isSimulated && (
            /* Shortened only where the full sentence would push the Exit
               button off the bar. It still says the one thing that matters:
               this is not a patient signal. */
            <Text style={styles.simTag} accessibilityLabel={SIMULATION_BANNER}>
              {compact ? 'SIMULATION' : SIMULATION_BANNER}
            </Text>
          )}
        </View>

        <ExitScanButton label="Exit" onPress={() => nav.goBack()} />
      </View>

      {/* ── .limb-monitor — the ONLY row that grows and shrinks ── */}
      <View style={styles.monitor} onLayout={onMonitorLayout}>
        {monitor.width > 0 && monitor.height > 0 && (
          <SixLeadMonitor width={monitor.width} height={monitor.height} />
        )}

        {showGuide && (
          /* `.limb-guide-overlay` — the traces stay visible behind it, so the
             patient can see the screen is alive while they get into position. */
          <View
            style={[styles.guideOverlay, { backgroundColor: t.bg + 'B8' }]}
            pointerEvents="none"
          >
            <MeasurementGuideImage
              source={LIMB_MEASURE_GUIDE_IMAGE}
              accessibilityLabel={LIMB_HOW_TO}
              caption={LIMB_GUIDE_CAPTION}
              size={guideSize}
              captionSize={guideSize >= 190 ? 19 : 15}
            />
          </View>
        )}
      </View>

      {/* ── .limb-foot — either why we're waiting, or how long is left ── */}
      {hasFoot && (
        <View style={styles.foot}>
          {showRing && (
            <View style={styles.countdown}>
              <CountdownRing
                progress={recorder.progress}
                secondsLeft={secondsLeft}
                caption={LIMB_COUNTDOWN_CAPTION}
                size={ringSize}
              />
              <Text style={[styles.countdownMsg, { color: t.success }]}>
                {LIMB_RECORDING_NOW}
              </Text>
            </View>
          )}

          {showWaiting && <Text style={styles.noticeWarn}>{LIMB_WAITING}</Text>}

          {showGate && (
            <HeartbeatSearch
              compact={compact}
              status={gate.status}
              failReason={gate.failReason}
              peaksFound={gate.peaksFound}
              peaksNeeded={BEATS_REQUIRED}
              hr={gate.hr}
              sqi={gate.sqi}
            />
          )}
          {showAutoHint && (
            <Text style={[styles.autoHint, { color: t.textTertiary }]}>{LIMB_AUTO_HINT}</Text>
          )}

          {/* Saturated leads read as a clean flat line, which is indistinguishable
              from a working trace with no beats. Say so explicitly — but never
              block the recording on it. */}
          {railedLeads.length > 0 && (
            <Text
              style={[styles.railNote, { color: t.textSecondary }]}
              numberOfLines={compact ? 2 : undefined}
            >
              {RAIL_WARNING.replace('{leads}', railedLeads.join(', '))}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  /* .limb-stage { display: grid; grid-template-rows: auto minmax(0,1fr) auto } */
  stage: { flex: 1 },

  /* .limb-bar */
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: RADIUS.lg,
  },
  barLead: { flex: 1, minWidth: 0 },
  barTitle: { fontWeight: '700' },
  barSub: { marginTop: 3 },
  barVitals: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bpm: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  /* Centre-aligned, not baseline: the ring is a circle, not a digit. */
  barClock: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bpmValue: { fontWeight: '800', fontVariant: ['tabular-nums'] },
  bpmUnit: { fontSize: 13, fontWeight: '700', letterSpacing: 0.65 },
  /* .sim-tag */
  simTag: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
    backgroundColor: 'rgba(245, 158, 11, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.5)',
    color: '#B45309',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.36,
  },

  /* .limb-monitor { min-height: 0; position: relative } */
  monitor: { flex: 1, minHeight: 0, position: 'relative' },
  guideOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
  },

  /* .limb-foot { column; gap: 8 } */
  foot: { gap: 8 },
  /* .limb-countdown { row; centred; gap: 20 } */
  countdown: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20 },
  countdownMsg: { fontSize: 20, fontWeight: '700', flexShrink: 1 },
  /* .limb-auto-hint */
  autoHint: { fontSize: 14, textAlign: 'center' },
  /* .notice.warn */
  noticeWarn: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
    color: '#B45309',
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    paddingVertical: 14,
    paddingHorizontal: 18,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  /* .limb-rail-note */
  railNote: {
    alignSelf: 'center',
    maxWidth: 560,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(217, 119, 6, 0.35)',
    backgroundColor: 'rgba(217, 119, 6, 0.08)',
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 19.5,
  },
});

// v3.1.0 — On a phone the capture clock moves into the bar beside the BPM and
//          the foot is dropped, so the six traces get the rest of the screen
//          (~52pt per trace → ~90 while recording).
