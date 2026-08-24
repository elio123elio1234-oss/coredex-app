# צריבה — רק על ה-ESP של הניסויים (לא על האבטיפוס!)

> ⚠ **המכשיר הקיים (האבטיפוס) יושב על COM7 — לא נוגעים בו.**
> צורבים אך ורק את ה-ESP הנוסף, אחרי שמזהים את ה-COM שלו.
> על האבטיפוס נצרוב רק אחרי שהניסויים הצליחו ואישרת במפורש.

## שלב 0 — חיווט ה-ESP הנוסף (זהה לקיים)

| CJMCU-1293 P3 | ESP32 DoIt DevKit v1 |
|---|---|
| 5V → VIN · GND → GND | |
| SCLK → GPIO18 · SDI → GPIO23 · SDO → GPIO19 | |
| CSB → GPIO4 · DRDB → GPIO32 | |

## שלב 1 — זיהוי הפורט

חבר רק את ה-ESP החדש ל-USB, ואז:

```powershell
pio device list
```

(או מנהל ההתקנים → Ports). ה-COM החדש שמופיע = שלך. **ודא שהוא לא COM7.**

## שלב 2 — בנייה

```powershell
cd C:\Users\elio1\Desktop\Coredex_App\HW_PLAYGROUND\firmware_playground
pio run
```

(אין PlatformIO CLI? להתקין `pip install platformio`, או להשתמש בתוסף
PlatformIO של VSCode — Open Folder על `firmware_playground` → Build.)

## שלב 3 — צריבה + מוניטור

```powershell
pio run -t upload --upload-port COMx
pio device monitor -p COMx -b 256000
```

בפלט אמור להופיע:

```
=== CYPHIX HW_PLAYGROUND (3x Lead II) ===
[BLE] advertising as CYPHIX-PLAYGROUND
ADS1293 init (preset 0): OK | REVID=0x01
```

אם `REVID` אינו `0x01` — בעיית SPI/חיווט (בדוק CSB/SCLK/SDI/SDO ו-GND משותף).

## שלב 4 — GUI

לפתוח את `HW_PLAYGROUND/gui/index.html` ב-**Chrome או Edge** → "התחבר ל-ESP"
→ לבחור `CYPHIX-PLAYGROUND`. אם Web Bluetooth חסום מ-`file://`:

```powershell
cd C:\Users\elio1\Desktop\Coredex_App\HW_PLAYGROUND\gui
python -m http.server 8000
```

ואז `http://localhost:8000`.

## רשימת סימון לפני צריבה על האבטיפוס (בעתיד, באישור בלבד)

- [ ] פריסט מנצח נבחר על סמך נתוני CSV מוקלטים (σ רעש + מורפולוגיה)
- [ ] LOD עובד על כל האלקטרודות הפעילות
- [ ] אין אובדן חבילות BLE לאורך ריצה של 10 דקות
- [ ] הוחלט איך מיזוג 3 הערוצים משתלב בפרוטוקול הייצור (עדכון `CYPHIX_SHARED` תחילה!)
- [ ] גיבוי הקושחה הנוכחית קיים (`firmware_current/` כאן + `FIRMWARE_BACKUP_v1_int16` בפרויקט המקורי)

<!-- v0.1.0 — הוראות צריבה ל-ESP הניסויים בלבד + שער אישור לאבטיפוס -->
