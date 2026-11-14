"""CYPHIX Band alpha - industrial design concept v1.

The v0 model (band_alpha.py) only asked "does the electronics fit" and drew
boxes. This one is the design: how the island sits on the wrist, how the strap
closes and is sized, how the device is charged, how big the electrodes are and
how the conductor to RA1 / RA2 is held in the strap and enters the island.

Everything is built on ONE master curve: the skin line of a design wrist
(an ellipse, 163 mm round). The island's inner face and the strap's inner face
both ARE that curve, so the inside of the band is one continuous round line and
the island is concave (radius about 44 mm at its centre).

Coordinates: X-Z is the plane the band closes in, Y runs along the forearm.
The island is at the bottom of the curve, s = 0. s is the distance along the
skin from there: negative = the fixed side (radial, where the flex and the RA
pads are), positive = the free side (ulnar, where the strap is threaded round
the bar and sized). d is the height above the skin.

Run:   .venv/Scripts/python mechanical/band_id.py
Makes: mechanical/out_id/band_id.glb, band_id_section.glb, dock.glb, id.json
"""
from __future__ import annotations

import json
import math
import sys
from pathlib import Path

import cadquery as cq
import numpy as np

HERE = Path(__file__).resolve().parent
OUT = HERE / "out_id"
VERSION = "1.0.0"

# ------------------------------------------------------------ master curve
A, B = 30.5, 21.0          # design wrist: half breadth, half depth
_N = 6000
_PH = [2 * math.pi * i / _N for i in range(_N + 1)]
_S = [0.0]
for _i in range(1, _N + 1):
    _m = (_PH[_i - 1] + _PH[_i]) / 2
    _S.append(_S[-1] + math.hypot(A * math.cos(_m), B * math.sin(_m)) * (_PH[_i] - _PH[_i - 1]))
CIRC = _S[-1]              # wrist circumference of the design wrist
R_CENTRE = A * A / B       # radius of curvature under the island


def phi_at(s: float) -> float:
    s %= CIRC
    lo, hi = 0, _N
    while hi - lo > 1:
        mid = (lo + hi) // 2
        if _S[mid] <= s:
            lo = mid
        else:
            hi = mid
    f = (s - _S[lo]) / (_S[hi] - _S[lo])
    return _PH[lo] + f * (_PH[hi] - _PH[lo])


def frame(s: float):
    """Skin point, unit tangent (towards larger s) and unit outward normal, each as (x, z)."""
    ph = phi_at(s)
    p = (A * math.sin(ph), -B + B * math.cos(ph))
    tx, tz = A * math.cos(ph), -B * math.sin(ph)
    n = math.hypot(tx, tz)
    return p, (tx / n, tz / n), (-tz / n, tx / n)


def pt(s: float, d: float = 0.0, y: float = 0.0):
    """3D point at arc position s, height d above the skin, y across the band."""
    p, _, n = frame(s)
    return (p[0] + d * n[0], y, p[1] + d * n[1])


def plane_on(s: float, d: float = 0.0, y: float = 0.0) -> cq.Plane:
    """Plane lying on the surface at (s, d, y): local x = along the band, local z = outward."""
    _, t, n = frame(s)
    return cq.Plane(origin=pt(s, d, y), xDir=(t[0], 0, t[1]), normal=(n[0], 0, n[1]))


def blend(x: float) -> float:
    x = min(max(x, 0.0), 1.0)
    return 0.5 - 0.5 * math.cos(math.pi * x)


def val(v, s):
    return v(s) if callable(v) else v


def rrect(plane: cq.Plane, u0: float, u1: float, v0: float, v1: float, rc: float) -> cq.Wire:
    """Rounded rectangle as ONE wire of 8 edges, always drawn the same way round (lofts need that)."""
    if rc <= 0.021 or (v1 - v0) < 0.12:          # too thin to round: a plain rectangle
        return cq.Workplane(plane).polyline([(u0, v0), (u1, v0), (u1, v1), (u0, v1)]).close().val()
    r = max(min(rc, (u1 - u0) / 2 - 0.02, (v1 - v0) / 2 - 0.02), 0.03)
    k = r * (1 - math.sqrt(0.5))
    wp = (cq.Workplane(plane)
          .moveTo(u0 + r, v0).lineTo(u1 - r, v0).threePointArc((u1 - k, v0 + k), (u1, v0 + r))
          .lineTo(u1, v1 - r).threePointArc((u1 - k, v1 - k), (u1 - r, v1))
          .lineTo(u0 + r, v1).threePointArc((u0 + k, v1 - k), (u0, v1 - r))
          .lineTo(u0, v0 + r).threePointArc((u0 + k, v0 + k), (u0 + r, v0)).close())
    return wp.val()


