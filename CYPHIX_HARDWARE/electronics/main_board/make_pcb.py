"""CYPHIX Band alpha main board - PCB generator, rev 0.1 (first placement, then autorouting).

Run with KiCad's own Python (it carries the pcbnew module):
    "%LOCALAPPDATA%/Programs/KiCad/10.0/bin/python.exe" electronics/main_board/make_pcb.py [--route]

What it does:
  1. Reads the parts and nets from make_schematic.py, the same table the schematic is drawn from, so the board
     and the schematic cannot disagree.
  2. Makes a 6-layer board, 32 x 26 mm: F.Cu signals | In1 GND plane | In2, In3 signals + power | In4 VBAT plane |
     B.Cu signals. (4 layers did not route: 8 connections left with signals cutting the plane, or 86 left with the
     plane protected. Two whole planes, one under each face, also suit a microvolt AFE next to a radio.)
     The outline is the island's flat board from mechanical/band_id.py, made 7 mm longer for the first spin's
     TQFP-64 (the size budget's "first spin about 6-7 mm longer").
  3. Places the parts whose position the housing decides exactly where the 3D model puts them: the spring
     contacts under the steel faces, the two charge contacts, the PPG + thermometer under the sapphire window,
     the cell tabs at the free end, the strap's FPC at the fixed end. The board's x runs along the band
     (+x = the free end, where the cell sits), y across it; the board centre is the island's s = -1.5 mm.
  4. Places the big ICs by hand: ADS1294 on the leg side with its analog pins towards the electrodes and its SPI
     pins towards the radio, the radio module with its antenna end on a side wall (plastic: the metal-free zone),
     away from the cell.
  5. Places every small part automatically next to the pins it connects to (decoupling next to its own supply
     pin), on its assigned side, without courtyard overlaps, inside the outline and outside the keep-outs (the
     antenna, the window, the motor disc).
  6. With --route: exports Specctra DSN, autoroutes with Freerouting (CLI build, native), imports the result,
     pours the ground plane, and runs KiCad's DRC.

Makes: band_alpha_main.kicad_pcb, drc.rpt, pcb_*.png (pictures), placement.json
"""
from __future__ import annotations

import json
import math
import os
import subprocess
import sys
from pathlib import Path

import pcbnew

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import make_schematic as S  # noqa: E402  (builds the parts/nets tables on import; writes nothing)

NAME = S.NAME
LIB = str(HERE / "band_alpha.pretty")
BW, BH, BR = 32.0, 26.0, 1.5                     # board outline (mm) and corner radius
MARGIN = 0.25                                    # courtyard to board edge
CLI = str(S.CLI)
TOOLS = Path(os.environ.get("LOCALAPPDATA", "")) / "cyphix-tools"          # outside the repo; checksums in DESIGN_NOTES
FREEROUTING_JAR = TOOLS / "freerouting-2.5.0.jar"
JAVA = next(iter(sorted((TOOLS / "jre").glob("*/bin/java.exe"))), Path("java"))


def mm(v):
    return pcbnew.FromMM(v)


def V(x, y):
    return pcbnew.VECTOR2I(mm(x), mm(y))


