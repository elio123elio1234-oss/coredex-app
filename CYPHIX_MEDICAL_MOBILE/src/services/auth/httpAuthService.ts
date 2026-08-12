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
   The server has no mail sender and no SMS gateway (see
   AUTH_ROUTES_PLANNED in @cyphix/shared). The onboarding flow has a
   forgot-password screen and a phone-verification step, so those two
   methods answer HONESTLY out of the device — a fixed, displayed code and
   a reset that promises nothing — instead of calling routes that would
   404 and reading as "the server is broken". Each one is a row in
   PARITY.md, not a silent gap.

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
  PATIENT_ROUTES,
  type AuthErrorCode,
  type AuthSession,
  type AuthTokens,
  type Credentials,
  type RefreshOutcome,
  type RegistrationInput,
  type SessionUser,
} from '@cyphix/shared';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { toPortraitDataUrl } from '@/services/media/photoPicker';
import {
  apiRoot,
  clearSession,
  getAccessToken,
  readPrincipal,
  readRefreshToken,
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

/** POST json → json. Empty bodies (204) resolve to undefined. */
async function post<T>(path: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${apiRoot()}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    /* A phone is offline far more often than a laptop, and "no signal" is
       not "wrong password" — the UI says so because the code says so. */
    throw new AuthError('network');
  }

  if (!res.ok) {
    let message: string | undefined;
    try {
      message = ((await res.json()) as ServerErrorBody).error?.message;
    } catch {
      /* non-JSON error body (a proxy's 502 page, say) */
    }
    let code: AuthErrorCode = 'unknown';
    if (res.status === 401) code = 'invalid-credentials';
    else if (res.status === 409) code = 'email-taken';
    else if (res.status === 400 && message?.toLowerCase().includes('password')) {
      code = 'weak-password';
    }
    throw new AuthError(code, message);
  }

  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

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
     * ★ THE MIGRATION PATH — and the bug that made v0.40.0 still land on
     * the sign-in screen "sometimes".
     *
     * Before v0.40.0 the enclave held a refresh token and NOTHING ELSE:
     * the principal was whatever the server had just said, and was never
     * written down. So every phone that was already signed in when the
     * update arrived had a perfectly valid token, no principal, and
     * therefore `readPrincipal()` → null → the door. It looked
     * intermittent because it happened exactly once per install, and
     * signing in again repaired it — which is the worst kind of bug
     * report to receive, because the fix erases the evidence.
     *
     * If a token is there, we simply do not yet know WHO it belongs to.
     * One refresh answers that and writes the principal, after which
     * every later launch takes the fast path above. Deliberately the only
     * place `restore` is allowed to await the network, and it is
     * self-erasing: it can happen at most once per device.
     */
    const refreshToken = await readRefreshToken();
    if (!refreshToken) return null;

    const outcome = await refreshSession();
    if (outcome.kind !== 'refreshed') return null;
    await remember(outcome.user);
    return { user: outcome.user, token: getAccessToken() ?? '', profile: {} };
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
   */
  async revalidate(): Promise<RefreshOutcome> {
    const outcome = await refreshSession();
    if (outcome.kind === 'refreshed') await remember(outcome.user);
    return outcome;
  }

  async login(credentials: Credentials): Promise<AuthSession> {
    const tokens = await post<AuthTokens>(AUTH_ROUTES.login, {
      email: credentials.email.trim().toLowerCase(),
      password: credentials.password,
    });
    await storeSession(tokens);
    await remember(tokens.user);
    return { user: tokens.user, token: tokens.accessToken, profile: {} };
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

  /** No mail sender server-side yet. The screen's wording ("if that
      address is on an account, a link is on its way") is already the
      non-enumerating phrasing a real reset uses, so it stays true — it
      just is not doing anything yet. Tracked in PARITY.md. */
  async requestPasswordReset(_email: string): Promise<void> {
    /* intentionally does nothing — see above */
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

// v2.0.0 — `restore()` no longer touches the network: it answers from the
//          enclave, so a cold start takes the same time with the server up,
//          asleep or absent. Whether the session is still real is settled
//          afterwards by `revalidate()`, and only a rejection ends it.
// v1.1.0 — Uploads the portrait the sign-up wizard collected, once the account
//          exists (it needs a patient id, which only the reply carries). Never
//          able to fail a registration — see uploadPortrait.
// v1.0.0 — Sign-in/registration against CYPHIX_SERVER: one account across web,
//          iOS and Android, with the not-yet-server-backed steps kept honest.
