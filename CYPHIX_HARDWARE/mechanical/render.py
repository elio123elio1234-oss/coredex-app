"""Render the Band alpha v0 solid model to pictures.

Run:   .venv/Scripts/python mechanical/render.py
Makes: mechanical/out/render_<view>.png  (full size)
       plan/img/cad_<view>.webp          (for the plan page)

Views: leg     - assembled, the face that rests on the leg (LL1, RLD, LL2)
       wrist   - assembled, flipped over: the face on the wrist (LA, LA, window, charge contacts)
       inside  - cover and leg pads removed: board, radio, AFE, cell, motor
       exploded- every layer lifted apart
       section - cut along the strap through the middle
       worn    - on a wrist, strap half see-through to show the flex to RA1 / RA2
"""
from __future__ import annotations

import sys
from pathlib import Path

import cadquery as cq
import numpy as np
import pyvista as pv
from PIL import Image

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import band_alpha as M  # noqa: E402

OUT = HERE / "out"
PAGE = HERE.parent / "plan" / "img"
SIZE = (2000, 1400)
EDGE = "#101826"


def mesh_of(wp: cq.Workplane, tol: float = 0.02, ang: float = 0.15) -> pv.PolyData:
    vals = wp.vals()
    shape = vals[0] if len(vals) == 1 else cq.Compound.makeCompound(vals)
    verts, tris = shape.tessellate(tol, ang)
    if not tris:
        return pv.PolyData()                       # nothing left of this part on the kept side of a cut
    pts = np.array([(v.x, v.y, v.z) for v in verts], dtype=float)
    faces = np.hstack([np.full((len(tris), 1), 3, dtype=np.int64), np.array(tris, dtype=np.int64)]).ravel()
    return pv.PolyData(pts, faces)


def look(name: str) -> dict:
    r, g, b = M.color_of(name)
    metal = name.startswith("pad_") or name in ("bar", "motor", "part_radio", "cell") or name.startswith("part_spring")
    return dict(color=(r, g, b), specular=0.9 if metal else 0.25, specular_power=45 if metal else 12,
                ambient=0.32, diffuse=0.75)


def half(wp: cq.Workplane) -> cq.Workplane:
    """Keep the y >= 0 half, so the cut face looks toward the camera at -Y."""
    return wp.cut(M.block(-300, 300, -300, 0.0, -300, 300))


def scene(parts: dict[str, cq.Workplane], out: str, camera, *, hide: tuple[str, ...] = (),
          lift: dict[str, float] | None = None, cut: bool = False, ghost: dict[str, float] | None = None,
          extra=None, zoom: float = 1.0) -> Path:
    pl = pv.Plotter(off_screen=True, window_size=SIZE)
    pl.set_background("white")
    try:
        pl.enable_anti_aliasing("ssaa")
    except Exception:
        pass
    for name, wp in parts.items():
        if any(name == h or (h.endswith("*") and name.startswith(h[:-1])) for h in hide):
            continue
        try:
            m = mesh_of(half(wp) if cut else wp)
        except Exception as exc:                      # an empty half is fine, anything else is worth seeing
            print(f"  skip {name}: {exc}")
            continue
        if m.n_points == 0:
            continue
        dz = 0.0
        if lift:
            for key, val in lift.items():
                if name == key or (key.endswith("*") and name.startswith(key[:-1])):
                    dz = val
        if dz:
            m.translate((0, 0, dz), inplace=True)
        alpha = 1.0
        if ghost:
            for key, val in ghost.items():
                if name == key or (key.endswith("*") and name.startswith(key[:-1])):
                    alpha = val
        pl.add_mesh(m, smooth_shading=True, split_sharp_edges=True, feature_angle=28, opacity=alpha, **look(name))
        if alpha > 0.6:
            e = m.extract_feature_edges(feature_angle=32, boundary_edges=True, non_manifold_edges=False,
                                        manifold_edges=False)
            if e.n_points:
                pl.add_mesh(e, color=EDGE, line_width=1.6, lighting=False)
    if extra:
        extra(pl)
    pl.camera_position = camera
    pl.camera.zoom(zoom)
    png = OUT / f"render_{out}.png"
    pl.screenshot(str(png))
    pl.close()
    PAGE.mkdir(parents=True, exist_ok=True)
    im = Image.open(png).convert("RGB")
    im = trim(im)
    im.thumbnail((1500, 1500))
    im.save(PAGE / f"cad_{out}.webp", "WEBP", quality=86, method=6)
    print("rendered", out, im.size)
    return png


def trim(im: Image.Image, pad: int = 60) -> Image.Image:
    """Crop the white margin, keep a little air around the object."""
    a = np.asarray(im)
    mask = (a < 250).any(axis=2)
    if not mask.any():
        return im
    ys, xs = np.where(mask)
    x0, x1 = max(xs.min() - pad, 0), min(xs.max() + pad, a.shape[1])
    y0, y1 = max(ys.min() - pad, 0), min(ys.max() + pad, a.shape[0])
    return im.crop((x0, y0, x1, y1))


def wrist(pl: pv.Plotter) -> None:
    """A plain wrist section for scale: an ellipse extruded along the forearm."""
    wp = cq.Workplane("XZ").ellipse(M.WRIST_AX, M.WRIST_AZ).extrude(30, both=True).translate((0, 0, M.WRIST_CZ))
    pl.add_mesh(mesh_of(wp, 0.05, 0.1), color=(0.94, 0.82, 0.73), smooth_shading=True, split_sharp_edges=True,
                feature_angle=40, ambient=0.5, diffuse=0.55, specular=0.03)


if __name__ == "__main__":
    OUT.mkdir(exist_ok=True)
    parts = M.build()
    c = (0, 0, M.TB / 2)
    straps = ("strap_6", "strap_12", "flex", "pad_RA1", "pad_RA2")
    which = set(sys.argv[1:]) or {"leg", "wrist", "inside", "exploded", "section", "worn"}

    if "leg" in which:
        scene(parts, "leg", [(62, -78, 70), c, (0, 0, 1)], hide=straps)
    if "wrist" in which:
        scene(parts, "wrist", [(62, -78, -66), c, (0, 0, -1)], hide=straps)
    if "inside" in which:
        scene(parts, "inside", [(40, -62, 82), c, (0, 0, 1)],
              hide=straps + ("cover", "gasket", "pad_LL1", "pad_LL2", "pad_RLD"))
    if "exploded" in which:
        scene(parts, "exploded", [(105, -135, 62), (0, 0, 4), (0, 0, 1)], hide=straps,
              lift={"cover": 20, "pad_LL1": 29, "pad_RLD": 29, "pad_LL2": 29, "gasket": 13,
                    "board": 4, "part_*": 4, "cell": 4, "motor": 4,
                    "tray": -9, "bar": -9, "pad_LA1": -18, "pad_LA2": -18})
    if "section" in which:
        scene(parts, "section", [(4, -120, 22), c, (0, 0, 1)], hide=straps, cut=True, zoom=1.15)
    if "worn" in which:
        scene(parts, "worn", [(-95, -170, -95), (0, 0, M.WRIST_CZ + 4), (0, 0, -1)],
              ghost={"strap_12": 0.4}, extra=wrist)

# v0.1.0 - six views of the v0 solid model, cropped and exported for the plan page
