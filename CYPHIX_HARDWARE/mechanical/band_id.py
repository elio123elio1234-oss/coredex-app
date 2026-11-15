"""CYPHIX Band alpha - industrial design concept v3.2.

v3.2 (2026-11-15, the owner: "I liked the design of version 3.1, but with the premium version's electrodes"):
v3.1's body, lugs, bar, strap and closure stay exactly as they were; the electrodes are the premium side
variant's (band_premium.py). The leg face is one rounded steel face, cut into LL1 | RLD | LL2 by two hairline
lines of the body's own material, with one polished line round the outside (v3.1: three separate framed pills).
The wrist face has the same outline: LA1 | a black ceramic centre with the domed sapphire lens and two flush
charge contacts | LA2 (v3.1: two pills, a flat window and two recessed contacts in dishes). Same metal (316L),
same finishes (satin face, polished line), larger plates. The status light moved 0.4 mm further out and became
shallower so it clears the steel face and the strap's tongue.

v3 (2026-11-15) brings v2's engineering back into the owner's own design
language (the landing page render): a compact framed island that is the same at
both ends, two short lugs at each end with the bars' ends showing at the four
corners, three pill-shaped plates side by side with a dark face and a bright
polished edge, graphite body, slate strap. Kept from v2: the concave master
curve, symmetry, the PPG + thermometer window, smooth sections, hook-and-loop,
the flex with a trace per RA pad, the connected cell. Not like the render: the
size (the render's 35 x 26 x 6 mm cannot hold the parts; this is the render's
look at the computed size) and the plates (about twice the render's area,
because the owner asked for larger electrodes).

v3.1 (same day, the owner): the bar at the fixed end did nothing - no strap
goes round it - so it and its lugs are gone; the fixed end narrows to the
strap's width and the strap leaves from under it. And the plates are one
metal, 316L stainless (satin face, polished edge), instead of a dark coating
on bare steel.

v1 (2026-11-15) drew the concept: concave island on one master curve,
loop-through closure, flush electrodes, flex with two traces, contact charging.
The owner then found three faults in it, all real:

  1. It was not symmetric. A "service strip" ran down one side, so the plates sat
     off centre and the island looked as if it leaned.
  2. The PPG sensor and the skin thermometer of the original model were missing.
  3. The surfaces were rippled and the joint with the strap was lumpy: the
     sections were rounded rectangles whose corner radius jumped, and the
     pictures were shaded from a coarse mesh instead of the surface itself.

v2 answers them:

  1. The island is mirror-symmetric across its width. The antenna, the control
     and the status light moved to the one metal-free zone left, the shoulder
     where the strap leaves the island, on the centre line.
  2. A sapphire window at the centre of the wrist face carries the PPG sensor
     and the skin thermometer, with one charge contact on each side of it.
  3. Every outer surface is lofted from smooth sections (closed splines through
     a rounded section, so curvature never jumps), every size change follows a
     quintic curve (no kink, no curvature step at either end), the island and
     the strap start from the SAME section so the strap continues the island,
     and the strap is one loft along one smooth path, round the bar and back.
     The meshes carry the surface's own normals.

The owner's second list, same day, also answered here: hook-and-loop instead of holes
and a stud (holes on the top of the wrist made the band look upside down),
RA1/RA2 1 mm apart, the battery visibly connected to the board.

Coordinates: X-Z is the plane the band closes in, Y runs along the forearm.
The island is at the bottom of the curve, s = 0. s is the distance along the
skin from there: negative = the fixed side (where the flex and the RA pads
are), positive = the free side (where the strap is threaded round the bar and
sized). d is the height above the skin.

Run:   .venv/Scripts/python mechanical/band_id.py [--step]
Makes: mechanical/out_id/band_id.glb, band_id_section.glb, dock.glb, wrist.glb, id.json
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
VERSION = "3.2.0"


# --- kernel quirk (found in the premium variant, met again in v3.2 when the lugs were split off the wrist shell
# after the steel-face pockets): some booleans return a correct solid that is inside out (negative volume), and the
# next operation on it comes back empty. Every cut / intersect / union result is checked and turned the right way out.
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


if not getattr(cq.Workplane, "_cyphix_right_way_out", False):
    for _op in ("cut", "intersect", "union"):
        _orig = getattr(cq.Workplane, _op)

        def _wrapped(self, *a, _orig=_orig, **k):
            return _right_way_out(_orig(self, *a, **k))

        setattr(cq.Workplane, _op, _wrapped)
    cq.Workplane._cyphix_right_way_out = True

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


def frame3n(s: float):
    _, _, n = frame(s)
    return (n[0], 0.0, n[1])


def blend(x: float) -> float:
    x = min(max(x, 0.0), 1.0)
    return 0.5 - 0.5 * math.cos(math.pi * x)


def smooth(x: float) -> float:
    """Quintic step: no kink and no curvature jump at either end."""
    x = min(max(x, 0.0), 1.0)
    return x * x * x * (x * (x * 6 - 15) + 10)


def ramp(s: float, s0: float, s1: float, v0: float, v1: float) -> float:
    return v0 + (v1 - v0) * smooth((s - s0) / (s1 - s0))


def span(s0: float, s1: float, step: float) -> list[float]:
    n = max(2, int(round(abs(s1 - s0) / step)) + 1)
    return [s0 + (s1 - s0) * i / (n - 1) for i in range(n)]


# ------------------------------------------------------- smooth sections
# A section is a closed spline through points of a rounded rectangle (its own
# radius on the leg-face edge and on the wrist-face edge). The spline is C2, so
# where the rounded rectangle would jump from a straight to an arc the curvature
# instead rises gradually: the soft-square corner of premium products, and no
# highlight break. Every section has the same number of points in the same
# places and the same spline parameters, so neighbouring sections are
# compatible and the loft between them is clean.
SEG = (12, 7, 3, 12)          # points on: half the wrist edge, each corner, each side, half the leg edge


def sec_yd(w: float, d0: float, d1: float, rt: float, rb: float, yc: float = 0.0) -> list[tuple[float, float]]:
    hw = w / 2
    nb, nc, ns, nt = SEG
    out: list[tuple[float, float]] = []

    def line(a, b, n):
        for i in range(n):
            f = i / n
            out.append((a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f))

    def arc(c, r, a0, a1, n):
        for i in range(n):
            a = a0 + (a1 - a0) * i / n
            out.append((c[0] + r * math.cos(a), c[1] + r * math.sin(a)))

    line((0.0, d0), (hw - rb, d0), nb)
    arc((hw - rb, d0 + rb), rb, -math.pi / 2, 0.0, nc)
    line((hw, d0 + rb), (hw, d1 - rt), ns)
    arc((hw - rt, d1 - rt), rt, 0.0, math.pi / 2, nc)
    line((hw - rt, d1), (-(hw - rt), d1), 2 * nt)
    arc((-(hw - rt), d1 - rt), rt, math.pi / 2, math.pi, nc)
    line((-hw, d1 - rt), (-hw, d0 + rb), ns)
    arc((-(hw - rb), d0 + rb), rb, math.pi, 1.5 * math.pi, nc)
    line((-(hw - rb), d0), (0.0, d0), nb)
    return [(yc + y, d) for y, d in out]


def _params() -> list[float]:
    ref = sec_yd(30.0, 0.0, 7.2, 3.2, 2.2)
    ref = ref + [ref[0]]
    acc = [0.0]
    for a, b in zip(ref, ref[1:]):
        acc.append(acc[-1] + math.hypot(b[0] - a[0], b[1] - a[1]))
    return [v / acc[-1] for v in acc]


PARAMS = _params()


def sec_wire(s: float, w: float, d0: float, d1: float, rt: float, rb: float, yc: float = 0.0) -> cq.Wire:
    p, _, n = frame(s)
    vs = [cq.Vector(p[0] + d * n[0], y, p[1] + d * n[1]) for y, d in sec_yd(w, d0, d1, rt, rb, yc)]
    return cq.Wire.assembleEdges([cq.Edge.makeSpline(vs, periodic=True, parameters=PARAMS)])


# Plain (hidden) shapes - tongue, flex, slabs, split regions - keep the simple
# rounded-rectangle sections: nobody sees their surfaces.
def rrect(plane: cq.Plane, u0: float, u1: float, v0: float, v1: float, rc: float) -> cq.Wire:
    if rc <= 0.021 or (v1 - v0) < 0.12:
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
    p, t, _ = frame(s)
    plane = cq.Plane(origin=(p[0], 0, p[1]), xDir=(0, 1, 0), normal=(t[0], 0, t[1]))
    return rrect(plane, yc - w / 2, yc + w / 2, d0, d1, rc)


def val(v, s):
    return v(s) if callable(v) else v


def loft(stations, w, d0, d1, rc, yc=0.0) -> cq.Workplane:
    wires = [section(s, val(w, s), val(d0, s), val(d1, s), val(rc, s), val(yc, s)) for s in stations]
    return cq.Workplane("XY").add(cq.Solid.makeLoft(wires))


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
RT0, RB0 = 3.2, 2.2                   # edge radius on the leg face / on the wrist face
T_STRAP, W_STRAP, R_STRAP = 2.8, 24.0, 1.2
# v3.1: a bar only where the strap goes round one. The free end has two short lugs and the bar (its
# ends show at the corners); the strap runs under it, round it and back (hook-and-loop). The fixed end
# has no bar and no lugs (the owner: "no strap wraps round it, it is superfluous"): the island narrows
# to the strap's width and the strap comes straight out from under it, on the same inner line.
S_TAPER = 17.0                        # each end starts to slim here
S_NOSE = 23.0                         # the end face between the lugs at +S_NOSE; the fixed end at -S_NOSE
S_ROOT = -S_NOSE                      # where the fixed end of the strap enters the island
S_NECK = 19.0                         # the fixed end narrows from here ...
T_FIX = 5.0                           # ... to the strap's width and this height at -S_NOSE
S_BAR = 27.5                          # the bar at the free end
D_BAR = T_STRAP / 2 + 1.0 + 0.15 + T_STRAP / 2     # bar centre above the skin
R_LUGEND = 1.95                       # lug ends are rounded round the bar's own axis
T_LUG, D_LUG = D_BAR + R_LUGEND, D_BAR - R_LUGEND
S_END = S_BAR + R_LUGEND + 0.6
W_SLOT = W_STRAP + 1.0                # the strap runs between the lugs with 0.5 mm each side
WALL = 1.2
PLATE = 0.8                           # electrode plate thickness


def t_top(s: float) -> float:
    if s < 0:
        return ramp(-s, S_TAPER, S_NOSE, T0, T_FIX)
    return ramp(s, S_TAPER, S_BAR, T0, T_LUG)


def d_bot(s: float) -> float:
    if s < 0:
        return 0.0                                         # the fixed end stays on the skin: the strap leaves flush
    return ramp(s, S_NOSE - 2.0, S_BAR, 0.0, D_LUG)       # the free end lifts off the skin a little


def w_isl(s: float) -> float:
    return ramp(-s, S_NECK, S_NOSE, W0, W_STRAP) if s < 0 else W0


def rt_isl(s: float) -> float:
    return ramp(-s, S_TAPER, S_NOSE, RT0, 1.8) if s < 0 else ramp(s, S_TAPER, S_BAR, RT0, 1.6)


def rb_isl(s: float) -> float:
    return ramp(-s, S_TAPER, S_NOSE, RB0, R_STRAP) if s < 0 else ramp(s, S_TAPER, S_BAR, RB0, 1.2)


STATIONS = sorted(set([round(v, 3) for v in span(-S_NOSE, -15.5, 0.75) + span(-14.0, 14.0, 2.5)
                       + span(15.5, S_END, 0.9)]))


def island_wires(delta: float = 0.0, stations=None) -> list[cq.Wire]:
    out = []
    for s in (stations or STATIONS):
        out.append(sec_wire(s, w_isl(s) - 2 * delta, d_bot(s) + delta, t_top(s) - delta,
                            max(rt_isl(s) - delta, 0.15), max(rb_isl(s) - delta, 0.15)))
    return out


def island_solid(delta: float = 0.0, stations=None) -> cq.Workplane:
    return cq.Workplane("XY").add(cq.Solid.makeLoft(island_wires(delta, stations)))


# v3.2: the premium variant's steel faces (band_premium.py). Every plate on the device is the SAME metal,
# 316L stainless steel: a bead-blasted (satin) face and a polished line round it, two finishes of one metal.
# The leg face is ONE rounded steel face (a plan-view rounded rectangle projected onto the curved face), cut
# into LL1 | RLD | LL2 by two hairline lines of the body's material; the wrist face is the same outline cut
# into LA1 | black ceramic centre | LA2. (v3.0-v3.1: separate framed pills; v3.0 also put a dark coating on
# the face, two materials on one electrode, withdrawn in v3.1.)
LENS_S = 17.5                        # the steel faces end here (skin arc), on both faces
LENS_W = 24.0                        # across the band
LENS_RC = 6.5                        # plan corner, softened by the spline (no curvature jump)
SPLIT_TOP = 5.4                      # LL1 | RLD | LL2: the springs land at s = -11.35, 2.0 and 6.8
SPLIT_BOT = 5.5                      # LA1 | centre | LA2: the springs land at s = -12.0 and 6.5
HR = 0.26                            # half a split line (skin arc): about 0.6 mm wide on the leg face
RIM = 0.35                           # the polished line round each face (and round the RA pads on the strap)
WIN_R = 4.3                          # sapphire window: PPG sensor + skin thermometer
DOME = 0.35                          # the sapphire lens stands this far proud at its centre: it meets the skin
CHG_Y = (-9.0, 9.0)                  # two flush charge contacts in the black centre; the input does not care which is which
R_CHG = 1.0
S_LED = -19.6                        # status light + touch zone at the fixed end, centre line, clear of the steel face
LED_DEPTH = 2.0                      # the light line's depth into the end wall (a light pipe below it): clears the strap's tongue
GAP = 0.12                           # the line round every inlaid part


def top_plane(s: float, inset: float = 0.0) -> cq.Plane:
    """Plane tangent to the leg face's centre line at s (the shoulder slopes, so not plane_on)."""
    h = 0.05
    a, b = pt(s - h, t_top(s - h)), pt(s + h, t_top(s + h))
    tx, tz = b[0] - a[0], b[2] - a[2]
    m = math.hypot(tx, tz)
    tx, tz = tx / m, tz / m
    nx, nz = -tz, tx
    o = pt(s, t_top(s))
    return cq.Plane(origin=(o[0] - inset * nx, 0.0, o[2] - inset * nz), xDir=(tx, 0, tz), normal=(nx, 0, nz))


