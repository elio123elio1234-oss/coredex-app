"""CYPHIX Band alpha - premium side variant (concept P1), drawn NEXT TO concept v3.1, not instead of it.

The owner, 2026-11-15, on v3.1: "can it be upgraded to look like an Apple product? Make a side version
that looks premium - from the outside it looks cheap and unprofessional." Nothing inside changes (same
board, cell, sensors, springs, flex, same 7.2 mm and 30 mm that the parts set); the outside does:

  * One soft body (ceramic, zirconia, in the colour of the band): no lugs, no pins, no bar on the island.
    The section is the same all along, and both ends are rounded off the same way, with one 3 mm radius.
  * The strap goes into a slot in each end, the way a watch band goes into its case, between two solid,
    well-rounded corners. The strap is 22 mm (v3.1: 24), narrower than the 30 mm body, as a watch band is. The
    fixed end holds the strap with the conductor (overmoulded, as before); the free end holds the ring.
  * The steel is flush and continuous: the leg face is one rounded steel face cut into LL1 | RLD | LL2 by two
    hairline lines of the body's own material, with one polished line round the outside. The wrist face is
    the same outline: LA1 | black ceramic centre with a domed sapphire lens and two flush contacts | LA2.
    Same metal on every plate (316L), same finishes (satin face, polished edge) as v3.1.
  * The closure is beside the island, on the inside of the wrist, where nobody sees it (Apple's Sport Loop
    closes the same way, next to the case): a polished steel ring sits at the island's free end, held by a
    tongue in that end's slot, and the one strap goes round the wrist, through the ring and back onto itself
    (hook-and-loop). P1.0 put the ring at the back of the wrist; the owner: "that is the top of the strap - not
    comfortable, and certainly not fashionable". The top of the strap now carries only RA1 and RA2.

What is NOT claimed: that this is manufacturable at a given price (zirconia housings cost several times a
plastic one and are bonded, not ultrasonically welded), that the antenna works (steel on both faces, as in
v3.1: the antenna has the ceramic sides and ends), or that a picture is the product. A human industrial
designer and real CMF samples still decide the surfaces and finishes.

Run:   .venv/Scripts/python mechanical/band_premium.py [--step]
Makes: mechanical/out_p/band_p.glb, band_p_section.glb, dock_p.glb, wrist.glb, p.json
"""
from __future__ import annotations

import json
import math
import sys
import time
from pathlib import Path

import cadquery as cq

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import band_id as M  # noqa: E402  (the master curve, smooth sections, inside parts, meshing)
from band_id import (CIRC, blend, box_at, common, frame, frame3n, loft, mesh, pin, plane_on, pt,  # noqa: E402
                     ramp, sec_wire, sec_yd, section, span, vol, PARAMS)

OUT = HERE / "out_p"
VERSION = "1.1.0"


# --- kernel quirk: with the rounded ends, some booleans return a correct solid that is inside out (negative volume),
# and every later operation on it goes wrong. Every cut / intersect / union result is checked and turned the right
# way out. (Found on 2026-11-15: the wrist half came back as -5,199 mm3 instead of 5,199.)
def _right_way_out(wp: cq.Workplane) -> cq.Workplane:
    from OCP.BRepGProp import BRepGProp
    from OCP.GProp import GProp_GProps
    out, flipped = [], False
    for v in wp.vals():
        if not isinstance(v, cq.Shape):
            return wp
        for so in (v.Solids() if v.ShapeType() in ("Compound", "CompSolid") else [v]):
            if so.ShapeType() != "Solid":
                out.append(so)
                continue
            g = GProp_GProps()
            BRepGProp.VolumeProperties_s(so.wrapped, g)
            if g.Mass() < 0:
                so = cq.Solid(so.wrapped.Reversed())
                flipped = True
                print("  note: a boolean came back inside out and was turned round", flush=True)
            out.append(so)
    if not flipped:
        return wp
    return cq.Workplane("XY").add(out[0] if len(out) == 1 else cq.Compound.makeCompound(out))


for _op in ("cut", "intersect", "union"):
    _orig = getattr(cq.Workplane, _op)

    def _wrapped(self, *a, _orig=_orig, **k):
        return _right_way_out(_orig(self, *a, **k))

    setattr(cq.Workplane, _op, _wrapped)

