"""Export the v0 solid model as one JSON file for the 3D viewer on the plan page.

Run:   .venv/Scripts/python mechanical/export_web.py
Makes: plan/model/band_alpha.json

Each part is a triangle mesh: positions (Float32) and indices (Uint32), both
base64, with a colour, how far it lifts in the exploded view (mm along Z), and
two flags the page uses for its switches ("lid": hidden when the cover is taken
off, "strap": shown only with the strap).
"""
from __future__ import annotations

import base64
import json
import sys
from pathlib import Path

import cadquery as cq
import numpy as np

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import band_alpha as M  # noqa: E402

OUT = HERE.parent / "plan" / "model" / "band_alpha.json"

LIFT = {"cover": 20, "pad_LL1": 29, "pad_RLD": 29, "pad_LL2": 29, "gasket": 13,
        "tray": -9, "bar": -9, "pad_LA1": -18, "pad_LA2": -18}
INSIDE_LIFT = 4.0
LID = {"cover", "gasket", "pad_LL1", "pad_RLD", "pad_LL2"}
STRAP = {"strap_6", "strap_12", "flex", "pad_RA1", "pad_RA2"}
METAL = ("pad_", "bar", "motor", "cell", "part_radio", "part_spring")


def b64(a: np.ndarray) -> str:
    return base64.b64encode(a.tobytes()).decode("ascii")


def tessellate(wp: cq.Workplane, tol: float, ang: float) -> tuple[np.ndarray, np.ndarray]:
    vals = wp.vals()
    shape = vals[0] if len(vals) == 1 else cq.Compound.makeCompound(vals)
    verts, tris = shape.tessellate(tol, ang)
    pts = np.array([(v.x, v.y, v.z) for v in verts], dtype="<f4")
    idx = np.array(tris, dtype="<u4")
    return pts, idx


if __name__ == "__main__":
    parts = M.build()
    out = []
    total = 0
    for name, wp in parts.items():
        curved = name.startswith("strap") or name in ("flex", "tray", "cover", "gasket", "motor", "bar", "cell")
        pts, idx = tessellate(wp, 0.04 if curved else 0.1, 0.25 if curved else 0.5)
        total += len(idx)
        lift = LIFT.get(name, 0 if name in STRAP else INSIDE_LIFT)
        out.append({
            "name": name,
            "color": [round(c, 3) for c in M.color_of(name)],
            "metal": name.startswith(METAL),
            "lift": lift,
            "lid": name in LID,
            "strap": name in STRAP,
            "ghost": name == "strap_12",
            "p": b64(pts),
            "i": b64(idx),
        })
    OUT.parent.mkdir(parents=True, exist_ok=True)
    data = {"version": M.VERSION, "size_mm": [M.L, M.W, round(M.TB + 2 * M.PROUD, 2)], "parts": out}
    OUT.write_text(json.dumps(data, separators=(",", ":")), encoding="utf-8")
    print(f"{len(out)} parts, {total} triangles, {OUT.stat().st_size / 1024:.0f} kB -> {OUT}")

# v0.1.0 - model as base64 triangle meshes for the page's 3D viewer