def section(s: float, w: float, d0: float, d1: float, rc: float, yc: float = 0.0) -> cq.Wire:
    """Cross-section of the band at s: w wide (centred on yc), from height d0 to d1."""
    p, t, _ = frame(s)
    plane = cq.Plane(origin=(p[0], 0, p[1]), xDir=(0, 1, 0), normal=(t[0], 0, t[1]))
    return rrect(plane, yc - w / 2, yc + w / 2, d0, d1, rc)


def loft(stations, w, d0, d1, rc, yc=0.0) -> cq.Workplane:
    wires = [section(s, val(w, s), val(d0, s), val(d1, s), val(rc, s), val(yc, s)) for s in stations]
    return cq.Workplane("XY").add(cq.Solid.makeLoft(wires))


def span(s0: float, s1: float, step: float) -> list[float]:
    n = max(2, int(round(abs(s1 - s0) / step)) + 1)
    return [s0 + (s1 - s0) * i / (n - 1) for i in range(n)]


def prism(s: float, y: float, lx: float, ly: float, r: float, d: float = 0.0, depth: float = 6.0) -> cq.Workplane:
    """Rounded-rectangle prism centred on (s, d, y), running both ways along the surface normal."""
    return (cq.Workplane(plane_on(s, d, y)).sketch().rect(lx, ly).vertices().fillet(r).finalize()
            .extrude(depth, both=True))


def box_at(s: float, d: float, y: float, ls: float, ld: float, ly: float) -> cq.Workplane:
    return cq.Workplane(plane_on(s, d, y)).box(ls, ly, ld)


def pin(s: float, y: float, d0: float, d1: float, r: float) -> cq.Workplane:
    return cq.Workplane(plane_on(s, d0, y)).circle(r).extrude(d1 - d0)


# ------------------------------------------------------------------ island
T0, W0 = 7.2, 30.0                    # thickness and width of the island's body
T_STRAP, W_STRAP, RC_STRAP = 2.8, 24.0, 1.2
S_ROOT = -27.5                        # where the strap leaves the island on the fixed side
S_NOSE = 23.0                         # end of the island body on the free side
S_BAR = 27.5                          # the bar the strap is threaded round
D_BAR = T_STRAP / 2 + 1.0 + 0.15 + T_STRAP / 2     # bar centre above the skin
W_FRAME = 30.0                        # the island keeps its full width to the buckle end
WALL = 1.2
PLATE = 0.8                           # electrode plate thickness
Y_MET0, Y_MET1 = -13.4, 9.0           # electrodes cover this much of the width; the rest is the service strip
Y_MET = (Y_MET0 + Y_MET1) / 2
W_MET = Y_MET1 - Y_MET0


T_NOSE = 6.6                          # the buckle end stays tall: the arms and the bar need the height


def t_isl(s: float) -> float:
    if s <= 0:
        return T0 if s >= -16 else T0 + (T_STRAP - T0) * blend((-16 - s) / (-16 - S_ROOT))
    return T0 if s <= 21 else T0 + (T_NOSE - T0) * blend((s - 21) / (S_NOSE - 21))


def w_isl(s: float) -> float:
    if s <= 0:
        return W0 if s >= -14 else W0 + (W_STRAP - W0) * blend((-14 - s) / (-14 - S_ROOT))
    return W0 if s <= 14 else W0 + (W_FRAME - W0) * blend((s - 14) / 6.0)


def rc_isl(s: float) -> float:
    return min(2.4, 0.43 * t_isl(s)) if s < S_NOSE - 0.2 else 3.0     # a soft end on the buckle side


def make_body() -> cq.Workplane:
    return loft(span(S_ROOT, S_NOSE, 1.4), w_isl, 0.0, t_isl, rc_isl)


LEG = {"LL1": -12.4, "RLD": 0.0, "LL2": 12.4}       # centres (s) of the three bands on the leg face
LEG_L = 12.0                                         # each band, measured on the outer face
WRIST = {"LA1": -11.3, "LA2": 11.3}
WRIST_L = 12.6
CHG_Y = [Y_MET + k for k in (-4.5, -1.5, 1.5, 4.5)]  # four charge / service contacts


