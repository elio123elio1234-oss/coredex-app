"""Render design concept v3.2 (band_id.py v3.2.0) with the landing page's studio, in headless Chrome.

v3.2 is v3.1 with the premium variant's electrodes, so the shots are v3.1's own (same cameras, same light,
same graphite body and slate strap) and only the steel takes the premium variant's finish: a lighter satin
face and a brighter polished line. That way a v3.1 picture and a v3.2 picture differ only where the design does.

Run:   .venv/Scripts/python mechanical/render_v32.py [shot ...]
Needs: mechanical/out_id/band_id.glb (run band_id.py first), Node, Chrome, and the LANDING PAGE project's
       node_modules (three + esbuild) for the bundle.
Makes: mechanical/out_id/band_id_lite.glb (the same model, lighter straps, no hidden inner parts),
       mechanical/out_id/v32_<shot>.png and plan/img/v32_<shot>.webp
"""
from __future__ import annotations

import http.server
import json
import subprocess
import sys
import threading
import time
from pathlib import Path

import trimesh
from PIL import Image

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import band_id as M  # noqa: E402
import render_id as R  # noqa: E402  (bundle, trim, v3.1's cameras and light)

STUDIO = HERE / "studio"
OUT = HERE / "out_id"
PAGE = HERE.parent / "plan" / "img"
PORT = 8797
FULL = OUT / "band_id.glb"
LITE = OUT / "band_id_lite.glb"
BAND = ["../out_id/band_id_lite.glb"]

# the premium variant's steel (render_p.STEEL): lighter satin face, brighter polished line
STEEL = {"electrode_satin": {"color": 0xc6cbd2, "roughness": 0.3}, "electrode": {"color": 0xf8fafc, "roughness": 0.06}}
DROP = ("pcb", "radio", "afe", "conn", "chip_", "low_", "motor", "cell", "spring_", "flex", "trace_", "post_",
        "tongue", "anchor")
REMESH = ("strap", "hook", "loop")
HIDE = R.INSIDE + ["anchor"]


def make_lite() -> None:
    """Keep the island as meshed; re-mesh the long strap to 0.025 mm (far below a pixel in every shot)."""
    full = trimesh.load(str(FULL))
    lite = trimesh.Scene()
    kept = 0
    for name, g in full.geometry.items():
        if name.startswith(DROP) or name in REMESH:
            continue
        lite.add_geometry(g, node_name=name, geom_name=name)
        kept += len(g.faces)
    straps = M.build_strap()
    for name in REMESH:
        v, n, f = M.mesh(straps[name], 0.025, 0.2)
        tm = trimesh.Trimesh(vertices=v * 0.001, faces=f, vertex_normals=n, process=False)
        tm.visual = trimesh.visual.TextureVisuals(material=trimesh.visual.material.PBRMaterial(name=M.material_of(name)))
        lite.add_geometry(tm, node_name=name, geom_name=name)
        kept += len(f)
    lite.export(str(LITE), include_normals=True)
    print(f"lite: {kept} triangles -> {LITE}", flush=True)


def like_v31(name: str, **extra) -> dict:
    """v3.1's shot with the lite file and the premium steel."""
    s = json.loads(json.dumps(R.SHOTS[name]))
    s["files"] = BAND + [f for f in s["files"] if "band_id" not in f]
    s["palette"] = STEEL
    s.update(extra)
    return s


SHOTS = {
    "hero": like_v31("hero", hide=HIDE),
    "top": like_v31("top", hide=HIDE),
    "wristface": like_v31("wristface"),
    # closer on the leg face: the one steel face, the two hairlines, the polished line round it
    "leg": dict(files=BAND, orient="island", pos=[-64, 92, 70], target=[0, 0, 4.0], fov=19, ground=None,
                hide=HIDE, strips=R.LEG_FACE, palette=STEEL),
}


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=str(HERE), **k)

    def do_POST(self):
        name = self.path.rsplit("/", 1)[-1]
        data = self.rfile.read(int(self.headers.get("Content-Length", "0")))
        (OUT / f"v32_{name}.png").write_bytes(data)
        self.send_response(200)
        self.end_headers()

    def log_message(self, *a):
        pass


def shoot(name: str, profile: Path) -> bool:
    png = OUT / f"v32_{name}.png"
    if png.exists():
        png.unlink()
    chrome = subprocess.Popen([R.CHROME, "--headless=new", "--no-first-run", f"--user-data-dir={profile}",
                               "--use-angle=d3d11", "--ignore-gpu-blocklist", "--enable-gpu",
                               "--window-size=2400,1600", f"http://127.0.0.1:{PORT}/studio/render.html#v32:{name}"],
                              stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    t0 = time.time()
    while not png.exists() and time.time() - t0 < 560:
        time.sleep(0.5)
    time.sleep(0.6)
    # the whole tree: killing only the launcher left headless Chrome holding the profile
    subprocess.run(["taskkill", "/F", "/T", "/PID", str(chrome.pid)], capture_output=True)
    return png.exists()


if __name__ == "__main__":
    which = sys.argv[1:] or list(SHOTS)
    if not LITE.exists() or LITE.stat().st_mtime < FULL.stat().st_mtime:
        make_lite()
    (STUDIO / "shots_v32.json").write_text(json.dumps(SHOTS, indent=1), encoding="utf-8")
    R.build_bundle()
    server = http.server.ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    profile = OUT / "_chrome"
    PAGE.mkdir(parents=True, exist_ok=True)
    try:
        for name in which:
            t0 = time.time()
            if not shoot(name, profile):
                print("FAILED", name, flush=True)
                continue
            im = R.trim(Image.open(OUT / f"v32_{name}.png"))
            small = im.convert("RGB")
            small.thumbnail((1600, 1600))
            small.save(PAGE / f"v32_{name}.webp", "WEBP", quality=88, method=6)
            print("rendered", name, im.size, f"{time.time() - t0:.0f}s", flush=True)
    finally:
        server.shutdown()

# v1.0.0 - concept v3.2 shots: v3.1's hero, top and wrist face with the premium steel finish, plus a closer leg-face view; lite glb (straps re-meshed, hidden parts dropped)
