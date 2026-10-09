/* ==================================================================
   HttpAuthService — sign-in against the REAL CYPHIX server, and the
   reason a person who registered on the web app can open this one and be
   the same patient (root CLAUDE.md §2.2: one communication layer).

   It is the mobile twin of the web's `services/auth/httpAuthService.ts`
   and deliberately behaves identically where it can:

     register → POST /auth/register  (creates a PATIENT + their FHIR
                Patient resource + health profile, server-side)
     login    → POST /auth/login     (argon2id, lockout after 10 fails)
     restore  → POST /auth/refresh   (the enclave token IS the session)
     logout   → POST /auth/logout    (revokes the whole token family)

   ── What it does NOT pretend to do ──
   The server has no SMS gateway (see AUTH_ROUTES_PLANNED in
   @cyphix/shared), so the phone-verification step answers HONESTLY out of
   the device — a fixed, displayed code — instead of calling a route that
   would 404 and read as "the server is broken". A row in PARITY.md, not a
   silent gap. (Forgot-password used to be the second such stub; since
   server v0.11.0 it is real — see the recovery methods below.)

   ── And why `emailExists` says "no" here ──
   Asking a server "does this address have an account?" IS an account
   enumeration oracle, which is exactly why CYPHIX_SERVER refuses to
   answer it — its login returns one message for every cause. So against
   a real server the sign-up step stops guessing and lets the authority
   decide: `POST /auth/register` answers 409, which surfaces on the same
   step, with the same message, one screen later.
   ================================================================== */

import {
  AUTH_ROUTES,
  AuthError,
  TOTP_ROUTES,
  TotpChallengeRequired,
  ACCOUNT_LIFECYCLE_ROUTES,
  CONSENT_ROUTES,
  PATIENT_ROUTES,
  CAPTCHA_ROUTES,
  type AuthErrorCode,
  type AuthSession,
  type AuthTokens,
  type CaptchaPolicy,
  type ConsentInput,
  type ConsentRecord,
  type ConsentRecordedResult,
  type ConsentsResult,
  type AccountExport,
  type Credentials,
  type DeletionRequestInput,
  type DeletionStatus,
  type EmailChangeConfirmInput,
  type EmailChangeConfirmResult,
  type EmailChangeInput,
  type EmailChangeRequestResult,
  type EmailVerifyInput,
  type EmailVerifyRequestResult,
  type EmailVerifyResult,
  type PasswordChangeInput,
  type PasswordChangeResult,
  type PasswordForgotInput,
  type PasswordForgotResult,
  type PasswordResetInput,
  type RefreshOutcome,
  type RegistrationInput,
  type SessionsResult,
  type SessionsRevokedResult,
  type SessionUser,
  type SessionView,
  type TotpChallenge,
  type TotpDisableInput,
  type TotpDisableResult,
  type TotpEnableInput,
  type TotpEnableResult,
  type TotpLoginInput,
  type TotpSetup,
  type TotpStatus,
} from '@cyphix/shared';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { toPortraitDataUrl } from '@/services/media/photoPicker';
import {
  apiRoot,
  clearSession,
  getAccessToken,
  readPrincipal,
  readRefreshToken,
  noteSessionEvent,
  refreshSession,
  storeSession,
} from '@/services/api/tokenStore';
import {
  MOCK_SMS_CODE,
  type MobileAuthService,
  type RememberedAccount,
} from './authContract';

/** Who this device last signed in as. NOT the token — that is in the
    enclave; this is only the name the sign-in screen greets. */
const REMEMBERED_KEY = 'cyphix:auth:remembered';

interface ServerErrorBody {
  error?: { code?: string; message?: string };
}

interface RequestOptions {
  /** Attach the bearer token; on a 401, refresh ONCE and retry ONCE — the
      same policy httpBaseQuery applies to every data call. */
  auth?: boolean;
  method?: 'POST' | 'GET' | 'DELETE';
}

