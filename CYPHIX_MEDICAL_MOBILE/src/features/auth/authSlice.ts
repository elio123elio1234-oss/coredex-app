/* ==================================================================
   Auth slice — the signed-in account + the sign-in lifecycle. A 1:1
   mirror of the web's `features/auth/authSlice.ts`: same statuses, same
   thunk names, same error codes, so the two apps fail identically.

   It holds the resolved principal and the registration profile that came
   back with it, and NOTHING about the onboarding wizard — which step is
   on screen and what has been typed into it is the wizard's own business
   (`onboardingModel.ts`), thrown away when it finishes. Half-typed
   credentials do not belong in a global store.

   ⚠️ A password never enters an action payload. `registerUser` takes one
   as an ARGUMENT (it must), and RTK puts thunk args in the pending
   action — so the thunk arg type is deliberately the last place it
   appears, and nothing reads it back out of the store.
   ================================================================== */

import { createAsyncThunk, createSlice, isAnyOf, type PayloadAction } from '@reduxjs/toolkit';
import {
  AuthError,
  type AuthErrorCode,
  type Credentials,
  type RegistrationInput,
  type RegistrationProfile,
  type SessionMode,
  type SessionUser,
} from '@cyphix/shared';
import { authService } from '@/services/auth/authService';
import { readAppLock, setAppLock } from '@/services/api/tokenStore';
import {
  serverReachable,
  serverUnreachable,
  sessionConfirmed,
  sessionExpired,
} from '@/services/auth/authEvents';
import { logAudit } from '@/services/audit/auditLogger';
import type { Role } from '@/types/rbac';

/** idle = signed out (show onboarding); restoring = checking the device
    for a stored session on boot. */
export type AuthStatus = 'restoring' | 'idle' | 'loading' | 'error';

export interface AuthState {
  user: SessionUser | null;
  /** What registration recorded. Empty for an account that skipped it all. */
  profile: RegistrationProfile;
  status: AuthStatus;
  error: AuthErrorCode | null;
  /**
   * DEBUG ONLY — draw the app as if the signed-in account held this role.
   * `null` (default) means the real principal is used untouched.
   *
   * ★ This grants NOTHING. The server authorises every request against the
   * session's real role, so previewing `admin` on a patient account draws the
   * admin buttons and each one comes back 403. That is exactly what it is for:
   * seeing which UI a role gets, on a device, without maintaining four test
   * accounts. It is a rendering switch, never an authorisation one — do not
   * let it reach `tokenStore`, a request header, or any audit entry.
   */
  debugRole: Role | null;
  /**
   * The account was created THIS session and the patient has not dismissed
   * the "Profile created" screen yet.
   *
   * ★ Without this the success screen could never be seen. The gate swaps
   * the onboarding flow for the app the instant a user exists — which,
   * for a registration, is the instant the account is written. The flag
   * holds the door for exactly as long as the last screen of the flow is
   * still being read, and `welcomeAcknowledged` is the patient letting go
   * of it.
   */
  justRegistered: boolean;
  /**
   * Whether a server has confirmed this session during THIS app run.
   *
   * `offline` is the honest state after a cold start that could not reach
   * the server: the app is running on the principal in the enclave, which
   * is what it was last told, not what it has just been told. It is
   * surfaced in the UI (`ConnectionStrip`) because a patient reading their
   * record is entitled to know which of the two they are looking at.
   *
   * It is NOT a permission level. Nothing in the app branches on it to
   * decide what may be read or written — the server does that, on every
   * request, exactly as before.
   */
  sessionMode: SessionMode;
  /** A revalidation is in flight. Drives the "connecting…" strip. */
  revalidating: boolean;
  /**
   * The session was restored from the enclave and the patient has not
   * passed the app lock yet.
   *
   * ★ A gate on RENDERING, not on authorisation. The tokens are already
   * in the enclave whatever this says, and the server is the only thing
   * granting access to data; what the lock protects is the cached record
   * on a phone somebody else is holding. It is latched in the store so
   * every consumer sees one answer — a lock evaluated per screen is a
   * lock with a hole in it.
   */
  locked: boolean;
  /** Has the patient asked for an app lock? Read from the enclave on
      restore, so nothing has to re-read it on every foreground. */
  appLockEnabled: boolean;
}

