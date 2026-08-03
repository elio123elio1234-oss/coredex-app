/* ==================================================================
   SexStep (organism) — the one health question with a clinical answer
   the app cannot infer, and the reason is said out loud: ECG
   interpretation thresholds differ by sex.

   It records SEX ASSIGNED AT BIRTH, and says so. The distinction matters
   here in a way it does not in most software — the reference intervals a
   reading is judged against are derived from it — and stating which
   thing is being asked for is what keeps the question a clinical one.
   Gender identity is a different field, for a different screen, and is
   not silently collected under this label.
   ================================================================== */

import { StyleSheet, View } from 'react-native';
import type { AdministrativeGender } from '@cyphix/shared';
import ChoiceCard from '@/components/molecules/Auth/ChoiceCard';
import { useTranslation } from '@/i18n/useTranslation';
import type { AuthPalette } from '@/theme/authTheme';
import ProfileStepShell from './ProfileStepShell';

interface Props {
  palette: AuthPalette;
  index: number;
  total: number;
  progress: number;
  value?: AdministrativeGender;
  onChange: (value: AdministrativeGender) => void;
  onBack: () => void;
  onSkip: () => void;
  onNext: () => void;
  ready: boolean;
  rtl: boolean;
}

const OPTIONS: { value: AdministrativeGender; key: 'authSexMale' | 'authSexFemale' }[] = [
  { value: 'male', key: 'authSexMale' },
  { value: 'female', key: 'authSexFemale' },
];

export default function SexStep({
  palette,
  index,
  total,
  progress,
  value,
  onChange,
  onBack,
  onSkip,
  onNext,
  ready,
  rtl,
}: Props) {
  const { t: tr } = useTranslation();

  return (
    <ProfileStepShell
      palette={palette}
      index={index}
      total={total}
      progress={progress}
      title={tr('authSexTitle')}
      subtitle={tr('authSexSub')}
      onBack={onBack}
      onSkip={onSkip}
      onNext={onNext}
      nextEnabled={ready}
      rtl={rtl}
    >
      <View style={styles.options} accessibilityRole="radiogroup">
        {OPTIONS.map((option) => (
          <ChoiceCard
            key={option.value}
            label={tr(option.key)}
            selected={value === option.value}
            onPress={() => onChange(option.value)}
            palette={palette}
            rtl={rtl}
          />
        ))}
      </View>
    </ProfileStepShell>
  );
}

const styles = StyleSheet.create({
  options: { gap: 12 },
});

// v1.0.0 — Sex assigned at birth (named as such, with the clinical reason).