def outer_slab(extra: float = 0.0) -> cq.Workplane:
    return loft(span(-21, 21, 1.4), 44.0, lambda s: t_isl(s) - PLATE, lambda s: t_isl(s) + 3.0 + extra, 0.2)


def inner_slab() -> cq.Workplane:
    return loft(span(-21, 21, 1.4), 44.0, -3.0, PLATE, 0.2)


def build_island():
    """Returns (parts, body_for_checks). Shells are hollow and split at mid height."""
    parts: dict[str, cq.Workplane] = {}
    body = make_body()
    solid = body

    o_slab, i_slab = outer_slab(), inner_slab()
    for name, s in LEG.items():
        fp = prism(s, Y_MET, LEG_L, W_MET, 2.6, d=T0)
        parts[f"el_{name}"] = o_slab.intersect(fp).intersect(solid)
        body = body.cut(o_slab.intersect(prism(s, Y_MET, LEG_L + 0.24, W_MET + 0.24, 2.72, d=T0)))
    for name, s in WRIST.items():
        fp = prism(s, Y_MET, WRIST_L, W_MET, 2.6, d=0.0)
        parts[f"el_{name}"] = i_slab.intersect(fp).intersect(solid)
        body = body.cut(i_slab.intersect(prism(s, Y_MET, WRIST_L + 0.24, W_MET + 0.24, 2.72, d=0.0)))

    # charge / service contacts: a shallow recess on the wrist face, four gold pads at its floor
    body = body.cut(prism(0.0, Y_MET, 3.8, 13.2, 1.85, d=0.0, depth=0.45))
    for i, y in enumerate(CHG_Y):
        body = body.cut(pin(0.0, y, 0.2, 2.6, 0.95))
        parts[f"chg_{i + 1}"] = pin(0.0, y, 0.36, 2.2, 0.9)

    # status light: a slit in the service strip of the leg face
    led_fp = prism(-9.5, 11.1, 4.2, 0.9, 0.44, d=T0)
    parts["led"] = o_slab.intersect(led_fp).intersect(solid)
    body = body.cut(o_slab.intersect(prism(-9.5, 11.1, 4.4, 1.1, 0.54, d=T0)))

    # button on the side wall, following the wall's own shape
    _, t, _ = frame(2.0)
    bplane = cq.Plane(origin=pt(2.0, T0 / 2, W0 / 2), xDir=(t[0], 0, t[1]), normal=(0, 1, 0))
    btn = cq.Workplane(bplane).sketch().rect(9.0, 2.3).vertices().fillet(1.1).finalize().extrude(1.3, both=True)
    btn_big = cq.Workplane(bplane).sketch().rect(9.3, 2.6).vertices().fillet(1.25).finalize().extrude(1.3, both=True)
    parts["button"] = solid.intersect(btn).translate((0, 0.22, 0))
    body = body.cut(btn_big)

    # the cavity: board on the fixed side, cell on the free side
    cav = loft(span(-17.0, 21.7, 1.5), lambda s: w_isl(s) - 3.4, WALL, lambda s: t_isl(s) - WALL,
               lambda s: max(0.6, min(2.4, 0.43 * t_isl(s)) - 1.1))
    # pocket for the strap's tongue and its retaining bead, and the slit the flex comes through
    body = body.cut(cav).cut(make_tongue(0.05)).cut(make_bead(0.08)).cut(make_flex_tail(0.25))

    upper = loft(span(S_ROOT - 1, S_NOSE + 1, 1.5), 50.0, lambda s: t_isl(s) / 2, lambda s: t_isl(s) + 6, 0.2)
    lower = loft(span(S_ROOT - 1, S_NOSE + 1, 1.5), 50.0, -6.0, lambda s: t_isl(s) / 2, 0.2)
    parts["shell_leg"] = body.intersect(upper)
    parts["shell_wrist"] = body.intersect(lower)

    # the buckle end: two slim lugs growing out of the island, a polished bar between them
    def lug_d0(q: float) -> float:
        return 1.0 + (D_BAR - 1.6 - 1.0) * blend((q - S_NOSE) / (S_BAR - S_NOSE))

    def lug_d1(q: float) -> float:
        return 5.6 + (D_BAR + 1.6 - 5.6) * blend((q - S_NOSE) / (S_BAR - S_NOSE))

    for side, sy in (("a", -1), ("b", 1)):
        yc = sy * 13.4
        wires = [section(q, 2.0, lug_d0(q), lug_d1(q), 0.95, yc) for q in span(S_NOSE - 1.2, S_BAR + 0.5, 1.0)]
        wires.append(section(S_BAR + 1.35, 2.0, D_BAR - 1.25, D_BAR + 1.25, 0.95, yc))
        wires.append(section(S_BAR + 1.95, 2.0, D_BAR - 0.6, D_BAR + 0.6, 0.55, yc))
        parts[f"arm_{side}"] = cq.Workplane("XY").add(cq.Solid.makeLoft(wires))
    parts["bar"] = cq.Workplane(cq.Plane(origin=pt(S_BAR, D_BAR, 0), xDir=(1, 0, 0), normal=(0, 1, 0))).circle(1.0).extrude(13.6, both=True)
    return parts, solid, cav


