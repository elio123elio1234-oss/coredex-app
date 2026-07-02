/* ==================================================
   Theme Module
   Manages light / dark mode.
   Default: 'light'
   ================================================== */

const DEFAULT_THEME = 'light';

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('cyphix-theme', theme);
    const sw = document.getElementById('themeSwitch');
    if (sw) sw.checked = (theme === 'dark');
}

function initTheme() {
    const saved = localStorage.getItem('cyphix-theme');
    applyTheme(saved || DEFAULT_THEME);
}
