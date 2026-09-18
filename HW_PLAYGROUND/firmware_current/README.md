# firmware_current — עותק קריאה של קושחת v2 (int32), נקודת השחזור של החומרה

> ⚠ **מ-2026-09-18 האבטיפוס כבר לא מריץ את הקושחה הזו** — צרוב עליו v3
> (`../firmware_production_v3/`, ‏Lead II כפול + RLD ייעודי). התיקיה הזו נשארת
> בדיוק כפי שהיא: היא הדרך חזרה ("תחזיר את ה-ESP לגרסה המקורית").

מקור קנוני: `C:\Users\elio1\Desktop\ESP32-ADS1293-master\ESP32-ADS1293-master`
(repo: github.com/elio123elio1234-oss/ESP32-ADS1293-master, מכשיר על COM7)

- העותק כאן נלקח מ-working tree ב-2026-08-24 — **כולל** תיקון ה-int32 ל-BLE
  מ-2026-07-19 (שעדיין לא היה מקומט ב-repo המקורי באותו רגע).
- זהו **עותק עיון בלבד** למתחם המחקר. פיתוח על הקושחה האמיתית ממשיך במקור.
- מה היא עושה: ADS1293 @1280Hz (CH1=Lead I, CH2=Lead II, RLD→IN3) →
  median5 + מיצוע÷4 → 320Hz → Einthoven → Serial CSV + SPP + BLE notify
  (BeatAlign ECG, ‏16×9B int32 µV).
- **`flashed_bin_v2_int32/`** — הבינאריים המקומפלים של הקושחה הזו + נוהל שחזור
  ([RESTORE.md](flashed_bin_v2_int32/RESTORE.md)). זו נקודת השחזור של החומרה
  מ-2026-09-18, לפני השדרוג ל-Lead II כפול. המקור כאן אומת באותו יום כזהה
  בייט-לבייט למקור הקנוני.

<!-- v0.2.1 — the prototype now runs v3; this folder is the restore point, verified against the chip before it was overwritten -->
<!-- v0.1.3 — added flashed_bin_v2_int32/ (hardware restore point 2026-09-18); v0.1.0 — reference copy of production firmware (with int32 BLE fix), taken 2026-08-24 -->
