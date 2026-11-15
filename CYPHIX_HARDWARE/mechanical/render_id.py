"""Render the design model (band_id.py) with the landing page's studio, in headless Chrome.

Run:   .venv/Scripts/python mechanical/render_id.py [shot ...]
Needs: mechanical/out_id/*.glb (run band_id.py first), Node, Chrome, and the
       LANDING PAGE project's node_modules (three + esbuild) for the bundle.
Makes: mechanical/out_id/id_<shot>.png and plan/img/id_<shot>.webp

Since band_id.py 3.2.0 the model is concept v3.2, and render_v32.py makes its pictures (it reuses this file's
cameras and light). The plan page's id_*.webp are the v3.1 pictures: running this file again overwrites them
with v3.2 renders, so do that only on purpose (the v3.1 pictures can be remade from git tag/commit 076024c).
"""
from __future__ import annotations

import http.server
import json
import os
import subprocess
import sys
import threading
import time
from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import band_id as M  # noqa: E402

STUDIO = HERE / "studio"
OUT = HERE / "out_id"
PAGE = HERE.parent / "plan" / "img"
LANDING = HERE.parent.parent / "LANDING PAGE"
CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
PORT = 8793
BAND = ["../out_id/band_id.glb"]


def at(s: float, d: float = 0.0, y: float = 0.0) -> list[float]:
    return [round(v, 2) for v in M.pt(s, d, y)]


def off(p: list[float], dx: float, dy: float, dz: float) -> list[float]:
    return [p[0] + dx, p[1] + dy, p[2] + dz]


INSIDE = ["pcb", "radio", "afe", "conn", "chip_", "low_", "motor", "cell", "spring_", "ppg", "temp", "tpad"]
SENSORS = ["ppg", "temp", "tpad"]          # left visible behind the window where the window is in view

# One broad softbox per shot, placed where the polished plates mirror it towards the camera
# (studio space: up is +Y, the set is 10 units wide). Broad on purpose: a narrow light
# shows every facet of a polished curved plate, a broad one gives a clean gradient.
LEG_FACE = [dict(w=8.0, h=6.0, intensity=1.25, pos=[3.65, 3.2, 6.3]), dict(w=2.0, h=6.0, intensity=1.5, pos=[-6.5, 2.5, -2.0])]
WRIST_FACE = [dict(w=8.0, h=6.0, intensity=1.2, pos=[-1.7, 5.9, -5.2]), dict(w=2.0, h=6.0, intensity=1.4, pos=[6.0, 2.0, 2.5])]
DOCK = [dict(w=8.0, h=6.0, intensity=1.2, pos=[4.7, 1.5, -6.2]), dict(w=6.0, h=4.0, intensity=1.0, pos=[-4.0, 5.0, 4.0])]
SIDE = [dict(w=1.8, h=7.0, intensity=2.0, pos=[-7.5, 1.0, 2.0]), dict(w=6.0, h=2.0, intensity=1.3, pos=[0.0, 2.0, 8.0])]


def view(s: float, out: float, side: float, along: float = 0.0, lift: float = 0.0) -> list[float]:
    """Camera position: `out` mm off the band at s (along its normal), `side` mm along the forearm, `along` mm round the band."""
    p = M.pt(s + along, out, side)
    return [round(p[0], 1), round(p[1], 1), round(p[2] + lift, 1)]


INSIDE_NOT_SENSORS = [p for p in INSIDE if p not in SENSORS]