# ------------------------------------------------------- strap, fixed side
TONGUE_S = [-27.5, -26.5, -25.5, -24.5, -23.5, -22.7]
TONGUE_W = [21.2, 21.0, 20.6, 20.6, 20.6, 20.6]
TONGUE_D0 = [0.72, 0.75, 0.80, 0.90, 1.00, 1.00]
TONGUE_D1 = [2.08, 2.20, 2.40, 2.80, 3.00, 3.00]


def make_tongue(grow: float = 0.0) -> cq.Workplane:
    wires = [section(s, w + 2 * grow, d0 - grow, d1 + grow, 0.7)
             for s, w, d0, d1 in zip(TONGUE_S, TONGUE_W, TONGUE_D0, TONGUE_D1)]
    return cq.Workplane("XY").add(cq.Solid.makeLoft(wires))


def make_bead(grow: float = 0.0) -> cq.Workplane:
    return box_at(-21.8, 2.4, 0.0, 1.9 + 2 * grow, 3.4 + 2 * grow, 21.6 + 2 * grow)


def flex_d(s: float) -> float:
    """Height of the flex: mid-thickness in the strap, rising to the connector inside the island."""
    return 1.32 if s <= -26.0 else 1.32 + (3.72 - 1.32) * blend((s + 26.0) / 9.0)


FLEX_W = 13.4
FLEX_END = -13.3


def make_flex_tail(grow: float = 0.0) -> cq.Workplane:
    return loft(span(S_ROOT - 0.5, FLEX_END, 0.9), FLEX_W + 2 * grow, lambda s: flex_d(s) - grow,
                lambda s: flex_d(s) + 0.15 + grow, 0.05)


RA = {"RA1": -52.0, "RA2": -68.0}       # centres of the two finger pads on the strap
RA_L, RA_W = 13.0, 19.0
RA_POST_Y = {"RA1": 3.4, "RA2": -3.4}   # each pad has its own post, its own trace
S_TIP = 69.5                            # tail tip on the design wrist
HOLES = [41.0 + 6.0 * k for k in range(7)]
STUD_S = 65.0
D_TAIL = T_STRAP + 0.15                 # underside of the folded-back tail


