/* ==================================================================
   Auth service — THE ABSTRACTION FIREWALL FOR SIGN-IN, and the mobile
   twin of the web's `services/auth/authService.ts`. Same contract
   (`AuthServiceContract`, now in @cyphix/shared), same method names,
   same failure codes — only the storage is native.

   The whole onboarding UI talks to the object exported at the bottom and
   to NOTHING else.

   ★★★ THE SWAP HAPPENED (v0.20.0) ★★★
   With `EXPO_PUBLIC_API_BASE_URL` set, that object is `HttpAuthService`
   and this app signs in against CYPHIX_SERVER — the same accounts, the
   same Postgres, the same person as the web app. With it empty it is the
   `MockAuthService` below, which keeps accounts on the device so the app
   stays fully usable with no backend. Not a line of the slice, the hook
   or any onboarding step changed for either.

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
  AUTH_LINK_PATHS,
  AUTH_LINK_TOKEN_PARAM,
  DELETION_GRACE_DAYS,
  AuthError,
  LEGAL_DOCS,
  MIN_PASSWORD_LENGTH,
  type AccountExport,
  type AuthSession,
  type CaptchaPolicy,
  type ConsentInput,
  type ConsentRecord,
  type ConsentsResult,
  type Credentials,
  type DeletionRequestInput,
  type DeletionStatus,
  type EmailChangeConfirmInput,
  type EmailChangeConfirmResult,
  type EmailChangeInput,
  type EmailVerifyInput,
  type EmailVerifyRequestResult,
  type PasswordChangeInput,
  type PasswordChangeResult,
  type PasswordForgotInput,
  type PasswordResetInput,
  type RefreshOutcome,
  type RegistrationInput,
  type RegistrationProfile,
  type SessionUser,
  type SessionView,
} from '@cyphix/shared';
import { ENV } from '@/config/env';
import { setAccessToken } from '@/services/api/tokenStore';
import { MOCK_SMS_CODE, type MobileAuthService, type RememberedAccount } from './authContract';
import { HttpAuthService } from './httpAuthService';

/* Re-exported so the swap did not move an import that already worked. */
export { MOCK_SMS_CODE } from './authContract';

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
  /** Set by the mock verification link. Absent on older accounts = false. */
  emailVerified?: boolean;
  /** What this account accepted, newest last (server v0.13.0 shape). */
  consents?: ConsentRecord[];
  /** When the account was made — the export reports it. Absent on older accounts. */
  createdAt?: string;
  /** Set while a deletion is scheduled (server v0.14.0 shape); cleared on cancel. */
  deletionRequestedAt?: string;
  deletionExecuteAfter?: string;
}

/** The mock's "sent e-mails": one-time links, in memory for this app run.
    The link is printed to the console, which is the offline build's mailbox,
    as `cyphix://…` — paste it into the dev client's URL field to open it. */
interface MockLink {
  purpose: 'reset' | 'verify' | 'change-email';
  userId: string;
  expiresAt: number;
  /** For 'change-email': the address the link was "sent" to. */
  newEmail?: string;
}
const mockLinks = new Map<string, MockLink>();
const MOCK_LINK_TTL_MS = 30 * 60 * 1000;

/** The mock's "devices": one entry per sign-in on this phone, so the
    Devices & sessions list is real for what the mock can know. Nothing is
    invented — a second row appears only after a second sign-in. */