# ------------------------------------------------------------------ island
T0, W0 = M.T0, M.W0                  # 7.2 x 30: set by the parts, unchanged
WALL, PLATE, GAP = M.WALL, M.PLATE, M.GAP
RT0, RB0 = 3.5, 2.2                  # a rounder leg-face edge than v3.1 (3.2): the side rolls over
T_STRAP, R_STRAP = M.T_STRAP, M.R_STRAP
W_STRAP = 22.0                       # v3.1: 24. Narrower than the 30 mm body, as a watch band is: the body reads as the
                                     # jewel, and each end keeps solid, well-rounded corners beside the strap
S_E = 26.0                           # both end faces, +-S_E (v3.1: 23 at the fixed end, 29.5 over the lugs)
CAP = 3.0                            # every end is rounded off with this radius, in one convex line
S_E0 = S_E - CAP                     # (a fillet on the end face was tried first; the kernel refused it)
# The section is the same all along the body; only the bottom edge rounds a little more towards the ends. Earlier
# builds of P1 also narrowed (30 -> 26) and lowered (7.2 -> 5.4) the ends along an S-curve: from above that read as a
# stepped shoulder at every corner. A constant section with one round end is a single convex line.
S_FLAT = 19.0                        # where the bottom edge starts to round more: past the cell's end (s = 20)
T_E, W_E = T0, W0
RT_E, RB_E = RT0, 2.4
# The strap goes into a slot in each end, as a watch band goes into its case. Tried and dropped on the way: a 20 mm
# slot in a 26 mm end with the strap narrowing to it (thin walls beside the slot read as knuckles, the narrowing as a
# lump), and an end floating over the strap (a step under the end, a notch in the side view). Now the strap is one
# width all along and the end's corners beside it are 3 mm wide with a 2.4 mm round: solid, no step, no thin wall.
D_HOOD = T_STRAP + GAP               # top of each slot
S_ROOT = -24.0                       # the strap with the conductor becomes its tongue here (inside the fixed end)
S_ROOT_B = 24.0                      # (P1.0: the plain strap's end) - the ring's tongue reaches in to LATCH_S0
S_CAV0, S_CAV1 = M.S_CAV0, M.S_CAV1  # the same cavity as v3.1


def t_top(s: float) -> float:
    return ramp(abs(s), S_FLAT, S_E0, T0, T_E)


def w_isl(s: float) -> float:
    return ramp(abs(s), S_FLAT + 2.0, S_E0, W0, W_E)


def rt_isl(s: float) -> float:
    return ramp(abs(s), S_FLAT, S_E0, RT0, RT_E)


def rb_isl(s: float) -> float:
    return ramp(abs(s), S_FLAT, S_E0, RB0, RB_E)


STATIONS = sorted(set(round(v, 3) for v in span(-S_E0, -15.0, 0.8) + span(-14.0, 14.0, 2.5) + span(15.0, S_E0, 0.8)))
CAP_K = 6


def cap_sections(sign: int):
    """The rounded end: each section is the end section moved inwards by e = CAP (1 - cos a) while s moves
    out by CAP sin a, which is how a ball of radius CAP rounds an edge. The last one is the small flat end face."""
    out = []
    for k in range(1, CAP_K + 1):
        a = (math.pi / 2) * k / CAP_K
        e = CAP * (1 - math.cos(a))
        out.append((sign * (S_E0 + CAP * math.sin(a)), W_E - 2 * e, e, T_E - e, max(RT_E - e, 0.15), max(RB_E - e, 0.15)))
    return out


def island_solid(delta: float = 0.0, stations=None) -> cq.Workplane:
    """The body between the two rounded ends (flat ends at +-S_E0), or an offset of it."""
    secs = [(s, w_isl(s) - 2 * delta, delta, t_top(s) - delta, max(rt_isl(s) - delta, 0.15), max(rb_isl(s) - delta, 0.15))
            for s in (stations or STATIONS)]
    return cq.Workplane("XY").add(cq.Solid.makeLoft([sec_wire(*c) for c in secs]))


def cap_solid(sign: int) -> cq.Workplane:
    """One rounded end, its own solid. Lofted in one piece with the body, the ends made every later split
    through them fail (a cut along the body came back with the wrong volume and inside out), so each end is a
    separate piece of the same material that starts exactly on the body's last section."""
    first = (sign * S_E0, W_E, 0.0, T_E, RT_E, RB_E)
    return cq.Workplane("XY").add(cq.Solid.makeLoft([sec_wire(*c) for c in [first] + cap_sections(sign)]))


