# CYPHIX — תוכנית השלמה למערכת סגורה (End-to-End Launch Plan)

> **סטטוס:** טיוטה לאישור. נכתב 2026-10-08 אחרי מיפוי מלא של
> `CYPHIX_SERVER` v0.7.1 · `CYPHIX_MEDICAL_WEB` v1.59.1 · `CYPHIX_MEDICAL_MOBILE` v0.98.0
> (runtime 0.45.0) · `CYPHIX_SHARED` v0.3.0 · `LANDING PAGE` v0.3.1.
> **שום קוד לא שונה.** המסמך הזה הוא תכנון בלבד. כל סעיף שמסומן 🔁 הוא
> *שינוי* של התנהגות קיימת ודורש אישור מפורש לפני ביצוע; כל השאר הוא *הוספה*.
>
> מוסכמות: ✅ קיים ועובד · 🟡 קיים חלקית / מזויף · ❌ חסר · 🔁 דורש שינוי (אישור) · 🚨 חור אבטחה/השקה

> **📍 נקודת השחזור — `restore-point-2026-10-08`** (tag זהה בשלושת הריפואים, נדחף ל-GitHub).
> "חוזרים לגרסה הנוכחית" = ה-tag הזה. מה הוא מצביע עליו:
>
> | ריפו | branch | commit | גרסה | פרוס |
> |---|---|---|---|---|
> | `coredex-app` (parent: mobile, shared, landing, HW, deck, תוכנית זו) | `master` | ראו `git show restore-point-2026-10-08` | mobile **0.98.0** (OTA) על runtime **0.45.0** build 17 · shared 0.3.0 · landing 0.3.1 | EAS channel `production` |
> | `cyphix-medical-web` | `main` | `2bb9f4a` | **v1.59.1** | Vercel (auto מ-`main`) |
> | `cyphix-server` | `main` | `9deffd7` | **0.7.1** | Render `cyphix-api` (auto מ-`main`), אומת: `/healthz` → `0.7.1` |
>
> **איך חוזרים:** שרת/ווב — `git revert` של ה-commits המאוחרים ל-`main` ו-push (Render/Vercel פורסים לבד), או
> `git checkout restore-point-2026-10-08` + push ל-branch. מובייל — ה-JS חוזר ב-OTA: `git checkout restore-point-2026-10-08 -- CYPHIX_MEDICAL_MOBILE CYPHIX_SHARED`
> ואז `eas update --channel production`; הבילד הנייטיבי (0.45.0) לא משתנה ולכן לא צריך חנות. DB — מיגרציות הן additive-only,
> גרסת שרת ישנה רצה על סכמה חדשה ללא rollback של DB. סודות (`MASTER_KEY`) לא נוגעים בהם בשום rollback.

---

## 0. תקציר מנהלים (מה המצב באמת)

המערכת היום היא **מוצר מטופל מצוין עם שרת רציני מאחוריו, ובלי צד מנהלי/קליני בכלל**.

| שכבה | מצב |
|---|---|
| מטופל — אפליקציה (iOS/Android) | ✅ הרשמה, מדידה, היסטוריה, ECG-ID, פרופיל, תזכורות, PDF, סנכרון offline-first |
| מטופל — ווב | ✅ אותו דבר (בלי תזכורות/Interpretation) |
| שרת | ✅ auth, הצפנה per-patient, RBAC + scoping, audit, care-links, הודעות/פניות, הקלטות |
| **רופא פרטי** | ❌ אין לו מסך אחד שעובד. בווב הוא נופל ל-`mock-0001` (403 מול שרת אמיתי). במובייל אין מצב רופא בכלל |
| **מרפאה (org)** | 🟡 קיימת רק כטבלה. נוצרת רק ב-`POST /admin/organizations` ללא UI. אין מנהל מרפאה, אין צוות, אין הזמנות |
| **בית חולים** | ❌ כלום. אין מחלקות, SSO, ייבוא, אינטגרציה |
| **מנהל-על (אתה)** | ❌ אין דשבורד. ה-API המנהלי יודע רק ליצור (users/orgs/members) ולמחוק מטופל. אין אף `GET` מנהלי, אין סטטיסטיקה, אין צפייה ב-audit |
| **חיבור מטופל↔רופא** | 🟡 השרת מלא (קוד הזמנה חד-פעמי, הסכמה, ביטול) — **אין לזה אף מסך**, לא בווב ולא במובייל |
| **פניות (Chat)** | 🟡 ווב: thread אמיתי. מובייל: טופס פנייה יפה ש**לא שולח כלום** (אין `messageApi`) — וכתוב שם במפורש |
| **מייל / SMS / Push** | ❌ אפס. אין ספק מייל, אין אימות מייל, "שכחתי סיסמה" במובייל לא עושה כלום, קוד SMS קבוע ומזויף, Push הוסר בכוונה |
| **חיוב** | ❌ אין מודל נתונים, אין תוכניות, אין מדידה |
| **משפטי / נגישות / אודות** | ❌ אין תנאי שימוש, מדיניות פרטיות, אודות, הצהרת נגישות, יצירת קשר, מחיקת חשבון עצמית, ייצוא נתונים |
| **תפעול** | 🟡 אין בדיקות, אין CI, אין ניטור/התראות, גיבוי ידני בלבד, free tier שנרדם, **demo seed פועל בפרודקשן עם סיסמה פומבית** |

**המסקנה:** כדי להיות "מערכת סגורה" צריך לבנות שלושה דברים גדולים שאינם קיימים —
**פורטל קליני** (לרופא ולמרפאה), **דשבורד מנהל-על** (הקוקפיט שלך), ו**שכבת תקשורת יוצאת**
(מייל/SMS/Push) — ולסגור כ-60 חורים קטנים שמפורטים בסעיף 4. הכול מתוכנן למטה בשלבים.

---

## 1. סימולציות — "אני מצטרף לשירות" (מה קורה היום, ואיפה זה נשבר)

### 1.1 אני מטופל שקיבל מכשיר מהרופא שלו

| צעד | היום | מה צריך |
|---|---|---|
| 1. מוריד את האפליקציה | ❌ לא בחנויות (TestFlight בלבד, build 9 לא הוגש; Android אין בכלל ב-Play) | פרסום ב-App Store + Play (דורש: privacy policy URL, מחיקת חשבון בתוך האפליקציה, צילומי מסך, סיווג רפואי) |
| 2. "צור חשבון" | ✅ אשף יפה | — |
| 3. מזין מייל | ❌ אין אימות מייל. כל מחרוזת עם @ מתקבלת | שליחת קוד/קישור אימות; חשבון במצב `unverified` עד אז |
| 4. מזין טלפון + קוד SMS | 🚨 הקוד **קבוע ומוצג על המסך** (`MOCK_SMS_CODE`) | ספק SMS אמיתי (או להסיר את השלב עד שיש) |
| 5. מאשר תנאים | 🟡 במובייל יש שורה "By continuing you agree to Terms and Privacy Notice" — **הקישורים לא מובילים לשום מקום**, ואין תיעוד של ההסכמה. בווב אין שורה כזו בכלל | מסמכי תנאים + פרטיות אמיתיים, גרסה, ושמירת `consents` בשרת (מי, מתי, איזו גרסה) |
| 6. נכנס לאפליקציה | ✅ | — |
| 7. "איך אני מתחבר לרופא שלי?" | ❌ **אין מסך**. השרת יודע לפדות קוד הזמנה (`POST /care/link`) אבל אין איפה להקליד אותו. Chat אומר "אין צוות טיפול עדיין" ונעצר | מסך "הצטרפות לרופא/מרפאה": הקלדת קוד / סריקת QR / קישור עמוק `cyphix://link/ABCD1234` + מסך הסכמה (מה הרופא יראה) |
| 8. מחבר מכשיר ומודד | ✅ | — |
| 9. פותח פנייה לרופא | 🚨 במובייל הטופס **לא שולח** (כתוב בקוד: "It must NOT be made to look successful") | `messageApi` במובייל + סנכרון סטטוס פנייה |
| 10. שוכח סיסמה | 🚨 במובייל: המסך אומר "אם הכתובת קיימת נשלח קישור" — **ולא שולח**. בווב: **אין כפתור בכלל** | מייל איפוס עם טוקן חד-פעמי (שרת) + מסכים בשני הפלטפורמות |
| 11. רוצה למחוק את החשבון | ❌ אין. רק אדמין יכול לעשות crypto-shred | מחיקה עצמית (דרישת Apple + GDPR) עם אישור במייל וחלון חרטה |
| 12. רוצה את הנתונים שלו | ❌ "Export my data — Coming soon" | ייצוא ZIP (FHIR JSON + PDF + CSV גל) |

