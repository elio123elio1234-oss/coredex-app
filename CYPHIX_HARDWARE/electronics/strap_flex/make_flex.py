"""CYPHIX Band alpha - strap flex (FPC), rev 0.1: the flexible circuit inside the strap that brings RA1 and RA2
to the main board.

Run with KiCad's own Python:
    "%LOCALAPPDATA%/Programs/KiCad/10.0/bin/python.exe" electronics/strap_flex/make_flex.py

What it is (DESIGN_INTENT.md sec. 1, mechanical/band_id.py build_strap):
  * One copper layer on polyimide, overmoulded inside the FKM strap at mid-thickness. Flat as made; it bends
    with the strap round the wrist.
  * Three traces: RA1, a guard, RA2. Each RA plate has its OWN trace, and the guard runs between them.
  * Two round landing pads where each plate's steel post presses down: RA1 at 34.5 mm and RA2 at 49.1 mm from
    the island's end. These are the 3D model's positions (posts at y = +3.4 / -3.4), measured along the
    strap's mid-thickness on the design wrist.
  * Interlock holes down both edges, so the FKM keys through the flex and holds it (as in the model).
  * A 4-finger tail, 0.5 mm pitch, stiffened to 0.3 mm. It goes into J1 on the main board (Amphenol F32Q):
    pin 1 RA1, pin 2 guard, pin 3 RA2, pin 4 not used.

Coordinates (flat flex, mm): x from the tail's end along the strap, y across it. x = 9.5 is the island's
end (strap root).

Makes: strap_flex.kicad_pcb, drc.rpt, pics/flex_top3d.png
"""
from __future__ import annotations

import math
import subprocess
from pathlib import Path

import pcbnew

HERE = Path(__file__).resolve().parent
NAME = "strap_flex"
CLI = r"C:/Users/elio1/AppData/Local/Programs/KiCad/10.0/bin/kicad-cli.exe"

# geometry (mm), from mechanical/band_id.py (v3.2): see the measuring note in DESIGN_NOTES.md
X_ROOT = 9.5                      # island end; the tail inside the island runs from here to the connector
X_RA1 = X_ROOT + 34.49            # RA1 post (s = -55)
X_RA2 = X_ROOT + 49.13            # RA2 post (s = -69)
X_END = X_ROOT + 52.23            # flex ends 3 mm past RA2's post
Y_POST = {"RA1": 3.4, "RA2": -3.4}
W_STRAP_FLEX = 13.4               # flex width in the strap (model FLEX_W); the strap itself is 24 mm
W_TAIL = 2.5                      # tail width for a 4-position 0.5 mm-pitch FPC connector (to confirm on the drawing)
X_TAIL = 4.5                      # stiffened tail (fingers + insertion)
X_TAPER = 8.0                     # the flex widens to its strap width by here
FINGER_L, FINGER_W, PITCH = 3.0, 0.3, 0.5
PAD_D = 4.0                       # post landing pad
TRACE_W, TRACE_W_TAIL = 0.3, 0.2
HOLE_D = 1.1                      # interlock holes
NETS = {"RA1": "/RA1_PAD", "GUARD": "/STRAP_GUARD", "RA2": "/RA2_PAD"}   # the main board's net names


def mm(v):
    return pcbnew.FromMM(v)


def V(x, y):
    return pcbnew.VECTOR2I(mm(x), mm(y))