def top_plane(s: float, inset: float = 0.0) -> cq.Plane:
    h = 0.05
    a, b = pt(s - h, t_top(s - h)), pt(s + h, t_top(s + h))
    tx, tz = b[0] - a[0], b[2] - a[2]
    m = math.hypot(tx, tz)
    tx, tz = tx / m, tz / m
    nx, nz = -tz, tx
    o = pt(s, t_top(s))
    return cq.Plane(origin=(o[0] - inset * nx, 0.0, o[2] - inset * nz), xDir=(tx, 0, tz), normal=(nx, 0, nz))


# ---------------------------------------------------- the steel faces
LENS_S = 17.5                        # the steel faces end here (skin arc), on both faces
LENS_W = 24.0
LENS_RC = 6.5                        # plan corner, softened by the spline (no curvature jump)
SPLIT_TOP = 5.4                      # LL1 | RLD | LL2: the springs land at s = -11.35, 2.0 and 6.8
SPLIT_BOT = 5.5                      # LA1 | centre | LA2: the springs land at s = -12.0 and 6.5
HR = 0.26                            # half a split line (skin arc): about 0.6 mm wide on the leg face
RIM = 0.35                           # the polished line round each face
WIN_R = M.WIN_R
DOME = 0.35                          # the sapphire lens stands this far proud at its centre: it meets the skin
CHG_Y = M.CHG_Y
R_CHG = 1.0                          # flush contacts, 2 mm


def soft_rect(hx: float, hy: float, r: float, z0: float, z1: float) -> cq.Workplane:
    """A rounded rectangle in the XY plane whose corners are smoothed by a C2 spline, extruded along Z."""
    pts = []
    nl, nc = 6, 9

    def line(a, b, n):
        for i in range(n):
            f = i / n
            pts.append((a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f))

    def arc(c, a0, n):
        for i in range(n):
            a = a0 + (math.pi / 2) * i / n
            pts.append((c[0] + r * math.cos(a), c[1] + r * math.sin(a)))

    line((-(hx - r), -hy), (hx - r, -hy), 2 * nl)
    arc((hx - r, -hy + r), -math.pi / 2, nc)
    line((hx, -hy + r), (hx, hy - r), nl)
    arc((hx - r, hy - r), 0.0, nc)
    line((hx - r, hy), (-(hx - r), hy), 2 * nl)
    arc((-(hx - r), hy - r), math.pi / 2, nc)
    line((-hx, hy - r), (-hx, -hy + r), nl)
    arc((-(hx - r), -hy + r), math.pi, nc)
    vs = [cq.Vector(x, y, z0) for x, y in pts]
    wire = cq.Wire.assembleEdges([cq.Edge.makeSpline(vs, periodic=True)])
    face = cq.Face.makeFromWires(wire)
    return cq.Workplane("XY").add(cq.Solid.extrudeLinear(face, cq.Vector(0, 0, z1 - z0)))


def slab(a: float, b: float) -> cq.Workplane:
    """Everything between arc positions a and b, cut square to the band."""
    return loft(span(a, b, 1.0), 44.0, -7.0, 16.0, 0.2)