/** json → json. Empty bodies (204) resolve to undefined. */
async function request<T>(path: string, body: unknown, opts: RequestOptions = {}): Promise<T> {
  const send = async (): Promise<Response> => {
    const bearer = opts.auth ? getAccessToken() : null;
    try {
      return await fetch(`${apiRoot()}${path}`, {
        method: opts.method ?? 'POST',
        headers: {
          ...(body === undefined ? {} : { 'content-type': 'application/json' }),
          ...(bearer ? { authorization: `Bearer ${bearer}` } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch {
      /* A phone is offline far more often than a laptop, and "no signal" is
         not "wrong password" — the UI says so because the code says so. */
      throw new AuthError('network');
    }
  };

  let res = await send();
  if (opts.auth && res.status === 401 && (await refreshSession()).kind === 'refreshed') {
    res = await send();
  }

  if (!res.ok) {
    let serverCode: string | undefined;
    let message: string | undefined;
    try {
      const parsed = (await res.json()) as ServerErrorBody;
      serverCode = parsed.error?.code;
      message = parsed.error?.message;
    } catch {
      /* non-JSON error body (a proxy's 502 page, say) */
    }
    let code: AuthErrorCode = 'unknown';
    if (res.status === 401) code = 'invalid-credentials';
    else if (res.status === 409) code = 'email-taken';
    else if (res.status === 429) code = 'rate-limited';
    else if (res.status === 400 && serverCode === 'invalid_token') code = 'invalid-link';
    /* Before the message heuristic: "the current password is incorrect"
       contains the word too, and is not a weak password. */
    else if (res.status === 400 && serverCode === 'wrong_password') code = 'wrong-password';
    /* The bot check (server v0.15.0): "show the sheet" vs "a fresh one". */
    else if (serverCode === 'captcha_required') code = 'captcha-required';
    else if (serverCode === 'captcha_failed' || serverCode === 'captcha_unavailable') {
      code = 'captcha-failed';
    }
    /* Two-factor (server v0.24.0): a wrong code keeps the challenge; a
       dead challenge sends the person back to the password. */
    else if (serverCode === 'totp_invalid') code = 'totp-invalid';
    else if (serverCode === 'totp_challenge_expired') code = 'totp-expired';
    else if (res.status === 400 && message?.toLowerCase().includes('password')) {
      code = 'weak-password';
    }
    throw new AuthError(code, message);
  }

  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

/** POST json → json (the historical name; everything auth posts). */
const post = <T,>(path: string, body: unknown, opts: RequestOptions = {}): Promise<T> =>
  request<T>(path, body, opts);

/**
 * Upload the portrait the wizard collected, once the account exists.
 *
 * Deliberately best-effort and NEVER able to fail a registration: the
 * account is already created and the session already established by the
 * time this runs, so throwing here would report "sign-up failed" for a
 * picture. If it does not land, the patient has an account with initials
 * and a working picker on the Profile screen — which is a recoverable
 * state, and the only reason it is acceptable to swallow this.
 */
async function uploadPortrait(patientId: string, photoUri: string): Promise<void> {
  try {
    const dataUrl = await toPortraitDataUrl(photoUri);
    if (!dataUrl) return;
    await fetch(`${apiRoot()}${PATIENT_ROUTES.photo(patientId)}`, {
      method: 'PUT',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${getAccessToken() ?? ''}`,
      },
      body: JSON.stringify({ photo: dataUrl }),
    });
  } catch {
    /* see above — an account without a portrait is a working account */
  }
}

async function remember(user: SessionUser): Promise<void> {
  try {
    const record: RememberedAccount = { id: user.id, displayName: user.displayName };
    await AsyncStorage.setItem(REMEMBERED_KEY, JSON.stringify(record));
  } catch {
    /* Only costs the greeting on the sign-in screen. */
  }
}

async function forget(): Promise<void> {
  try {
    await AsyncStorage.removeItem(REMEMBERED_KEY);
  } catch {
    /* nothing to forget */
  }
}

export class HttpAuthService implements MobileAuthService {
  /**
   * Boot restore — and it DOES NOT TOUCH THE NETWORK.
   *
   * ★ This is the fix for "closing the app for a while and reopening it
   * dumps me on the sign-in screen, and it only signs me in once the
   * server wakes up". The old version awaited a refresh: an unreachable
   * or sleeping server therefore meant either a null (⇒ the door) or a
   * boot that hung until the server answered forty seconds later — which
   * is precisely what was seen.
   *
   * The enclave is the session. If a usable principal is in it, this
   * answers instantly and the app opens; whether the server agrees is
   * settled afterwards, in the background, by `revalidateSession` — and
   * only a REJECTION ends the session. A cold start is now the same
   * length with the server up, asleep or absent.
   *
   * `profile` is empty on purpose: the server owns the medical card and
   * serves it from GET /patients/:id/card, which is a separate screen's
   * query, not something to smuggle through the session. Registration
   * still returns what the wizard just typed (below), so the review and
   * success screens are unaffected.
   */
  async restore(): Promise<AuthSession | null> {
    const principal = await readPrincipal();
    if (principal) {
      await remember(principal.user);
      /* No access token yet — it is memory-only and this is a cold start.
         Every request will 401 and drive the single-flight refresh, which
         is the same path a 15-minute-old token takes. Nothing is granted
         by opening here that the server has not been asked about. */
      return { user: principal.user, token: getAccessToken() ?? '', profile: {} };
    }

    /**
     * No principal. That does NOT mean no session — see
     * `hasStoredSession` below — and this method deliberately does not
     * find out, because finding out costs a round trip.
     *
     * ⚠️ v0.40.2 DID await a refresh here, and it recreated the exact bug
     * this release exists to kill, one layer up: `AuthGate`'s 4 s ceiling
     * raced the request, won against a cold server every single time, and
     * showed the sign-in screen while the refresh was still in flight.
     * Reported as "I force-quit the app and it goes straight to login".
     * The gate now drives the recovery itself and holds the splash for
     * it — a wait it can bound, which is not something this method can do
     * from down here.
     */
    return null;
  }

  /**
   * Is there a credential on this device, whoever it belongs to?
   *
   * The question `restore()` cannot answer without the network. It exists
   * so the gate can tell "nobody has ever signed in here" (→ show the
   * door immediately) from "somebody is signed in and we have not yet
   * learned who" (→ hold the splash and ask). Before v0.40.0 the enclave
   * held only this token and no principal, so every phone already signed
   * in when that update landed lands in the second case exactly once.
   */
  async hasStoredSession(): Promise<boolean> {
    return (await readRefreshToken()) !== null;
  }

  /**
   * Ask the server whether the restored session is still real.
   *
   * Split from `restore` so the app can open on what the device knows and
   * correct itself when the answer arrives, rather than making the
   * patient wait for a round trip to find out something that is almost
   * always "yes". The three outcomes are passed straight up — the caller
   * (`authSlice`) is where the policy lives, and flattening them here
   * would recreate the exact bug this release removes.
   *
   * ══ ★ IT NO LONGER ROTATES A TOKEN TO ASK A QUESTION (v2.3.0) ══
   * This used to be `refreshSession()` and nothing else, which meant every
   * caller of it ROTATED the refresh token. `AuthGate` calls it on every
   * return from the background and again on a 4 s→60 s backoff for as long
   * as the app believes it is offline — so the app was spending its most
   * fragile credential over and over, most often on exactly the flaky
   * network that makes a rotation's reply go missing. Each of those is a
   * chance to end up holding a token the server has already retired, which
   * is the mid-session sign-out this release exists to remove (the other
   * half is server-side: CYPHIX_SERVER migration 0003).
   *
   * So: ask with the ACCESS token first, which proves the same two things
   * the caller actually wants — the server is reachable, and this session
   * is still recognised — and costs nothing if it fails. Only fall through
   * to a real rotation when there is no other way to learn: no access
   * token at all (a cold start), or one the server no longer accepts. The
   * result is one rotation per ~15 minutes of use rather than one per
   * foreground, and NONE at all while offline.
   */
  /**
   * ⚠️ SINGLE-FLIGHT, and it has to be at THIS level rather than only
   * around `refreshSession`.
   *
   * `AuthGate` dispatches `revalidateSession` from three independent
   * places that can all fire inside the same second on a foreground: the
   * boot effect, every `AppState → 'active'`, and the offline retry
   * backoff. `refreshSession` is single-flight, but it releases the
   * instant one exchange settles — so three probes arriving a few hundred
   * milliseconds apart, each returning 401, produced three SEQUENTIAL
   * rotations, not one. That is three chances for a reply to go missing
   * and strand the phone on a token the server has already retired, and
   * it contradicts this file's own stated aim of one rotation per ~15
   * minutes of use rather than one per foreground.
   *
   * Sharing the whole `revalidate` — probe included — is what makes that
   * true, because the probe is where the 401 that triggers the rotation
   * comes from.
   */
  async revalidate(): Promise<RefreshOutcome> {
    this.revalidateInFlight ??= this.doRevalidate().finally(() => {
      this.revalidateInFlight = null;
    });
    return this.revalidateInFlight;
  }

  private revalidateInFlight: Promise<RefreshOutcome> | null = null;

  private async doRevalidate(): Promise<RefreshOutcome> {
    const probed = await this.probe();
    if (probed) return probed;
    const outcome = await refreshSession();
    if (outcome.kind === 'refreshed') await remember(outcome.user);
    return outcome;
  }

  /**
   * Confirm the session with the access token we already hold.
   *
   * Returns null for "this could not answer the question" — no token to
   * ask with, or a server that would not say — and the caller then does
   * the full rotation, i.e. exactly what it did before this existed. That
   * is the design: every unexpected reply degrades to the old behaviour
   * rather than to a guess.
   *
   * ⚠️ A 401 here is NOT a rejection and must never be reported as one. It
   * means this ~15-minute access token has aged out, which is ordinary and
   * says nothing about the session — the refresh token is what answers
   * that, and `refreshSession()` is what asks it.
   */
  private async probe(): Promise<RefreshOutcome | null> {
    const token = getAccessToken();
    /* No access token is the cold-start case. Only a rotation can produce
       one, so there is nothing to be saved by asking first. */
    if (!token) return null;
    /* The principal carries the refresh token's expiry, which `refreshed`
       has to state and which a probe does not learn. Its absence means the
       enclave has nothing to confirm against. */
    const principal = await readPrincipal();
    if (!principal) return null;

    let res: Response;
    try {
      res = await fetch(`${apiRoot()}${AUTH_ROUTES.me}`, {
        headers: { authorization: `Bearer ${token}` },
      });
    } catch {
      /* Nothing came back, so nothing is known — the one thing this may
         never do is let a lost signal end a session. */
      return { kind: 'offline' };
    }

    if (res.status === 401) return null; // aged-out access token → rotate
    /* A 5xx is the server unable to serve, not the server refusing us:
       Render answers a sleeping container this way while it wakes. */
    if (res.status >= 500) return { kind: 'offline' };
    if (!res.ok) return null; // 403/404/anything else → ask the old way

    let user: SessionUser;
    try {
      user = (await res.json()) as SessionUser;
    } catch {
      /* 200 with a body we cannot read — a captive portal, classically. */
      return { kind: 'offline' };
    }
    if (!user?.id) return null;

    await remember(user);
    /* Recorded like a real refresh, and named differently: a probe CONFIRMS
       the session without rotating anything, and the whole point of
       preferring it is that it happens far more often than a rotation. A
       diagnostic that only showed rotations would go quiet for fifteen
       minutes at a time and read as nothing happening. */
    await noteSessionEvent('confirmed OK (no rotation)');
    return { kind: 'refreshed', user, refreshExpiresAt: principal.refreshExpiresAt };
  }

  async login(credentials: Credentials): Promise<AuthSession> {
    const body = await post<AuthTokens | TotpChallenge>(AUTH_ROUTES.login, {
      email: credentials.email.trim().toLowerCase(),
      password: credentials.password,
    });
    /* 202 (server v0.24.0): the password was right and this account asks
       for a code from its authenticator app. Nothing to store yet — the
       slice parks the challenge and the code step spends it. */
    if ('totpRequired' in body) throw new TotpChallengeRequired(body);
    await storeSession(body);
    await remember(body.user);
    return { user: body.user, token: body.accessToken, profile: {} };
  }

  /* ── Two-factor (server v0.24.0; routes as in shared TOTP_ROUTES) ── */

  /** The second step: the challenge + a code → the login envelope,
      stored and remembered exactly like `login`. */
  async loginTotp(input: TotpLoginInput): Promise<AuthSession> {
    const tokens = await post<AuthTokens>(TOTP_ROUTES.loginTotp, input);
    await storeSession(tokens);
    await remember(tokens.user);
    return { user: tokens.user, token: tokens.accessToken, profile: {} };
  }

  totpStatus(): Promise<TotpStatus> {
    return request<TotpStatus>(TOTP_ROUTES.status, undefined, { auth: true, method: 'GET' });
  }

  totpSetup(): Promise<TotpSetup> {
    return post<TotpSetup>(TOTP_ROUTES.setup, {}, { auth: true });
  }

  totpEnable(input: TotpEnableInput): Promise<TotpEnableResult> {
    return post<TotpEnableResult>(TOTP_ROUTES.enable, input, { auth: true });
  }

  totpDisable(input: TotpDisableInput): Promise<TotpDisableResult> {
    return post<TotpDisableResult>(TOTP_ROUTES.disable, input, { auth: true });
  }

  /** Public. `off` is a complete answer. */
  captchaPolicy(): Promise<CaptchaPolicy> {
    return request<CaptchaPolicy>(CAPTCHA_ROUTES.policy, undefined, { method: 'GET' });
  }

  async register(input: RegistrationInput): Promise<AuthSession> {
    const { fullName, email, password, ...profile } = input;
    /* The server's register schema takes the health details as `profile`
       and builds the FHIR Patient + the encrypted health profile from
       them — the same body the web's RegisterWizard sends, so an account
       created on a phone and one created in a browser are the same kind
       of record.

       Mapped field by field rather than spread, for two honest reasons:
       `photoUri` is a local file path that means nothing on a server (the
       picture follows separately, below, once there is a patient id to
       attach it to) and `avatarTone` is a rendering choice this device
       made; and "unknown" blood type is the patient declining to say,
       which must arrive as an absent field and not as the literal string
       "unknown" printed on an emergency card. */
    const tokens = await post<AuthTokens>(AUTH_ROUTES.register, {
      email: email.trim().toLowerCase(),
      password,
      displayName: fullName.trim(),
      profile: {
        birthDate: profile.birthDate,
        sex: profile.sex,
        phone: profile.phone,
        bloodType: profile.bloodType === 'unknown' ? undefined : profile.bloodType,
        heightCm: profile.heightCm,
        weightKg: profile.weightKg,
        emergencyName: profile.emergencyName,
        emergencyPhone: profile.emergencyPhone,
        emergencyRelation: profile.emergencyRelation,
      },
      /* What the review screen's box confirmed, at the versions this
         build knows; the server writes it with the account (v0.13.0). */
      ...(input.consents?.length ? { consents: input.consents } : {}),
      /* The challenge response, when the policy asked for one (v0.15.0). */
      ...(input.captchaToken ? { captchaToken: input.captchaToken } : {}),
    });
    await storeSession(tokens);
    await remember(tokens.user);
    /* The picture the photo step collected. It could not be sent with the
       registration body — there was no patient id to attach it to until
       this reply — and it is the only part of the profile that is not a
       field on the form. */
    if (profile.photoUri && tokens.user.linkedPatientId) {
      await uploadPortrait(tokens.user.linkedPatientId, profile.photoUri);
    }
    return { user: tokens.user, token: tokens.accessToken, profile };
  }

  async logout(): Promise<void> {
    const refreshToken = await readRefreshToken();
    try {
      if (refreshToken) await post(AUTH_ROUTES.logout, { refreshToken });
    } catch {
      /* A server that cannot be reached must not trap someone in an
         account on their own phone. The local session goes either way;
         the token expires on its own. */
    } finally {
      await clearSession();
      await forget();
    }
  }

  /**
   * ★ Biometric unlock is NOT offered against a real server — deliberately.
   *
   * On the mock, "unlock" minted a local session, so the button always had
   * something to open. Against the server the only thing a fingerprint
   * could release is the enclave's refresh token — and if that token is
   * still valid, `restore()` has already signed the patient in and this
   * screen was never reached. If it is not valid, no gesture can revive
   * it. Either way the button would be decorative, and a dead "Use Face
   * ID" is precisely what `biometrics.ts` refuses to draw.
   *
   * The real feature this wants to become is an APP LOCK — biometrics
   * gating an already-restored session on resume. That is a product
   * decision with its own screen, tracked in PARITY.md, not something to
   * fake here.
   */
  async rememberedAccount(): Promise<RememberedAccount | null> {
    return null;
  }

  async signInRemembered(): Promise<AuthSession | null> {
    return null;
  }

  /** See the header: the server refuses to be an enumeration oracle, so
      the honest answer here is "I cannot know" — expressed as `false`,
      which lets the wizard continue and lets 409 be the real verdict. */
  async emailExists(_email: string): Promise<boolean> {
    return false;
  }

  /* ── Account recovery (server v0.11.0, shared AUTH_ROUTES) ── */

  /** The server answers 202 whether or not the address exists; the
      screen's wording ("if that address is on an account, a link is on
      its way") was written for exactly that answer, and is now true
      because something is actually sent. */
  async requestPasswordReset(input: PasswordForgotInput): Promise<void> {
    await post<PasswordForgotResult>(AUTH_ROUTES.forgotPassword, {
      email: input.email.trim().toLowerCase(),
    });
  }

  /** The server revoked every other session and answers with the login
      envelope, so this is a sign-in from here on — stored and remembered
      exactly like `login`. */
  async resetPassword(input: PasswordResetInput): Promise<AuthSession> {
    const tokens = await post<AuthTokens>(AUTH_ROUTES.resetPassword, input);
    await storeSession(tokens);
    await remember(tokens.user);
    return { user: tokens.user, token: tokens.accessToken, profile: {} };
  }

  async verifyEmail(input: EmailVerifyInput): Promise<void> {
    await post<EmailVerifyResult>(AUTH_ROUTES.verifyEmailConfirm, input);
  }

  async requestEmailVerification(): Promise<EmailVerifyRequestResult> {
    return post<EmailVerifyRequestResult>(AUTH_ROUTES.verifyEmailRequest, {}, { auth: true });
  }

  /* ── Account self-service (server v0.12.0, shared AUTH_ROUTES) ── */

  /** The server keeps THIS session (the access token names it) and ends
      every other one; the enclave's tokens stay valid. */
  async changePassword(input: PasswordChangeInput): Promise<PasswordChangeResult> {
    return post<PasswordChangeResult>(AUTH_ROUTES.changePassword, input, { auth: true });
  }

  async requestEmailChange(input: EmailChangeInput): Promise<void> {
    await post<EmailChangeRequestResult>(
      AUTH_ROUTES.changeEmail,
      { newEmail: input.newEmail.trim().toLowerCase(), password: input.password },
      { auth: true },
    );
  }

  async confirmEmailChange(input: EmailChangeConfirmInput): Promise<EmailChangeConfirmResult> {
    return post<EmailChangeConfirmResult>(AUTH_ROUTES.changeEmailConfirm, input);
  }

  async listSessions(): Promise<SessionView[]> {
    const r = await request<SessionsResult>(AUTH_ROUTES.sessions, undefined, {
      auth: true,
      method: 'GET',
    });
    return r.sessions;
  }

  async revokeSession(id: string): Promise<void> {
    await request<void>(AUTH_ROUTES.session(id), undefined, { auth: true, method: 'DELETE' });
  }

  async revokeOtherSessions(): Promise<number> {
    const r = await request<SessionsRevokedResult>(AUTH_ROUTES.sessions, undefined, {
      auth: true,
      method: 'DELETE',
    });
    return r.revoked;
  }

  /* ── Consent (server v0.13.0) ── */

  async listConsents(): Promise<ConsentsResult> {
    return request<ConsentsResult>(CONSENT_ROUTES.list, undefined, { auth: true, method: 'GET' });
  }

  async recordConsent(input: ConsentInput): Promise<ConsentRecord> {
    const r = await post<ConsentRecordedResult>(CONSENT_ROUTES.record, input, { auth: true });
    return r.consent;
  }

  /* ── Export + scheduled deletion (server v0.14.0) ── */

  async exportData(): Promise<AccountExport> {
    return request<AccountExport>(ACCOUNT_LIFECYCLE_ROUTES.export, undefined, {
      auth: true,
      method: 'GET',
    });
  }

  async deletionStatus(): Promise<DeletionStatus> {
    return request<DeletionStatus>(ACCOUNT_LIFECYCLE_ROUTES.deletion, undefined, {
      auth: true,
      method: 'GET',
    });
  }

  async requestDeletion(input: DeletionRequestInput): Promise<DeletionStatus> {
    return post<DeletionStatus>(ACCOUNT_LIFECYCLE_ROUTES.deletion, input, { auth: true });
  }

  async cancelDeletion(): Promise<DeletionStatus> {
    return post<DeletionStatus>(ACCOUNT_LIFECYCLE_ROUTES.deletionCancel, {}, { auth: true });
  }

  /** No SMS gateway on either side. The code is FIXED and shown on the
      step, exactly as in the mock: a hidden random code would make the
      step impossible to finish, and a real-looking one would let a patient
      believe a text was sent. */
  async requestPhoneCode(_phone: string): Promise<{ devCode: string }> {
    return { devCode: MOCK_SMS_CODE };
  }

  async verifyPhoneCode(_phone: string, code: string): Promise<boolean> {
    return code === MOCK_SMS_CODE;
  }
}

// v2.10.0 — Two-factor (server v0.24.0): login reads a 202 challenge as TotpChallengeRequired;
//          loginTotp spends it; totpStatus / totpSetup / totpEnable / totpDisable; maps
//          totp_invalid → 'totp-invalid', totp_challenge_expired → 'totp-expired'.
// v2.3.0 — `revalidate()` stops ROTATING a refresh token merely to ask whether
//          the server is there. AuthGate calls it on every foreground and on a
//          4 s→60 s backoff while offline, so the app was spending its most
//          fragile credential precisely on the flaky networks that lose a
//          rotation's reply — and a lost reply leaves the phone holding a token
//          the server has retired, which is the spontaneous mid-session logout.
//          It now asks with the access token it already has (GET /auth/me) and
//          rotates only when that cannot answer: no token (cold start) or a 401.
//          One rotation per ~15 min of use instead of one per foreground, and
//          none at all while offline. Server half: CYPHIX_SERVER migration 0003.
// v2.4.0 — `revalidate()` is SINGLE-FLIGHT as a whole, probe included.
//          `refreshSession` already was, but it releases the instant one
//          exchange settles - and AuthGate dispatches this from three places
//          that can fire in the same second (boot, every foreground, the
//          offline backoff). Three probes returning 401 a few hundred ms
//          apart therefore chained three SEQUENTIAL rotations, each one
//          another chance for a reply to go missing and leave the phone
//          holding a token the server has retired. It has to be shared at
//          this level because the probe is where that 401 comes from.
// v2.2.0 — `restore()` is a pure disk read again. v0.40.2 had it await a refresh
//          when a token existed with no principal (the pre-v0.40.0 migration),
//          and AuthGate's 4 s ceiling raced that request and won against every
//          cold server — the sign-in screen appearing while the refresh was
//          still in flight, which is the bug this release began by fixing.
//          `hasStoredSession()` lets the GATE drive that recovery, where the
//          wait can actually be bounded.
// v2.0.0 — `restore()` no longer touches the network: it answers from the
//          enclave, so a cold start takes the same time with the server up,
//          asleep or absent. Whether the session is still real is settled
//          afterwards by `revalidate()`, and only a rejection ends it.
// v1.1.0 — Uploads the portrait the sign-up wizard collected, once the account
//          exists (it needs a patient id, which only the reply carries). Never
//          able to fail a registration — see uploadPortrait.
// v1.0.0 — Sign-in/registration against CYPHIX_SERVER: one account across web,
//          iOS and Android, with the not-yet-server-backed steps kept honest.
// v2.5.0 — Account recovery against server v0.11.0: forgot / reset / verify-email /
//          request-verification. `post` can carry the bearer (refresh once, retry
//          once), maps 429 → rate-limited and `invalid_token` → invalid-link.
// v2.9.0 — CAPTCHA (server v0.15.0): captchaPolicy() reads GET /auth/captcha; register
//          carries `captchaToken`; captcha_required → 'captcha-required',
//          captcha_failed / captcha_unavailable → 'captcha-failed'.
// v2.7.0 — Consent (server v0.13.0): register carries `consents`; listConsents /
//          recordConsent (ConsentContract).
// v2.6.0 — Account self-service against server v0.12.0: change password, change
//          e-mail (+ confirm), list / revoke sessions. `post` is a thin name over
//          `request` (GET / DELETE too); `wrong_password` → wrong-password ahead of
//          the "password" message heuristic.
// v2.8.0 — Export + scheduled deletion against server v0.14.0 (AuthLifecycleContract):
//          one decrypted JSON document; request / status / cancel of a 14-day erasure.
