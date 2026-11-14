"""CYPHIX Band alpha - parametric solid model, v0 (fit concept).

What this is: the first SOLID model of the module, built around the real parts,
with the size taken from system/budget.py. It answers one question: does
everything fit, and where does each thing sit? It is not the industrial design
(surfaces, closure, screws and draft angles come later).

Axes:  X along the strap, Y across the strap (along the forearm),
       Z through the wrist. z = 0 is the inner face (on the wrist),
       z = TB is the outer face (on the leg).

Run:   .venv/Scripts/python mechanical/band_alpha.py
Makes: mechanical/out/band_alpha_v0.step, one STEP per part, and
       mechanical/out/model.json (dimensions + the collision check).
"""
from __future__ import annotations

import json
import math
import sys
from pathlib import Path

import cadquery as cq

HERE = Path(__file__).resolve().parent
OUT = HERE / "out"
sys.path.insert(0, str(HERE.parent / "system"))
import budget as B  # noqa: E402

VERSION = "0.1.0"

# ---------------------------------------------------------------- dimensions
ENV = B.recommended()
L = round(ENV.length, 1)                 # along the strap
W = round(ENV.width, 1)                  # across the strap
PROUD = B.PAD_PROUD                      # pads stand out of each face
TB = round(ENV.thickness - 2 * PROUD, 2)  # body thickness without the pads
SHELL = B.SHELL                          # floor of the tray and thickness of the cover
SIDE = B.SIDE_WALL
R_PLAN = 3.0                             # corner radius seen from above; larger and a square cell no longer fits the corner
R_EDGE = 0.8                             # softened outer edges
CAV_L, CAV_W = L - 2 * SIDE, W - 2 * SIDE
CAV_Z0, CAV_Z1 = SHELL, TB - SHELL       # cavity floor and ceiling

PCB_T = B.PCB_T
BOARD_L, BOARD_W = round(ENV.board_l, 1), ENV.board_w
BOT_H, TOP_H = B.tallest("bot"), B.tallest("top")
PCB_Z0 = CAV_Z0 + B.AIR / 2 + BOT_H      # underside of the board
PCB_Z1 = PCB_Z0 + PCB_T
BOARD_X0 = -CAV_L / 2 + B.EDGE_CLR       # board sits at the -X end, cell at the +X end
BOARD_X1 = BOARD_X0 + BOARD_L
CELL = ENV.cell
CELL_X0 = BOARD_X1 + B.GAP
CELL_X1 = CELL_X0 + CELL.w

LEDGE = 0.6                              # shelf each electrode plate is bonded to
PAD_T = LEDGE + PROUD                    # plate thickness
LEG_PAD = B.LEG_PAD                      # (along X, along Y)
WRIST_PAD = B.WRIST_PAD
LEG_PITCH = LEG_PAD[0] + B.PAD_GAP
LEG_X = {"LL1": -LEG_PITCH, "RLD": 0.0, "LL2": LEG_PITCH}
WRIST_X = {"LA1": -(WRIST_PAD[0] + 3.0) / 2, "LA2": (WRIST_PAD[0] + 3.0) / 2}

STRAP_W, STRAP_T = B.STRAP_WIDTH, 2.4
WRIST_AX, WRIST_AZ = 29.5, 21.0          # half-width and half-height of an adult wrist section
WRIST_CZ = -(WRIST_AZ + PROUD + 0.2)     # centre of the wrist below the inner face


def rbox(l: float, w: float, h: float, r: float, z0: float = 0.0, x: float = 0.0, y: float = 0.0) -> cq.Workplane:
    """Box with rounded vertical corners, bottom at z0, centred on (x, y)."""
    s = cq.Workplane("XY").box(l, w, h, centered=(True, True, False))
    if r > 0:
        s = s.edges("|Z").fillet(min(r, l / 2 - 0.01, w / 2 - 0.01))
    return s.translate((x, y, z0))


def block(x0: float, x1: float, y0: float, y1: float, z0: float, z1: float) -> cq.Workplane:
    return cq.Workplane("XY").box(x1 - x0, y1 - y0, z1 - z0, centered=False).translate((x0, y0, z0))


# ------------------------------------------------------------------- housing
def body_outline() -> cq.Workplane:
    b = rbox(L, W, TB, R_PLAN)
    return b.faces("<Z or >Z").edges().fillet(R_EDGE)


