/* Typed Redux hooks — use these, never raw useDispatch/useSelector. */

import { useDispatch, useSelector, type TypedUseSelectorHook } from 'react-redux';
import type { AppDispatch, RootState } from './store';

export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

// v0.1.1 — Typed dispatch/selector hooks (web's app/hooks.ts, moved out of src/app).