# ------------------------------------------------------------ sides and positions
# fixed: ref -> (x, y, rotation, side)   side "F" = leg face (top), "B" = wrist face (bottom)
FIXED = {
    "J1": (-13.21, -6.5, 270, "F"),      # strap FPC: opening flush with the fixed end, pads inboard
    "U6": (-4.0, 5.5, 0, "F"),           # ADS1294: IN pins (left) towards J1 + springs, SPI (right) towards U7
    "U7": (10.0, -4.71, 0, "F"),         # MDBT50Q: antenna end on the y = -13 side wall, away from the cell
    "SC3": (-6.2, -3.0, 0, "F"),         # LL1 spring, under the LL1 face (s = -7.7)
    "SC5": (3.3, 11.6, 0, "F"),          # RLD spring, under the RLD face (s = 1.8)
    "SC4": (14.6, 5.4, 0, "F"),          # LL2 spring, under the LL2 face (s = 13.1)
    "D6": (-15.0, 0.5, 90, "F"),         # status LED at the fixed end, under the light line's light pipe
    "TP4": (-14.0, 3.6, 0, "F"),         # touch pad next to it (frame round the light line), clear of J2's holes
    "U9": (1.5, -1.0, 90, "B"),          # PPG on the window's boss (window centre: s = 0 -> x = 1.5)
    "U8": (1.5, 2.6, 0, "B"),            # skin thermometer beside it, inside the window
    "TP1": (1.5, -9.0, 0, "B"),          # charge contact A (mechanical CHG_Y = -9)
    "TP2": (1.5, 9.0, 0, "B"),           # charge contact B (+9)
    "SC1": (-8.5, 6.5, 0, "B"),          # LA pad 1 spring, under the LA1 face
    "SC2": (11.0, 6.5, 0, "B"),          # LA pad 2 spring, under the LA2 face
    "BT1": (14.2, -5.8, 90, "B"),        # cell tabs at the free end
    "J2": (-13.6, 9.0, 90, "B"),         # Tag-Connect programming pads (through holes: kept clear on top too)
}
TOP = {"J1", "U6", "U7", "SC3", "SC4", "SC5", "D6", "TP4", "U10", "U11", "Y1", "TP3",
       "C15", "C16", "C17", "C18", "C19", "C20", "C21", "C22", "C26", "C28", "C29", "C30", "C31", "C32", "C33",
       "R37", "R38", "R39", "R44", "R34", "R35", "R36"}
TOP |= {f"R{i}" for i in range(14, 34) if i not in (17, 21, 25, 29, 33)} | {f"C{i}" for i in range(10, 15)}
# everything else on the wrist face: charging, protection, rails, DNP buffers, sensors, motor/LED drivers
# decoupling for the ADS1294's lower-edge pins goes under the chip, on the wrist face
PIN_ANCHOR = {                                   # cap -> (IC, pin) it decouples
    "C15": ("U6", "54"), "C16": ("U6", "54"), "C17": ("U6", "56"), "C18": ("U6", "59"),
    "C19": ("U6", "19"), "C20": ("U6", "22"), "C21": ("U6", "48"), "C22": ("U6", "50"),
    "C23": ("U6", "24"), "C24": ("U6", "24"), "C90": ("U6", "28"), "C25": ("U6", "30"), "C26": ("U6", "55"),
    "C27": ("U6", "26"), "C28": ("U6", "64"), "C29": ("U6", "61"), "R37": ("U6", "61"),
    "R38": ("U6", "52"), "R39": ("U6", "52"), "TP3": ("U6", "37"), "R40": ("U6", "37"), "Y2": ("U6", "37"),
    "C30": ("U7", "28"), "C31": ("U7", "28"), "Y1": ("U7", "17"), "C32": ("U7", "17"), "C33": ("U7", "18"),
    "U5": ("U6", "21"),                          # the analog LDO next to the AFE it feeds (short, quiet +3V0A)
    "U3": ("BT1", "1"),                          # the charger next to the cell
    "U1": ("BT1", "2"), "Q1": ("BT1", "2"), "Q2": ("BT1", "2"),   # cell protection at the cell's negative tab
}
KEEPOUT = {                                      # side -> list of (kind, params)
    "F": [("circle", (9.5, 8.6, 4.3))],          # the 8 mm coin motor sits on the board here
    "B": [("circle_except", (1.5, 0.0, 4.6), {"U8", "U9"})],   # the sapphire window: only the sensors inside
}
ANTENNA = (3.8, 16.4, -13.5, -8.7)               # U7's keep-out (all layers), checked on both sides


# ------------------------------------------------------------ geometry helpers
def rect_of(fp, side):
    lay = pcbnew.F_CrtYd if side == "F" else pcbnew.B_CrtYd
    c = fp.GetCourtyard(lay)
    bb = c.BBox() if c.OutlineCount() else fp.GetBoundingBox(False)
    return (pcbnew.ToMM(bb.GetLeft()), pcbnew.ToMM(bb.GetTop()), pcbnew.ToMM(bb.GetRight()), pcbnew.ToMM(bb.GetBottom()))


def overlap(a, b, gap=0.05):
    return not (a[2] + gap <= b[0] or b[2] + gap <= a[0] or a[3] + gap <= b[1] or b[3] + gap <= a[1])


