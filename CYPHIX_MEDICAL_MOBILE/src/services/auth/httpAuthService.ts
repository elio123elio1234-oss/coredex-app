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
  type AuthErrorCode,
  type AuthSession,
  type AuthTokens,
  type Credentials,
  type RegistrationInput,
  type SessionUser,
} from '@cyphix/shared';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  apiRoot,
  clearSession,
  getAccessToken,
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
  /** Boot restore. The rotating refresh token in the enclave IS the
      persisted session — there is nothing else to check. */
  async restore(): Promise<AuthSession | null> {
    const user = await refreshSession();
    if (!user) return null;
    await remember(user);
    /* `profile` is empty on purpose: the server owns the medical card and
       serves it from GET /patients/:id/card, which is a separate screen's
       query, not something to smuggle through the session. Registration
       still returns what the wizard just typed (below), so the review and
       success screens are unaffected. */
    return { user, token: getAccessToken() ?? '', profile: {} };
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
       `photoUri` and `avatarTone` are DEVICE state (the image never
       leaves the phone in this stage — server-side portraits are
       PUT /patients/:id/photo, a separate feature), and "unknown" blood
       type is the patient declining to say, which must arrive as an
       absent field and not as the literal string "unknown" printed on an
       emergency card. */
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

// v1.0.0 — Sign-in/registration against CYPHIX_SERVER: one account across web,
//          iOS and Android, with the not-yet-server-backed steps kept honest.
