# firmware_current — עותק קריאה של הקושחה שרצה היום על האבטיפוס

מקור קנוני: `C:\Users\elio1\Desktop\ESP32-ADS1293-master\ESP32-ADS1293-master`
(repo: github.com/elio123elio1234-oss/ESP32-ADS1293-master, מכשיר על COM7)

- העותק כאן נלקח מ-working tree ב-2026-08-24 — **כולל** תיקון ה-int32 ל-BLE
  מ-2026-07-19 (שעדיין לא היה מקומט ב-repo המקורי באותו רגע).
- זהו **עותק עיון בלבד** למתחם המחקר. פיתוח על הקושחה האמיתית ממשיך במקור.
- מה היא עושה: ADS1293 @1280Hz (CH1=Lead I, CH2=Lead II, RLD→IN3) →
  median5 + מיצוע÷4 → 320Hz → Einthoven → Serial CSV + SPP + BLE notify
  (BeatAlign ECG, ‏16×9B int32 µV).

<!-- v0.1.0 — reference copy of production firmware (with int32 BLE fix), taken 2026-08-24 -->