S_CAV0, S_CAV1 = -19.0, 21.4         # the fixed end keeps a 4 mm solid wall that holds the strap's tongue


def soft_rect(hx: float, hy: float, r: float, z0: float, z1: float) -> cq.Workplane:
    """A rounded rectangle in the XY plane whose corners are smoothed by a C2 spline, extruded along Z
    (the plan outline of a steel face; the same as band_premium.soft_rect)."""
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


def end_cut(body: cq.Workplane, sign: int) -> cq.Workplane:
    """One end: a slot between two lugs that are the island's own side walls, lug ends rounded round the bar."""
    # lofted, so the end face is square to the band exactly at +-S_NOSE, where the strap meets it
    body = body.cut(loft(span(sign * S_NOSE, sign * (S_END + 1.0), 1.0), W_SLOT, -5.0, 12.0, 0.2))
    beyond = cq.Workplane(plane_on(sign * S_BAR, D_BAR, 0.0)).center(sign * 10.0, 0.0).box(20.0, 40.0, 30.0)
    keep = (cq.Workplane(cq.Plane(origin=pt(sign * S_BAR, D_BAR, 0), xDir=(1, 0, 0), normal=(0, 1, 0)))
            .circle(R_LUGEND).extrude(16.0, both=True))
    return body.cut(beyond.cut(keep))