def build_strap():
    parts: dict[str, cq.Workplane] = {}
    # the strap from the island, up the fixed side, over the top, down the free side to the bar
    on_len = (S_ROOT - (S_BAR + 3.5 - CIRC))          # arc from the root round to just before the bar
    main = loft([S_ROOT - u for u in span(0.0, on_len, 2.4)], W_STRAP, 0.0, T_STRAP, RC_STRAP)
    for name, s in RA.items():
        slab = loft(span(s - 8.5, s + 8.5, 1.2), 26.0, T_STRAP - 0.65, T_STRAP + 0.25, 0.15)
        parts[f"el_{name}"] = slab.intersect(prism(s, 0.0, RA_L, RA_W, 4.2, d=T_STRAP))
        pocket = loft(span(s - 8.5, s + 8.5, 1.2), 26.0, T_STRAP - 0.65, T_STRAP + 0.6, 0.15)
        main = main.cut(pocket.intersect(prism(s, 0.0, RA_L + 0.3, RA_W + 0.3, 4.35, d=T_STRAP)))
        parts[f"post_{name}"] = pin(s, RA_POST_Y[name], 1.47, T_STRAP - 0.6, 0.9)
    # sizing holes on the free side, counterbored on the skin side so the stud's foot is not felt
    for s in HOLES:
        main = main.cut(pin(s, 0.0, -0.5, T_STRAP + 0.5, 1.25)).cut(pin(s, 0.0, -0.5, 0.75, 2.1))
    parts["strap"] = main
    parts["tongue"] = make_tongue().union(make_bead())
    parts["anchor"] = box_at(-24.4, 1.75, 0.0, 4.0, 0.7, 18.0)

    # the flex: polyimide carrier with two separate traces and a guard between them
    flex = loft(span(RA["RA2"] - 3.0, S_ROOT, 1.6), FLEX_W, 1.32, 1.47, 0.05).union(make_flex_tail())
    for s in span(RA["RA2"] - 1.0, -31.0, 4.0):
        for y in (-5.7, 5.7):
            flex = flex.cut(pin(s, y, 1.0, 1.8, 0.55))          # interlock holes: the strap material keys through
    parts["flex"] = flex
    for name, s in RA.items():
        y = RA_POST_Y[name]
        tr = loft(span(s, S_ROOT, 1.6), 2.0, 1.47, 1.53, 0.02, y)
        tr = tr.union(loft(span(S_ROOT - 0.5, FLEX_END, 0.9), 2.0, lambda q: flex_d(q) + 0.15, lambda q: flex_d(q) + 0.21, 0.02, y))
        tr = tr.union(pin(s, y, 1.47, 1.55, 2.5))
        parts[f"trace_{name}"] = tr
    guard = loft(span(RA["RA2"] - 2.0, S_ROOT, 1.6), 0.7, 1.47, 1.52, 0.02, 0.0)
    parts["trace_guard"] = guard.union(loft(span(S_ROOT - 0.5, FLEX_END, 0.9), 0.7, lambda q: flex_d(q) + 0.15, lambda q: flex_d(q) + 0.20, 0.02, 0.0))

    # round the bar and back up the outside: centre line as points, then sections along it
    pb, tb, nb = frame(S_BAR)
    cb = (pb[0] + D_BAR * nb[0], pb[1] + D_BAR * nb[1])
    rm = 1.0 + 0.15 + T_STRAP / 2
    cl: list[tuple[float, float]] = []
    for s in span(S_BAR + 3.5, S_BAR + 0.4, 0.8):
        p, _, n = frame(s)
        cl.append((p[0] + 1.4 * n[0], p[1] + 1.4 * n[1]))
    for a in span(0.0, math.pi, math.pi / 14):
        cl.append((cb[0] + rm * (-math.cos(a) * nb[0] - math.sin(a) * tb[0]),
                   cb[1] + rm * (-math.cos(a) * nb[1] - math.sin(a) * tb[1])))
    top = D_BAR + rm
    for s in span(S_BAR + 0.8, S_TIP, 1.6):
        p, _, n = frame(s)
        d = (D_TAIL + T_STRAP / 2) + (top - D_TAIL - T_STRAP / 2) * (1 - blend((s - S_BAR) / 9.0))
        cl.append((p[0] + d * n[0], p[1] + d * n[1]))
    wires = []
    for i, c in enumerate(cl):
        a, b = cl[max(i - 1, 0)], cl[min(i + 1, len(cl) - 1)]
        tx, tz = b[0] - a[0], b[1] - a[1]
        m = math.hypot(tx, tz)
        plane = cq.Plane(origin=(c[0], 0, c[1]), xDir=(0, 1, 0), normal=(tx / m, 0, tz / m))
        wires.append(rrect(plane, -W_STRAP / 2, W_STRAP / 2, -T_STRAP / 2, T_STRAP / 2, RC_STRAP))
    tail = cq.Workplane("XY").add(cq.Solid.makeLoft(wires))
    # a round tip
    _, tt, tn = frame(S_TIP - 6.0)
    c0 = pt(S_TIP - 6.0, D_TAIL + T_STRAP / 2)
    centre = (c0[0] - 20.0 * tt[0], 0.0, c0[2] - 20.0 * tt[1])
    tip = (cq.Workplane(cq.Plane(origin=centre, xDir=(tt[0], 0, tt[1]), normal=(tn[0], 0, tn[1])))
           .sketch().rect(52.0, W_STRAP + 1.0).vertices().fillet(11.8).finalize().extrude(9.0, both=True))
    keep = box_at(S_TIP - 6.0, D_TAIL + 1.4, 0.0, 30.0, 14.0, 40.0)     # only the last stretch is trimmed
    tail = tail.cut(keep.cut(tip))
    tail = tail.cut(pin(STUD_S, 0.0, D_TAIL - 0.5, D_TAIL + T_STRAP + 0.5, 1.15))
    parts["tail"] = tail
    # the stud: polished head outside, neck through both layers, foot in the counterbore
    stud = pin(STUD_S, 0.0, D_TAIL + T_STRAP, D_TAIL + T_STRAP + 1.0, 2.9)
    try:
        stud = stud.faces(cq.selectors.DirectionMinMaxSelector(cq.Vector(*frame3n(STUD_S)), True)).edges().fillet(0.45)
    except Exception:
        pass
    stud = stud.union(pin(STUD_S, 0.0, 0.1, D_TAIL + T_STRAP + 0.05, 1.1)).union(pin(STUD_S, 0.0, 0.08, 0.68, 1.95))
    parts["stud"] = stud
    return parts