def build_island():
    parts: dict[str, cq.Workplane] = {}
    solid = island_solid()                                  # the body between the rounded ends
    body = solid
    ends = {"end_a": cap_solid(-1), "end_b": cap_solid(1)}
    inner = island_solid(PLATE, [s for s in STATIONS if abs(s) <= 20.5])
    skin = solid.cut(inner)
    upper = loft(span(-S_E0 - 1.0, S_E0 + 1.0, 1.5), 50.0, lambda s: t_top(s) / 2, lambda s: t_top(s) + 6.0, 0.2)
    lower = loft(span(-S_E0 - 1.0, S_E0 + 1.0, 1.5), 50.0, -6.0, lambda s: t_top(s) / 2, 0.2)
    # both halves by intersection: "skin minus upper" came back from the kernel as an inside-out solid
    skin_top, skin_bot = skin.intersect(upper), skin.intersect(lower)

    x_top = pt(LENS_S, t_top(LENS_S))[0]
    x_bot = pt(LENS_S, 0.0)[0]

    def lens(sk, hx, grow=0.0):
        return sk.intersect(soft_rect(hx + grow, LENS_W / 2 + grow, LENS_RC + grow, -30.0, 30.0))

    # leg face: one steel face, three electrodes
    top_all, top_face = lens(skin_top, x_top), lens(skin_top, x_top, -RIM)
    top_rim = top_all.cut(top_face)
    top_pocket = lens(skin_top, x_top, GAP)
    for name, (a, b) in {"LL1": (-20.0, -SPLIT_TOP - HR), "RLD": (-SPLIT_TOP + HR, SPLIT_TOP - HR),
                         "LL2": (SPLIT_TOP + HR, 20.0)}.items():
        sl = slab(a, b)
        parts[f"el_{name}"] = top_rim.intersect(sl)
        parts[f"elc_{name}"] = top_face.intersect(sl)
        body = body.cut(top_pocket.intersect(slab(a - GAP, b + GAP)))

    # wrist face: the same outline, LA1 | black ceramic centre | LA2
    bot_all, bot_face = lens(skin_bot, x_bot), lens(skin_bot, x_bot, -RIM)
    bot_rim = bot_all.cut(bot_face)
    bot_pocket = lens(skin_bot, x_bot, GAP)
    for name, (a, b) in {"LA1": (-20.0, -SPLIT_BOT - HR), "LA2": (SPLIT_BOT + HR, 20.0)}.items():
        sl = slab(a, b)
        parts[f"el_{name}"] = bot_rim.intersect(sl)
        parts[f"elc_{name}"] = bot_face.intersect(sl)
        body = body.cut(bot_pocket.intersect(slab(a - GAP, b + GAP)))
    back = bot_all.intersect(slab(-SPLIT_BOT + HR, SPLIT_BOT - HR))
    body = body.cut(bot_pocket.intersect(slab(-SPLIT_BOT + HR - GAP, SPLIT_BOT - HR + GAP)))

    # sapphire lens through the centre, domed towards the skin, with the boss that meets the PPG sensor
    r_sph = (WIN_R ** 2 + DOME ** 2) / (2 * DOME)
    dome = (cq.Workplane("XY").add(cq.Solid.makeSphere(r_sph, cq.Vector(0, 0, -DOME + r_sph), angleDegrees1=-90, angleDegrees2=90))
            .intersect(pin(0.0, 0.0, -1.0, 0.2, WIN_R)))
    parts["window"] = solid.intersect(pin(0.0, 0.0, -2.0, WALL, WIN_R)).union(dome).union(pin(0.0, 0.0, WALL - 0.05, WALL + 0.3, 3.1))
    hole = pin(0.0, 0.0, -2.0, WALL + 0.01, WIN_R + GAP)
    body, back = body.cut(hole), back.cut(hole)
    # two flush contacts in the black centre
    for i, y in enumerate(CHG_Y):
        parts[f"chg_{i + 1}"] = solid.intersect(pin(0.0, y, -1.0, 2.2, R_CHG))
        h = pin(0.0, y, -1.0, 2.4, R_CHG + GAP)
        body, back = body.cut(h), back.cut(h)
    parts["back"] = back

    # status light: a short line in the body at the fixed end, on the centre line (touch zone round it)
    led = cq.Workplane(top_plane(-21.4, 0.6)).sketch().rect(0.9, 6.0).vertices().fillet(0.44).finalize().extrude(3.0)
    led_cut = cq.Workplane(top_plane(-21.4, 0.62)).sketch().rect(0.9 + 2 * GAP, 6.0 + 2 * GAP).vertices().fillet(0.5).finalize().extrude(3.0)
    parts["led"] = solid.intersect(led)
    body = body.cut(led_cut)

    cav_st = [S_CAV0] + [s for s in STATIONS if S_CAV0 + 0.3 < s < S_CAV1 - 0.3] + [S_CAV1]
    body = body.cut(island_solid(WALL, cav_st))
    # what reaches into the ends is cut from the body AND the end pieces: the strap's tongue, bead and flex,
    # the two band slots (the strap goes into the body, not round a bar), the plain strap's latch pocket
    # the ring's tongue: a steel plate from the ring's near bar into the free end, caught inside (the ring is
    # one steel part with it; drawn as two)
    latch = loft(span(LATCH_S0, S_NB, 0.4), 17.0, D_NB - 0.8, D_NB + 0.8, 0.3)
    for tool in (make_tongue(0.05), make_bead(0.08), make_flex_tail(0.25),
                 loft(span(-S_E - 1.6, S_ROOT + 0.05, 0.5), W_STRAP + 2 * GAP, -0.4, D_HOOD, R_STRAP + GAP),
                 loft(span(LATCH_S0 - 0.1, S_E + 1.6, 0.4), 17.0 + 2 * GAP, D_NB - 0.8 - GAP, D_NB + 0.8 + GAP, 0.35)):
        body = body.cut(tool)
        for k in ends:
            ends[k] = ends[k].cut(tool)
    parts["latch"] = latch
    parts.update(ends)

    # shells: the leg-side lid and the wrist-side tray, joined at mid height
    parts["shell_leg"] = body.intersect(upper)
    parts["shell_wrist"] = body.intersect(lower)
    return parts, solid