def build_island():
    """Returns (parts, solid_for_checks, cavity)."""
    parts: dict[str, cq.Workplane] = {}
    solid = island_solid()
    body = solid
    # the outer 0.8 mm over the middle of the island: the steel faces are cut from it
    skin = solid.cut(island_solid(PLATE, [s for s in STATIONS if abs(s) <= 20.5]))
    upper = loft(span(-S_NOSE - 1.0, S_NOSE - 0.5, 1.5), 50.0, lambda s: t_top(s) / 2, lambda s: t_top(s) + 6.0, 0.2)
    lower = loft(span(-S_NOSE - 1.0, S_NOSE - 0.5, 1.5), 50.0, -6.0, lambda s: t_top(s) / 2, 0.2)
    # both halves by intersection (in the premium variant "skin minus upper" came back inside out)
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
    # two flush charge contacts in the black centre
    for i, y in enumerate(CHG_Y):
        parts[f"chg_{i + 1}"] = solid.intersect(pin(0.0, y, -1.0, 2.2, R_CHG))
        h = pin(0.0, y, -1.0, 2.4, R_CHG + GAP)
        body, back = body.cut(h), back.cut(h)
    parts["back"] = back

    # status light: a short light line at the fixed end, on the centre line. The body round it is the touch
    # zone (capacitive, under the plastic); the device also wakes when the plates are touched.
    lp = top_plane(S_LED, 0.6)
    led = cq.Workplane(lp).sketch().rect(1.1, 7.0).vertices().fillet(0.54).finalize().extrude(LED_DEPTH)
    led_cut = cq.Workplane(top_plane(S_LED, 0.62)).sketch().rect(1.1 + 2 * GAP, 7.0 + 2 * GAP).vertices().fillet(0.6).finalize().extrude(LED_DEPTH)
    parts["led"] = solid.intersect(led)
    body = body.cut(led_cut)

    cav_st = [S_CAV0] + [s for s in STATIONS if S_CAV0 + 0.3 < s < S_CAV1 - 0.3] + [S_CAV1]
    cav = island_solid(WALL, cav_st)
    body = body.cut(cav).cut(make_tongue(0.05)).cut(make_bead(0.08)).cut(make_flex_tail(0.25))
    body = end_cut(body, 1)                               # lugs and bar at the free end only

    # shells: the leg-side lid and the wrist-side tray, welded at mid height; the lugs belong to the tray
    parts["shell_leg"] = body.intersect(upper)
    wrist = body.cut(upper)
    for sy, name in zip((-1, 1), ("lug_a", "lug_b")):
        # v3.2: the zone holds only the lug (from s = 22.6, past the cavity's end and the lid's edge) and its inner face
        # is 0.3 mm inside the empty slot. v3.1's zone began at 19.5 with its face exactly on the slot's wall; with the
        # steel-face pockets the kernel then returned an invalid tray and an empty second lug (the volumes are checked)
        zone = cq.Workplane(plane_on(S_BAR, D_BAR, sy * (W_SLOT / 2 - 0.3 + 5.0))).center(0.05, 0.0).box(9.9, 10.0, 16.0)
        parts[name] = wrist.intersect(zone)
        wrist = wrist.cut(zone)
    parts["shell_wrist"] = wrist
    # the bar runs right through the lugs: its ends show as small steel dots at the corners
    cyl = (cq.Workplane(cq.Plane(origin=pt(S_BAR, D_BAR, 0), xDir=(1, 0, 0), normal=(0, 1, 0)))
           .circle(1.0).extrude(16.0, both=True))
    parts["bar"] = cyl.intersect(solid)
    return parts, solid, cav