def rect_circle(r, cx, cy, rad):
    nx, ny = min(max(cx, r[0]), r[2]), min(max(cy, r[1]), r[3])
    return (nx - cx) ** 2 + (ny - cy) ** 2 < rad * rad


def inside_board(r):
    return r[0] >= -BW / 2 + MARGIN and r[2] <= BW / 2 - MARGIN and r[1] >= -BH / 2 + MARGIN and r[3] <= BH / 2 - MARGIN


def put(fp, x, y, rot, side):
    fp.SetOrientationDegrees(0)
    if fp.IsFlipped():
        flip(fp)
    fp.SetPosition(V(x, y))
    if side == "B":
        flip(fp)
    fp.SetOrientationDegrees(rot)


def flip(fp):
    try:
        fp.Flip(fp.GetPosition(), pcbnew.FLIP_DIRECTION_LEFT_RIGHT)
    except Exception:
        fp.Flip(fp.GetPosition(), False)


# ------------------------------------------------------------ build
def build():
    board = pcbnew.NewBoard(str(HERE / f"{NAME}.kicad_pcb"))
    board.SetCopperLayerCount(6)
    # In1 and In4 carry the ground planes (zones). They stay "signal" layers: marked "power", Freerouting stopped
    # converging (86 connections left on 4 layers, 136 after 10 passes on 6). With four other layers free it seldom
    # needs them; route() counts every track that lands on a plane layer so a person can move it.
    ds = board.GetDesignSettings()
    ds.SetBoardThickness(mm(0.8))                # thin board: it lives in a 7.2 mm island
    nc = ds.m_NetSettings.GetDefaultNetclass()
    nc.SetTrackWidth(mm(0.127)); nc.SetClearance(mm(0.127)); nc.SetViaDiameter(mm(0.45)); nc.SetViaDrill(mm(0.2))
    ds.m_TrackMinWidth = mm(0.1); ds.m_ViasMinSize = mm(0.4); ds.m_MinThroughDrill = mm(0.2)
    ds.m_MinClearance = mm(0.1); ds.m_CopperEdgeClearance = mm(0.2)

    # nets: the table's nets, plus KiCad's own names for the pins the schematic leaves open ("unconnected-(...)"),
    # read from the schematic's netlist so the board/schematic parity check compares like with like
    import re, tempfile
    tmp = Path(tempfile.gettempdir()) / f"{NAME}_parity.net"
    subprocess.run([CLI, "sch", "export", "netlist", "--format", "kicadsexpr", "-o", str(tmp),
                    str(HERE / f"{NAME}.kicad_sch")], check=True, capture_output=True)
    open_pins = {}
    for chunk in re.split(r'\(net\s+\(code', tmp.read_text(encoding="utf-8"))[1:]:
        name = re.search(r'\(name "([^"]*)"\)', chunk).group(1)
        if name.startswith("unconnected-"):
            for nm in re.finditer(r'\(node\s+\(ref "([^"]+)"\)\s+\(pin "([^"]+)"\)', chunk):
                open_pins[(nm.group(1), nm.group(2))] = name
    tmp.unlink()
    nets = {}
    for net in sorted(set(S.intent.values())):
        ni = pcbnew.NETINFO_ITEM(board, "/" + net)   # the schematic names root-sheet label nets "/NAME"
        board.Add(ni)
        nets[net] = ni
    for name in sorted(set(open_pins.values())):
        ni = pcbnew.NETINFO_ITEM(board, name)
        board.Add(ni)
        nets[name] = ni

    # outline
    hw, hh = BW / 2, BH / 2
    def seg(a, b):
        s = pcbnew.PCB_SHAPE(board); s.SetShape(pcbnew.SHAPE_T_SEGMENT); s.SetLayer(pcbnew.Edge_Cuts)
        s.SetStart(V(*a)); s.SetEnd(V(*b)); s.SetWidth(mm(0.05)); board.Add(s)
    def arc(c, a0):
        s = pcbnew.PCB_SHAPE(board); s.SetShape(pcbnew.SHAPE_T_ARC); s.SetLayer(pcbnew.Edge_Cuts)
        p = lambda t: (c[0] + BR * math.cos(math.radians(t)), c[1] + BR * math.sin(math.radians(t)))
        s.SetArcGeometry(V(*p(a0)), V(*p(a0 + 45)), V(*p(a0 + 90))); s.SetWidth(mm(0.05)); board.Add(s)
    seg((-hw + BR, -hh), (hw - BR, -hh)); seg((hw, -hh + BR), (hw, hh - BR))
    seg((hw - BR, hh), (-hw + BR, hh)); seg((-hw, hh - BR), (-hw, -hh + BR))
    arc((hw - BR, -hh + BR), 270); arc((hw - BR, hh - BR), 0); arc((-hw + BR, hh - BR), 90); arc((-hw + BR, -hh + BR), 180)

    # footprints with their nets
    fps = {}
    for p in S.parts:
        lib, name = p["footprint"].split(":")
        fp = pcbnew.FootprintLoad(LIB, name)
        assert fp is not None, p["footprint"]
        fp.SetReference(p["ref"]); fp.SetValue(p["value"])
        fp.SetFPID(pcbnew.LIB_ID(lib, name))
        fp.SetPath(pcbnew.KIID_PATH(f"/{S.uid('sym', p['ref'])}"))   # link to its schematic symbol (parity check)
        if p["dnp"]:
            fp.SetDNP(True)
        fp.SetExcludedFromBOM(not p.get("buy", True))
        if p.get("note"):                        # the schematic's Note field, so the parity check sees the same fields
            f = pcbnew.PCB_FIELD(fp, pcbnew.FIELD_T_USER, "Note")
            f.SetText(p["note"]); f.SetVisible(False); f.SetLayer(pcbnew.F_Fab)
            f.SetOrdinal(fp.GetNextFieldOrdinal())
            fp.Add(f)
        for pad in fp.Pads():
            net = S.intent.get((p["ref"], pad.GetNumber())) or open_pins.get((p["ref"], pad.GetNumber()))
            # (TMP117's exposed pad has no schematic pin: left floating, which its datasheet allows)
            if net:
                pad.SetNet(nets[net])
        fp.Reference().SetVisible(False)         # dense board: reference names live on the assembly (Fab) drawing
        board.Add(fp)
        fps[p["ref"]] = fp
    return board, fps, nets


