/* Redux store — composition root, same shape as the web store.
   Lives in src/store/ rather than web's src/app/: Expo's CLI claims a
   top-level `app` directory as the Expo Router route root, and repurposing
   a framework-reserved name invites confusion later. */

import { configureStore } from '@reduxjs/toolkit';
import { baseApi } from '@/services/api/baseApi';
import bleReducer from '@/features/ble/bleSlice';

export const store = configureStore({
  reducer: {
    [baseApi.reducerPath]: baseApi.reducer,
    ble: bleReducer,
  },
  middleware: (getDefault) => getDefault().concat(baseApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// v0.1.0 — Store composing RTK Query API + ble slice.
