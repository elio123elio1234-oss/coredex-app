# נקודת שחזור — הקושחה שצרובה על אבטיפוס ה-ESP32 (גרסת int32)

נלקח ב-**2026-09-18**, רגע לפני תחילת השדרוג ל-"Lead II כפול + RLD ייעודי".
"לחזור לגרסה המקורית" בצד החומרה = לצרוב את ארבעת הקבצים שבתיקיה הזו.

תג ה-git התואם בכל המאגרים: **`restore-point-2026-09-18`**.

## מה יש כאן

| קובץ | כתובת בפלאש | SHA-256 |
|---|---|---|
| `bootloader.bin` | `0x1000` | `3D234A7471F67B013686DABD4DEE7C1FA915C9928463616A94BC9297ACF1ABF8` |
| `partitions.bin` | `0x8000` | `148B959CBFF1C38AA8E1D5C0BA9D612C54997B945E56A63F41223EEF650653A1` |
| `boot_app0.bin` | `0xe000` | `F94C5D786A7A8FAB06AC5D10E33BF37711A6697636DC037559EA19CC410A17F0` |
| `firmware.bin` | `0x10000` | `CEE79649D85C740DB8677B0947A67B0D8240B4B9200FD68266ED4DB853B3195B` |

- מקור הבינאריים: `Desktop\ESP32-ADS1293-master\ESP32-ADS1293-master\.pio\build\esp32doit-devkit-v1\`
  (`boot_app0.bin` מגיע מחבילת ה-framework, לא מה-build).
- נבנו עם `platform espressif32 6.12.0` · `framework-arduinoespressif32 3.20017.241212`.
  ה-`platformio.ini` **לא נועל גרסת platform** — בנייה מחדש מהמקור בעתיד עלולה
  להפיק בינארי שונה. זו הסיבה שהבינאריים עצמם מגובים ולא רק הקוד.
- קוד המקור התואם: `../src/`, `../include/`, `../platformio.ini` — אומת ב-2026-09-18
  שהוא **זהה בייט-לבייט** (SHA-256) למקור הקנוני שעל שולחן העבודה.

## מה מאומת ומה לא

- ✔ `firmware.bin` נבנה ב-2026-07-19 10:42, שתי דקות אחרי השמירה האחרונה של
  `main.cpp` (10:40) — כלומר הוא נבנה מהקוד הנוכחי, ושונה מגיבוי ה-int16 הישן.
- ✘ **לא בוצעה קריאה חוזרת מהשבב.** האבטיפוס לא היה מחובר ב-USB בזמן הגיבוי, ולכן
  "זה בדיוק מה שצרוב" היא מסקנה מחותמות הזמן ולא מדידה. כשהלוח מחובר אפשר לסגור
  את זה בפקודת `verify_flash` אחת (למטה) — היא רק קוראת, לא כותבת.
- ⚠ ב-repo הקנוני (`ESP32-ADS1293-master`) תיקון ה-int32 ב-`src/main.cpp` עדיין
  **לא מקומט** — ה-remote שלו מחזיק את גרסת ה-int16 הישנה. הגיבוי המלא והדחוף
  של הקושחה הנוכחית הוא כאן, ב-`coredex-app`.

## שחזור

הדרך הרגילה: לומר ל-Claude "תחזיר את ה-ESP לגרסה המקורית" עם הלוח מחובר — הוא
מזהה את הפורט לפי VID (לא לפי מספר COM, שמתחלף) ומריץ את הפקודה.

ידנית, מ-PowerShell בתוך התיקיה הזו — הפורט מזוהה אוטומטית לפי גשר ה-USB של ה-ESP32
(`VID_10C4` = CP2102, `VID_1A86` = CH340). אם מחוברים שני לוחות ESP הפקודה עוצרת
ולא מנחשת:

```powershell
$esp = @(Get-CimInstance Win32_PnPEntity | Where-Object { $_.DeviceID -match 'VID_(10C4|1A86)' -and $_.Name -match '\((COM\d+)\)' })
if ($esp.Count -ne 1) { throw "נמצאו $($esp.Count) לוחות ESP32 — חבר בדיוק אחד" }
$port = [regex]::Match($esp[0].Name, 'COM\d+').Value
$py = "$env:USERPROFILE\.platformio\penv\Scripts\python.exe"
$tool = "$env:USERPROFILE\.platformio\packages\tool-esptoolpy\esptool.py"

# בדיקה בלבד (לא כותבת): האם מה שעל השבב זהה לגיבוי?
& $py $tool --chip esp32 --port $port verify_flash 0x10000 firmware.bin

# שחזור מלא:
& $py $tool --chip esp32 --port $port --baud 460800 write_flash -z `
  0x1000 bootloader.bin 0x8000 partitions.bin 0xe000 boot_app0.bin 0x10000 firmware.bin
```

אחרי שחזור: המכשיר מפרסם שוב כ-`BeatAlign ECG`, חבילות ‎16×9B int32 µV‏, RLD על IN3 —
וכל גרסת אפליקציה (כולל אלה שמתג השחזור) עובדת מולו.

<!-- v0.1.3 — restore point 2026-09-18: flashed int32 production binaries + hashes + verify/restore procedure -->