def frame3n(s: float):
    _, _, n = frame(s)
    return (n[0], 0.0, n[1])


# ----------------------------------------------------- inside the island
S_BOARD = -3.5            # the board is flat; it touches the curve's direction here
BOARD_L, BOARD_W, PCB_T = 24.0, 26.0, 0.8
D_PCB0 = WALL + 0.15 + 1.1
S_CELL = 15.3
CELL = (12.0, 26.5, 4.0)


def on_board(bx: float, by: float, l: float, w: float, h: float, top: bool = True) -> cq.Workplane:
    """A part on the flat board: bx along the board from its centre, by across, h tall."""
    pl = plane_on(S_BOARD, D_PCB0 + (PCB_T if top else 0.0), 0.0)
    off = h / 2 if top else -h / 2
    return cq.Workplane(pl).center(bx, by).box(l, w, h).translate(tuple(off * c for c in frame3n(S_BOARD)))


def build_inside():
    p: dict[str, cq.Workplane] = {}
    p["pcb"] = cq.Workplane(plane_on(S_BOARD, D_PCB0 + PCB_T / 2, 0.0)).box(BOARD_L, BOARD_W, PCB_T)
    p["radio"] = on_board(1.5, 7.2, 10.5, 11.4, 2.05)          # antenna end under the service strip (no metal over it)
    p["afe"] = on_board(-5.0, -7.2, 8.0, 8.0, 1.0)
    p["conn"] = on_board(-10.3, 0.0, 3.2, 14.6, 1.0)           # the flex from the strap lands here
    p["low_a"] = on_board(-2.0, 9.5, 5.0, 3.2, 1.0, top=False)
    p["low_b"] = on_board(-9.0, -6.0, 3.0, 3.0, 0.8, top=False)
    p["motor"] = cq.Workplane(plane_on(S_BOARD, WALL + 0.1, 0.0)).center(7.6, -8.6).circle(4.0).extrude(2.7)
    p["pcb"] = p["pcb"].cut(cq.Workplane(plane_on(S_BOARD, D_PCB0 - 1.0, 0.0)).center(7.6, -8.6).rect(8.8, 8.8).extrude(3.0))
    p["chip_a"] = on_board(-1.0, -11.0, 2.4, 2.4, 0.9)
    p["chip_b"] = on_board(11.0, 3.0, 1.6, 6.0, 0.7)
    # spring contacts: each electrode plate has its own
    def spring(name: str, bx: float, by: float, top: bool, reach: float):
        h = reach
        p[f"spring_{name}"] = on_board(bx, by, 1.3, 2.4, h, top=top)
    r_out = R_CENTRE + T0 - PLATE
    r_in = R_CENTRE + PLATE
    d_top = D_PCB0 + PCB_T
    for name, bx, by in (("LL1", -8.9, -1.5), ("RLD", 3.5, -1.5), ("LL2", 11.0, -1.5)):
        spring(name, bx, by, True, (T0 - PLATE - d_top) - bx * bx / (2 * r_out) + 0.03)
    for name, bx, by in (("LA1", -8.0, 5.2), ("LA2", 10.5, 5.2)):
        spring(name, bx, by, False, (D_PCB0 - PLATE) + bx * bx / (2 * r_in) + 0.03)
    p["cell"] = cq.Workplane(plane_on(S_CELL, WALL + 0.2 + CELL[2] / 2, 0.0)).box(CELL[0], CELL[1], CELL[2]).edges("|Y").fillet(0.9)
    return p


