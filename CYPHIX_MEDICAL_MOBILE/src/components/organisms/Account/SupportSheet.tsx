/* ==================================================================
   SupportSheet (organism) — Settings → Account → "Contact support", in
   the app's own bottom sheet. The web's SupportDialog, on a phone:
   the account's address shown (not asked), the category as chips, a
   subject, the text with its counter, Send. The server attaches the
   account and asks no CAPTCHA (a signed-in person passed it at
   sign-up). On success the sheet says where the answer will arrive and
   shows the reference; the fields start empty each time it opens.

   The rules are the server's (shared SUPPORT_LIMITS /
   supportInputProblems), so a refusal is rare and explained. Without a
   server (EXPO_PUBLIC_API_BASE_URL unset) there is nothing to send to,
   and the sheet says so instead of pretending.
   ================================================================== */

import { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  SUPPORT_CATEGORIES,
  SUPPORT_LIMITS,
  supportInputProblems,
  type SupportCategory,
  type SupportCreated,
} from '@cyphix/shared';
import AuthLabel from '@/components/atoms/Auth/AuthLabel';
import AuthPrimaryButton from '@/components/atoms/Auth/AuthPrimaryButton';
import AuthField from '@/components/molecules/Auth/AuthField';
import ChoiceChip from '@/components/molecules/Auth/ChoiceChip';
import BottomSheet from '@/components/molecules/BottomSheet';
import { ENV } from '@/config/env';
import { APP_VERSION } from '@/config/version';
import { useAuth } from '@/features/auth/useAuth';
import { useTranslation } from '@/i18n/useTranslation';
import type { TranslationKey } from '@/i18n/config';
import { useCreateSupportTicketMutation } from '@/services/api/endpoints/contactApi';
import { logAudit } from '@/services/audit/auditLogger';
import { authPalette, AUTH_METRICS } from '@/theme/authTheme';
import { useIsDark, useTheme } from '@/theme/useTheme';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export const SUPPORT_CATEGORY_KEY: Record<SupportCategory, TranslationKey> = {
  account: 'supportCatAccount',
  app: 'supportCatApp',
  device: 'supportCatDevice',
  data: 'supportCatData',
  billing: 'supportCatBilling',
  other: 'supportCatOther',
};

