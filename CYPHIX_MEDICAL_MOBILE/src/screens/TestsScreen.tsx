/* ==================================================================
   TestsScreen — "which test am I doing?", ported from the web TestsPage.

   ══ THE PHONE SHOWS ONE TEST AT A TIME ══
   The web lays its choices out as a row of circles. That grid does not
   survive a 390 pt screen: three circles side by side become thumbnails,
   and the photograph IS the interface here — an elderly patient
   recognises "the watch on the wrist" long before they read "6 Limb
   Leads". So the phone gives ONE circle the whole width and pages between
   them by swipe or arrow (`TestChoiceCarousel`). The deliberate divergence
   is recorded in PARITY.md.

   ══ TWO TESTS, NOT THE WEB'S THREE ══
   At the user's instruction this tab offers **6 limb leads** or **the full
   12** — the chest-only test is not offered on the phone. It is not a
   third way to measure so much as half of the 12-lead one, and a patient
   choosing between three near-identical circles chooses slowly.

   ══ WHY 12-LEAD CANNOT BE STARTED HERE (yet) ══
   The full test's chest half needs the guided camera protocol — ONNX pose
   model, the V1→V6 state machine — which exists only in the web app. The
   circle is therefore shown, badged "coming soon", and says where the test
   does work. It is deliberately NOT wired to the limb exam the way the web
   route is: recording six leads under a label that says twelve is the one
   outcome worse than not offering it (root CLAUDE.md §2.3).

   No business logic beyond wiring (CLAUDE.md §3.2): BLE state from the
   hook, and "have I done this before?" read from the history list.
   ================================================================== */

import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import type { MeasurementType } from '@cyphix/shared';
import SplitLeadCircle from '@/components/atoms/SplitLeadCircle';
import MeasureChoiceCircle, { CHOICE_BORDER } from '@/components/molecules/MeasureChoiceCircle';
import ExplainerVideoSheet from '@/components/organisms/ExplainerVideoSheet';
import TestChoiceCarousel from '@/components/organisms/TestChoiceCarousel';
import PatientShell from '@/components/templates/PatientShell';
import { MEASUREMENT_GUIDE_IMAGE, MEASUREMENT_GUIDE_VIDEO } from '@/config/measurementGuides';
import { usePermissions, useCurrentUser } from '@/features/auth/useCurrentUser';
import { useBle } from '@/features/ble/useBle';
import { useReminders } from '@/features/reminders/useReminders';
import { useTranslation } from '@/i18n/useTranslation';
import {
  HISTORY_PAGE_SIZE,
  useListRecordingsQuery,
} from '@/services/api/endpoints/recordingApi';
import { RADIUS } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

/** The two tests this tab offers, in the order they are paged through. */
type OfferedTest = Extract<MeasurementType, 'limb' | '12lead'>;

