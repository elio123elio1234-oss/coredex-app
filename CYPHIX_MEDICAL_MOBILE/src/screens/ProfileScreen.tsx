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

import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
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
import { dockFootprint } from '@/navigation/dockMetrics';
import { usePreferences } from '@/features/preferences/usePreferences';
import { DEMO_CARD, type CodedItem } from '@/features/profile/demoCard';
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
}: {
  title: string;
  art: React.ComponentType<IllustrationProps>;
  children: React.ReactNode;
}) {
  const t = useTheme();
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Art size={48} />
        <Text style={[styles.sectionTitle, { color: t.textPrimary }]}>{title}</Text>
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
  return (
    <View
      style={[
        styles.row,
        !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.border },
      ]}
    >
      <View style={styles.rowLead}>
        <Text style={[styles.rowLabel, { color: t.textPrimary }]}>{label}</Text>
        {description != null && (
          <Text style={[styles.rowDesc, { color: t.textTertiary }]}>{description}</Text>
        )}
      </View>
      {value != null && (
        <Text style={[styles.rowValue, { color: t.textSecondary }]}>{value}</Text>
      )}
    </View>
  );
}

function Chips({ items, empty, tone }: { items: CodedItem[]; empty: string; tone?: 'warn' }) {
  const t = useTheme();
  if (items.length === 0) {
    return <Text style={[styles.emptyText, { color: t.textTertiary }]}>{empty}</Text>;
  }
  return (
    <View style={styles.chips}>
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

const SEX_LABEL: Record<string, string> = {
  male: 'Male',
  female: 'Female',
  other: 'Other',
  unknown: 'Unknown',
};

/** Chevron pointing to the next screen — the platform's own "there is more
    behind this row" cue, on iOS and Android alike. */
function ForwardChevron({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
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
  const nav = useNavigation<{ navigate: (screen: string) => void }>();
  const insets = useSafeAreaInsets();
  const { height: screenH } = useWindowDimensions();
  const { prefs } = usePreferences();
  const palette = shellPalette(prefs.background, useIsDark());
  const card = DEMO_CARD;

  const initials = card.displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('');

  return (
    <View style={styles.root}>
      <HeroBackdrop palette={palette} />

      <View style={[styles.brand, { top: insets.top + 10 }]} pointerEvents="none">
        <BrandLogo width={160} tint={palette.logoTint} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.page,
          { paddingTop: insets.top + 70, paddingBottom: dockFootprint(insets.bottom, screenH) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header: portrait + identity + care team ── */}
        <View style={styles.header}>
          <View
            style={[styles.avatar, { backgroundColor: t.accentSoft, borderColor: t.surface }]}
          >
            <Text style={[styles.avatarText, { color: t.brandNavy }]}>{initials}</Text>
          </View>
          <View style={styles.identity}>
            <Text style={[styles.name, { color: t.textPrimary }]}>{card.displayName}</Text>
            <Text style={[styles.meta, { color: t.textSecondary }]}>
              {card.ageYears} · {SEX_LABEL[card.gender ?? 'unknown']}
              {card.mrn ? ` · ${card.mrn}` : ''}
            </Text>
            {card.careTeam && (
              <Text style={[styles.care, { color: t.textTertiary }]}>
                {card.careTeam.role} · {card.careTeam.name}
              </Text>
            )}
          </View>
        </View>

        <Section title="Details" art={DetailsIllustration}>
          <Row label="Age" value={String(card.ageYears ?? '—')} />
          <Row label="Sex" value={SEX_LABEL[card.gender ?? 'unknown']} />
          <Row label="Blood type" value={card.bloodType ?? '—'} />
          <Row label="Height" value={card.heightCm != null ? `${card.heightCm} cm` : '—'} />
          <Row label="Weight" value={card.weightKg != null ? `${card.weightKg} kg` : '—'} />
          <Row
            label="BMI"
            description="Derived from height and weight"
            value={card.bmi != null ? String(card.bmi) : '—'}
          />
          <Row label="MRN" value={card.mrn ?? '—'} />
          <Row label="Phone" value={card.phone ?? '—'} last />
        </Section>

        <Section title="Conditions" art={ConditionsIllustration}>
          <Chips items={card.conditions} empty="None recorded" />
        </Section>

        <Section title="Allergies" art={AllergiesIllustration}>
          <Chips items={card.allergies} empty="No known allergies" tone="warn" />
        </Section>

        <Section title="Medications" art={MedicationIllustration}>
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
            <Text style={[styles.emptyText, { color: t.textTertiary }]}>
              No medications recorded
            </Text>
          )}
        </Section>

        <Section title="Family history" art={FamilyHistoryIllustration}>
          {card.familyHistory.length > 0 ? (
            card.familyHistory.map((f, i) => (
              <Row key={f} label={f} last={i === card.familyHistory.length - 1} />
            ))
          ) : (
            <Text style={[styles.emptyText, { color: t.textTertiary }]}>None recorded</Text>
          )}
        </Section>

        {card.emergencyContact && (
          <Section title="Emergency contact" art={EmergencyIllustration}>
            <Row
              label={card.emergencyContact.name}
              description={card.emergencyContact.relation}
              value={card.emergencyContact.phone}
              last
            />
          </Section>
        )}

        {card.careTeam && (
          <Section title="Care team" art={CareTeamIllustration}>
            <Row
              label={card.careTeam.name}
              description={[card.careTeam.role, card.careTeam.clinic]
                .filter(Boolean)
                .join(' · ')}
              last
            />
          </Section>
        )}

        <Section title="Recent activity" art={EcgIllustration}>
          <Text style={[styles.emptyText, { color: t.textTertiary }]}>
            No recordings yet
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
          accessibilityLabel="Settings"
          accessibilityHint="Appearance, notifications, device and privacy"
          onPress={() => {
            void Haptics.selectionAsync();
            nav.navigate('Settings');
          }}
          style={({ pressed }) => [
            styles.settingsCard,
            {
              backgroundColor: t.surface,
              borderColor: t.border,
              opacity: pressed ? 0.75 : 1,
            },
          ]}
        >
          <AppearanceIllustration size={44} />
          <View style={styles.settingsText}>
            <Text style={[styles.settingsTitle, { color: t.textPrimary }]}>Settings</Text>
            <Text style={[styles.settingsDesc, { color: t.textSecondary }]}>
              Appearance, notifications, device and privacy
            </Text>
          </View>
          <ForwardChevron color={t.textTertiary} />
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  brand: { position: 'absolute', left: 20, zIndex: 20 },
  page: { paddingHorizontal: 20, gap: 18 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 22, fontWeight: '800' },
  identity: { flex: 1 },
  name: { fontSize: 22, fontWeight: '800' },
  meta: { fontSize: 14, marginTop: 2 },
  care: { fontSize: 12.5, marginTop: 3 },
  section: { gap: 7 },
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
});

// v1.1.0 — Adds the Settings entry point at the end of the card (mobile's
//          equivalent of the web's avatar-popover route) + preference-aware field.