export default function SupportSheet({ visible, onClose }: Props) {
  const { t: tr, rtl, lang } = useTranslation();
  const theme = useTheme();
  const dark = useIsDark();
  const palette = authPalette(dark);
  const { user } = useAuth();
  const [createTicket] = useCreateSupportTicketMutation();

  const [category, setCategory] = useState<SupportCategory>('account');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [bodyFocused, setBodyFocused] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorKey, setErrorKey] = useState<TranslationKey | null>(null);
  const [sent, setSent] = useState<SupportCreated | null>(null);

  useEffect(() => {
    if (visible) {
      setCategory('account');
      setSubject('');
      setBody('');
      setBusy(false);
      setErrorKey(null);
      setSent(null);
    }
  }, [visible]);

  const problems = supportInputProblems({ subject, body, category });
  const ready = problems.length === 0 && !busy && ENV.hasBackend;
  const email = user?.email ?? '';

  const submit = async () => {
    if (!ENV.hasBackend) {
      setErrorKey('supportErrNoServer');
      return;
    }
    if (!ready) return;
    setBusy(true);
    setErrorKey(null);
    try {
      const created = await createTicket({
        subject: subject.trim(),
        body: body.trim(),
        category,
        source: 'mobile',
        lang: lang === 'he' ? 'he' : 'en',
        appVersion: APP_VERSION,
        platform: Platform.OS,
      }).unwrap();
      setSent(created);
      logAudit({
        actor: { id: user?.id ?? 'anonymous', role: user?.role ?? 'guest' },
        action: 'support:create',
        resourceType: 'SupportTicket',
        resourceId: created.id,
        outcome: 'success',
        detail: category,
      });
    } catch (err) {
      const e = err as { status?: number | string; message?: string };
      const msg = (e.message ?? '').toLowerCase();
      if (e.status === 429) setErrorKey('supportErrRate');
      else if (e.status === 0 || e.status === 'FETCH_ERROR' || msg.includes('network') || msg.includes('fetch')) setErrorKey('supportErrOffline');
      else if (e.status === 400) setErrorKey('supportErrFields');
      else setErrorKey('supportErrGeneric');
    } finally {
      setBusy(false);
    }
  };

  const align = rtl ? ('right' as const) : ('left' as const);

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={sent ? tr('supportSentTitle') : tr('supportTitle')}
      closeLabel={tr('acctClose')}
      scrollable
      footer={
        <View style={styles.footer}>
          {sent ? (
            <AuthPrimaryButton label={tr('acctClose')} onPress={onClose} palette={palette} />
          ) : (
            <AuthPrimaryButton
              label={busy ? tr('supportSending') : tr('supportSend')}
              onPress={() => void submit()}
              palette={palette}
              enabled={ready}
              busy={busy}
            />
          )}
        </View>
      }
    >
      <View style={styles.body}>
        {sent ? (
          <>
            <Text style={[styles.desc, { color: theme.textSecondary, textAlign: align }]}>
              {tr('supportSentBody', { subject: subject.trim(), email })}
            </Text>
            <Text style={[styles.ref, { color: theme.textSecondary, textAlign: align }]}>
              {tr('supportTicketId')}: {sent.id}
            </Text>
          </>
        ) : (
          <>
            <Text style={[styles.desc, { color: theme.textSecondary, textAlign: align }]}>
              {tr('supportDesc')}
            </Text>
            <Text style={[styles.from, { color: theme.textSecondary, textAlign: align }]}>
              {tr('supportEmail')}: <Text style={{ color: theme.textPrimary, fontWeight: '600' }}>{email || '—'}</Text>
            </Text>
            <View style={styles.group}>
              <AuthLabel palette={palette} style={[styles.label, rtl && styles.labelRtl]}>
                {tr('supportCategory')}
              </AuthLabel>
              <View style={[styles.chips, rtl && styles.chipsRtl]}>
                {SUPPORT_CATEGORIES.map((c) => (
                  <ChoiceChip
                    key={c}
                    label={tr(SUPPORT_CATEGORY_KEY[c])}
                    selected={category === c}
                    onPress={() => setCategory(c)}
                    palette={palette}
                    variant="pill"
                  />
                ))}
              </View>
            </View>
            <AuthField
              label={tr('supportSubject')}
              value={subject}
              onChangeText={(v) => {
                if (errorKey) setErrorKey(null);
                setSubject(v.slice(0, SUPPORT_LIMITS.subjectMax));
              }}
              palette={palette}
              placeholder={tr('supportSubjectPlaceholder')}
              autoCapitalize="sentences"
              returnKeyType="next"
              rtl={rtl}
            />
            <View style={styles.group}>
              <AuthLabel palette={palette} style={[styles.label, rtl && styles.labelRtl]}>
                {tr('supportBody')}
              </AuthLabel>
              <TextInput
                value={body}
                onChangeText={(v) => {
                  if (errorKey) setErrorKey(null);
                  setBody(v.slice(0, SUPPORT_LIMITS.bodyMax));
                }}
                onFocus={() => setBodyFocused(true)}
                onBlur={() => setBodyFocused(false)}
                placeholder={tr('supportBodyPlaceholder')}
                placeholderTextColor={palette.placeholder}
                multiline
                textAlignVertical="top"
                maxLength={SUPPORT_LIMITS.bodyMax}
                accessibilityLabel={tr('supportBody')}
                style={[
                  styles.textarea,
                  {
                    color: palette.heading,
                    backgroundColor: bodyFocused ? palette.page : palette.field,
                    borderColor: bodyFocused ? palette.navy : palette.border,
                    textAlign: rtl ? 'right' : 'left',
                  },
                ]}
              />
              <Text style={[styles.hint, { color: theme.textSecondary, textAlign: rtl ? 'left' : 'right' }]}>
                {tr('supportBodyHint', { n: body.length, max: SUPPORT_LIMITS.bodyMax })}
              </Text>
            </View>
            {!ENV.hasBackend && (
              <Text style={[styles.error, { color: palette.weak, textAlign: align }]}>{tr('supportErrNoServer')}</Text>
            )}
            {errorKey && (
              <Text style={[styles.error, { color: palette.weak, textAlign: align }]}>{tr(errorKey)}</Text>
            )}
          </>
        )}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 14, paddingBottom: 8, gap: 14 },
  footer: { paddingHorizontal: 14, paddingTop: 10 },
  desc: { fontSize: 14, lineHeight: 20 },
  from: { fontSize: 14, lineHeight: 20 },
  ref: { fontSize: 13, lineHeight: 20, fontVariant: ['tabular-nums'] },
  group: { gap: 7 },
  label: { marginBottom: 0 },
  labelRtl: { textAlign: 'right' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chipsRtl: { flexDirection: 'row-reverse' },
  textarea: {
    minHeight: 120,
    borderWidth: 1,
    borderRadius: AUTH_METRICS.fieldRadius,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 15.5,
    lineHeight: 21,
  },
  hint: { fontSize: 12 },
  error: { fontSize: 13.5, lineHeight: 20 },
});

// v1.0.0 — Contact support from Settings: the account attached, category chips, subject, text,
//          the sent state with the reference (server v0.23.0, LAUNCH_PLAN 5.4).