interface MockSession {
  id: string;
  userId: string;
  createdAt: string;
  lastSeenAt: string;
}
const MOCK_SESSIONS_KEY = 'cyphix:auth:mock-sessions';
const MOCK_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** Which account is signed in. The token itself lives in the enclave. */
interface StoredSessionPointer {
  userId: string;
  /** Which MockSession this sign-in is (absent before v2.3.0). */
  sessionId?: string;
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

/** Sign this phone in as `userId`: an access token, the session pointer,
    and a row in the mock's devices list (what a refresh-token family is
    on the real server). The remembered pointer is NOT touched here. */
async function openMockSession(userId: string): Promise<string> {
  const token = newToken();
  setAccessToken(token);
  const now = new Date().toISOString();
  const session: MockSession = {
    id: `sess-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    userId,
    createdAt: now,
    lastSeenAt: now,
  };
  const all = (await readJson<MockSession[]>(MOCK_SESSIONS_KEY)) ?? [];
  await writeJson(MOCK_SESSIONS_KEY, [...all, session]);
  await writeJson(SESSION_KEY, { userId, sessionId: session.id } satisfies StoredSessionPointer);
  return token;
}

/** Project a stored account down to the minimal principal the app holds
    (data minimization — the password digest and the profile do not
    travel with the user object). */
function toUser(account: StoredAccount): SessionUser {
  return {
    id: account.id,
    displayName: account.displayName,
    role: account.role,
    email: account.email,
    emailVerified: account.emailVerified ?? false,
  };
}

function toSession(account: StoredAccount, token: string): AuthSession {
  return { user: toUser(account), token, profile: account.profile };
}

class MockAuthService implements MobileAuthService {
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

  /**
   * There is no authority to ask, so nothing can be confirmed and nothing
   * can be refused — which is exactly what `offline` means. Reporting
   * `rejected` here would have the slice tear down a session no server
   * ever issued, on a build whose entire premise is that it works with no
   * backend at all.
   */
  async revalidate(): Promise<RefreshOutcome> {
    return { kind: 'offline' };
  }

  /** The device mock keeps its session pointer in AsyncStorage, and
      `restore()` above reads it directly — so this is only ever consulted
      to decide whether a splash is worth holding, and the honest answer
      is the same pointer. */
  async hasStoredSession(): Promise<boolean> {
    return (await readJson<StoredSessionPointer>(SESSION_KEY)) !== null;
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
    const token = await openMockSession(account.id);
    await writeJson(REMEMBERED_KEY, { userId: account.id } satisfies StoredSessionPointer);
    return toSession(account, token);
  }

  /** No server, no policy: the offline mock never asks for a challenge,
      which is what every mock build has always done. */
  async captchaPolicy(): Promise<CaptchaPolicy> {
    return { provider: 'off' };
  }

  async register(input: RegistrationInput): Promise<AuthSession> {
    await this.settle();
    if (!input.password || input.password.length < MIN_PASSWORD_LENGTH) {
      throw new AuthError('weak-password');
    }
    const email = normalizeEmail(input.email);
    const accounts = await this.accounts();
    if (accounts.some((a) => a.email === email)) throw new AuthError('email-taken');

    const { fullName, email: _email, password, consents, captchaToken: _captcha, ...profile } = input;
    const now = new Date().toISOString();
    const account: StoredAccount = {
      id: `user-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      email,
      passwordHash: await hashPassword(password),
      displayName: fullName.trim(),
      // A self-registering person is the patient of their own record.
      role: 'patient',
      profile,
      consents: (consents ?? []).map((c) => ({ ...c, acceptedAt: now })),
      createdAt: now,
    };
    accounts.push(account);
    await writeJson(ACCOUNTS_KEY, accounts);

    const token = await openMockSession(account.id);
    await writeJson(REMEMBERED_KEY, { userId: account.id } satisfies StoredSessionPointer);
    return toSession(account, token);
  }

  async logout(): Promise<void> {
    setAccessToken(null);
    const pointer = await readJson<StoredSessionPointer>(SESSION_KEY);
    if (pointer?.sessionId) {
      const all = (await readJson<MockSession[]>(MOCK_SESSIONS_KEY)) ?? [];
      await writeJson(MOCK_SESSIONS_KEY, all.filter((s) => s.id !== pointer.sessionId));
    }
    await writeJson(SESSION_KEY, null);
    /* The remembered pointer is deliberately KEPT: signing out is not
       forgetting the device, and biometric unlock is the reason the next
       sign-in can be one touch. Uninstalling clears it. */
  }

