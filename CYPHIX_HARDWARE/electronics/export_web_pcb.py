"""KiCad 3D export (GLB) -> the plan page's 3D viewer format (the same JSON the bracelet model uses).

Run: .venv/Scripts/python electronics/export_web_pcb.py <in.glb> <out.json> [explode_mm]
     (make the GLB first: kicad-cli pcb export glb --include-tracks --include-pads --no-dnp -o in.glb board.kicad_pcb)

Each mesh becomes one part with its colour and its surface normals. Parts above the board (components on the leg
face) lift up in the viewer's "explode" view, parts below lift down, so the two faces separate. glTF is Y-up in
metres; the viewer's models are Z-up in millimetres.
"""
from __future__ import annotations

import base64
import json
import sys

import numpy as np
import trimesh


def b64(a):
    return base64.b64encode(np.ascontiguousarray(a).tobytes()).decode("ascii")


def colour_of(geom):
    try:
        m = geom.visual.material
        c = getattr(m, "baseColorFactor", None)
        if c is None and hasattr(m, "main_color"):
            c = m.main_color
        c = np.array(c, dtype=float).flatten()[:3]
        if c.max() > 1.0:
            c = c / 255.0
        return [round(float(v), 3) for v in c], float(getattr(m, "metallicFactor", 0.0) or 0.0)
    except Exception:
        return [0.5, 0.5, 0.5], 0.0


def main(src, dst, explode=6.0):
    scene = trimesh.load(src, force="scene")
    # merge every mesh into one part per (colour, face): thousands of tracks and pads as separate meshes are too
    # heavy for a phone; the viewer only needs colour, shape and which face a piece is on
    groups, tri = {}, 0
    for node in scene.graph.nodes_geometry:
        T, gname = scene.graph[node]
        g = scene.geometry[gname]
        if not isinstance(g, trimesh.Trimesh) or len(g.faces) == 0:
            continue
        g = g.copy()
        g.apply_transform(T)
        v = g.vertices * 1000.0                                  # m -> mm
        v = np.column_stack([v[:, 0], -v[:, 2], v[:, 1]])         # Y-up -> Z-up
        n = g.vertex_normals
        n = np.column_stack([n[:, 0], -n[:, 2], n[:, 1]])
        col, metal = colour_of(g)
        zc = float(v[:, 2].mean())
        side = 1 if zc > 0.45 else (-1 if zc < -0.45 else 0)
        key = (tuple(round(c, 2) for c in col), metal > 0.5, side)
        groups.setdefault(key, []).append((v, n, g.faces))
        tri += len(g.faces)
    parts = []
    for (col, metal, side), items in groups.items():
        vs, ns, fs, off = [], [], [], 0
        for v, n, f in items:
            vs.append(v); ns.append(n); fs.append(f + off); off += len(v)
        V = np.concatenate(vs); N = np.concatenate(ns); F = np.concatenate(fs)
        parts.append({
            "name": f"{'top' if side > 0 else 'bottom' if side < 0 else 'board'}_{len(parts)}", "color": list(col),
            "metal": bool(metal or (min(col) > 0.6 and max(col) - min(col) < 0.1)), "glass": False,
            "lift": explode * side, "lid": False, "soft": False, "inner": False,
            "p": b64(V.astype("<f4")), "n": b64(np.clip(np.round(N * 127.0), -127, 127).astype("<i1")),
            "i": b64(F.astype("<u4")),
        })
    allv = np.concatenate([np.frombuffer(base64.b64decode(p["p"]), dtype="<f4").reshape(-1, 3) for p in parts])
    lo, hi = allv.min(axis=0), allv.max(axis=0)
    centre = ((lo + hi) / 2).round(2).tolist()
    radius = float(np.linalg.norm(hi - lo) / 2)
    out = {"version": "pcb", "view": {"centre": centre, "dist": round(radius * 4.2, 1)}, "parts": parts}
    with open(dst, "w", encoding="utf-8") as f:
        json.dump(out, f, separators=(",", ":"))
    print(f"{len(parts)} parts (merged), {tri} triangles, size {np.round(hi - lo, 1).tolist()} mm -> {dst}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2], float(sys.argv[3]) if len(sys.argv) > 3 else 6.0)

# v0.2.0 - meshes merged per colour and face (14,923 meshes were too heavy for a phone); v0.1.0 - KiCad GLB to the plan page viewer's JSON (colours, normals, faces lift apart in the explode view)
