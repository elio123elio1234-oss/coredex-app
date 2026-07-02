/* ==================================================
   Config Module
   Central place for runtime configuration and
   feature flags.

   BACKEND INTEGRATION
   -------------------
   When a backend is ready, set backendUrl to the
   API root (e.g. 'https://api.cyphix.example.com').
   Then implement syncSessionToBackend() below.
   ================================================== */

const CONFIG = {
    backendUrl: null,           // set to API root when backend is available
    enableTelemetry: false,     // future: opt-in analytics
    maxScanFps: 30,             // cap frames sent to the AI worker
};

/**
 * Stub: send session data to backend.
 * No-op until CONFIG.backendUrl is set.
 */
async function syncSessionToBackend(payload) {
    if (!CONFIG.backendUrl) return;
    // Example implementation (uncomment when ready):
    // await fetch(CONFIG.backendUrl + '/sessions', {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify(payload),
    // });
}
