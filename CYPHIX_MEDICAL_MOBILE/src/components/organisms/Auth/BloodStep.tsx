/* ==================================================================
   BloodStep (organism) — the eight ABO/Rh groups as a grid, plus an
   explicit "I don't know".

   ── Why "I don't know" is a first-class answer ──
   This value ends up on an emergency card. A guess is worse than a
   blank: a blank makes a paramedic cross-match, a wrong group invites
   them not to. So the copy says never guess, "unknown" is a REAL stored
   value rather than an absence, and the step is marked optional.
   ================================================================== */

import { StyleSheet, View } from 'react-native';
import { BLOOD_TYPES, type BloodType } from '@cyphix/shared';
import ChoiceChip from '@/components/molecules/Auth/ChoiceChip';
import { useTranslation } from '@/i18n/useTranslation';
import type { AuthPalette } from '@/theme/authTheme';
import ProfileStepShell from './ProfileStepShell';

interface Props {
  palette: AuthPalette;
  index: number;
  total: number;
  progress: number;
  value?: BloodType;
  onChange: (value: BloodType) => void;
  onBack: () => void;
  onSkip: () => void;
  onNext: () => void;
  rtl: boolean;
}

export default function BloodStep({
  palette,
  index,
  total,
  progress,
  value,
  onChange,
  onBack,
  onSkip,
  onNext,
  rtl,
}: Props) {
  const { t: tr } = useTranslation();

  return (
    <ProfileStepShell
      palette={palette}
      index={index}
      total={total}
      progress={progress}
      title={tr('authBloodTitle')}
      subtitle={tr('authBloodSub')}
      kickerSuffix={tr('authOptional')}
      onBack={onBack}
      onSkip={onSkip}
      onNext={onNext}
      rtl={rtl}
    >
      <View style={styles.grid} accessibilityRole="radiogroup">
        {BLOOD_TYPES.map((type) => (
          <ChoiceChip
            key={type}
            /* The minus sign, not a hyphen: "O−" is a blood group. */
            label={type.replace('-', '−')}
            selected={value === type}
            onPress={() => onChange(type)}
            palette={palette}
            style={styles.cell}
          />
        ))}
      </View>

      <ChoiceChip
        label={tr('authBloodUnknown')}
        selected={value === 'unknown'}
        onPress={() => onChange('unknown')}
        palette={palette}
        variant="pill"
        style={styles.unknown}
      />
    </ProfileStepShell>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  /* Four per row, kept under a quarter each so the three 10 pt gaps —
     which are NOT part of the percentage — cannot push the fourth tile
     onto a second line. `flexGrow` gives the slack back. */
  cell: { width: '20%', flexGrow: 1 },
  /* Full width and 54 pt tall — it is a sentence, not a code. */
  unknown: { marginTop: 12, height: 54, borderRadius: 14 },
});

// v1.0.0 — Blood group grid with an explicit, storable "I don't know".
