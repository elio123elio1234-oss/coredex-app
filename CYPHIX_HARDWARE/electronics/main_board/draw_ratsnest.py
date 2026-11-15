"""Draw the placed board with every connection still to be routed (the "air wires"), as an SVG.

Run with KiCad's Python after make_pcb.py:
    "%LOCALAPPDATA%/Programs/KiCad/10.0/bin/python.exe" electronics/main_board/draw_ratsnest.py
Makes: pics/ratsnest.svg - seen from the leg face (top): leg-face parts solid, wrist-face parts dashed; each net is
joined by its shortest tree of straight lines (power red, ground grey, everything else blue).
"""
from __future__ import annotations

import math
from pathlib import Path

import pcbnew

HERE = Path(__file__).resolve().parent
NAME = "band_alpha_main"
POWER = {"VBAT", "+3V0A", "+3V0D", "VCHG", "BR_P", "BR_N", "CELL_N", "PROT_MID", "+1V8_PPG"}
LABEL = {"U6": "ADS1294", "U7": "nRF52840 module", "J1": "strap FPC", "U9": "PPG", "U8": "temp",
         "SC1": "LA", "SC2": "LA", "SC3": "LL1", "SC4": "LL2", "SC5": "RLD", "TP1": "charge", "TP2": "charge",
         "BT1": "cell", "J2": "SWD", "U3": "charger", "U5": "AFE LDO"}


def mst(points):
    """Prim's minimum spanning tree over a few points: the shortest set of straight joins."""
    if len(points) < 2:
        return []
    inside, rest, edges = [points[0]], points[1:], []
    while rest:
        best = min(((a, b) for a in inside for b in rest), key=lambda e: math.dist(e[0], e[1]))
        edges.append(best)
        inside.append(best[1])
        rest.remove(best[1])
    return edges


def main():
    b = pcbnew.LoadBoard(str(HERE / f"{NAME}.kicad_pcb"))
    S = 20.0                                                   # px per mm
    W, H, pad = 32.0, 26.0, 2.0
    ox, oy = W / 2 + pad, H / 2 + pad
    X = lambda v: round((v + ox) * S, 1)
    Y = lambda v: round((v + oy) * S, 1)
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{(W + 2 * pad) * S}" height="{(H + 2 * pad) * S + 60}" '
           f'viewBox="0 0 {(W + 2 * pad) * S} {(H + 2 * pad) * S + 60}" font-family="Segoe UI, Arial, sans-serif">',
           '<rect width="100%" height="100%" fill="#ffffff"/>',
           f'<rect x="{X(-W / 2)}" y="{Y(-H / 2)}" width="{W * S}" height="{H * S}" rx="{1.5 * S}" fill="#1f4a36" stroke="#0d2b1f" stroke-width="2"/>']
    nets = {}
    for fp in b.GetFootprints():
        bottom = fp.IsFlipped()
        lay = pcbnew.B_CrtYd if bottom else pcbnew.F_CrtYd
        c = fp.GetCourtyard(lay)
        bb = c.BBox() if c.OutlineCount() else fp.GetBoundingBox(False)
        l, t = pcbnew.ToMM(bb.GetLeft()), pcbnew.ToMM(bb.GetTop())
        w, h = pcbnew.ToMM(bb.GetWidth()), pcbnew.ToMM(bb.GetHeight())
        dash = ' stroke-dasharray="4 3"' if bottom else ""
        fill = "none" if bottom else "#2d6b4f"
        col = "#f0b04a" if bottom else "#d9f2e6"
        out.append(f'<rect x="{X(l)}" y="{Y(t)}" width="{w * S}" height="{h * S}" fill="{fill}" stroke="{col}" stroke-width="1.4"{dash}/>')
        ref = fp.GetReference()
        if ref in LABEL:
            p = fp.GetPosition()
            out.append(f'<text x="{X(pcbnew.ToMM(p.x))}" y="{Y(pcbnew.ToMM(p.y)) + 5}" text-anchor="middle" font-size="15" '
                       f'font-weight="700" fill="{"#f0b04a" if bottom else "#ffffff"}">{LABEL[ref]}</text>')
        for pd in fp.Pads():
            n = pd.GetNetname().lstrip("/")
            if n and not n.startswith("unconnected-"):
                q = pd.GetPosition()
                nets.setdefault(n, []).append((pcbnew.ToMM(q.x), pcbnew.ToMM(q.y)))
    lines = []
    for n, pts in nets.items():
        pts = sorted(set(pts))
        if n == "GND":
            continue                                           # ground goes to the In1 plane through vias: not drawn
        col, wd = ("#ff5a4f", 1.6) if n in POWER else ("#6fb7ff", 1.1)
        for a, c in mst(pts):
            lines.append(f'<line x1="{X(a[0])}" y1="{Y(a[1])}" x2="{X(c[0])}" y2="{Y(c[1])}" stroke="{col}" stroke-width="{wd}" opacity="0.9"/>')
    out += lines
    out.append(f'<text x="{pad * S}" y="{(H + 2 * pad) * S + 22}" font-size="12" fill="#263042">Band α main board rev 0.1, '
               f'seen from the leg face. Solid = leg-face parts, dashed orange = wrist-face parts.</text>')
    out.append(f'<text x="{pad * S}" y="{(H + 2 * pad) * S + 46}" font-size="12" fill="#263042">Lines = connections still to route '
               f'(blue signals, red power; ground goes to the inner ground plane). Not routed, not reviewed.</text>')
    out.append("</svg>")
    (HERE / "pics").mkdir(exist_ok=True)
    (HERE / "pics" / "ratsnest.svg").write_text("\n".join(out), encoding="utf-8")
    print("ratsnest.svg:", len(nets), "nets,", len(lines), "lines")


if __name__ == "__main__":
    main()

# v0.1.0 - air-wire picture of the placed board (minimum spanning tree per net), leg-face view
