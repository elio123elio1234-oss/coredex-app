/* ==================================================================
   HeightStep (organism) — a 64 pt readout over a slider, with a CM/FT
   toggle beside the heading.

   The number is the size it is because it is the answer: on a slider the
   patient watches the value, not the thumb. Centimetres are what is
   STORED whichever unit is displayed — the ECG voltage criteria are
   indexed in metric, and a per-patient unit in the record is a
   conversion bug waiting for a clinician.
   ================================================================== */

import { StyleSheet, Text, View } from 'react-native';
import MeasureSlider from '@/components/molecules/Auth/MeasureSlider';
import UnitToggle from '@/components/molecules/Auth/UnitToggle';
import { HEIGHT_RANGE, heightImperial, type Units } from '@/features/auth/onboardingModel';
import { useTranslation } from '@/i18n/useTranslation';
import { NUMERIC_TYPE, type AuthPalette } from '@/theme/authTheme';
import ProfileStepShell from './ProfileStepShell';

interface Props {
  palette: AuthPalette;
  index: number;
  total: number;
  progress: number;
  heightCm: number;
  units: Units;
  onChangeHeight: (cm: number) => void;
  onChangeUnits: (units: Units) => void;
  onBack: () => void;
  onSkip: () => void;
  onNext: () => void;
  rtl: boolean;
}

function imperialText(cm: number): string {
  const { feet, inches } = heightImperial(cm);
  return `${feet}′ ${inches}″`;
}

export default function HeightStep({
  palette,
  index,
  total,
  progress,
  heightCm,
  units,
  onChangeHeight,
  onChangeUnits,
  onBack,
  onSkip,
  onNext,
  rtl,
}: Props) {
  const { t: tr } = useTranslation();
  const metric = units === 'metric';

  return (
    <ProfileStepShell
      palette={palette}
      index={index}
      total={total}
      progress={progress}
      title={tr('authHeightTitle')}
      subtitle={tr('authHeightSub')}
      onBack={onBack}
      onSkip={onSkip}
      onNext={onNext}
      rtl={rtl}
      titleAccessory={
        <UnitToggle
          value={units}
          onChange={onChangeUnits}
          labels={[tr('authUnitCm'), tr('authUnitFt')]}
          palette={palette}
        />
      }
    >
      <View style={styles.readout}>
        <Text
          allowFontScaling={false}
          style={[styles.value, { color: palette.heading }]}
          accessibilityLabel={tr('authHeightValueA11y', { value: `${heightCm}` })}
        >
          {metric ? heightCm : imperialText(heightCm)}
        </Text>
        {metric && (
          <Text allowFontScaling={false} style={[styles.unit, { color: palette.label }]}>
            {tr('authUnitCmLong')}
          </Text>
        )}
      </View>

      <MeasureSlider
        value={heightCm}
        min={HEIGHT_RANGE.min}
        max={HEIGHT_RANGE.max}
        onChange={onChangeHeight}
        palette={palette}
        accessibilityLabel={tr('authHeightTitle')}
      />

      <View style={styles.bounds}>
        <Text allowFontScaling={false} style={[styles.bound, { color: palette.muted }]}>
          {metric
            ? `${HEIGHT_RANGE.min} ${tr('authUnitCmLong')}`
            : imperialText(HEIGHT_RANGE.min)}
        </Text>
        <Text allowFontScaling={false} style={[styles.bound, { color: palette.muted }]}>
          {metric
            ? `${HEIGHT_RANGE.max} ${tr('authUnitCmLong')}`
            : imperialText(HEIGHT_RANGE.max)}
        </Text>
      </View>
    </ProfileStepShell>
  );
}

const styles = StyleSheet.create({
  readout: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 8 },
  value: { fontSize: 64, fontWeight: '500', lineHeight: 68, ...NUMERIC_TYPE },
  unit: { fontSize: 17, ...NUMERIC_TYPE },
  /* Always LTR: the two ends of a numeric range do not swap with the
     reading direction, they mark the ends of the rail below them. */
  bounds: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 2 },
  bound: { fontSize: 10.5, ...NUMERIC_TYPE },
});

// v1.0.0 — Height on a slider (stored in cm, displayed in either unit).