### 1.2 אני רופא פרטי שרוצה להפעיל את זה על המטופלים שלי

| צעד | היום | מה צריך |
|---|---|---|
| 1. נכנס לאתר | 🟡 דף נחיתה "Request access" → גולל לפוטר. **אין טופס, אין מייל, אין כלום** | טופס ליד (שם, מייל, סוג: רופא/מרפאה/בי"ח) → נשמר בשרת → מופיע בדשבורד שלך |
| 2. נרשם כרופא | ❌ `POST /auth/register` יוצר **תמיד מטופל**. רופא נוצר רק ע"י אדמין ב-API ידני | מסלול "הרשמה כאיש צוות רפואי": פרטים + מספר רישיון + העלאת תעודה → סטטוס `pending_review` → אתה מאשר בדשבורד → מייל אישור |
| 3. נכנס לווב | 🚨 רואה את מסך הבית של **מטופל**, כרטיס רפואי של `mock-0001` שחוזר 403 | פורטל קליני: רשימת מטופלים, תיבת פניות, יצירת קוד הזמנה |
| 4. מצרף מטופל | ❌ אין UI ליצירת קוד | כפתור "הזמן מטופל" → קוד/QR/קישור, תוקף 7 ימים, רשימת הזמנות פתוחות |
| 5. רואה מטופל חדש שמדד | ❌ אין רשימה, אין התראה | רשימה + "לא נצפה" + מייל/Push "מטופל X הקליט" |
| 6. עונה על פנייה | 🟡 ה-thread קיים בשרת ובווב, אבל רק מצד המטופל (`useActivePatientId`) | תיבת פניות עם סטטוס `new / in-progress / answered`, תשובה, סגירה |
| 7. כותב הערה קלינית / annotation | ✅ קיים בשרת ובצופה | נגיש רק אחרי שיש בחירת מטופל |
| 8. משלם | ❌ | ראו סעיף 3 |
| 9. מבטל קשר עם מטופל | ✅ שרת (`DELETE /care/relationships/:id`) | UI |

### 1.3 אני מרפאה (3 רופאים, מזכירה) שמצטרפת

| צעד | היום | מה צריך |
|---|---|---|
| 1. יוצר מרפאה | ❌ רק אדמין ב-API. למרפאה יש **רק שם** (אין כתובת, טלפון, ח.פ, לוגו, איש קשר) | הרשמת ארגון עם פרטים מלאים; מצב `pending` עד אישורך |
| 2. מנהל מרפאה מצרף רופאים | ❌ `org_admin` קיים כ-enum, אין לו שום יכולת | מסך צוות: הזמנה במייל, תפקיד, השעיה, הסרה |
| 3. מזכירה (`technician`) | 🟡 תפקיד קיים ב-RBAC, אין דרך ליצור אותו מלבד אדמין | אותו מסך צוות |
| 4. מצרף מטופלים בכמות | ❌ קוד אחד בכל פעם, רק ע"י clinician | קודים בכמות, ייבוא CSV, "הקצאת רופא מטפל" |
| 5. רואה את כל המטופלים של המרפאה | 🟡 השרת כבר מרחיב scope לחברי org | UI |
| 6. פניות מתועלות | 🟡 השרת תומך ב-`mode=clinic` | תיבת פניות מרפאתית עם "שייך לרופא" |
| 7. מקבל חשבונית | ❌ | סעיף 3 |

### 1.4 אני בית חולים (מחלקה קרדיולוגית, 40 רופאים, מערכת מידע קיימת)

| דרישה | היום | מה צריך |
|---|---|---|
| ארגון היררכי (בי"ח → מחלקות) | ❌ `organizations` שטוח | `parent_org_id` + סוג ארגון (`private_practice / clinic / hospital / department`) |
| כניסה עם הזהות הארגונית (SSO) | ❌ | OIDC/SAML (Azure AD / Okta) — שלב מאוחר, אבל סכמת `users` צריכה `auth_provider` כבר עכשיו |
| ייבוא מטופלים ממערכת קיימת | ❌ | ייבוא CSV עם MRN + FHIR `Patient` bulk; בהמשך FHIR API יוצא (`GET /fhir/Patient`, `Observation` ל-ECG) |
| חוזה עיבוד נתונים (DPA/BAA) | ❌ אין מסמך | תבנית DPA + תיעוד "איפה הנתונים" (Neon פרנקפורט, Render פרנקפורט) |
| מכשירים בניהול מרכזי | ❌ אין טבלת מכשירים בכלל (`device_label` חופשי בהקלטה) | `devices` (serial, firmware, org, assigned_patient, last_seen) |
| דוחות ואודיט למחלקת אבטחת מידע | ❌ אין `GET` ל-audit | צפייה/ייצוא audit לפי ארגון |
| חיוב enterprise | ❌ | חוזה שנתי, לא כרטיס אשראי |

### 1.5 אני מנהל-על (אתה) — יום רגיל

| שאלה | היום | מה צריך |
|---|---|---|
| כמה מרפאות יש? כמה מטופלים לכל אחת? איזה רופא? | ❌ רק SQL ישיר ב-Neon | דשבורד (סעיף 2) |
| כמה כל מרפאה מכניסה? | ❌ אין מודל חיוב | סעיף 3 |
| פרטי מטופל | 🟡 אדמין יכול `GET /patients/:id/card` (scope = all) אבל אין UI; וזה **PHI** — דורש הצדקה ורישום | מסך מטופל לאדמין עם "סיבת צפייה" חובה (נרשם ב-audit) |
| מי נכנס מתי, מי נכשל, ניסיונות פריצה | ❌ `audit_log` לא נגיש | צופה audit עם סינון |
| בקשות רופאים חדשים לאישור | ❌ | תור אישורים |
| פניות תמיכה | ❌ | תיבת תמיכה |
| בריאות המערכת, גרסאות, שגיאות | 🟡 `/healthz` עם גרסה | עמוד סטטוס + ניטור |

---

## 2. הקוקפיט — דשבורד מנהל-על (מפרט)

### 2.1 איפה הוא חי
**המלצה:** אזור `/admin/*` בתוך `CYPHIX_MEDICAL_WEB`, מוגן ב-`ProtectedRoute allow={['admin']}` + **בדיקה בשרת** (כבר קיים: `requirePermission('settings:manage')`).
לא אפליקציה נפרדת: אותו auth, אותו RTK Query, אותו design system, ו-§8A של הווב שולט בו.
במובייל: **לא** מתוכנן דשבורד אדמין (ייכתב ב-PARITY כסטייה מכוונת: ניהול PHI מרובה מטופלים לא שייך לטלפון).

### 2.2 מסכים

| מסך | תוכן | API חדש (שרת) |
|---|---|---|
| **Overview** | כרטיסי KPI: ארגונים, רופאים, מטופלים, הקלטות (7/30 ימים), פניות פתוחות, רופאים ממתינים לאישור, הכנסה חודשית (MRR). גרף הקלטות/יום. רשימת "דורש טיפול" | `GET /admin/stats/overview` |
| **Organizations** | טבלה: שם, סוג, מטופלים, רופאים, הקלטות החודש, תוכנית, סטטוס תשלום, נוצר. לחיצה → כרטיס ארגון: פרטים, צוות, מטופלים (שמות בלבד), מכשירים, חיוב, audit של הארגון, השעיה | `GET /admin/organizations`, `GET /admin/organizations/:id`, `PATCH …` (סטטוס/תוכנית), `GET /admin/organizations/:id/members` |
| **Clinicians** | כל אנשי הצוות: שם, תפקיד, ארגון(ים), מטופלים, כניסה אחרונה, סטטוס (`pending / active / suspended`). אישור/דחייה של בקשות עם תעודה | `GET /admin/users?role=`, `PATCH /admin/users/:id` (approve/suspend/role), `POST /admin/users/:id/reset-password` |
| **Patients** | חיפוש לפי שם/מייל/MRN. שורה: שם, גיל, ארגון/רופא, הקלטות, אחרונה, סטטוס. כניסה לכרטיס מלא **רק עם "סיבת צפייה"** (מתועד ב-audit) | `GET /admin/patients?q=`, הכרטיס הקיים |
| **Requests (פניות)** | כל הפניות במערכת: מטופל, יעד, סטטוס, זמן פתוח. SLA: אדום אחרי 48 שעות | `GET /admin/requests` |
| **Devices** | serial, firmware, ארגון, מטופל, נראה לאחרונה, מצב סוללה אחרון | טבלת `devices` חדשה + `GET/POST/PATCH /admin/devices` |
| **Billing** | ראו סעיף 3: תוכניות, מנויים, חשבוניות, הכנסה לפי ארגון/חודש | `GET /admin/billing/*` |
| **Audit** | סינון לפי actor/action/resource/תאריך/outcome; ייצוא CSV | `GET /admin/audit?…` (עמודים, cap) |
| **Leads & Support** | לידים מדף הנחיתה, פניות תמיכה, סטטוס | `GET /admin/leads`, `GET /admin/support` |
| **System** | גרסאות (שרת/ווב/מובייל OTA), `/healthz`, גודל DB, גיבוי אחרון, שגיאות 5xx (24h), רשימת feature flags | `GET /admin/system` |

### 2.3 כללים
- כל קריאה מנהלית נרשמת ב-`audit_log` (`admin:read`, `admin:update`) — כולל צפייה בכרטיס מטופל עם `detail = reason`.
- הדשבורד מציג **מספרים ורשימות**; PHI נפתח רק בכרטיס מטופל ורק עם סיבה.
- Overview נבנה משאילתות ספירה (לא מפענח blobs מוצפנים) → מהיר גם ב-free tier.
- 🔁 **שאלה לאישור:** האם מנהל-על צריך לראות תוכן פניות (טקסט חופשי של מטופלים)? ברירת המחדל שלי: **לא** — רק מטא-דאטה (מי, מתי, סטטוס). הצפנת ההודעה היא per-patient בדיוק בשביל זה.

---

## 3. חיוב — כל המסלולים (מודל, בלי סליקה)

### 3.1 מסלולים אפשריים (כולם ממודלים, רק חלקם מופעלים בהשקה)

| מסלול | למי | יחידת חיוב | הערה |
|---|---|---|---|
| **A. רופא פרטי — מנוי חודשי** | clinician ללא org | ₪/חודש, כולל עד N מטופלים פעילים | ברירת מחדל להשקה |
| **B. מרפאה — לפי מושב (seat)** | org | ₪/רופא/חודש + ₪/מטופל פעיל מעל סף | |
| **C. מרפאה/בי"ח — לפי מטופל פעיל** | org | ₪/מטופל שהקליט לפחות פעם בחודש | "פעיל" = הקלטה אחת ב-30 יום |
| **D. לפי הקלטה (usage)** | org | ₪/הקלטה (עם מינימום חודשי) | מדידה כבר קיימת: `recordings.created_at` |
| **E. בית חולים — חוזה שנתי** | hospital | סכום קבוע + מכסה, חשבונית ידנית | אין כרטיס אשראי |
| **F. מטופל ישיר (B2C)** | patient standalone | ₪/חודש, או חינם עם מגבלת היסטוריה | 🔁 החלטת מוצר — האם בכלל? |
| **G. מכשיר** | כולם | רכישה / השכרה / פיקדון לכל `device` | דורש טבלת מכשירים |
| **H. ניסיון** | כולם | 30 יום חינם, אחר כך מסלול | |

### 3.2 מודל נתונים (שרת, מיגרציה חדשה — הוספה בלבד)

```
plans                (id, code, name, kind: 'seat'|'patient'|'usage'|'flat'|'b2c',
                      price_minor, currency, included_seats, included_patients,
                      per_extra_patient_minor, per_recording_minor, active)
subscriptions        (id, org_id | user_id, plan_id, status: trial|active|past_due|cancelled,
                      trial_ends_at, current_period_start/end, seats, created_at)
usage_counters       (subscription_id, period_start, active_patients, recordings, seats_used)
                      ← מחושב יומית ע"י job, לא בזמן אמת
invoices             (id, subscription_id, period, amount_minor, status: draft|issued|paid|void,
                      issued_at, paid_at, external_ref)   ← external_ref = מזהה בסולק עתידי
invoice_lines        (invoice_id, description, qty, unit_minor, total_minor)
```

- **"כמה כל מרפאה מכניסה לי"** = סכום `invoices.amount_minor` לפי `org_id` לפי חודש + תחזית מ-`usage_counters × plan`.
- סליקה (Stripe / Tranzila / Meshulam) היא **שלב נפרד ומאוחר**: בהשקה החשבוניות נוצרות, נשלחות במייל, ואתה מסמן "שולם" ידנית בדשבורד.
- כל שינוי סטטוס מנוי → `audit_log`.
- 🔁 **שאלה לאישור:** מטבע ברירת מחדל ₪ (ILS) ו-VAT 18%? (משפיע על `plans` ו-`invoices`.)

### 3.3 מה ההגבלה בפועל כשלא משלמים
`past_due` ⇒ באנר בפורטל הקליני + אין יצירת הזמנות חדשות. **לעולם לא** חוסמים גישה של מטופל לנתונים שלו, ולא חוסמים קריאה של רופא לנתונים קיימים (אתיקה + חוק). רק יכולות חדשות.

---

## 4. ספר החורים — כל מה שחסר, לפי שכבה

### 4.1 🚨 חורי אבטחה/השקה — לסגור לפני כל דבר אחר

| # | חור | איפה | מה לעשות |
|---|---|---|---|
| S1 | **Demo seed פועל בפרודקשן** (`SEED_DEMO: "true"` ב-`render.yaml`), עם סיסמה `Cyphix-Demo1` שכתובה ב-README פומבי. `clinician@example.com` הוא רופא אמיתי ב-DB הייצור | שרת | 🟡 **מאחורי `DEMO_MODE` מאז 2026-10-08** (שרת v0.9.0): היפוך הדגל משבית את החשבונות בעלייה. נסגר סופית בשלב 8.0. סיבוב סיסמת האדמין — שלב 8 |
| S2 | **הקוד הסודי של SMS קבוע ומוצג** למשתמש | מובייל | 🟡 **מאחורי `PHONE_VERIFICATION_STEP = DEMO_MODE` מאז 2026-10-08** (מובייל v0.100.0): מחוץ לדמו השלב מדולג. נסגר סופית בשלב 8.0 |
| S3 | **"שכחתי סיסמה" לא עושה כלום** אבל מבטיח מייל | מובייל | מימוש אמיתי (שלב 2) |
| S4 | **"View as role" זמין לכולם** ב-Settings (ווב `v2.6.0`: "always available now"; מובייל `DEFAULT_PREVIEW_ROLE = 'admin'`). השרת אוכף נכון (403), אבל מטופל רואה כפתורי אדמין ויכול לחשוב שהמערכת פרוצה | ווב + מובייל | 🟡 **מאחורי `DEMO_MODE` מאז 2026-10-08** (ווב v1.61.0, מובייל v0.100.0): מחוץ לדמו מוצג רק ל-dev / אדמין אמיתי. נסגר סופית בשלב 8.0 |
| S5 | `LEAD_DEBUG_SCREEN_ENABLED = true` — מסך דיבאג חומרה בבילד ייצור | מובייל | 🟡 **`LEAD_DEBUG_SCREEN_ENABLED = DEMO_MODE \|\| __DEV__` מאז 2026-10-08** (v0.100.0). נסגר סופית בשלב 8.0 |
| S6 | **אי-התאמת מדיניות סיסמה**: הווב מציג "At least 6 characters" (`authPasswordHint`, `authErrWeakPassword`) בעוד השרת וה-`MIN_PASSWORD_LENGTH` דורשים 10 + אות + ספרה. משתמש מקבל שגיאה בלי להבין למה | ווב | ✅ **נסגר 2026-10-08** (change-set 0.2, D14): המדיניות היא 6 תווים בכל מקום — שרת v0.8.0, shared v1.17.0, ווב v1.60.0, מובייל v0.99.0 |
| S7 | אין אימות מייל ⇒ אפשר להירשם עם מייל של מישהו אחר | שרת+ווב+מובייל | `email_verified_at`, קוד/קישור, חסימת פניות עד אימות |
| S8 | אין הגנה על `/auth/register` מפני בוטים (רק rate-limit 10/דקה/IP) | שרת | CAPTCHA (hCaptcha/Turnstile) או לפחות honeypot + rate per-email |
| S9 | אין כותרות אבטחה (HSTS, CSP, X-Frame-Options, Referrer-Policy) לא בשרת (`@fastify/helmet` חסר) ולא ב-`vercel.json` | שרת + ווב | 🟡 **נסגר ברובו 2026-10-08** (שרת v0.10.0 helmet, ווב v1.62.0 headers). **פתוח: CSP לווב** — אחרי מדידת כל המקורות החיצוניים (fonts, Gemini WS, ONNX worker/WASM, API) |
| S10 | 🔁 `user-scalable=no` ב-`index.html` של הווב — הפרת WCAG 1.4.4 (זום) וגם Apple דוחים כאלה ב-WebView | ווב | ✅ **נסגר 2026-10-08** (ווב v1.62.0) |
| S11 | סודות: `MASTER_KEY` רק ב-`.env` מקומי + Render. אין נוהל rotation, אין עותק משני מתועד | תפעול | נוהל כתוב + גיבוי ב-password manager + בדיקת שחזור |
| S12 | אין מנגנון "התנתק מכל המכשירים" / רשימת sessions | שרת+UI | `GET/DELETE /auth/sessions` (refresh_tokens כבר מחזיק ip/user_agent) |
| S13 | אין שינוי סיסמה / שינוי מייל בתוך החשבון | שרת+UI | `POST /auth/password` (עם הסיסמה הישנה), `POST /auth/email/change` (אימות לשני הצדדים) |
| S14 | 2FA לצוות רפואי — עמודות שמורות, לא ממומש. חובה למעשה לגישה ל-PHI מרובה | שרת+ווב | TOTP (שלב 5) |
| S15 | אין מדיניות שמירה/מחיקה (retention): refresh_tokens ישנים, invite_tokens שפגו, audit — נשמר לנצח | שרת | job יומי + מסמך מדיניות |

### 4.2 שרת — API חסר

| # | חסר | למה |
|---|---|---|
| A1 | מייל יוצא (ספק: Resend/Postmark/SES) + טבלת `outbox` עם retry | כל מסלולי האימות, איפוס, הזמנה, התראות |
| A2 | `POST /auth/email/verify-request`, `POST /auth/email/verify` | S7 |
| A3 | `POST /auth/password-reset` (כבר ב-`AUTH_ROUTES_PLANNED`), `POST /auth/password-reset/confirm` | S3 |
| A4 | `POST /auth/register-clinician` → `users.status='pending'` + `clinician_profiles` (license_no, specialty, document) | רופא נרשם לבד |
| A5 | `POST /organizations/register` (self-serve, `pending`) + `PATCH /organizations/:id` (פרטים) + `organizations` עמודות: type, address, phone, tax_id, contact, logo, parent_org_id, status | מרפאה/בי"ח |
| A6 | `GET /organizations/:id/members`, `POST …/invite` (מייל), `DELETE …/members/:uid`, `PATCH …/members/:uid` (role) — **ל-org_admin**, לא רק לאדמין-על | צוות מרפאה |
| A7 | `GET /care/invites` (פתוחות), `DELETE /care/invites/:id`, `POST /care/invites` עם `patientHint` + `assignedClinicianId` (למרפאה: איזה רופא מטפל) | ניהול הזמנות |
| A8 | `POST /care/invites/bulk` + ייבוא CSV של מטופלים (יוצר חשבונות pre-provisioned עם קישור הפעלה במייל) | מרפאה/בי"ח |
| A9 | `GET /requests` (לרופא/מרפאה: כל הפניות הפתוחות בכל ה-threads), `PATCH /requests/:id` (סטטוס, assigned_to) — היום סטטוס `ConsultStatus` קיים בטיפוס אבל **אין דרך לשנות אותו** | תיבת פניות |
| A10 | `GET /patients` להחזיר **סיכום** (שם, גיל, הקלטה אחרונה, פניות פתוחות, רופא מטפל) ולא FHIR מלא — היום מפענח את כל ה-resources | רשימת מטופלים לרופא |
| A11 | `notifications` (טבלה + `GET /notifications`, `PATCH read`) + ערוצים: in-app, מייל, push | "מטופל X הקליט", "הרופא ענה" |
| A12 | `devices` + `POST /devices/claim` (מהאפליקציה, בעת חיבור BLE ראשון: serial/MAC + firmware) | ניהול מכשירים, תמיכה |
| A13 | `consents` (user_id, doc: terms/privacy/dpa, version, accepted_at, ip) | ראיה משפטית |
| A14 | `DELETE /auth/me` (מחיקה עצמית: אימות סיסמה → מייל אישור → grace 14 יום → crypto-shred) | Apple + GDPR |
| A15 | `GET /patients/:id/export` (ZIP: FHIR Bundle + CSV גלים + PDF) — אסינכרוני עם `export_jobs` | GDPR art.20 |
| A16 | `POST /leads` (ציבורי, rate-limited, CAPTCHA) + `POST /support` | דף נחיתה, תמיכה |
| A17 | כל ה-`GET /admin/*` מסעיף 2.2 + `GET /admin/audit` | הקוקפיט |
| A18 | שכבת חיוב מסעיף 3.2 + job יומי `usage_counters` | הכנסות |
| A19 | Push: `POST /devices/push-token`, שליחה דרך Expo Push / APNs | התראות למטופל |
| A20 | `GET /auth/sessions`, `DELETE /auth/sessions/:id` | S12 |
| A21 | `users.status` (`pending / active / suspended`), `users.email_verified_at`, `users.auth_provider`, `users.locale` | כל הנ"ל |
| A22 | Pagination + סינון אחידים לכל רשימה (היום רק `recordings` עם limit/offset) | דשבורד |
| A23 | Webhook/תור משימות פשוט (`jobs` table + loop) — למיילים, ייצוא, מונים, ניקוי | אין worker היום |
| A24 | `helmet`, `@fastify/under-pressure`, מדידת latency ל-log, Sentry (או שווה-ערך) | תפעול |
| A25 | בדיקות: לפחות ה-41 assertions של ה-E2E שרצו ידנית → `npm test` + GitHub Actions | היום **אין** `test` script באף פרויקט |

### 4.3 ווב — מסכים חסרים

| # | חסר | הערה |
|---|---|---|
| W1 | **"שכחתי סיסמה"** ב-`LoginForm` + מסך איפוס (`/reset?token=`) | אין בכלל |
| W2 | אימות מייל: מסך "בדוק את המייל", `/verify?token=`, "שלח שוב" | |
| W3 | שורת הסכמה לתנאים+פרטיות ב-`RegisterWizard` (checkbox, לא רק טקסט) | במובייל יש טקסט, בווב אין כלום |
| W4 | **פורטל קליני** (`/clinic/*`): Patients list, Patient view (כרטיס + היסטוריה + פניות), Requests inbox, Invite patient, Team (ל-org_admin), Clinic settings | **הפיצ'ר הגדול ביותר** |
| W5 | בחירת מטופל פעיל לרופא (`useActivePatientId` נופל ל-`mock-0001`) | 🔁 הוק צריך לקבל `patientId` מהניווט כשהתפקיד קליני |
| W6 | מסך "הצטרף לרופא/מרפאה" למטופל (קוד/קישור) + "צוות הטיפול שלי" עם ניתוק | |
| W7 | שינוי סיסמה / מייל / sessions / מחיקת חשבון / ייצוא נתונים ב-Settings → Account | היום: שם, תפקיד, "view as role", sign out |
| W8 | דפים סטטיים: `/about`, `/privacy`, `/terms`, `/accessibility`, `/contact`, `/help` — נגישים **גם ללא כניסה** (היום הכול מאחורי `AuthGate`) | 🔁 `AuthGate` צריך לאפשר נתיבים ציבוריים |
| W9 | `404` אמיתי (היום redirect שקט ל-`/measure`) | |
| W10 | `index.html`: `<meta name="description">`, favicon (אין `<link rel="icon">` — הדפדפן מציג ריק), `manifest.json` + `apple-touch-icon`, `theme-color`, `lang` דינמי (קיים דרך `I18nProvider` ✅) | 🟡 description, favicon, theme-color, noindex ✅ 2026-10-08 (v1.62.0); manifest + apple-touch-icon → 8.2 |
| W11 | הצהרת נגישות (חוק שוויון זכויות לאנשים עם מוגבלות — חובה לאתר ישראלי) + סריקת axe + ניווט מקלדת מלא + focus-visible + `prefers-reduced-motion` | 148 `aria-*` קיימים — בסיס טוב, לא נבדק |
| W12 | Admin area (סעיף 2) | |
| W13 | Lead/Contact form (אם דף הנחיתה והווב יתאחדו — ראו 4.6) | |
| W14 | עמוד "המכשיר שלי" (מכשיר משויך, גרסת קושחה, סוללה) | אחרי A12 |
| W15 | Measurement reminders (במובייל יש, בווב `pending` ב-PARITY) | חוב Cross-Platform קיים |
| W16 | Interpretation tab (במובייל יש, בווב `pending`) | חוב Cross-Platform קיים |
| W17 | הודעת offline / שרת ישן ("השרת מתעורר, ~50 שניות") — ה-free tier גורם לחוויית "תקוע" | עד שעוברים ל-paid |

### 4.4 מובייל — מסכים חסרים

| # | חסר | הערה |
|---|---|---|
| M1 | `messageApi` + **שליחת פנייה אמיתית** + רשימת פניות עם סטטוס מסונכרן | הטופס קיים ומזויף |
| M2 | "שכחתי סיסמה" אמיתי (deep link `cyphix://reset?token=`) | S3 |
| M3 | אימות מייל (deep link `cyphix://verify?token=`) | S7 |
| M4 | הסרה/החלפה של שלב ה-OTP | S2 🔁 |
| M5 | קישורי Terms/Privacy שמובילים למסמכים (WebView/ Linking) + שמירת הסכמה | |
| M6 | מסך "הצטרף לרופא" (קוד / QR scanner / deep link `cyphix://link/CODE`) + "צוות הטיפול שלי" | |
| M7 | Settings → Account: שינוי סיסמה, מייל, sessions, **מחיקת חשבון** (חובת App Store), ייצוא נתונים | |
| M8 | Push notifications (הפלאגין `withoutPushEntitlement` מסיר בכוונה — צריך להחזיר + Expo Push + הרשאה) | "הרופא ענה לך" |
| M9 | כפתורי Apple/Google sign-in מוצגים ב-`WelcomeStep` (`authAppleSignIn`) — לוודא שהם **לא** מוצגים אם לא ממומשים (Apple דוחה כפתור מת) | 🔁 לבדוק/להסתיר |
| M10 | About: גרסה, רישיונות OSS (SOUP.md קיים — להציג), תנאים, פרטיות, יצירת קשר | |
| M11 | Device screen: serial, firmware, סוללה, "דווח על תקלה" | אחרי A12 |
| M12 | חנויות: privacy policy URL, support URL, `expo.name`, צילומי מסך, סיווג "Medical", הגשה (TestFlight build 9 לא הוגש; Play — אין) | חסם השקה |
| M13 | מצב רופא במובייל — **לא** בהשקה (PARITY: סטייה מכוונת). שלב 7: "Clinician lite" — התראות + צפייה בפנייה + תשובה קצרה | |
| M14 | Crash reporting (Sentry RN) + OTA rollout בשלבים | |

### 4.5 Shared

| # | חסר |
|---|---|
| X1 | חוזי API לכל מה שבסעיף 4.2: `ADMIN_ROUTES`, `ORG_ROUTES`, `CARE_ROUTES`, `REQUEST_ROUTES`, `NOTIFICATION_ROUTES`, `BILLING_ROUTES`, `DEVICE_ROUTES`, `CONSENT_ROUTES`, `EXPORT_ROUTES` + טיפוסים |
| X2 | `UserStatus`, `OrgType`, `RequestStatus`, `Plan`, `Subscription`, `Invoice`, `Device`, `Consent`, `Notification` |
| X3 | RBAC: העברת המטריצה ל-shared (היום 3 עותקים: ווב/מובייל/שרת) + הרשאות חדשות: `org:manage`, `org:members`, `invite:create`, `request:assign`, `billing:read`, `admin:read`, `device:manage` | 🔁 מאחד 3 קבצים — אישור |
| X4 | `AUTH_ROUTES_PLANNED` → `AUTH_ROUTES` כשממומש |
| X5 | מכונת מצבים של פנייה (`new → in-progress → answered → closed`) כלוגיקה טהורה |

### 4.6 דף נחיתה

| # | חסר |
|---|---|
| L1 | "Request access" מוביל לפוטר. **אין טופס, אין מייל, אין טלפון** |
| L2 | אין קישור ל"כניסה" (ווב) ולחנויות |
| L3 | אין תנאים/פרטיות/נגישות/אודות/צוות/יצירת קשר |
| L4 | אנגלית בלבד, אין RTL, אין עברית — הקהל הראשון ישראלי |
| L5 | אין `robots.txt`, `sitemap.xml`, `og:image`, Analytics (עם הסכמה) |
| L6 | כתוב "concept" ו-"not yet a physical product" — טקסט משקיעים, לא טקסט לקוחות. 🔁 החלטה: דף אחד לשני הקהלים או שניים |
| L7 | אין הצהרת Intended Use / "לא מכשיר רפואי מאושר" — חובה משפטית לפני שרופאים משתמשים (ראו 4.8) |

### 4.7 תפעול / DevOps

| # | חסר |
|---|---|
| O1 | אין בדיקות אוטומטיות, אין CI (אין `.github/`) באף אחד מ-5 הריפואים — 🟡 **CI ✅ 2026-10-08** (0.9) בשלושת הריפואים; בדיקות יחידה/E2E רחבות עדיין חסרות |
| O2 | אין סביבת staging — `npm run dev` מקומי כותב לפרודקשן (מתועד בזיכרון). צריך Neon branch + Render preview |
| O3 | גיבוי: `backup.sh` ידני. צריך cron יומי + בדיקת שחזור חודשית + גיבוי `MASTER_KEY` |
| O4 | ניטור: uptime (Better Uptime / UptimeRobot על `/healthz`), שגיאות (Sentry), לוגים מרוכזים |
| O5 | Free tier: Render נרדם (~50 שניות), Neon נרדם (5 דקות). **לא ניתן להשיק ככה** — רופא שמחכה 50 שניות לא חוזר. ~$7+$19/חודש |
| O6 | דומיין: `cyphix-api.onrender.com` ו-`*.vercel.app`. צריך `app.cyphix.co.il`/`api.cyphix…` + מייל `support@` |
| O7 | Runbook: אירוע אבטחה, שחזור, rotation, תלונת משתמש, מחיקה |
| O8 | Secrets ב-Render רק; אין `.env.example` מעודכן לכל המפתחות החדשים (SMTP, SMS, PUSH, CAPTCHA, SENTRY) |
| O9 | מדיניות גרסאות API (`/api/v1` קיים ✅) + תאימות לאחור למובייל ישן (יש OTA, אבל native builds ישנים חיים חודשים) |

### 4.8 משפטי / רגולציה (לא קוד, אבל חוסם)

| # | חסר |
|---|---|
| R1 | תנאי שימוש (מטופל, רופא, ארגון) |
| R2 | מדיניות פרטיות (חוק הגנת הפרטיות + תיקון 13, GDPR) — כולל "איפה הנתונים": Neon/Render פרנקפורט (EU) |
| R3 | הצהרת Intended Use + Disclaimer: היום בקוד "For wellness and training only. Not a diagnostic device" — צריך להופיע **לפני** שרופא מסתמך על זה, ובחוזה |
| R4 | DPA/BAA לארגונים |
| R5 | רישום מאגר מידע (רשות הגנת הפרטיות) — מאגר רגיש |
| R6 | הצהרת נגישות (תקנות נגישות שירות, ת"י 5568) |
| R7 | מסלול רגולטורי (אמ"ר / CE / FDA) — **לא** חוסם פיילוט עם disclaimer, אבל חוסם "מכשיר רפואי". לתעד החלטה |
| R8 | רישום הסכמות (A13) כראיה |

---

## 5. ארכיטקטורת היעד (מה מתווסף לסכמה)

```
users            + status, email_verified_at, auth_provider, locale, phone_verified_at
clinician_profiles (user_id, license_no, specialty, document_ref, reviewed_by, reviewed_at)
organizations    + type, parent_org_id, status, address, phone, tax_id, contact_email, logo_ref, plan hints
organization_members  (ללא שינוי — org_role כבר קיים)
care_relationships    + assigned_clinician_id (למרפאה), label
invite_tokens         + patient_hint_enc, assigned_clinician_id, revoked_at
requests         (id, message_id, care_relationship_id, status, assigned_to, opened_at, answered_at, closed_at)
                  ← "פנייה" כישות עם מחזור חיים; ההודעה נשארת ב-messages
notifications    (id, user_id, kind, payload_enc?, read_at, sent_email_at, sent_push_at)
email_tokens     (id, user_id, kind: verify|reset|invite|delete, token_hash, expires_at, used_at)
consents         (id, user_id, doc, version, accepted_at, ip, user_agent)
devices          (id, serial, mac_hash, firmware, org_id, patient_id, claimed_at, last_seen_at, battery)
push_tokens      (user_id, token, platform, updated_at)
leads            (id, name, email, org_type, message, source, status, created_at)
support_tickets  (id, user_id?, email, subject, body_enc, status, created_at)
plans / subscriptions / usage_counters / invoices / invoice_lines   (סעיף 3.2)
jobs             (id, kind, payload, run_at, attempts, done_at, error)   ← worker פשוט בתוך השרת
export_jobs      (id, patient_id, status, file_ref, expires_at)
```
כל המיגרציות **additive-only** (כמו 0004) כדי שגרסת שרת קודמת תמשיך לרוץ.

**שירותים חיצוניים חדשים (כולם צריכים SOUP + בדיקת egress לפי `cyphix-dependency-bar`):**
מייל (Resend/Postmark) · SMS (Twilio/019 — אופציונלי) · Push (Expo Push) · CAPTCHA (Turnstile) ·
Sentry · Uptime · סליקה (מאוחר).

---

## 6. תוכנית פעולה — שלבים ותת-שלבים

> כל תת-שלב = change-set אחד לפי §6 של ה-CLAUDE.md הראשי (גרסה, CHANGELOG, footer, PARITY, push).
> סדר: קודם **לסגור חורים** (0), אחר כך **התשתית שכולם תלויים בה** (1–2), אחר כך **הצד הקליני** (3–4),
> אחר כך **הקוקפיט** (5), ורק אז **חיוב ו-enterprise** (6–7). תאריכים לא מוערכים כאן בכוונה — הם תלויים בכמה
> change-sets ביום אתה מאשר.

### שלב 0 — סגירת חורי השקה (ללא פיצ'רים חדשים)
> ★ מעודכן לפי D1: המערכת נשארת **במצב דמו** עד ההשקה הרשמית. לכן שלב 0 לא *מסיר* את חפצי הדמו —
> הוא **מרכז אותם מאחורי דגל אחד** (`DEMO_MODE`, לכל פלטפורמה), כך שההשקה היא היפוך דגל אחד ולא חיפוש
> אחרי שישה מקומות. היום הדגל `true`; בשלב 8 הוא הופך ל-`false`.
- 0.1 ✅ **2026-10-08** — שרת v0.9.0: `DEMO_MODE` (env, ברירת מחדל = `SEED_DEMO`, ולכן Render במצב דמו בלי שינוי). בדמו: seed נשאר, חשבונות הדמו נשארים. מחוץ לדמו: seed כבוי, חשבונות הדמו **מושבתים** בעלייה (`disabled_at`, מסיים גם sessions) ומוחזרים אם הדגל חוזר. **לא מוחקים כלום.** `/healthz` מדווח `demo`.
- 0.2 ✅ **2026-10-08** — מדיניות סיסמה = **6 תווים ותו לא**, בכל מקום (D14): שרת v0.8.0 (`policy/password.ts`), shared v1.17.0, ווב v1.60.0, מובייל v0.99.0 (OTA). הטקסט "לפחות 6" היה נכון כל הזמן; השרת וה-constants תוקנו אליו. נפרס שרת-קודם כדי שאף לקוח לא יקדים אותו.
- 0.3 ✅ **2026-10-08** — ווב v1.61.0 + מובייל v0.100.0: "View as role" (מוצג בדמו / dev / אדמין אמיתי), `LEAD_DEBUG_SCREEN_ENABLED`, `DEFAULT_PREVIEW_ROLE`, כפתורי Apple/Google (`SHOW_SOCIAL_SIGN_IN`), שלב ה-OTP (`PHONE_VERIFICATION_STEP`) — כולם נגזרים מקבוע `DEMO_MODE` אחד ב-`featureFlags` של כל אפליקציה. נוספה שורה גלויה Settings → About → "מצב: הדגמה" בשני האפים. בדמו הכול נשאר בדיוק כמו היום.
- 0.4 ✅ **2026-10-08** — מובייל v0.100.0: בדמו שלב ה-OTP נשאר עם ההודעה הקיימת "גרסת הדגמה — לא נשלחת הודעת SMS"; מחוץ לדמו השלב מדולג (טלפון → פרופיל, וחזרה אחורה בהתאם) והטלפון נשמר כלא-מאומת (D2).
- 0.5 ✅ **2026-10-08** — שרת v0.10.0: `@fastify/helmet` (נבדק: אפס egress, אפס פגיעויות חדשות); ווב v1.62.0: HSTS, nosniff, X-Frame-Options DENY, Referrer-Policy, Permissions-Policy (camera/mic/bluetooth ל-self בלבד) ב-`vercel.json`. **CSP לווב עדיין לא** — דורש מדידה של Google Fonts / Gemini WS / ONNX worker+WASM / Render API לפני שכותבים אותו (נשאר ב-S9 כחצי הפתוח).
- 0.6 ✅ **2026-10-08** — ווב v1.62.0: `user-scalable=no` הוסר (זום בדפדפן מותר; ה-Text-size הפנימי לא נגע), `viewport-fit=cover`, favicon (סימן המותג מדף הנחיתה), description, theme-color, `noindex`. **`manifest.json` + `apple-touch-icon` נדחו ל-8.2** (צריכים PNG ריבועי בכמה גדלים — יחד עם ליטוש החנויות/PWA).
- 0.7 תפעול: גיבוי cron (חינמי: GitHub Actions schedule → `backup.sh` → artifact מוצפן) + uptime monitor חינמי + Sentry free tier (שרת+ווב+מובייל) + staging (Neon branch חינמי).
- 0.8 תפעול: paid tier — **נדחה לשלב 8** (D8). בדמו ה-free tier מספיק; לא מוציאים כסף לפני השקה.
- 0.9 ✅ **2026-10-08** — GitHub Actions בשלושת הריפואים: parent (מובייל typecheck + shared על ה-tsconfig שלו + בניית דף הנחיתה), ווב v1.62.1 (typecheck + build + בדיקה שגרסת ה-badge באמת בתוך ה-bundle), שרת v0.10.1 (typecheck + build + **עלייה אמיתית מול Postgres 16** עם סודות לריצה: seed, login דמו, מדיניות סיסמה 6/5, nosniff, ואז עלייה שנייה עם `DEMO_MODE=false` שמוכיחה שחשבונות הדמו הושבתו). `expo export` לא ב-CI (איטי, ולא מוכיח יותר מ-typecheck לפי §6.4).

### שלב 1 — תשתית תקשורת יוצאת + זהות מלאה
- 1.1 ✅ **2026-10-08** — shared v1.18.0: `AUTH_ROUTES` מלא (ארבעת נתיבי הקישור במייל), `AuthRecoveryContract` (ממשק נפרד, כדי שכל פלטפורמה תאמץ אותו ב-change-set משלה בלי לשבור את ה-typecheck של השנייה), `AUTH_LINK_PATHS` (`/verify-email`, `/reset-password`), `SessionUser.email` + `emailVerified`, קודי שגיאה `invalid-link` / `rate-limited`. **סטייה מהתכנון:** אין `UserStatus` (נגזר בשרת מ-`disabled_at` + `email_verified_at`), והטבלה נקראת `auth_tokens` (לא `email_tokens`) כי היא משרתת גם שינוי מייל.
- 1.2 ✅ **2026-10-08** — שרת v0.11.0: Resend דרך `fetch` של הרצה (**בלי SDK — אפס תלויות חדשות, אפס SOUP**), `email_outbox` + worker בתהליך (claim → send → retry 1/5/15/60/240 דק', הקישור נמחק מהשורה ברגע שהיא סופית), תבניות **דו-לשוניות** (עברית ואז אנגלית בהודעה אחת — השרת לא יודע באיזו שפה האדם קורא). `jobs` גנרי לא נבנה (YAGNI; ה-worker הוא התבנית לג'וב היומי של 6.1). בלי מפתח: השירות עולה, השורות נרשמות `skipped`, `/healthz` → `email:off`. ★ **מגבלת דמו:** בלי דומיין מאומת Resend מוסר **רק לכתובת בעל החשבון** (נבדק: נמען אחר → 403, נרשם `failed`). אימות דומיין = 8.3.
- 1.3 ✅ **2026-10-08** — שרת v0.11.0: `users.email_verified_at`; `auth_tokens` (32 בתים, sha256 בלבד במסד, קשור למטרה, חד-פעמי ב-UPDATE אטומי אחד, 24 ש'); הרשמה יוצרת לא-מאומת ומתזמנת את קישור האימות **באותו commit**; `POST /auth/email/verify/{request,confirm}`; כל principal נושא `email` + `emailVerified`. **לא חוסמים כלום על אימות** (D1 — בדמו רוב הכתובות לא יכולות לקבל מייל); הלקוחות מציגים, ההשקה תחליט אם לאכוף. חשבונות הדמו והאדמין מאומתים בכוח ב-seed.
- 1.4 🟡 **2026-10-08** — איפוס סיסמה (A3) ✅ שרת v0.11.0: `POST /auth/password/forgot` (תמיד 202 — לא מגלים אם הכתובת קיימת; ה-audit אומר), `POST /auth/password/reset` (30 דק' — המספר שמסך המובייל הבטיח מאז v1.0.0; מבטל **כל** session של החשבון, מאמת את הכתובת, מחזיר את מעטפת ה-login כך שהמכשיר מחובר בלי צעד נוסף, ושולח "הסיסמה שונתה"). CI מריץ את כל הזרימה מול Postgres עם ספק כבוי (הקישור נקרא מהלוג) — ותפס באג jsonb בריצה הראשונה. **פתוח (1.4b):** שינוי סיסמה/מייל (S13) + sessions (A20) — נתיבים שמורים ב-`AUTH_ROUTES_PLANNED`.
- 1.5 ווב: "שכחתי סיסמה" + מסכי verify/reset + Account section מורחב.
- 1.6 מובייל: deep links (`cyphix://verify`, `cyphix://reset`) + אותם מסכים; `ForgotStep` מתחבר לשרת.
- 1.7 🔁 מובייל: החלטה על OTP (הסרה / החלפה ב-SMS אמיתי / השארה כ"לא מאומת").
- 1.8 שרת+ווב+מובייל: `consents` + מסמכי Terms/Privacy (גרסה 1.0) + checkbox בהרשמה + דפים ציבוריים (`/terms`, `/privacy`) 🔁 `AuthGate` עם נתיבים ציבוריים.
- 1.9 שרת+מובייל+ווב: מחיקת חשבון עצמית (A14) + ייצוא נתונים (A15).
- 1.10 CAPTCHA על register/leads/support (S8).

### שלב 2 — חיבור מטופל ↔ רופא (ה-UI לשרת שכבר קיים)
- 2.1 shared: `CARE_ROUTES`, `InviteSummary`, `CareRelationshipView`.
- 2.2 שרת: `GET/DELETE /care/invites`, `patientHint`, `assignedClinicianId`, QR payload, deep link.
- 2.3 ווב מטופל: מסך "הצטרף לרופא/מרפאה" (קוד / קישור) + הסכמה + "צוות הטיפול שלי" (ניתוק).
- 2.4 מובייל: אותו מסך + סריקת QR (`expo-camera` — SOUP) + deep link `cyphix://link/CODE`.
- 2.5 ווב: Chat מציע "הצטרף לרופא" במקום empty state.
- 2.6 PARITY: שורות לכל הנ"ל.

### שלב 3 — פורטל קליני (ווב) — רופא פרטי
- 3.1 shared: `PatientSummary`, `RequestView`, `REQUEST_ROUTES`, RBAC מאוחד (X3) 🔁.
- 3.2 שרת: `GET /patients` כסיכום (A10) עם pagination; `requests` כישות (A9); `notifications` (A11).
- 3.3 ווב: shell קליני (`/clinic`) — sidebar: Patients · Requests · Invite · Settings. 🔁 ניתוב לפי תפקיד אחרי login (רופא → `/clinic`, מטופל → `/measure`).
- 3.4 ווב: Patients list (חיפוש, "לא נצפה", הקלטה אחרונה) → Patient view (כרטיס + History + Insights + thread) — **מחדש משתמש ב-`ScanHistoryPage`/`EcgViewer` הקיימים** עם `patientId` מהנתיב (W5 🔁).
- 3.5 ווב: Requests inbox — סטטוס, תשובה, צירוף הקלטה, סגירה.
- 3.6 ווב: Invite patient (קוד/QR/קישור/שליחה במייל) + רשימת הזמנות.
- 3.7 שרת: הרשמת רופא עצמית (A4) + מסך ווב "הרשמה כרופא" + מצב `pending` ("בקשתך תאושר תוך X").
- 3.8 מובייל: `messageApi` + שליחת פנייה אמיתית + סטטוס (M1); התראות in-app.
- 3.9 Push (M8, A19): "הרופא ענה", "תזכורת שלא בוצעה" — רק אחרי אישור entitlement.

### שלב 4 — מרפאה (org) 
- 4.1 shared+שרת: הרחבת `organizations` (A5), `org_admin` יכולות (A6), הזמנת צוות במייל.
- 4.2 ווב: הרשמת מרפאה (self-serve, `pending`) + Team screen + Clinic settings (פרטים, לוגו).
- 4.3 שרת+ווב: הזמנות בכמות + ייבוא CSV + "רופא מטפל" לכל מטופל (A8, care_relationships.assigned_clinician_id).
- 4.4 ווב: Requests inbox מרפאתי עם "שייך לרופא".
- 4.5 Technician (מזכירה): רשימת מטופלים + הזמנות, בלי פרשנות (RBAC קיים).

### שלב 5 — הקוקפיט (Admin)
- 5.1 shared: `ADMIN_ROUTES` + טיפוסי סטטיסטיקה.
- 5.2 שרת: כל `GET /admin/*` (A17) — ספירות, רשימות, audit viewer עם pagination; `admin:read` ב-audit.
- 5.3 ווב: `/admin` shell + Overview + Organizations + Clinicians (תור אישורים) + Patients (עם סיבת צפייה) + Requests + Audit + System.
- 5.4 שרת+ווב: Leads & Support (A16) + טופס בדף הנחיתה (L1).
- 5.5 2FA TOTP לאדמין ולצוות (S14) — חובה לפני שאדמין רואה PHI מכל המערכת.
- 5.6 `devices` (A12) + claim מהאפליקציה + מסכי Devices (admin, clinic, patient) — **נדחה עד שיש אבטיפוס מתקדם** (D13): החיבור לחומרה צפוי להשתנות, ולכן הסכמה תתוכנן אז, סביב מזהה שהקושחה החדשה תספק (serial), לא סביב שם BLE.

### שלב 6 — חיוב
- 6.1 shared+שרת: סכמת 3.2 + job יומי `usage_counters` + יצירת חשבוניות + מייל חשבונית.
- 6.2 ווב admin: Billing (תוכניות, מנויים, "סמן כשולם", הכנסה לפי ארגון/חודש) → Overview מקבל MRR.
- 6.3 ווב clinic: עמוד "התוכנית שלי" + חשבוניות + באנר `past_due`.
- 6.4 (מאוחר) סליקה.

### שלב 7 — Enterprise / בי"ח + השלמות
- 7.1 `parent_org_id` + מחלקות + דשבורד ארגוני היררכי.
- 7.2 SSO (OIDC) ל-org.
- 7.3 FHIR API יוצא (`Patient`, `Observation` ECG) + DPA.
- 7.4 "Clinician lite" במובייל (M13).
- 7.5 חובות Cross-Platform קיימים: Reminders + Interpretation לווב (W15, W16).

### שלב 8 — השקה
- 8.0 ★ **היפוך `DEMO_MODE`** — שלושה מקומות, יחד: Render env `DEMO_MODE=false` + `SEED_DEMO=false` (החשבונות הפיקטיביים מושבתים בעלייה הבאה, לא נמחקים); ווב `config/featureFlags.ts` → `DEMO_MODE = false` (commit + Vercel); מובייל `config/featureFlags.ts` → `DEMO_MODE = false` (OTA). אימות: `/healthz` → `demo:false`, ובשני האפים Settings → About **בלי** שורת "מצב: הדגמה".
- 8.1 דף נחיתה: טופס, עברית/RTL, קישורים, משפטי, SEO (4.6).
- 8.2 חנויות: Play + App Store (M12) — privacy URL, מחיקת חשבון, צילומים, review notes.
- 8.3 דומיינים + מייל `support@` (O6) + runbooks (O7).
- 8.4 בדיקת נגישות (axe + מקלדת + קורא מסך) + הצהרת נגישות (W11, R6).
- 8.5 חזרה על 1.1–1.5 (סימולציות) **על מכשיר אמיתי** לפי §6.4 — רק אז "מוכן".

---

## 7. החלטות — נסגרו 2026-10-08

המשתמש ענה: **D1 = נשארים במצב דמו** (אין השקה רשמית עדיין; החיבור לחומרה צפוי להשתנות עם אבטיפוס
מתקדם יותר). **כל השאר הושאר להחלטתי** — להלן ההחלטות, והן מחייבות עד שייאמר אחרת:

| # | שאלה | החלטה | למה |
|---|---|---|---|
| D1 | demo seed וחשבונות הדמו | **נשארים.** `SEED_DEMO=true` לא נוגעים. במקום הסרה: דגל `DEMO_MODE` אחד שמרכז את כל חפצי הדמו (0.1–0.4) ונהפך בהשקה | המשתמש: עדיין דמו |
| D2 | OTP טלפוני | בדמו: נשאר, עם תווית "קוד הדגמה". מחוץ לדמו: השלב מדולג, הטלפון נשמר `unverified`. SMS אמיתי רק אם יוחלט לקנות ספק | אין ספק SMS; קוד מזויף שנראה אמיתי הוא הגרוע מכולם |
| D3 | הרשמת רופא | **אישור ידני** שלך בתור בדשבורד (5.3), עם מספר רישיון + תעודה מצורפת | פיילוט קטן; אמון > אוטומציה |
| D4 | מה מנהל-על רואה בפניות | **מטא-דאטה בלבד** (מי, למי, מתי, סטטוס). תוכן נשאר מוצפן per-patient | הפרדת תפקידים; זה למה ההצפנה per-patient |
| D5 | מטופל standalone | **חינם בפיילוט, בלי מגבלת היסטוריה.** תוכנית B2C ממודלת אך לא פעילה. נבחן מחדש בשלב 6 | אין סיבה לחסום בדמו |
| D6 | מטבע/מע"מ | **ILS, VAT 18%**, סכומים ב-agorot (`*_minor`) | שוק ראשון ישראל |
| D7 | דף נחיתה | **דף אחד, שני CTA** ("אני מטופל" → חנויות/ווב · "אני מרפאה/רופא" → טופס), **עברית + אנגלית עם RTL** | קהל ראשון ישראלי; שני דפים = כפל תחזוקה |
| D8 | paid tier | **נדחה לשלב 8.** לא מוציאים כסף לפני השקה; בדמו ה-cold start של ~50 שניות נסבל ומתועד על המסך (W17) | המשתמש בדמו; עלות = החלטה שלו ביום ההשקה |
| D9 | איחוד RBAC ל-shared | **כן**, שלב 3.1, עם בדיקה שמשווה את 3 העותקים לפני המחיקה | שלושה עותקים של החלטת אבטחה |
| D10 | ניתוב לפי תפקיד אחרי login | **כן**: `clinician/technician` → `/clinic`, `admin` → `/admin`, `patient` → `/measure`. חשבון הדמו `clinician@example.com` ינחת ב-`/clinic` ברגע שהוא קיים | רופא במסך בית של מטופל הוא הבאג הכי בולט היום |
| D11 | Push במובייל | **כן**, שלב 3.9 — ויתואם עם הבילד הנייטיבי הבא (שגם החומרה החדשה תדרוש), לפי הכלל "native work goes last" | בילד נייטיבי = חנות; לעשות פעם אחת |
| D12 | דומיין | **נדחה לשלב 8** — רכישה = כסף = החלטה שלך. עד אז `*.onrender.com` / `*.vercel.app`. המסמכים המשפטיים ייכתבו עם placeholder | |
| D13 | חומרה / טבלת `devices` | **נדחה** (5.6) עד אבטיפוס מתקדם. שום דבר בשלבים 0–4 לא תלוי בזהות מכשיר | המשתמש: החיבור לחומרה ישתנה |
| D14 | מדיניות סיסמה | **6 תווים, בלי כלל הרכב** (המשתמש, 2026-10-08: "6 מספיק לי, מה שיש היום"). לא 10, לא אות+ספרה. מד החוזק נשאר כמידע בלבד | מה שהמסך הבטיח מההתחלה |

**כלל העבודה שנקבע:** הכול ב-GitHub; כל change-set הוא commit משלו; אם משהו נשבר חוזרים ל-`restore-point-2026-10-08`
(ראו הבלוק בראש המסמך). נקודת שחזור חדשה נוצרת בסוף כל שלב (`restore-point-<date>-phaseN`).

---

## 8. מה **לא** חסר (כדי שלא נבנה פעמיים)

- הצפנה per-patient, crypto-shred, audit append-only — ✅ ברמה גבוהה.
- Refresh-token rotation עם grace + reuse detection — ✅ (v0.7.0).
- RBAC + row scoping דרך `care_relationships` — ✅ השרת כבר יודע "מי רשאי לראות את מי". **הפורטל הקליני רק צריך UI**.
- קודי הזמנה + הסכמה + ביטול — ✅ שרת.
- Threads/פניות עם `reason` מקודד — ✅ שרת וווב.
- Offline-first + sync + OTA — ✅ מובייל.
- i18n he/en + RTL — ✅ ווב ומובייל (לא בדף הנחיתה).
- Intended-use disclaimer בדוחות — ✅ בטקסט (צריך גם במסמך משפטי).

---

## 9. אומדן גודל (change-sets, לא ימים)

| שלב | שרת | ווב | מובייל | shared | סה"כ |
|---|---|---|---|---|---|
| 0 | 3 | 4 | 3 | 0 | ~10 |
| 1 | 7 | 5 | 5 | 2 | ~19 |
| 2 | 2 | 3 | 3 | 1 | ~9 |
| 3 | 5 | 8 | 3 | 2 | ~18 |
| 4 | 4 | 5 | 0 | 1 | ~10 |
| 5 | 6 | 8 | 1 | 1 | ~16 |
| 6 | 4 | 3 | 0 | 1 | ~8 |
| 7 | 5 | 4 | 3 | 2 | ~14 |
| 8 | 1 | 3 | 2 | 0 | ~6 + דף נחיתה ~5 |
| | | | | | **~115 change-sets** |

---

<!-- v1.1.0 — Decisions D1–D13 recorded (demo mode stays; DEMO_MODE flag instead of removals; paid tier, domain and devices deferred); restore-point-2026-10-08 documented with the rollback procedure. -->
<!-- v1.0.0 — LAUNCH_PLAN: full gap analysis + phased plan from prototype to a closed, launchable system (planning only, no code changed). -->
