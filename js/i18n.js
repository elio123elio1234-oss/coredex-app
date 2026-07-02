/* ==================================================
   i18n — Internationalisation Module
   ================================================== 

   HOW TO ADD A NEW LANGUAGE
   --------------------------
   1. Add an entry to LANG_META:
        el: { dir: 'ltr', name: 'Ελληνικά' }

   2. Add a matching translations object to TRANSLATIONS:
        el: { brandSub: 'Ιατρική Τεχνητή Νοημοσύνη', ... }

   3. Add an <option> to the #langSelect in index.html:
        <option value="el">Ελληνικά</option>

   That's it — the rest is automatic.
   ================================================== */

const LANG_META = {
    en: { dir: 'ltr',  name: 'English'  },
    he: { dir: 'rtl',  name: 'עברית'    }
    // ar: { dir: 'rtl',  name: 'العربية'  },
    // el: { dir: 'ltr',  name: 'Ελληνικά' },
};

const TRANSLATIONS = {
    en: {
        brandSub:         'Medical AI',
        sessionLabel:     'System Status',
        sessionName:      'Local Scan',
        backendOffline:   'Backend: Offline',
        sessionSub:       'All processing happens on your device',
        navModules:       'Modules',
        navLiveScan:      'Live Scan',
        navHistory:       'Scan History',
        navProfile:       'Patient Profile',
        navSettings:      'System Settings',
        soon:             'Soon',
        darkMode:         'Dark Mode',
        language:         'Language',
        topbarTitle:      'Live Scan',
        encryptionBadge:  'Secure On-Device Processing',
        dashHeading:      'Initiate Scan Protocol',
        dashSub:          'Select a procedure to connect with the AI guidance module',
        cardTitle:        'ECG Electrode Mapping',
        cardDesc:         'Automated visual guidance for precise chest sensor placement, in real time through the camera.',
        startButton:      'Start Scan',
        statusInit:       'Initializing smart sensors…',
        statusReady:      'System ready for real-time scanning',
        statusError:      'Error: ',
        scanStatusReady:  'System Active',
        modeSkeleton:     'Anatomical Skeleton',
        modeElectrodes:   'Electrode Mapping',
        exitButton:       'Exit',
    },
    he: {
        brandSub:         'רפואה חכמה',
        sessionLabel:     'מצב מערכת',
        sessionName:      'סריקה מקומית',
        backendOffline:   'שרת: לא מחובר',
        sessionSub:       'כל העיבוד מתבצע במכשיר שלך',
        navModules:       'מודולים',
        navLiveScan:      'סריקה חיה',
        navHistory:       'היסטוריית סריקות',
        navProfile:       'פרופיל מטופל',
        navSettings:      'הגדרות מערכת',
        soon:             'בקרוב',
        darkMode:         'מצב כהה',
        language:         'שפה',
        topbarTitle:      'סריקה חיה',
        encryptionBadge:  'עיבוד מקומי מאובטח',
        dashHeading:      'התחלת פרוטוקול סריקה',
        dashSub:          'בחר פרוצדורה כדי להתחבר למודול ההנחיה החכם',
        cardTitle:        'מיפוי אלקטרודות אק"ג',
        cardDesc:         'הנחיה חזותית אוטומטית למיקום דיוק של חיישני החזה, בזמן אמת דרך המצלמה.',
        startButton:      'התחל סריקה',
        statusInit:       'מאתחל חיישנים חכמים…',
        statusReady:      'המערכת מוכנה לסריקה בזמן אמת',
        statusError:      'שגיאה: ',
        scanStatusReady:  'המערכת פעילה',
        modeSkeleton:     'שלד אנטומי',
        modeElectrodes:   'חישוב אלקטרודות',
        exitButton:       'יציאה',
    },
    // ar: { ... },
    // el: { ... },
};

/* Default language — change to 'he' or any other key if desired */
const DEFAULT_LANG = 'en';

let _currentLang = DEFAULT_LANG;

/** Translate a key for the active language, fallback to English. */
function t(key) {
    return (TRANSLATIONS[_currentLang]?.[key]) ?? (TRANSLATIONS.en[key]) ?? key;
}

/** Apply a language code: update DOM, direction, localStorage, select. */
function applyLang(lang) {
    if (!LANG_META[lang]) lang = DEFAULT_LANG;
    _currentLang = lang;
    localStorage.setItem('coredex-lang', lang);
    document.documentElement.lang = lang;
    document.documentElement.dir  = LANG_META[lang].dir;

    document.querySelectorAll('[data-i18n]').forEach(el => {
        el.textContent = t(el.getAttribute('data-i18n'));
    });

    const sel = document.getElementById('langSelect');
    if (sel) sel.value = lang;
}

/** Read saved preference (or system default) and apply on page load. */
function initLang() {
    const saved = localStorage.getItem('coredex-lang');
    applyLang(saved && LANG_META[saved] ? saved : DEFAULT_LANG);
}
