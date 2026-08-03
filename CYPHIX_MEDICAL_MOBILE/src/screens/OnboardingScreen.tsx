/* ==================================================================
   OnboardingScreen — the signed-out experience. One screen that swaps
   its contents, exactly as the design reference and the web's
   RegisterWizard do, rather than a navigator: the flow has its own back
   control and its own 16 px transition, and a native push would read as
   leaving CYPHIX rather than moving through it.

   Everything here is WIRING (CLAUDE.md §3.2): the state lives in
   `useOnboarding`, the copy in the locale, the look in `authTheme`, and
   each step is a presentational organism that is handed exactly the
   values it draws.

   The one piece of mapping it does own is the review list — turning a
   draft into "HEIGHT · 174 cm" is a view-model job and belongs to the
   screen that shows it.
   ================================================================== */

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { BackHandler, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import type { AdministrativeGender, AuthErrorCode, BloodType } from '@cyphix/shared';
import StepFadeIn from '@/components/atoms/Auth/StepFadeIn';
import BloodStep from '@/components/organisms/Auth/BloodStep';
import EmergencyStep from '@/components/organisms/Auth/EmergencyStep';
import ForgotStep from '@/components/organisms/Auth/ForgotStep';
import HeightStep from '@/components/organisms/Auth/HeightStep';
import OtpStep from '@/components/organisms/Auth/OtpStep';
import PhoneStep from '@/components/organisms/Auth/PhoneStep';
import PhotoStep from '@/components/organisms/Auth/PhotoStep';
import ReviewStep, { type SummaryItem } from '@/components/organisms/Auth/ReviewStep';
import SexStep from '@/components/organisms/Auth/SexStep';
import SignInStep from '@/components/organisms/Auth/SignInStep';
import SignUpStep from '@/components/organisms/Auth/SignUpStep';
import SuccessStep from '@/components/organisms/Auth/SuccessStep';
import WeightStep from '@/components/organisms/Auth/WeightStep';
import WelcomeStep from '@/components/organisms/Auth/WelcomeStep';
import {
  DIAL_CODES,
  PROFILE_STEPS,
  STEP_ORDER,
  fullPhone,
  heightImperial,
  initialsOf,
  profileGaps,
  weightImperial,
  type ProfileStep,
} from '@/features/auth/onboardingModel';
import { useOnboarding } from '@/features/auth/useOnboarding';
import { useProfilePhoto } from '@/features/auth/useProfilePhoto';
import { unlockWithBiometrics } from '@/services/auth/biometrics';
import { useAppDispatch } from '@/store/hooks';
import { restoreSession, welcomeAcknowledged } from '@/features/auth/authSlice';
import type { TranslationKey } from '@/i18n/config';
import { useTranslation } from '@/i18n/useTranslation';
import { authPalette } from '@/theme/authTheme';
import { useIsDark } from '@/theme/useTheme';

const ERROR_KEYS: Record<AuthErrorCode, TranslationKey> = {
  'email-taken': 'authErrEmailTaken',
  'invalid-credentials': 'authErrInvalidCredentials',
  'weak-password': 'authErrWeakPassword',
  network: 'authErrNetwork',
  unknown: 'authErrUnknown',
};

const GAP_KEYS: Record<ProfileStep, TranslationKey> = {
  sex: 'authSumSex',
  height: 'authSumHeight',
  weight: 'authSumWeight',
  blood: 'authSumBlood',
  emergency: 'authSumEmergency',
  photo: 'authPhotoTitle',
};

export default function OnboardingScreen() {
  const dark = useIsDark();
  const palette = authPalette(dark);
  const { t: tr, rtl } = useTranslation();
  const dispatch = useAppDispatch();
  const flow = useOnboarding();
  const { draft, step } = flow;

  const photo = useProfilePhoto(
    useCallback((uri: string) => flow.patch({ photoUri: uri }), [flow]),
  );

  /* Which way the next transition slides. Kept in a ref so reading it
     during render never changes what the previous render decided. */
  const previousStep = useRef(step);
  const direction = useMemo<1 | -1>(() => {
    const from = STEP_ORDER.indexOf(previousStep.current);
    const to = STEP_ORDER.indexOf(step);
    return to >= from ? 1 : -1;
  }, [step]);
  useEffect(() => {
    previousStep.current = step;
  }, [step]);

  /* Android's back gesture/button belongs to the flow, not to the OS:
     leaving the app mid-registration would silently drop the draft. On
     the welcome screen there is nothing to go back to, so the system
     default (leave) is allowed to happen. */
  useEffect(() => {
    if (step === 'welcome' || step === 'success') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      flow.back();
      return true;
    });
    return () => sub.remove();
  }, [step, flow]);

  const errorMessage = flow.error != null ? tr(ERROR_KEYS[flow.error]) : null;
  const issueMessage =
    flow.issue === 'email-taken'
      ? tr('authErrEmailTaken')
      : flow.issue === 'wrong-code'
        ? tr('authErrWrongCode')
        : null;

  const initials = initialsOf(draft.fullName);

  /** Biometric unlock: prove it is the phone's owner, then let the gate
      pick the restored session up. */
  const onBiometric = useCallback(() => {
    void unlockWithBiometrics(tr('authBiometricPrompt')).then((result) => {
      if (result.ok) void dispatch(restoreSession());
    });
  }, [dispatch, tr]);

  const heightText = useMemo(() => {
    if (draft.units === 'metric') return `${draft.heightCm} ${tr('authUnitCmLong')}`;
    const { feet, inches } = heightImperial(draft.heightCm);
    return `${feet}′ ${inches}″`;
  }, [draft.units, draft.heightCm, tr]);

  const weightText = useMemo(
    () =>
      draft.units === 'metric'
        ? `${draft.weightKg} ${tr('authUnitKgLong')}`
        : `${weightImperial(draft.weightKg)} ${tr('authUnitLbLong')}`,
    [draft.units, draft.weightKg, tr],
  );

  const summary = useMemo<SummaryItem[]>(() => {
    const skipped = new Set(draft.skipped);
    const sexText: Record<AdministrativeGender, TranslationKey> = {
      male: 'authSexMale',
      female: 'authSexFemale',
      other: 'authSexOther',
      unknown: 'authSexUnknown',
    };
    const bloodText = (value: BloodType) =>
      value === 'unknown' ? tr('authBloodUnknownShort') : value.replace('-', '−');

    const hasSex = draft.sex !== undefined && !skipped.has('sex');
    const hasBlood = draft.bloodType !== undefined && !skipped.has('blood');
    const hasContact = draft.emergencyPhone.trim().length > 0 && !skipped.has('emergency');

    return [
      {
        key: 'name',
        label: tr('authSumName'),
        value: draft.fullName.trim() || tr('authNotSet'),
        missing: draft.fullName.trim().length === 0,
        onEdit: () => flow.go('signup'),
      },
      {
        key: 'phone',
        label: tr('authSumPhone'),
        value: draft.phone ? fullPhone(draft) : tr('authNotSet'),
        missing: draft.phone.length === 0,
        onEdit: () => flow.go('phone'),
      },
      {
        key: 'sex',
        label: tr('authSumSex'),
        value: hasSex ? tr(sexText[draft.sex as AdministrativeGender]) : tr('authSkipped'),
        missing: !hasSex,
        onEdit: () => flow.go('sex'),
      },
      {
        key: 'height',
        label: tr('authSumHeight'),
        value: skipped.has('height') ? tr('authSkipped') : heightText,
        missing: skipped.has('height'),
        onEdit: () => flow.go('height'),
      },
      {
        key: 'weight',
        label: tr('authSumWeight'),
        value: skipped.has('weight') ? tr('authSkipped') : weightText,
        missing: skipped.has('weight'),
        onEdit: () => flow.go('weight'),
      },
      {
        key: 'blood',
        label: tr('authSumBlood'),
        value: hasBlood ? bloodText(draft.bloodType as BloodType) : tr('authSkipped'),
        missing: !hasBlood,
        onEdit: () => flow.go('blood'),
      },
      {
        key: 'emergency',
        label: tr('authSumEmergency'),
        value: hasContact
          ? `${draft.emergencyName.trim()} · ${draft.emergencyPhone.trim()}`
          : tr('authNotSet'),
        missing: !hasContact,
        onEdit: () => flow.go('emergency'),
      },
    ];
  }, [draft, flow, heightText, weightText, tr]);

  const completeness = useMemo(() => {
    const gaps = profileGaps(draft);
    if (gaps.length === 0) return tr('authReviewComplete');
    return tr('authReviewGaps', { list: gaps.map((g) => tr(GAP_KEYS[g])).join(', ') });
  }, [draft, tr]);

  const profileIndex = flow.profileIndex;
  const totalProfileSteps = PROFILE_STEPS.length;

  function renderStep() {
    switch (step) {
      case 'welcome':
        return (
          <WelcomeStep
            palette={palette}
            rtl={rtl}
            onCreateAccount={() => flow.go('signup')}
            onSignIn={() => flow.go('signin')}
          />
        );
      case 'signin':
        return (
          <SignInStep
            palette={palette}
            rtl={rtl}
            email={draft.email}
            password={draft.password}
            onChangeEmail={(email) => flow.patch({ email })}
            onChangePassword={(password) => flow.patch({ password })}
            onBack={flow.back}
            onForgot={() => flow.go('forgot')}
            onSubmit={flow.submitSignIn}
            onBiometric={onBiometric}
            errorMessage={errorMessage}
            busy={flow.busy}
            ready={flow.ready}
          />
        );
      case 'forgot':
        return (
          <ForgotStep
            palette={palette}
            rtl={rtl}
            email={draft.email}
            onChangeEmail={(email) => flow.patch({ email })}
            onBack={flow.back}
            onSend={flow.sendReset}
            sent={flow.resetSent}
            ready={flow.ready}
          />
        );
      case 'signup':
        return (
          <SignUpStep
            palette={palette}
            rtl={rtl}
            fullName={draft.fullName}
            email={draft.email}
            password={draft.password}
            onChangeName={(fullName) => flow.patch({ fullName })}
            onChangeEmail={(email) => flow.patch({ email })}
            onChangePassword={(password) => flow.patch({ password })}
            onBack={flow.back}
            onNext={flow.next}
            onSignInInstead={() => flow.go('signin')}
            errorMessage={issueMessage ?? errorMessage}
            offerSignIn={flow.issue === 'email-taken' || flow.error === 'email-taken'}
            busy={flow.busy}
            ready={flow.ready}
          />
        );
      case 'phone':
        return (
          <PhoneStep
            palette={palette}
            rtl={rtl}
            dial={DIAL_CODES[draft.dialIndex]}
            digits={draft.phone}
            onCycleDial={() =>
              flow.patch({ dialIndex: (draft.dialIndex + 1) % DIAL_CODES.length })
            }
            onKey={(key) => flow.pressKey('phone', key)}
            onBack={flow.back}
            onNext={flow.next}
            busy={flow.busy}
            ready={flow.ready}
          />
        );
      case 'otp':
        return (
          <OtpStep
            palette={palette}
            rtl={rtl}
            code={draft.otp}
            phone={fullPhone(draft)}
            onKey={(key) => flow.pressKey('otp', key)}
            onBack={flow.back}
            onVerify={flow.next}
            onResend={flow.resendCode}
            devCode={flow.devCode}
            errorMessage={issueMessage}
            busy={flow.busy}
            ready={flow.ready}
          />
        );
      case 'sex':
        return (
          <SexStep
            palette={palette}
            rtl={rtl}
            index={profileIndex}
            total={totalProfileSteps}
            progress={flow.progress}
            value={draft.sex}
            onChange={(sex) => flow.patch({ sex })}
            onBack={flow.back}
            onSkip={flow.skip}
            onNext={flow.next}
            ready={flow.ready}
          />
        );
      case 'height':
        return (
          <HeightStep
            palette={palette}
            rtl={rtl}
            index={profileIndex}
            total={totalProfileSteps}
            progress={flow.progress}
            heightCm={draft.heightCm}
            units={draft.units}
            onChangeHeight={(heightCm) => flow.patch({ heightCm })}
            onChangeUnits={(units) => flow.patch({ units })}
            onBack={flow.back}
            onSkip={flow.skip}
            onNext={flow.next}
          />
        );
      case 'weight':
        return (
          <WeightStep
            palette={palette}
            rtl={rtl}
            index={profileIndex}
            total={totalProfileSteps}
            progress={flow.progress}
            weightKg={draft.weightKg}
            units={draft.units}
            onChangeWeight={(weightKg) => flow.patch({ weightKg })}
            onChangeUnits={(units) => flow.patch({ units })}
            onBack={flow.back}
            onSkip={flow.skip}
            onNext={flow.next}
          />
        );
      case 'blood':
        return (
          <BloodStep
            palette={palette}
            rtl={rtl}
            index={profileIndex}
            total={totalProfileSteps}
            progress={flow.progress}
            value={draft.bloodType}
            onChange={(bloodType) => flow.patch({ bloodType })}
            onBack={flow.back}
            onSkip={flow.skip}
            onNext={flow.next}
          />
        );
      case 'emergency':
        return (
          <EmergencyStep
            palette={palette}
            rtl={rtl}
            index={profileIndex}
            total={totalProfileSteps}
            progress={flow.progress}
            name={draft.emergencyName}
            phone={draft.emergencyPhone}
            relation={draft.emergencyRelation}
            onChangeName={(emergencyName) => flow.patch({ emergencyName })}
            onChangePhone={(emergencyPhone) => flow.patch({ emergencyPhone })}
            onChangeRelation={(emergencyRelation) => flow.patch({ emergencyRelation })}
            onBack={flow.back}
            onSkip={flow.skip}
            onNext={flow.next}
            ready={flow.ready}
          />
        );
      case 'photo':
        return (
          <PhotoStep
            palette={palette}
            rtl={rtl}
            index={profileIndex}
            total={totalProfileSteps}
            progress={flow.progress}
            initials={initials}
            avatarIndex={draft.avatarIndex}
            photoUri={draft.photoUri}
            onChangeAvatar={(avatarIndex) => flow.patch({ avatarIndex })}
            onTakePhoto={photo.take}
            onPickPhoto={photo.pick}
            denied={photo.denied}
            onBack={flow.back}
            onSkip={flow.skip}
            onNext={flow.next}
          />
        );
      case 'review':
        return (
          <ReviewStep
            palette={palette}
            rtl={rtl}
            items={summary}
            completeness={completeness}
            errorMessage={errorMessage}
            onBack={flow.back}
            onFinish={flow.finish}
            busy={flow.busy}
          />
        );
      case 'success':
        /* Entering the app is not a navigation: the account already
           exists, and the gate is only still showing this flow because
           `justRegistered` asked it to. Letting that go IS the door. */
        return <SuccessStep palette={palette} onEnter={() => dispatch(welcomeAcknowledged())} />;
      default:
        return null;
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: palette.page }]}>
      {/* The light steps need dark glyphs; the navy ones set their own. */}
      <StatusBar style={dark ? 'light' : 'dark'} />
      <StepFadeIn key={step} direction={direction} style={styles.root}>
        {renderStep()}
      </StepFadeIn>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});

// v1.0.0 — The signed-out flow: 14 steps, one screen, the reference's scrIn.
