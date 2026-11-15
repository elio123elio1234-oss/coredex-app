"""A light copy of the premium model for the studio pictures: out_p/band_p_lite.glb.

The full band_p.glb carries 743k triangles, 528k of them in the two long straps and their hook-and-loop
(meshed to 0.008 mm). On a machine short of memory, headless Chrome could not load it within ten minutes.
This keeps the island parts as they are, re-meshes the straps to 0.025 mm (still far below a pixel in every
shot), and leaves out what no picture shows (the board's parts, the flex, the tongue). The sensors behind the
window stay, because the wrist-face shot shows them.

Run:   .venv/Scripts/python mechanical/lite_p.py      (after band_premium.py)
"""
from __future__ import annotations

import sys
from pathlib import Path

import trimesh

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import band_premium as P  # noqa: E402

DROP = ("pcb", "radio", "afe", "conn", "chip_", "low_", "motor", "cell", "spring_", "flex", "trace_", "post_",
        "tongue", "anchor", "latch")
REMESH = ("strap", "hook", "loop")
REMESH_ISLAND = ("end_a", "end_b")         # the rounded ends: 190k triangles each at the finest setting


def add(scene: trimesh.Scene, name: str, wp, lin: float, ang: float) -> int:
    m = P.mesh(wp, lin, ang)
    if m is None:
        return 0
    v, n, f = m
    tm = trimesh.Trimesh(vertices=v * 0.001, faces=f, vertex_normals=n, process=False)
    tm.visual = trimesh.visual.TextureVisuals(material=trimesh.visual.material.PBRMaterial(name=P.material_of(name)))
    scene.add_geometry(tm, node_name=name, geom_name=name)
    return len(f)


if __name__ == "__main__":
    full = trimesh.load(str(P.OUT / "band_p.glb"))
    lite = trimesh.Scene()
    kept = 0
    for name, g in full.geometry.items():
        if name.startswith(DROP) or name in REMESH or name in REMESH_ISLAND:
            continue
        lite.add_geometry(g, node_name=name, geom_name=name)
        kept += len(g.faces)
    straps = P.build_strap()
    for name in REMESH:
        kept += add(lite, name, straps[name], 0.025, 0.2)
    island, _ = P.build_island()
    for name in REMESH_ISLAND:
        kept += add(lite, name, island[name], 0.012, 0.15)
    lite.export(str(P.OUT / "band_p_lite.glb"), include_normals=True)
    print(f"{kept} triangles -> {P.OUT / 'band_p_lite.glb'}")

# v1.2.0 - one strap (P1.1); light copy of the premium model for the studio pictures: straps re-meshed to 0.025 mm, the rounded ends to 0.012 mm, hidden inner parts left out