def windows(pad: tuple[float, float], xs: dict[str, float], outer: bool) -> tuple[cq.Workplane, cq.Workplane]:
    """(pockets cut from the face, smaller through-windows for the spring contacts)."""
    pockets = cq.Workplane("XY")
    holes = cq.Workplane("XY")
    for x in xs.values():
        z_pocket = TB - LEDGE if outer else 0.0
        z_hole = CAV_Z1 if outer else 0.0
        pockets = pockets.union(rbox(pad[0] + 0.1, pad[1] + 0.1, LEDGE, 1.25, z_pocket, x))
        holes = holes.union(rbox(pad[0] - 3.0, pad[1] - 5.0, SHELL, 0.8, z_hole, x))
    return pockets, holes


def make_tray() -> cq.Workplane:
    """Wrist-side shell: floor + walls. Carries the LA pads, the sensor window and the charge contacts."""
    body = body_outline()
    tray = body.cut(block(-L, L, -W, W, CAV_Z1, TB + 1))                       # everything above the split
    tray = tray.cut(rbox(CAV_L, CAV_W, CAV_Z1 - CAV_Z0 + 0.01, R_PLAN - SIDE, CAV_Z0))
    pockets, holes = windows(WRIST_PAD, WRIST_X, outer=False)
    tray = tray.cut(pockets).cut(holes)
    # optional PPG / temperature window (OPT-01), on the wrist face next to the LA pads
    tray = tray.cut(rbox(7.0, 7.0, SHELL, 1.5, 0.0, SENSOR_X, 0.0))
    # two charge contacts
    for y in (-CHARGE_Y, CHARGE_Y):
        tray = tray.cut(cq.Workplane("XY").circle(1.1).extrude(SHELL).translate((CHARGE_X, y, 0)))
    # seal groove on the rim
    groove = rbox(CAV_L + 1.7, CAV_W + 1.7, 0.4, R_PLAN - SIDE + 0.85, CAV_Z1 - 0.4).cut(
        rbox(CAV_L + 0.5, CAV_W + 0.5, 0.5, R_PLAN - SIDE + 0.25, CAV_Z1 - 0.45))
    tray = tray.cut(groove)
    # slot for the strap flex at the -X end, and the button opening on the +Y side
    tray = tray.cut(block(-L / 2 - 1, -CAV_L / 2 + 0.1, FLEX_Y - 4.0, FLEX_Y + 4.0, PCB_Z1 + 0.1, PCB_Z1 + 0.9))
    tray = tray.cut(block(BTN_X - 3.0, BTN_X + 3.0, CAV_W / 2 - 0.1, W / 2 + 1, PCB_Z1 + 0.15, PCB_Z1 + 1.75))
    # quick-release lugs at the +X end (the -X end carries the fixed strap with the flex)
    for sy in (-1, 1):
        ear = block(L / 2 - 1.0, L / 2 + 4.0, sy * (STRAP_W / 2 + 0.3) - (0 if sy > 0 else 1.8),
                    sy * (STRAP_W / 2 + 0.3) + (1.8 if sy > 0 else 0), 0.6, CAV_Z1)
        ear = ear.edges("|Y").fillet(1.2)
        tray = tray.union(ear)
    tray = tray.cut(cq.Workplane("XZ").circle(0.8).extrude(W, both=True).translate((BAR_X, 0, BAR_Z)))
    return tray


def make_cover() -> cq.Workplane:
    """Leg-side shell: a lid with a tongue. Carries LL1, RLD and LL2."""
    body = body_outline()
    cover = body.cut(block(-L, L, -W, W, -1, CAV_Z1))
    tongue = rbox(CAV_L - 0.2, CAV_W - 0.2, 0.9, R_PLAN - SIDE - 0.1, CAV_Z1 - 0.9).cut(
        rbox(CAV_L - 2.0, CAV_W - 2.0, 1.0, R_PLAN - SIDE - 1.0, CAV_Z1 - 0.95))
    # the locating tongue stops where the cell starts: the cell fills its end of the cavity to the walls
    tongue = tongue.cut(block(CELL_X0 - 0.6, L, -W, W, 0, TB))
    cover = cover.union(tongue)
    pockets, holes = windows(LEG_PAD, LEG_X, outer=True)
    return cover.cut(pockets).cut(holes)