LATCH_S0 = 22.2


# ------------------------------------------- the strap with the conductor
TONGUE_S = [S_ROOT + k for k in (0.0, 0.8, 1.6, 2.4, 3.1, 3.6)]
TONGUE_W = M.TONGUE_W
TONGUE_D0 = M.TONGUE_D0
TONGUE_D1 = M.TONGUE_D1
S_BEAD = S_ROOT + 2.9
S_ANCHOR = S_ROOT + 2.0


def make_tongue(grow: float = 0.0) -> cq.Workplane:
    wires = [section(s, w + 2 * grow, d0 - grow, d1 + grow, 0.7)
             for s, w, d0, d1 in zip(TONGUE_S, TONGUE_W, TONGUE_D0, TONGUE_D1)]
    return cq.Workplane("XY").add(cq.Solid.makeLoft(wires))


def make_bead(grow: float = 0.0) -> cq.Workplane:
    return box_at(S_BEAD, 2.4, 0.0, 1.9 + 2 * grow, 3.4 + 2 * grow, 21.6 + 2 * grow)


def flex_d(s: float) -> float:
    return 1.32 if s <= S_ROOT + 1.8 else ramp(s, S_ROOT + 1.8, S_ROOT + 5.6, 1.32, 3.75)


FLEX_W, FLEX_END = M.FLEX_W, M.FLEX_END


def make_flex_tail(grow: float = 0.0) -> cq.Workplane:
    return loft(span(S_ROOT - 0.5, FLEX_END, 0.9), FLEX_W + 2 * grow, lambda s: flex_d(s) - grow,
                lambda s: flex_d(s) + 0.15 + grow, 0.05)


RA = {"RA1": -55.0, "RA2": -69.0}      # as in v3.1: 1 mm apart, each on its own trace
RA_L, RA_W = M.RA_L, M.RA_W
RA_POST_Y = M.RA_POST_Y
# the ring: polished 316L at the island's free end; the strap turns round its far bar
R_RING = 0.9
S_NB, D_NB = S_E + 1.25, 1.5           # near bar, just off the free end, on the tongue's centre line
S_FB = S_NB + 5.4                      # far bar: room for the strap to come up between the bars and fold back
D_FB = T_STRAP + 0.15 + R_RING         # high enough for the strap to pass under it
Y_RING, RC_RING = 13.2, 2.0            # 28.2 mm wide: 1.3 mm of steel each side of the 22 mm strap


def strap_wire_t(c, tx: float, tz: float, w: float, t: float) -> cq.Wire:
    nx, nz = tz, -tx
    r = min(R_STRAP, t / 2 - 0.02)
    vs = [cq.Vector(c[0] + d * nx, y, c[2] + d * nz) for y, d in sec_yd(w, -t / 2, t / 2, r, r)]
    return cq.Wire.assembleEdges([cq.Edge.makeSpline(vs, periodic=True, parameters=PARAMS)])


def loft_path(pts, widths, thick) -> cq.Workplane:
    wires = []
    n = len(pts)
    for i in range(n):
        a, b = pts[max(i - 1, 0)], pts[min(i + 1, n - 1)]
        tx, tz = b[0] - a[0], b[2] - a[2]
        m = math.hypot(tx, tz)
        wires.append(strap_wire_t(pts[i], tx / m, tz / m, widths[i], thick[i]))
    return cq.Workplane("XY").add(cq.Solid.makeLoft(wires))


def build_ring() -> cq.Workplane:
    pn, pf = cq.Vector(*pt(S_NB, D_NB)), cq.Vector(*pt(S_FB, D_FB))
    u = (pf - pn).normalized()
    v = cq.Vector(0, 1, 0)
    nrm = u.cross(v)
    mid = (pn + pf) * 0.5
    plane = cq.Plane(origin=mid, xDir=u, normal=nrm)
    L = (pf - pn).Length
    path = M.rrect(plane, -L / 2, L / 2, -Y_RING, Y_RING, RC_RING)
    start = plane.toWorldCoords((-L / 2 + RC_RING, -Y_RING))
    prof = cq.Workplane(cq.Plane(origin=start, xDir=nrm, normal=u)).circle(R_RING)
    return prof.sweep(cq.Workplane("XY").add(path), transition="round")


