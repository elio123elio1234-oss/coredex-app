"""Export the design model (band_id.py) as one JSON file for the 3D viewer on the plan page.

Run:   .venv/Scripts/python mechanical/export_web_id.py
Makes: plan/model/band_id.json

A lighter mesh than the studio renders use. Each part carries its colour, how far
it lifts in the exploded view (mm, along the island's own axis), the flags the
page's switches use ("lid" = leg-side shell and its plates, "soft" = the strap,
made see-through to show the flex inside, "inner" = what is inside the island),
and since v2 the SURFACE's own normals ("n", int8): v1 let the page average
normals from a coarse mesh, which is what made the island look wrinkled.
"""
from __future__ import annotations

import base64
import json
import sys
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import band_id as M  # noqa: E402

OUT = HERE.parent / "plan" / "model" / "band_id.json"

COLOR = {
    "body": (0.106, 0.153, 0.263), "electrode": (0.86, 0.88, 0.91),
    "steel": (0.82, 0.84, 0.87), "gold": (0.84, 0.68, 0.31), "fkm": (0.115, 0.157, 0.262),
    "polyimide": (0.79, 0.54, 0.17), "copper": (0.82, 0.48, 0.26), "copper_dim": (0.66, 0.42, 0.27),
    "pcb": (0.06, 0.34, 0.24), "chip": (0.09, 0.09, 0.11), "connector": (0.91, 0.90, 0.86),
    "shield": (0.79, 0.80, 0.82), "cell": (0.75, 0.76, 0.79), "anchor": (0.87, 0.89, 0.90),
    "led": (0.80, 0.90, 1.0), "glass": (0.04, 0.06, 0.09), "led_green": (0.13, 0.77, 0.37),
    "pd": (0.14, 0.11, 0.23), "tpad": (0.55, 0.59, 0.65),
    "loop": (0.15, 0.19, 0.31), "hook": (0.09, 0.11, 0.17),
}
METAL = {"electrode", "steel", "gold", "copper", "copper_dim", "shield", "cell"}
LID = ("shell_leg", "el_LL1", "el_RLD", "el_LL2", "ring")
WRIST_SIDE = ("shell_wrist", "el_LA1", "el_LA2", "chg_", "lug_", "bar", "window")
SOFT = ("strap", "tongue", "hook", "loop")
INNER = ("pcb", "radio", "afe", "conn", "chip_", "low_", "motor", "cell", "spring_", "ppg", "temp", "tpad")


def b64(a: np.ndarray) -> str:
    return base64.b64encode(a.tobytes()).decode("ascii")


if __name__ == "__main__":
    island, _, strap, inside = M.assemble()
    parts = {**island, **strap, **inside}
    out, total = [], 0
    for name, wp in parts.items():
        smooth = name.startswith(M.SMOOTH)
        m = M.mesh(wp, 0.03 if smooth else 0.08, 0.22 if smooth else 0.5)
        if m is None:
            continue
        v, n, f = m
        mat = M.material_of(name)
        lift = 16.0 if name.startswith(LID) else (-11.0 if name.startswith(WRIST_SIDE) else 0.0)
        out.append({
            "name": name,
            "color": [round(c, 3) for c in COLOR.get(mat, COLOR["body"])],
            "metal": mat in METAL,
            "glass": mat == "glass",
            "lift": lift,
            "lid": name.startswith(LID),
            "soft": name.startswith(SOFT),
            "inner": name.startswith(INNER),
            "p": b64(v.astype("<f4")),
            "n": b64(np.clip(np.round(n * 127.0), -127, 127).astype("<i1")),
            "i": b64(f.astype("<u4")),
        })
        total += len(f)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({"version": M.VERSION, "parts": out}, separators=(",", ":")), encoding="utf-8")
    print(f"{len(out)} parts, {total} triangles, {OUT.stat().st_size / 1024:.0f} kB -> {OUT}")

# v2.0.0 - surface normals per vertex (int8), glass flag, v2 part names (lugs, window, ring, PPG, thermometer, hook-and-loop, battery tabs)