  /** The account this device last signed in as, if any. Name only — it
      is shown above the biometric button so the patient knows WHOSE
      record is about to open. */
  async rememberedAccount(): Promise<RememberedAccount | null> {
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
    const token = await openMockSession(account.id);
    return toSession(account, token);
  }

  /** Does an account already exist for this email? The sign-in step uses
      it for nothing; the SIGN-UP step uses it to fail early instead of
      after five more screens of typing. */
  async emailExists(email: string): Promise<boolean> {
    const normalized = normalizeEmail(email);
    return (await this.accounts()).some((a) => a.email === normalized);
  }

  /* ── Account recovery, mocked HONESTLY: the "e-mail" is a console line ──
     Same rules as the server (CYPHIX_SERVER v0.11.0): single-use, 30 min,
     the forgot request says the same thing for every address, a reset
     signs the device in and proves the address. */

  private issueLink(
    purpose: MockLink['purpose'],
    userId: string,
    path: string,
    newEmail?: string,
  ): void {
    const token = newToken();
    mockLinks.set(token, { purpose, userId, expiresAt: Date.now() + MOCK_LINK_TTL_MS, newEmail });
    if (__DEV__) {
      console.log(
        `[auth] mock ${purpose} link (no mail server in the offline build)${newEmail ? ` to ${newEmail}` : ''}: cyphix://${path.slice(1)}?${AUTH_LINK_TOKEN_PARAM}=${token}`,
      );
    }
  }

  /** Spends the link if it is of this purpose and unexpired; null otherwise. */
  private spendLink(purpose: MockLink['purpose'], token: string): MockLink | null {
    const link = mockLinks.get(token);
    if (!link) return null;
    mockLinks.delete(token);
    if (link.purpose !== purpose || link.expiresAt < Date.now()) return null;
    return link;
  }

  /** The signed-in account and its pointer, or null. */
  private async current(): Promise<{ account: StoredAccount; pointer: StoredSessionPointer } | null> {
    const pointer = await readJson<StoredSessionPointer>(SESSION_KEY);
    if (!pointer) return null;
    const account = (await this.accounts()).find((a) => a.id === pointer.userId);
    return account ? { account, pointer } : null;
  }

  async requestPasswordReset({ email }: PasswordForgotInput): Promise<void> {
    await this.settle();
    const account = (await this.accounts()).find((a) => a.email === normalizeEmail(email));
    if (account) this.issueLink('reset', account.id, AUTH_LINK_PATHS.resetPassword);
    /* No account: nothing happens, and nothing is said. */
  }

  async resetPassword({ token, password }: PasswordResetInput): Promise<AuthSession> {
    await this.settle();
    if (!password || password.length < MIN_PASSWORD_LENGTH) throw new AuthError('weak-password');
    const link = this.spendLink('reset', token);
    if (!link) throw new AuthError('invalid-link');
    const accounts = await this.accounts();
    const account = accounts.find((a) => a.id === link.userId);
    if (!account) throw new AuthError('invalid-link');
    account.passwordHash = await hashPassword(password);
    account.emailVerified = true; // proving the mailbox proves the address
    await writeJson(ACCOUNTS_KEY, accounts);
    /* Every other device goes, as on the server. */
    const all = (await readJson<MockSession[]>(MOCK_SESSIONS_KEY)) ?? [];
    await writeJson(MOCK_SESSIONS_KEY, all.filter((s) => s.userId !== account.id));
    const sessionToken = await openMockSession(account.id);
    await writeJson(REMEMBERED_KEY, { userId: account.id } satisfies StoredSessionPointer);
    return toSession(account, sessionToken);
  }

