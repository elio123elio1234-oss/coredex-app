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
  profileLoadFailed: 'לא הצלחנו לטעון את הרשומה שלך, ולכן הפרטים למטה עשויים להיות חלקיים. בדקו את החיבור ומשכו למטה כדי לנסות שוב.',
  profilePhotoTitle: 'תמונת פרופיל',
  profilePhotoChange: 'שינוי תמונת הפרופיל',
  profilePhotoTake: 'צילום תמונה',
  profilePhotoChoose: 'בחירה מהגלריה',
  profilePhotoRemove: 'הסרת התמונה',
  profilePhotoDenied:
    'ל-CYPHIX אין הרשאה למצלמה או לתמונות שלך. אפשר להפעיל אותה בהגדרות הטלפון.',
  profilePhotoFailed: 'לא הצלחנו לשמור את התמונה. הקישו כדי לסגור ולנסות שוב.',
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
  roleLabelClinician: 'רופא/ה',
  roleLabelTechnician: 'טכנאי/ת',
  roleLabelAdmin: 'מנהל/ת',
  setDevRole: 'תצוגה כתפקיד',
  setDevRoleDesc: 'לדיבאג בלבד. מציג את האפליקציה כמו לתפקיד הזה — זה לא מעניק שום הרשאה, השרת עדיין מחליט מה מותר.',
  setDevRoleReal: 'האמיתי',
  setAboutSession: 'אחסון החיבור',
  setAppLock: 'נעילה כשלא בשימוש',
  setAppLockDesc: 'אחרי חמש דקות מחוץ לאפליקציה, לבקש Face ID, טביעת אצבע או קוד לפני הצגת התיק שוב. פתיחת האפליקציה לא מבקשת — פתיחת הטלפון כבר ביקשה.',
  setAccountSignOut: 'התנתקות',
  setAccountSignOutDesc: 'מסיים את החיבור בטלפון הזה',
  setSignOutBody: 'כדי לפתוח את המדידות שוב תצטרכו את הסיסמה — או Face ID. שום דבר לא נמחק.',

  setSecAbout: 'אודות',
  setSecAboutDesc: 'גרסה ותאימות רגולטורית',
  setAboutVersion: 'גרסת אפליקציה',
  setAboutBuild: 'הגרסה הזו',
  setAboutMaterial: 'חומר המשטחים',
  setAboutCompliance: 'תאימות רגולטורית',
  setAboutComplianceValue: 'HIPAA · GDPR · חוק הגנת הפרטיות',

  setComingSoon: 'בקרוב',

  /* ══════════════════════════════════════════════════════════════
     היסטוריית סריקות.

     הניסוח מועתק מקובץ העברית של הווב בכל מקום שבו מדובר באותו משפט —
     שתי אפליקציות שמנסחות אחרת את "למחוק את ההקלטה הזו?" הן שני מוצרים.
     המפתחות שמסתיימים ב-Touch הם היוצא מן הכלל: הם מתארים מחווה, ו"לחצו
     פעם אחת" אינו ניסוח מקוצר של מה שאצבע עושה.

     לא מתורגם, בכוונה: שמות הלידים (I, II, aVR…), סמלי היחידות
     (BPM, ms, mV, Hz), והקנה 25 mm/s · 10 mm/mV — סימון בין-לאומי של
     א.ק.ג, לא טקסט.
     ══════════════════════════════════════════════════════════════ */

  /* ── הרשימה ── */
  histTitle: 'היסטוריית סריקות',
  histEmptyTitle: 'אין עדיין הקלטות',
  histEmpty: 'אין עדיין הקלטות. מדידות שהסתיימו נשמרות לכאן אוטומטית.',
  histLoading: 'טוען הקלטות…',
  histLoadError: 'לא הצלחנו לטעון את ההקלטות. נסו שוב.',
  histEmptyWaveform: 'להקלטה הזו אין גל שניתן להציג.',
  histListLabel: 'הקלטות שנשמרו',
  histCount: '{n} הקלטות',
  histOwnOnly: 'שלכם בלבד',
  histNotes: '{n} הערות',
  histSimulated: 'סימולציה',
  histLowQuality: 'איכות אות נמוכה',
  histDevice: 'מכשיר',
  histSelectOne: 'בחרו הקלטה מהרשימה.',

  /* ── שמירת מדידה שהסתיימה ── */
  histSaving: 'שומר להיסטוריה…',
  histSaved: 'נשמר להיסטוריה',
  histSaveFailed: 'ההקלטה הזו לא נשמרה:',

  /* ── ייבוא / ייצוא ── */
  histImport: 'ייבוא א.ק.ג (CSV)',
  histImported: 'יובא',
  histImportFailed: 'לא הצלחנו לקרוא את הקובץ.',
  histExportCsv: 'ייצוא CSV גולמי',
  histExportCsvHint: 'דגימות גולמיות, נפתח בכל תוכנה',
  histExportEdf: 'ייצוא EDF+',
  histExportEdfHint: 'עבור EDFbrowser / MNE / WFDB',
  histExportFailed: 'לא הצלחנו לייצא את ההקלטה.',
  printReport: 'שיתוף דוח PDF',
  pdfHint: 'הדף להדפסה, בקנה 25 mm/s',
  pdfSheetOf: 'דף {n} מתוך {total}',
  reportRecorded: 'נרשם',

  /* ── מחיקה ── */
  histActions: 'פעולות',
  histDelete: 'מחיקה',
  histDeleteTitle: 'למחוק את ההקלטה הזו?',
  histDeleteBody:
    'הפעולה מוחקת לצמיתות את הגל ואת כל ההערות עליו. אי אפשר לחזור על הקלטה — המטופל, הרגע ופעימות הלב היו ייחודיים לה. אין אפשרות ביטול.',
  histDeleteForbidden: 'אין לכם הרשאה למחוק את ההקלטה הזו.',
  histDeleteFailed: 'לא הצלחנו למחוק את ההקלטה. נסו שוב.',
  viewerRetry: 'נסו שוב',

  /* ── היסטוריה → תובנות: תעודת ה‑ECG ──
     ★ כללי הניסוח לבלוק הזה, כי זה המקום הכי קל באפליקציה לכתוב בו
     אבחנה בטעות:
       • אף פעם לא פסק דין — בלי "תקין", "לא תקין", "בריא", "מדאיג";
       • כל הפרש נאמר כמרחק מקו הבסיס של המטופל עצמו, לא מטווח אוכלוסייה;
       • אף פעם לא הוראה — "פנו לרופא" היא החלטה קלינית שלאפליקציה הזו
         אין רישיון לקבל. "פתחו את הבדיקה" היא פעולת ממשק ומותרת.
     `insDisclaimer` הוא חלק מהמסך, לא טקסט משפטי לצידו. */
  /* ── עריכת הכרטיס הרפואי ──
     ★ שום מלל כאן לא אומר לאף אחד מה לרשום. הקטלוג מציע אוצר מילים;
     ההחלטה מה נכון לגבי מטופל היא שלו ושל הרופא שלו. */
  cardEdit: 'עריכה',
  cardSave: 'שמירה',
  cardSaving: 'שומר…',
  cardSaveFailed: 'לא הצלחנו לשמור. השינויים שלכם עדיין כאן — נסו שוב.',
  cardAdd: 'הוספה',
  cardAddOther: 'משהו אחר…',

  /* ── תזכורות מדידה ──
     ★ כלל הניסוח לבלוק הזה: הוא אומר מתי המטופל ביקש שיזכירו לו, ולעולם
     לא כמה פעמים כדאי למדוד. בלי "מומלץ", בלי "כדאי לך", בלי שפה של
     רצפים. כמה פעמים לעשות אק"ג היא הוראה קלינית והאפליקציה הזו לא נותנת
     כאלה. */
  remTitle: 'תזכורות',
  remSecWhen: 'תזכורות',
  remEnable: 'הזכירו לי למדוד',
  remHowMany: 'כמה פעמים ביום',
  remDone: 'סיום',
  remNextAt: 'הבאה {when}',
  remPerDay: '{n}× ביום',
  remDenied: 'ההתראות של CYPHIX כבויות בהגדרות הטלפון, ולכן התזכורות האלה לא יופיעו.',
  /* נקראות לפי חלק היום, ונגזרות מהשעה — כך שתזכורת שהוזזה ל‑07:30
     נקראת "בוקר" ולא "תזכורת 2". */
  remPartMorning: 'בוקר',
  remPartMidday: 'צהריים',
  remPartAfternoon: 'אחר הצהריים',
  remPartEvening: 'ערב',
  /* מה שהטלפון באמת מציג. קצר, ומזכיר את שם האפליקציה — התראה שמגיעה
     שעות אחר כך חייבת להגיד מי מבקש. */
  remNotifTitle: 'הגיע הזמן למדידה',
  remNotifBody: 'פתחו את CYPHIX ובצעו אק"ג.',

  /* ── הבקשה השנייה ──
     ⚠️ יורה רק אם לא נרשמה מדידה. הניסוח חייב להישאר ניטרלי: בלי "פספסת",
     בלי "עדיין לא". האפליקציה לא יודעת למה — ותזכורת שנוזפת היא תזכורת
     שמכבים. */
  remFollowAfter: 'כמה זמן אחר כך',
  remFollowNotifTitle: 'המדידה שלכם עדיין פתוחה',
  remFollowNotifBody: 'עוד לא נרשמה מדידה — בצעו אותה מתי שנוח לכם.',
  remActionSnooze: 'הזכירו בעוד 15 דק׳',
  remActionDone: 'בוצע',

  /* ── בדיקה שזה עובד ──
     ★ מדווחים מה הטלפון באמת מחזיק, לא מה האפליקציה התכוונה. הם קיימים כי
     בוזבזה שעה בהמתנה לתזכורת חוזרת שמעולם לא נדרכה, וכל שאר הנתונים במסך
     הזה תיארו כוונה. */
  /* `d` daily + `f` follow-ups the OS is holding. Fact, not intent. */
  remArmed: '{d} + {f} דרוכות',
  remFollowOff: 'כבוי',
  remTest: 'שליחת בדיקה עכשיו',
  remTestSent: 'נשלח — נעלו את הטלפון וחכו לשתיהן.',
  remTestFailed: 'לא הצלחנו לשלוח. ההתראות של CYPHIX כבויות.',

  testsNextAt: 'הבאה {when}',

  insTabStudies: 'בדיקות',
  insTabInsights: 'תובנות',

  insTitle: 'תעודת ECG',
  insBuilding: 'בונים את תעודת ה‑ECG שלכם',
  insBuildingBody: 'קוראים את הבדיקות…',
  insProgress: 'מנתחים בדיקה {done} מתוך {total}',
  insEmptyTitle: 'עדיין אין תעודת ECG',
  insEmptyBody:
    'אחרי כמה בדיקות נקיות, CYPHIX ממצעת את הפעימות שבכל אחת לפעימה מייצגת אחת — ואת אלה לקו בסיס ששייך רק לכם. מכאן כל בדיקה חדשה נמדדת מולו.',

  /* המצב נקרא כתווית של מכשיר, לא כפסק דין: בלי "עבר", בלי ירוק.
     "מבוסס" מתאר כמה ראיות יש — עובדה על הנתונים, לא ציון ללב. */
  insMatEnrolling: 'קו הבסיס נבנה',
  insMatEstablished: 'קו הבסיס מבוסס',
  insEnrollLabel: 'בדיקות שנרשמו',
  insEnrollHint: 'עוד {n} בדיקות נקיות וקו הבסיס ייקבע.',
  insBuiltFrom: '{n} בדיקות',
  insUpdated: 'עודכן {date}',
  /* הכיתוב של הטבעת — מסביר מה המספר שבמרכז, וזה משתנה בין שני המצבים. */
  insRingStudies: 'בדיקות',
  insRingAgreement: 'התאמה',

  insCompareLatest: 'הצגת הבדיקה האחרונה מעל',
  insLegendBand: 'הטווח הרגיל שלכם',
  insLegendLatest: 'הבדיקה האחרונה',

  /* הסמן — גוררים לאורך הפעימה. */
  insCalHint: 'גררו לרוחב הפעימה כדי למדוד אותה',
  insCalMs: 'מ‑R',
  insCalMv: 'קו בסיס',
  insCalBand: 'טווח',
  insCalLatest: 'אחרונה',

  /* הבנאי — גוררים והממוצע נבנה בדיקה אחרי בדיקה. */
  insBuiltAll: 'ממוצע של כל {n} הבדיקות',
  insBuiltPartial: 'ממוצע של {k} הבדיקות הראשונות מתוך {n}',
  insBuiltReset: 'הצגת הכול',
  /* ⚠️ אומר שהטווח מתמלא. הוא לא מצטמצם — ראו את הכותרת של BeatBuilder.
     כיתוב שמבטיח טווח מצטמצם מבטיח בדיוק את הדבר שהמתמטיקה לא עושה. */
  insBuiltMeaning:
    'בדיקה אחת מראה רק את הרעש שלה עצמה בין פעימה לפעימה. הטווח המוצלל מתמלא ככל שנוספות בדיקות.',

  /* פעימות שלא נכנסו לממוצע של בדיקה אחת. */
  insRejectedTitle: '{n} פעימות לא נכללו בממוצע',
  insRejectedBody: 'הקו העבה הוא הפעימה שכן שימשה. שתי הסיבות רגילות לחלוטין.',
  insRejPremature: 'הגיעה מוקדם',
  insRejDissimilar: 'צורה שונה',
  insRejTruncated: 'נחתכה בסוף ההקלטה',
  insRejMatch: 'התאמה {n}%',

  insMatch: 'התאמה {n}%',
  insNoDeviations: 'אין הבדל מדיד מקו הבסיס שלכם.',
  /* ★ מה זה הפרש. הצ׳יפים דווחו כלא ברורים, ומספר שאי אפשר לפרש גרוע
     ממספר שאין: הוא מדאיג בלי ליידע. אומר מול מה נמדד — ומול מה לא. */
  insDeviationMeaning:
    'נמדד מול הבדיקות הקודמות שלכם, לא מול טווח נורמה. הפרש הוא משהו להסתכל עליו יחד עם הרופא.',


  /* ★ מספר הבדיקות האפקטיבי. מנוסח כתיקון למספר שלידו ולא כסטטיסטיקה
     בפני עצמה — "מתוכן 2.5 אפקטיביות" נקרא כ"ה-24 האלה אופטימיים", וזה
     כל מה שהקורא צריך לקחת מזה. */
  insEffective: '{n} אפקטיביות',
  /* אומר שבוצע תיקון, וגם במה הוא לא נגע. מספר מתוקן שנמסר בשקט הוא
     בדיוק מה שהשורה הזו קיימת כדי למנוע. */
  insCalibrated:
    'מיקום האלקטרודות כאן היה שונה ({deg}°, {pct}% הגבר); התאמת הצורה מביאה זאת בחשבון. נתוני הציר והמשרעת לא.',


  /* ── ★ החצי של המטופל בתובנות (v0.42.0) ─────────────────────────
     כל מה שמעל מיועד למי שכבר יודע מה זה QRS. אלה למי שזה הלב שלו.
     שני כללים: לעולם לא לתת ציון, ולעולם לא לרמוז על אמת מידה
     אוניברסלית — המשפט נבחר מול הפיזור של המטופל עצמו. */
  insPlainLearning: 'עדיין לומדים איך נראית פעימת הלב שלכם',
  insPlainLearningMore: 'עוד {n} מדידות נקיות ותהיה לנו החתימה שלכם.',
  insPlainLearningSoon: 'עוד כמה מדידות ותהיה לנו החתימה שלכם.',
  insPlainConsistent: 'המדידה האחרונה שלכם נראית כמוכם',
  insPlainSlightly: 'המדידה האחרונה שלכם קצת שונה מהרגיל שלכם',
  insPlainDifferent: 'המדידה האחרונה שלכם אינה כמו הרגילות שלכם',
  insPlainTypical: '{k} מתוך {n} המדידות שלכם נראות כמו הרגילות שלכם.',

  insFactRate: 'הדופק הרגיל שלכם',
  insFactStudies: 'מדידות',
  insFactMonths: 'חודשים במעקב',
  insFactWeeks: 'שבועות במעקב',
  insFactDays: 'ימים במעקב',

  insHow1: 'כל פעימת לב מציירת את אותה צורה, והצורה שלכם היא שלכם — כמו חתימה.',
  insHow2: 'מיצענו {n} מהמדידות שלכם כדי למצוא אותה, כך שהרעש מתבטל והצורה נשארת.',
  insHow3: 'כל מדידה חדשה מונחת על הצורה הזו כדי לראות מה זז.',

  insStudyUsual: 'המדידה הזו נראית כמו המדידות הרגילות שלכם.',
  insStudySlightly: 'המדידה הזו קצת שונה מהרגיל שלכם.',
  insStudyDifferent: 'המדידה הזו בולטת מול המדידות הרגילות שלכם.',


  /* ── תעודת ה‑ECG כשכבת השוואה (v0.43.0) ─────────────────────────
     מופיעה מעל הבדיקות כי היא אינה עוד בדיקה — היא הממוצע של כולן. */
  ovIdLabel: 'הפעימה האופיינית שלכם',
  ovIdHint: 'ממוצע מכל המדידות שלכם',
  ovIdComparing: 'משווים לפעימה האופיינית שלכם',
  ovIdSection: 'איך זה מתיישר',
  ovIdExactFit: 'הפעימה האופיינית שלכם מצוירת על כל פעימה בהקלטה הזו, ולכן היא מתיישרת בדיוק — אין מה ליישר ידנית.',
  /* ⚠️ לא קישוט. הרוח מוטבעת על גלי ה‑R של הרצועה עצמה, אז הקצב שלה
     הוא הקצב שלה — מרווח שיימדד ממנה הוא המרווח של ההקלטה, פעמיים. */
  ovIdBorrowsRhythm: 'היא משאילה את התזמון של ההקלטה הזו, אז השוו את הצורה — לעולם אל תמדדו מרווח מהקו האפור.',
  ovIdCrowded: 'הפעימות כאן צפופות, ולכן כל פעימה מצוירת נחתכת בסופה — השוו את ה-QRS ולא את גל ה-T.',


  /* ── קריאת המדידה (v0.44.0) ─────────────────────────────────────
     כל מדידה, בכל פעם. היחידה נאמרת פעם אחת בלבד. */
  insRowRate: 'דופק',
  insUsually: 'בדרך כלל {v}',
  insUsuallyUnknown: 'אין עדיין ממוצע',

  /* ── המטרה השבועית (v0.44.0) ────────────────────────────────────
     המטרה היא מספר זמני התזכורת שהמטופל הגדיר — אין הגדרה שנייה. */
  insGoalTitle: 'השבוע',
  insGoalNone: 'הגדירו זמני תזכורת כדי לראות מטרה שבועית.',
  insGoalMon: 'ב׳',
  insGoalTue: 'ג׳',
  insGoalWed: 'ד׳',
  insGoalThu: 'ה׳',
  insGoalFri: 'ו׳',
  insGoalSat: 'ש׳',
  insGoalSun: 'א׳',

  insTimelineTitle: 'התאמה לאורך זמן',
  insBaselineTitle: 'קו הבסיס שלכם',
  insDriftTitle: 'שינוי מאז שהתחלתם',
  insDriftPerYear: '{v} {unit}/שנה',
  /* למה זה לא הסעיף שמעליו. שניהם מציגים הבדלים; רק אחד מהם הוא אירוע. */
  insDriftMeaning:
    'כמה קו הבסיס שלכם זז מאז הבדיקות הראשונות. שינוי איטי לאורך חודשים הוא רגיל — הקצב הוא החלק ששווה לעקוב אחריו.',
  insCadenceTitle: 'מתי אתם מודדים',
  insCadenceStudies: '{n} בדיקות',
  insCadencePerWeek: '{n} בשבוע',
  insCadenceStreak: '{n} שבועות ברצף',
  insCadenceGap: 'ההפסקה הארוכה ביותר {n} ימים',
  insCadenceLast: 'לפני {n} ימים',
  insCadenceToday: 'הוקלטה היום',
  insCadenceBusiest: 'לרוב בין {from}:00 ל‑{to}:00',

  /* תוויות צ׳יפים — קצרות בכוונה; השמות המלאים לא נכנסים. */
  insDevShape: 'צורה',
  insDevBand: 'מחוץ לטווח',
  insDevAmplitude: 'משרעת',
  insDevQrs: 'QRS',
  insDevQtc: 'QTc',
  insDevPr: 'PR',
  insDevAxis: 'ציר',
  insDevRate: 'קצב',
  insDevLeads: '{n} לידים',
  insSevWatch: 'הפרש קטן',
  insSevMarked: 'הפרש גדול',

  insExSimulated: 'סימולציה — לא נספרת',
  insExFewBeats: 'מעט מדי פעימות נקיות',
  insExLowQuality: 'האות אינו יציב מספיק',
  insExOutlier: 'אינה תואמת את שאר הבדיקות שלכם',
  insExcludedShort: 'לא נספרה',

  insDisclaimer:
    'השוואה להקלטות הקודמות של האדם עצמו, לא לאוכלוסייה. אינה אבחנה ואינה מחליפה הערכה קלינית.',

  /* ── כלי המציג ── */
  bpm: 'BPM',
  vtCalipers: 'סרגל מדידה',
  vtCalipersHintTouch: 'שני סמנים שגוררים. הקריאה היא המרווח ביניהם.',
  vtMark: 'סימון',
  vtMarkHintTouch: 'הקישו על נקודה בכל עקבה כדי לתייג אותה.',
  vtCursor: 'סמן',
  vtCursorHintTouch: 'קווי ייחוס שמונחים על כל הלידים בבת אחת.',
  vtRPeaks: 'שיאי R',
  vtRPeaksHint: 'מסמן את הפעימות שמהן חושב הקצב.',
  vtCompare: 'השוואה מול',
  vtFilters: 'מסננים',
  vtBaseline: 'קו בסיס',
  vtBaselineHint:
    'מסיר סחיפה איטית של קו הבסיס מנשימה. כבוי מציג את הסחיפה האמיתית — וכל שינוי ST אמיתי.',
  vtNotch: '50 Hz',
  vtNotchHint: 'מסיר הפרעת רשת החשמל. כבוי מציג את האות ללא נגיעה.',
  vtSmooth: 'החלקה',
  vtSmoothHint: 'החלקת Savitzky-Golay. כבוי מציג את הפרטים החדים ביותר, ואת הרעש הרב ביותר.',
  vtFiltersOff: 'חלק מהמסננים כבויים',
  vtZoomIn: 'הגדלה (פחות זמן, גדול יותר)',
  vtZoomOut: 'הקטנה (יותר זמן)',
  vtFit: 'התאמה',
  vtLayoutStack: 'כל 6',
  /* סרגל הכלים הוא אייקונים; אלה מה שקורא־המסך מקריא, ומה שמכותרת הגיליונות
     שמאחוריהם. כל מה שצריך מילים כדי להיות כנה — שלבי הסינון, מצבי היישור —
     יושב בגיליון ולא מאחורי פיקטוגרמה שצריך לנחש.
     ההשוואה חלקה את הגיליון הזה ודווחה פעמיים כבלתי מובנת; יש לה עכשיו
     גיליון משלה (ראו CompareSheet). */
  vtMoreTools: 'מסננים',
  vtFullscreen: 'מסך מלא',
  vtExitFullscreen: 'יציאה ממסך מלא',
  ovAlignSection: 'יישור השניים לפי',
  setDone: 'סיום',

  /* ── רמזי מחווה. שורה אחת לכל אחד, בלי גלישה. ── */
  calHintTouch: 'גררו כל אחד מהסמנים · הגדילו כדי למקם במדויק',
  annHintTouch: 'הקישו על נקודה לתיוג · הקישו על תווית לעריכה · גררו כדי להזיז',
  curHintTouch: 'הקישו כדי להניח קו על כל הלידים · הקישו על קו כדי להסיר אותו',

  /* ── השוואה בין שתי הקלטות ── */
  ovNone: 'ללא השוואה',
  ovComparing: 'עקבת רפאים: {when}',
  ovModeBeat: 'פעימה 1',
  ovModeBeatHint:
    'הזזת עקבת הרפאים כך שהפעימה הראשונה שלה תשב על זו. שומרת על התזמון המקורי שלה.',
  ovModeWarp: 'יישור P-QRS-T',
  ovModeWarpHint:
    'מתיחת עקבת הרפאים בין ה-P, Q, R, S ו-T שלה כך שכל מאפיין ינחת על זה של ההקלטה הנוכחית. משווה צורה, אך הורסת את המרווחים של עקבת הרפאים — לעולם אל תמדדו על עקבה מתוחה.',
  ovModeManual: 'הזזה ידנית',
  ovModeManualHint: 'הזיזו את עקבת הרפאים בעצמכם.',
  /* התווית על ידית הגרירה הנראית. משטח גרירה בלתי נראה נקרא כפיצ׳ר שלא
     עובד — וכך בדיוק הוא דווח. */
  ovDragHandle: 'גררו כדי להזיז את העקבה האפורה',
  ovWarpApplied: 'יושר על {n} נקודות ציון — צורה בלבד, אין למדוד את עקבת הרפאים',
  ovWarpFailed: 'לא ניתן ליישר — זוהו מעט מדי פעימות',
  ovShifted: 'הוזז {ms} ms',
  ovDragHint: 'גררו את ההקלטה האפורה — לצדדים בזמן, למעלה/למטה בגובה',

  /* גיליון ההשוואה. הוא נפתח בהסבר מה העקבה האפורה, כי זו השאלה שיש לקורא
     ברגע שהיא מופיעה. */
  ovExplain:
    'הניחו הקלטה קודמת מעל הנוכחית. היא מצוירת באפור, מאחורי העקבה הנוכחית, כך ששינוי בצורה נראה כשתי העקבות מתרחקות זו מזו.',
  ovLegendThis: 'ההקלטה הזו',
  ovLegendGhost: 'ההקלטה הקודמת',
  ovPick: 'להשוות מול',
  ovNeedTwo: 'להשוואה צריך הקלטה שנייה. בצעו בדיקה נוספת והיא תופיע כאן.',
  ovMoveTitle: 'הזזת העקבה האפורה',
  ovMoveOnScreen: 'להזיז על המסך',
  ovOffset: 'הוזזה {ms} ms · {mv} mV',
  ovResetPos: 'למרכז מחדש',
  ovRemove: 'הפסקת ההשוואה',

  /* ── הערות על הרשומה ── */
  noteTitle: 'הערה קלינית',
  notePlaceholder: 'סיכום, התרשמות, או הערה למטופל…',
  noteSave: 'שמירת הערה',
  noteSaved: 'נשמר',
  noteHint: 'טקסט חופשי — לא ממצא מקודד. נשמר עם ההקלטה הזו.',
  annListTitle: 'נקודות מסומנות',
  annTitle: 'תיוג הנקודה הזו',
  annEditTitle: 'עריכת ההערה',
  annAt: 'ליד {lead} · {time} שנ׳',
  annPlaceholder: 'ההערה שלכם…',
  annAdd: 'הוספה',
  annSave: 'שמירה',
  annCancel: 'ביטול',
  annDelete: 'מחיקת הערה',
  tagPvc: 'PVC',
  tagPac: 'PAC',
  tagPause: 'עצירה',
  tagArtifact: 'ארטיפקט',
  tagNote: 'הערה',

  /* ── שמות היכולות (מטריצת ההרשאות, למסך תפקידים עתידי) ── */
  vfCalipers: 'סרגלי מדידה',
  vfFilters: 'בקרות מסננים',
  vfAnnotate: 'הערות',
  vfCompare: 'השוואת הקלטות',
  vfExportPdf: 'ייצוא PDF',
  vfExportRaw: 'ייצוא נתונים גולמיים',
  vfDelete: 'מחיקת הקלטות',

  /* ── בדיקות — מסך בחירת הבדיקה, אותו נוסח כמו בווב ── */
  testsTitle: 'הבדיקות שלי',
  testsChooseIntro: 'בחרו את הבדיקה שתרצו לבצע.',
  testsConnectHint: 'חברו את השעון כדי להתחיל בדיקה.',
  testsScheduledBadge: 'נקבע לך',
  testsSoonBadge: 'בקרוב',
  measureLimbTitle: '6 לידים של גפיים',
  measure12Title: '12 לידים מלא',
  testsLimbSub: '6 לידים · ידיים ורגליים',
  tests12Sub: '12 לידים · מלא',
  testsWatchHow: 'צפו בהסבר',
  testsVideoSoon: 'סרטון הסבר בקרוב',
  testsExplainLimb:
    'הניחו את השעון על פרק כף היד, הניחו את אותה יד על הרגל, וגעו בכתר עם היד השנייה. כך נמדדים הלידים מהידיים והרגליים.',
  testsExplain12: 'הבדיקה המלאה: קודם הלידים של הידיים והרגליים, ואז שש נקודות החזה.',
  tests12MobileNote: 'חלק החזה זמין בינתיים באפליקציית הווב.',
  testsPrevTest: 'הבדיקה הקודמת',
  testsNextTest: 'הבדיקה הבאה',
  close: 'סגירה',
  chatTitle: 'צ׳אט',
  chatEmptyBody: 'הודעות עם הצוות המטפל יופיעו כאן, באותו שרשור שאתם רואים בווב.',

  /* ══ הרשמה והתחברות ═════════════════════════════════════════════ */

  /* ── מסך פתיחה ── */
  authTagline: 'אק״ג מהבית · רמה רפואית',

  /* ── ברוכים הבאים ── */
  authWelcomeTitle: 'אק״ג ברמה קלינית,\nמוקלט מהבית.',
  authWelcomeSub: 'נגדיר את החשבון ואת הפרופיל הרפואי. זה לוקח כשתי דקות.',
  authCreateAccount: 'יצירת חשבון',
  authSignIn: 'התחברות',
  authAppleSignIn: 'התחברות עם Apple',
  authGoogleSignIn: 'התחברות עם Google',
  authLegalBefore: 'בהמשך אתם מאשרים את ',
  authLegalTerms: 'תנאי השימוש',
  authLegalAnd: ' ואת ',
  authLegalPrivacy: 'הצהרת הפרטיות',
  authLegalAfter: '. CYPHIX אינה תחליף לטיפול רפואי דחוף.',

  /* ── התחברות ── */
  authSignInTitle: 'התחברות',
  authSignInSub: 'טוב לראות אתכם שוב. המדידות שלכם מחכות.',
  authEmail: 'אימייל',
  authEmailPlaceholder: 'name@example.com',
  authPassword: 'סיסמה',
  authPasswordPlaceholder: '••••••••',
  authShow: 'הצגה',
  authHide: 'הסתרה',
  authForgot: 'שכחתם סיסמה?',
  authUseFaceId: 'כניסה עם Face ID',
  authUseTouchId: 'כניסה עם Touch ID',
  authUseBiometrics: 'כניסה בזיהוי ביומטרי',

  /* ── נעילת האפליקציה ── */
  lockSubtitle: 'לפתיחת התיק הרפואי שלך',
  lockUnlock: 'פתיחה',
  lockPrompt: 'פתיחת CYPHIX',
  lockSignOut: 'כניסה עם חשבון אחר',

  /* ── רצועת החיבור ── */
  connOffline: 'לא מקוון · מוצג מידע שמור',
  connConnecting: 'מתחבר ל‑CYPHIX…',
  authBiometricPrompt: 'פתיחת CYPHIX',
  authBack: 'חזרה',

  /* ── איפוס סיסמה ── */
  authResetTitle: 'איפוס סיסמה',
  authResetSub: 'הזינו את כתובת האימייל של החשבון. נשלח קישור לאיפוס שתקף ל‑30 דקות.',
  authResetSent: 'אם קיים חשבון עם הכתובת הזו, קישור בדרך. בדקו גם בתיקיית הספאם.',
  authSendReset: 'שליחת קישור לאיפוס',

  /* ── יצירת חשבון ── */
  authSignUpTitle: 'יצירת חשבון',
  authSignUpStep: 'שלב 1 מתוך 3 · פרטי כניסה',
  authFullName: 'שם מלא',
  authNamePlaceholder: 'ישראל ישראלי',
  authPasswordHint: 'לפחות {n} תווים',
  authStrengthNone: '—',
  authStrengthWeak: 'חלשה',
  authStrengthFair: 'בינונית',
  authStrengthStrong: 'חזקה',
  authContinue: 'המשך',
  authSignInInstead: 'להתחברות במקום',

  /* ── טלפון ── */
  authPhoneTitle: 'מספר הטלפון שלכם',
  authPhoneSub: 'שלב 2 מתוך 3 · משמש לאימות הזהות וליצירת קשר עם איש הקשר לחירום.',
  authSendCode: 'שליחת קוד',
  authDelete: 'מחיקה',
  authCountryCode: 'קידומת {code}. הקישו לשינוי.',
  authPhoneEntered: 'המספר שהוזן: {phone}',

  /* ── קוד אימות ── */
  authOtpTitle: 'הזינו את הקוד בן 6 הספרות',
  authOtpSub: 'נשלח אל {phone}.',
  authOtpEntered: 'הוזנו {n} מתוך {total} ספרות',
  authResendIn: 'אפשר לבקש קוד חדש בעוד {clock}',
  authResendNow: 'שליחת קוד חדש',
  authVerify: 'אימות',
  authDemoCode: 'גרסת הדגמה — לא נשלחת הודעת SMS. השתמשו בקוד הזה:',

  /* ── פרופיל רפואי ── */
  authStepOf: 'שלב {n} מתוך {total}',
  authSkip: 'דילוג',
  authOptional: 'רשות',

  authSexTitle: 'מה המין שלכם?',
  authSexSub: 'ערכי הסף לפענוח אק״ג שונים בין המינים. הנתון נרשם כמין שנקבע בלידה.',
  authSexMale: 'זכר',
  authSexFemale: 'נקבה',
  authSexOther: 'אחר',
  authSexUnknown: 'לא צוין',

  authHeightTitle: 'הגובה שלכם',
  authHeightSub: 'משמש יחד עם המשקל לכיול קריטריוני המתח באק״ג.',
  authHeightValueA11y: '{value} סנטימטרים',
  authWeightTitle: 'המשקל שלכם',
  authWeightSub: 'עכבת האלקטרודות מכוילת ביחס למסת הגוף.',
  authWeightValueA11y: '{value} קילוגרמים',
  authUnitCm: 'ס״מ',
  authUnitFt: 'רגל',
  authUnitKg: 'ק״ג',
  authUnitLb: 'ליב׳',
  authUnitCmLong: 'ס״מ',
  authUnitKgLong: 'ק״ג',
  authUnitLbLong: 'ליב׳',

  authBloodTitle: 'סוג דם',
  authBloodSub: 'מוצג בכרטיס החירום שלכם. אם אינכם בטוחים — השאירו ריק, לעולם אל תנחשו.',
  authBloodUnknown: 'איני יודע/ת את סוג הדם שלי',
  authBloodUnknownShort: 'לא ידוע',

  authEmergencyTitle: 'איש קשר לחירום',
  authEmergencySub: 'יקבל התראה עם המיקום שלכם אם מדידה מזהה קצב מסוכן.',
  authEcName: 'שם',
  authEcNamePlaceholder: 'דנה ישראלי',
  authEcPhone: 'טלפון',
  authEcPhonePlaceholder: '+972 50 000 0000',
  authEcRelation: 'קרבה',
  authEcNote: 'עדכנו אותו שהוא איש הקשר שלכם לחירום — שיחה מאפליקציה היא היכרות ראשונה לא מוצלחת.',
  authRelPartner: 'בן/בת זוג',
  authRelParent: 'הורה',
  authRelSibling: 'אח/ות',
  authRelFriend: 'חבר/ה',
  authRelDoctor: 'רופא/ה',

  authPhotoTitle: 'תמונת פרופיל',
  authPhotoSub: 'עוזרת לצוות הרפואי לוודא שהם צופים בתיק הנכון.',
  authPhotoPreviewA11y: 'תמונת הפרופיל שלכם',
  authTakePhoto: 'צילום',
  authUpload: 'העלאה',
  authPhotoDenied: 'ל‑CYPHIX אין גישה למצלמה או לתמונות. אפשר לאשר בהגדרות הטלפון, או לבחור צבע למטה במקום.',
  authAvatarColour: 'או בחרו צבע לתמונה',
  authAvatarColourN: 'צבע {n}',

  /* ── סיכום ── */
  authReviewKicker: 'סיכום',
  authReviewTitle: 'בדקו את הפרטים',
  authReviewComplete: 'הכול מולא. אפשר לשנות כל פרט בהמשך בהגדרות.',
  authReviewGaps: 'דילגתם על {list}. אפשר להוסיף בכל עת בהגדרות.',
  authConfirm: 'אישור וסיום',
  authEdit: 'עריכה',
  authAdd: 'הוספה',
  authSkipped: 'דולג',
  authNotSet: 'לא הוגדר',
  authDataNote: 'הנתונים הרפואיים נשמרים במכשיר הזה ומשותפים רק עם אנשי צוות רפואי שאתם מאשרים.',
  authSumName: 'שם',
  authSumPhone: 'טלפון',
  authSumSex: 'מין',
  authSumHeight: 'גובה',
  authSumWeight: 'משקל',
  authSumBlood: 'סוג דם',
  authSumEmergency: 'איש קשר לחירום',

  /* ── סיום ── */
  authSuccessTitle: 'הפרופיל נוצר',
  authSuccessSub: 'חברו את מכשיר CYPHIX כדי להקליט את בדיקת הגפיים הראשונה שלכם.',
  authPairDevice: 'חיבור המכשיר',
  authLater: 'אחר כך',

  /* ── שגיאות ── */
  authErrEmailTaken: 'כבר קיים חשבון עם הכתובת הזו.',
  authErrInvalidCredentials: 'האימייל והסיסמה אינם תואמים לחשבון קיים.',
  authErrWeakPassword: 'הסיסמה קצרה מדי.',
  authErrNetwork: 'אין חיבור. בדקו את הרשת ונסו שוב.',
  authErrUnknown: 'משהו השתבש. נסו שוב.',
  authErrWrongCode: 'הקוד אינו תואם. בדקו ונסו שוב.',

  /* ══════════════════════════════════════════════════════════════════
     פענוח (טאב הפענוח).

     ★ כלל הניסוח לבלוק הזה שונה משאר האפליקציה: משפטים קצרים, בלי מונח
     לועזי בלי תרגום, ובלי משפט שדורש קריאה שנייה. אדם פותח את המסך הזה
     כדי לענות על שאלה אחת — "אני בסדר, או שאני צריך לעשות משהו?" — וייתכן
     שהוא מפוחד בזמן הקריאה. כל שורה כאן היא או התשובה או עובדה שתומכת בה.

     המספרים (PR, QTc, mV) אינם מתורגמים — אלה סמלים בינלאומיים זהים בכל
     שפה, ותרגום שלהם היה מנתק את הדוח מדוח בית חולים.
     ══════════════════════════════════════════════════════════════════ */

  reportTabScreening: 'פענוח',

  scrLevelClear: 'לא נמצא ממצא חריג',
  scrActClear: 'אין צורך בפעולה.',
  scrLevelAttention: 'כדאי להראות לרופא',
  scrActAttention: 'לא דחוף. קחו את זה לביקור הבא.',
  scrLevelUrgent: 'פנו לעזרה רפואית עכשיו',
  scrActUrgent: 'התקשרו למוקד החירום או גשו לחדר מיון.',
  scrLevelInconclusive: 'לא ניתן לפענח',
  scrActInconclusive: 'האות היה רועש מדי לסריקה. מדדו שוב.',

  scrFindingsTitle: 'מה נמצא',
  scrBlindTitle: 'מה הבדיקה הזו לא רואה',
  scrStatsTitle: 'המספרים',
  scrEvidenceTitle: 'נמדד',
  scrChecksLine: '{done} מתוך {total} בדיקות בוצעו',
  scrDisclaimer: 'זו תוצאת סריקה, לא אבחנה. רק רופא יכול לאבחן מחלת לב.',

  scrSimTitle: 'אות הדגמה',
  scrSimBody: 'ההקלטה הזו הגיעה מהסימולטור המובנה, לא מלב. היא אינה נסרקת.',

  scrConfHigh: 'ברור',
  scrConfModerate: 'סביר',
  scrConfLimited: 'אפשרי',

  scrCatRate: 'קצב',
  scrCatRhythm: 'מקצב',
  scrCatConduction: 'הולכה',
  scrCatRepolarisation: 'התאוששות',
  scrCatAxis: 'כיוון',
  scrCatChamber: 'מדורי הלב',
  scrCatIschaemia: 'אספקת דם',
  scrCatOther: 'אחר',
  scrCatTechnical: 'ההקלטה',

  scrBlindAnteriorSeptal: 'הדופן הקדמית של הלב — לשם כך נדרשות אלקטרודות חזה.',
  scrBlindPosterior: 'הדופן האחורית — לשם כך נדרשות אלקטרודות נוספות.',
  scrBlindChamberPrecordial: 'הערכת גודל מלאה של מדורי הלב — אלקטרודות חזה מודדות זאת.',
  scrBlindParoxysmal: 'כל דבר שבא והולך. עשר שניות הן תצלום רגע.',
  scrBlindSingleTimepoint: 'שינוי לאורך זמן. הקלטה אחת אינה מגמה.',

  scrStatChecks: 'בדיקות שבוצעו',
  scrStatBeats: 'פעימות שנותחו',
  scrStatEctopy: 'פעימות נוספות',
  scrStatQuality: 'איכות האות',
  scrStatRate: 'דופק',
  scrStatDuration: 'משך ההקלטה',

  /* ── ממצאים: קצב ── */
  scrF_bradycardiaSevere: 'דופק איטי מאוד',
  scrM_bradycardiaSevere: 'פחות מ־40 פעימות בדקה.',
  scrF_bradycardia: 'דופק איטי',
  scrM_bradycardia: 'שכיח אצל ספורטאים. יכול גם להיות סימן.',
  scrF_tachycardia: 'דופק מהיר',
  scrM_tachycardia: 'מתח, קפאין, חום ותנועה גורמים לזה.',
  scrF_tachycardiaExtreme: 'דופק מהיר מאוד',
  scrM_tachycardiaExtreme: 'מעל 150 במנוחה מחייב בדיקה.',

  /* ── ממצאים: מקצב ── */
  scrF_atrialFibrillation: 'דפוס פרפור פרוזדורים',
  scrM_atrialFibrillation: 'קצב לא סדיר שמעלה את הסיכון לשבץ. יש לו טיפול.',
  scrF_atrialFlutter: 'דפוס רפרוף פרוזדורים',
  scrM_atrialFlutter: 'קצב מהיר וסדיר במדורים העליונים.',
  scrF_svt: 'קצב מהיר ממקור מעל החדרים',
  scrM_svt: 'הוא מתחיל בחלק העליון של הלב.',
  scrF_wideComplexTachycardia: 'קצב מהיר עם פעימות רחבות',
  scrM_wideComplexTachycardia: 'מטופל כאילו מקורו בחדרים עד שרופא שולל זאת.',
  scrF_ectopyFrequent: 'פעימות נוספות תכופות',
  scrM_ectopyFrequent: 'פעימות רבות הגיעו מוקדם מהצפוי.',
  scrF_ectopyOccasional: 'כמה פעימות נוספות',
  scrM_ectopyOccasional: 'נפוץ מאוד, ולרוב לא מזיק.',
  scrF_irregularRhythm: 'קצב לא סדיר',
  scrM_irregularRhythm: 'המרווחים בין הפעימות השתנו.',
  scrF_pause: 'הפסקה בין פעימות',
  scrM_pause: 'מרווח אחד היה ארוך משתי שניות.',
  scrF_pauseLong: 'הפסקה ארוכה בין פעימות',
  scrM_pauseLong: 'מרווח אחד היה ארוך משלוש שניות.',

  /* ── ממצאים: הולכה ── */
  scrF_avBlock1: 'חסם AV מדרגה ראשונה',
  scrM_avBlock1: 'האות מגיע למדורים התחתונים לאט מהרגיל.',
  scrF_avBlock1Marked: 'חסם AV מדרגה ראשונה, בולט',
  scrM_avBlock1Marked: 'עיכוב ארוך בין המדורים העליונים לתחתונים.',
  scrF_avBlock2Suspected: 'ייתכן שפעימה נשמטה',
  scrM_avBlock2Suspected: 'נראה שפעימה אחת חסרה ברצף.',
  scrF_avBlockCompleteSuspected: 'ייתכן חסם לב מלא',
  scrM_avBlockCompleteSuspected: 'איטי וסדיר, והמדורים העליונים אינם מסונכרנים.',
  scrF_ivcd: 'פעימות רחבות מעט',
  scrM_ivcd: 'האות עובר בחדרים מעט לאט.',
  scrF_bbbLeftPattern: 'דפוס חסם צרור שמאלי',
  scrM_bbbLeftPattern: 'כדי לאשר איזה צרור מעורב נדרשות אלקטרודות חזה.',
  scrF_bbbRightPattern: 'דפוס חסם צרור ימני',
  scrM_bbbRightPattern: 'כדי לאשר איזה צרור מעורב נדרשות אלקטרודות חזה.',
  scrF_bbbIndeterminate: 'פעימות רחבות',
  scrM_bbbIndeterminate: 'רחבות, בלי דפוס ימני או שמאלי ברור.',
  scrF_lafb: 'חסם פאסיקולרי קדמי שמאלי',
  scrM_lafb: 'ענף הולכה קטן חסום. לרוב לא מזיק בפני עצמו.',
  scrF_lpfb: 'חסם פאסיקולרי אחורי שמאלי',
  scrM_lpfb: 'לא שכיח. רופא צריך לאשר את זה.',

  /* ── ממצאים: התאוששות ── */
  scrF_qtLong: 'מרווח QT ארוך',
  scrM_qtLong: 'הלב מתאפס לאט מהרגיל. תרופות מסוימות גורמות לזה.',
  scrF_qtLongSevere: 'מרווח QT ארוך מאוד',
  scrM_qtLongSevere: 'זה מעלה את הסיכון להפרעת קצב מסוכנת.',
  scrF_qtShort: 'מרווח QT קצר',
  scrM_qtShort: 'לא שכיח. כדאי שרופא יסתכל על זה.',
  scrF_tInversionInferior: 'גלי T הפוכים, לידים תחתונים',
  scrM_tInversionInferior: 'יכול להיות ישן, תנוחתי או חדש. רופא מבדיל ביניהם.',
  scrF_tInversionLateral: 'גלי T הפוכים, לידים צדדיים',
  scrM_tInversionLateral: 'יכול להיות ישן, תנוחתי או חדש. רופא מבדיל ביניהם.',

  /* ── ממצאים: כיוון ── */
  scrF_axisLeft: 'כיוון אות נוטה שמאלה',
  scrM_axisLeft: 'הכיוון שבו נע האות בלב. לרוב תקין לגמרי.',
  scrF_axisRight: 'כיוון אות נוטה ימינה',
  scrM_axisRight: 'הכיוון שבו נע האות בלב. לרוב תקין לגמרי.',
  scrF_axisExtreme: 'כיוון אות חריג',
  scrM_axisExtreme: 'מחוץ לטווח הרגיל.',

  /* ── ממצאים: מדורי הלב ── */
  scrF_lvhVoltage: 'דפוס שריר לב מעובה',
  scrM_lvhVoltage: 'המתח מרמז על כך. בדיקת אקו היא זו שמאשרת.',
  scrF_raEnlargement: 'דפוס מדור ימני-עליון מוגדל',
  scrM_raEnlargement: 'גל ה־P גבוה מהרגיל.',

  /* ── ממצאים: אספקת דם ── */
  scrF_stElevationInferior: 'הרמת ST, דופן תחתונה',
  scrM_stElevationInferior: 'הדפוס הזה יכול להעיד על התקף לב שמתרחש עכשיו.',
  scrF_stElevationLateral: 'הרמת ST, דופן צדדית',
  scrM_stElevationLateral: 'הדפוס הזה יכול להעיד על התקף לב שמתרחש עכשיו.',
  scrF_stDepressionInferior: 'שקיעת ST, דופן תחתונה',
  scrM_stDepressionInferior: 'יכול להעיד שחלק מהשריר מקבל פחות דם.',
  scrF_stDepressionLateral: 'שקיעת ST, דופן צדדית',
  scrM_stDepressionLateral: 'יכול להעיד שחלק מהשריר מקבל פחות דם.',
  scrF_qWavesInferior: 'גלי Q, דופן תחתונה',
  scrM_qWavesInferior: 'יכול להיות צלקת מהתקף לב ישן.',
  scrF_qWavesLateral: 'גלי Q, דופן צדדית',
  scrM_qWavesLateral: 'יכול להיות צלקת מהתקף לב ישן.',

  /* ── ממצאים: אחר ── */
  scrF_hyperkalaemiaPattern: 'גלי T מחודדים',
  scrM_hyperkalaemiaPattern: 'לפעמים אשלגן גבוה בדם. בדיקת דם עונה על זה.',
  scrF_lowVoltage: 'מתח נמוך',
  scrM_lowVoltage: 'אותות קטנים בכל הלידים. יש לכך כמה סיבות.',
  scrF_electricalAlternans: 'גודל הפעימה מתחלף',
  scrM_electricalAlternans: 'גובה הפעימה עולה ויורד, כל פעימה שנייה.',

  /* ── ממצאים: ההקלטה ── */
  scrF_leadReversal: 'ייתכן שהאלקטרודות הוחלפו',
  scrM_leadReversal: 'בדקו את אלקטרודות הידיים ומדדו שוב. לעיתים נדירות זו תנוחת הלב.',

  /* ══════════════════════════════════════════════════════════════════
     מסך ההסבר — "למה זה צהוב?"

     ★ כלל הניסוח כאן מחמיר מכל מקום אחר באפליקציה, והוא נולד מתגובה
     אמיתית לגרסה הראשונה: "אני מסתכל על זה ואין לי מושג על מה אתה מדבר.
     אני בתור מישהו בריא רואה את זה ונלחץ." זה הבריף. כל שורת scrCause_
     נכתבה עבור אדם בלי רקע רפואי שקורא אותה כשהוא מפוחד:

       · שום מונח לא מופיע בלי שנאמר קודם במילים רגילות
       · ההסבר הרגיל בא לפני ההסבר החמור, כי הוא גם הסביר יותר,
         וקריאה שלו ראשון היא מה שעוצר את הבהלה
       · שום דבר לא מרוכך עד לחוסר משמעות — "זה יכול להעיד על התקף לב
         שמתרחש עכשיו" נשאר, כי זה נכון וזו כל מטרת המסך
     ══════════════════════════════════════════════════════════════════ */

  scrWhyButton: 'למה?',
  scrWhyTitle: 'למה זה סומן',
  scrWhyMeasured: 'מה מדדנו',
  scrWhyYours: 'שלך',
  scrWhyNormal: 'רגיל',
  scrWhyMeaning: 'מה זה אומר',
  scrWhyCause: 'למה זה קורה',
  scrWhyEvidence: 'מתוך ההקלטה שלך',
  scrWhySource: 'הקריטריון',
  scrWhyBorderline: 'רק במעט מעבר לגבול — זה לא שינה את התוצאה שלך.',
  scrClose: 'סגירה',

  scrFocus_p: 'הגבנון הקטן שלפני כל פעימה — החדרים העליונים נדלקים.',
  scrFocus_pr: 'המרווח בין הגבנון הקטן לקוץ הגדול — כמה זמן לוקח לאות לרדת למטה.',
  scrFocus_qrs: 'הקוץ הגדול — חדרי השאיבה הראשיים נדלקים.',
  scrFocus_st: 'המקטע השטוח מיד אחרי הקוץ — שם מתגלה בעיה באספקת הדם.',
  scrFocus_t: 'הגל המעוגל שאחרי הקוץ — הלב מתאפס.',
  scrFocus_qt: 'מהקוץ ועד סוף הגל המעוגל — מחזור ההצתה וההתאפסות המלא.',
  scrFocus_rhythm: 'המרווחים בין הפעימות לאורך כל ההקלטה.',
  scrFocus_none: 'האופן שבו ההקלטה עצמה נלקחה.',

  scrCause_bradycardiaSevere: 'הלב שלך פעם פחות מ-40 פעמים בדקה. אצל אנשים מאוד מאומנים הדופק איטי, אבל זה איטי יותר ממה שכושר מסביר — זה יכול להיות גם קוצב הלב הטבעי שמתעייף, או תרופה שמאטה יותר מדי.',
  scrCause_bradycardia: 'דופק איטי במנוחה הוא נורמלי אצל ספורטאים ובשינה — לב חזק מזיז יותר דם בכל פעימה, אז הוא צריך פחות. זה יכול לבוא גם מחוסמי בטא או מבלוטת תריס תת-פעילה, ולכן שווה להזכיר.',
  scrCause_tachycardia: 'דופק מהיר במנוחה הוא כמעט תמיד תגובה למשהו ולא בעיה בפני עצמה: מתח, קפאין, כאב, חום, התייבשות, או פשוט תנועה רגע לפני המדידה.',
  scrCause_tachycardiaExtreme: 'מעל 150 פעימות בדקה במנוחה, הלב בדרך כלל לא רק מגיב למשהו — לרוב יש קצר חשמלי שמניע אותו. הוא גם מקבל פחות זמן להתמלא בין פעימות.',
  scrCause_atrialFibrillation: 'החדרים העליונים הפסיקו לפעום בצורה מסודרת והתחילו לרטוט, אז החדרים התחתונים מקבלים זרם אקראי של אותות במקום קצוב. דם נאגר במקום להידחף, ולכן זה מעלה סיכון לשבץ. זה נפוץ, ויש לזה טיפול טוב.',
  scrCause_atrialFlutter: 'האות בחדרים העליונים מסתובב בלולאה במקום לעבור פעם אחת ולהיעצר. הלולאה רצה מהר מאוד, ושער נמוך יותר מעביר רק כל פעימה שנייה — ולכן הדופק יוצא מהיר אבל מאוד סדיר.',
  scrCause_svt: 'קצב מהיר וסדיר שמתחיל מעל חדרי השאיבה הראשיים, בדרך כלל מאות שמצא קיצור דרך והולך במעגל. לרוב הוא מתחיל ונעצר בפתאומיות, וניתן לטפל בו היטב.',
  scrCause_wideComplexTachycardia: 'הפעימות גם מהירות וגם רחבות מהרגיל, וזה מה שקורה כשהאות מתחיל בחדרי השאיבה הראשיים במקום לרדת בחיווט הרגיל. זה הדפוס שרופאים מטפלים בו קודם ושואלים שאלות אחר כך.',
  scrCause_ectopyFrequent: 'פעימות נוספות נדלקו מוקדם, לפני התור שלהן. כמעט לכל אחד יש כאלה. מה שהופך את אלה לראויות לציון הוא הכמות — מספר גבוה לאורך זמן יכול בהדרגה לעייף את הלב.',
  scrCause_ectopyOccasional: 'פעימה או שתיים הגיעו מוקדם. זה אחד הדברים הנפוצים ביותר בכל ECG, לרוב האנשים יש את זה, וזה מה שמרגישים כדילוג או כחבטה. בפני עצמו זה לא אומר כלום.',
  scrCause_irregularRhythm: 'המרווחים בין הפעימות שלך לא היו אחידים. הסיבה הרגילה תקינה לגמרי: הלב מאיץ מעט בשאיפה ומאט בנשיפה. זה בולט במיוחד אצל צעירים ומאומנים ומעיד על מערכת עצבים בריאה.',
  scrCause_pause: 'היה מרווח של יותר משתי שניות בין פעימות. הפסקות קצרות קורות בשינה ואצל אנשים מאוד מאומנים. ארוכות או חוזרות יכולות להעיד שקוצב הלב הטבעי מדלג.',
  scrCause_pauseLong: 'הלב שלך עבר יותר משלוש שניות בלי פעימה. מרווח כזה יכול לגרום לתחושת עילפון או להתעלפות ממש, ולכן צריך לבדוק ולא להמתין.',
  scrCause_avBlock1: 'האות מהחדרים העליונים לתחתונים לוקח יותר זמן מהרגיל לעבור — כמו שליח מעט איטי. כל פעימה עדיין מגיעה. זה נפוץ עם הגיל, אצל ספורטאים, ועם תרופות מסוימות.',
  scrCause_avBlock1Marked: 'העיכוב בין החדרים העליונים לתחתונים ארוך מספיק כדי שהשניים כבר לא יעבדו מסונכרנים, וזה יכול לעלות ללב חלק מהיעילות שלו. עדיין כל פעימה מגיעה — היא פשוט מגיעה מאוחר.',
  scrCause_avBlock2Suspected: 'נראה שפעימה אחת הלכה לאיבוד: החדרים העליונים נדלקו, והאות לא הצליח לעבור לתחתונים באותה פעם. לפעמים זה לא מזיק, לפעמים זו ההתחלה של משהו שידרוש קוצב — כדי להבדיל צריך הקלטה ארוכה יותר.',
  scrCause_avBlockCompleteSuspected: 'נראה שהחדרים העליונים והתחתונים הפסיקו לדבר ביניהם, אז התחתונים פועמים בקצב גיבוי משלהם. גיבויים איטיים ולא אמינים לגמרי, ולכן צריך לבדוק את זה ולא להמתין.',
  scrCause_ivcd: 'האות לוקח קצת יותר זמן מהרגיל להתפשט בחדרי השאיבה הראשיים. זה עיכוב קטן — לא מספיק כדי לזהות נתיב חסום מסוים, אבל מספיק כדי לציין.',
  scrCause_bbbLeftPattern: 'אחד משני כבלי החשמל הראשיים לחדרי השאיבה נראה חסום, אז האות צריך ללכת בדרך הארוכה והפעימה יוצאת רחבה. כדי לאשר איזה כבל צריך אלקטרודות חזה שאין בבדיקה הזו.',
  scrCause_bbbRightPattern: 'אחד משני כבלי החשמל הראשיים לחדרי השאיבה נראה חסום, אז צד אחד מסיים באיחור והפעימה יוצאת רחבה. הגרסה הימנית נמצאת לעיתים קרובות אצל אנשים בריאים. לאישור צריך אלקטרודות חזה.',
  scrCause_bbbIndeterminate: 'הפעימות רחבות מהרגיל, אז האות עושה עיקוף איפשהו — אבל הצורה לא אומרת בבירור באיזה צד. ECG מלא עם אלקטרודות חזה כן היה אומר.',
  scrCause_lafb: 'אחד הענפים הקטנים של החיווט בלב לא מוליך, אז האות מגיע לחלק מהשריר בדרך קצת ארוכה יותר. זה משנה את הכיוון של הפעימה בלי לשנות את הלב עצמו, ובפני עצמו לרוב לא מזיק.',
  scrCause_lpfb: 'נראה שענף קטן בחיווט של הלב לא מוליך. זה לא שכיח, ואת אותה תמונה מייצרים הרבה יותר פעמים מבנה גוף רזה רגיל או צד ימין של הלב שעובד קשה — ולכן רופא צריך לאשר את זה ולא האפליקציה.',
  scrCause_qtLong: 'אחרי כל פעימה הלב לוקח רגע להתאפס לפני שהוא יכול לפעום שוב, ואצלך זה לוקח יותר זמן מהרגיל. הסיבה הנפוצה ביותר בהפרש גדול היא תרופה — הרבה תרופות רגילות עושות את זה, כולל אנטיביוטיקות ותרופות נוגדות דיכאון מסוימות. גם אשלגן או מגנזיום נמוכים.',
  scrCause_qtLongSevere: 'זמן ההתאפסות אחרי כל פעימה ארוך מאוד. זה חשוב כי במהלך ההתאפסות הלב פגיע, וחלון ארוך מספיק מאפשר להפרעת קצב מסוכנת להתחיל. תרופות הן הסיבה הנפוצה ביותר, והפסקת התרופה הנכונה בדרך כלל פותרת את זה — ולכן שווה לפעול היום.',
  scrCause_qtShort: 'הלב מתאפס מהר מהרגיל אחרי כל פעימה. לא שכיח. זה יכול לנבוע מיותר מדי סידן בדם או מתרופות מסוימות, ובדיקת דם מסדרת את זה מהר.',
  scrCause_tInversionInferior: 'הגל שבו הלב מתאפס מצביע כלפי מטה בלידים שמסתכלים על תחתית הלב. זה יכול להיות ישן, יכול לנבוע ממבנה הגוף או מהתנוחה, ויכול להיות חדש — הדרך היחידה לדעת היא להשוות להקלטה קודמת, וזו עבודה של רופא.',
  scrCause_tInversionLateral: 'גל ההתאפסות מצביע כלפי מטה בלידים שמסתכלים על צד הלב. כמו בכל שינוי בגל T, האם זה משמעותי תלוי כמעט לגמרי בשאלה אם זה חדש — ולכך צריך ECG ישן להשוואה.',
  scrCause_axisLeft: 'זה מתאר את הכיוון הכללי שבו האות החשמלי נע בלב שלך, לא בעיה בו. הוא נוטה שמאלה אצל המון אנשים בריאים לגמרי, ויותר עם הגיל ועם מבנה גוף מלא יותר.',
  scrCause_axisRight: 'זה הכיוון הכללי שבו האות נע בלב שלך. נטייה ימינה תקינה אצל אנשים גבוהים, רזים וצעירים ואצל ילדים. כשזה כן משמעותי, לרוב זה אומר שצד ימין של הלב עובד קשה יותר מכפי שצריך.',
  scrCause_axisExtreme: 'האות נע בכיוון לא רגיל — למעלה וימינה. הסיבה הנפוצה ביותר בהפרש גדול היא שאלקטרודות הידיים הוחלפו, אז שווה פשוט למדוד שוב לפני שמסיקים משהו.',
  scrCause_lvhVoltage: 'האות החשמלי מחדר השאיבה הראשי גדול מהרגיל, וזה יכול להעיד שדופן השריר שלו התעבתה — בדרך כלל משנים של לחץ דם גבוה. אבל גם בית חזה רזה גורם לאותות להיראות גדולים, והבדיקה הזו לא יכולה להבדיל. בדיקת אקו לב כן יכולה, בקלות.',
  scrCause_raEnlargement: 'הגבנון בתחילת כל פעימה גבוה מהרגיל, וזה מה שהחדר הימני-עליון מייצר כשהוא מוגדל או עובד נגד לחץ. זה בדרך כלל מצביע על הריאות ולא על הלב.',
  scrCause_stElevationInferior: 'המקטע השטוח אחרי כל פעימה מורם בלידים שמסתכלים על תחתית הלב. זה הדפוס של עורק שנחסם ממש עכשיו, עם שריר שמתחיל למות. יש לזה גם סיבות אחרות ולא מזיקות — אבל זה לא משהו להמתין איתו, כי אם זו האפשרות החמורה, כל דקה קובעת.',
  scrCause_stElevationLateral: 'המקטע השטוח אחרי כל פעימה מורם בלידים שמסתכלים על צד הלב, וזה יכול להעיד שעורק שם חסום עכשיו. יש גם סיבות לא מזיקות, אבל זה לא דפוס להמתין איתו.',
  scrCause_stDepressionInferior: 'המקטע השטוח אחרי כל פעימה נדחף מטה, וזה מה ששריר עושה כשהוא לא מקבל כמה דם שהוא מבקש. לרוב זה מופיע במאמץ ונרגע במנוחה.',
  scrCause_stDepressionLateral: 'המקטע השטוח אחרי כל פעימה נדחף מטה בלידים שמסתכלים על צד הלב — הדפוס של שריר שמבקש יותר דם ממה שהוא מקבל.',
  scrCause_qWavesInferior: 'יש חריץ כלפי מטה בתחילת הפעימה בלידים שמסתכלים על תחתית הלב. שריר מת לא מוליך חשמל, אז הליד שפונה אליו מקליט במקום את הדופן שממול — החריץ הזה יכול להיות צלקת של התקף לב, אולי כזה שלא הורגש בזמנו. זו גם צורה תקינה אצל חלק מהאנשים.',
  scrCause_qWavesLateral: 'יש חריץ כלפי מטה בתחילת הפעימה בלידים שמסתכלים על צד הלב. זה יכול להיות צלקת של התקף לב ישן, ויכול להיות שוני רגיל בצורה.',
  scrCause_hyperkalaemiaPattern: 'גל ההתאפסות אחרי כל פעימה גבוה ומחודד במקום מעוגל. הסיבה הקלאסית היא יותר מדי אשלגן בדם, שקורה עם בעיות כליה ועם תרופות מסוימות ללחץ דם. בדיקת דם אחת עונה על זה.',
  scrCause_lowVoltage: 'כל ששת המבטים על הלב שלך הקליטו אות קטן מהרגיל. הסיבות הנפוצות קשורות למה שנמצא בין הלב לחיישנים ולא ללב עצמו — מבנה גוף, אוויר בריאות, ובמקרים מסוימים נוזל סביב הלב. גם אופן העטייה של המכשיר משפיע, אז שווה למדוד שוב.',
  scrCause_electricalAlternans: 'גודל הפעימות שלך התחלף — גדולה, קטנה, גדולה, קטנה. את הדפוס הזה מייצר לב שמתנדנד פיזית בכל פעימה, מה שקורה כשהוא מוקף בנוזל. זה לא שכיח ובודקים את זה עם אקו לב.',
  scrCause_leadReversal: 'אחד המבטים על הלב שלך יצא הפוך. כמעט תמיד זה אומר שהחיישנים על יד ימין ויד שמאל היו הפוכים — תיקון של שתי שניות. לעיתים נדירות זה אומר שהלב יושב בצד השני של בית החזה, מה שלא מזיק בפני עצמו אבל שווה לדעת.',

  /* ══════════════════════════════════════════════════════════════════
     הדוח המודפס.

     הניסוח כאן מיועד לרופא ולא למטופל — זהו המסמך היחיד שנשמר בתיק, נשלח
     במייל ונקרא על ידי מי שלא היה בחדר. לכן הוא נוקב בשמות המקצועיים
     (באפליקציה "הקוץ הגדול", בדוח QRS), וכל סף מודפס לצד המקור המפורסם
     שלו — רופא שמקבל ממצא אוטומטי זכאי לדעת איזה קריטריון ייצר אותו.
     ══════════════════════════════════════════════════════════════════ */

  pdfPageEcg: 'א.ק.ג — 6 לידי גפיים',
  pdfPageInterpretation: 'פענוח אוטומטי',
  pdfPageStatistics: 'מדידות וסטטיסטיקה',
  pdfPageReference: 'כיצד לקרוא את הדוח',
  pdfPageOf: 'עמוד {n} מתוך {total}',
  pdfContinued: 'המשך',
  pdfPatient: 'מטופל',
  pdfCriterion: 'קריטריון',
  pdfBorderline: 'גבולי',
  pdfNoFindings: 'לא זוהה דפוס חריג בתחום שששת הלידים הללו יכולים לראות. יש לקרוא זאת יחד עם המגבלות שבעמוד האחרון.',
  pdfEvidenceTitle: 'נמדד',
  pdfConfidenceTitle: 'רמת ודאות',
  pdfStatsVariability: 'ציר ושונות בין פעימות',
  mRrVariation: 'שונות RR',

  pdfAxisCap: 'ציר QRS במישור החזיתי. המגזר המוצלל הוא הטווח התקין, ‎−30°‎ עד ‎+90°‎.',
  pdfPoincareCap: 'תרשים פואנקרה: כל מרווח RR מול זה שאחריו. כדור צפוף הוא קצב סדיר; מניפה מפוזרת היא מה שקצב לא סדיר מייצר.',
  pdfTachogramCap: 'מרווחי RR לפי סדר הופעתם, מול הממוצע. מראה היכן בהקלטה התרחשה השונות.',

  pdfLeadMapTitle: 'על מה מסתכלים ששת הלידים האלה',
  pdfLeadMapCap: 'לידים I, II ו-III הם שלוש צלעות המשולש של איינטהובן, שנוצר מהאלקטרודות שעל שתי הידיים והרגל השמאלית. aVR, aVL ו-aVF נגזרים מאותם שני ערוצים נמדדים. יחד הם רואים את הלב במישור החזיתי בלבד.',
  pdfWallInferior: 'הדופן התחתונה',
  pdfWallLateral: 'הדופן הצדדית (לטרלית גבוהה)',
  pdfWallNotSeen: 'הדפנות הקדמית והאחורית — אלקטרודות חזה, אינן מוקלטות כאן',
  pdfHowToTitle: 'כיצד לקרוא את גיליון הא.ק.ג',
  pdfHow1: 'מהירות נייר 25 מ"מ/שנייה והגבר 10 מ"מ/מילי-וולט. ריבוע קטן אחד הוא 40 מילישניות ברוחב ו-0.1 מילי-וולט בגובה; ריבוע גדול הוא 200 מילישניות ו-0.5 מילי-וולט.',
  pdfHow2: 'המדרגה בצד של כל ליד היא דופק כיול של 1 מילי-וולט. עליה לעמוד בגובה שני ריבועים גדולים בדיוק — אם לא, ההגבר בגיליון הזה אינו מה שהתווית אומרת.',
  pdfHow3: 'הסימונים הקצרים לאורך החלק העליון של ליד II הם שיאי ה-R שזוהו. כל קצב וכל מרווח בעמודים הבאים חושבו מהזיהויים האלה.',
  pdfHow4: 'הקלטה ארוכה מכ-7 שניות ממשיכה בגיליון הבא, ברצף זמן. שום דבר אינו נחתך.',

  /* ── משותף ── */
  back: 'חזרה',
  exit: 'יציאה',
};