# ------------------------------------------------- strap, where it enters
TONGUE_S = [S_ROOT + k for k in (0.0, 0.8, 1.6, 2.4, 3.1, 3.6)]
TONGUE_W = [21.2, 21.0, 20.6, 20.6, 20.6, 20.6]
TONGUE_D0 = [0.72, 0.75, 0.80, 0.90, 1.00, 1.00]
TONGUE_D1 = [2.08, 2.20, 2.40, 2.80, 3.00, 3.00]
S_BEAD = S_ROOT + 2.9
S_ANCHOR = S_ROOT + 2.0


def make_tongue(grow: float = 0.0) -> cq.Workplane:
    wires = [section(s, w + 2 * grow, d0 - grow, d1 + grow, 0.7)
             for s, w, d0, d1 in zip(TONGUE_S, TONGUE_W, TONGUE_D0, TONGUE_D1)]
    return cq.Workplane("XY").add(cq.Solid.makeLoft(wires))


def make_bead(grow: float = 0.0) -> cq.Workplane:
    return box_at(S_BEAD, 2.4, 0.0, 1.9 + 2 * grow, 3.4 + 2 * grow, 21.6 + 2 * grow)


def flex_d(s: float) -> float:
    """Height of the flex: mid-thickness in the strap, rising to the connector inside the island."""
    return 1.32 if s <= S_ROOT + 1.8 else ramp(s, S_ROOT + 1.8, S_ROOT + 5.6, 1.32, 3.75)


FLEX_W = 13.4
FLEX_END = -13.3


def make_flex_tail(grow: float = 0.0) -> cq.Workplane:
    return loft(span(S_ROOT - 0.5, FLEX_END, 0.9), FLEX_W + 2 * grow, lambda s: flex_d(s) - grow,
                lambda s: flex_d(s) + 0.15 + grow, 0.05)


# ------------------------------------------------------------------- strap
RA = {"RA1": -55.0, "RA2": -69.0}       # centres of the two finger pads: 1 mm apart, like the plates on the island
RA_L, RA_W = 13.0, 19.0
RA_POST_Y = {"RA1": 3.4, "RA2": -3.4}   # each pad has its own post, its own trace
S_TIP = 69.5                            # tail tip on the design wrist
D_TAIL = T_STRAP + 0.02                 # underside of the folded-back tail: it lies on the strap
RM = 1.0 + 0.15 + T_STRAP / 2           # centre-line radius round the bar
# closure: hook-and-loop instead of holes and a stud (the owner, 2026-11-15). The tail's underside
# carries the hooks, the strap's outer face on the free side carries the loops, both laminated flush.
HOOK_S = (36.0, S_TIP - 3.0)            # stops 3 mm short of the tip: that lip is what the finger lifts
LOOP_S = (31.5, 85.0)                   # ends before the RA pads, so the tail can never cover them
VELCRO_W, VELCRO_T = 20.0, 0.6


TIP_R = 10.0                            # the tail's last 10 mm narrows along an ellipse: a round tip, made by the loft itself


def strap_width(k: int, n_pts: int) -> float:
    """Width of the strap section at centre-line point k (only the tip narrows)."""
    s = S_TIP - 0.6 * (n_pts - 1 - k)                     # the top layer is spaced 0.6 mm, ending at S_TIP
    x = (s - (S_TIP - TIP_R)) / TIP_R
    if x <= 0:
        return W_STRAP
    return max(W_STRAP * math.sqrt(max(1.0 - x * x, 0.0)), 6.0)


def strap_path() -> list[tuple[float, float, float]]:
    """Centre line of the whole strap: from the island round the wrist, under the bar, round it, back out to the tip."""
    pts = []
    s_end = S_BAR - CIRC                                   # the same place as S_BAR, one turn on
    for s in span(S_ROOT, s_end, 0.6):
        pts.append(pt(s, T_STRAP / 2))
    pb, tb, nb = frame(S_BAR)
    cb = (pb[0] + D_BAR * nb[0], pb[1] + D_BAR * nb[1])
    for k in range(1, 31):
        a = math.pi * k / 30
        pts.append((cb[0] + RM * (-math.cos(a) * nb[0] - math.sin(a) * tb[0]), 0.0,
                    cb[1] + RM * (-math.cos(a) * nb[1] - math.sin(a) * tb[1])))
    top = D_BAR + RM
    for s in span(S_BAR, S_TIP, 0.6)[1:]:
        d = (D_TAIL + T_STRAP / 2) + (top - D_TAIL - T_STRAP / 2) * (1 - blend((s - S_BAR) / 9.0))
        pts.append(pt(s, d))
    return pts