  async verifyEmail({ token }: EmailVerifyInput): Promise<void> {
    await this.settle();
    const link = this.spendLink('verify', token);
    if (!link) throw new AuthError('invalid-link');
    const accounts = await this.accounts();
    const account = accounts.find((a) => a.id === link.userId);
    if (!account) throw new AuthError('invalid-link');
    account.emailVerified = true;
    await writeJson(ACCOUNTS_KEY, accounts);
  }

  async requestEmailVerification(): Promise<EmailVerifyRequestResult> {
    await this.settle();
    const pointer = await readJson<StoredSessionPointer>(SESSION_KEY);
    const account = pointer ? (await this.accounts()).find((a) => a.id === pointer.userId) : undefined;
    if (!account) throw new AuthError('unknown');
    if (account.emailVerified) return { status: 'already_verified' };
    this.issueLink('verify', account.id, AUTH_LINK_PATHS.verifyEmail);
    return { status: 'sent' };
  }

  /* ── Account self-service, mocked to the server's rules (v0.12.0) ──
     The current password is proven first; a password change ends every
     other device; an e-mail change is a link to the NEW address and
     nothing moves until it is spent. */

  async changePassword({ currentPassword, newPassword }: PasswordChangeInput): Promise<PasswordChangeResult> {
    await this.settle();
    const cur = await this.current();
    if (!cur) throw new AuthError('unknown');
    if ((await hashPassword(currentPassword)) !== cur.account.passwordHash) {
      throw new AuthError('wrong-password');
    }
    if (!newPassword || newPassword.length < MIN_PASSWORD_LENGTH) throw new AuthError('weak-password');
    const accounts = await this.accounts();
    const account = accounts.find((a) => a.id === cur.account.id);
    if (!account) throw new AuthError('unknown');
    account.passwordHash = await hashPassword(newPassword);
    await writeJson(ACCOUNTS_KEY, accounts);
    const revokedSessions = await this.revokeOtherSessions();
    /* A pending e-mail change dies with the old password. */
    for (const [k, l] of mockLinks) {
      if (l.purpose === 'change-email' && l.userId === account.id) mockLinks.delete(k);
    }
    return { changed: true, revokedSessions };
  }

  async requestEmailChange({ newEmail, password }: EmailChangeInput): Promise<void> {
    await this.settle();
    const cur = await this.current();
    if (!cur) throw new AuthError('unknown');
    if ((await hashPassword(password)) !== cur.account.passwordHash) {
      throw new AuthError('wrong-password');
    }
    const email = normalizeEmail(newEmail);
    if (email === cur.account.email) throw new AuthError('unknown', 'same address');
    if ((await this.accounts()).some((a) => a.email === email && a.id !== cur.account.id)) {
      throw new AuthError('email-taken');
    }
    this.issueLink('change-email', cur.account.id, AUTH_LINK_PATHS.changeEmail, email);
  }

  async confirmEmailChange({ token }: EmailChangeConfirmInput): Promise<EmailChangeConfirmResult> {
    await this.settle();
    const link = this.spendLink('change-email', token);
    if (!link?.newEmail) throw new AuthError('invalid-link');
    const accounts = await this.accounts();
    const account = accounts.find((a) => a.id === link.userId);
    if (!account) throw new AuthError('invalid-link');
    if (accounts.some((a) => a.email === link.newEmail && a.id !== account.id)) {
      throw new AuthError('email-taken');
    }
    account.email = link.newEmail;
    account.emailVerified = true;
    await writeJson(ACCOUNTS_KEY, accounts);
    return { changed: true, email: account.email };
  }

