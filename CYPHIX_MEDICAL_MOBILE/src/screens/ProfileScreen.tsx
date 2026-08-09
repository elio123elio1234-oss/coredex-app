/* ==================================================================
   ProfileScreen — the patient's medical CARD, ported from the web
   PatientProfilePage: identity header, then the same sections in the
   same order (Details · Conditions · Allergies · Medications · Family
   history · Emergency contact · Care team · Recent activity).

   Clinical codes are shown as coded chips, never free text, matching the
   web's CodedChipList (web CLAUDE.md §5).

   This screen scrolls — unlike the patient's home it is a reference
   document, and the web's profile scrolls too.
   ================================================================== */

import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import BrandLogo from '@/components/atoms/BrandLogo';
import HeroBackdrop from '@/components/atoms/HeroBackdrop';
import {
  AllergiesIllustration,
  AppearanceIllustration,
  CareTeamIllustration,
  ConditionsIllustration,
  DetailsIllustration,
  EcgIllustration,
  EmergencyIllustration,
  FamilyHistoryIllustration,
  MedicationIllustration,
  type IllustrationProps,
} from '@/components/atoms/Illustration';
import { SHOW_SHELL_WORDMARK } from '@/config/featureFlags';
import ConfirmDialog from '@/components/molecules/ConfirmDialog';
import { dockFootprint } from '@/navigation/dockMetrics';
import type { CodedItem } from '@cyphix/shared';
import { useAuth } from '@/features/auth/useAuth';
import { usePreferences } from '@/features/preferences/usePreferences';
import { usePatientCard } from '@/features/profile/usePatientCard';
import { usePortrait } from '@/features/profile/usePortrait';
import ActionSheet from '@/components/molecules/ActionSheet';
import type { TranslationKey } from '@/i18n/config';
import { useTranslation } from '@/i18n/useTranslation';
import CardListEditor from '@/components/organisms/CardListEditor';
import { useUpdatePatientCardMutation } from '@/services/api/endpoints/profileApi';
import type { CatalogueKind, CodedAnswer, PatientCardPatch } from '@cyphix/shared';
import { shellPalette } from '@/theme/shellTheme';
import { RADIUS } from '@/theme/tokens';
import { useIsDark, useTheme } from '@/theme/useTheme';

/* Mirrors the web SettingsSection in its `illustrated` variant: the pastel
   art sits DIRECTLY on the card at 48×48 with no tinted tile behind it
   (`.settings-section-icon--art`), because these illustrations carry their
   own palette rather than being currentColor line icons. */
