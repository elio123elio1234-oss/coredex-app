/* ==================================================================
   useViewerFeatures — "may this user use this ECG tool?"

   The ONLY way UI should ask. Screens call `has('calipers')`; they never
   look at a role. See `viewerFeatures.ts` for the policy this reads, and
   why it is centralised.
   ================================================================== */

import { useMemo } from 'react';
import { usePermissions } from '@/features/auth/useCurrentUser';
import { VIEWER_FEATURES, type ViewerFeatureId } from './viewerFeatures';

export interface ViewerFeatures {
  has: (id: ViewerFeatureId) => boolean;
  /** Every feature this user may use — for rendering a toolbar from data. */
  allowed: ViewerFeatureId[];
}

export function useViewerFeatures(): ViewerFeatures {
  const { can } = usePermissions();

  return useMemo(() => {
    const has = (id: ViewerFeatureId) => can(VIEWER_FEATURES[id].permission);
    return {
      has,
      allowed: (Object.keys(VIEWER_FEATURES) as ViewerFeatureId[]).filter(has),
    };
  }, [can]);
}

// v1.0.0 — Resolves ECG viewer tool availability from the RBAC feature map.