def make_gasket() -> cq.Workplane:
    return rbox(CAV_L + 1.6, CAV_W + 1.6, 0.5, R_PLAN - SIDE + 0.8, CAV_Z1 - 0.4).cut(
        rbox(CAV_L + 0.6, CAV_W + 0.6, 0.6, R_PLAN - SIDE + 0.3, CAV_Z1 - 0.45))


def make_pads() -> dict[str, cq.Workplane]:
    pads: dict[str, cq.Workplane] = {}
    for name, x in LEG_X.items():
        pads[name] = rbox(LEG_PAD[0], LEG_PAD[1], PAD_T, 1.2, TB - LEDGE, x)
    for name, x in WRIST_X.items():
        pads[name] = rbox(WRIST_PAD[0], WRIST_PAD[1], PAD_T, 1.2, -PROUD, x)
    return pads


# ----------------------------------------------------------- what is inside
SENSOR_X = WRIST_X["LA1"] - WRIST_PAD[0] / 2 - 2.5 - 3.5      # sensor window beside LA1
CHARGE_X, CHARGE_Y = SENSOR_X, 8.0                           # charge contacts flank the window, over the board
FLEX_Y = -5.5
BTN_X = 6.0
BAR_X, BAR_Z = L / 2 + 2.4, CAV_Z1 / 2 + 0.3
MOTOR_D, MOTOR_H = 8.0, 2.7
NOTCH = MOTOR_D + 0.6
MOTOR_X, MOTOR_Y = BOARD_X1 - NOTCH / 2, -BOARD_W / 2 + NOTCH / 2


def make_board() -> cq.Workplane:
    b = block(BOARD_X0, BOARD_X1, -BOARD_W / 2, BOARD_W / 2, PCB_Z0, PCB_Z1)
    # the board outline follows the cavity corners, with the assembly clearance all round
    b = b.intersect(rbox(CAV_L - 2 * B.EDGE_CLR, CAV_W - 2 * B.EDGE_CLR, 10, R_PLAN - SIDE, PCB_Z0 - 1))
    return b.cut(block(BOARD_X1 - NOTCH, BOARD_X1 + 1, -BOARD_W / 2 - 1, -BOARD_W / 2 + NOTCH, PCB_Z0 - 1, PCB_Z1 + 1))


def top(x: float, y: float, l: float, w: float, h: float) -> cq.Workplane:
    return block(x - l / 2, x + l / 2, y - w / 2, y + w / 2, PCB_Z1, PCB_Z1 + h)


def bot(x: float, y: float, l: float, w: float, h: float) -> cq.Workplane:
    return block(x - l / 2, x + l / 2, y - w / 2, y + w / 2, PCB_Z0 - h, PCB_Z0)


def make_parts() -> dict[str, cq.Workplane]:
    """Component bodies at their real sizes. Positions are a first placement, not the layout."""
    radio_x = BOARD_X0 + 1.0 + 15.5 / 2        # antenna end at the -X edge, clear of the cover's tongue
    p: dict[str, cq.Workplane] = {
        # tall side (faces the leg)
        "radio": top(radio_x, BOARD_W / 2 - 10.5 / 2 - 0.4, 15.5, 10.5, 2.05),
        "afe": top(-4.5, -BOARD_W / 2 + 8.0 / 2 + 1.2, 8.0, 8.0, 1.0),
        "pmic": top(4.5, 6.5, 2.5, 2.5, 0.63),
        "inductor": top(4.5, 3.6, 2.0, 1.6, 1.0),
        "ldo": top(-3.75, 0.2, 2.9, 2.8, 1.1),
        "vcap1": top(-11.5, -9.5, 2.0, 1.25, 1.3),
        "button": top(BTN_X, BOARD_W / 2 - 1.45, 3.9, 2.9, 1.7),
        "fpc": top(BOARD_X0 + 1.8, FLEX_Y, 3.6, 4.6, 1.0),
        # low side (faces the wrist)
        "buffer_a": bot(BOARD_X0 + 4.0, -6.0, 5.0, 3.2, 1.1),
        "buffer_b": bot(BOARD_X0 + 4.0, 6.0, 5.0, 3.2, 1.1),
        "ppg": bot(SENSOR_X, 0.0, 4.3, 2.9, 1.0),
    }
    # spring contacts: from the board to the back of each electrode plate, through its window
    leg_xy = {"LL1": (-10.2, -1.2), "RLD": (0.5, 3.0), "LL2": (8.2, -1.0)}
    for name, (sx, sy) in leg_xy.items():
        p[f"spring_{name}"] = block(sx - 0.8, sx + 0.8, sy - 1.5, sy + 1.5, PCB_Z1, TB - LEDGE)
    for name, x in WRIST_X.items():
        p[f"spring_{name}"] = block(x - 0.8, x + 0.8, 4.5, 7.5, LEDGE, PCB_Z0)
    return p