export default function TestsScreen() {
  const t = useTheme();
  const { t: tr, lang } = useTranslation();
  const { width, height } = useWindowDimensions();
  const nav = useNavigation<{ navigate: (screen: string) => void }>();
  const ble = useBle();
  const reminders = useReminders();
  const user = useCurrentUser();
  const { can } = usePermissions();
  const [explain, setExplain] = useState<OfferedTest | null>(null);

  /* Only to detect "first time for this test type". These are EXACTLY the
     arguments History uses, so RTK Query serves this from the cache it has
     already filled rather than issuing a second request for the same page. */
  const selfOnly = !can('history:read') && can('history:read:self');
  const subject = selfOnly ? (user?.linkedPatientId ?? 'MOCK-SELF') : undefined;
  const { data: recordings } = useListRecordingsQuery({
    patientId: subject,
    limit: HISTORY_PAGE_SIZE,
  });
  const isFirstTime = (type: OfferedTest) => !recordings?.some((r) => r.type === type);

  /* The circle is as wide as the narrower constraint allows. Width usually
     wins on a phone (the arrows flank it and must not overlap it); height
     takes over on a short screen so the caption is never pushed off. */
  const circleSize = Math.round(Math.min(width * 0.58, height * 0.34, 264));

  /* ── The scheduled test's circle: its meaning follows the device state,
        exactly as the web `startLimb` and the home button both do. In Expo
        Go there is no native BLE module at all, so the demo IS the path. ── */
  const startLimb = () => {
    if (ble.isConnected) nav.navigate('LimbMeasure');
    else if (!ble.isSupported) ble.connectSimulator();
    else void ble.connect();
  };

  /* ★ "Scheduled" was a static word. It is now the patient's actual next
     reminder, because this circle is where someone looks to ask "when am
     I meant to do this?" — and a badge that says the same thing whether
     or not anything is scheduled answers nothing. With no schedule set it
     falls back to the plain word, which is still true: this is the test
     the app schedules. */
  const scheduledBadge = reminders.next
    ? tr('testsNextAt', {
        when: reminders.next.toLocaleString(lang, {
          weekday: 'short',
          hour: '2-digit',
          minute: '2-digit',
        }),
      })
    : tr('testsScheduledBadge');

  const pages = [
    <MeasureChoiceCircle
      key="limb"
      size={circleSize}
      /* Percent-sized, so it fills the content box INSIDE the white rim
         instead of being clipped by it (see CHOICE_BORDER). */
      visual={
        <Image
          source={MEASUREMENT_GUIDE_IMAGE.limb}
          style={styles.photo}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
        />
      }
      label={tr('measureLimbTitle')}
      sublabel={tr('testsLimbSub')}
      badge={scheduledBadge}
      onSelect={startLimb}
      firstTime={isFirstTime('limb')}
      explainLabel={tr('testsWatchHow')}
      onExplain={() => setExplain('limb')}
    />,
    <MeasureChoiceCircle
      key="12lead"
      size={circleSize}
      /* Half limb, half chest — the full test IS both placements. Sized
         numerically (the split maths needs pixels), so the rim comes off. */
      visual={
        <SplitLeadCircle
          leftSrc={MEASUREMENT_GUIDE_IMAGE.limb}
          rightSrc={MEASUREMENT_GUIDE_IMAGE.chest}
          size={circleSize - CHOICE_BORDER * 2}
        />
      }
      label={tr('measure12Title')}
      sublabel={tr('tests12Sub')}
      badge={tr('testsSoonBadge')}
      note={tr('tests12MobileNote')}
      disabled
      onSelect={() => {}}
      firstTime={isFirstTime('12lead')}
      explainLabel={tr('testsWatchHow')}
      onExplain={() => setExplain('12lead')}
    />,
  ];

  return (
    <PatientShell>
      <View style={styles.inner}>
        <View style={styles.head}>
          <Text style={[styles.title, { color: t.textPrimary }]}>{tr('testsTitle')}</Text>
          <Text style={[styles.intro, { color: t.textSecondary }]}>{tr('testsChooseIntro')}</Text>
        </View>

        {!ble.isConnected && (
          <View style={[styles.hint, { backgroundColor: t.accentSoft }]}>
            <Text style={[styles.hintText, { color: t.accent }]}>{tr('testsConnectHint')}</Text>
          </View>
        )}

        <TestChoiceCarousel
          pages={pages}
          circleSize={circleSize}
          prevLabel={tr('testsPrevTest')}
          nextLabel={tr('testsNextTest')}
        />

        {!ble.isConnected && ble.isSupported && (
          <Pressable
            accessibilityRole="button"
            onPress={ble.connectSimulator}
            style={styles.demoRow}
          >
            <Text style={[styles.demoLink, { color: t.textTertiary }]}>{tr('homeDemoLink')}</Text>
          </Pressable>
        )}
      </View>

      {/* Mounted once, driven by which test was asked about — the sheet's
          own player is null while closed, so this costs nothing shut. */}
      <ExplainerVideoSheet
        visible={explain !== null}
        onClose={() => setExplain(null)}
        title={explain === '12lead' ? tr('measure12Title') : tr('measureLimbTitle')}
        description={explain === '12lead' ? tr('testsExplain12') : tr('testsExplainLimb')}
        posterSrc={
          explain === '12lead' ? MEASUREMENT_GUIDE_IMAGE.chest : MEASUREMENT_GUIDE_IMAGE.limb
        }
        videoSrc={explain ? MEASUREMENT_GUIDE_VIDEO[explain] : null}
      />
    </PatientShell>
  );
}

const styles = StyleSheet.create({
  inner: { gap: 16 },
  head: { alignItems: 'center', gap: 4 },
  title: { fontSize: 32, fontWeight: '800', textAlign: 'center', letterSpacing: -0.5 },
  intro: { fontSize: 15, textAlign: 'center' },
  /* Percentages resolve against the circle's CONTENT box, so the white rim
     frames the photograph rather than cropping it. */
  photo: { width: '100%', height: '100%' },
  /* .tests-connect-hint — a soft navy plate, not a warning colour: no device
     yet is the normal state of this screen, not an error. */
  hint: {
    alignSelf: 'center',
    maxWidth: 420,
    borderRadius: RADIUS.md,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  hintText: { fontSize: 13.5, fontWeight: '700', textAlign: 'center' },
  demoRow: { alignItems: 'center' },
  demoLink: { fontSize: 13.5, fontWeight: '700', textDecorationLine: 'underline' },
});

// v1.0.0 — The Tests tab is the web's test PICKER, paged one circle per screen:
//          6 limb leads or the full 12, with the explainer clip behind each.