const initialState: AuthState = {
  user: null,
  profile: {},
  // Boot in "restoring" so the gate shows the splash, never a flash of the
  // welcome screen, before we know whether an account exists on this device.
  status: 'restoring',
  error: null,
  justRegistered: false,
  debugRole: null,
  /* Nothing has been confirmed yet, and claiming `live` before a server
     has answered is the lie the strip exists to prevent. */
  sessionMode: 'offline',
  revalidating: false,
  locked: false,
  appLockEnabled: false,
};

function auditSignIn(user: SessionUser, detail: string): void {
  logAudit({
    actor: { id: user.id, role: user.role },
    action: 'auth:login',
    outcome: 'success',
    detail,
  });
}

/**
 * Boot: bring back the stored session if there is one.
 *
 * A disk read, and nothing else — see `HttpAuthService.restore`. It
 * resolves in milliseconds whether or not there is a network, which is
 * what makes the splash a fixed length instead of a hostage to the
 * server's wake-up time. Whether the session is still real is
 * `revalidateSession`'s question, asked afterwards.
 *
 * It also reports whether the app lock stands between the patient and the
 * record, because both answers come off the same enclave and asking twice
 * would let the app render for a frame between them.
 */
export const restoreSession = createAsyncThunk('auth/restore', async () => {
  const session = await authService.restore();
  const appLockEnabled = await readAppLock();
  return { session, appLockEnabled };
});

/**
 * Ask the server whether the restored session is still real.
 *
 * ★ THE POLICY LIVES HERE, and it is three lines long because the type
 * finally allows it to be:
 *
 *   refreshed → the session is confirmed; go `live`.
 *   rejected  → an authority refused us. Sign out, now. This is the ONLY
 *               thing that ends a session, and it is not weakened by any
 *               of the above: a revoked token is refused the moment the
 *               phone has signal, and the enclave is cleared with it.
 *   offline   → we learned nothing. Change nothing. Stay `offline`, keep
 *               the token, keep rendering the device's own copy, and ask
 *               again on the next foreground.
 *
 * Before this existed, `offline` and `rejected` were the same value and
 * the app took the harsher reading — which revoked nothing (the token
 * stays in the enclave either way) and cost the patient their session
 * every time a lift, a tunnel or a sleeping container got in the way.
 */
export const revalidateSession = createAsyncThunk('auth/revalidate', async () => {
  return authService.revalidate();
});

/** Turn the app lock on or off, and persist it to the enclave. */
export const setAppLockEnabled = createAsyncThunk('auth/setAppLock', async (enabled: boolean) => {
  await setAppLock(enabled);
  return enabled;
});

export const loginUser = createAsyncThunk<
  { user: SessionUser; profile: RegistrationProfile },
  Credentials,
  { rejectValue: AuthErrorCode }
>('auth/login', async (credentials, { rejectWithValue }) => {
  try {
    const session = await authService.login(credentials);
    auditSignIn(session.user, 'login');
    return { user: session.user, profile: session.profile };
  } catch (err) {
    return rejectWithValue(err instanceof AuthError ? err.code : 'unknown');
  }
});

export const registerUser = createAsyncThunk<
  { user: SessionUser; profile: RegistrationProfile },
  RegistrationInput,
  { rejectValue: AuthErrorCode }
>('auth/register', async (input, { rejectWithValue }) => {
  try {
    const session = await authService.register(input);
    auditSignIn(session.user, 'register');
    return { user: session.user, profile: session.profile };
  } catch (err) {
    return rejectWithValue(err instanceof AuthError ? err.code : 'unknown');
  }
});