def strap_wire(c, tx: float, tz: float, w: float = W_STRAP) -> cq.Wire:
    """Strap section centred on a point of the centre line, square to it. "Out" is the side that faces
    away from the wrist at the island, so the first section is point for point the island's own."""
    nx, nz = tz, -tx
    vs = [cq.Vector(c[0] + d * nx, y, c[2] + d * nz) for y, d in sec_yd(w, -T_STRAP / 2, T_STRAP / 2, R_STRAP, R_STRAP)]
    return cq.Wire.assembleEdges([cq.Edge.makeSpline(vs, periodic=True, parameters=PARAMS)])


def build_strap():
    parts: dict[str, cq.Workplane] = {}
    # one loft along one centre line: island -> round the wrist -> under the bar -> round it -> back out.
    # (A sweep along the same line gives the same body but took minutes; the loft takes a second.)
    pts = strap_path()
    n = len(pts)
    tip_from = n - 1 - int(round(TIP_R / 0.6)) - 1
    sel = [i for i in range(0, n, 3) if i < tip_from] + list(range(tip_from, n))      # every point in the tip
    wires = [sec_wire(S_ROOT, W_STRAP, 0.0, T_STRAP, R_STRAP, R_STRAP)]     # exactly the island's last section
    for i in sel[1:]:
        a, b = pts[max(i - 1, 0)], pts[min(i + 1, n - 1)]
        tx, tz = b[0] - a[0], b[2] - a[2]
        m = math.hypot(tx, tz)
        wires.append(strap_wire(pts[i], tx / m, tz / m, strap_width(i, n)))
    strap = cq.Workplane("XY").add(cq.Solid.makeLoft(wires))

    for name, s in RA.items():
        slab = loft(span(s - 8.5, s + 8.5, 1.2), 30.0, T_STRAP - 0.6, T_STRAP + 2.0, 0.15)
        face = strap.intersect(slab).intersect(prism(s, 0.0, RA_L - 2 * RIM, RA_W - 2 * RIM, 4.2 - RIM, d=T_STRAP))
        parts[f"el_{name}"] = strap.intersect(slab).intersect(prism(s, 0.0, RA_L, RA_W, 4.2, d=T_STRAP)).cut(face)
        parts[f"elc_{name}"] = face
        strap = strap.cut(slab.intersect(prism(s, 0.0, RA_L + 2 * GAP, RA_W + 2 * GAP, 4.2 + GAP, d=T_STRAP)))
        parts[f"post_{name}"] = pin(s, RA_POST_Y[name], 1.47, T_STRAP - 0.6, 0.9)
    # hook-and-loop, each laminated into its own layer so the surfaces stay flush
    hook = loft(span(HOOK_S[0], HOOK_S[1], 1.0), VELCRO_W, D_TAIL - 0.005, D_TAIL + VELCRO_T, 0.3)
    loop = loft(span(LOOP_S[0], LOOP_S[1], 1.0), VELCRO_W, T_STRAP - VELCRO_T, T_STRAP + 0.005, 0.3)
    strap = strap.cut(hook).cut(loop)
    parts["strap"] = strap
    parts["hook"] = hook
    parts["loop"] = loop
    parts["tongue"] = make_tongue().union(make_bead())
    parts["anchor"] = box_at(S_ANCHOR, 1.75, 0.0, 4.0, 0.7, 18.0)

    # the flex: polyimide carrier with two separate traces and a guard between them
    flex = loft(span(RA["RA2"] - 3.0, S_ROOT, 1.6), FLEX_W, 1.32, 1.47, 0.05).union(make_flex_tail())
    for s in span(RA["RA2"] - 1.0, S_ROOT - 3.5, 4.0):
        if min(abs(s - c) for c in RA.values()) < 3.5:
            continue                                            # not under a post's landing pad
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
    return parts


# ----------------------------------------------------- inside the island
S_BOARD = -5.0            # the board is flat; it touches the curve's direction here
BOARD_L, BOARD_W, PCB_T = 25.0, 26.0, 0.8
D_PCB0 = 2.65             # board underside above the skin at the touch point: the PPG sensor fits under it
S_CELL = 14.0
# 401225 class pouch WITHOUT its own protection board (the protection IC sits on the main board, as in most
# wearables): 12 along the band, 25 across it, 4 thick. With a folded protection board the cell is 26.5 across
# and its top corner touches the curved shell.
CELL = (12.0, 25.0, 4.0)


def on_board(bx: float, by: float, l: float, w: float, h: float, top: bool = True) -> cq.Workplane:
    """A part on the flat board: bx along the board from its centre, by across, h tall."""
    pl = plane_on(S_BOARD, D_PCB0 + (PCB_T if top else 0.0), 0.0)
    off = h / 2 if top else -h / 2
    return cq.Workplane(pl).center(bx, by).box(l, w, h).translate(tuple(off * c for c in frame3n(S_BOARD)))