  async listSessions(): Promise<SessionView[]> {
    await this.settle();
    const pointer = await readJson<StoredSessionPointer>(SESSION_KEY);
    if (!pointer) return [];
    const all = (await readJson<MockSession[]>(MOCK_SESSIONS_KEY)) ?? [];
    const me = all.find((s) => s.id === pointer.sessionId);
    if (me) {
      /* Listing IS using this device: "last seen" moves, as a rotation
         would move it on the server. */
      me.lastSeenAt = new Date().toISOString();
      await writeJson(MOCK_SESSIONS_KEY, all);
    }
    return all
      .filter((s) => s.userId === pointer.userId)
      .map((s) => ({
        id: s.id,
        createdAt: s.createdAt,
        lastSeenAt: s.lastSeenAt,
        expiresAt: new Date(new Date(s.lastSeenAt).getTime() + MOCK_SESSION_TTL_MS).toISOString(),
        ip: null,
        /* The mock has no request to read a user-agent off; the real
           server reads the one React Native sends. */
        userAgent: null,
        current: s.id === pointer.sessionId,
      }))
      .sort((a, b) => (a.lastSeenAt < b.lastSeenAt ? 1 : -1));
  }

  async revokeSession(id: string): Promise<void> {
    await this.settle();
    const pointer = await readJson<StoredSessionPointer>(SESSION_KEY);
    if (!pointer) return;
    const all = (await readJson<MockSession[]>(MOCK_SESSIONS_KEY)) ?? [];
    await writeJson(MOCK_SESSIONS_KEY, all.filter((s) => !(s.id === id && s.userId === pointer.userId)));
    if (pointer.sessionId === id) {
      setAccessToken(null);
      await writeJson(SESSION_KEY, null);
    }
  }

  async revokeOtherSessions(): Promise<number> {
    const pointer = await readJson<StoredSessionPointer>(SESSION_KEY);
    if (!pointer) return 0;
    const all = (await readJson<MockSession[]>(MOCK_SESSIONS_KEY)) ?? [];
    const others = all.filter((s) => s.userId === pointer.userId && s.id !== pointer.sessionId);
    await writeJson(MOCK_SESSIONS_KEY, all.filter((s) => !others.includes(s)));
    return others.length;
  }

  /* ── Consent (server v0.13.0 shape): latest per document + what is current ── */

  async listConsents(): Promise<ConsentsResult> {
    await this.settle();
    const cur = await this.current();
    const latest = new Map<string, ConsentRecord>();
    for (const c of cur?.account.consents ?? []) latest.set(c.doc, c);
    return {
      consents: [...latest.values()],
      current: { terms: LEGAL_DOCS.terms.version, privacy: LEGAL_DOCS.privacy.version },
    };
  }

  async recordConsent(input: ConsentInput): Promise<ConsentRecord> {
    await this.settle();
    const cur = await this.current();
    if (!cur) throw new AuthError('unknown');
    if (input.version !== LEGAL_DOCS[input.doc].version) {
      throw new AuthError('unknown', 'stale version');
    }
    const record: ConsentRecord = { ...input, acceptedAt: new Date().toISOString() };
    const accounts = await this.accounts();
    const account = accounts.find((a) => a.id === cur.account.id);
    if (!account) throw new AuthError('unknown');
    account.consents = [...(account.consents ?? []), record];
    await writeJson(ACCOUNTS_KEY, accounts);
    return record;
  }

  /* ── Export + scheduled deletion (server v0.14.0 shape) ── */

  private deletionOf(account: StoredAccount): DeletionStatus {
    return {
      scheduled: !!account.deletionExecuteAfter,
      requestedAt: account.deletionRequestedAt ?? null,
      executeAfter: account.deletionExecuteAfter ?? null,
    };
  }

  /** The offline build holds no server-side recordings, threads or care
      links — the export says so with empty lists, not invented ones. */
  async exportData(): Promise<AccountExport> {
    await this.settle();
    const cur = await this.current();
    if (!cur) throw new AuthError('unknown');
    const { account } = cur;
    return {
      format: 'cyphix-export/1',
      exportedAt: new Date().toISOString(),
      account: {
        id: account.id,
        email: account.email,
        displayName: account.displayName,
        role: account.role,
        createdAt: account.createdAt ?? new Date(0).toISOString(),
        emailVerified: account.emailVerified ?? false,
      },
      patient: null,
      recordings: [],
      messages: [],
      careRelationships: [],
      consents: account.consents ?? [],
    };
  }

