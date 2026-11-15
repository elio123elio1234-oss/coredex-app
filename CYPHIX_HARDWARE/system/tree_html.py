"""Render system/product_tree.py into the plan page's HTML block (Hebrew, right-to-left).

Run:  python system/tree_html.py            -> prints the block
      python system/tree_html.py --write    -> replaces the block between the TREE markers in plan/plan.html

The block sits between <!-- TREE:BEGIN --> and <!-- TREE:END --> in plan.html, so it is regenerated, never
hand-edited. The check in product_tree.py runs first; the page is not written if it fails.
"""
from __future__ import annotations

import argparse
import html
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import product_tree as T  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
PLAN = ROOT / "plan" / "plan.html"
BEGIN, END = "<!-- TREE:BEGIN -->", "<!-- TREE:END -->"

STATE_HE = {"done": "נבדק", "draft": "טיוטה", "partial": "חלקי", "conflict": "סותר", "missing": "חסר"}
STAGE_HE = {"3": "3", "4": "4", "F": "מפעל"}


HEAD = '      <div class="row head"><div>%s</div><div>%s</div><div>שלב</div></div>'


def esc(s: str) -> str:
    return html.escape(s, quote=False)


def ltr(s: str) -> str:
    """Escape, then turn [[...]] into a left-to-right span, for runs such as "32 × 26" or "IEC 60601-1"
    that the bidi algorithm would otherwise split or reorder inside Hebrew text."""
    t = esc(s)
    while "[[" in t:
        i = t.index("[[")
        j = t.index("]]", i)
        t = t[:i] + '<span class="ltr">' + t[i + 2:j] + "</span>" + t[j + 2:]
    return t


def state(s: str) -> str:
    return f'<span class="st {s}">{STATE_HE[s]}</span>'


def counts(rows, key="state") -> dict:
    c: dict = {}
    for r in rows:
        c[getattr(r, key)] = c.get(getattr(r, key), 0) + 1
    return c


def block() -> str:
    parts, faces, reqs = T.PARTS, T.INTERFACES, T.REQUIREMENTS
    pc, fc = counts(parts), counts(faces)
    rc = counts(reqs)
    L = []
    a = L.append
    a(BEGIN)
    a('  <section id="tree">')
    a("    <h2>כל מה שצריך להיות מוכן</h2>")
    a("    <p>כל מה שהמפעל צריך לקבל, חלק אחרי חלק. הרשימה נוצרת מקובץ אחד בתיקייה, "
      "<span class=\"ltr\">system/product_tree.py</span>, ובדיקה אוטומטית נכשלת אם לחלק אין קובץ, אין בדיקה או אין אחראי.</p>")
    a('    <div class="nums">')
    a(f'      <div><div class="n1"><span class="ltr">{len(parts)}</span> חלקים</div>'
      f'<div class="n2"><span class="ltr">{pc.get("missing", 0)}</span> חסרים, <span class="ltr">{pc.get("conflict", 0)}</span> סותרים, '
      f'<span class="ltr">{pc.get("done", 0)}</span> נבדקו</div></div>')
    a(f'      <div><div class="n1"><span class="ltr">{len(faces)}</span> חיבורים</div>'
      f'<div class="n2"><span class="ltr">{fc.get("conflict", 0)}</span> סותרים, <span class="ltr">{fc.get("missing", 0)}</span> לא מוגדרים</div></div>')
    a(f'      <div><div class="n1"><span class="ltr">{len(reqs)}</span> דרישות</div>'
      f'<div class="n2"><span class="ltr">{rc.get("missing", 0)}</span> בלי בדיקה, <span class="ltr">{rc.get("conflict", 0)}</span> סותרות את התכנון</div></div>')
    a("    </div>")

    for group in T.GROUPS:
        rows = [p for p in parts if p.group == group.key]
        if not rows:
            continue
        a(f"    <h3>{esc(group.he)}</h3>")
        a('    <div class="tree">')
        a(HEAD % ("מה המפעל מקבל", "מצב, ומה חסר"))
        for p in rows:
            a(f'      <div class="row"><div class="what">{ltr(p.he)}<span class="why">{ltr(p.gives)}</span></div>'
              f'<div>{state(p.state)}<span class="why">{ltr(p.note)}</span></div>'
              f'<div class="when">{STAGE_HE[p.need]}</div></div>')
        a("    </div>")
    a("  </section>")

    a('  <section id="faces">')
    a("    <h2>החיבורים בין החלקים</h2>")
    a("    <p>כאן נפלו הפלקס והלוח הארוך: כל חלק היה בסדר לבד, והחיבור ביניהם לא היה של אף אחד. "
      "חיבור מוגדר רק כששני הקבצים, משני הצדדים, מסכימים על אותה מידה.</p>")
    a('    <div class="tree">')
    a(HEAD % ("על מה שני הצדדים צריכים להסכים", "מצב"))
    for f in faces:
        a(f'      <div class="row"><div class="what">{ltr(f.he)}<span class="why">{ltr(f.measure)}</span></div>'
          f'<div>{state(f.state)}<span class="why">{ltr(f.note)}</span></div>'
          f'<div class="when">{STAGE_HE[f.need]}</div></div>')
    a("    </div>")
    a("  </section>")

    a('  <section id="reqs">')
    a("    <h2>כל דרישה ואיך בודקים אותה</h2>")
    a("    <p>כל דרישה מדף הדרישות הטכניות, מה בתכנון עונה עליה, ואיך מוכיחים שהיא מתקיימת.</p>")
    a('    <div class="tree">')
    a(HEAD % ("מה בתכנון עונה עליה", "איך מוכיחים"))
    for r in reqs:
        a(f'      <div class="row"><div class="what"><span class="ltr">{esc(r.id)}</span> {ltr(r.he)}'
          f'<span class="why">{ltr(r.design)}</span></div>'
          f'<div>{state(r.state)}<span class="why">{ltr(r.verify)}</span></div>'
          f'<div class="when">{STAGE_HE[r.need]}</div></div>')
    a("    </div>")
    a("  </section>")
    a(END)
    return "\n".join(L) + "\n"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--write", action="store_true")
    args = ap.parse_args()
    problems = T.check()
    if problems:
        print("product_tree check failed:\n  " + "\n  ".join(problems))
        sys.exit(1)
    text = block()
    if not args.write:
        print(text)
        return
    s = PLAN.read_text(encoding="utf-8")
    i, j = s.find(BEGIN), s.find(END)
    if i < 0 or j < 0:
        sys.exit("TREE markers not found in plan.html")
    s = s[:i] + text.rstrip("\n") + s[j + len(END):]
    PLAN.write_text(s, encoding="utf-8", newline="\n")
    print("plan.html: tree block written")


if __name__ == "__main__":
    main()

# v0.1.1 - conflict state, column heads, counts of missing / conflicting / checked; v0.1.0 - renders the product tree (parts, interfaces, requirement checks) into plan.html between the TREE markers