SHOTS = {
    # the object itself: island up, leg face with its three plates, the touch ring on the shoulder
    "hero": dict(files=BAND, orient="island", pos=[-118, 205, 104], target=[0, 0, -17], fov=22, ground=-46.2,
                 hide=INSIDE + ["anchor"], strips=LEG_FACE, exposure=1.0),
    # straight down on the leg face, bar end at the top: the view that showed v1 leaning
    "top": dict(files=BAND, orient="island", pos=[0.0, 0.0, 430.0], target=[0.0, 0.0, 0.0], up=[1.0, 0.0, 0.0], fov=10.0,
                ground=None, hide=INSIDE + ["anchor"], strips=[dict(w=9.0, h=7.0, intensity=1.2, pos=[0.0, 7.5, 1.0]),
                                                                 dict(w=2.0, h=6.0, intensity=1.3, pos=[-6.5, 2.5, -2.0])]),
    # the face on the wrist: two LA plates, the sensor window with a charge contact each side; the strap only hinted
    "wristface": dict(files=BAND, orient="wrist", pos=[30, 92, -104], target=[0, -1, 1.0], fov=19, ground=None,
                      hide=INSIDE_NOT_SENSORS + ["anchor", "flex", "trace_", "post_", "tongue"],
                      ghost={"strap": 0.1, "el_RA": 0.1, "elc_RA": 0.1, "hook": 0.1, "loop": 0.1}, strips=WRIST_FACE, exposure=1.0),
    # side profile on the design wrist: one continuous inner line, concave island, the fold-back
    "profile": dict(files=BAND + ["../out_id/wrist.glb"], orient="wrist", pos=[2, 520, -19], target=[2, 0, -19], fov=9.0,
                    ground=None, hide=INSIDE + ["anchor"], strips=SIDE),
    # how it closes, seen square from the side: under the bar, round it, back up, stud into a hole.
    # The near lug is see-through so the wrap behind it shows.
    "closure": dict(files=BAND, orient="wrist", pos=[at(38, 3)[0] + 6, 330, at(38, 3)[2] - 4], target=[at(38, 3)[0] + 6, 0, at(38, 3)[2] - 4],
                    fov=8.6, ground=None, hide=INSIDE + ["anchor"], ghost={"lug_b": 0.2}, strips=SIDE),
    # inside the strap: two separate traces to two separate pads, the flex keyed into the strap
    "flex": dict(files=BAND, orient="wrist", pos=view(-46, 150, 105, along=18), target=at(-45, 2), fov=19, ground=None,
                 hide=["pcb", "radio", "afe", "chip_", "low_", "motor", "cell", "spring_", "ppg", "temp", "tpad", "hook", "loop"],
                 ghost={"strap": 0.16, "tongue": 0.2, "el_RA": 0.3, "elc_RA": 0.3, "shell_leg": 0.22, "el_LL": 0.25, "elc_LL": 0.25, "el_RLD": 0.25, "elc_RLD": 0.25, "led": 0.2},
                 strips=SIDE),
    # lid off: the board, the cell and the two nickel tabs that connect them, the flex landing on its connector
    "inside": dict(files=BAND, orient="island", pos=[-70, -120, 150], target=[2, -2, 2], fov=17, ground=None,
                   hide=["shell_leg", "el_LL", "elc_LL", "el_RLD", "elc_RLD", "led", "anchor"], ghost={"strap": 0.35, "hook": 0.2, "loop": 0.2},
                   strips=LEG_FACE),
    # cut along the band through the island: shells, plates, window + PPG sensor, board, cell, flex entry
    "section": dict(files=["../out_id/band_id_section.glb"], orient="island", pos=[0, -210, 26], target=[0, 0, -1.5], fov=11.5,
                    ground=None, hide=[]),
    # charging: the band hangs on the stand; the stand's arm takes the wrist's place
    "dock": dict(files=BAND + ["../out_id/dock.glb"], orient="island", pos=[-200, -265, 38], target=[0, 12, -46], fov=22,
                 ground=-97.0, hide=INSIDE + ["anchor"], strips=DOCK, exposure=1.0),
}


def build_bundle() -> None:
    env = dict(os.environ, NODE_PATH=str(LANDING / "node_modules"))
    esbuild = LANDING / "node_modules" / "esbuild" / "bin" / "esbuild"
    subprocess.run(["node", str(esbuild), str(STUDIO / "harness.ts"), "--bundle", "--format=iife", "--log-level=warning",
                    f"--outfile={STUDIO / 'harness.js'}"], check=True, env=env)


def trim(im: Image.Image, pad: int = 70) -> Image.Image:
    a = np.asarray(im.convert("RGB")).astype(int)
    corner = a[4, 4]
    mask = (np.abs(a - corner).sum(axis=2) > 26)
    if not mask.any():
        return im
    ys, xs = np.where(mask)
    return im.crop((max(xs.min() - pad, 0), max(ys.min() - pad, 0), min(xs.max() + pad, a.shape[1]), min(ys.max() + pad, a.shape[0])))


class Handler(http.server.SimpleHTTPRequestHandler):
    """Serves mechanical/ and takes the finished picture back from the page."""

    def __init__(self, *a, **k):
        super().__init__(*a, directory=str(HERE), **k)

    def do_POST(self):
        name = self.path.rsplit("/", 1)[-1]
        data = self.rfile.read(int(self.headers.get("Content-Length", "0")))
        (OUT / f"id_{name}.png").write_bytes(data)
        self.send_response(200)
        self.end_headers()

    def log_message(self, *a):
        pass


if __name__ == "__main__":
    which = sys.argv[1:] or list(SHOTS)
    (STUDIO / "shots.json").write_text(json.dumps(SHOTS, indent=1), encoding="utf-8")
    build_bundle()
    server = http.server.ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    profile = OUT / "_chrome"
    try:
        for name in which:
            png = OUT / f"id_{name}.png"
            if png.exists():
                png.unlink()
            # the real graphics chip: software rendering never finished this scene
            chrome = subprocess.Popen([CHROME, "--headless=new", "--no-first-run", f"--user-data-dir={profile}",
                                       "--use-angle=d3d11", "--ignore-gpu-blocklist", "--enable-gpu",
                                       "--window-size=2400,1600", f"http://127.0.0.1:{PORT}/studio/render.html#{name}"],
                                      stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            t0 = time.time()
            while not png.exists() and time.time() - t0 < 150:
                time.sleep(0.5)
            time.sleep(0.6)
            chrome.kill()
            if not png.exists():
                print("FAILED", name)
                continue
            im = trim(Image.open(png))
            PAGE.mkdir(parents=True, exist_ok=True)
            small = im.convert("RGB")
            small.thumbnail((1600, 1600))
            small.save(PAGE / f"id_{name}.webp", "WEBP", quality=88, method=6)
            print("rendered", name, im.size, f"{time.time() - t0:.0f}s")
    finally:
        server.shutdown()

# v3.0.1 - note: the model is now v3.2 (render_v32.py); this file's id_*.webp are the v3.1 pictures. v3.0.0 - shots for design concept v3: hero, top (square on), wrist face with the sensor window, profile, closure, flex, inside, section, charging stand