def place(board, fps):
    placed = {"F": [], "B": []}
    log = {}
    # fixed parts first
    for ref, (x, y, rot, side) in FIXED.items():
        put(fps[ref], x, y, rot, side)
        r = rect_of(fps[ref], side)
        placed[side].append((ref, r))
        if ref == "J2":                          # its three alignment holes go through: block them on the leg face too
            for pad in fps[ref].Pads():
                if pad.GetAttribute() == pcbnew.PAD_ATTRIB_NPTH:
                    bb = pad.GetBoundingBox()
                    c = 0.3
                    placed["F"].append((ref + "_hole", (pcbnew.ToMM(bb.GetLeft()) - c, pcbnew.ToMM(bb.GetTop()) - c,
                                                        pcbnew.ToMM(bb.GetRight()) + c, pcbnew.ToMM(bb.GetBottom()) + c)))
        log[ref] = dict(x=x, y=y, rot=rot, side=side, fixed=True)
    # the antenna keep-out on both sides
    for side in "FB":
        placed[side].append(("ANT", (ANTENNA[0], ANTENNA[2], ANTENNA[1], ANTENNA[3])))

    # anchor of a free part: the pad it decouples, else the mean of the placed pads on its signal nets
    big = {"GND", "+3V0A", "+3V0D", "VBAT"}

    def anchor(ref):
        if ref in PIN_ANCHOR:
            ic, pin = PIN_ANCHOR[ref]
            for pad in fps[ic].Pads():
                if pad.GetNumber() == pin:
                    return pcbnew.ToMM(pad.GetPosition().x), pcbnew.ToMM(pad.GetPosition().y)
        mynets = {pad.GetNetname().lstrip("/") for pad in fps[ref].Pads() if pad.GetNetname()}
        sig = [n for n in mynets if n not in big] or [n for n in mynets if n != "GND"]
        pts = []
        for other, fp in fps.items():
            if other == ref or other not in log:
                continue
            for pad in fp.Pads():
                if pad.GetNetname().lstrip("/") in sig:
                    pts.append((pcbnew.ToMM(pad.GetPosition().x), pcbnew.ToMM(pad.GetPosition().y)))
        if not pts:
            return 0.0, 0.0
        return sum(p[0] for p in pts) / len(pts), sum(p[1] for p in pts) / len(pts)

    # candidate offsets, nearest first
    step, R = 0.25, 17.0
    offs = sorted(((i * step, j * step) for i in range(-int(R / step), int(R / step) + 1)
                   for j in range(-int(R / step), int(R / step) + 1)), key=lambda o: o[0] ** 2 + o[1] ** 2)
    # order: decoupling first, then small parts by how many placed neighbours they have
    free = [p["ref"] for p in S.parts if p["ref"] not in FIXED]
    order = [r for r in free if r in PIN_ANCHOR] + [r for r in free if r not in PIN_ANCHOR]
    failed = []
    for ref in order:
        side = "F" if ref in TOP else "B"
        if ref in ("C23", "C24", "C90", "C25", "C27", "C19", "C20"):
            side = "B"                           # under the ADS1294, at its lower-edge pins
        fp = fps[ref]
        ax, ay = anchor(ref)
        shapes = {}
        for rot in (0, 90):
            put(fp, 0, 0, rot, side)
            shapes[rot] = rect_of(fp, side)
        ok = None
        for dx, dy in offs:
            x, y = round((ax + dx) / 0.05) * 0.05, round((ay + dy) / 0.05) * 0.05
            for rot in (0, 90):
                s = shapes[rot]
                r = (s[0] + x, s[1] + y, s[2] + x, s[3] + y)
                if not inside_board(r):
                    continue
                if any(overlap(r, q) for _, q in placed[side]):
                    continue
                bad = False
                for k in KEEPOUT.get(side, []):
                    if k[0] == "circle" and rect_circle(r, *k[1]):
                        bad = True
                    if k[0] == "circle_except" and ref not in k[2] and rect_circle(r, *k[1]):
                        bad = True
                if bad:
                    continue
                ok = (x, y, rot)
                break
            if ok:
                break
        if not ok:
            # no room on its face: try the other one before giving up
            other = "B" if side == "F" else "F"
            for rot in (0, 90):
                put(fp, 0, 0, rot, other)
                shapes[rot] = rect_of(fp, other)
            for dx, dy in offs:
                x, y = round((ax + dx) / 0.05) * 0.05, round((ay + dy) / 0.05) * 0.05
                for rot in (0, 90):
                    s2 = shapes[rot]
                    r = (s2[0] + x, s2[1] + y, s2[2] + x, s2[3] + y)
                    if inside_board(r) and not any(overlap(r, q) for _, q in placed[other]) and not any(
                            (k[0] == "circle" and rect_circle(r, *k[1])) or
                            (k[0] == "circle_except" and ref not in k[2] and rect_circle(r, *k[1]))
                            for k in KEEPOUT.get(other, [])):
                        ok = (x, y, rot)
                        break
                if ok:
                    side = other
                    break
        if not ok:
            failed.append(ref)
            continue
        x, y, rot = ok
        put(fp, x, y, rot, side)
        placed[side].append((ref, rect_of(fp, side)))
        log[ref] = dict(x=x, y=y, rot=rot, side=side, fixed=False, anchor=[round(ax, 2), round(ay, 2)])
    return log, failed


