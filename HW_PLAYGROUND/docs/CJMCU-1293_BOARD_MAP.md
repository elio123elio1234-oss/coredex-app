# CJMCU-1293 — מפת המודול (מתוך הסכמטיקה `ADS1293 CJMCU-1293 69005.PDF`)

## הדר P3 (9 פינים) — החיבור ל-ESP

| # | סימון על ה-PCB | פין ADS1293 | תפקיד |
|---|---|---|---|
| 1 | 5V | — | ספק. עובר דרך MIC5219-3.3 → VDDIO/VDD 3.3V |
| 2 | GND | — | DGND |
| 3 | SCLK | 17 | SPI clock |
| 4 | SDI | 18 | SPI MOSI (אל השבב) |
| 5 | SDO | 19 | SPI MISO (מהשבב) |
| 6 | CSB | 16 | SPI chip-select, active-low |
| 7 | WCT | 7 | יציאת Wilson Central Terminal — **לא בשימוש אצלנו** |
| 8 | ALAB (ALARMB) | 15 | פסיקת שגיאה, active-low — אופציונלי |
| 9 | DRDB (DRDYB) | 20 | **Data Ready, active-low — חובה לחבר ל-GPIO עם פסיקה** |

> ⚠ מתח: ה-ADS1293 עצמו ניזון מ-3.3V על הלוח. פיני ה-SPI הם 3.3V —
> תואם ESP32 ישירות. את פין 1 מזינים 5V (או 3.7V-5V; הרגולטור MIC5219 הוא LDO).

## שקעי אלקטרודות (3.5mm)

| שקע | מגע | פין ADS1293 | הערה |
|---|---|---|---|
| P1 | 1 | IN1 | דרך R3 0Ω |
| P1 | 2+3 (מגושרים) | IN2 | דרך R4 0Ω |
| P1 | 4 | IN3 | דרך R5 0Ω |
| P2 | 1 | IN4 | דרך R6 0Ω |
| P2 | 2+3 (מגושרים) | IN5 | דרך R7 0Ω |
| P2 | 4 | IN6 | דרך R8 0Ω |

- מגעי 5–7 של שני השקעים — **לא מחוברים לכלום**.
- **אין RLD על השקעים.** RLDOUT (פין 9) מחובר רק לרשת המשוב על הלוח
  (R11 100K מ-CMOUT, R12 1M ∥ C13 1.5nF), והניתוב לאלקטרודה נעשה
  פנימית דרך RLD_CN לכל פין IN שנבחר.

## שאר הלוח

- U1: קריסטל (8M-3 footprint) על XTAL1/XTAL2 עם 22pF — לכן `OSC_CN=0x04`.
- U2: MIC5219-3.3 LDO (5V→3.3V).
- L1/L2 10mH + קבלים: סינון ספק אנלוגי/דיגיטלי (VDD / VDDIO).
- S1: לחצן RSTB (איפוס השבב, active-low, pull-up 1M ל-VDDIO).
- D1+R13: לד חיווי 5V.
- C8 על CVREF, C12 על RLDIN/RLDREF — קבלי bypass כנדרש ב-datasheet.

## חיווט ל-ESP32 — זהה לחומרה הקיימת שלך (נלקח מהקושחה הנוכחית)

| CJMCU P3 | ESP32 DoIt DevKit v1 | מקור |
|---|---|---|
| 5V | 5V / VIN | |
| GND | GND | |
| SCLK | **GPIO18** (VSPI CLK) | `spi_Init(18, 19, 23, 4)` |
| SDO → MISO | **GPIO19** | |
| SDI ← MOSI | **GPIO23** | |
| CSB | **GPIO4** | `ADS1293_CSB_PIN` |
| DRDB | **GPIO32** (INPUT_PULLUP, פסיקת FALLING) | `ADS1293_DRDY_PIN` |
| ALAB | לא מחובר | |
| WCT | לא מחובר | |

> קושחת המתחם משתמשת באותם פינים בדיוק — מחווטים את ה-ESP הנוסף אחד-לאחד
> כמו הקיים. שינוי פינים = עריכת `firmware_playground/include/config.h` בלבד.
> SPI: MODE0, MSB-first, ‎~2MHz.

<!-- v0.1.0 — מיפוי מלא של CJMCU-1293: הדר, שקעים, רכיבי לוח, חיווט מוצע ל-ESP32 -->
