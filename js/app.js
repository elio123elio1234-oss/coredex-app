/* ==================================================
   App Entry Point
   Wires all modules together and bootstraps the UI.
   This file should stay thin — logic lives in modules.
   ================================================== */

document.addEventListener('DOMContentLoaded', () => {

    /* 1. Theme & language (must be first so the DOM renders correctly) */
    initTheme();
    initLang();

    /* 2. Sidebar mobile drawer */
    initSidebar();

    /* 3. Theme toggle switch */
    document.getElementById('themeSwitch')
        .addEventListener('change', e => applyTheme(e.target.checked ? 'dark' : 'light'));

    /* 4. Language selector */
    document.getElementById('langSelect')
        .addEventListener('change', e => {
            applyLang(e.target.value);
            refreshScanLabels(); // update any already-rendered scan text
        });

    /* 5. Scan start / exit */
    document.getElementById('startBtn').addEventListener('click', startScan);
    document.getElementById('exitBtn').addEventListener('click', () => {
        _AI.disconnect(); // stop AI guide when exiting scan
        exitScan();
    });

    /* 6. Mode toggle inside scan view */
    document.getElementById('toggleBtn').addEventListener('click', toggleScanMode);

    /* 6b. Hide/show skeleton+dots overlay */
    document.getElementById('hideOverlayBtn').addEventListener('click', toggleOverlay);

    /* 7. AI Realtime Guide feature */
    _AI.init();
});