def zones(board, nets):
    """Planes over the whole board: GND on In1, VBAT on In4 (the antenna keep-out in U7's footprint still applies).
    VBAT has a plane because it feeds parts all over both faces (cell, charger, protection, two LDOs, motor, LED,
    PPG LEDs): routed as tracks, its 13 links were the only ones the 6-layer run could not finish."""
    for lay, net in ((pcbnew.In1_Cu, "GND"), (pcbnew.In4_Cu, "VBAT")):
        z = pcbnew.ZONE(board)
        z.SetLayer(lay)
        z.SetNet(nets[net])
        o = z.Outline(); o.NewOutline()
        for x, y in ((-BW / 2, -BH / 2), (BW / 2, -BH / 2), (BW / 2, BH / 2), (-BW / 2, BH / 2)):
            o.Append(mm(x), mm(y))
        z.SetLocalClearance(mm(0.2))
        z.SetMinThickness(mm(0.15))
        board.Add(z)


def fill(board):
    board.BuildConnectivity()
    pcbnew.ZONE_FILLER(board).Fill(board.Zones())


def route(board, path):
    dsn, ses = path.with_suffix(".dsn"), path.with_suffix(".ses")
    ok = pcbnew.ExportSpecctraDSN(board, str(dsn))
    assert ok, "DSN export failed"
    if ses.exists():
        ses.unlink()
    # The jar on a Temurin JRE: Freerouting 2.5.0's native Windows CLI build crashes in its first routing pass
    # (GraalVM: "SerializationConstructorAccessor class not found ... ComponentOutline") and then hangs.
    cmd = [str(JAVA), "-Djava.awt.headless=true", "-jar", str(FREEROUTING_JAR), "--gui.enabled=false",
           "-de", str(dsn), "-do", str(ses), "--router.autorouter.max_passes=60", "--router.optimizer.enabled=false",
           "--router.automatic_neckdown=false", "-mt", "4"]
    # (neck-down off: the first routing narrowed 178 tracks to 0.063-0.095 mm at the pins, below the 0.1 mm rule
    # and, at 0.063, below what a standard board house makes)
    # (optimizer off for rev 0.1: its first pass took 17 min for a 4 % shorter route and ran past the time limit)
    print(" ".join(cmd), flush=True)
    with open(HERE / "freerouting.log", "w", encoding="utf-8") as log:
        subprocess.run(cmd, stdout=log, stderr=subprocess.STDOUT, timeout=3600)
    tail = (HERE / "freerouting.log").read_text(encoding="utf-8", errors="replace").splitlines()[-25:]
    print("\n".join(tail), flush=True)
    assert ses.exists(), "no session file from Freerouting"
    assert pcbnew.ImportSpecctraSES(board, str(ses)), "SES import failed"
    # Freerouting writes some wires narrower than the 0.127 mm rule it was given (0.095 mm, a few 0.076 / 0.063 mm),
    # mostly ground stubs at fine-pitch pins, even with neck-down off. Raise every one to the 0.1 mm board minimum;
    # KiCad's DRC afterwards says whether that cost any clearance. (The rule is not lowered.)
    widened = 0
    for t in board.GetTracks():
        if t.GetClass() == "PCB_TRACK" and t.GetWidth() < mm(0.1):
            t.SetWidth(mm(0.1))
            widened += 1
    print(f"widened {widened} tracks to 0.1 mm", flush=True)
    on_planes = [t for t in board.GetTracks() if t.GetLayer() in (pcbnew.In1_Cu, pcbnew.In4_Cu)]
    nets_on = sorted({t.GetNetname() for t in on_planes})
    print(f"tracks on the plane layers: {len(on_planes)} ({', '.join(nets_on)})", flush=True)