export const logoutUser = createAsyncThunk('auth/logout', async (_arg, { getState }) => {
  const current = (getState() as { auth: AuthState }).auth.user;
  await authService.logout();
  if (current) {
    logAudit({
      actor: { id: current.id, role: current.role },
      action: 'auth:logout',
      outcome: 'success',
    });
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearAuthError(state) {
      state.error = null;
      if (state.status === 'error') state.status = 'idle';
    },
    /**
     * DEBUG: render the app as `role`, or `null` to go back to the real one.
     * Rendering only — the server still decides what is allowed.
     */
    debugRoleSet(state, action: PayloadAction<Role | null>) {
      state.debugRole = action.payload;
    },
    /** The patient has read "Profile created" and tapped through. */
    welcomeAcknowledged(state) {
      state.justRegistered = false;
    },
    /** The device unlock succeeded — let the app render. */
    appUnlocked(state) {
      state.locked = false;
    },
    /**
     * Put the lock back up.
     *
     * Dispatched when the app returns from a long enough spell in the
     * background — a lock that only ever ran at launch is one a handed-over
     * phone walks straight past. Gated on `appLockEnabled` HERE rather
     * than at the call site so no future caller can forget it and lock a
     * patient out of a feature they never switched on.
     */
    appRelocked(state) {
      if (state.user && state.appLockEnabled) state.locked = true;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(restoreSession.pending, (state) => {
        state.status = 'restoring';
      })
      .addCase(restoreSession.fulfilled, (state, action) => {
        const { session, appLockEnabled } = action.payload;
        state.user = session?.user ?? null;
        state.profile = session?.profile ?? {};
        state.status = 'idle';
        /* A restored session is one the patient has met before — there is
           nothing to celebrate and nothing holding the door. */
        state.justRegistered = false;
        /* Restored from the enclave, which is a record of what a server
           said LAST TIME. `revalidateSession` is what earns `live`. */
        state.sessionMode = 'offline';
        state.appLockEnabled = appLockEnabled;
        /**
         * ★ A COLD START IS NO LONGER LOCKED. Reported, and right.
         *
         * v0.40.0 gated every launch, which is what "require unlock"
         * literally means and is not what anyone wants from a health app.
         * The comparison offered was Dexcom, and it is the correct one:
         * a CGM showing live glucose does not ask for a face each time
         * you open it. Neither does MyChart by default. Nothing in HIPAA
         * or the MDR requires a per-launch biometric on a patient's own
         * phone, and the reason is that the OS lock screen already IS
         * that check — you unlocked the phone to reach the app at all, so
         * a second prompt re-asks a question the device just answered.
         *
         * What the OS canNOT cover is the gap this now guards instead:
         * an ALREADY-UNLOCKED phone, handed to someone, with the app
         * still resident. That is `appRelocked`, five minutes after the
         * app went to the background.
         *
         * The honest cost, written down rather than glossed: a cold start
         * on an unlocked phone somebody else is holding is not gated. If
         * that becomes the threat worth covering, this line is where it
         * goes back.
         */
        state.locked = false;
      })
      .addCase(restoreSession.rejected, (state) => {
        // A device we cannot read is a device with no session — show the door.
        state.user = null;
        state.status = 'idle';
        state.locked = false;
      })
      .addCase(revalidateSession.pending, (state) => {
        state.revalidating = true;
      })
      .addCase(revalidateSession.fulfilled, (state, action) => {
        state.revalidating = false;
        switch (action.payload.kind) {
          case 'refreshed':
            /* The server answered and re-issued. This is the only place
               `live` is ever set, and it is set on evidence. */
            state.sessionMode = 'live';
            state.user = action.payload.user;
            break;
          case 'rejected':
            /* An authority refused us: revoked, expired, or a replayed
               token whose family was killed. The session is over, and the
               enclave has already been cleared by the token store. */
            state.user = null;
            state.profile = {};
            state.sessionMode = 'offline';
            state.locked = false;
            state.debugRole = null;
            break;
          case 'offline':
            /* Nothing was learned, so nothing changes. Deliberately not
               an error state: nothing the patient did failed, and there
               is nothing for them to fix. */
            break;
        }
      })
      .addCase(revalidateSession.rejected, (state) => {
        /* The thunk itself threw — a bug, not an answer from a server. It
           is emphatically not grounds to end a session: an exception in
           our own code must never be able to sign a patient out. */
        state.revalidating = false;
      })
      .addCase(setAppLockEnabled.fulfilled, (state, action) => {
        state.appLockEnabled = action.payload;
        /* Turning the lock ON does not lock the app the patient is
           already holding — they just proved they have it, by changing
           the setting. It takes effect on the next launch or foreground. */
        if (!action.payload) state.locked = false;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.profile = {};
        state.status = 'idle';
        state.error = null;
        state.justRegistered = false;
        state.sessionMode = 'offline';
        /* Nothing to lock. Leaving this true would put the unlock screen
           in front of the sign-in screen, which has nothing behind it. */
        state.locked = false;
        /* A preview must not outlive the account it was previewed on: the
           next person to sign in would silently get someone else's chosen
           role drawn over their own. */
        state.debugRole = null;
      })
      /* The HTTP layer exhausted its refresh (token revoked, expired, or
         replay detected server-side). Same landing as a sign-out, and
         NOT an error state: nothing the patient did failed — the session
         simply ended, so the door is the honest place to be. */
      /* A refresh succeeded somewhere in the app — most often the first
         401 after a cold start, which is how an app that opened on a
         restored session normally finds the server again. Same landing as
         `revalidateSession.fulfilled` with `refreshed`, because it is the
         same evidence: a server answered and re-issued. */
      /* The transport reached the server, or failed to. This is the ONLY
         thing that moves `sessionMode` back to `offline` once it is live —
         and its absence is why "the internet came back and it stayed
         offline until I restarted" was real: the boot revalidation runs
         once per account and the sync engine refreshes on foreground, so
         under an app already open nothing was watching at all.
         ★ It touches reachability and NOTHING else. It is not evidence
         about the session's validity — a 404 proves the server is up and
         proves nothing about whether we are still signed in — so it may
         never clear the principal. Only `rejected` does that. */
      .addCase(serverReachable, (state) => {
        if (state.user) state.sessionMode = 'live';
      })
      .addCase(serverUnreachable, (state) => {
        state.sessionMode = 'offline';
      })
      .addCase(sessionConfirmed, (state, action) => {
        if (!state.user) return; // signed out mid-flight; nothing to confirm
        state.sessionMode = 'live';
        state.user = action.payload;
      })
      .addCase(sessionExpired, (state) => {
        state.user = null;
        state.profile = {};
        state.status = 'idle';
        state.error = null;
        state.justRegistered = false;
        state.sessionMode = 'offline';
        state.locked = false;
      })
      /* Sign-in and registration land the same way — except that
         registration also latches `justRegistered`, so they cannot share
         one matcher. RTK requires every addCase BEFORE any addMatcher. */
      .addCase(loginUser.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.profile = action.payload.profile;
        state.status = 'idle';
        state.error = null;
        /* A password was just checked BY the server, so this session is
           confirmed by definition — the strongest evidence there is. */
        state.sessionMode = 'live';
        state.locked = false;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.profile = action.payload.profile;
        state.status = 'idle';
        state.error = null;
        // Hold the gate on the flow until "Profile created" is dismissed.
        state.justRegistered = true;
        state.sessionMode = 'live';
        state.locked = false;
      })
      .addMatcher(isAnyOf(loginUser.pending, registerUser.pending), (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addMatcher(isAnyOf(loginUser.rejected, registerUser.rejected), (state, action) => {
        state.status = 'error';
        state.error = action.payload ?? 'unknown';
      });
  },
});

export const { appRelocked, appUnlocked, clearAuthError, debugRoleSet, welcomeAcknowledged } =
  authSlice.actions;
export default authSlice.reducer;

// v2.2.0 — The app lock no longer gates a COLD START — reported as asking for
//          Face ID on every entry, with Dexcom named as the counter-example, and
//          the objection is correct: you unlocked the phone to open the app, so a
//          launch prompt re-asks what the OS just answered. It now guards the gap
//          the OS cannot: an already-unlocked phone handed over with the app
//          resident (`appRelocked`, 5 min after backgrounding).
// v2.1.0 — Handles `serverReachable` / `serverUnreachable` from the transport, so
//          `sessionMode` moves in BOTH directions. Before this it only ever went
//          towards live, and only from the boot revalidation — so an app already
//          open when the network returned stayed "offline" until it was restarted.
//          Reachability may never clear the principal: a 404 proves the server is
//          up and proves nothing about the session.
// v2.0.0 — A restored session no longer depends on reaching the server.
//          `restoreSession` reads the enclave and resolves at once;
//          `revalidateSession` asks afterwards and is the only thing that can
//          end a session — and only on `rejected`. Adds `sessionMode`
//          (live/offline, surfaced in the UI) and the app lock's `locked`
//          latch. Before this, "offline" and "revoked" were the same value and
//          the app took the harsher reading, which revoked nothing and cost the
//          patient their session on every lift, tunnel and cold start.
// v1.1.0 — Handles sessionExpired from the HTTP layer (refresh exhausted → the
//          onboarding gate), matching the web slice's v2.2.0 behaviour.
// v1.0.0 — Session + sign-in lifecycle, mirroring the web auth slice, plus the
//          `justRegistered` latch that lets the success screen be seen at all.