// v1.20.0 — עברית לקריאת המדידה ("בדרך כלל 128") ולמטרה השבועית, מפתח מול
//           מפתח עם en.ts.
// v1.19.0 — עברית להשוואה מול הפעימה האופיינית של המטופל: שורת הבחירה, שורת
//           הסטטוס, ושני המשפטים שהמבנה מחייב — היא משאילה את התזמון של
//           ההקלטה, ובקצב מהיר כל פעימה מצוירת נחתכת.
// v1.18.0 — עברית לחצי של המטופל בתובנות, מפתח מול מפתח עם en.ts: המשפטים
//           בשפה פשוטה, שלושת המספרים המוכרים, ההסבר בשלוש שורות והמשפט
//           שמעל הצ׳יפים. לעולם לא ציון, ולעולם לא רמז לאמת מידה אוניברסלית.
// v1.17.0 — שתי מחרוזות ההתרעה הוסרו יחד עם הבאנר ששירתו — הוא דיווח "אותו
//           הבדל ב-26 בדיקות רצופות", כלומר מאז ומעולם.
// v1.16.0 — עברית לתעודת ה‑ECG v2: מספר הבדיקות האפקטיבי, שני מצבי ההתרעה,
//           סעיף הנדידה, והשורה שאומרת מה תוקן ומה בכוונה לא — מפתח מול מפתח
//           עם en.ts.
// v1.15.0 — עברית לנעילת האפליקציה ולרצועת החיבור, מפתח מול מפתח עם en.ts.
// v1.14.0 — עברית לטאב התובנות (תעודת ה‑ECG), מפתח מול מפתח עם en.ts. כללי
//           הניסוח תורגמו כ*כללים*, לא כהערה — מי שיוסיף כאן מחרוזת חדשה צריך
//           לקרוא אותם באותה שפה שבה הוא כותב.
// v1.3.0 — Hebrew for the whole signed-out flow. The clinical reasons each
//          step gives are translated as reasons, not as labels — a patient
//          declining a question must be able to read what they decline.
// v1.10.0 — profileLoadFailed: a card that did not load must say so, or empty
//           sections read as "you have no conditions and no allergies".
// v1.13.0 — Tests-tab picker copy, matching en.ts key for key. The 12-lead
//           "coming soon" line is written as a place the test DOES work, not
//           as an apology.
// v1.12.0 — setAboutMaterial, matching en.ts key for key.
// v1.11.0 — Profile-photo sheet copy, matching en.ts key for key.
// v1.3.0 — The SCREENING block, matching en.ts key for key. The measurement
//          symbols (PR, QTc, mV) stay untranslated on purpose - translating them
//          would cut the report loose from a hospital's.
// v1.2.0 — Hebrew locale (RTL); wording copied from the web locale where the
//          web already says the same sentence. Carries the comparison sheet’s
//          copy; the nudge-pad wording is gone with the pad.