def build_inside():
    p: dict[str, cq.Workplane] = {}
    p["pcb"] = cq.Workplane(plane_on(S_BOARD, D_PCB0 + PCB_T / 2, 0.0)).box(BOARD_L, BOARD_W, PCB_T)
    # top side (towards the leg face): the tall parts stay near the middle, where the curve leaves most room
    p["radio"] = on_board(0.25, -4.75, 10.5, 15.5, 2.05)        # nRF52840 module, across the board
    p["afe"] = on_board(7.8, 8.0, 8.0, 8.0, 1.0)                # ADS1294
    p["motor"] = (cq.Workplane(plane_on(S_BOARD, D_PCB0 + PCB_T, 0.0)).center(-0.3, 8.5).circle(4.0).extrude(2.0))
    p["conn"] = on_board(-10.6, 0.0, 3.0, 14.6, 0.9)            # the flex from the strap lands here
    p["chip_a"] = on_board(-7.0, 9.5, 2.5, 2.5, 0.63)           # charger
    p["chip_b"] = on_board(-6.7, 4.6, 4.0, 3.0, 1.1)            # quiet regulator for the AFE
    # wrist side: the PPG sensor and the thermometer sit on the window, the rest is low
    p["ppg"] = on_board(5.0, -1.0, 2.9, 4.3, 1.4, top=False)    # optical module: LEDs + photodiode + front end
    p["ppg_led_1"] = on_board(4.35, -2.2, 0.7, 0.9, 1.43, top=False)
    p["ppg_led_2"] = on_board(5.65, -2.2, 0.7, 0.9, 1.43, top=False)
    p["ppg_pd"] = on_board(5.0, 0.15, 1.6, 1.6, 1.43, top=False)
    p["temp"] = on_board(5.0, 2.4, 2.0, 2.0, 0.75, top=False)   # skin thermometer
    p["low_a"] = on_board(-2.0, -8.0, 5.0, 3.2, 1.0, top=False)
    p["low_b"] = on_board(-9.5, -7.0, 3.0, 3.0, 0.8, top=False)

    r_out = R_CENTRE + T0 - PLATE
    r_in = R_CENTRE + PLATE
    d_top = D_PCB0 + PCB_T
    for name, bx, by in (("LL1", -6.35, 0.0), ("RLD", 7.0, 1.5), ("LL2", 11.8, 0.0)):
        p[f"spring_{name}"] = on_board(bx, by, 1.3, 2.4, (T0 - PLATE - d_top) - bx * bx / (2 * r_out) + 0.03)
    for name, bx, by in (("LA1", -7.0, 6.0), ("LA2", 11.5, 6.0)):
        p[f"spring_{name}"] = on_board(bx, by, 1.3, 2.4, (D_PCB0 - PLATE) + bx * bx / (2 * r_in) + 0.03, top=False)
    for i, y in enumerate(CHG_Y):
        bx = 0.0 - S_BOARD
        p[f"spring_chg_{i + 1}"] = on_board(bx, y, 1.6, 1.6, D_PCB0 - 2.2 + bx * bx / (2 * R_CENTRE) + 0.03, top=False)
    # thermal pad from the thermometer to the window boss
    bx = 0.0 - S_BOARD
    p["tpad"] = on_board(bx, 2.4, 1.8, 1.8, D_PCB0 - 0.75 - (WALL + 0.3) + bx * bx / (2 * R_CENTRE), top=False).translate(
        tuple(-0.75 * c for c in frame3n(S_BOARD)))
    # the cell, and how it is connected: two nickel tabs from its end straight onto pads at the main board's end;
    # the protection IC and its two FETs are on the board, next to the tabs
    p["cell"] = cq.Workplane(plane_on(S_CELL, WALL + 0.2 + CELL[2] / 2, 0.0)).box(CELL[0], CELL[1], CELL[2]).edges("|Y").fillet(0.9)
    for tag, by in (("p", -10.9), ("n", -8.5)):
        p[f"cell_tab_{tag}"] = on_board(12.9, by, 2.4, 1.6, 0.12)
    p["chip_prot"] = on_board(10.3, -10.0, 2.0, 2.0, 0.6, top=False)
    return p


# -------------------------------------------------------------------- dock
def build_dock():
    """A stand the band hangs on: its arm takes the wrist's place, so the concave face finds its own seat."""
    d: dict[str, cq.Workplane] = {}
    ell = cq.Workplane("XZ").ellipse(A - 0.12, B - 0.12).extrude(90, both=True).translate((0, 0, -B))

    def slab(lx: float, ly: float, r: float, z0: float, z1: float, y0: float) -> cq.Workplane:
        return (cq.Workplane("XY").sketch().rect(lx, ly).vertices().fillet(r).finalize().extrude(z1 - z0)
                .translate((0, y0 + ly / 2, z0)))

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
    pad_region = slab(21.0, 30.0, 6.0, -3.0, 3.0, -15.0)
    skin = arm.cut(arm.translate((0, 0, -0.7)))
    pad = skin.intersect(pad_region)
    d["dock_pad"] = pad
    d["dock_stand"] = stand.cut(pad)
    for i, y in enumerate(CHG_Y):
        d[f"dock_pin_{i + 1}"] = cq.Workplane("XY").circle(0.75).extrude(2.3).translate((0, y, -2.0 + 0.02))
    d["dock_usb"] = (cq.Workplane("XZ").sketch().rect(9.0, 3.3).vertices().fillet(1.6).finalize().extrude(0.6)
                     .translate((0, 51.4, -78.0)))
    # v3.2: a shallow pocket where the domed lens sits
    pocket = cq.Workplane("XY").circle(WIN_R + 0.8).extrude(2.0).translate((0, 0, -1.4))
    for k in ("dock_stand", "dock_pad"):
        d[k] = d[k].cut(pocket)
    return d


def build_wrist() -> cq.Workplane:
    return cq.Workplane("XZ").ellipse(A - 0.05, B - 0.05).extrude(11, both=True).translate((0, 0, -B))


