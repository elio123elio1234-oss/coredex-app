# צריבת firmware_production_v3

הדרך הרגילה: לחבר את הלוח ולומר ל-Claude "תצרוב את v3". מה שלמטה הוא מה שהוא מריץ.

## ★ הדרך הקצרה — פקודה אחת

```powershell
powershell -ExecutionPolicy Bypass -File tools/flash_and_verify.ps1
```

עושה לפי הסדר: מזהה את הלוח לפי VID ומסרב לפורט ש-Windows לא הפעיל (כולל התנגשות ה-COM
עם קישור ה-Bluetooth) → **`verify_flash` מול גיבוי v2, לקריאה בלבד, לפני שמוחקים אותו**
(נקודת השחזור נלקחה כשהלוח לא היה מחובר; זה מה שהופך אותה ממסקנה למדידה, ואם השבב לא
תואם — הסקריפט עוצר ולא צורב) → בנייה וצריבה → קריאת הבאנר ובדיקת כל רגיסטר שנקרא
חזרה מהשבב → `ble_check.py`. ללוח הנוסף (שלא מריץ v2): `-SkipV2Check`. לבדיקה בלי
צריבה: `-NoFlash`. הסעיפים שלמטה הם אותם צעדים, ידנית.

## 0. לפני שצורבים על האבטיפוס

נקודת החזרה קיימת ומאומתת: `../firmware_current/flashed_bin_v2_int32/RESTORE.md`
(ארבעה קבצי `.bin` + פקודת שחזור אחת).

## 1. לזהות את הלוח לפי VID — לא לפי מספר COM

```powershell
Get-CimInstance Win32_PnPEntity |
  Where-Object { $_.DeviceID -match 'VID_(10C4|1A86)' } |
  Select-Object Name, Status, ConfigManagerErrorCode
```

`VID_10C4` = גשר CP2102, ‏`VID_1A86` = גשר CH340 — שניהם ESP32 DevKit.

> ⚠ **מלכודת שנתקלנו בה ב-2026-09-18:** הלוח הופיע כ-`USB-SERIAL CH340 (COM4)` אבל
> עם `Status: Error`, קוד 31 — כי `COM4` כבר היה תפוס ע"י *Standard Serial over
> Bluetooth link* (שריד של צימוד ה-SPP `ESP32_ECG_Monitor`). Windows ניתב את COM4
> ל-Bluetooth, ו-esptool נכשל ב-`Write timeout` בלי שום רמז לסיבה האמיתית.
> **התיקון: להעביר את כבל ה-USB לשקע אחר במחשב** (מקבל מספר COM חדש), או לשנות את
> מספר הפורט במנהל ההתקנים (דורש הרשאות מנהל). `Status` חייב להיות `OK` לפני שצורבים.

## 2. בנייה + צריבה

```powershell
$esp = @(Get-CimInstance Win32_PnPEntity | Where-Object { $_.DeviceID -match 'VID_(10C4|1A86)' -and $_.Status -eq 'OK' -and $_.Name -match 'COM\d+' })
if ($esp.Count -ne 1) { throw "נמצאו $($esp.Count) לוחות ESP32 תקינים — חבר בדיוק אחד" }
$port = [regex]::Match($esp[0].Name, 'COM\d+').Value
& "$env:USERPROFILE\.platformio\penv\Scripts\platformio.exe" run --target upload --upload-port $port
```

## 3. מה אמורים לראות ב-Serial (256000 baud)

```
[FW] CYPHIX v3.0.0 - dual Lead II (IN3,IN4 vs IN1) + dedicated RLD on IN6
REVID=0x1
FLEX_CH1_CN=0x11   FLEX_CH2_CN=0x19   FLEX_CH3_CN=0x21
RLD_CN=0x6   CMDET_EN=0xF   LOD_EN=0xF   AFE_SHDN_CN=0x0   CH_CNFG=0x70
```

כל ערך אחר = הרגיסטר לא נכתב (חיווט SPI), לא באג בקוד. אחר כך, פעם בשנייה:

```
# v3 IIa=10432 IIb=11877 diff=-1445 uV lod=0x00 misc=0x00 rld_fault=0
```

- `IIa` ו-`IIb` אמורים לנוע יחד (אותו לב) עם הפרש DC קבוע של כמה mV — זה תקין,
  לכל אלקטרודה offset משלה.
- `lod=0x08` = ‏LL#2 מנותקת · `rld_fault=1` = אלקטרודת ה-RLD מנותקת.
- שאר השורות הן ה-CSV של v2, ללא שינוי.

## 4. אימות מעל BLE — `tools/ble_check.py`

נרשם לכל characteristic בנפרד (כמו אפליקציה) ובודק: הזרם הישן נשאר 16×9B ‏(146B)
בלי אובדן וביטי LOD בתוך שלושת הביטים של v2; הזרם החדש 12×13B ‏(160B), בלי אובדן,
דגל `ADS_OK` דלוק; ומדפיס את שני עותקי Lead II זה לצד זה. דורש `pip install bleak`.

```powershell
python tools/ble_check.py        # 6 שניות לכל characteristic
```

קו בסיס שנמדד ב-2026-09-18 **על v2** (לפני הצריבה), עם הכלי הזה:
`BeatAlign ECG`, ‏MTU 185, ‏99 חבילות × 146B ב-5 שניות, ‏317.8Hz, ‏0 אובדן, ה-characteristic
החדש נעדר — כצפוי. אחרי צריבת v3 שורת ה-legacy חייבת להיראות **זהה**.

<!-- v3.0.2 — adds tools/flash_and_verify.ps1 (one command; verifies the v2 restore image BEFORE overwriting it); v3.0.1 — adds tools/ble_check.py + the v2 baseline it measured; v3.0.0 — flashing v3: VID-based port discovery, the COM4/Bluetooth-link collision, expected boot banner -->
