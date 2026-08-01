/* ==================================================================
   LimbMeasureScreen — the 6 limb leads: live monitor, then a report.
   Ported from the web LimbMeasurePage.

   FLOW:
     set-up steps → live monitor → (heartbeat proven) → 10 s capture → REPORT

   ══ THE EXAM IS LANDSCAPE ══
   Locked from the moment this route mounts — set-up photographs included,
   so the device is already rotated before the patient has both hands
   occupied. Six traces need the long edge (see useExamOrientation).

   ══ NOBODY PRESSES ANYTHING (the point of this screen) ══
   Holding this measurement takes BOTH of the patient's hands: the watch
   on one wrist, that hand resting on a leg, the other hand touching the
   crown. Asking them to also press "Record" is physically impossible —
   they would have to break the circuit to start recording it. So the
   capture arms itself the moment the frozen Pan-Tompkins gate proves a
   real, regular heartbeat, and the gate's reasoning stays on screen so
   it is never a black box.

   ══ THE LAYOUT IS FIXED, NOT SCROLLED ══
   The six traces fill the long edge; status lives in a side rail. A
   patient in position cannot scroll, and all six leads must be visible
   at once.
   ================================================================== */

import { useNavigation } from '@react-navigation/native';
import { useEffect, useRef, useState } from 'react';
import {
  Image,
  type LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GUIDED_REC_SECS } from '@cyphix/shared';
import CountdownRing from '@/components/atoms/CountdownRing';
import HeartbeatSearch from '@/components/molecules/HeartbeatSearch';
import LimbPrep from '@/components/organisms/LimbPrep';
import SixLeadMonitor from '@/components/organisms/SixLeadMonitor';
import EcgReport from '@/components/organisms/EcgReport';
import { LIMB_MEASURE_GUIDE_IMAGE } from '@/config/measurementGuides';
import { useBle } from '@/features/ble/useBle';
import { useLandscapeWhileMounted } from '@/features/measurement/hooks/useExamOrientation';
import { useHeartbeatGate } from '@/features/measurement/hooks/useHeartbeatGate';
import { useLimbRecorder } from '@/features/measurement/hooks/useLimbRecorder';
import { useTheme } from '@/theme/useTheme';
import { fitBox } from '@/utils/fitBox';

/** The validator opens its gate on this many confirmed beats. */
const BEATS_REQUIRED = 3;
/** Width of the status rail beside the traces, in landscape. */
const RAIL_W = 232;

