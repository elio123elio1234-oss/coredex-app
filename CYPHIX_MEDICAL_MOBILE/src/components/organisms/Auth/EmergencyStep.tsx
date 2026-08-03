/* ==================================================================
   EmergencyStep (organism) — who to call, their number, and what they
   are to the patient.

   ── A deliberate divergence from the reference ──
   The reference opens on a LIST OF THE PHONE'S CONTACTS to pick from.
   That is a better first tap, and it is not what ships here: reading the
   address book needs a permission and a native module, and a mis-tap in
   a list of real people silently writes a real person's number into a
   medical record. Typing the number is two more taps and no ambiguity,
   so manual entry IS the step. The contact picker is tracked as pending
   in PARITY.md rather than faked with invented names.

   The relationship is a chip from a fixed set, not free text: it is
   displayed to a clinician, and "he's my Dave" helps nobody.
   ================================================================== */

import { StyleSheet, Text, View } from 'react-native';
import AuthLabel from '@/components/atoms/Auth/AuthLabel';
import AuthField from '@/components/molecules/Auth/AuthField';
import ChoiceChip from '@/components/molecules/Auth/ChoiceChip';
import { RELATIONS, type RelationKey } from '@/features/auth/onboardingModel';
import type { TranslationKey } from '@/i18n/config';
import { useTranslation } from '@/i18n/useTranslation';
import type { AuthPalette } from '@/theme/authTheme';
import ProfileStepShell from './ProfileStepShell';

interface Props {
  palette: AuthPalette;
  index: number;
  total: number;
  progress: number;
  name: string;
  phone: string;
  relation?: RelationKey;
  onChangeName: (v: string) => void;
  onChangePhone: (v: string) => void;
  onChangeRelation: (v: RelationKey) => void;
  onBack: () => void;
  onSkip: () => void;
  onNext: () => void;
  ready: boolean;
  rtl: boolean;
}

const RELATION_KEYS: Record<RelationKey, TranslationKey> = {
  partner: 'authRelPartner',
  parent: 'authRelParent',
  sibling: 'authRelSibling',
  friend: 'authRelFriend',
  doctor: 'authRelDoctor',
};

export default function EmergencyStep({
  palette,
  index,
  total,
  progress,
  name,
  phone,
  relation,
  onChangeName,
  onChangePhone,
  onChangeRelation,
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
      title={tr('authEmergencyTitle')}
      subtitle={tr('authEmergencySub')}
      onBack={onBack}
      onSkip={onSkip}
      onNext={onNext}
      nextEnabled={ready}
      scroll
      keyboard
      rtl={rtl}
    >
      <View style={styles.fields}>
        <AuthField
          label={tr('authEcName')}
          value={name}
          onChangeText={onChangeName}
          palette={palette}
          placeholder={tr('authEcNamePlaceholder')}
          autoCapitalize="words"
          textContentType="name"
          returnKeyType="next"
          rtl={rtl}
        />
        <AuthField
          label={tr('authEcPhone')}
          value={phone}
          onChangeText={onChangePhone}
          palette={palette}
          placeholder={tr('authEcPhonePlaceholder')}
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
          returnKeyType="done"
          numeric
          rtl={rtl}
        />

        <View style={styles.relations}>
          <AuthLabel palette={palette} style={rtl ? styles.rtlText : undefined}>
            {tr('authEcRelation')}
          </AuthLabel>
          <View
            style={[styles.chips, rtl && styles.chipsRtl]}
            accessibilityRole="radiogroup"
            accessibilityLabel={tr('authEcRelation')}
          >
            {RELATIONS.map((key) => (
              <ChoiceChip
                key={key}
                label={tr(RELATION_KEYS[key])}
                selected={relation === key}
                onPress={() => onChangeRelation(key)}
                palette={palette}
                variant="pill"
              />
            ))}
          </View>
        </View>

        <Text style={[styles.note, { color: palette.label, textAlign: rtl ? 'right' : 'left' }]}>
          {tr('authEcNote')}
        </Text>
      </View>
    </ProfileStepShell>
  );
}

const styles = StyleSheet.create({
  fields: { gap: 16, paddingBottom: 8 },
  relations: { gap: 9 },
  rtlText: { textAlign: 'right' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chipsRtl: { flexDirection: 'row-reverse' },
  note: { fontSize: 11.5, lineHeight: 17 },
});

// v1.0.0 — Emergency contact by hand (picker deferred — see PARITY.md).
