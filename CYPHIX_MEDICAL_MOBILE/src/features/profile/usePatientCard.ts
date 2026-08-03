/* ==================================================================
   usePatientCard — the ONE place a screen gets "whose record is this,
   and what is in it".

   Three cases, and the third is the one worth reading:

   1. OFFLINE (no API URL) → the fictitious `DEMO_CARD`. Nothing to ask.
   2. SIGNED IN as a patient → `GET /patients/:id/card` for their OWN id,
      plus the portrait as a separate request, and the real async states.
   3. SIGNED IN, but the card cannot be loaded (offline, cold server,
      403) → an EMPTY card carrying only the name from the session.

   ★ Case 3 is deliberate and is the reason this hook exists at all.
   The obvious shortcut — fall back to DEMO_CARD — would print "A+",
   "Lisinopril 10 mg" and "Atrial fibrillation" under a real person's own
   name, on the screen whose entire job is to be their medical record.
   Someone could act on it. An empty card with dashes says "we could not
   load this", which is both true and safe; the screen also surfaces the
   error state so it does not read as "you have no data".

   A CLINICIAN has no single active patient (`useActivePatientId` returns
   null rather than inventing one), so they get the demo card until a
   patient picker exists — tracked in PARITY.md.
   ================================================================== */

import { useCallback, useMemo } from 'react';
import type { PatientCardModel } from '@cyphix/shared';
import { ENV } from '@/config/env';
import { useActivePatientId } from '@/features/auth/useActivePatientId';
import { DEMO_CARD } from '@/features/profile/demoCard';
import { useGetPatientCardQuery } from '@/services/api/endpoints/profileApi';
import { useGetPatientPhotoQuery } from '@/services/api/endpoints/photoApi';
import { useAppSelector } from '@/store/hooks';

export interface PatientCardView {
  card: PatientCardModel;
  /** Data-URL of the portrait, or null when there is none. */
  photo: string | null;
  isLoading: boolean;
  /** A refresh is in flight over data already on screen (pull-to-refresh). */
  isFetching: boolean;
  /** The card could not be loaded. `card` is then name-only — say so. */
  isError: boolean;
  /** True when this is the fictitious demo record, not a real person. */
  isDemo: boolean;
  /** Whose record it is — null offline or for a clinician. */
  patientId: string | null;
  /** Try again. The screen offers this as pull-to-refresh — which is why
      the failure message is allowed to say "pull to try again". */
  refetch: () => void;
}

/** A card with nothing in it but the person's own name. Used while the
    real one loads and when it will not come — never demo values. */
function emptyCard(id: string, displayName: string): PatientCardModel {
  return {
    id,
    displayName,
    conditions: [],
    allergies: [],
    medications: [],
    familyHistory: [],
  };
}

export function usePatientCard(): PatientCardView {
  const patientId = useActivePatientId();
  const sessionName = useAppSelector((s) => s.auth.user?.displayName);
  const connected = ENV.hasBackend && patientId !== null;

  const cardQuery = useGetPatientCardQuery(patientId ?? '', { skip: !connected });
  const photoQuery = useGetPatientPhotoQuery(patientId ?? '', { skip: !connected });
  const { refetch: refetchCard } = cardQuery;
  const { refetch: refetchPhoto } = photoQuery;

  const refetch = useCallback(() => {
    if (!connected) return;
    void refetchCard();
    void refetchPhoto();
  }, [connected, refetchCard, refetchPhoto]);

  return useMemo(() => {
    if (!connected) {
      return {
        card: DEMO_CARD,
        photo: null,
        isLoading: false,
        isFetching: false,
        isError: false,
        isDemo: true,
        patientId: null,
        refetch,
      };
    }
    const id = patientId as string;
    return {
      card: cardQuery.data ?? emptyCard(id, sessionName ?? ''),
      /* The portrait failing is not the card failing: a missing picture
         is an avatar with initials, which is a normal state, not an
         error worth telling anyone about. */
      photo: photoQuery.data?.photo ?? null,
      isLoading: cardQuery.isLoading,
      isFetching: cardQuery.isFetching || photoQuery.isFetching,
      isError: cardQuery.isError,
      isDemo: false,
      patientId: id,
      refetch,
    };
  }, [
    connected,
    patientId,
    sessionName,
    refetch,
    cardQuery.data,
    cardQuery.isLoading,
    cardQuery.isFetching,
    cardQuery.isError,
    photoQuery.data,
    photoQuery.isFetching,
  ]);
}

// v1.0.0 — Resolves the Profile screen's record: the server's card for a real
//          account, the demo card offline, and a name-only card when it fails.
