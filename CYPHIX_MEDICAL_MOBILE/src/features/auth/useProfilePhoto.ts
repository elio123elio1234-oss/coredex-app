/* ==================================================================
   useProfilePhoto — the photo step's two actions, with the one piece of
   state they produce: whether the OS refused.

   Kept out of the step component so the component stays presentational
   (CLAUDE.md §3.2) and so a refusal is modelled rather than swallowed —
   a "Take photo" button that does nothing because camera access is off
   is indistinguishable from a broken button.
   ================================================================== */

import { useCallback, useState } from 'react';
import { pickPhoto, takePhoto, type PhotoResult } from '@/services/media/photoPicker';

export interface ProfilePhoto {
  /** True when the last attempt was refused by the OS. */
  denied: boolean;
  take: () => void;
  pick: () => void;
  clearDenied: () => void;
}

export function useProfilePhoto(onPicked: (uri: string) => void): ProfilePhoto {
  const [denied, setDenied] = useState(false);

  const handle = useCallback(
    (result: PhotoResult) => {
      if (result === 'denied') {
        setDenied(true);
        return;
      }
      if (result) {
        setDenied(false);
        onPicked(result.uri);
      }
    },
    [onPicked],
  );

  return {
    denied,
    take: useCallback(() => void takePhoto().then(handle), [handle]),
    pick: useCallback(() => void pickPhoto().then(handle), [handle]),
    clearDenied: useCallback(() => setDenied(false), []),
  };
}

// v1.0.0 — Camera/library actions for the photo step, with a modelled refusal.