function Section({
  title,
  art: Art,
  children,
  onEdit,
  editLabel,
}: {
  title: string;
  art: React.ComponentType<IllustrationProps>;
  children: React.ReactNode;
  /** When set, the header carries an Edit button. */
  onEdit?: () => void;
  editLabel?: string;
}) {
  const t = useTheme();
  const { rtl } = useTranslation();
  return (
    <View style={styles.section}>
      <View style={[styles.sectionHead, rtl && styles.rowReverse]}>
        <Art size={48} />
        <Text
          style={[styles.sectionTitle, { color: t.textPrimary, textAlign: rtl ? 'right' : 'left' }]}
        >
          {title}
        </Text>
        {/* ★ On the HEADER, not inside the card. A section that can be
            edited says so where its name is, so the affordance is in the
            same place for every section — including the ones that are
            currently empty, which are precisely the ones a patient most
            needs to be able to fill in. */}
        {onEdit && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${editLabel ?? ''} ${title}`.trim()}
            hitSlop={10}
            onPress={() => {
              void Haptics.selectionAsync();
              onEdit();
            }}
            style={({ pressed }) => [styles.editBtn, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Text style={[styles.editText, { color: t.signalInk }]}>{editLabel}</Text>
          </Pressable>
        )}
      </View>
      <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }]}>
        {children}
      </View>
    </View>
  );
}

function Row({
  label,
  value,
  description,
  last,
}: {
  label: string;
  value?: string;
  description?: string;
  last?: boolean;
}) {
  const t = useTheme();
  const { rtl } = useTranslation();
  const align = rtl ? ('right' as const) : ('left' as const);
  return (
    <View
      style={[
        styles.row,
        rtl && styles.rowReverse,
        !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.border },
      ]}
    >
      <View style={styles.rowLead}>
        <Text style={[styles.rowLabel, { color: t.textPrimary, textAlign: align }]}>{label}</Text>
        {description != null && (
          <Text style={[styles.rowDesc, { color: t.textTertiary, textAlign: align }]}>
            {description}
          </Text>
        )}
      </View>
      {value != null && (
        <Text style={[styles.rowValue, { color: t.textSecondary, textAlign: rtl ? 'left' : 'right' }]}>
          {value}
        </Text>
      )}
    </View>
  );
}

function Chips({ items, empty, tone }: { items: CodedItem[]; empty: string; tone?: 'warn' }) {
  const t = useTheme();
  const { rtl } = useTranslation();
  if (items.length === 0) {
    return (
      <Text style={[styles.emptyText, { color: t.textTertiary, textAlign: rtl ? 'right' : 'left' }]}>
        {empty}
      </Text>
    );
  }
  return (
    <View style={[styles.chips, rtl && styles.rowReverse]}>
      {items.map((c) => (
        <View
          key={c.display}
          style={[
            styles.chip,
            {
              backgroundColor: tone === 'warn' ? t.dangerSoft : t.accentSoft,
              borderColor: t.border,
            },
          ]}
        >
          <Text
            style={[styles.chipText, { color: tone === 'warn' ? t.danger : t.textPrimary }]}
          >
            {c.display}
          </Text>
          {/* The code is what makes this clinical data rather than a label. */}
          {c.code != null && (
            <Text style={[styles.chipCode, { color: t.textTertiary }]}>{c.code}</Text>
          )}
        </View>
      ))}
    </View>
  );
}

/* Administrative gender is a CODE (`male` | `female` | …); the word shown for
   it is presentation, so it is a locale key rather than a stored string. */
const SEX_KEY: Record<string, TranslationKey> = {
  male: 'sexMale',
  female: 'sexFemale',
  other: 'sexOther',
  unknown: 'sexUnknown',
};

/** Chevron pointing to the next screen — the platform's own "there is more
    behind this row" cue, on iOS and Android alike. `flip` turns it around
    for a right-to-left language, where "forward" is the other way. */
function ForwardChevron({ color, flip = false }: { color: string; flip?: boolean }) {
  return (
    <Svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      style={flip ? { transform: [{ scaleX: -1 }] } : undefined}
    >
      <Path
        d="M9 18l6-6-6-6"
        stroke={color}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export default function ProfileScreen() {
  const t = useTheme();
  const { t: tr, rtl } = useTranslation();
  const nav = useNavigation<{ navigate: (screen: string) => void }>();
  const insets = useSafeAreaInsets();
  const { height: screenH } = useWindowDimensions();
  const { prefs } = usePreferences();
  const { user, logout } = useAuth();
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const palette = shellPalette(prefs.background, useIsDark());
  /* WHOSE record this is, and what is in it — one hook, three cases
     (server card / demo card / name-only when it will not load). The
     screen deliberately does not know which it got. */
  const { card, photo, isLoading, isFetching, isError, isDemo, patientId, refetch } =
    usePatientCard();
  const portrait = usePortrait(patientId);
  const [portraitSheet, setPortraitSheet] = useState(false);
  /** Which list is being edited, or null. */
  const [editing, setEditing] = useState<CatalogueKind | null>(null);
  const [updateCard, updateState] = useUpdatePatientCardMutation();
  const [saveError, setSaveError] = useState(false);
  /** There must be a real record to write the picture into. */
  const canEditPortrait = patientId !== null;
  /* ★ The DEMO card is read-only, and that is not a limitation to work
     around. It is a fixture with no patient behind it: there is nothing
     on the server to write to, and an Edit button that appeared to work
     and then quietly changed nothing is worse than no button. */
  const canEdit = patientId !== null && !isDemo;

  /* What the sheet currently holds, per category. Family history is a
     list of plain strings on the card; it is lifted into the same coded
     shape here so ONE editor serves all three, and flattened again on
     the way out. */
  const editingItems: CodedAnswer[] =
    editing === 'allergy'
      ? card.allergies
      : editing === 'medication'
        ? card.medications.map((m) => ({ display: m.name, code: m.code }))
        : editing === 'familyHistory'
          ? card.familyHistory.map((f) => ({ display: f }))
          : [];

  const saveList = async (next: CodedAnswer[]) => {
    if (!patientId || !editing) return;
    setSaveError(false);
    /* ★ ONLY the edited category is sent. Echoing the whole card back
       would revert anything changed elsewhere since this screen loaded —
       invisible on one device, inevitable with two. */
    const patch: PatientCardPatch =
      editing === 'allergy'
        ? { allergies: next }
        : editing === 'medication'
          ? { medications: next.map((n) => ({ name: n.display, code: n.code, system: n.system })) }
          : { familyHistory: next.map((n) => n.display) };
    try {
      await updateCard({ id: patientId, patch }).unwrap();
      setEditing(null);
    } catch {
      /* Kept OPEN on failure, with the draft intact. Closing would
         discard what the patient just typed and leave them believing it
         was saved — the one outcome a medical record must never produce. */
      setSaveError(true);
    }
  };
  const sexLabel = tr(SEX_KEY[card.gender ?? 'unknown'] ?? 'sexUnknown');

  const initials =
    card.displayName
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0])
      .join('') || '·';

  return (
    <View style={styles.root}>
      <HeroBackdrop palette={palette} />

      {/* Profile does not use PatientShell (it scrolls), so it carries its own
          copy of the shell's floating wordmark — and therefore its own copy of
          the switch. Same flag, so the two can never disagree. */}
      {SHOW_SHELL_WORDMARK && (
        <View style={[styles.brand, { top: insets.top + 10 }]} pointerEvents="none">
          <BrandLogo width={160} tint={palette.logoTint} />
        </View>
      )}

      <ScrollView
        contentContainerStyle={[
          styles.page,
          {
            paddingTop: insets.top + (SHOW_SHELL_WORDMARK ? 70 : 12),
            paddingBottom: dockFootprint(insets.bottom, screenH),
          },
        ]}
        showsVerticalScrollIndicator={false}
        /* Only where there is a server to ask. Offline the card is a
           constant, and a refresh control that cannot refresh anything is
           the same broken promise as a button that does nothing. */
        refreshControl={
          isDemo ? undefined : (
            <RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={t.textTertiary} />
          )
        }
      >
        {/* ── Header: portrait + identity + care team ── */}
        <View style={[styles.header, rtl && styles.rowReverse]}>
          {/* Tappable ONLY where there is a record to write to. Offline the
              card is a fixture, and a picker that saved nowhere would be a
              control that appears to work. */}
          <Pressable
            onPress={
              canEditPortrait
                ? () => {
                    void Haptics.selectionAsync();
                    portrait.clearStatus();
                    setPortraitSheet(true);
                  }
                : undefined
            }
            disabled={!canEditPortrait || portrait.busy}
            accessibilityRole={canEditPortrait ? 'button' : 'image'}
            accessibilityLabel={canEditPortrait ? tr('profilePhotoChange') : undefined}
            style={styles.avatarWrap}
          >
            {/* The clip lives on this inner view, not on the Pressable: a
                round mask crops whatever it contains, and the badge below
                is a sibling of the mask rather than something inside it. */}
            <View style={[styles.avatar, { backgroundColor: t.accentSoft, borderColor: t.surface }]}>
              {/* The portrait comes from the server (it follows the person
                  across devices). Initials are not a placeholder for a
                  failed image — they are the equal alternative for someone
                  who chose not to add one. */}
              {photo ? (
                <Image
                  source={{ uri: photo }}
                  style={styles.avatarImage}
                  accessibilityIgnoresInvertColors
                />
              ) : (
                <Text style={[styles.avatarText, { color: t.brandNavy }]}>{initials}</Text>
              )}
            </View>
            {/* An affordance, not decoration: a circle that happens to be
                tappable is a circle nobody taps. It doubles as the busy
                indicator, so the wait appears exactly where the action was. */}
            {canEditPortrait && (
              <View style={[styles.avatarBadge, { backgroundColor: t.brandNavy, borderColor: t.surface }]}>
                {portrait.busy ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="camera" size={13} color="#FFFFFF" />
                )}
              </View>
            )}
          </Pressable>
          <View style={styles.identity}>
            <Text
              style={[styles.name, { color: t.textPrimary, textAlign: rtl ? 'right' : 'left' }]}
            >
              {card.displayName}
            </Text>
            <Text style={[styles.meta, { color: t.textSecondary, textAlign: rtl ? 'right' : 'left' }]}>
              {/* Built from what is actually known: an absent age must not
                  print "undefined · Unknown" over someone's own record. */}
              {[card.ageYears != null ? String(card.ageYears) : null, sexLabel, card.mrn]
                .filter(Boolean)
                .join(' · ')}
            </Text>
            {card.careTeam && (
              <Text
                style={[styles.care, { color: t.textTertiary, textAlign: rtl ? 'right' : 'left' }]}
              >
                {card.careTeam.role} · {card.careTeam.name}
              </Text>
            )}
          </View>
          {isLoading && <ActivityIndicator color={t.textTertiary} />}
        </View>

        {/* The portrait's own failures, said where the portrait is. A
            refusal is not an error — the patient declined a permission,
            and the sentence explains where to change their mind. */}
        {(portrait.status === 'denied' || portrait.status === 'failed') && (
          <Pressable
            onPress={portrait.clearStatus}
            style={[styles.notice, { backgroundColor: t.surface, borderColor: t.border }]}
          >
            <Text
              style={[
                styles.noticeText,
                { color: t.textSecondary, textAlign: rtl ? 'right' : 'left' },
              ]}
            >
              {tr(portrait.status === 'denied' ? 'profilePhotoDenied' : 'profilePhotoFailed')}
            </Text>
          </Pressable>
        )}

        {/* A card that did not load must SAY so. Empty sections would
            otherwise read as "you have no conditions, no allergies, no
            medications", which is a different and dangerous claim. */}
        {isError && (
          <View style={[styles.notice, { backgroundColor: t.surface, borderColor: t.border }]}>
            <Text
              style={[
                styles.noticeText,
                { color: t.textSecondary, textAlign: rtl ? 'right' : 'left' },
              ]}
            >
              {tr('profileLoadFailed')}
            </Text>
          </View>
        )}

        <Section title={tr('profileDetails')} art={DetailsIllustration}>
          <Row label={tr('profileAge')} value={String(card.ageYears ?? '—')} />
          <Row label={tr('profileSex')} value={sexLabel} />
          <Row label={tr('profileBlood')} value={card.bloodType ?? '—'} />
          <Row
            label={tr('profileHeight')}
            value={card.heightCm != null ? `${card.heightCm} cm` : '—'}
          />
          <Row
            label={tr('profileWeight')}
            value={card.weightKg != null ? `${card.weightKg} kg` : '—'}
          />
          <Row
            label={tr('profileBmi')}
            description={tr('profileBmiNote')}
            value={card.bmi != null ? String(card.bmi) : '—'}
          />
          <Row label={tr('profileMrn')} value={card.mrn ?? '—'} />
          <Row label={tr('profilePhone')} value={card.phone ?? '—'} last />
        </Section>

        {/* The chips' TEXT is the clinical `display` of a coded concept (ICD-10 /
            SNOMED), not UI copy — it is data that arrives with the record and is
            not translated here. Only the empty-state sentence is. */}
        <Section title={tr('profileConditions')} art={ConditionsIllustration}>
          <Chips items={card.conditions} empty={tr('profileNoneRecorded')} />
        </Section>

        <Section
          title={tr('profileAllergies')}
          art={AllergiesIllustration}
          editLabel={canEdit ? tr('cardEdit') : undefined}
          onEdit={canEdit ? () => setEditing('allergy') : undefined}
        >
          <Chips items={card.allergies} empty={tr('profileNoAllergies')} tone="warn" />
        </Section>

        <Section
          title={tr('profileMedications')}
          art={MedicationIllustration}
          editLabel={canEdit ? tr('cardEdit') : undefined}
          onEdit={canEdit ? () => setEditing('medication') : undefined}
        >
          {card.medications.length > 0 ? (
            card.medications.map((m, i) => (
              <Row
                key={m.name}
                label={m.name}
                value={m.dose}
                last={i === card.medications.length - 1}
              />
            ))
          ) : (
            <Text
              style={[
                styles.emptyText,
                { color: t.textTertiary, textAlign: rtl ? 'right' : 'left' },
              ]}
            >
              {tr('profileNoMeds')}
            </Text>
          )}
        </Section>

        <Section
          title={tr('profileFamily')}
          art={FamilyHistoryIllustration}
          editLabel={canEdit ? tr('cardEdit') : undefined}
          onEdit={canEdit ? () => setEditing('familyHistory') : undefined}
        >
          {card.familyHistory.length > 0 ? (
            card.familyHistory.map((f, i) => (
              <Row key={f} label={f} last={i === card.familyHistory.length - 1} />
            ))
          ) : (
            <Text
              style={[
                styles.emptyText,
                { color: t.textTertiary, textAlign: rtl ? 'right' : 'left' },
              ]}
            >
              {tr('profileNoneRecorded')}
            </Text>
          )}
        </Section>

        {card.emergencyContact && (
          <Section title={tr('profileEmergency')} art={EmergencyIllustration}>
            <Row
              label={card.emergencyContact.name}
              description={card.emergencyContact.relation}
              value={card.emergencyContact.phone}
              last
            />
          </Section>
        )}

        {card.careTeam && (
          <Section title={tr('profileCareTeam')} art={CareTeamIllustration}>
            <Row
              label={card.careTeam.name}
              description={[card.careTeam.role, card.careTeam.clinic]
                .filter(Boolean)
                .join(' · ')}
              last
            />
          </Section>
        )}

        <Section title={tr('profileRecent')} art={EcgIllustration}>
          <Text
            style={[styles.emptyText, { color: t.textTertiary, textAlign: rtl ? 'right' : 'left' }]}
          >
            {tr('profileNoRecent')}
          </Text>
        </Section>

        {/* ── Settings ──
            The web reaches Settings from the avatar popover in the top bar.
            There is no top bar on mobile (the dock is the whole navigation),
            so it lives at the END of the profile — the conventional place on
            both platforms, and the one screen a patient already thinks of as
            "about me". A full-width card rather than a text link: it is the
            single tap target here, and it is aimed at unsteady hands. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={tr('settingsTitle')}
          accessibilityHint={tr('profileSettingsDesc')}
          onPress={() => {
            void Haptics.selectionAsync();
            nav.navigate('Settings');
          }}
          style={({ pressed }) => [
            styles.settingsCard,
            rtl && styles.rowReverse,
            {
              backgroundColor: t.surface,
              borderColor: t.border,
              opacity: pressed ? 0.75 : 1,
            },
          ]}
        >
          <AppearanceIllustration size={44} />
          <View style={styles.settingsText}>
            <Text
              style={[
                styles.settingsTitle,
                { color: t.textPrimary, textAlign: rtl ? 'right' : 'left' },
              ]}
            >
              {tr('settingsTitle')}
            </Text>
            <Text
              style={[
                styles.settingsDesc,
                { color: t.textSecondary, textAlign: rtl ? 'right' : 'left' },
              ]}
            >
              {tr('profileSettingsDesc')}
            </Text>
          </View>
          {/* The chevron points AT the next screen, so it turns around with
              the reading direction. */}
          <ForwardChevron color={t.textTertiary} flip={rtl} />
        </Pressable>

        {/* ── Sign out ──
            The last thing on the last screen, which is where every app a
            patient already uses puts it. It is a plain row rather than a
            second illustrated card: it is not a place to go, it is a way
            to leave, and it must not compete with Settings above it.
            Confirmed first — on a device-local account this costs the
            password (or a face), and a mis-tap here is a locked-out
            patient. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={tr('setAccountSignOut')}
          accessibilityHint={tr('setAccountSignOutDesc')}
          onPress={() => {
            void Haptics.selectionAsync();
            setConfirmSignOut(true);
          }}
          style={({ pressed }) => [styles.signOut, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Text style={[styles.signOutLabel, { color: t.danger }]}>
            {tr('setAccountSignOut')}
          </Text>
          <Text style={[styles.signOutDesc, { color: t.textTertiary }]}>
            {user?.displayName ?? tr('setAccountSignOutDesc')}
          </Text>
        </Pressable>
      </ScrollView>

      {/* Remove is offered only when there IS one to remove — a "Remove
          photo" row over initials is an action with nothing to act on. */}
      <ActionSheet
        visible={portraitSheet}
        title={tr('profilePhotoTitle')}
        cancelLabel={tr('back')}
        onClose={() => setPortraitSheet(false)}
        items={[
          {
            id: 'take',
            label: tr('profilePhotoTake'),
            icon: 'camera-outline',
            onSelect: () => {
              setPortraitSheet(false);
              portrait.take();
            },
          },
          {
            id: 'pick',
            label: tr('profilePhotoChoose'),
            icon: 'images-outline',
            onSelect: () => {
              setPortraitSheet(false);
              portrait.pick();
            },
          },
          ...(photo
            ? [
                {
                  id: 'remove',
                  label: tr('profilePhotoRemove'),
                  icon: 'trash-outline' as const,
                  danger: true,
                  onSelect: () => {
                    setPortraitSheet(false);
                    portrait.remove();
                  },
                },
              ]
            : []),
        ]}
      />

      <CardListEditor
        visible={editing !== null}
        kind={editing ?? 'allergy'}
        title={
          editing === 'medication'
            ? tr('profileMedications')
            : editing === 'familyHistory'
              ? tr('profileFamily')
              : tr('profileAllergies')
        }
        selected={editingItems}
        saving={updateState.isLoading}
        error={saveError ? tr('cardSaveFailed') : undefined}
        onClose={() => {
          setEditing(null);
          setSaveError(false);
        }}
        onSave={(next) => void saveList(next)}
      />

      <ConfirmDialog
        visible={confirmSignOut}
        title={tr('setAccountSignOut')}
        subject={user?.displayName}
        body={tr('setSignOutBody')}
        confirmLabel={tr('setAccountSignOut')}
        cancelLabel={tr('back')}
        onConfirm={() => {
          setConfirmSignOut(false);
          /* The gate above the navigator swaps the whole app for the
             welcome screen the moment the session goes. */
          void logout();
        }}
        onCancel={() => setConfirmSignOut(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  /** Applied wherever a row's reading order has to follow the language. */
  rowReverse: { flexDirection: 'row-reverse' },
  brand: { position: 'absolute', left: 20, zIndex: 20 },
  page: { paddingHorizontal: 20, gap: 18 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  /* The tap target and the round mask are two views on purpose. This one
     does NOT clip, so the badge can overhang the portrait's edge; it stays
     68×68 so the badge still lands inside its own bounds, which Android
     needs — a child drawn outside its parent is not reliably rendered. */
  avatarWrap: { width: 68, height: 68 },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    /* The clip must belong to the view that owns the radius, or Android
       renders a square photo inside a round border (mobile CLAUDE.md §1). */
    overflow: 'hidden',
  },
  avatarText: { fontSize: 22, fontWeight: '800' },
  avatarImage: { width: '100%', height: '100%' },
  /* Sits ON the ring, bottom-end — the place every phone OS puts it. It is
     a sibling of the mask, so it is painted after it and rides on top of
     the circle instead of being cropped by it. */
  avatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notice: { borderRadius: RADIUS.lg, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 12 },
  noticeText: { fontSize: 13.5, lineHeight: 19 },
  identity: { flex: 1 },
  name: { fontSize: 22, fontWeight: '800' },
  meta: { fontSize: 14, marginTop: 2 },
  care: { fontSize: 12.5, marginTop: 3 },
  section: { gap: 7 },
  editBtn: { paddingVertical: 4, paddingHorizontal: 2 },
  editText: { fontSize: 14, fontWeight: '700' },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  /* .settings-section-title — 16.5/800, sentence case. The old 10.5px
     uppercase eyebrow was a stand-in for the missing illustration. */
  sectionTitle: {
    fontSize: 16.5,
    fontWeight: '800',
    flex: 1,
  },
  card: { borderRadius: RADIUS.lg, borderWidth: 1, paddingHorizontal: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 13,
  },
  rowLead: { flex: 1 },
  rowLabel: { fontSize: 14.5, fontWeight: '600' },
  rowDesc: { fontSize: 12, marginTop: 2 },
  rowValue: { fontSize: 14.5, flexShrink: 1, textAlign: 'right' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: 14 },
  chip: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipText: { fontSize: 13.5, fontWeight: '700' },
  chipCode: { fontSize: 10.5, fontVariant: ['tabular-nums'] },
  emptyText: { fontSize: 13.5, paddingVertical: 14 },
  settingsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginTop: 4,
  },
  settingsText: { flex: 1, gap: 3 },
  settingsTitle: { fontSize: 16.5, fontWeight: '800' },
  settingsDesc: { fontSize: 12.5, lineHeight: 18 },
  /* Centred and unboxed: the row is deliberately quieter than every card
     above it, and the whole width is still the tap target. */
  signOut: { alignItems: 'center', paddingVertical: 18, marginTop: 4, gap: 3 },
  signOutLabel: { fontSize: 15.5, fontWeight: '700' },
  signOutDesc: { fontSize: 12.5 },
});

// v1.4.0 — Sign out lives here now, at the bottom under the Settings card:
//          Settings-only was one screen further than anybody looks.
// v2.0.0 — Renders the SIGNED-IN patient's real record (usePatientCard) with the
//          server portrait, a loading state, an explicit "could not load" notice
//          and pull-to-refresh — instead of the hard-coded fictitious DEMO_CARD.
// v2.1.0 — The portrait can be SET from the phone: the avatar is a button with
//          a camera badge, opening take / choose / remove, saving to the record
//          (not the device) and saying which of the three failures happened.
// v1.3.0 — The floating wordmark (and the padding that cleared it) follow
//          SHOW_SHELL_WORDMARK, so the card starts at the top of the screen.
// v2.1.1 — The camera badge was being CROPPED by the portrait's own circle:
//          one view owned the round clip AND was the Pressable the badge sat
//          in. The mask is its own inner view now and the badge is a sibling,
//          so it is drawn on top of the circle instead of inside it.