def drc(path):
    rpt = HERE / "drc.rpt"
    # KiCad refills the zones itself, saves them, and checks the board against the schematic (parity)
    subprocess.run([CLI, "pcb", "drc", "--refill-zones", "--save-board", "--schematic-parity",
                    "--severity-error", "--severity-warning", "-o", str(rpt), str(path)], capture_output=True)
    return rpt.read_text(encoding="utf-8", errors="replace") if rpt.exists() else ""


if __name__ == "__main__":
    path = HERE / f"{NAME}.kicad_pcb"
    board, fps, nets = build()
    log, failed = place(board, fps)
    print(f"placed {len(log)} of {len(fps)} footprints; could not place: {failed}", flush=True)
    zones(board, nets)
    if "--route" in sys.argv and not failed:
        route(board, path)
    fill(board)
    pcbnew.SaveBoard(str(path), board)
    (HERE / "placement.json").write_text(json.dumps(log, indent=1), encoding="utf-8")
    t = drc(path)
    import re
    m = re.search(r"\*\* Found (\d+) DRC violations \*\*", t)
    u = re.search(r"\*\* Found (\d+) unconnected pads \*\*", t)
    print("DRC:", m.group(0) if m else "?", "|", u.group(0) if u else "?")

# v0.2.0 - 6 layers (two GND planes), Freerouting jar on Temurin (the native CLI crashes), neck-down + optimizer off, narrow router wires raised to 0.1 mm; v0.1.0 - board rev 0.1: 32 x 26 mm outline, mechanical anchors from band_id.py, hand-placed ICs, automatic courtyard-aware placement of the small parts, optional Freerouting pass, ground plane, DRC
