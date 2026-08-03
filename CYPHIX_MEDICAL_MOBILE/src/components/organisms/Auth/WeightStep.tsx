/* ==================================================================
   WeightStep (organism) — the height step's twin, in kilograms.

   Same rule: kilograms are stored whatever is displayed. Same reason
   given out loud — electrode impedance is calibrated against body mass,
   which is why an ECG app asks at all.
   ================================================================== */

import { StyleSheet, Text, View } from 'react-native';
import MeasureSlider from '@/components/molecules/Auth/MeasureSlider';
import UnitToggle from '@/components/molecules/Auth/UnitToggle';
import { WEIGHT_RANGE, weightImperial, type Units } from '@/features/auth/onboardingModel';
import { useTranslation } from '@/i18n/useTranslation';
import { NUMERIC_TYPE, type AuthPalette } from '@/theme/authTheme';
import ProfileStepShell from './ProfileStepShell';

interface Props {
  palette: AuthPalette;
  index: number;
  total: number;
  progress: number;
  weightKg: number;
  units: Units;
  onChangeWeight: (kg: number) => void;
  onChangeUnits: (units: Units) => void;
  onBack: () => void;
  onSkip: () => void;
  onNext: () => void;
  rtl: boolean;
}

export default function WeightStep({
  palette,
  index,
  total,
  progress,
  weightKg,
  units,
  onChangeWeight,
  onChangeUnits,
  onBack,
  onSkip,
  onNext,
  rtl,
}: Props) {
  const { t: tr } = useTranslation();
  const metric = units === 'metric';
  const unitLabel = metric ? tr('authUnitKgLong') : tr('authUnitLbLong');

  return (
    <ProfileStepShell
      palette={palette}
      index={index}
      total={total}
      progress={progress}
      title={tr('authWeightTitle')}
      subtitle={tr('authWeightSub')}
      onBack={onBack}
      onSkip={onSkip}
      onNext={onNext}
      rtl={rtl}
      titleAccessory={
        <UnitToggle
          value={units}
          onChange={onChangeUnits}
          labels={[tr('authUnitKg'), tr('authUnitLb')]}
          palette={palette}
        />
      }
    >
      <View style={styles.readout}>
        <Text
          allowFontScaling={false}
          style={[styles.value, { color: palette.heading }]}
          accessibilityLabel={tr('authWeightValueA11y', { value: `${weightKg}` })}
        >
          {metric ? weightKg : weightImperial(weightKg)}
        </Text>
        <Text allowFontScaling={false} style={[styles.unit, { color: palette.label }]}>
          {unitLabel}
        </Text>
      </View>

      <MeasureSlider
        value={weightKg}
        min={WEIGHT_RANGE.min}
        max={WEIGHT_RANGE.max}
        onChange={onChangeWeight}
        palette={palette}
        accessibilityLabel={tr('authWeightTitle')}
      />

      <View style={styles.bounds}>
        <Text allowFontScaling={false} style={[styles.bound, { color: palette.muted }]}>
          {`${metric ? WEIGHT_RANGE.min : weightImperial(WEIGHT_RANGE.min)} ${unitLabel}`}
        </Text>
        <Text allowFontScaling={false} style={[styles.bound, { color: palette.muted }]}>
          {`${metric ? WEIGHT_RANGE.max : weightImperial(WEIGHT_RANGE.max)} ${unitLabel}`}
        </Text>
      </View>
    </ProfileStepShell>
  );
}

const styles = StyleSheet.create({
  readout: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 8 },
  value: { fontSize: 64, fontWeight: '500', lineHeight: 68, ...NUMERIC_TYPE },
  unit: { fontSize: 17, ...NUMERIC_TYPE },
  bounds: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 2 },
  bound: { fontSize: 10.5, ...NUMERIC_TYPE },
});

// v1.0.0 — Weight on a slider (stored in kg, displayed in either unit).
