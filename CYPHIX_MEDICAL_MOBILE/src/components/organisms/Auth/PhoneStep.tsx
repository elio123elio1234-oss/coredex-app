/* ==================================================================
   PhoneStep (organism) — country code, the number as it is typed, and
   the in-page pad.

   The number is drawn as text on an underline rather than in a text
   field: it is entered by the pad below, so a caret and a system
   keyboard would be two ways to do one thing. The country code cycles on
   tap, which is the reference's behaviour and is enough for a list this
   short.
   ================================================================== */

import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import AuthPrimaryButton from '@/components/atoms/Auth/AuthPrimaryButton';
import AuthStepHeader from '@/components/molecules/Auth/AuthStepHeader';
import NumericKeypad from '@/components/molecules/Auth/NumericKeypad';
import AuthStepLayout from '@/components/templates/AuthStepLayout';
import { formatPhoneDigits } from '@/features/auth/onboardingModel';
import { useTranslation } from '@/i18n/useTranslation';
import { NUMERIC_TYPE, type AuthPalette } from '@/theme/authTheme';

interface Props {
  palette: AuthPalette;
  dial: string;
  digits: string;
  onCycleDial: () => void;
  onKey: (key: string) => void;
  onBack: () => void;
  onNext: () => void;
  busy: boolean;
  ready: boolean;
  rtl: boolean;
}

export default function PhoneStep({
  palette,
  dial,
  digits,
  onCycleDial,
  onKey,
  onBack,
  onNext,
  busy,
  ready,
  rtl,
}: Props) {
  const { t: tr } = useTranslation();
  const align = rtl ? ('right' as const) : ('left' as const);

  return (
    <AuthStepLayout
      background={palette.page}
      /* The pad is 4 × 56 pt and the reference was drawn on an 846 pt
         frame. On a short phone the sum of heading + number line + pad
         exceeds the screen, and a keypad that runs off the bottom is a
         step that cannot be completed — so it scrolls when it has to and
         sits still when it does not. */
      scroll
      header={
        <AuthStepHeader onBack={onBack} palette={palette} backLabel={tr('authBack')} rtl={rtl} />
      }
      footer={
        <AuthPrimaryButton
          label={tr('authSendCode')}
          onPress={onNext}
          palette={palette}
          enabled={ready}
          busy={busy}
        />
      }
    >
      <Text style={[styles.title, { color: palette.heading, textAlign: align }]}>
        {tr('authPhoneTitle')}
      </Text>
      <Text style={[styles.sub, { color: palette.body, textAlign: align }]}>
        {tr('authPhoneSub')}
      </Text>

      {/* The number line is always left-to-right: a phone number is not
          reordered by the language around it. */}
      <View style={[styles.line, { borderBottomColor: palette.navy }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={tr('authCountryCode', { code: dial })}
          hitSlop={8}
          onPress={() => {
            void Haptics.selectionAsync();
            onCycleDial();
          }}
          style={({ pressed }) => [styles.dial, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Text style={[styles.dialText, { color: palette.body }]} allowFontScaling={false}>
            {dial}
          </Text>
          <Text style={[styles.caret, { color: palette.body }]} allowFontScaling={false}>
            ▾
          </Text>
        </Pressable>
        <Text
          numberOfLines={1}
          allowFontScaling={false}
          accessibilityLabel={tr('authPhoneEntered', { phone: digits || '—' })}
          style={[styles.number, { color: digits ? palette.heading : palette.muted }]}
        >
          {digits ? formatPhoneDigits(digits) : '—'}
        </Text>
      </View>

      <View style={styles.spacer} />

      <NumericKeypad onPress={onKey} palette={palette} deleteLabel={tr('authDelete')} />
    </AuthStepLayout>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 26, fontWeight: '600', letterSpacing: -0.5, marginBottom: 6 },
  sub: { fontSize: 14, lineHeight: 21, marginBottom: 22 },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 2,
    paddingBottom: 12,
  },
  dial: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dialText: { fontSize: 19, fontWeight: '500', ...NUMERIC_TYPE },
  caret: { fontSize: 10 },
  number: { flex: 1, fontSize: 20, ...NUMERIC_TYPE, letterSpacing: 0.2 },
  spacer: { flex: 1, minHeight: 16 },
});

// v1.0.0 — Phone entry on the in-page pad, with a cycling country code.