def neck(s: float) -> float:
    """Strap width along its length: the full 24 mm everywhere (P1's first build narrowed it to 20 at the body)."""
    return W_STRAP


RM = R_RING + 0.15 + T_STRAP / 2       # centre-line radius round the far bar
D_TAIL = T_STRAP + 0.02                # underside of the folded-back tail: it lies on the strap
S_TIP = 58.0                           # tail tip on the design wrist: it stays on the inside half of the wrist
TIP_R = 10.0                           # the tail's last 10 mm narrows along an ellipse
HOOK_S = (S_FB + 6.5, S_TIP - 3.0)     # hooks under the tail, 3 mm short of the tip (the lip a finger lifts)
LOOP_S = (S_FB + 4.0, 86.0)            # loops on the strap's outer face; they end before RA2 (at +89.7)
VELCRO_W, VELCRO_T = 18.0, 0.6


def strap_path() -> list:
    """Centre line: from the fixed end round the wrist (over the top, past RA1/RA2), under the ring's far bar,
    round it towards the island, and back out on top of itself."""
    pts = [pt(s, T_STRAP / 2) for s in span(S_ROOT, S_FB - CIRC, 0.6)]
    pb, tb, nb = frame(S_FB)
    cb = (pb[0] + D_FB * nb[0], pb[1] + D_FB * nb[1])
    for k in range(1, 31):
        a = math.pi * k / 30
        pts.append((cb[0] + RM * (-math.cos(a) * nb[0] - math.sin(a) * tb[0]), 0.0,
                    cb[1] + RM * (-math.cos(a) * nb[1] - math.sin(a) * tb[1])))
    top = D_FB + RM
    for s in span(S_FB, S_TIP, 0.6)[1:]:
        d = (D_TAIL + T_STRAP / 2) + (top - D_TAIL - T_STRAP / 2) * (1 - blend((s - S_FB) / 9.0))
        pts.append(pt(s, d))
    return pts


def build_strap():
    parts: dict[str, cq.Workplane] = {}
    pts = strap_path()
    n = len(pts)
    tip_from = n - 1 - int(round(TIP_R / 0.6)) - 1
    sel = [i for i in range(0, n, 3) if i < tip_from] + list(range(tip_from, n))
    widths = []
    for i in sel:
        x = ((S_TIP - 0.6 * (n - 1 - i)) - (S_TIP - TIP_R)) / TIP_R
        widths.append(W_STRAP if (i < tip_from or x <= 0) else max(W_STRAP * math.sqrt(max(1.0 - x * x, 0.0)), 6.0))
    strap = loft_path([pts[i] for i in sel], widths, [T_STRAP] * len(sel))

    for name, s in RA.items():
        sl = loft(span(s - 8.5, s + 8.5, 1.2), 30.0, T_STRAP - 0.6, T_STRAP + 2.0, 0.15)
        face = strap.intersect(sl).intersect(M.prism(s, 0.0, RA_L - 2 * RIM, RA_W - 2 * RIM, 4.2 - RIM, d=T_STRAP))
        parts[f"el_{name}"] = strap.intersect(sl).intersect(M.prism(s, 0.0, RA_L, RA_W, 4.2, d=T_STRAP)).cut(face)
        parts[f"elc_{name}"] = face
        strap = strap.cut(sl.intersect(M.prism(s, 0.0, RA_L + 2 * GAP, RA_W + 2 * GAP, 4.2 + GAP, d=T_STRAP)))
        parts[f"post_{name}"] = pin(s, RA_POST_Y[name], 1.47, T_STRAP - 0.6, 0.9)
    hook = loft(span(HOOK_S[0], HOOK_S[1], 1.0), VELCRO_W, D_TAIL - 0.005, D_TAIL + VELCRO_T, 0.3)
    loopp = loft(span(LOOP_S[0], LOOP_S[1], 1.0), VELCRO_W, T_STRAP - VELCRO_T, T_STRAP + 0.005, 0.3)
    parts["strap"] = strap.cut(hook).cut(loopp)
    parts["hook"] = hook
    parts["loop"] = loopp
    parts["tongue"] = make_tongue().union(make_bead())
    parts["anchor"] = box_at(S_ANCHOR, 1.75, 0.0, 4.0, 0.7, 18.0)

    flex = loft(span(RA["RA2"] - 3.0, S_ROOT, 1.6), FLEX_W, 1.32, 1.47, 0.05).union(make_flex_tail())
    for s in span(RA["RA2"] - 1.0, S_ROOT - 3.5, 4.0):
        if min(abs(s - c) for c in RA.values()) < 3.5:
            continue
        for y in (-5.7, 5.7):
            flex = flex.cut(pin(s, y, 1.0, 1.8, 0.55))
    parts["flex"] = flex
    for name, s in RA.items():
        y = RA_POST_Y[name]
        tr = loft(span(s, S_ROOT, 1.6), 2.0, 1.47, 1.53, 0.02, y)
        tr = tr.union(loft(span(S_ROOT - 0.5, FLEX_END, 0.9), 2.0, lambda q: flex_d(q) + 0.15, lambda q: flex_d(q) + 0.21, 0.02, y))
        tr = tr.union(pin(s, y, 1.47, 1.55, 2.5))
        parts[f"trace_{name}"] = tr
    guard = loft(span(RA["RA2"] - 2.0, S_ROOT, 1.6), 0.7, 1.47, 1.52, 0.02, 0.0)
    parts["trace_guard"] = guard.union(loft(span(S_ROOT - 0.5, FLEX_END, 0.9), 0.7, lambda q: flex_d(q) + 0.15, lambda q: flex_d(q) + 0.20, 0.02, 0.0))
    return parts