# -------------------------------------------------------------------- dock
def build_dock():
    """A stand the band hangs on: its arm takes the wrist's place, so the concave face finds its own seat."""
    d: dict[str, cq.Workplane] = {}
    ell = cq.Workplane("XZ").ellipse(A - 0.12, B - 0.12).extrude(90, both=True).translate((0, 0, -B))

    def slab(lx: float, ly: float, r: float, z0: float, z1: float, y0: float) -> cq.Workplane:
        return (cq.Workplane("XY").sketch().rect(lx, ly).vertices().fillet(r).finalize().extrude(z1 - z0)
                .translate((0, y0 + ly / 2, z0)))

    # arm: a rounded beam whose top is the wrist line; nose towards the user
    arm = slab(25.0, 70.0, 12.4, -11.5, 3.0, -19.0).intersect(ell)
    try:
        arm = arm.faces("<Z").edges().fillet(3.2)
    except Exception:
        pass
    stem = slab(25.0, 12.0, 5.9, -90.0, -5.0, 39.0)
    base = slab(62.0, 84.0, 22.0, -97.0, -89.0, -30.0)
    try:
        base = base.faces(">Z").edges().fillet(3.0)
    except Exception:
        pass
    stand = arm.union(stem).union(base)
    pad_region = slab(21.0, 32.0, 6.0, -3.0, 3.0, Y_MET - 16.0 + 1.0)
    skin = arm.cut(arm.translate((0, 0, -0.7)))
    pad = skin.intersect(pad_region)
    d["dock_pad"] = pad
    d["dock_stand"] = stand.cut(pad)
    for i, y in enumerate(CHG_Y):
        d[f"dock_pin_{i + 1}"] = cq.Workplane("XY").circle(0.75).extrude(2.3).translate((0, y, -2.0 + 0.02))
    d["dock_usb"] = (cq.Workplane("XZ").sketch().rect(9.0, 3.3).vertices().fillet(1.6).finalize().extrude(0.6)
                     .translate((0, 51.4, -78.0)))
    return d


def build_wrist() -> cq.Workplane:
    return cq.Workplane("XZ").ellipse(A - 0.05, B - 0.05).extrude(11, both=True).translate((0, 0, -B))


# ------------------------------------------------------------------ export
MATERIAL = {
    "shell_": "body", "arm_": "body", "button": "body_gloss", "led": "led",
    "el_": "electrode", "bar": "steel", "stud": "steel", "post_": "steel",
    "chg_": "gold", "dock_pin_": "gold", "spring_": "gold",
    "strap": "fkm", "tail": "fkm", "tongue": "fkm", "anchor": "anchor",
    "flex": "polyimide", "trace_guard": "copper_dim", "trace_": "copper",
    "pcb": "pcb", "radio": "shield", "afe": "chip", "conn": "connector", "chip_": "chip", "low_": "chip",
    "motor": "shield", "cell": "cell",
    "dock_pad": "dock_pad", "dock_stand": "dock_metal", "dock_usb": "chip",
    "wrist": "wrist",
}


def material_of(name: str) -> str:
    best = ""
    for key in MATERIAL:
        if name.startswith(key) and len(key) > len(best):
            best = key
    return MATERIAL.get(best, "body")


def mesh(wp: cq.Workplane, fine: bool):
    vals = [v for v in wp.vals() if isinstance(v, cq.Shape)]
    if not vals:
        return None
    shape = vals[0] if len(vals) == 1 else cq.Compound.makeCompound(vals)
    verts, tris = shape.tessellate(0.012 if fine else 0.03, 0.08 if fine else 0.16)
    if not tris:
        return None
    return np.array([(v.x, v.y, v.z) for v in verts], dtype=np.float64) * 0.001, np.array(tris, dtype=np.int64)


def export(parts: dict[str, cq.Workplane], path: Path, cut_y: float | None = None) -> int:
    import trimesh
    scene = trimesh.Scene()
    total = 0
    for name, wp in parts.items():
        if cut_y is not None:
            try:
                wp = wp.cut(cq.Workplane("XY").box(400, 400, 400).translate((0, cut_y - 200, 0)))
            except Exception:
                continue
        m = mesh(wp, fine=name.startswith(("el_", "shell_", "strap", "tail", "bar", "stud", "button", "dock_stand")))
        if m is None:
            continue
        v, f = m
        tm = trimesh.Trimesh(vertices=v, faces=f, process=False)
        tm.merge_vertices(digits_vertex=7)
        try:
            tm = trimesh.graph.smooth_shade(tm, angle=0.62)
        except Exception:
            pass
        tm.visual = trimesh.visual.TextureVisuals(material=trimesh.visual.material.PBRMaterial(name=material_of(name)))
        scene.add_geometry(tm, node_name=name, geom_name=name)
        total += len(f)
    path.parent.mkdir(parents=True, exist_ok=True)
    scene.export(str(path))
    return total


