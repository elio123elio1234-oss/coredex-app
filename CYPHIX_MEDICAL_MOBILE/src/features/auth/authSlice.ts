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
  type SessionUser,
} from '@cyphix/shared';
import { authService } from '@/services/auth/authService';
import { sessionExpired } from '@/services/auth/authEvents';
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
};

function auditSignIn(user: SessionUser, detail: string): void {
  logAudit({
    actor: { id: user.id, role: user.role },
    action: 'auth:login',
    outcome: 'success',
    detail,
  });
}

/** Boot: bring back the stored session if there is one. */
export const restoreSession = createAsyncThunk('auth/restore', async () => {
  return authService.restore();
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
  },
  extraReducers: (builder) => {
    builder
      .addCase(restoreSession.pending, (state) => {
        state.status = 'restoring';
      })
      .addCase(restoreSession.fulfilled, (state, action) => {
        state.user = action.payload?.user ?? null;
        state.profile = action.payload?.profile ?? {};
        state.status = 'idle';
        /* A restored session is one the patient has met before — there is
           nothing to celebrate and nothing holding the door. */
        state.justRegistered = false;
      })
      .addCase(restoreSession.rejected, (state) => {
        // A device we cannot read is a device with no session — show the door.
        state.user = null;
        state.status = 'idle';
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.profile = {};
        state.status = 'idle';
        state.error = null;
        state.justRegistered = false;
        /* A preview must not outlive the account it was previewed on: the
           next person to sign in would silently get someone else's chosen
           role drawn over their own. */
        state.debugRole = null;
      })
      /* The HTTP layer exhausted its refresh (token revoked, expired, or
         replay detected server-side). Same landing as a sign-out, and
         NOT an error state: nothing the patient did failed — the session
         simply ended, so the door is the honest place to be. */
      .addCase(sessionExpired, (state) => {
        state.user = null;
        state.profile = {};
        state.status = 'idle';
        state.error = null;
        state.justRegistered = false;
      })
      /* Sign-in and registration land the same way — except that
         registration also latches `justRegistered`, so they cannot share
         one matcher. RTK requires every addCase BEFORE any addMatcher. */
      .addCase(loginUser.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.profile = action.payload.profile;
        state.status = 'idle';
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.profile = action.payload.profile;
        state.status = 'idle';
        state.error = null;
        // Hold the gate on the flow until "Profile created" is dismissed.
        state.justRegistered = true;
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

export const { clearAuthError, debugRoleSet, welcomeAcknowledged } = authSlice.actions;
export default authSlice.reducer;

// v1.1.0 — Handles sessionExpired from the HTTP layer (refresh exhausted → the
//          onboarding gate), matching the web slice's v2.2.0 behaviour.
// v1.0.0 — Session + sign-in lifecycle, mirroring the web auth slice, plus the
//          `justRegistered` latch that lets the success screen be seen at all.