  async deletionStatus(): Promise<DeletionStatus> {
    await this.settle();
    const cur = await this.current();
    if (!cur) throw new AuthError('unknown');
    return this.deletionOf(cur.account);
  }

  async requestDeletion({ password }: DeletionRequestInput): Promise<DeletionStatus> {
    await this.settle();
    const cur = await this.current();
    if (!cur) throw new AuthError('unknown');
    if ((await hashPassword(password)) !== cur.account.passwordHash) {
      throw new AuthError('wrong-password');
    }
    const accounts = await this.accounts();
    const account = accounts.find((a) => a.id === cur.account.id);
    if (!account) throw new AuthError('unknown');
    const now = new Date();
    account.deletionRequestedAt = now.toISOString();
    account.deletionExecuteAfter = new Date(
      now.getTime() + DELETION_GRACE_DAYS * 86_400_000,
    ).toISOString();
    await writeJson(ACCOUNTS_KEY, accounts);
    return this.deletionOf(account);
  }

  async cancelDeletion(): Promise<DeletionStatus> {
    await this.settle();
    const cur = await this.current();
    if (!cur) throw new AuthError('unknown');
    const accounts = await this.accounts();
    const account = accounts.find((a) => a.id === cur.account.id);
    if (!account) throw new AuthError('unknown');
    delete account.deletionRequestedAt;
    delete account.deletionExecuteAfter;
    await writeJson(ACCOUNTS_KEY, accounts);
    return this.deletionOf(account);
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

/**
 * The single auth service the app talks to.
 *
 * THE SWAP, and it is one line by design: a configured API base URL means
 * the accounts are the SERVER's — the same rows the web app signs into —
 * and everything above this file (slice, hook, every onboarding step)
 * cannot tell the difference. An empty URL keeps the offline device mock,
 * so the app still demos on a plane.
 *
 * Both sides are typed as `MobileAuthService`, so a method one of them
 * forgets is a compile error rather than a screen that does nothing.
 */
export const authService: MobileAuthService = ENV.hasBackend
  ? new HttpAuthService()
  : new MockAuthService();

// v2.4.0 — The mock implements ConsentContract: register stores what the review
//          screen confirmed; listConsents / recordConsent to the server's shape,
//          a stale version refused (server v0.13.0).
// v2.3.0 — The mock implements AuthAccountContract to the server's rules: proves the
//          current password, a password change ends every other device, an e-mail
//          change is a cyphix:// link to the NEW address (console) that moves the
//          account only when spent, and a devices list with one real row per
//          sign-in on this phone (nothing invented). Every sign-in opens a MockSession.
// v2.2.0 — The mock implements AuthRecoveryContract honestly: one-time 30-minute
//          links printed to the console as cyphix:// URLs, a reset that signs in,
//          accounts that remember whether the address was verified; the principal
//          carries email + emailVerified.
// v2.1.0 — The mock answers `revalidate()` with `offline`: with no server there
//          is nothing to confirm and nothing to refuse, and reporting a refusal
//          would sign a patient out of a build that has no backend by design.
// v2.0.0 — Live swap point: HttpAuthService (CYPHIX_SERVER accounts, shared with
//          the web app) when EXPO_PUBLIC_API_BASE_URL is set; device mock when not.
// v2.5.0 — The mock implements AuthLifecycleContract: export (account + consents; the
//          offline build has no server-side recordings) and a 14-day scheduled
//          deletion with cancel, password-proven — server v0.14.0 shape.
// v2.6.0 — The mock implements CaptchaContract: always `off` (no server, no policy);
//          register drops `captchaToken` before storing the profile (server v0.15.0).
