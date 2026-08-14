/* ==================================================================
   PersonalDetailsScreen — the patient corrects their own numbers.

   ══ WHY A PUSHED SCREEN, NOT A SHEET ══
   The Reminders precedent (its header, and PARITY): a bottom sheet is for
   a quick action or a single pick; two sliders, a blood-group grid and a
   three-field contact form are a PANEL, and a panel pushes. It is built
   from the same parts as the screens around it (`SettingsSection` /
   `SettingsRow`, the shell backdrop, the same top bar) for continuity —
   it is reached from Profile and must read as part of it.

   ══ WHAT MAY BE EDITED, AND WHY ONLY THIS ══
   Exactly what `PatientCardPatch` accepts: height, weight, blood type,
   emergency contact. Name, date of birth, sex and phone are IDENTITY —
   part of the medical record, changed by the clinic — and the screen says
   so instead of hiding them (`healthCatalogue.ts` states the same rule on
   the wire). The onboarding step BODIES are reused (slider + unit toggle,
   blood grid, contact fields) so a patient meets the same controls here
   that they met at sign-up; the wizard chrome is not.

   ══ THE PATCH IS A DIFF ══
   Only fields the patient actually changed are sent — echoing the whole
   card back would revert anything edited elsewhere since this screen
   loaded (the same rule ProfileScreen's list editor follows). A
   half-completed emergency contact BLOCKS saving rather than being
   silently dropped: saving the height while discarding a half-typed
   contact is the "appeared to work" failure a medical record must never
   produce. On failure the screen stays open with the draft intact.
   ================================================================== */