# ------------------------------------------------------------------ export
MATERIAL = dict(M.MATERIAL)
MATERIAL.update({"back": "back", "ring": "ring", "latch": "steel", "chg_": "contact", "end_": "body"})


def material_of(name: str) -> str:
    best = ""
    for key in MATERIAL:
        if name.startswith(key) and len(key) > len(best):
            best = key
    return MATERIAL.get(best, "body")


SMOOTH = M.SMOOTH + ("back", "ring", "end_")


def export(parts: dict[str, cq.Workplane], path: Path, cut_y: float | None = None) -> int:
    import trimesh
    scene = trimesh.Scene()
    total = 0
    for name, wp in parts.items():
        if cut_y is not None:
            try:
                wp = wp.intersect(cq.Workplane("XY").box(150, 40, 130).translate((0, cut_y + 20, -15)))
            except Exception:
                continue
        fine = name.startswith(SMOOTH)
        lin, ang = (0.008, 0.09) if fine else (0.03, 0.25)
        if name.startswith("end_"):
            lin, ang = 0.012, 0.15                # tightly curved: the finest setting gave 190k triangles per end
        m = mesh(wp, lin, ang)
        if m is None:
            continue
        v, nn, f = m
        tm = trimesh.Trimesh(vertices=v * 0.001, faces=f, vertex_normals=nn, process=False)
        tm.visual = trimesh.visual.TextureVisuals(material=trimesh.visual.material.PBRMaterial(name=material_of(name)))
        scene.add_geometry(tm, node_name=name, geom_name=name)
        total += len(f)
    path.parent.mkdir(parents=True, exist_ok=True)
    scene.export(str(path), include_normals=True)
    return total


def build_dock() -> dict[str, cq.Workplane]:
    """v3.1's stand, with a shallow pocket where the domed lens sits."""
    d = M.build_dock()
    pocket = cq.Workplane("XY").circle(WIN_R + 0.8).extrude(2.0).translate((0, 0, -1.4))
    for k in ("dock_stand", "dock_pad"):
        d[k] = d[k].cut(pocket)
    return d


def assemble():
    t = time.time()
    island, solid = build_island()
    print(f"  island {time.time() - t:.0f}s", flush=True)
    strap = build_strap()
    strap["ring"] = build_ring()
    print(f"  straps {time.time() - t:.0f}s", flush=True)
    inside = M.build_inside()
    for name, wp in inside.items():
        if name.startswith("spring_") or name in ("tpad",):
            for sh in ("shell_leg", "shell_wrist", "back"):
                island[sh] = island[sh].cut(wp)
    return island, solid, strap, inside


def area_mm2(wp, towards) -> float:
    return M.area_mm2(wp, towards)