def vol(wp: cq.Workplane) -> float:
    try:
        return sum(v.Volume() for v in wp.vals() if isinstance(v, cq.Shape))
    except Exception:
        return 0.0


def common(a: cq.Workplane, b: cq.Workplane) -> float:
    """Volume two bodies share; no overlap at all comes back from the kernel as an error, which is zero."""
    try:
        return vol(a.intersect(b))
    except Exception:
        return 0.0


def area_mm2(wp: cq.Workplane, towards) -> float:
    """Area of the faces of a plate that look roughly along `towards` (its outer skin)."""
    tot = 0.0
    tv = cq.Vector(*towards)
    for f in wp.faces().vals():
        try:
            if f.normalAt().dot(tv) > 0.6:
                tot += f.Area()
        except Exception:
            pass
    return tot


if __name__ == "__main__":
    OUT.mkdir(exist_ok=True)
    island, solid, cav = build_island()
    strap = build_strap()
    inside = build_inside()
    band = {**island, **strap, **inside}

    checks = {}
    shells = island["shell_leg"].union(island["shell_wrist"])
    hits = []
    for name, wp in inside.items():
        v = common(wp, shells)
        if v > 0.02:
            hits.append([name, round(v, 2)])
    checks["inside_parts_touching_the_shells_mm3"] = hits
    checks["tail_vs_island_mm3"] = round(common(strap["tail"], solid), 3)
    checks["strap_vs_arms_mm3"] = round(common(strap["tail"], island["arm_a"]) + common(strap["tail"], island["arm_b"]), 3)

    areas = {}
    for name in ("LL1", "RLD", "LL2"):
        areas[name] = round(area_mm2(island[f"el_{name}"], frame3n(LEG[name])), 0)
    for name in ("LA1", "LA2"):
        n = frame3n(WRIST[name])
        areas[name] = round(area_mm2(island[f"el_{name}"], (-n[0], 0, -n[2])), 0)
    for name in ("RA1", "RA2"):
        areas[name] = round(area_mm2(strap[f"el_{name}"], frame3n(RA[name])), 0)

    n1 = export(band, OUT / "band_id.glb")
    n2 = export(band, OUT / "band_id_section.glb", cut_y=-1.5)
    dock = build_dock()
    n3 = export(dock, OUT / "dock.glb")
    export({"wrist": build_wrist()}, OUT / "wrist.glb")

    p_end, _, _ = frame(19.0)
    info = {
        "version": VERSION,
        "design_wrist_mm": {"circumference": round(CIRC, 1), "breadth": 2 * A, "depth": 2 * B},
        "island_mm": {"length_over_electrodes": round(2 * 19.0 * (R_CENTRE + T0) / R_CENTRE, 1),
                      "length_with_shoulders": round(S_NOSE - S_ROOT, 1), "width": W0, "thickness": T0,
                      "inner_radius_at_centre": round(R_CENTRE, 1), "concavity_depth_at_19mm": round(-p_end[1], 2)},
        "strap_mm": {"width": W_STRAP, "thickness": T_STRAP, "holes_pitch": 6.0, "holes": len(HOLES)},
        "electrode_area_mm2": areas,
        "checks": checks,
        "triangles": {"band": n1, "section": n2, "dock": n3},
    }
    (OUT / "id.json").write_text(json.dumps(info, indent=2), encoding="utf-8")
    print(json.dumps(info, indent=2))

    if "--step" in sys.argv:          # solid CAD for a designer or a factory: one assembly, every part named
        assy = cq.Assembly(name="band_alpha_id_v1")
        for name, wp in {**band, **dock}.items():
            assy.add(wp, name=name)
        assy.save(str(OUT / "band_id.step"))
        print("STEP ->", OUT / "band_id.step")

# v1.0.0 - industrial design concept: concave island on one master curve, loop-through closure, flush electrodes, flex with two traces, contact charging stand
