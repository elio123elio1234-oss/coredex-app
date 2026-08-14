/* ==================================================================
   OptionalWebView — `react-native-webview`, if this binary carries it.

   The report preview renders the EXACT HTML the printer receives, which
   needs a WebView — a NATIVE dependency (mobile CLAUDE.md §5A.1). The
   module ships in binaries built from v0.35.0 of `app.json` onwards; a
   phone still on the 0.34.0 build that receives this code over the air
   does not have it, and importing it unconditionally would crash that
   phone at bundle-require time.

   Same pattern as `modules/cyphix-ble`'s optional native module: resolve
   at require time, `null` when absent, and every caller must offer the
   fallback (direct share, no preview). The guard stays even after every
   installed binary has the module — it is what makes the NEXT native
   dependency safe to ship the same way.
   ================================================================== */

import type { ComponentType } from 'react';

export interface OptionalWebViewProps {
  source: { html: string };
  style?: unknown;
  originWhitelist?: string[];
  /** Android: allow pinch-zoom on the A4 sheet. */
  setBuiltInZoomControls?: boolean;
  setDisplayZoomControls?: boolean;
}

let resolved: ComponentType<OptionalWebViewProps> | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require('react-native-webview') as {
    WebView?: ComponentType<OptionalWebViewProps>;
    default?: ComponentType<OptionalWebViewProps>;
  };
  resolved = mod.WebView ?? mod.default ?? null;
} catch {
  resolved = null;
}

/** The WebView component, or null on a binary without the native module. */
export const OptionalWebView = resolved;

// v1.0.0 — react-native-webview behind a require guard, so an OTA bundle can
//          carry the preview without crashing binaries built before v0.35.0.