if __name__ == "__main__":
    t_start = time.time()
    OUT.mkdir(exist_ok=True)
    island, solid, strap, inside = assemble()
    band = {**island, **strap, **inside}
    print(f"built in {time.time() - t_start:.0f}s", flush=True)

    checks = {}
    # shell by shell: a union of the two shells failed in the kernel's clean-up step
    def vs_shells(wp):
        return sum(common(wp, island[k]) for k in ("shell_leg", "shell_wrist", "end_a", "end_b"))

    hits = []
    for name, wp in inside.items():
        v = vs_shells(wp)
        if v > 0.02:
            hits.append([name, round(v, 2)])
    checks["inside_parts_touching_the_shells_mm3"] = hits
    checks["strap_vs_island_mm3"] = round(vs_shells(strap["strap"]), 3)
    checks["strap_vs_ring_mm3"] = round(common(strap["strap"], strap["ring"]), 3)
    checks["strap_vs_ring_tongue_mm3"] = round(common(strap["strap"], island["latch"]), 3)
    checks["ring_vs_island_mm3"] = round(vs_shells(strap["ring"]), 3)
    checks["solids_valid"] = all(v.val().isValid() for k, v in {**island, **strap}.items() if k in
                                 ("shell_leg", "shell_wrist", "end_a", "end_b", "strap", "ring", "back"))
    checks["volumes_positive"] = all(vol(v) > 0 for k, v in {**island, **strap}.items() if k in
                                     ("shell_leg", "shell_wrist", "end_a", "end_b", "strap", "back"))
    checks["latch_vs_shells_mm3"] = round(vs_shells(island["latch"]), 3)
    checks["tongue_vs_shells_mm3"] = round(vs_shells(strap["tongue"]), 3)
    bb = solid.val().BoundingBox()
    checks["island_symmetric_across_mm"] = round(bb.ymax + bb.ymin, 4)
    checks["island_length_mm"] = round(2 * S_E, 1)                     # along the skin line, end to end
    checks["ends_symmetric_across_mm"] = round(sum(island[k].val().BoundingBox().ymax + island[k].val().BoundingBox().ymin
                                                  for k in ("end_a", "end_b")), 4)

    areas = {}
    for name, s in (("LL1", -11.5), ("RLD", 0.0), ("LL2", 11.5)):
        areas[name] = round(sum(area_mm2(island[f"{k}_{name}"], frame3n(s)) for k in ("el", "elc")), 0)
    for name, s in (("LA1", -11.5), ("LA2", 11.5)):
        n = frame3n(s)
        areas[name] = round(sum(area_mm2(island[f"{k}_{name}"], (-n[0], 0, -n[2])) for k in ("el", "elc")), 0)
    for name, s in RA.items():
        areas[name] = round(sum(area_mm2(strap[f"{k}_{name}"], frame3n(s)) for k in ("el", "elc")), 0)
    print(json.dumps({"checks": checks, "electrode_area_mm2": areas}), flush=True)

    n1 = export(band, OUT / "band_p.glb")
    print(f"band_p.glb {time.time() - t_start:.0f}s", flush=True)
    dock = build_dock()
    n3 = export(dock, OUT / "dock_p.glb")
    export({"wrist": M.build_wrist()}, OUT / "wrist.glb")
    near = cq.Workplane("XY").box(90, 60, 40).translate((0, 0, -6))
    sect = {k: (v.intersect(near) if k.startswith("strap") else v) for k, v in band.items() if k != "ring"}
    n2 = export(sect, OUT / "band_p_section.glb", cut_y=-1.0)
    print(f"section {time.time() - t_start:.0f}s", flush=True)

    info = {
        "version": VERSION,
        "island_mm": {"length": checks["island_length_mm"], "width": W0, "thickness": T0, "ends": "rounded, band slot in each"},
        "closure": "steel ring at the island's free end (inside of the wrist); the strap goes through it and folds back (hook-and-loop)",
        "ring_mm": {"outer_width": round(2 * (Y_RING + R_RING), 1), "wire": 2 * R_RING},
        "lens_dome_mm": DOME,
        "electrode_area_mm2": areas,
        "checks": checks,
        "triangles": {"band": n1, "section": n2, "dock": n3},
        "seconds": round(time.time() - t_start),
    }
    (OUT / "p.json").write_text(json.dumps(info, indent=2), encoding="utf-8")
    print(json.dumps(info, indent=2))

    if "--step" in sys.argv:
        assy = cq.Assembly(name="band_alpha_premium_p1")
        for name, wp in {**band, **dock}.items():
            assy.add(wp, name=name)
        assy.save(str(OUT / "band_p.step"))
        print("STEP ->", OUT / "band_p.step")

# v1.1.0 - P1.1: the ring moves from the back of the wrist to the island's free end (inside of the wrist), one strap through it; RA back at -55/-69. P1.0: soft ceramic body, slots, split steel faces, black ceramic centre
