/* ==================================================
   Sidebar Module
   Handles the mobile drawer open/close behaviour.
   ================================================== */

function initSidebar() {
    const sidebar = document.getElementById('sidebar');
    const scrim   = document.getElementById('scrim');
    const btn     = document.getElementById('hamburgerBtn');

    function toggle(open) {
        sidebar.classList.toggle('open', open);
        scrim.classList.toggle('show', open);
    }

    btn.addEventListener('click', () => toggle(!sidebar.classList.contains('open')));
    scrim.addEventListener('click', () => toggle(false));
}