def main():
    board = pcbnew.NewBoard(str(HERE / f"{NAME}.kicad_pcb"))
    board.SetCopperLayerCount(2)                       # only F.Cu carries copper: a single-sided flex
    ds = board.GetDesignSettings()
    ds.SetBoardThickness(mm(0.11))                     # 25 um PI + 18 um RA copper + adhesive + coverlay
    nc = ds.m_NetSettings.GetDefaultNetclass()
    nc.SetTrackWidth(mm(TRACE_W)); nc.SetClearance(mm(0.15))
    ds.m_TrackMinWidth = mm(0.1); ds.m_MinClearance = mm(0.1); ds.m_CopperEdgeClearance = mm(0.3)

    nets = {}
    for k, n in NETS.items():
        ni = pcbnew.NETINFO_ITEM(board, n); board.Add(ni); nets[k] = ni

    # outline: tail, taper, strap section with chamfered end
    ht, hs, c = W_TAIL / 2, W_STRAP_FLEX / 2, 1.0
    pts = [(0, -ht), (X_TAIL, -ht), (X_TAPER, -hs), (X_END - c, -hs), (X_END, -hs + c), (X_END, hs - c),
           (X_END - c, hs), (X_TAPER, hs), (X_TAIL, ht), (0, ht)]
    for a, b in zip(pts, pts[1:] + pts[:1]):
        s = pcbnew.PCB_SHAPE(board); s.SetShape(pcbnew.SHAPE_T_SEGMENT); s.SetLayer(pcbnew.Edge_Cuts)
        s.SetStart(V(*a)); s.SetEnd(V(*b)); s.SetWidth(mm(0.05)); board.Add(s)

    # stiffener outline (drawing layer: the board house laminates 0.2 mm PI under the fingers)
    for a, b in (((0, -ht), (X_TAIL, -ht)), ((X_TAIL, -ht), (X_TAIL, ht)), ((X_TAIL, ht), (0, ht))):
        s = pcbnew.PCB_SHAPE(board); s.SetShape(pcbnew.SHAPE_T_SEGMENT); s.SetLayer(pcbnew.Dwgs_User)
        s.SetStart(V(*a)); s.SetEnd(V(*b)); s.SetWidth(mm(0.1)); board.Add(s)
    t = pcbnew.PCB_TEXT(board); t.SetText("PI stiffener 0.2 mm under the fingers: 0.3 mm total for the ZIF connector")
    t.SetLayer(pcbnew.Dwgs_User); t.SetPosition(V(2.0, -3.5)); t.SetTextSize(V(0.6, 0.6)); board.Add(t)

    def footprint(ref, value, x, y):
        fp = pcbnew.FOOTPRINT(board)
        fp.SetReference(ref); fp.SetValue(value); fp.SetPosition(V(x, y))
        fp.Reference().SetVisible(False); fp.Value().SetVisible(False)
        board.Add(fp)
        return fp

    def smd(fp, num, shape, w, h, net=None, dx=0.0, dy=0.0):
        p = pcbnew.PAD(fp)
        p.SetNumber(num); p.SetAttribute(pcbnew.PAD_ATTRIB_SMD); p.SetShape(shape)
        p.SetSize(V(w, h)); p.SetLayerSet(p.SMDMask())
        p.SetPosition(fp.GetPosition() + V(dx, dy))
        if net is not None:
            p.SetNet(net)
        fp.Add(p)
        return p

    # tail fingers (J on the flex side): pin 1 RA1, 2 guard, 3 RA2, 4 spare
    tail = footprint("P1", "FPC tail 4 x 0.5 mm", 0.3 + FINGER_L / 2, 0.0)   # 0.3 mm copper pullback from the tip
    finger_y = {"1": 0.75, "2": 0.25, "3": -0.25, "4": -0.75}
    for num, k in (("1", "RA1"), ("2", "GUARD"), ("3", "RA2"), ("4", None)):
        smd(tail, num, pcbnew.PAD_SHAPE_RECTANGLE, FINGER_L, FINGER_W, nets[k] if k else None, 0.0, finger_y[num])
    # post landing pads
    for k in ("RA1", "RA2"):
        fp = footprint(f"P_{k}", f"{k} post pad", X_RA1 if k == "RA1" else X_RA2, Y_POST[k])
        smd(fp, "1", pcbnew.PAD_SHAPE_CIRCLE, PAD_D, PAD_D, nets[k])
    # interlock holes along both edges, clear of the post pads (model: every 4 mm, not within 3.5 mm of a post)
    x, holes = X_TAPER + 2.0, 0
    while x < X_END - 1.5:
        if min(abs(x - X_RA1), abs(x - X_RA2)) >= 3.5:
            for y in (-5.7, 5.7):
                fp = footprint(f"H{holes + 1}", "interlock hole", x, y)
                p = pcbnew.PAD(fp); p.SetNumber(""); p.SetAttribute(pcbnew.PAD_ATTRIB_NPTH)
                p.SetShape(pcbnew.PAD_SHAPE_CIRCLE); p.SetSize(V(HOLE_D, HOLE_D)); p.SetDrillSize(V(HOLE_D, HOLE_D))
                p.SetLayerSet(p.UnplatedHoleMask()); p.SetPosition(fp.GetPosition()); fp.Add(p)
                holes += 1
        x += 4.0

    # traces: tail pitch -> taper -> strap lanes (RA1 +3.4, guard 0, RA2 -3.4)
    def track(net, pts_, w):
        for a, b in zip(pts_, pts_[1:]):
            tr = pcbnew.PCB_TRACK(board); tr.SetLayer(pcbnew.F_Cu); tr.SetWidth(mm(w))
            tr.SetStart(V(*a)); tr.SetEnd(V(*b)); tr.SetNet(net); board.Add(tr)

    track(nets["RA1"], [(0.3 + FINGER_L / 2, 0.75), (X_TAIL, 0.75), (X_TAPER + 0.5, 3.4)], TRACE_W_TAIL)
    track(nets["GUARD"], [(0.3 + FINGER_L / 2, 0.25), (X_TAIL, 0.25), (X_TAPER + 0.5, 0.0)], TRACE_W_TAIL)
    track(nets["RA2"], [(0.3 + FINGER_L / 2, -0.25), (X_TAIL, -0.25), (X_TAPER + 0.5, -3.4)], TRACE_W_TAIL)
    # the long straight lanes in the strap, wider
    track(nets["RA1"], [(X_TAPER + 0.5, 3.4), (X_RA1, 3.4)], TRACE_W)
    track(nets["GUARD"], [(X_TAPER + 0.5, 0.0), (X_RA2 - 2.0, 0.0)], TRACE_W)
    track(nets["RA2"], [(X_TAPER + 0.5, -3.4), (X_RA2, -3.4)], TRACE_W)

    path = HERE / f"{NAME}.kicad_pcb"
    pcbnew.SaveBoard(str(path), board)
    rpt = HERE / "drc.rpt"
    subprocess.run([CLI, "pcb", "drc", "--severity-error", "--severity-warning", "-o", str(rpt), str(path)],
                   capture_output=True)
    t = rpt.read_text(encoding="utf-8", errors="replace")
    import re
    m = re.search(r"\*\* Found (\d+) DRC violations \*\*", t)
    u = re.search(r"\*\* Found (\d+) unconnected pads \*\*", t)
    print(f"flex: {X_END:.1f} mm long, {W_STRAP_FLEX} mm wide in the strap, {holes} interlock holes;",
          m.group(0) if m else "?", "|", u.group(0) if u else "?")
    (HERE / "pics").mkdir(exist_ok=True)
    subprocess.run([CLI, "pcb", "render", "--side", "top", "--quality", "high", "--width", "1800", "--height", "700",
                    "-o", str(HERE / "pics" / "flex_top3d.png"), str(path)], capture_output=True)


if __name__ == "__main__":
    main()

# v0.1.0 - strap flex rev 0.1: single-sided PI flex, 61.7 mm, RA1 / guard / RA2 lanes, post pads at the 3D model's positions, interlock holes, 4 x 0.5 mm stiffened tail for J1
