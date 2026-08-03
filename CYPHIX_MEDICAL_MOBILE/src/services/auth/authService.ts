/* ==================================================================
   Auth service — THE ABSTRACTION FIREWALL FOR SIGN-IN, and the mobile
   twin of the web's `services/auth/authService.ts`. Same contract
   (`AuthServiceContract`, now in @cyphix/shared), same method names,
   same failure codes — only the storage is native.

   The whole onboarding UI talks to the object exported at the bottom and
   to NOTHING else. Today that is `MockAuthService`, which keeps accounts
   on the device so the app is fully usable with no backend. When
   CYPHIX_SERVER is reachable, an `HttpAuthService` implementing the same
   contract (POST AUTH_ROUTES.login / .register …) is swapped in HERE and
   not a line of the slice, the hook or any step changes.

   ── Where each thing is stored, and why ──
   • The session TOKEN goes to the OS secure enclave (Keychain / Android
     Keystore) through `tokenStore`. Root CLAUDE.md §3.4: never
     AsyncStorage for tokens.
   • Accounts (email, display name, password DIGEST, health profile) go
     to AsyncStorage. SecureStore is a key-value store with a ~2 KB
     practical value limit on Android, which a profile plus a photo URI
     will exceed; splitting a record across the enclave to satisfy an API
     limit would buy less than it costs. This is the MOCK backend — on a
     real deployment none of it exists on the device at all, and that is
     the honest reason it is acceptable here.
   • Passwords are never stored, logged, or put in a thunk's payload —
     only a SHA-256 digest, and only until a server does it properly.
   ================================================================== */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import {
  AuthError,
  MIN_PASSWORD_LENGTH,
  type AuthServiceContract,
  type AuthSession,
  type Credentials,
  type RegistrationInput,
  type RegistrationProfile,
  type SessionUser,
} from '@cyphix/shared';
import { setAccessToken } from '@/services/api/tokenStore';

const ACCOUNTS_KEY = 'cyphix:auth:accounts';
const SESSION_KEY = 'cyphix:auth:session';
/** Survives sign-out on purpose — it is what biometric unlock unlocks. */
const REMEMBERED_KEY = 'cyphix:auth:remembered';

/** A stored account. `passwordHash` is a digest, never the password. */
interface StoredAccount {
  id: string;
  email: string; // normalized (lower-cased, trimmed)
  passwordHash: string;
  displayName: string;
  role: SessionUser['role'];
  profile: RegistrationProfile;
}

/** Which account is signed in. The token itself lives in the enclave. */
interface StoredSessionPointer {
  userId: string;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function hashPassword(password: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, password);
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function readJson<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    /* A corrupt record is treated as absent: the patient can sign in
       again, which is recoverable — throwing here is not. */
    return null;
  }
}

async function writeJson(key: string, value: unknown): Promise<void> {
  if (value === null) await AsyncStorage.removeItem(key);
  else await AsyncStorage.setItem(key, JSON.stringify(value));
}

