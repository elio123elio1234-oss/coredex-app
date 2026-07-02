/* ==================================================
   Theme Module
   Manages light / dark mode.
   Default: 'light'
   ================================================== */

const DEFAULT_THEME = 'light';

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('coredex-theme', theme);
    const sw = document.getElementById('themeSwitch');
    if (sw) sw.checked = (theme === 'dark');
}

function initTheme() {
    const saved = localStorage.getItem('coredex-theme');
    applyTheme(saved || DEFAULT_THEME);
}
