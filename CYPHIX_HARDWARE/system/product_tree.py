"""CYPHIX Band alpha - the product tree: every deliverable, every interface, every requirement's check.

Why this file exists (2026-11-16). The first plan was organised by risk. Anything that did not look risky
never became a task: the strap's flex circuit, the board's test points and test plan, and the fit of the
routed board in the housing were each found missing only when the owner asked. A plan built from risks has
holes wherever nothing looks dangerous. This file is built from the product instead:

  1. PARTS       - everything a vendor, the factory or the hospital study needs to receive, part by part,
                   including accessories, firmware, production and the regulatory file.
  2. INTERFACES  - every place two parts meet. Each part can be fine on its own while the joint between
                   them belongs to nobody; that is exactly where the flex and the long board fell through.
  3. REQUIREMENTS- every requirement ID in the Band alpha specification, what in the design answers it,
                   and how it is proven (test, analysis or inspection) at which stage.

Run:  python system/product_tree.py            -> the check, then the open items by stage
      python system/tree_html.py --write       -> regenerates the tables on the plan page

`check()` fails when a row is incomplete: no owner, no stage, a file that does not exist, an interface whose
two sides are not both in the tree, or a specification ID with no row. Status words are only as good as the
files behind them, so every row that claims anything points to the file that shows it.

States: done = exists and checked by a measurement or a review; draft = exists, not reviewed;
partial = some of what the vendor needs exists; conflict = two files (or the design and the specification)
give different values; missing = nothing yet.
Stages: "3" = needed before ordering the first wearable units; "4" = needed before the hospital study;
"F" = needed before the factory.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path

VERSION = "0.1.1"
ROOT = Path(__file__).resolve().parents[1]

STATES = ("done", "draft", "partial", "conflict", "missing")
STAGES = ("3", "4", "F")

# Every requirement ID on the specification page (claude.ai/artifact/PpmwYJec8DWmWGM8rhy5re), v17.
SPEC_IDS = ("SYS-01", "SYS-02", "ELC-01", "ELC-02", "ELC-03", "ELC-04", "PWR-01", "SAF-01",
            "MEC-01", "OPT-01", "FW-01", "UI-01", "REG-01")


@dataclass(frozen=True)
class Group:
    key: str
    he: str


@dataclass(frozen=True)
class Part:
    key: str
    group: str
    he: str          # the part, in Hebrew
    gives: str       # what the vendor / factory / study receives
    state: str
    need: str        # the first stage that cannot start without it
    who: str
    note: str        # what is missing, or what was checked
    files: tuple[str, ...] = field(default_factory=tuple)


@dataclass(frozen=True)
class Interface:
    key: str
    a: str           # part key
    b: str           # part key
    he: str
    measure: str     # the dimension or signal both sides must agree on
    state: str
    need: str
    note: str
    files: tuple[str, ...] = field(default_factory=tuple)


@dataclass(frozen=True)
class Requirement:
    id: str
    he: str
    design: str      # what in the design answers it
    verify: str      # how it is proven, and by whom
    state: str       # done = proven; draft = design answers it, proof planned; missing = no answer or no proof
    need: str
    parts: tuple[str, ...] = field(default_factory=tuple)


PCB = "electronics/main_board/band_alpha_main.kicad_pcb"
MAKE_PCB = "electronics/main_board/make_pcb.py"
SCH = "electronics/main_board/make_schematic.py"
BOM = "electronics/main_board/bom.csv"
DRC = "electronics/main_board/drc.rpt"
TEST = "electronics/main_board/TEST_PLAN.md"
FLEX = "electronics/strap_flex/make_flex.py"
FLEX_PCB = "electronics/strap_flex/strap_flex.kicad_pcb"
MODEL = "mechanical/band_id.py"
FW2 = "firmware/stage2_ads129x_xiao/src/main.cpp"
BLE2 = "firmware/stage2_ads129x_xiao/src/compat_ble.cpp"
E1 = "experiments/E1_dry_electrodes.md"
ME, ENG = "אני", "אני, ומהנדס אלקטרוניקה שמבקר"

GROUPS: tuple[Group, ...] = (
    Group("device", "בתוך המכשיר"),
    Group("strap", "הרצועה"),
    Group("dock", "הטעינה"),
    Group("fw", "תוכנה"),
    Group("make", "בדיקה והרכבה"),
    Group("reg", "בטיחות, תקינה והניסוי"),
)

PARTS: tuple[Part, ...] = (
    # ---------------------------------------------------------------- the device
    Part("board", "device", "הלוח האלקטרוני",
         "קובצי ייצור: [[Gerber]], קידוח, מיקום רכיבים, שרטוט שכבות ושרטוט הרכבה",
         "partial", "3", ENG,
         "מצויר ומחובר כמעט כולו. חסרים 6 חיבורים: 4 בסוללה, אחד באדמה ואחד ב-[[3V]]. חסרים גם מעבר ידני על הכניסות "
         "האנלוגיות וסימוני יישור, ושום קובץ ייצור עוד לא הופק.", (PCB, DRC)),
    Part("bom", "device", "רשימת רכיבים להזמנה",
         "מק״ט יצרן וחלופה לכל רכיב, ובדיקת מלאי",
         "partial", "3", ME,
         "יש ערכים ותבניות ל-128 רכיבים. אין מק״ט לסוללה, למנוע, לקפיצים ולרכיבים הקטנים, ואף רכיב לא נבדק במלאי.", (BOM,)),
    Part("cell", "device", "הסוללה",
         "דגם מסוים, דף נתונים ותעודות [[IEC 62133-2]] ו-[[UN 38.3]]",
         "missing", "3", "אני בוחר, אתה מאשר",
         "יש רק גודל: [[401225]], כ-[[100 mAh]]. בדף הדרישות כתוב [[150–300 mAh]]."),
    Part("springs", "device", "מגעי הקפיץ",
         "דגם קפיץ, גובה וכוח לחיצה, ומשטח נחיתה על הפלדה. 5 לאלקטרודות ו-2 לטעינה",
         "missing", "3", ME,
         "בלוח יש במקומם משטחים ריקים בלבד."),
    Part("motor", "device", "מנוע הרטט",
         "דגם, ואיך הוא מוחזק במארז",
         "missing", "3", ME,
         "כתוב רק ״מנוע מטבע [[8]] מ״מ״, בלי דגם ובלי תושבת."),
    Part("housing", "device", "המארז: שני החצאים והזיזים",
         "שרטוטים עם טולרנסים, חומר, חיבור בין החצאים, אחיזה ללוח, וגרסה להדפסה",
         "partial", "3", ME,
         "קיים כמודל עיצוב בלבד, ומצויר ללוח של [[25]] מ״מ. הלוח האמיתי [[32]] מ״מ ולא נכנס. "
         "אין שרטוטים, אין חיבור בין החצאים ואין אחיזה ללוח.", (MODEL,)),
    Part("plates", "device", "משטחי הפלדה של היד והרגל",
         "שרטוטים, פלדת [[316L]] בדרגה שעוברת [[EN 1811]] (שחרור ניקל), גימור ושיטת ייצור",
         "partial", "3", ME, "קיימים במודל בלבד.", (MODEL,)),
    Part("back", "device", "חלון הספיר, המרכז הקרמי ומגעי הטעינה",
         "שרטוטים ומפרט חומר; לחלון גם מפרט אופטי",
         "partial", "3", ME, "קיימים במודל בלבד.", (MODEL,)),
    Part("seals", "device", "אטימה והדבקה",
         "אטם, דבק ותהליך לכל מפגש: החצאים, המשטחים, החלון וכניסת הפלקס",
         "missing", "3", ME,
         "אין אטם או דבק במודל, ויש חור במארז מאחורי כל משטח פלדה. הדרישה היא [[IP54]]."),
    Part("lightpipe", "device", "מוביל האור של הנורית",
         "חלק שקוף במארז, מעל הנורית שבלוח",
         "missing", "3", ME, "מוזכר בקוד המודל, לא מצויר."),
    Part("antenna", "device", "האנטנה",
         "בדיקת קליטה על היד, בתוך המארז",
         "partial", "3", "מהנדס RF, עוד לא נבחר",
         "משתמשים באנטנה של המודול, ויש אזור אסור בלוח. אין ניתוח ואין בדיקה.", (MAKE_PCB,)),
    Part("ppg", "device", "חיישן הדופק האופטי והמדחום (אופציה)",
         "דגם אחד שמוסכם בלוח ובמודל, ומחסום אור בין הנורית לגלאי",
         "conflict", "4", ME,
         "בסכמה [[MAX30102]], במודל ובחישוב הגודל [[MAXM86161]]. לא מותקנים ביחידות הראשונות.", (SCH, MODEL)),
    # ---------------------------------------------------------------- the strap
    Part("flex", "strap", "המעגל הגמיש",
         "[[Gerber]], שרטוט עם השכבות, המחזק והכיסוי, לכל אורך רצועה",
         "partial", "3", ENG,
         "מצויר ועובר את בדיקת KiCad, באורך אחד. חסרים שרטוט ייצור, אימות צד המגעים מול שרטוט המחבר, ושלושת האורכים.",
         (FLEX, FLEX_PCB)),
    Part("strap", "strap", "רצועת ה-FKM",
         "תבנית יציקה, סוג החומר, איך מכניסים את הפלקס, ושלוש מידות",
         "partial", "3", ME,
         "מודל לפרק יד אחד בלבד. אין תבנית ואין חומר מוגדר. לחמש יחידות: יציקה בתבנית מודפסת.", (MODEL,)),
    Part("raplates", "strap", "משטחי ה-RA והפינים שלהם",
         "שרטוט, ואיך הפין נשאר לחוץ על הפלקס לאורך זמן",
         "partial", "3", ME,
         "המיקומים מסכימים עם הפלקס. החיבור עצמו הוא לחיצה בתוך הגומי, בלי חלק ובלי תהליך.", (MODEL, FLEX)),
    Part("closure", "strap", "הסקוטש, הלולאה והמוט",
         "ספק סקוטש, הדבקה לגומי, ואיך המוט ננעל בזיזים",
         "partial", "3", ME, "במודל בלבד.", (MODEL,)),
    # ---------------------------------------------------------------- charging
    Part("dock", "dock", "המעמד",
         "סכמה, לוח, פינים קפיציים, הגבלת זרם ומארז",
         "partial", "3", ME,
         "יש רק צורה במודל. אין בו אלקטרוניקה ואין מגנטים, וממילא פלדת [[316L]] לא נמשכת למגנט, "
         "אז צריך דרך אחרת להחזיק את הצמיד במקום.", (MODEL,)),
    Part("psu", "dock", "ספק הכוח והכבל",
         "ספק [[USB]] עם אישור בטיחות, וכבל",
         "missing", "3", ME, "לא נבחרו."),
    # ---------------------------------------------------------------- software
    Part("fwmain", "fw", "קושחת המוצר",
         "קושחה על [[nRF Connect SDK]]: דגימה מה-ADS1294, הפחתה ל-[[500]], Bluetooth מוצפן, חסימת הקלטה בזמן טעינה, "
         "סוללה, נורית ורטט",
         "missing", "3", ME,
         "יש רק קושחת שולחן ל-XIAO, ב-Arduino. חלק מהדרייבר של השבב ישמש שוב."),
    Part("boot", "fw", "עדכון קושחה חתום",
         "[[MCUboot]], עדכון חתום דרך Bluetooth, ושמירת המפתחות",
         "missing", "4", ME,
         "בלעדיו אי אפשר לעדכן יחידה סגורה: נקודות הצריבה בתוך המארז."),
    Part("testfw", "fw", "קושחת בדיקה למפעל",
         "תוכנה שבודקת כל לוח בסוף הייצור ורושמת מספר סידורי",
         "missing", "F", ME, "לא התחיל."),
    Part("app", "fw", "האפליקציה: 4 ערוצים ו-500 דגימות",
         "פרוטוקול חדש ב-[[CYPHIX_SHARED]], ב-Web, ב-iOS וב-Android",
         "missing", "4", "אני, ורק באישורך",
         "היום רק [[320 Hz]], כך שרוחב הפס של [[SYS-02]] לא מגיע לרופא."),
    # ---------------------------------------------------------------- test and assembly
    Part("e1", "make", "ניסוי שלב 1: אלקטרודות יבשות",
         "הוראות ניסוי בגדלים של גרסה 3.2",
         "conflict", "3", "אני כותב, אתה מריץ",
         "ההוראות בודקות משטחים של [[7 × 21]] מ״מ במרווח [[2]] מ״מ. בגרסה 3.2 המשטחים גדולים פי [[2.7]] "
         "והמרווח [[0.6]] מ״מ. לעדכן לפני ההרצה.", (E1, MODEL)),
    Part("testplan", "make", "תכנית הבדיקה של הלוח",
         "12 צעדים, מהחשמל הראשון ועד אדם",
         "draft", "3", ME,
         "כתובה, לא נוסתה. חסרות בדיקות לרוחב הפס, לעכבת הכניסה ולהתאמה בין הערוצים.", (TEST,)),
    Part("fixture", "make", "צריבה ובדיקת סוף קו",
         "כבל [[TC2030]] לצריבה, ומתקן פינים לבדיקה",
         "missing", "3", ME, "רק הכבל נבחר בשם."),
    Part("simulator", "make", "סימולטור אק״ג",
         "מכשיר שמזריק אות ידוע לאלקטרודות, לבדיקה בלי אדם",
         "missing", "3", ME, "מוזכר בצעד 10 של תכנית הבדיקה, לא נבחר."),
    Part("assembly", "make", "הוראות הרכבה",
         "סדר הרכבה, הדבקה, אטימה ובדיקה, לחמש היחידות הראשונות",
         "missing", "3", ME, "לא התחיל."),
    Part("labels", "make", "תווית, מספר סידורי, אריזה והוראות שימוש",
         "תווית ״מכשיר בניסוי״, מספר סידורי לכל יחידה, הוראות שימוש וניקוי",
         "missing", "4", ME, "לא התחיל."),
    # ---------------------------------------------------------------- safety, standards and the study
    Part("risk", "reg", "ניתוח סיכונים, [[ISO 14971]]",
         "רשימת כשלים ומה מונע כל אחד: מגעי הטעינה, זיעה בין המשטחים, סוג החלק שבמגע עם המטופל",
         "missing", "3", "אני מכין, המהנדס מבקר",
         "נחוץ לפני שיחידה שלנו עולה על אדם, גם עליך."),
    Part("safety", "reg", "בטיחות חשמלית ותאימות אלקטרומגנטית",
         "בדיקות [[IEC 60601-1]], [[IEC 60601-1-2]], ו-[[IEC 60601-1-11]] לשימוש בבית",
         "missing", "4", "מעבדה מוסמכת",
         "בסכמה יש מגבלות זרם לפי התקן. שום בדיקה עוד לא תוכננה."),
    Part("perf", "reg", "ביצועי האק״ג",
         "בדיקות לפי [[IEC 60601-2-25]] או [[60601-2-47]]: רוחב פס, רעש, דחיית אות משותף, עכבת כניסה",
         "missing", "4", "אני, ומעבדה",
         "איזה מהשניים חל תלוי בייעוד שנכתוב למכשיר."),
    Part("bio", "reg", "חומרים במגע עם העור",
         "רשימת חומרים עם נתוני [[ISO 10993]] (חלקים 5, 10, 23), שחרור ניקל [[EN 1811]], וחומר חיטוי מאושר",
         "missing", "4", "אני מכין, הספקים מספקים נתונים", "לא התחיל."),
    Part("radio", "reg", "אישורי רדיו",
         "אישור משרד התקשורת. בהמשך: [[EN 300 328]], [[EN 301 489]], [[FCC Part 15]]",
         "missing", "4", "אני בודק מה נדרש", "למודול יש אישורים משלו; למוצר השלם צריך לבדוק."),
    Part("sw", "reg", "תיעוד התוכנה ואבטחת מידע",
         "[[IEC 62304]]: תכנית, דרישות, בדיקות ורשימת רכיבי צד שלישי. [[IEC 81001-5-1]] לאבטחה",
         "missing", "4", ME, "לא התחיל, ונכתב יחד עם קושחת המוצר."),
    Part("study", "reg", "תיק הניסוי בבית החולים",
         "תכנית ניסוי לפי [[ISO 14155]], חוברת חוקר, ועדת הלסינקי והגשה למשרד הבריאות",
         "missing", "4", "הגורם המלווה בבית החולים, ואני מכין טיוטות", "לא התחיל."),
    Part("usability", "reg", "שמישות, [[IEC 62366-1]]",
         "בדיקה שמבוגרים מצליחים לשים, להקליט ולטעון בלי עזרה",
         "missing", "F", ME, "לא התחיל."),
    Part("qms", "reg", "מערכת איכות, [[ISO 13485]]",
         "נהלים, רישום שינויים ומעקב אחרי כל יחידה",
         "missing", "F", "אתה, עם יועץ", "נחוץ לפני ייצור סדרתי."),
)

INTERFACES: tuple[Interface, ...] = (
    Interface("board-housing", "board", "housing", "הלוח בתוך המארז",
              "אורך הלוח, מקומו, גובה הרכיבים מול הקירות, והסוללה לידו",
              "conflict", "3",
              "הלוח [[32]] מ״מ והמודל מצויר ל-[[25]]. הסוללה במודל יושבת איפה שהלוח האמיתי נגמר. "
              "הערכה ראשונה: הארכת האי לבד לא מספיקה, צריך גם עובי או סידור אחר.", (MODEL, MAKE_PCB)),
    Interface("springs-plates", "springs", "plates", "הקפיצים אל משטחי הפלדה",
              "מיקום כל קפיץ לאורך האי",
              "conflict", "3",
              "ארבעת הקפיצים במקום אחר במודל ובלוח, הפרש של [[2]] עד [[6.3]] מ״מ. "
              "כל קפיץ עדיין מתחת למשטח הנכון, אבל לא מול החור שלו במארז.", (MODEL, MAKE_PCB)),
    Interface("motor-board", "motor", "board", "מנוע הרטט",
              "מקום המנוע", "conflict", "3",
              "[[13.3]] מ״מ בין המקום במודל למקום בלוח.", (MODEL, MAKE_PCB)),
    Interface("cell-board", "cell", "board", "הסוללה אל הלוח",
              "מקום הלשוניות", "conflict", "3",
              "[[4.8]] מ״מ בין המודל ללוח.", (MODEL, MAKE_PCB)),
    Interface("led-lightpipe", "board", "lightpipe", "הנורית אל קו האור",
              "מקום הנורית", "conflict", "3",
              "[[3.1]] מ״מ בין המודל ללוח, ואין מוביל אור ביניהם.", (MODEL, MAKE_PCB)),
    Interface("flex-j1", "flex", "board", "הפלקס אל המחבר בלוח",
              "רוחב הזנב, מספר המגעים וצד המגעים", "conflict", "3",
              "בפלקס זנב של [[2.5]] מ״מ למחבר של 4 מגעים. במודל הזנב ברוחב [[13.4]] מ״מ. צד המגעים לא אומת.",
              (FLEX, MODEL, MAKE_PCB)),
    Interface("posts-flex", "raplates", "flex", "פיני ה-RA אל הפלקס",
              "[[34.5]] ו-[[49.1]] מ״מ מקצה האי", "draft", "3",
              "המיקומים מסכימים. הלחיצה עצמה לא מוגדרת ולא נבדקה.", (FLEX, MODEL)),
    Interface("strap-fixed", "strap", "housing", "הרצועה אל האי, בצד הקבוע",
              "הלשון, העוגן, והאטימה בכניסת הפלקס", "partial", "3",
              "במודל בלבד. האטימה בכניסת הפלקס לא מוגדרת.", (MODEL,)),
    Interface("strap-free", "closure", "housing", "הרצועה אל האי, בצד החופשי",
              "המוט בזיזים, ואיך הוא ננעל", "partial", "3",
              "המוט קיים, הנעילה שלו לא.", (MODEL,)),
    Interface("hook-strap", "closure", "strap", "הסקוטש אל הגומי",
              "שיטת הדבקה וחוזק", "missing", "3", "לא מוגדר."),
    Interface("shells", "housing", "seals", "שני חצאי המארז זה לזה",
              "סוג החיבור, האטם והטולרנס", "missing", "3",
              "כתוב ״מרותכים באמצע הגובה״. אין תכנון לחיבור."),
    Interface("plates-housing", "plates", "housing", "המשטחים, החלון והקרמיקה בתוך המארז",
              "איך כל אחד מוחזק ונאטם", "missing", "3",
              "אין אטם ואין דבק, ויש חור מאחורי כל משטח."),
    Interface("ppg-window", "ppg", "back", "החיישן האופטי אל החלון",
              "גובה החיישן מול הבליטה שבחלון", "conflict", "4",
              "המודל מצויר לחיישן בגובה [[1.4]] מ״מ, ובסכמה [[MAX30102]] שגבוה יותר.", (MODEL, SCH)),
    Interface("chg-board", "back", "board", "מגעי הטעינה אל הלוח",
              "[[±9]] מ״מ, במרכז האי", "draft", "3",
              "המיקומים מסכימים. דגם המגע והאטימה שלו לא נבחרו.", (MODEL, MAKE_PCB)),
    Interface("band-dock", "back", "dock", "הצמיד אל המעמד",
              "מקום הפינים, מתח וזרם, ואיך הצמיד נשאר במקום", "partial", "3",
              "הפינים מסכימים במודל. אין חשמל במעמד ואין מה שיחזיק את הצמיד.", (MODEL,)),
    Interface("antenna-housing", "antenna", "housing", "האנטנה מול המארז והיד",
              "מרחק מהפלדה ומהיד, וטווח", "partial", "3",
              "אזור אסור בלוח בלבד.", (MAKE_PCB,)),
    Interface("device-app", "fwmain", "app", "המכשיר אל האפליקציה",
              "פרוטוקול ה-Bluetooth", "partial", "4",
              "קיים רק פורמט התאימות של [[320 Hz]]. אין פרוטוקול ל-4 ערוצים ו-500, ואין הצפנה.", (BLE2,)),
    Interface("device-programmer", "board", "fixture", "המכשיר אל הצריבה",
              "גישה לנקודות הצריבה", "partial", "3",
              "הנקודות בלוח. במארז סגור אין אליהן גישה.", (MAKE_PCB,)),
)

REQUIREMENTS: tuple[Requirement, ...] = (
    Requirement("SYS-01", "שני לידים, כל אחד פעמיים, ומהם 6",
                "4 ערוצים: LA מול RA1 ומול RA2, LL1 ו-LL2 מול LA",
                "צעד 11 בתכנית הבדיקה, על אדם אחד, בלי מדד דיוק. ההשוואה למכשיר 12 לידים תהיה בניסוי.",
                "partial", "4", ("board",)),
    Requirement("SYS-02", "500 דגימות בשנייה, [[0.05–150 Hz]]",
                "השבב דוגם [[1,000]] והקושחה מפחיתה ל-[[500]]. הקושחה הזאת עוד לא קיימת",
                "אין. צריך מדידת תגובת תדר מסימולטור. גם האפליקציה היום ב-[[320]] בלבד.",
                "missing", "3", ("fwmain", "app")),
    Requirement("ELC-01", "6 אלקטרודות יבשות על 7 משטחים",
                "משטחי [[316L]] של גרסה 3.2",
                "ניסוי שלב 1, אבל ההוראות בגדלים ישנים.",
                "partial", "3", ("plates", "raplates", "e1")),
    Requirement("ELC-02", "[[ADS1294]] בכל יחידה",
                "[[ADS1294IPAG]] בסכמה ובלוח",
                "צעד 6: קריאת מספר הזיהוי של השבב.",
                "draft", "3", ("board",)),
    Requirement("ELC-03", "עכבה גבוהה, רכיבים מותאמים, מקום למגבר",
                "נגדים של [[0.1%]], קבלים [[C0G]], מקום למגבר ליד כל אלקטרודה",
                "אין. צריך מדידה של עכבת הכניסה, ההתאמה בין הערוצים ודחיית אות משותף.",
                "missing", "3", ("board",)),
    Requirement("ELC-04", "[[nRF52840]] במודול עם אישורים",
                "[[MDBT50Q-1MV2]]",
                "צעד 5: חיבור ב-1 וב-5 מטר. חסרה בדיקת טווח כשהצמיד על היד.",
                "partial", "3", ("board", "antenna")),
    Requirement("FW-01", "קושחה על [[nRF Connect SDK]], עדכון חתום, דגימה לפי [[DRDY]]",
                "אין עדיין. קושחת השולחן כתובה ב-Arduino",
                "אין.",
                "missing", "3", ("fwmain", "boot")),
    Requirement("PWR-01", "סוללה, מטען, ווסת שקט, טעינה במגעים",
                "[[100 mAh]], מטען [[MCP73831]], מגעים שטוחים. בדף הדרישות: [[150–300 mAh]], [[BQ25120A]], פיני [[pogo]]",
                "צעדים 3, 7 ו-9. אין שיטה למדידת זמן הסוללה.",
                "conflict", "3", ("cell", "board", "dock")),
    Requirement("SAF-01", "בלי הקלטה בזמן טעינה, מגעים מבודדים, זרם מתחת ל-[[10 µA]]",
                "גשר, מפקח מתח ושני טרנזיסטורים שמנתקים את המגעים, ו-[[47.5 kΩ]] פעמיים בכל קו",
                "צעדים 8, 9 ו-12. החסימה בקושחה לא קיימת. [[10]] או [[50 µA]] בתקלה בודדת עדיין פתוח.",
                "conflict", "3", ("board", "fwmain", "risk")),
    Requirement("MEC-01", "בערך [[46 × 30 × 7.2]] מ״מ, עד [[40]] גרם, [[IP54]]",
                "המודל בגודל הזה, אבל הלוח האמיתי לא נכנס בו",
                "אין בדיקה לגודל, למשקל או לאטימה. חישוב המשקל נעשה לרצועת סיליקון ולמשטחים הקטנים; עם FKM ומשטחי 3.2 הוא עלול לעבור [[40]] גרם.",
                "missing", "3", ("housing", "strap", "seals")),
    Requirement("UI-01", "כפתור, נורית ורטט",
                "נורית, רטט ומשטח מגע. אין כפתור",
                "אין.",
                "conflict", "3", ("board", "lightpipe", "motor")),
    Requirement("OPT-01", "מקום לחיישן אופטי ומדחום",
                "מקום בלוח וחלון במארז; שני דגמים שונים בסכמה ובמודל",
                "אין.",
                "missing", "4", ("ppg", "back")),
    Requirement("REG-01", "[[IEC 60601-1]], חומרים עם [[ISO 10993]], בדיקות מקדימות",
                "מגבלות הזרם בסכמה",
                "רק ״מעבדה מוסמכת״ בצעד 12. ISO 10993 והבדיקות המקדימות לא מוגדרות.",
                "missing", "4", ("safety", "bio", "risk")),
)


def check() -> list[str]:
    bad: list[str] = []
    gkeys = {g.key for g in GROUPS}
    pkeys = [p.key for p in PARTS]
    if len(set(pkeys)) != len(pkeys):
        bad.append("duplicate part keys")
    for p in PARTS:
        tag = f"part {p.key}"
        if p.group not in gkeys:
            bad.append(f"{tag}: unknown group {p.group}")
        if p.state not in STATES or p.need not in STAGES:
            bad.append(f"{tag}: bad state/stage")
        if not (p.he and p.gives and p.who and p.note):
            bad.append(f"{tag}: empty field")
        if p.state != "missing" and not p.files:
            bad.append(f"{tag}: claims '{p.state}' but points to no file")
        for f in p.files:
            if not (ROOT / f).exists():
                bad.append(f"{tag}: file not found: {f}")
    fkeys = [f.key for f in INTERFACES]
    if len(set(fkeys)) != len(fkeys):
        bad.append("duplicate interface keys")
    for f in INTERFACES:
        tag = f"interface {f.key}"
        for side in (f.a, f.b):
            if side not in pkeys:
                bad.append(f"{tag}: side '{side}' is not a part")
        if f.state not in STATES or f.need not in STAGES:
            bad.append(f"{tag}: bad state/stage")
        if f.state in ("done", "draft", "conflict") and len(f.files) < 2:
            bad.append(f"{tag}: '{f.state}' needs the files of both sides")
        if f.state == "partial" and not f.files:
            bad.append(f"{tag}: 'partial' needs at least one file")
        for x in f.files:
            if not (ROOT / x).exists():
                bad.append(f"{tag}: file not found: {x}")
    rids = [r.id for r in REQUIREMENTS]
    for sid in SPEC_IDS:
        if sid not in rids:
            bad.append(f"requirement {sid}: on the specification page, no row here")
    for r in REQUIREMENTS:
        tag = f"requirement {r.id}"
        if r.id not in SPEC_IDS:
            bad.append(f"{tag}: not on the specification page")
        if r.state not in STATES or r.need not in STAGES:
            bad.append(f"{tag}: bad state/stage")
        if not (r.design and r.verify):
            bad.append(f"{tag}: empty design or verification")
        for k in r.parts:
            if k not in pkeys:
                bad.append(f"{tag}: part '{k}' not in the tree")
    return bad


def report() -> str:
    order = {"missing": 0, "conflict": 1, "partial": 2, "draft": 3, "done": 4}
    lines = []
    for stage in STAGES:
        rows = [("part", p.key, p.state, p.note) for p in PARTS if p.need == stage and p.state != "done"]
        rows += [("interface", f.key, f.state, f.note) for f in INTERFACES if f.need == stage and f.state != "done"]
        rows += [("requirement", r.id, r.state, r.verify) for r in REQUIREMENTS if r.need == stage and r.state != "done"]
        rows.sort(key=lambda r: order[r[2]])
        lines.append(f"\n== needed before stage {stage}: {len(rows)} open ==")
        for kind, key, st, note in rows:
            lines.append(f"  [{st:7}] {kind:11} {key:16} {note}")
    return "\n".join(lines)


if __name__ == "__main__":
    problems = check()
    if problems:
        print("CHECK FAILED\n  " + "\n  ".join(problems))
        raise SystemExit(1)
    print(f"product tree v{VERSION}: {len(PARTS)} parts, {len(INTERFACES)} interfaces, "
          f"{len(REQUIREMENTS)} requirements - check passed")
    print(report())

# v0.1.1 - position conflicts shown as the gap between model and board; v0.1.0 - the product tree: parts, interfaces and requirement checks, with a completeness check