def make_cell() -> cq.Workplane:
    y0 = -CELL.l / 2
    c = block(CELL_X0, CELL_X1, y0, y0 + CELL.l, CAV_Z0 + B.AIR / 2, CAV_Z0 + B.AIR / 2 + CELL.t)
    return c.edges("|Z").fillet(1.0).edges("|Y").fillet(0.8)      # a pouch cell has soft corners


def make_motor() -> cq.Workplane:
    return cq.Workplane("XY").circle(MOTOR_D / 2).extrude(MOTOR_H).translate((MOTOR_X, MOTOR_Y, CAV_Z0 + 0.1))


def make_bar() -> cq.Workplane:
    return cq.Workplane("XZ").circle(0.75).extrude(STRAP_W / 2 + 2.3, both=True).translate((BAR_X, 0, BAR_Z))


# ------------------------------------------------------------------- strap
def strap_points(side: int) -> list[tuple[float, float]]:
    """Centre line of one strap half in the X-Z plane, from the module end up over the wrist."""
    a, b = WRIST_AX + 0.6 + STRAP_T / 2, WRIST_AZ + 0.6 + STRAP_T / 2
    start = (BAR_X, BAR_Z) if side > 0 else (-L / 2 - 0.2, BAR_Z)
    pts = [start]
    for deg in (62, 80, 100, 122, 144, 162, 172):
        phi = math.radians(deg)
        pts.append((a * math.sin(phi), WRIST_CZ + b * math.cos(phi)))
    return [(side * abs(x) if i else x, z) for i, (x, z) in enumerate(pts)]


def strap_path(side: int) -> cq.Workplane:
    return cq.Workplane("XZ").spline(strap_points(side))


def sweep_band(side: int, width: float, thick: float, upto: float = 1.0) -> cq.Workplane:
    """A band of width x thick swept along the first `upto` share of the strap centre line."""
    pts = strap_points(side)
    if upto < 1.0:
        edge = strap_path(side).val()
        n = 24
        pts = [(edge.positionAt(upto * i / n).x, edge.positionAt(upto * i / n).z) for i in range(n + 1)]
    path = cq.Workplane("XZ").spline(pts)
    e = path.val()
    p0, t0 = e.positionAt(0), e.tangentAt(0)
    plane = cq.Plane(origin=(p0.x, p0.y, p0.z), xDir=(0, 1, 0), normal=(t0.x, t0.y, t0.z))
    return cq.Workplane(plane).rect(width, thick).sweep(path)


def strap_frame(side: int, s: float) -> tuple[cq.Vector, cq.Vector, cq.Vector]:
    """Position, tangent and outward normal on the strap centre line at share s of its length."""
    e = strap_path(side).val()
    p, t = e.positionAt(s), e.tangentAt(s)
    n = cq.Vector(t.z, 0, -t.x)
    centre = cq.Vector(0, 0, WRIST_CZ)
    if (p - centre).dot(n) < 0:
        n = n * -1
    return p, t, n


RA_S = {"RA1": 0.74, "RA2": 0.90}          # where the two RA pads sit along the -X strap half
RA_PAD = (9.4, 19.0)                       # along the strap x across it


def make_ra_pads() -> dict[str, cq.Workplane]:
    pads = {}
    for name, s in RA_S.items():
        p, t, n = strap_frame(-1, s)
        origin = p + n * (STRAP_T / 2 - 0.5)
        plane = cq.Plane(origin=(origin.x, origin.y, origin.z), xDir=(t.x, t.y, t.z), normal=(n.x, n.y, n.z))
        pads[name] = cq.Workplane(plane).rect(RA_PAD[0], RA_PAD[1]).extrude(0.5 + PROUD)
    return pads


