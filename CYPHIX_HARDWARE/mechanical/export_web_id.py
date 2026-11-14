"""Export the design model (band_id.py) as one JSON file for the 3D viewer on the plan page.

Run:   .venv/Scripts/python mechanical/export_web_id.py
Makes: plan/model/band_id.json

A lighter mesh than the studio renders use. Each part carries its colour, how far
it lifts in the exploded view (mm, along the island's own axis), and the flags the
page's switches use: "lid" = leg-side shell and its plates, "soft" = the strap
(made see-through to show the flex inside), "inner" = what is inside the island.
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
import band_id as M  # noqa: E402

OUT = HERE.parent / "plan" / "model" / "band_id.json"

COLOR = {
    "body": (0.106, 0.153, 0.263), "body_gloss": (0.13, 0.19, 0.32), "electrode": (0.86, 0.88, 0.91),
    "steel": (0.82, 0.84, 0.87), "gold": (0.84, 0.68, 0.31), "fkm": (0.15, 0.17, 0.21),
    "polyimide": (0.79, 0.54, 0.17), "copper": (0.82, 0.48, 0.26), "copper_dim": (0.66, 0.42, 0.27),
    "pcb": (0.06, 0.34, 0.24), "chip": (0.09, 0.09, 0.11), "connector": (0.91, 0.90, 0.86),
    "shield": (0.79, 0.80, 0.82), "cell": (0.75, 0.76, 0.79), "anchor": (0.87, 0.89, 0.90), "led": (1.0, 1.0, 1.0),
}
METAL = {"electrode", "steel", "gold", "copper", "copper_dim", "shield", "cell"}
LID = ("shell_leg", "el_LL1", "el_RLD", "el_LL2", "led")
WRIST_SIDE = ("shell_wrist", "el_LA1", "el_LA2", "chg_", "arm_", "bar", "button")
SOFT = ("strap", "tail", "tongue")
SMOOTH = ("shell_", "strap", "tail", "el_", "tongue", "arm_", "bar", "stud", "button", "flex", "trace_", "cell", "motor")


def b64(a: np.ndarray) -> str:
    return base64.b64encode(a.tobytes()).decode("ascii")


if __name__ == "__main__":
    island, _, _ = M.build_island()
    parts = {**island, **M.build_strap(), **M.build_inside()}
    out, total = [], 0
    for name, wp in parts.items():
        vals = [v for v in wp.vals() if isinstance(v, cq.Shape)]
        if not vals:
            continue
        shape = vals[0] if len(vals) == 1 else cq.Compound.makeCompound(vals)
        smooth = name.startswith(SMOOTH)
        verts, tris = shape.tessellate(0.06 if smooth else 0.15, 0.3 if smooth else 0.6)
        if not tris:
            continue
        mat = M.material_of(name)
        inner = name.startswith(("pcb", "radio", "afe", "conn", "chip_", "low_", "motor", "cell", "spring_"))
        lift = 16.0 if name.startswith(LID) else (-11.0 if name.startswith(WRIST_SIDE) else 0.0)
        out.append({
            "name": name,
            "color": [round(c, 3) for c in COLOR.get(mat, COLOR["body"])],
            "metal": mat in METAL,
            "lift": lift,
            "lid": name.startswith(LID),
            "soft": name.startswith(SOFT),
            "inner": bool(inner),
            "p": b64(np.array([(v.x, v.y, v.z) for v in verts], dtype="<f4")),
            "i": b64(np.array(tris, dtype="<u4")),
        })
        total += len(tris)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({"version": M.VERSION, "parts": out}, separators=(",", ":")), encoding="utf-8")
    print(f"{len(out)} parts, {total} triangles, {OUT.stat().st_size / 1024:.0f} kB -> {OUT}")

# v1.0.0 - design model as light triangle meshes for the page's 3D viewer