import { useMemo, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import {
  BLOOD_TYPES,
  type BloodType,
  type PatientCardPatch,
} from '@cyphix/shared';
import AuthLabel from '@/components/atoms/Auth/AuthLabel';
import AuthPrimaryButton from '@/components/atoms/Auth/AuthPrimaryButton';
import HeroBackdrop from '@/components/atoms/HeroBackdrop';
import {
  AccountIllustration,
  ConditionsIllustration,
  DetailsIllustration,
  EmergencyIllustration,
} from '@/components/atoms/Illustration';
import AuthField from '@/components/molecules/Auth/AuthField';
import ChoiceChip from '@/components/molecules/Auth/ChoiceChip';
import MeasureSlider from '@/components/molecules/Auth/MeasureSlider';
import UnitToggle from '@/components/molecules/Auth/UnitToggle';
import SettingsRow from '@/components/molecules/SettingsRow';
import SettingsSection from '@/components/molecules/SettingsSection';
import {
  HEIGHT_RANGE,
  WEIGHT_RANGE,
  heightImperial,
  weightImperial,
  RELATIONS,
  type RelationKey,
  type Units,
} from '@/features/auth/onboardingModel';
import { usePatientCard } from '@/features/profile/usePatientCard';
import { usePreferences } from '@/features/preferences/usePreferences';
import type { TranslationKey } from '@/i18n/config';
import { useTranslation } from '@/i18n/useTranslation';
import { useUpdatePatientCardMutation } from '@/services/api/endpoints/profileApi';
import { authPalette, NUMERIC_TYPE } from '@/theme/authTheme';
import { shellPalette } from '@/theme/shellTheme';
import { useIsDark, useTheme } from '@/theme/useTheme';

function BackChevron({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 18l-6-6 6-6"
        stroke={color}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

const RELATION_KEYS: Record<RelationKey, TranslationKey> = {
  partner: 'authRelPartner',
  parent: 'authRelParent',
  sibling: 'authRelSibling',
  friend: 'authRelFriend',
  doctor: 'authRelDoctor',
};

const SEX_KEY: Record<string, TranslationKey> = {
  male: 'sexMale',
  female: 'sexFemale',
  other: 'sexOther',
  unknown: 'sexUnknown',
};

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export default function PersonalDetailsScreen() {
  const t = useTheme();
  const dark = useIsDark();
  const insets = useSafeAreaInsets();
  const nav = useNavigation<{ goBack: () => void }>();
  const { t: tr, lang, rtl } = useTranslation();
  const { prefs } = usePreferences();
  const { card, patientId } = usePatientCard();
  const [updateCard, updateState] = useUpdatePatientCardMutation();

  const palette = shellPalette(prefs.background, dark);
  /* The onboarding molecules read the auth palette, which already ships a
     dark translation — no adapter, one source (`authTheme.ts`). */
  const auth = authPalette(dark);
  const align = rtl ? ('right' as const) : ('left' as const);

  /* ── Draft state. Seeded once from the card (already loaded — this
     screen is only reachable from a card that rendered an Edit button). */
  const [units, setUnits] = useState<Units>('metric');
  const [heightCm, setHeightCm] = useState(() =>
    clamp(card.heightCm ?? 170, HEIGHT_RANGE.min, HEIGHT_RANGE.max),
  );
  const [weightKg, setWeightKg] = useState(() =>
    clamp(card.weightKg ?? 70, WEIGHT_RANGE.min, WEIGHT_RANGE.max),
  );
  /* Sliders start on a fallback when the card has no value, so "was it
     touched" and "is it different" are separate questions — an untouched
     fallback must never be written into the record. */
  const [touchedHeight, setTouchedHeight] = useState(false);
  const [touchedWeight, setTouchedWeight] = useState(false);
  const [blood, setBlood] = useState<BloodType | undefined>(
    card.bloodType as BloodType | undefined,
  );
  const [ecName, setEcName] = useState(card.emergencyContact?.name ?? '');
  const [ecPhone, setEcPhone] = useState(card.emergencyContact?.phone ?? '');
  const [ecRelation, setEcRelation] = useState(card.emergencyContact?.relation ?? '');
  const [removeContact, setRemoveContact] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const metric = units === 'metric';
  const hadContact = card.emergencyContact != null;

  const ecDirty =
    ecName !== (card.emergencyContact?.name ?? '') ||
    ecPhone !== (card.emergencyContact?.phone ?? '') ||
    ecRelation !== (card.emergencyContact?.relation ?? '');
  const ecFilled = ecName.trim() !== '' || ecPhone.trim() !== '' || ecRelation.trim() !== '';
  /* The server requires all three (`patients.ts` — relation min(1)): a
     contact card a paramedic reads must say who this person IS. */
  const ecReady = ecName.trim() !== '' && ecPhone.trim() !== '' && ecRelation.trim() !== '';
  const ecBlocking = !removeContact && ecDirty && ecFilled && !ecReady;

  /* ── The diff. Recomputed per render; `canSave` is its emptiness. */
  const patch = useMemo<PatientCardPatch>(() => {
    const p: PatientCardPatch = {};
    if (touchedHeight && heightCm !== card.heightCm) p.heightCm = heightCm;
    if (touchedWeight && weightKg !== card.weightKg) p.weightKg = weightKg;
    if (blood !== undefined && blood !== card.bloodType) p.bloodType = blood;
    if (removeContact) {
      if (hadContact) p.emergencyContact = null;
    } else if (ecDirty && ecReady) {
      p.emergencyContact = {
        name: ecName.trim(),
        phone: ecPhone.trim(),
        relation: ecRelation.trim(),
      };
    }
    return p;
  }, [
    touchedHeight,
    touchedWeight,
    heightCm,
    weightKg,
    blood,
    removeContact,
    hadContact,
    ecDirty,
    ecReady,
    ecName,
    ecPhone,
    ecRelation,
    card.heightCm,
    card.weightKg,
    card.bloodType,
  ]);

  const canSave = !ecBlocking && Object.keys(patch).length > 0 && patientId !== null;

  const save = async () => {
    if (!canSave || !patientId) return;
    setSaveError(false);
    try {
      await updateCard({ id: patientId, patch }).unwrap();
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      nav.goBack();
    } catch {
      /* Draft intact, screen open — a failed save must never look saved. */
      setSaveError(true);
    }
  };

  const heightText = metric
    ? `${heightCm}`
    : `${heightImperial(heightCm).feet}′ ${heightImperial(heightCm).inches}″`;
  const weightText = metric ? `${weightKg}` : `${weightImperial(weightKg)}`;

  const dob = card.birthDate
    ? new Date(card.birthDate).toLocaleDateString(lang, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '—';

  return (
    <View style={styles.root}>
      <HeroBackdrop palette={palette} />

      <View style={[styles.topBar, { paddingTop: insets.top + 6 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={tr('back')}
          hitSlop={12}
          onPress={() => {
            void Haptics.selectionAsync();
            nav.goBack();
          }}
          style={({ pressed }) => [
            styles.backBtn,
            rtl && styles.rowRtl,
            { opacity: pressed ? 0.6 : 1 },
          ]}
        >
          <BackChevron color={t.textPrimary} />
          <Text style={[styles.backLabel, { color: t.textPrimary }]}>{tr('dockProfile')}</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.page, { paddingBottom: 24 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.title, { color: t.textPrimary, textAlign: align }]}>
          {tr('pdTitle')}
        </Text>

        {/* ── Identity: shown, named as locked, never editable here ── */}
        <SettingsSection
          art={AccountIllustration}
          title={tr('pdIdentityTitle')}
          description={tr('pdIdentityNote')}
        >
          <SettingsRow first label={tr('authFullName')} value={card.displayName} />
          <SettingsRow label={tr('pdDob')} value={dob} />
          <SettingsRow
            label={tr('profileSex')}
            value={tr(SEX_KEY[card.gender ?? 'unknown'] ?? 'sexUnknown')}
          />
          <SettingsRow label={tr('profilePhone')} value={card.phone ?? '—'} />
        </SettingsSection>

        {/* ── Body measurements: the onboarding step bodies, re-hosted ── */}
        <SettingsSection
          art={DetailsIllustration}
          title={tr('pdBodyTitle')}
          aside={
            /* One toggle for both sliders — CM/FT would claim it is about
               height alone, so the labels name the SYSTEM. */
            <UnitToggle
              value={units}
              onChange={setUnits}
              labels={[tr('pdUnitMetric'), tr('pdUnitImperial')]}
              palette={auth}
            />
          }
        >
          <View style={styles.measure}>
            <AuthLabel palette={auth} style={rtl ? styles.rtlText : undefined}>
              {tr('profileHeight')}
            </AuthLabel>
            <View style={styles.readout}>
              <Text allowFontScaling={false} style={[styles.value, { color: auth.heading }]}>
                {heightText}
              </Text>
              {metric && (
                <Text allowFontScaling={false} style={[styles.unit, { color: auth.label }]}>
                  {tr('authUnitCmLong')}
                </Text>
              )}
            </View>
            <MeasureSlider
              value={heightCm}
              min={HEIGHT_RANGE.min}
              max={HEIGHT_RANGE.max}
              onChange={(v) => {
                setTouchedHeight(true);
                setHeightCm(v);
              }}
              palette={auth}
              accessibilityLabel={tr('profileHeight')}
            />
          </View>

          <View style={styles.measure}>
            <AuthLabel palette={auth} style={rtl ? styles.rtlText : undefined}>
              {tr('profileWeight')}
            </AuthLabel>
            <View style={styles.readout}>
              <Text allowFontScaling={false} style={[styles.value, { color: auth.heading }]}>
                {weightText}
              </Text>
              <Text allowFontScaling={false} style={[styles.unit, { color: auth.label }]}>
                {metric ? tr('authUnitKgLong') : tr('authUnitLbLong')}
              </Text>
            </View>
            <MeasureSlider
              value={weightKg}
              min={WEIGHT_RANGE.min}
              max={WEIGHT_RANGE.max}
              onChange={(v) => {
                setTouchedWeight(true);
                setWeightKg(v);
              }}
              palette={auth}
              accessibilityLabel={tr('profileWeight')}
            />
          </View>
        </SettingsSection>

        {/* ── Blood group: the onboarding grid, "I don't know" included ── */}
        <SettingsSection art={ConditionsIllustration} title={tr('profileBlood')}>
          <View style={styles.bloodGrid} accessibilityRole="radiogroup">
            {BLOOD_TYPES.map((type) => (
              <ChoiceChip
                key={type}
                label={type.replace('-', '−')}
                selected={blood === type}
                onPress={() => setBlood(type)}
                palette={auth}
                style={styles.bloodCell}
              />
            ))}
          </View>
          <ChoiceChip
            label={tr('authBloodUnknown')}
            selected={blood === 'unknown'}
            onPress={() => setBlood('unknown')}
            palette={auth}
            variant="pill"
            style={styles.bloodUnknown}
          />
        </SettingsSection>

        {/* ── Emergency contact: the onboarding fields, plus removal ── */}
        <SettingsSection art={EmergencyIllustration} title={tr('profileEmergency')}>
          {removeContact ? (
            <View style={styles.removedBox}>
              <Text style={[styles.removedText, { color: t.textSecondary, textAlign: align }]}>
                {tr('pdRemovedNote')}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => setRemoveContact(false)}
                hitSlop={8}
              >
                <Text style={[styles.undoText, { color: t.signalInk }]}>{tr('pdUndo')}</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.fields}>
              <AuthField
                label={tr('authEcName')}
                value={ecName}
                onChangeText={setEcName}
                palette={auth}
                placeholder={tr('authEcNamePlaceholder')}
                autoCapitalize="words"
                textContentType="name"
                returnKeyType="next"
                rtl={rtl}
              />
              <AuthField
                label={tr('authEcPhone')}
                value={ecPhone}
                onChangeText={setEcPhone}
                palette={auth}
                placeholder={tr('authEcPhonePlaceholder')}
                keyboardType="phone-pad"
                textContentType="telephoneNumber"
                returnKeyType="done"
                numeric
                rtl={rtl}
              />
              <View style={styles.relations}>
                <AuthLabel palette={auth} style={rtl ? styles.rtlText : undefined}>
                  {tr('authEcRelation')}
                </AuthLabel>
                <View
                  style={[styles.chips, rtl && styles.rowRtl]}
                  accessibilityRole="radiogroup"
                  accessibilityLabel={tr('authEcRelation')}
                >
                  {RELATIONS.map((key) => (
                    <ChoiceChip
                      key={key}
                      label={tr(RELATION_KEYS[key])}
                      selected={ecRelation === tr(RELATION_KEYS[key])}
                      onPress={() => setEcRelation(tr(RELATION_KEYS[key]))}
                      palette={auth}
                      variant="pill"
                    />
                  ))}
                </View>
              </View>
              {ecBlocking && (
                <Text style={[styles.blockNote, { color: t.danger, textAlign: align }]}>
                  {tr('pdEcIncomplete')}
                </Text>
              )}
              {hadContact && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={tr('pdRemoveContact')}
                  onPress={() => {
                    void Haptics.selectionAsync();
                    setRemoveContact(true);
                  }}
                  hitSlop={8}
                  style={styles.removeBtn}
                >
                  <Text style={[styles.removeText, { color: t.danger }]}>
                    {tr('pdRemoveContact')}
                  </Text>
                </Pressable>
              )}
            </View>
          )}
        </SettingsSection>
      </ScrollView>

      {/* ── The one action. Grey until there is a diff worth sending —
          AuthPrimaryButton stays tappable while grey and declines, which
          tells an unsteady hand more than a swallowed touch would. ── */}
      <View
        style={[
          styles.footer,
          { paddingBottom: Math.max(insets.bottom, 12) + 6, backgroundColor: 'transparent' },
        ]}
      >
        {saveError && (
          <Text style={[styles.errorText, { color: t.danger, textAlign: 'center' }]}>
            {tr('pdSaveFailed')}
          </Text>
        )}
        <AuthPrimaryButton
          label={tr('pdSave')}
          onPress={() => void save()}
          palette={auth}
          enabled={canSave}
          busy={updateState.isLoading}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  rowRtl: { flexDirection: 'row-reverse' },
  rtlText: { textAlign: 'right' },
  topBar: { paddingHorizontal: 12, paddingBottom: 2 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, alignSelf: 'flex-start', padding: 6 },
  backLabel: { fontSize: 15.5, fontWeight: '600' },
  page: { paddingHorizontal: 20, paddingTop: 8, gap: 16, maxWidth: 720, alignSelf: 'center', width: '100%' },
  title: { fontSize: 32, fontWeight: '800' },
  measure: { gap: 8, paddingVertical: 10 },
  readout: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 8 },
  value: { fontSize: 46, fontWeight: '500', lineHeight: 50, ...NUMERIC_TYPE },
  unit: { fontSize: 15, ...NUMERIC_TYPE },
  bloodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingTop: 8 },
  /* Four per row — see BloodStep: the gaps are not part of the percentage. */
  bloodCell: { width: '20%', flexGrow: 1 },
  bloodUnknown: { marginTop: 12, height: 54, borderRadius: 14 },
  fields: { gap: 16, paddingTop: 8 },
  relations: { gap: 9 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  blockNote: { fontSize: 12.5, lineHeight: 18 },
  removeBtn: { alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 12 },
  removeText: { fontSize: 14, fontWeight: '700' },
  removedBox: { alignItems: 'center', gap: 8, paddingVertical: 14 },
  removedText: { fontSize: 13.5, lineHeight: 19 },
  undoText: { fontSize: 14, fontWeight: '700' },
  footer: { paddingHorizontal: 20, paddingTop: 8, gap: 8 },
  errorText: { fontSize: 12.5 },
});

// v1.0.0 — The editable half of the medical card (height, weight, blood group,
//          emergency contact) as a pushed screen reusing the onboarding step
//          bodies; identity fields shown and named as clinic-changed; diff-only
//          PATCH; a half-typed contact blocks saving instead of being dropped.
