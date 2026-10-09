/* ==================================================================
   CareLinkHost — the phone's half of an invite link (LAUNCH_PLAN 2.4).

   A QR code or a shared link carries the web URL `/link/CODE`; the app
   claims the same path on its scheme (`cyphix://link/CODE`), and the
   web page offers it on a phone. `AuthLinkListener` reads either into
   `auth.pendingCareCode`; this component, mounted once above the gate,
   raises the join sheet with the code pre-filled — but only for a
   signed-in PATIENT. Signed out, the code waits through the sign-in;
   staff have nothing to join, so theirs is dropped.

   Renders only the sheet.
   ================================================================== */

import { useEffect } from 'react';
import JoinCareSheet from '@/components/organisms/Care/JoinCareSheet';
import { careLinkConsumed } from '@/features/auth/authSlice';
import { useAppDispatch, useAppSelector } from '@/store/hooks';

const isStaff = (role: string | undefined) =>
  role === 'clinician' || role === 'technician' || role === 'admin';

export default function CareLinkHost() {
  const dispatch = useAppDispatch();
  const code = useAppSelector((s) => s.auth.pendingCareCode);
  const user = useAppSelector((s) => s.auth.user);

  useEffect(() => {
    if (code && user && isStaff(user.role)) dispatch(careLinkConsumed());
  }, [code, user, dispatch]);

  return (
    <JoinCareSheet
      visible={Boolean(code && user && !isStaff(user.role))}
      initialCode={code}
      onClose={() => dispatch(careLinkConsumed())}
    />
  );
}

// v1.0.0 — Raises the join sheet on a pending care-invite code for a signed-in patient.
