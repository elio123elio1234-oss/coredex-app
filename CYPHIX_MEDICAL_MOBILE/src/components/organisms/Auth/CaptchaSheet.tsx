/* ==================================================================
   CaptchaSheet (organism) — the sign-up's bot check, on a phone.

   Cloudflare's Turnstile widget does not run natively, so the sheet
   shows the WEB APP'S OWN public /captcha page (`embed=1`) in the
   WebView this binary already ships (`OptionalWebView`, since app.json
   0.35.0) and takes the token from the message that page posts
   (shared `CaptchaPageMessage`). One page, one widget, one set of
   words — the phone draws nothing of its own and cannot drift from it.

   Opened by `useOnboarding` ONLY when `GET /auth/captcha` named a
   provider (server v0.15.0); every deployment without Turnstile keys
   never shows it. Its fallback — a binary without the WebView, or a
   page that will not load — is the same URL in the system browser with
   `return=cyphix://captcha`, which brings the token back as a deep link
   that `AuthLinkListener` hands to the review screen.
   ================================================================== */

import { useEffect, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import {
  CAPTCHA_APP_RETURN,
  CAPTCHA_PAGE_MESSAGE_TYPE,
  captchaPageUrl,
  isCaptchaTokenShaped,
} from '@cyphix/shared';
import AuthPrimaryButton from '@/components/atoms/Auth/AuthPrimaryButton';
import { OptionalWebView, type OptionalWebViewMessageEvent } from '@/components/atoms/OptionalWebView';
import BottomSheet from '@/components/molecules/BottomSheet';
import { ENV } from '@/config/env';
import { useTranslation } from '@/i18n/useTranslation';
import { authPalette } from '@/theme/authTheme';
import { useIsDark, useTheme } from '@/theme/useTheme';

interface Props {
  visible: boolean;
  onClose: () => void;
  /** The challenge response — what the registration sends. */
  onToken: (token: string) => void;
}

/** Tall enough for Turnstile's widget (65 pt) plus the page's title and
    hint, in either language, without the page scrolling inside a sheet. */
const PAGE_HEIGHT = 300;

export default function CaptchaSheet({ visible, onClose, onToken }: Props) {
  const { t: tr, lang, rtl } = useTranslation();
  const theme = useTheme();
  const dark = useIsDark();
  const palette = authPalette(dark);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (visible) setFailed(false);
  }, [visible]);

  const pageUrl = captchaPageUrl(ENV.webOrigin, { embed: true, lang });
  const browserUrl = captchaPageUrl(ENV.webOrigin, { returnTo: CAPTCHA_APP_RETURN, lang });

  const onMessage = (event: OptionalWebViewMessageEvent) => {
    try {
      const message = JSON.parse(event.nativeEvent.data) as { type?: unknown; token?: unknown };
      if (
        message.type === CAPTCHA_PAGE_MESSAGE_TYPE &&
        typeof message.token === 'string' &&
        isCaptchaTokenShaped(message.token)
      ) {
        onToken(message.token);
      }
    } catch {
      /* not ours — the page posts exactly one shape */
    }
  };

  const align = rtl ? ('right' as const) : ('left' as const);
  const canEmbed = OptionalWebView != null && !failed;

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={tr('authCaptchaTitle')}
      closeLabel={tr('acctClose')}
      footer={
        !canEmbed ? (
          <View style={styles.footer}>
            <AuthPrimaryButton
              label={tr('authCaptchaOpenBrowser')}
              onPress={() => void Linking.openURL(browserUrl)}
              palette={palette}
            />
          </View>
        ) : undefined
      }
    >
      <View style={styles.body}>
        <Text style={[styles.desc, { color: theme.textSecondary, textAlign: align }]}>
          {tr('authCaptchaBody')}
        </Text>
        {canEmbed && OptionalWebView ? (
          <View style={[styles.page, { borderColor: theme.border }]}>
            <OptionalWebView
              source={{ uri: pageUrl }}
              style={styles.webview}
              originWhitelist={['https://*']}
              javaScriptEnabled
              onMessage={onMessage}
              onError={() => setFailed(true)}
              onHttpError={() => setFailed(true)}
            />
          </View>
        ) : (
          <Text style={[styles.desc, { color: theme.textSecondary, textAlign: align }]}>
            {tr('authCaptchaNoWebView')}
          </Text>
        )}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 14, paddingBottom: 8, gap: 14 },
  footer: { paddingHorizontal: 14, paddingTop: 10 },
  desc: { fontSize: 14, lineHeight: 20 },
  page: { height: PAGE_HEIGHT, borderWidth: 1, borderRadius: 14, overflow: 'hidden' },
  webview: { flex: 1, backgroundColor: 'transparent' },
});

// v1.0.0 — The hosted /captcha page in the binary's WebView; token by posted message;
//          system-browser fallback with the cyphix://captcha return (server v0.15.0).
