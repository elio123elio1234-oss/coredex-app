/* ==================================================================
   ProfileStepShell (organism) — everything the six health steps have in
   common: the header with its progress rail and Skip, the "STEP n OF 6"
   kicker, the question, the sentence explaining WHY it is being asked,
   and the Continue button.

   ── Why every step explains itself ──
   These questions are personal (sex, weight, blood type, who to call if
   something is wrong) and an app that asks without saying why reads as
   collecting rather than caring. Each subtitle names the clinical reason
   the value is used for. That is also what makes Skip an honest offer:
   the patient can weigh what they are declining.

   Mirrors the web's `AuthStepShell` in intent, in mobile's own metrics.
   ================================================================== */

import { StyleSheet, Text, View } from 'react-native';
import AuthLabel from '@/components/atoms/Auth/AuthLabel';
import AuthPrimaryButton from '@/components/atoms/Auth/AuthPrimaryButton';
import AuthStepHeader from '@/components/molecules/Auth/AuthStepHeader';
import AuthStepLayout from '@/components/templates/AuthStepLayout';
import { useTranslation } from '@/i18n/useTranslation';
import type { AuthPalette } from '@/theme/authTheme';

interface Props {
  palette: AuthPalette;
  /** 1-based position among the health steps. */
  index: number;
  total: number;
  /** 0–1 for the rail. */
  progress: number;
  title: string;
  subtitle: string;
  /** Appended to the kicker, e.g. "· OPTIONAL". */
  kickerSuffix?: string;
  /** Drawn on the trailing side of the title (the unit toggle). */
  titleAccessory?: React.ReactNode;
  onBack: () => void;
  onSkip: () => void;
  onNext: () => void;
  nextEnabled?: boolean;
  busy?: boolean;
  scroll?: boolean;
  keyboard?: boolean;
  rtl: boolean;
  children: React.ReactNode;
}

export default function ProfileStepShell({
  palette,
  index,
  total,
  progress,
  title,
  subtitle,
  kickerSuffix,
  titleAccessory,
  onBack,
  onSkip,
  onNext,
  nextEnabled = true,
  busy = false,
  scroll = false,
  keyboard = false,
  rtl,
  children,
}: Props) {
  const { t: tr } = useTranslation();
  const align = rtl ? ('right' as const) : ('left' as const);
  const kicker = tr('authStepOf', { n: index, total });

  return (
    <AuthStepLayout
      background={palette.page}
      scroll={scroll}
      keyboard={keyboard}
      header={
        <AuthStepHeader
          onBack={onBack}
          palette={palette}
          backLabel={tr('authBack')}
          rtl={rtl}
          progress={progress}
          progressLabel={kicker}
          onSkip={onSkip}
          skipLabel={tr('authSkip')}
        />
      }
      footer={
        <AuthPrimaryButton
          label={tr('authContinue')}
          onPress={onNext}
          palette={palette}
          enabled={nextEnabled}
          busy={busy}
        />
      }
    >
      <View style={[styles.head, rtl && styles.headRtl]}>
        <View style={styles.headText}>
          <AuthLabel palette={palette} style={rtl ? styles.rtlText : undefined}>
            {kickerSuffix ? `${kicker} · ${kickerSuffix}` : kicker}
          </AuthLabel>
          <Text style={[styles.title, { color: palette.heading, textAlign: align }]}>{title}</Text>
        </View>
        {titleAccessory != null && <View style={styles.accessory}>{titleAccessory}</View>}
      </View>

      <Text style={[styles.sub, { color: palette.body, textAlign: align }]}>{subtitle}</Text>

      {children}
    </AuthStepLayout>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingTop: 4 },
  headRtl: { flexDirection: 'row-reverse' },
  headText: { flex: 1, gap: 10 },
  rtlText: { textAlign: 'right' },
  accessory: { marginTop: 8 },
  title: { fontSize: 27, fontWeight: '600', letterSpacing: -0.55 },
  sub: { fontSize: 14, lineHeight: 21, marginTop: 8, marginBottom: 26 },
});

// v1.0.0 — Shared frame for the six health steps (kicker, why, Skip, Continue).