# ------------------------------------------------------------------ export
MATERIAL = {
    "shell_": "body", "lug_": "body", "led": "led", "window": "glass", "back": "back",
    "el_": "electrode", "elc_": "electrode_satin", "bar": "steel_dark", "post_": "steel",
    "chg_": "contact", "dock_pin_": "gold", "spring_": "gold",
    "strap": "fkm", "tongue": "fkm", "anchor": "anchor", "hook": "hook", "loop": "loop",
    "cell_pcm": "pcb", "cell_tab": "steel",
    "flex": "polyimide", "trace_guard": "copper_dim", "trace_": "copper",
    "pcb": "pcb", "radio": "shield", "afe": "chip", "conn": "connector", "chip_": "chip", "low_": "chip",
    "ppg": "chip", "ppg_led": "led_green", "ppg_pd": "pd", "temp": "chip", "tpad": "tpad",
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


def mesh(wp: cq.Workplane, lin: float, ang: float):
    """Triangles with the SURFACE's own normals (not averaged from the triangles), in mm."""
    from OCP.BRep import BRep_Tool
    from OCP.BRepLib import BRepLib_ToolTriangulatedShape
    from OCP.BRepMesh import BRepMesh_IncrementalMesh
    from OCP.TopAbs import TopAbs_REVERSED
    from OCP.TopLoc import TopLoc_Location

    vals = [v for v in wp.vals() if isinstance(v, cq.Shape)]
    if not vals:
        return None
    shape = vals[0] if len(vals) == 1 else cq.Compound.makeCompound(vals)
    BRepMesh_IncrementalMesh(shape.wrapped, lin, False, ang, True)
    V: list = []
    N: list = []
    F: list = []
    for f in shape.Faces():
        loc = TopLoc_Location()
        tri = BRep_Tool.Triangulation_s(f.wrapped, loc)
        if tri is None:
            continue
        if not tri.HasNormals():
            BRepLib_ToolTriangulatedShape.ComputeNormals_s(f.wrapped, tri)
        trsf = loc.Transformation()
        rev = f.wrapped.Orientation() == TopAbs_REVERSED
        o = len(V)
        pv = []
        nv = []
        for i in range(1, tri.NbNodes() + 1):
            q = tri.Node(i).Transformed(trsf)
            n = tri.Normal(i).Transformed(trsf)
            pv.append((q.X(), q.Y(), q.Z()))
            nv.append((n.X(), n.Y(), n.Z()))
        fv = []
        for i in range(1, tri.NbTriangles() + 1):
            t = tri.Triangle(i)
            a, b, c = t.Value(1) - 1, t.Value(2) - 1, t.Value(3) - 1
            fv.append((a, c, b) if rev else (a, b, c))
        pv_a, nv_a, fv_a = np.array(pv), np.array(nv), np.array(fv, dtype=np.int64)
        # make the normals agree with the winding, face by face
        g = np.cross(pv_a[fv_a[:, 1]] - pv_a[fv_a[:, 0]], pv_a[fv_a[:, 2]] - pv_a[fv_a[:, 0]])
        if (g * nv_a[fv_a].mean(axis=1)).sum() < 0:
            nv_a = -nv_a
        V.extend(pv_a.tolist())
        N.extend(nv_a.tolist())
        F.extend((fv_a + o).tolist())
    if not F:
        return None
    return np.array(V), np.array(N), np.array(F, dtype=np.int64)


SMOOTH = ("el_", "elc_", "shell_", "lug_", "strap", "bar", "led", "window", "dock_stand", "dock_pad", "chg_", "hook", "loop", "back")


def export(parts: dict[str, cq.Workplane], path: Path, cut_y: float | None = None) -> int:
    import trimesh
    scene = trimesh.Scene()
    total = 0
    for name, wp in parts.items():
        if cut_y is not None:
            # keep the half beyond the cut with a bounded box: cutting with a huge box inverted the spline shells
            try:
                wp = wp.intersect(cq.Workplane("XY").box(150, 40, 130).translate((0, cut_y + 20, -15)))
            except Exception:
                continue
        fine = name.startswith(SMOOTH)
        m = mesh(wp, 0.008 if fine else 0.03, 0.09 if fine else 0.25)
        if m is None:
            continue
        v, n, f = m
        tm = trimesh.Trimesh(vertices=v * 0.001, faces=f, vertex_normals=n, process=False)
        tm.visual = trimesh.visual.TextureVisuals(material=trimesh.visual.material.PBRMaterial(name=material_of(name)))
        scene.add_geometry(tm, node_name=name, geom_name=name)
        total += len(f)
    path.parent.mkdir(parents=True, exist_ok=True)
    scene.export(str(path), include_normals=True)
    return total


def vol(wp: cq.Workplane) -> float:
    """Volume with a real integration tolerance: CadQuery's default is off by 10 % or more on these spline bodies."""
    from OCP.BRepGProp import BRepGProp
    from OCP.GProp import GProp_GProps
    try:
        tot = 0.0
        for v in wp.vals():
            if isinstance(v, cq.Shape):
                p = GProp_GProps()
                BRepGProp.VolumeProperties_s(v.wrapped, p, 1e-5)
                tot += p.Mass()
        return tot
    except Exception:
        return 0.0


def common(a: cq.Workplane, b: cq.Workplane) -> float:
    """Volume two bodies share; no overlap at all comes back from the kernel as an error, which is zero."""
    try:
        return vol(a.intersect(b))
    except Exception:
        return 0.0


def area_mm2(wp: cq.Workplane, towards) -> float:
    """Area of the faces of a plate that look roughly along `towards` (its outer skin, edge wrap included)."""
    tot = 0.0
    tv = cq.Vector(*towards)
    for f in wp.faces().vals():
        try:
            if f.normalAt().dot(tv) > 0.2:
                tot += f.Area()
        except Exception:
            pass
    return tot


def assemble():
    import time
    t = time.time()
    island, solid, cav = build_island()
    print(f"  island {time.time() - t:.0f}s", flush=True)
    strap = build_strap()
    print(f"  strap {time.time() - t:.0f}s", flush=True)
    inside = build_inside()
    # each spring reaches its plate through a small window in the shell
    for name, wp in inside.items():
        if name.startswith("spring_") or name in ("tpad",):
            for sh in ("shell_leg", "shell_wrist", "back"):
                island[sh] = island[sh].cut(wp)
    return island, solid, strap, inside


if __name__ == "__main__":
    import time
    t_start = time.time()
    OUT.mkdir(exist_ok=True)
    island, solid, strap, inside = assemble()
    band = {**island, **strap, **inside}
    print(f"built in {time.time() - t_start:.0f}s")

    checks = {}
    # shell by shell (in the premium variant a union of the two shells failed in the kernel's clean-up step)
    def vs_shells(wp):
        return sum(common(wp, island[k]) for k in ("shell_leg", "shell_wrist"))

    hits = []
    for name, wp in inside.items():
        v = vs_shells(wp) + common(wp, island["back"])
        if v > 0.02:
            hits.append([name, round(v, 2)])
    checks["inside_parts_touching_the_shells_mm3"] = hits
    checks["strap_vs_island_mm3"] = round(vs_shells(strap["strap"]), 3)
    checks["strap_vs_lugs_mm3"] = round(sum(common(strap["strap"], island[k]) for k in ("lug_a", "lug_b")), 3)
    checks["strap_vs_bar_mm3"] = round(common(strap["strap"], island["bar"]), 3)
    checks["tongue_vs_shells_mm3"] = round(vs_shells(strap["tongue"]), 3)
    checks["led_vs_tongue_mm3"] = round(common(island["led"], strap["tongue"]) + common(island["led"], strap["flex"]), 3)
    # every steel part, the black centre, the lens and the contacts against the body and each other
    inlays = [k for k in island if k.startswith(("el_", "elc_", "chg_")) or k in ("back", "window", "led")]
    checks["inlays_vs_shells_mm3"] = round(sum(vs_shells(island[k]) for k in inlays), 3)
    checks["inlays_vs_each_other_mm3"] = round(sum(common(island[a], island[b]) for i, a in enumerate(inlays)
                                                   for b in inlays[i + 1:]), 3)
    # the two lugs must come out the same (v3.2's first build lost the second one in a failed boolean)
    checks["lugs_mm3"] = [round(vol(island["lug_a"]), 1), round(vol(island["lug_b"]), 1)]
    checks["solids_valid"] = all(v.val().isValid() for k, v in island.items() if k.startswith(("shell_", "el_", "elc_", "lug_"))
                                 or k in ("back", "window"))
    checks["volumes_positive"] = all(vol(v) > 0 for k, v in island.items() if k.startswith(("shell_", "el_", "elc_", "lug_"))
                                     or k in ("back",))
    bb = solid.val().BoundingBox()
    checks["island_symmetric_across_mm"] = round(bb.ymax + bb.ymin, 4)

    areas = {}
    for name, s in (("LL1", -11.5), ("RLD", 0.0), ("LL2", 11.5)):
        areas[name] = round(sum(area_mm2(island[f"{k}_{name}"], frame3n(s)) for k in ("el", "elc")), 0)
    for name, s in (("LA1", -11.5), ("LA2", 11.5)):
        n = frame3n(s)
        areas[name] = round(sum(area_mm2(island[f"{k}_{name}"], (-n[0], 0, -n[2])) for k in ("el", "elc")), 0)
    for name in ("RA1", "RA2"):
        areas[name] = round(sum(area_mm2(strap[f"{k}_{name}"], frame3n(RA[name])) for k in ("el", "elc")), 0)
    print(json.dumps({"checks": checks, "electrode_area_mm2": areas}), flush=True)

    n1 = export(band, OUT / "band_id.glb")
    print(f"band.glb {time.time() - t_start:.0f}s", flush=True)
    dock = build_dock()
    n3 = export(dock, OUT / "dock.glb")
    export({"wrist": build_wrist()}, OUT / "wrist.glb")
    # the section only needs what is near the island; the long strap is cut to its first and last few cm first
    near = cq.Workplane("XY").box(90, 60, 40).translate((0, 0, -6))
    sect = {k: (v.intersect(near) if k == "strap" else v) for k, v in band.items()}
    n2 = export(sect, OUT / "band_id_section.glb", cut_y=-1.0)
    print(f"section.glb {time.time() - t_start:.0f}s", flush=True)

    p_end, _, _ = frame(19.0)
    info = {
        "version": VERSION,
        "design_wrist_mm": {"circumference": round(CIRC, 1), "breadth": 2 * A, "depth": 2 * B},
        "island_mm": {"length_over_electrodes": round(2 * LENS_S * (R_CENTRE + T0) / R_CENTRE, 1),
                      "length_root_to_lug_ends": round(S_END - 0.6 - S_ROOT, 1), "width": W0, "thickness": T0,
                      "inner_radius_at_centre": round(R_CENTRE, 1), "concavity_depth_at_19mm": round(-p_end[1], 2)},
        "strap_mm": {"width": W_STRAP, "thickness": T_STRAP, "closure": "hook-and-loop",
                     "hook_length": round(HOOK_S[1] - HOOK_S[0], 1), "loop_length": round(LOOP_S[1] - LOOP_S[0], 1),
                     "ra_gap": round(abs(RA["RA1"] - RA["RA2"]) - RA_L, 1)},
        "electrode_area_mm2": areas,
        "window_diameter_mm": 2 * WIN_R,
        "lens_dome_mm": DOME,
        "electrodes": "premium faces: one leg face split LL1 | RLD | LL2, one wrist face split LA1 | black centre | LA2, 316L",
        "checks": checks,
        "triangles": {"band": n1, "section": n2, "dock": n3},
        "seconds": round(time.time() - t_start),
    }
    (OUT / "id.json").write_text(json.dumps(info, indent=2), encoding="utf-8")
    print(json.dumps(info, indent=2))

    if "--step" in sys.argv:          # solid CAD for a designer or a factory: one assembly, every part named
        assy = cq.Assembly(name="band_alpha_id_v3_2")
        for name, wp in {**band, **dock}.items():
            assy.add(wp, name=name)
        assy.save(str(OUT / "band_id.step"))
        print("STEP ->", OUT / "band_id.step")

# v3.2.0 - v3.1's body, lugs, strap and closure with the premium variant's electrodes (one split steel face per side, black ceramic centre, domed lens, flush contacts); v3.1.0 - bar and lugs only at the free end (the fixed end narrows into the strap), all plates one metal (316L: satin face, polished edge); v3: the owner's render language on v2's engineering