export default function LimbMeasureScreen() {
  const t = useTheme();
  const nav = useNavigation<{ goBack: () => void }>();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const ble = useBle();

  useLandscapeWhileMounted();

  /* Two set-up steps are confirmed before the live screen. Stays true
     across a "record again" within this visit. */
  const [prepDone, setPrepDone] = useState(false);

  /* The gate's Pan-Tompkins HR is the number worth stamping on a report —
     it rejects physiologically impossible RR intervals; the BLE client's
     threshold detector does not. The gate is created below (it needs the
     recorder's phase), so its value reaches the recorder one render later:
     harmless, because the recorder only reads it when a capture tick fires,
     and the gate freezes at its last verdict during the capture anyway. */
  /* The guide photo's slot is measured rather than calculated: it is
     whatever the rail has left after the fixed rows, which depends on the
     device's safe area and on how tall HeartbeatSearch happens to be. */
  const [guideSlot, setGuideSlot] = useState({ width: 0, height: 0 });
  const onGuideLayout = (e: LayoutChangeEvent) => {
    const { width: w, height: h } = e.nativeEvent.layout;
    setGuideSlot((s) => (s.width === w && s.height === h ? s : { width: w, height: h }));
  };
  const guideAsset = Image.resolveAssetSource(LIMB_MEASURE_GUIDE_IMAGE);
  const guideAspect = guideAsset?.height ? guideAsset.width / guideAsset.height : 16 / 9;
  const guideFrame = fitBox(guideSlot.width, guideSlot.height, guideAspect);

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

  /* ══════════ Hold everything until the device is actually landscape ══════════
     ★ THIS IS THE FLICKER FIX, and the photo-sizing fix — they were ONE bug.

     Locking the orientation does not rotate the device instantly. For the
     ~300 ms the OS takes, this route is mounted at PORTRAIT dimensions, so:
       • the portrait layout renders, then the landscape one replaces it —
         which is the "landscape, portrait, landscape" flicker; and
       • `onLayout` reports the portrait box, the photo frame is computed
         from it, and it never recovers if the final layout pass measures
         identically. That is why the picture kept coming out the wrong
         shape no matter how the frame was calculated.

     So render nothing but the page colour until width > height. One layout
     pass, at the real size, once. */
  if (width <= height) {
    return <View style={[styles.stage, { backgroundColor: t.bg }]} />;
  }

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

  /* Landscape leaves ~390 px of height on a phone — every box below is
     sized from what is actually left, never from a viewport fraction. */
  const padH = Math.max(insets.left, insets.right, 10);
  const padTop = insets.top + 8;
  const padBottom = Math.max(insets.bottom, 8);
  const monitorW = width - RAIL_W - padH * 2 - 10;
  const monitorH = height - padTop - padBottom;

  return (
    <View
      style={[
        styles.stage,
        {
          backgroundColor: t.bg,
          paddingTop: padTop,
          paddingBottom: padBottom,
          paddingHorizontal: padH,
        },
      ]}
    >
      {/* The six traces take the long edge */}
      <SixLeadMonitor width={monitorW} height={monitorH} />

      {/* Status rail — everything the patient needs, nothing to scroll to */}
      <View style={[styles.rail, { width: RAIL_W }]}>
        <View style={styles.railTop}>
          <View style={styles.railLead}>
            <Text style={[styles.title, { color: t.textPrimary }]}>Limb leads</Text>
            {ble.isSimulated && (
              <Text
                style={[styles.simTag, { color: t.brandSlate, backgroundColor: t.accentSoft }]}
              >
                SIMULATION — NOT A PATIENT SIGNAL
              </Text>
            )}
          </View>
          <Pressable accessibilityRole="button" onPress={() => nav.goBack()} hitSlop={10}>
            <Text style={[styles.exit, { color: t.danger }]}>Exit</Text>
          </Pressable>
        </View>

        <View style={styles.vitals}>
          <Text style={[styles.bpm, { color: t.textPrimary }]}>{liveBpm > 0 ? liveBpm : '--'}</Text>
          <Text style={[styles.bpmUnit, { color: t.textSecondary }]}>bpm</Text>
        </View>

        {isRecording ? (
          <CountdownRing
            progress={recorder.progress}
            secondsLeft={secondsLeft}
            caption="Recording — keep holding"
          />
        ) : !ble.isStreaming ? (
          <Text style={[styles.notice, { color: t.danger }]}>
            Waiting for the device to stream…
          </Text>
        ) : (
          <>
            {/* The web shows this photograph while no heartbeat is found yet:
                touch the watch face with your other hand.

                The SLOT takes whatever height is left over; the FRAME inside
                it is the photo's own shape, so the picture fills it rather
                than floating in letterbox bands (see utils/fitBox). */}
            <View style={styles.guideSlot} onLayout={onGuideLayout}>
              {guideFrame.width > 0 && (
                <View
                  style={[
                    styles.guide,
                    guideFrame,
                    /* White, matching the artwork's own ground — see LimbPrep. */
                    { borderColor: t.border, backgroundColor: '#FFFFFF' },
                  ]}
                >
                  {/* `contain`, never `cover` — see LimbPrep: a wrong frame
                      must letterbox, not crop a patient instruction. */}
                  <Image
                    source={LIMB_MEASURE_GUIDE_IMAGE}
                    style={StyleSheet.absoluteFill}
                    resizeMode="contain"
                    accessibilityIgnoresInvertColors
                  />
                </View>
              )}
            </View>
            <HeartbeatSearch
              status={gate.status}
              failReason={gate.failReason}
              peaksFound={gate.peaksFound}
              peaksNeeded={BEATS_REQUIRED}
              hr={gate.hr}
              sqi={gate.sqi}
            />
            <Text style={[styles.hint, { color: t.textTertiary }]}>
              Recording starts on its own — you don't need to press anything.
            </Text>
          </>
        )}

        {/* Saturated leads read as a clean flat line, indistinguishable from a
            working trace with no beats. Say so — but never block on it. */}
        {railedLeads.length > 0 && (
          <Text style={[styles.railWarn, { color: t.danger }]}>
            Lead {railedLeads.join(', ')} is clipping — reposition the electrodes.
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { flex: 1, flexDirection: 'row', gap: 10 },
  rail: { flex: 1, gap: 10 },
  railTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  railLead: { flex: 1, gap: 4 },
  title: { fontSize: 17, fontWeight: '800' },
  exit: { fontSize: 15, fontWeight: '700' },
  vitals: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  bpm: { fontSize: 30, fontWeight: '800', fontVariant: ['tabular-nums'] },
  bpmUnit: { fontSize: 12, fontWeight: '600' },
  simTag: {
    alignSelf: 'flex-start',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
  },
  /* The slot absorbs whatever height is left after the fixed rows, rather
     than claiming a fixed box that pushes the rest of the rail off screen. */
  guideSlot: {
    width: '100%',
    flex: 1,
    minHeight: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guide: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  notice: { fontSize: 14.5, fontWeight: '600' },
  hint: { fontSize: 12 },
  railWarn: { fontSize: 12 },
});

// v2.0.0 — Landscape exam: traces on the long edge, status rail beside them,
//          the web's step-3 photograph while the gate searches.
