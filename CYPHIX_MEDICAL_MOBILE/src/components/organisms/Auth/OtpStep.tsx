/* ==================================================================
   OtpStep (organism) — the six-digit code, the same pad as the phone
   step, and a resend that is locked for 30 s.

   ── The demo notice ──
   No SMS gateway exists in this stage, so the screen SAYS so and prints
   the code it will accept. The alternative — a realistic screen with a
   code that never arrives — would have a patient sitting waiting for a
   text message from a system that never sends one.

   The countdown is local, presentational state: it changes nothing but
   the words on one line.
   ================================================================== */

import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import AuthLinkButton from '@/components/atoms/Auth/AuthLinkButton';
import AuthPrimaryButton from '@/components/atoms/Auth/AuthPrimaryButton';
import AuthStepHeader from '@/components/molecules/Auth/AuthStepHeader';
import NumericKeypad from '@/components/molecules/Auth/NumericKeypad';
import OtpBoxes from '@/components/molecules/Auth/OtpBoxes';
import AuthStepLayout from '@/components/templates/AuthStepLayout';
import { OTP_LENGTH } from '@/features/auth/onboardingModel';
import { useTranslation } from '@/i18n/useTranslation';
import { NUMERIC_TYPE, type AuthPalette } from '@/theme/authTheme';

interface Props {
  palette: AuthPalette;
  code: string;
  phone: string;
  onKey: (key: string) => void;
  onBack: () => void;
  onVerify: () => void;
  onResend: () => void;
  /** The mock code, shown while this build has no SMS gateway. */
  devCode: string | null;
  /** Already translated, or null. */
  errorMessage: string | null;
  busy: boolean;
  ready: boolean;
  rtl: boolean;
}

const RESEND_SECONDS = 30;

export default function OtpStep({
  palette,
  code,
  phone,
  onKey,
  onBack,
  onVerify,
  onResend,
  devCode,
  errorMessage,
  busy,
  ready,
  rtl,
}: Props) {
  const { t: tr } = useTranslation();
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const align = rtl ? ('right' as const) : ('left' as const);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [secondsLeft]);

  const clock = `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, '0')}`;

  return (
    <AuthStepLayout
      background={palette.page}
      /* Same reason as the phone step, and more so: the boxes, the resend
         line and the demo notice all sit above the same 4-row pad. */
      scroll
      header={
        <AuthStepHeader onBack={onBack} palette={palette} backLabel={tr('authBack')} rtl={rtl} />
      }
      footer={
        <AuthPrimaryButton
          label={tr('authVerify')}
          onPress={onVerify}
          palette={palette}
          enabled={ready}
          busy={busy}
        />
      }
    >
      <Text style={[styles.title, { color: palette.heading, textAlign: align }]}>
        {tr('authOtpTitle')}
      </Text>
      <Text style={[styles.sub, { color: palette.body, textAlign: align }]}>
        {tr('authOtpSub', { phone })}
      </Text>

      <OtpBoxes
        value={code}
        length={OTP_LENGTH}
        palette={palette}
        accessibilityLabel={tr('authOtpEntered', { n: code.length, total: OTP_LENGTH })}
      />

      {secondsLeft > 0 ? (
        <Text style={[styles.resendWait, { color: palette.label, textAlign: align }]}>
          {tr('authResendIn', { clock })}
        </Text>
      ) : (
        <AuthLinkButton
          label={tr('authResendNow')}
          onPress={() => {
            setSecondsLeft(RESEND_SECONDS);
            onResend();
          }}
          palette={palette}
          align={rtl ? 'flex-end' : 'flex-start'}
        />
      )}

      {errorMessage != null && (
        <Text style={[styles.error, { color: palette.weak, textAlign: align }]}>
          {errorMessage}
        </Text>
      )}

      {devCode != null && (
        <View
          style={[
            styles.demo,
            { backgroundColor: palette.tealSoft, borderColor: palette.tealSoftBorder },
          ]}
        >
          <Text style={[styles.demoText, { color: palette.heading, textAlign: align }]}>
            {tr('authDemoCode')}
          </Text>
          <Text
            allowFontScaling={false}
            style={[styles.demoCode, { color: palette.heading, textAlign: align }]}
          >
            {devCode}
          </Text>
        </View>
      )}

      <View style={styles.spacer} />

      <NumericKeypad onPress={onKey} palette={palette} deleteLabel={tr('authDelete')} />
    </AuthStepLayout>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 26, fontWeight: '600', letterSpacing: -0.5, marginBottom: 6 },
  sub: { fontSize: 14, lineHeight: 21, marginBottom: 24 },
  resendWait: { fontSize: 13, marginTop: 12 },
  error: { fontSize: 13.5, lineHeight: 19, marginTop: 10 },
  demo: { marginTop: 12, padding: 12, borderWidth: 1, borderRadius: 13, gap: 2 },
  demoText: { fontSize: 12.5, lineHeight: 18 },
  demoCode: { fontSize: 18, fontWeight: '600', letterSpacing: 4, ...NUMERIC_TYPE },
  spacer: { flex: 1, minHeight: 14 },
});

// v1.0.0 — SMS code entry with a locked resend and an honest demo notice.