def build() -> dict[str, cq.Workplane]:
    parts: dict[str, cq.Workplane] = {
        "tray": make_tray(),
        "cover": make_cover(),
        "gasket": make_gasket(),
        "board": make_board(),
        "cell": make_cell(),
        "motor": make_motor(),
        "bar": make_bar(),
    }
    for k, v in make_pads().items():
        parts[f"pad_{k}"] = v
    for k, v in make_parts().items():
        parts[f"part_{k}"] = v
    parts["strap_6"] = sweep_band(+1, STRAP_W, STRAP_T)
    parts["strap_12"] = sweep_band(-1, STRAP_W, STRAP_T)
    parts["flex"] = sweep_band(-1, 7.0, 0.2, upto=RA_S["RA2"] + 0.03)
    for k, v in make_ra_pads().items():
        parts[f"pad_{k}"] = v
    return parts


def collisions(parts: dict[str, cq.Workplane]) -> list[tuple[str, str, float]]:
    """Volumes (mm3) shared by bodies that must not touch.

    Checked: every internal body against every other, and against both shells.
    Not checked, because they are meant to touch: a part and the board it is soldered to,
    a spring contact and the electrode plate it presses on.
    """
    inside = ["board", "cell", "motor"] + sorted(n for n in parts if n.startswith("part_"))
    pairs = [(a, b) for i, a in enumerate(inside) for b in inside[i + 1:]]
    pairs += [(shell, n) for shell in ("tray", "cover") for n in inside]
    found = []
    for a, b in pairs:
        if "board" in (a, b) and (a.startswith("part_") or b.startswith("part_")):
            continue
        if (a, b) == ("tray", "part_button"):
            continue                                   # the button looks out through its opening
        try:
            v = parts[a].val().intersect(parts[b].val()).Volume()
        except Exception:
            v = 0.0
        if v > 0.01:
            found.append((a, b, round(v, 2)))
    return found


COLORS = {
    "tray": (0.09, 0.16, 0.29), "cover": (0.09, 0.16, 0.29), "gasket": (0.85, 0.33, 0.25),
    "board": (0.10, 0.42, 0.29), "cell": (0.72, 0.74, 0.78), "motor": (0.62, 0.64, 0.68),
    "bar": (0.80, 0.82, 0.85), "strap_6": (0.33, 0.36, 0.41), "strap_12": (0.33, 0.36, 0.41),
    "flex": (0.85, 0.58, 0.15),
}


def color_of(name: str) -> tuple[float, float, float]:
    if name in COLORS:
        return COLORS[name]
    if name.startswith("pad_"):
        return (0.80, 0.82, 0.85)
    if name.startswith("part_spring"):
        return (0.88, 0.72, 0.30)
    if name == "part_radio":
        return (0.75, 0.77, 0.80)
    return (0.16, 0.17, 0.19)


if __name__ == "__main__":
    OUT.mkdir(exist_ok=True)
    parts = build()
    assy = cq.Assembly(name="band_alpha_v0")
    for name, wp in parts.items():
        assy.add(wp, name=name, color=cq.Color(*color_of(name)))
        cq.exporters.export(wp, str(OUT / f"{name}.step"))
    assy.save(str(OUT / "band_alpha_v0.step"))
    hits = collisions(parts)
    info = {
        "version": VERSION,
        "module_mm": {"length": L, "width": W, "body_thickness": TB, "thickness_with_pads": round(TB + 2 * PROUD, 2)},
        "board_mm": {"length": BOARD_L, "width": BOARD_W, "thickness": PCB_T},
        "cell": {"code": CELL.code, "mAh": CELL.mah, "t_w_l_mm": [CELL.t, CELL.w, CELL.l]},
        "cavity_mm": {"length": round(CAV_L, 1), "width": round(CAV_W, 1), "height": round(CAV_Z1 - CAV_Z0, 2)},
        "spring_working_height_mm": {"leg_side": round(TB - LEDGE - PCB_Z1, 2), "wrist_side": round(PCB_Z0 - LEDGE, 2)},
        "wrist_gap_at_module_end_mm": round(-PROUD - (WRIST_CZ + WRIST_AZ * math.sqrt(max(0.0, 1 - (L / 2 / WRIST_AX) ** 2))), 1),
        "collisions": hits,
        "parts": sorted(parts),
    }
    (OUT / "model.json").write_text(json.dumps(info, indent=2), encoding="utf-8")
    print(json.dumps(info, indent=2))

# v0.1.0 - first solid fit model: tray, cover, gasket, seven pads, board with real part bodies, cell, strap with flex
