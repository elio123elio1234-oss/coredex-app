"""Export the premium side variant (band_premium.py) as one JSON file for the plan page's 3D viewer.

Run:   .venv/Scripts/python mechanical/export_web_p.py
Makes: plan/model/band_p.json (same format as band_id.json, so the same viewer shows either model)
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import band_premium as P  # noqa: E402
import export_web_id as W  # noqa: E402  (base64 helper, inner-part flags)

OUT = HERE.parent / "plan" / "model" / "band_p.json"

COLOR = dict(W.COLOR)
COLOR.update({
    "body": (0.102, 0.145, 0.251), "fkm": (0.114, 0.157, 0.255), "loop": (0.141, 0.188, 0.298), "hook": (0.082, 0.11, 0.18),
    "electrode": (0.93, 0.94, 0.96), "electrode_satin": (0.74, 0.76, 0.8), "back": (0.045, 0.05, 0.06),
    "ring": (0.92, 0.93, 0.95), "contact": (0.88, 0.89, 0.91),
    "led": (0.07, 0.1, 0.18),            # the status light when off: the body's colour, as in the renders
})
METAL = W.METAL | {"ring", "contact"}
LID = W.LID
WRIST_SIDE = ("shell_wrist", "el_LA", "elc_LA", "chg_", "window", "back")
SOFT = ("strap", "tongue", "hook", "loop")
INNER = W.INNER + ("latch",)

if __name__ == "__main__":
    island, _, strap, inside = P.assemble()
    parts = {**island, **strap, **inside}
    out, total = [], 0
    for name, wp in parts.items():
        smooth = name.startswith(P.SMOOTH)
        m = P.mesh(wp, 0.03 if smooth else 0.08, 0.22 if smooth else 0.5)
        if m is None:
            continue
        v, n, f = m
        mat = P.material_of(name)
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
            "p": W.b64(v.astype("<f4")),
            "n": W.b64(np.clip(np.round(n * 127.0), -127, 127).astype("<i1")),
            "i": W.b64(f.astype("<u4")),
        })
        total += len(f)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({"version": "P" + P.VERSION, "parts": out}, separators=(",", ":")), encoding="utf-8")
    print(f"{len(out)} parts, {total} triangles, {OUT.stat().st_size / 1024:.0f} kB -> {OUT}")

# v1.0.0 - the premium side variant for the plan page's viewer, navy colourway, same format and flags as band_id.json