function newToken(): string {
  return `mock-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Project a stored account down to the minimal principal the app holds
    (data minimization — the password digest and the profile do not
    travel with the user object). */
function toUser(account: StoredAccount): SessionUser {
  return { id: account.id, displayName: account.displayName, role: account.role };
}

function toSession(account: StoredAccount, token: string): AuthSession {
  return { user: toUser(account), token, profile: account.profile };
}

class MockAuthService implements AuthServiceContract {
  /** A little latency so the UI's loading state is real, not decorative
      (web CLAUDE.md §4.3 — async is always modeled). */
  private async settle(): Promise<void> {
    await delay(280);
  }

  private async accounts(): Promise<StoredAccount[]> {
    return (await readJson<StoredAccount[]>(ACCOUNTS_KEY)) ?? [];
  }

  async restore(): Promise<AuthSession | null> {
    const pointer = await readJson<StoredSessionPointer>(SESSION_KEY);
    if (!pointer) return null;
    const account = (await this.accounts()).find((a) => a.id === pointer.userId);
    if (!account) {
      await writeJson(SESSION_KEY, null); // stale pointer — clear it
      return null;
    }
    const token = newToken();
    setAccessToken(token);
    return toSession(account, token);
  }

  async login({ email, password }: Credentials): Promise<AuthSession> {
    await this.settle();
    const account = (await this.accounts()).find((a) => a.email === normalizeEmail(email));
    /* One code for "no such account" and "wrong password" on purpose:
       telling them apart is an account-enumeration oracle. */
    if (!account) throw new AuthError('invalid-credentials');
    if ((await hashPassword(password)) !== account.passwordHash) {
      throw new AuthError('invalid-credentials');
    }
    const token = newToken();
    setAccessToken(token);
    await writeJson(SESSION_KEY, { userId: account.id } satisfies StoredSessionPointer);
    await writeJson(REMEMBERED_KEY, { userId: account.id } satisfies StoredSessionPointer);
    return toSession(account, token);
  }

  async register(input: RegistrationInput): Promise<AuthSession> {
    await this.settle();
    if (!input.password || input.password.length < MIN_PASSWORD_LENGTH) {
      throw new AuthError('weak-password');
    }
    const email = normalizeEmail(input.email);
    const accounts = await this.accounts();
    if (accounts.some((a) => a.email === email)) throw new AuthError('email-taken');

    const { fullName, email: _email, password, ...profile } = input;
    const account: StoredAccount = {
      id: `user-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      email,
      passwordHash: await hashPassword(password),
      displayName: fullName.trim(),
      // A self-registering person is the patient of their own record.
      role: 'patient',
      profile,
    };
    accounts.push(account);
    await writeJson(ACCOUNTS_KEY, accounts);

    const token = newToken();
    setAccessToken(token);
    await writeJson(SESSION_KEY, { userId: account.id } satisfies StoredSessionPointer);
    await writeJson(REMEMBERED_KEY, { userId: account.id } satisfies StoredSessionPointer);
    return toSession(account, token);
  }

  async logout(): Promise<void> {
    setAccessToken(null);
    await writeJson(SESSION_KEY, null);
    /* The remembered pointer is deliberately KEPT: signing out is not
       forgetting the device, and biometric unlock is the reason the next
       sign-in can be one touch. Uninstalling clears it. */
  }

  /** The account this device last signed in as, if any. Name only — it
      is shown above the biometric button so the patient knows WHOSE
      record is about to open. */
  async rememberedAccount(): Promise<{ id: string; displayName: string } | null> {
    const pointer = await readJson<StoredSessionPointer>(REMEMBERED_KEY);
    if (!pointer) return null;
    const account = (await this.accounts()).find((a) => a.id === pointer.userId);
    return account ? { id: account.id, displayName: account.displayName } : null;
  }

  /**
   * Sign in as the remembered account WITHOUT a password.
   *
   * ⚠️ The biometric check is the caller's job (`services/auth/biometrics`)
   * and is what authorises this. On a real backend this method releases a
   * refresh token from the enclave instead of minting one locally; the
   * shape of the call — prove you are the phone's owner, then get a
   * session — is the same, which is why it lives behind the same object.
   */
  async signInRemembered(): Promise<AuthSession | null> {
    const pointer = await readJson<StoredSessionPointer>(REMEMBERED_KEY);
    if (!pointer) return null;
    const account = (await this.accounts()).find((a) => a.id === pointer.userId);
    if (!account) return null;
    const token = newToken();
    setAccessToken(token);
    await writeJson(SESSION_KEY, { userId: account.id } satisfies StoredSessionPointer);
    return toSession(account, token);
  }

  /** Does an account already exist for this email? The sign-in step uses
      it for nothing; the SIGN-UP step uses it to fail early instead of
      after five more screens of typing. */
  async emailExists(email: string): Promise<boolean> {
    const normalized = normalizeEmail(email);
    return (await this.accounts()).some((a) => a.email === normalized);
  }

  /** Password reset. There is no mail server, so this resolves without
      claiming anything the app cannot do — the UI says "if that address
      is on an account, a link is on its way", which is both what a real
      server should answer (no enumeration) and true here. */
  async requestPasswordReset(_email: string): Promise<void> {
    await this.settle();
  }

  /** Phone verification, mocked. The code is FIXED and shown in the UI
      because there is no SMS gateway: a hidden random code would make the
      step impossible to complete, and a real-looking one that always
      works would be worse — a patient could believe a text was sent. */
  async requestPhoneCode(_phone: string): Promise<{ devCode: string }> {
    await this.settle();
    return { devCode: MOCK_SMS_CODE };
  }

  async verifyPhoneCode(_phone: string, code: string): Promise<boolean> {
    await this.settle();
    return code === MOCK_SMS_CODE;
  }
}

/** The stand-in SMS code. Obviously synthetic, like every other mock in
    the app (web CLAUDE.md §7.4), and displayed on the screen that asks
    for it so nobody waits for a text that is not coming. */
export const MOCK_SMS_CODE = '000000';

/** The single auth service the app talks to. Swap this line — not the
    UI — when CYPHIX_SERVER's /auth routes go live. */
export const authService = new MockAuthService();

// v1.0.0 — Device-local mock auth (SHA-256 digests, enclave token, AsyncStorage
//          accounts) behind the shared AuthServiceContract.
