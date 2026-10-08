/* ==================================================================
   AuthLinkListener — the phone's half of the e-mailed links.

   The server mails two kinds of link (v0.11.0): a password reset and an
   e-mail verification. On the web they are pages; here they arrive as
   URLs the OS hands the app — `cyphix://reset-password?token=…` (the
   scheme `app.json` has registered since the first build, so no native
   change was needed) or, pasted into a dev client, the web URL itself.

   One listener, mounted once, ABOVE the auth gate: a link can arrive
   while signed in, signed out, or on the splash, and what to do with it
   depends on which. It parses with the shared reader, puts the result in
   the auth slice as `pendingLink`, and then:

     • verification — spent right here, whatever state the app is in,
       and the outcome is said in a plain alert (the only toast this app
       has). The signed-in principal learns the fact without a refetch.
     • reset, signed OUT — left pending; `OnboardingScreen` takes it and
       opens its reset step on the token.
     • reset, signed IN — consumed with a one-line explanation. A reset
       is what you do when you cannot get in; while in, the honest path
       is sign out first. (The web shows the page regardless — it has a
       URL bar; a phone has no way back to the link.)

   Renders nothing.
   ================================================================== */

import { useEffect, useRef } from 'react';
import { Alert, Linking } from 'react-native';
import { parseAuthLinkUrl } from '@cyphix/shared';
import { authLinkConsumed, authLinkReceived, verifyEmail } from '@/features/auth/authSlice';
import { useTranslation } from '@/i18n/useTranslation';
import { useAppDispatch, useAppSelector } from '@/store/hooks';

export default function AuthLinkListener() {
  const dispatch = useAppDispatch();
  const pending = useAppSelector((s) => s.auth.pendingLink);
  const user = useAppSelector((s) => s.auth.user);
  const { t: tr } = useTranslation();

  /* The URL that launched the app, then every one that arrives while it
     is open. `getInitialURL` can reject on some Android launchers — a
     rejection means "no link", nothing more. */
  useEffect(() => {
    const handle = (url: string | null) => {
      const link = url ? parseAuthLinkUrl(url) : null;
      if (link) dispatch(authLinkReceived(link));
    };
    Linking.getInitialURL()
      .then(handle)
      .catch(() => {});
    const sub = Linking.addEventListener('url', (event) => handle(event.url));
    return () => sub.remove();
  }, [dispatch]);

  /* One link in flight at a time: the token is single-use on the server
     and an effect can re-run before a request has answered. */
  const handling = useRef(false);
  useEffect(() => {
    if (!pending || handling.current) return;

    if (pending.kind === 'verify') {
      handling.current = true;
      const { token } = pending;
      dispatch(authLinkConsumed());
      dispatch(verifyEmail({ token }))
        .unwrap()
        .then(() => Alert.alert(tr('authVerifiedTitle'), tr('authVerifiedBody')))
        .catch((code: unknown) => {
          if (code === 'invalid-link') {
            Alert.alert(tr('authVerifyFailedTitle'), tr('authVerifyFailedBody'));
          } else {
            Alert.alert(tr('authErrUnknown'));
          }
        })
        .finally(() => {
          handling.current = false;
        });
      return;
    }

    if (pending.kind === 'reset' && user) {
      dispatch(authLinkConsumed());
      Alert.alert(tr('authResetSignedInTitle'), tr('authResetSignedInBody'));
    }
    /* A reset link while signed out stays pending for OnboardingScreen. */
  }, [pending, user, dispatch, tr]);

  return null;
}

// v1.0.0 — Deep-link intake for the reset and verification links (server v0.11.0).
