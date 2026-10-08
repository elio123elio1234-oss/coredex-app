/* ==================================================================
   ReviewStep (organism) — everything the flow collected, each line with
   a way back to the step that set it, and one sentence naming what was
   skipped.

   ── Why the gaps are stated rather than hidden ──
   This is the last screen before a medical record exists. A patient who
   skipped their blood type should read the words "you skipped blood
   type" here, not discover the blank months later on an emergency card.
   Nothing is quietly defaulted in on their behalf either: a skipped
   value is sent as absent.

   The account is created from THIS screen — see `useOnboarding` — so
   abandoning the flow earlier leaves nothing behind.

   ★ v1.1.0 — AND IT ASKS. Below the summary sits the one box the law
   wants before the data: "I have read and agree to the Terms of Use and
   the Privacy Notice", both names opening the published pages. The
   button stays grey until it is on; what the box confirmed is sent with
   the registration and recorded by the server at these versions
   (LAUNCH_PLAN 1.8). Same box, same sentence as the web's review step.
   ================================================================== */

import { useState } from 'react';
import * as Haptics from 'expo-haptics';
import { Linking, StyleSheet, Switch, Text, View } from 'react-native';
import { legalDocUrl, type LegalDocId } from '@cyphix/shared';
import AuthLabel from '@/components/atoms/Auth/AuthLabel';
import AuthPrimaryButton from '@/components/atoms/Auth/AuthPrimaryButton';
import AuthStepHeader from '@/components/molecules/Auth/AuthStepHeader';
import SummaryRow from '@/components/molecules/Auth/SummaryRow';
import AuthStepLayout from '@/components/templates/AuthStepLayout';
import { ENV } from '@/config/env';
import { useTranslation } from '@/i18n/useTranslation';
import type { AuthPalette } from '@/theme/authTheme';

export interface SummaryItem {
  key: string;
  label: string;
  value: string;
  missing: boolean;
  onEdit: () => void;
}

interface Props {
  palette: AuthPalette;
  items: SummaryItem[];
  /** Already translated: "everything is filled in" or "you skipped …". */
  completeness: string;
  /** Already translated, or null. */
  errorMessage: string | null;
  onBack: () => void;
  onFinish: () => void;
  busy: boolean;
  rtl: boolean;
}

export default function ReviewStep({
  palette,
  items,
  completeness,
  errorMessage,
  onBack,
  onFinish,
  busy,
  rtl,
}: Props) {
  const { t: tr } = useTranslation();
  const align = rtl ? ('right' as const) : ('left' as const);
  /* Local on purpose: the agreement belongs to this screen and this
     attempt, not to the draft (a patient who goes back to edit a field
     comes back to the box as they left it). */
  const [agreed, setAgreed] = useState(false);
  const open = (doc: LegalDocId) => void Linking.openURL(legalDocUrl(doc, ENV.webOrigin));
  const link = { color: palette.heading, fontWeight: '700' as const, textDecorationLine: 'underline' as const };

  return (
    <AuthStepLayout
      background={palette.page}
      scroll
      header={
        <AuthStepHeader
          onBack={onBack}
          palette={palette}
          backLabel={tr('authBack')}
          rtl={rtl}
          progress={1}
          progressLabel={tr('authReviewKicker')}
        />
      }
      footer={
        <AuthPrimaryButton
          label={tr('authConfirm')}
          onPress={() => {
            /* Grey is tappable by design (see the atom); the refusal
               lives here, so a half-answered box cannot create an account. */
            if (agreed) onFinish();
          }}
          palette={palette}
          enabled={agreed}
          busy={busy}
        />
      }
    >
      <AuthLabel palette={palette} style={rtl ? styles.rtlText : undefined}>
        {tr('authReviewKicker')}
      </AuthLabel>
      <Text style={[styles.title, { color: palette.heading, textAlign: align }]}>
        {tr('authReviewTitle')}
      </Text>
      <Text style={[styles.sub, { color: palette.body, textAlign: align }]}>{completeness}</Text>

      <View style={[styles.card, { borderColor: palette.border }]}>
        {items.map((item, i) => (
          <SummaryRow
            key={item.key}
            label={item.label}
            value={item.value}
            action={item.missing ? tr('authAdd') : tr('authEdit')}
            onPress={item.onEdit}
            palette={palette}
            missing={item.missing}
            last={i === items.length - 1}
            rtl={rtl}
          />
        ))}
      </View>

      <View
        style={[
          styles.consent,
          rtl && styles.consentRtl,
          { borderColor: palette.border, backgroundColor: palette.field },
        ]}
      >
        <Switch
          value={agreed}
          onValueChange={(v) => {
            void Haptics.selectionAsync();
            setAgreed(v);
          }}
          trackColor={{ true: palette.navy, false: palette.track }}
          accessibilityLabel={tr('authConsentA11y')}
        />
        <Text style={[styles.consentText, { color: palette.body, textAlign: align }]}>
          {tr('authConsentBefore')}
          <Text accessibilityRole="link" onPress={() => open('terms')} style={link}>
            {tr('legalTermsTitle')}
          </Text>
          {tr('authConsentAnd')}
          <Text accessibilityRole="link" onPress={() => open('privacy')} style={link}>
            {tr('legalPrivacyTitle')}
          </Text>
          {tr('authConsentAfter')}
        </Text>
      </View>

      {errorMessage != null && (
        <Text style={[styles.error, { color: palette.weak, textAlign: align }]}>
          {errorMessage}
        </Text>
      )}

      <Text style={[styles.note, { color: palette.label, textAlign: align }]}>
        {tr('authDataNote')}
      </Text>
    </AuthStepLayout>
  );
}

const styles = StyleSheet.create({
  rtlText: { textAlign: 'right' },
  title: { fontSize: 27, fontWeight: '600', letterSpacing: -0.55, marginTop: 10, marginBottom: 8 },
  sub: { fontSize: 14, lineHeight: 21, marginBottom: 20 },
  card: { borderWidth: 1, borderRadius: 18, overflow: 'hidden' },
  consent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 14,
    padding: 12,
    borderWidth: 1,
    borderRadius: 14,
  },
  consentRtl: { flexDirection: 'row-reverse' },
  consentText: { flex: 1, fontSize: 13.5, lineHeight: 20 },
  error: { fontSize: 13.5, lineHeight: 19, marginTop: 16 },
  note: { fontSize: 11.5, lineHeight: 18, marginTop: 16, paddingHorizontal: 2, paddingBottom: 12 },
});

// v1.1.0 — The consent box (Terms + Privacy, linked to the published pages) gates the
//          button; what it confirmed is sent with the registration (LAUNCH_PLAN 1.8).
// v1.0.0 — Final review: every value, every gap, and the way back to each.
