/* ==================================================================
   Locale — Hebrew (עברית), RTL.

   Typed as `Record<TranslationKey, string>`: a key that exists in `en.ts`
   and not here is a COMPILE error. That is the whole point of the shape —
   a missing translation must never reach a patient as a blank label or a
   raw key.

   Wherever the web app already says this sentence in Hebrew, the wording
   is copied verbatim from `CYPHIX_MEDICAL_WEB/src/i18n/locales/he.ts`.
   Two platforms giving the same instruction two different ways is a
   clinical problem, not a copy problem.
   ================================================================== */

import type { TranslationKey } from './en';

export const he: Record<TranslationKey, string> = {
  /* ── מזח תחתון ── */
  dockHistory: 'היסטוריה',
  dockTests: 'הבדיקות שלי',
  dockHome: 'בית',
  dockChat: 'צ׳אט',
  dockProfile: 'פרופיל',

  /* ── מסך הבית ── */
  homeGreeting: 'שלום {name}',
  homeGreetingNoName: 'שלום',
  homeSubPatient: 'מבצע בדיקת אק"ג ביתית',
  homeStart: 'התחל בדיקה',
  homeConnect: 'התחבר',
  homeStartDemo: 'התחל הדגמה',
  homeDemoLink: 'מצב הדגמה (ללא מכשיר)',

  /* ── מצב המכשיר, במילים ── */
  devSimulated: 'סימולציה — אינו אות של מטופל',
  devStreaming: 'משדר',
  devConnected: 'המכשיר מחובר',
  devConnecting: 'מתחבר…',
  devError: 'שגיאת חיבור',
  devNoBluetooth: 'אין בלוטות׳ בגרסה הזו',
  devNone: 'לא מחובר מכשיר',

  /* ── כרטיס חיבור ── */
  bleNotConnected: 'לא מחובר',
  bleConnected: 'מחובר',
  bleLive: 'חי',
  bleSimulatedTag: 'סימולציה',
  bleDisconnect: 'ניתוק',
  bleConnectDevice: 'חיבור מכשיר',

  /* ── שלבי הכנה ── */
  limbPrepProgress: 'שלב {n} מתוך {total}',
  limbPrepBack: 'חזרה',
  limbPrep1Title: 'לבש את השעון על יד שמאל',
  limbPrep1Confirm: 'אני מאשר שלבשתי את השעון בצד שמאל',
  limbPrep2Title: 'הנח את היד על ירך שמאל',
  limbPrep2Confirm: 'אני מאשר שהנחתי את היד על רגל שמאל',

  /* ── מסך המדידה החי ── */
  limbTitle: 'לידים של גפיים',
  limbHowTo: 'השעון על יד שמאל · הנח את היד על רגל שמאל · גע בכתר עם יד ימין',
  limbRecordingNow: 'מקליט — אל תזוז ונשום רגיל',
  limbAutoHint: 'ההקלטה מתחילה לבד ברגע שנרגיש דופק יציב.',
  limbCountdownCaption: 'שניות נותרו',
  limbWaiting: 'ממתין לנתונים מהמכשיר…',
  limbGuideCaption: 'געו בשעון עם יד ימין — ההקלטה מתחילה לבד',
  limbSimulationBanner: 'סימולציה — אינו אות אמיתי',
  limbSimulationShort: 'סימולציה',
  limbRailWarning:
    'ליד {leads}: עוצמת האות חורגת ממה שקישור הבלוטות׳ יכול להעביר, ולכן הוא מצויר שטוח. ' +
    'הרטיבו מחדש או הצמידו מחדש את האלקטרודה. האלקטרודה אינה מנותקת — זו מגבלת תעבורה.',
  /* ★ Units stay as their international abbreviations in every language —
     the same rule that leaves ms, Hz, mV and % alone. A patient reading a
     clinical number is better served by the symbol every ECG uses than by a
     translated one they would have to map back. */
  limbBpmUnit: 'BPM',
  limbSecLeftUnit: 'שניות',
  countdownA11y: 'נותרו {n} שניות',

  /* ── שער הדופק ── */
  gateSettling: 'מחממים את החיישנים…',
  gateSearching: 'מחפשים את הדופק שלך…',
  gateDetecting: 'קולטים פעימות…',
  gateValid: 'יש דופק יציב',
  gateLeadOff: 'אין מגע טוב — לחץ קצת יותר חזק',
  gateIrregular: 'האות לא יציב — אל תזוז רגע',
  gateNoSignal: 'עדיין אין אות — בדוק שהשעון על פרק היד',
  gateBeatsA11y: 'פעימות שזוהו: {found} מתוך {needed}',
  gateBpm: 'BPM',
  gateSteadiness: 'יציבות',

  /* ── הדוח ── */
  reportLimbTitle: 'לידים של גפיים — דוח',
  reportLeadSetShort: 'לידי גפיים',
  reportSimulated: 'אות מדומה — אינו הקלטה של מטופל',
  reportDisclaimer:
    'לשימוש בריאותי ואימוני בלבד. אינו מכשיר אבחוני. לפענוח רפואי יש לפנות לרופא.',
  reportTabWaveform: 'גלים',
  reportTabMeasurements: 'מדידות',
  reportSectionA11y: 'חלק בדוח',
  reportDuration: 'משך',
  reportLeads: 'לידים',
  reportSampleRate: 'קצב דגימה',
  reportSwipeHint: '← החליקו כדי לסרוק את כל {sec} השניות',
  reportRecordAgain: 'הקלטה נוספת',
  reportDone: 'סיום',

  /* ── גיליון המדידות ── */
  analysisTitle: 'מדידות אוטומטיות',
  analysisSubtitle: 'חושבו מהגל שהוקלט. מדידות בלבד — אין כאן פענוח או אבחנה.',
  qInsufficient: 'זוהו מעט מדי פעימות נקיות למדידה אמינה. יש לחזור על ההקלטה.',

  secRate: 'קצב וסדירות',
  secAxis: 'ציר חשמלי (מישור חזיתי)',
  secIntervals: 'מרווחים ומשכי זמן',
  secAmplitudes: 'עוצמות הגלים',
  secQuality: 'איכות האות',

  mBpm: 'דופק',
  mBpmHint: 'מתוך ממוצע המרווחים בין גלי R',
  mRrMean: 'ממוצע R-R',
  mRrRange: 'טווח R-R',
  mRegularity: 'סדירות',
  mSdnn: 'SDNN',
  mSdnnHint: 'פיזור המרווחים בין פעימות',
  mRmssd: 'RMSSD',
  mRmssdHint: 'שינוי מפעימה לפעימה',
  mPBefore: 'גל P לפני QRS',
  mPBeforeHint: 'אחוז הפעימות עם גל P מזוהה',
  mBeats: 'פעימות שנותחו',

  regRegular: 'סדיר',
  regSlightlyIrregular: 'משתנה מעט',
  regIrregular: 'משתנה',
  regIndeterminate: 'לא נקבע',

  axisNormal: 'ציר תקין',
  axisLeft: 'סטייה שמאלה',
  axisRight: 'סטייה ימינה',
  axisExtreme: 'ציר קיצוני',
  axisIndeterminate: 'לא נקבע',
  axisNormalRange: 'האזור המסומן: ‎−30°‎ עד ‎+90°',
  axisNetI: 'שטח QRS נטו, ליד I',
  axisNetAvf: 'שטח QRS נטו, ליד aVF',

  iPR: 'מרווח PR',
  iQRS: 'רוחב QRS',
  iQT: 'מרווח QT',
  iQTcB: 'QTc (Bazett)',
  iQTcF: 'QTc (Fridericia)',
  refRange: 'טווח מקובל במבוגרים',
  intervalsNote: 'האזורים המוצללים הם טווחי ייחוס מקובלים, להקשר בלבד. אינם ממצא.',

  ampLead: 'ליד',
  ampP: 'P',
  ampQ: 'Q',
  ampR: 'R',
  ampS: 'S',
  ampT: 'T',
  ampQRSpp: 'QRS שיא-לשיא',
  ampUnit: 'כל הערכים במילי-וולט (mV), חציון על פני הפעימות שנותחו.',

  qSqi: 'יציבות הקצב',
  qAnalysed: 'אות שנותח',
  qSampleRate: 'קצב דגימה',

  analysisDisclaimer:
    'מדידות אוטומטיות שהופקו על ידי CYPHIX מהקלטת 6 לידי גפיים. הדוח אינו אבחנה ואינו מחליף הערכה קלינית. כל הערכים טעונים בדיקה של רופא מוסמך.',

  /* ── הכרטיס הרפואי ── */
  profileDetails: 'פרטים',
  profileAge: 'גיל',
  profileSex: 'מין',
  profileBlood: 'סוג דם',
  profileHeight: 'גובה',
  profileWeight: 'משקל',
  profileBmi: 'BMI',
  profileBmiNote: 'מחושב מגובה וממשקל',
  profileMrn: 'מספר תיק רפואי',
  profilePhone: 'טלפון',
  profileConditions: 'מצבים רפואיים',
  profileAllergies: 'אלרגיות',
  profileMedications: 'תרופות',
  profileFamily: 'היסטוריה משפחתית',
  profileEmergency: 'איש קשר לחירום',
  profileCareTeam: 'צוות מטפל',
  profileRecent: 'פעילות אחרונה',
  profileNoneRecorded: 'לא נרשמו',
  profileNoAllergies: 'אין אלרגיות ידועות',
  profileNoMeds: 'לא נרשמו תרופות',
  profileNoRecent: 'אין עדיין הקלטות',
  profileSettingsDesc: 'תצוגה, התראות, מכשיר ופרטיות',

  sexMale: 'זכר',
  sexFemale: 'נקבה',
  sexOther: 'אחר',
  sexUnknown: 'לא ידוע',

  /* ── הגדרות ── */
  settingsTitle: 'הגדרות',
  settingsSubtitle: 'ניהול העדפות וחשבון',

  setSecAppearance: 'תצוגה',
  setSecAppearanceDesc: 'איך CYPHIX נראה במכשיר הזה',
  setTheme: 'ערכת נושא',
  setThemeDesc: 'לפי הטלפון, או בחירה שלך',
  setThemeSystem: 'מערכת',
  setThemeLight: 'בהיר',
  setThemeDark: 'כהה',
  setTextSize: 'גודל טקסט',
  setTextSizeDescMobile: 'CYPHIX פועל לפי גודל הטקסט שהוגדר בהגדרות התצוגה של הטלפון',
  setTextSizePhone: 'הגדרת הטלפון',
  bgLabel: 'רקע',
  bgLabelDesc: 'הצבע שמאחורי המסכים שלך',
  bgWaves: 'גלים',
  bgWhite: 'לבן',
  bgGray: 'אפור',
  bgCalm: 'רגוע',

  language: 'שפה',
  languageDesc: 'השפה שבה CYPHIX מדבר אליך',

  setSecNotifications: 'התראות',
  setSecNotificationsDesc: 'בחר על מה לקבל תזכורות',
  setNotifReminders: 'תזכורות לבדיקה',
  setNotifRemindersDesc: 'הזכר לי כשיש בדיקה לבצע',
  setNotifResults: 'תוצאות מוכנות',
  setNotifResultsDesc: 'עדכן אותי כשהקלטה נבדקה',
  setNotifMessages: 'הודעות מהרופא',
  setNotifMessagesDesc: 'התראה על הודעות חדשות',

  setSecCare: 'קשר עם המטפל',
  setSecCareDesc: 'לאן ההודעות שלך מגיעות',
  setCareConnection: 'חיבור',
  setCareClinicianDesc: 'צ׳אט ישיר עם הרופא הפרטי שלך',
  setCareClinicDesc: 'הפניות ממוינות במרפאה לרופא פנוי',
  careClinician: 'הרופא שלי',
  careClinic: 'מרפאה',

  setSecDevice: 'מכשיר האק"ג',
  setSecDeviceDesc: 'חיבור הבלוטות׳ של מכשיר האק"ג',
  setDeviceStatus: 'סטטוס',
  setDeviceName: 'מכשיר',
  setDeviceNonePaired: 'לא מותאם מכשיר',
  setDeviceDisconnect: 'ניתוק',
  setDeviceTap: 'הקש',
  setDeviceConnect: 'חיבור מכשיר',
  setDeviceNoBleDesc: 'בגרסה הזו אין בלוטות׳ — הסימולטור הוא הדרך',
  setDeviceScan: 'סריקה',
  setDeviceDemo: 'הדגמה',

  setSecPrivacy: 'פרטיות ואבטחה',
  setSecPrivacyDesc: 'הנתונים שלך וכיצד הם מוגנים',
  setPrivacyOnDevice: 'עיבוד במכשיר',
  setPrivacyOnDeviceDesc: 'האק"ג שלך לא עוזב את המכשיר הזה. אין שרת כרגע.',
  encryptionBadge: 'עיבוד מאובטח במכשיר',
  setPrivacyExport: 'ייצוא הנתונים שלי',
  setPrivacyExportDesc: 'הורדת כל מה שנשמר במכשיר הזה',

  setSecAccount: 'חשבון',
  setSecAccountDesc: 'החשבון שאיתו התחברת',
  setAccountName: 'שם',
  setAccountRole: 'תפקיד',
  roleLabelPatient: 'מטופל/ת',
  setAccountSignOut: 'התנתקות',
  setAccountSignOutDesc: 'יהיה זמין כשהחשבונות יחוברו לשרת',

  setSecAbout: 'אודות',
  setSecAboutDesc: 'גרסה ותאימות רגולטורית',
  setAboutVersion: 'גרסת אפליקציה',
  setAboutBuild: 'הגרסה הזו',
  setAboutCompliance: 'תאימות רגולטורית',
  setAboutComplianceValue: 'HIPAA · GDPR · חוק הגנת הפרטיות',

  setComingSoon: 'בקרוב',

  /* ── היסטוריה / בדיקות / צ׳אט ── */
  histTitle: 'היסטוריית סריקות',
  histEmptyTitle: 'אין עדיין הקלטות',
  histEmptyBody:
    'מדידות שהסתיימו מסתנכרנות לכאן דרך שרת CYPHIX, עם אותו מציג גלים ואותם סרגלי מדידה כמו בגרסת הווב.',
  testsTitle: 'הבדיקות שלי',
  testsEmptyTitle: 'אין עדיין בדיקות',
  testsEmptyBody: 'סיימו מדידה ממסך הבית והיא תופיע כאן.',
  chatTitle: 'צ׳אט',
  chatEmptyBody: 'הודעות עם הצוות המטפל יופיעו כאן, באותו שרשור שאתם רואים בווב.',

  /* ── משותף ── */
  back: 'חזרה',
  exit: 'יציאה',
};

// v1.0.0 — Hebrew locale (RTL); wording copied from the web locale where the
//          web already says the same sentence.
