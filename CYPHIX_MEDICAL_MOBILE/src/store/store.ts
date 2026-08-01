/* Redux store — composition root, same shape as the web store.
   Lives in src/store/ rather than web's src/app/: Expo's CLI claims a
   top-level `app` directory as the Expo Router route root, and repurposing
   a framework-reserved name invites confusion later. */

import { configureStore } from '@reduxjs/toolkit';
import { baseApi } from '@/services/api/baseApi';
import bleReducer from '@/features/ble/bleSlice';
import preferencesReducer from '@/features/preferences/preferencesSlice';

export const store = configureStore({
  reducer: {
    [baseApi.reducerPath]: baseApi.reducer,
    ble: bleReducer,
    preferences: preferencesReducer,
  },
  middleware: (getDefault) =>
    getDefault({
      /* ── Why the serializable check is scoped, not switched off ──
         Saving a capture puts two `Float32Array`s in the mutation ARGUMENT
         (`createRecording`), because that is the only honest way to hand a
         waveform to the service layer — the web does exactly the same. RTK's
         default check walks every action payload and would log a warning per
         save, at ~3 200 samples a time, on the UI thread.

         The arrays never reach the STORE: `createRecording` returns the
         base64-encoded record, and the cache only ever holds that. So the
         ignore list names the two action types that carry them in flight and
         leaves the check on everywhere else, where it is still doing its job
         of catching a Date or a class instance sliding into state. */
      serializableCheck: {
        ignoredActions: ['api/executeMutation/pending', 'api/executeMutation/fulfilled'],
        ignoredPaths: ['api.mutations'],
      },
    }).concat(baseApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// v0.3.0 — Scopes the serializable check so saving a capture (Float32Array in
//          the mutation arg) does not warn, without disabling it app-wide.
