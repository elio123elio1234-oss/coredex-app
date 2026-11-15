"""Render the premium side variant (band_premium.py) with the landing page's studio, in headless Chrome.

Run:   .venv/Scripts/python mechanical/render_p.py [shot ...]
Needs: mechanical/out_p/*.glb (run band_premium.py first), Node, Chrome, and the
       LANDING PAGE project's node_modules (three + esbuild) for the bundle.
Makes: mechanical/out_p/p_<shot>.png and plan/img/p_<shot>.webp; "lineup" is three colourways composited.
"""
from __future__ import annotations

import http.server
import json
import subprocess
import sys
import threading
import time
from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import band_premium as P  # noqa: E402
import render_id as R  # noqa: E402  (bundle, trim)

STUDIO = HERE / "studio"
OUT = HERE / "out_p"
PAGE = HERE.parent / "plan" / "img"
CHROME = R.CHROME
PORT = 8795
BAND = ["../out_p/band_p_lite.glb"]          # lite_p.py: the same model, lighter straps, no hidden inner parts

STEEL = {"electrode_satin": {"color": 0xc6cbd2, "roughness": 0.3}, "electrode": {"color": 0xf8fafc, "roughness": 0.06}}
# the status light as it looks when off: a glossy line in the body's own colour (it shows only when lit)
def _led(c):
    return {"led": {"color": c, "emissive": 0x000000, "emissiveIntensity": 0.0, "roughness": 0.12, "clearcoat": 1.0}}
COLOURWAYS = {
    # the brand's navy (#0D2041 family): ceramic satin, strap the same colour
    "navy": {"body": {"color": 0x1a2540, "roughness": 0.36, "clearcoat": 0.55, "clearcoatRoughness": 0.28},
             "fkm": {"color": 0x1d2841, "sheen": 0.35, "sheenColor": 0x4a5a80},
             "loop": {"color": 0x24304c, "sheenColor": 0x4a5a80}, "hook": {"color": 0x151c2e}, **STEEL, **_led(0x111a2e)},
    "starlight": {"body": {"color": 0xe7e1d7, "roughness": 0.4, "clearcoat": 0.5, "clearcoatRoughness": 0.3},
                  "fkm": {"color": 0xdad3c7, "sheen": 0.3, "sheenColor": 0xfff6ea},
                  "loop": {"color": 0xd0c9bc, "sheenColor": 0xfff6ea}, "hook": {"color": 0xbdb6a9}, **STEEL, **_led(0xcfc8bc)},
    "graphite": {"body": {"color": 0x2a2c31, "roughness": 0.36, "clearcoat": 0.55, "clearcoatRoughness": 0.28},
                 "fkm": {"color": 0x2a2c31, "sheen": 0.3, "sheenColor": 0x70747c},
                 "loop": {"color": 0x33363b, "sheenColor": 0x70747c}, "hook": {"color": 0x1f2124}, **STEEL, **_led(0x1c1e22)},
}


def at(s: float, d: float = 0.0, y: float = 0.0) -> list[float]:
    return [round(v, 2) for v in P.pt(s, d, y)]


def view(s: float, out: float, side: float, along: float = 0.0) -> list[float]:
    return [round(v, 1) for v in P.pt(s + along, out, side)]


INSIDE = R.INSIDE
SENSORS = R.SENSORS
INSIDE_NOT_SENSORS = R.INSIDE_NOT_SENSORS
HIDE = INSIDE + ["anchor", "latch"]
LEG_FACE = R.LEG_FACE
SIDE = R.SIDE
NIGHT = [dict(w=6.0, h=3.0, intensity=2.4, pos=[1.5, 6.5, 2.5]), dict(w=0.7, h=6.5, intensity=5.0, pos=[-6.5, 1.5, -3.5]),
         dict(w=0.7, h=6.5, intensity=3.2, pos=[6.5, 1.0, -3.0]), dict(w=6.0, h=0.8, intensity=0.5, pos=[0.0, -2.5, 6.5])]
GROUND = -45.0                       # the band stands on the plain back of the strap

SHOTS = {
    "hero": dict(files=BAND, orient="island", pos=[-118, 205, 104], target=[0, 0, -18], fov=22, ground=GROUND,
                 hide=HIDE, strips=LEG_FACE, bg="apple", palette=COLOURWAYS["navy"]),
    "night": dict(files=BAND, orient="island", pos=[-96, 128, 78], target=[0, 0, 0.5], fov=17, ground=None,
                  hide=HIDE, strips=NIGHT, env="night", bg="night", palette=COLOURWAYS["graphite"], exposure=1.05),
    "top": dict(files=BAND, orient="island", pos=[0.0, 0.0, 430.0], target=[0.0, 0.0, 0.0], up=[1.0, 0.0, 0.0], fov=9.0,
                ground=None, hide=HIDE, bg="apple", palette=COLOURWAYS["navy"],
                strips=[dict(w=9.0, h=7.0, intensity=1.2, pos=[0.0, 7.5, 1.0]), dict(w=2.0, h=6.0, intensity=1.3, pos=[-6.5, 2.5, -2.0])]),
    "wristface": dict(files=BAND, orient="wrist", pos=[30, 92, -104], target=[0, -1, 1.0], fov=19, ground=None,
                      hide=INSIDE_NOT_SENSORS + ["anchor", "latch", "flex", "trace_", "post_", "tongue"],
                      ghost={"strap": 0.1, "el_RA": 0.1, "elc_RA": 0.1, "hook": 0.1, "loop": 0.1, "ring": 0.1},
                      strips=R.WRIST_FACE, bg="apple", palette=COLOURWAYS["navy"]),
    "end": dict(files=BAND, orient="island", pos=[-82, 52, 34], target=at(-22.5, 2.6), fov=15, ground=None,
                hide=HIDE, strips=LEG_FACE, bg="apple", palette=COLOURWAYS["starlight"]),
    "ring": dict(files=BAND, orient="island", pos=[95, 88, 52], target=at(P.S_FB - 2.0, 3.0), fov=15, ground=None,
                 hide=HIDE, strips=LEG_FACE, bg="apple", palette=COLOURWAYS["navy"]),
    "profile": dict(files=BAND + ["../out_p/wrist.glb"], orient="wrist", pos=[2, 520, -21], target=[2, 0, -21], fov=9.6,
                    ground=None, hide=HIDE, strips=SIDE, bg="apple", palette=COLOURWAYS["navy"]),
}
LINEUP = ["navy", "starlight", "graphite"]
for _c in LINEUP:
    SHOTS[f"lineup_{_c}"] = dict(files=BAND, orient="island", pos=[-40, 250, 92], target=[0, 0, -19], fov=17, ground=GROUND,
                                 hide=HIDE, strips=LEG_FACE, bg="none", palette=COLOURWAYS[_c])


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=str(HERE), **k)

    def do_POST(self):
        name = self.path.rsplit("/", 1)[-1]
        data = self.rfile.read(int(self.headers.get("Content-Length", "0")))
        (OUT / f"p_{name}.png").write_bytes(data)
        self.send_response(200)
        self.end_headers()

    def log_message(self, *a):
        pass


def shoot(name: str, profile: Path) -> bool:
    png = OUT / f"p_{name}.png"
    if png.exists():
        png.unlink()
    chrome = subprocess.Popen([CHROME, "--headless=new", "--no-first-run", f"--user-data-dir={profile}",
                               "--use-angle=d3d11", "--ignore-gpu-blocklist", "--enable-gpu",
                               "--window-size=2400,1600", f"http://127.0.0.1:{PORT}/studio/render.html#p:{name}"],
                              stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    t0 = time.time()
    while not png.exists() and time.time() - t0 < 560:
        time.sleep(0.5)
    time.sleep(0.6)
    # the whole tree: killing only the launcher left headless Chrome running, holding the profile, and every
    # later launch on that profile quit at once (no picture, no error)
    subprocess.run(["taskkill", "/F", "/T", "/PID", str(chrome.pid)], capture_output=True)
    return png.exists()


def trim_alpha(im: Image.Image, pad: int = 30) -> Image.Image:
    a = np.asarray(im)[:, :, 3]
    ys, xs = np.where(a > 8)
    return im.crop((max(xs.min() - pad, 0), max(ys.min() - pad, 0), min(xs.max() + pad, im.width), min(ys.max() + pad, im.height)))


def lineup() -> Image.Image:
    ims = [trim_alpha(Image.open(OUT / f"p_lineup_{c}.png").convert("RGBA")) for c in LINEUP]
    h = max(i.height for i in ims)
    step = int(ims[0].width * 0.86)
    W = step * (len(ims) - 1) + ims[-1].width + 160
    H = h + 160
    yy, xx = np.mgrid[0:H, 0:W]
    r = np.hypot((xx - W * 0.5) / W, (yy - H * 0.4) / H) / 0.75
    r = np.clip(r, 0, 1)[..., None]
    c0, c1 = np.array([253, 253, 254]), np.array([233, 233, 237])
    bg = Image.fromarray((c0 * (1 - r) + c1 * r).astype(np.uint8), "RGB").convert("RGBA")
    for k, im in enumerate(ims):
        bg.alpha_composite(im, (80 + k * step, 80 + (h - im.height)))
    return bg.convert("RGB")


if __name__ == "__main__":
    which = sys.argv[1:] or [k for k in SHOTS] + ["lineup"]
    (STUDIO / "shots_p.json").write_text(json.dumps(SHOTS, indent=1), encoding="utf-8")
    R.build_bundle()
    server = http.server.ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    profile = OUT / "_chrome"
    PAGE.mkdir(parents=True, exist_ok=True)
    try:
        for name in which:
            t0 = time.time()
            if name == "lineup":
                im = lineup()
            else:
                if not shoot(name, profile):
                    print("FAILED", name, flush=True)
                    continue
                if name.startswith("lineup_"):
                    print("rendered", name, f"{time.time() - t0:.0f}s", flush=True)
                    continue
                im = R.trim(Image.open(OUT / f"p_{name}.png"))
            small = im.convert("RGB")
            small.thumbnail((1600, 1600))
            small.save(PAGE / f"p_{name}.webp", "WEBP", quality=88, method=6)
            print("rendered", name, im.size, f"{time.time() - t0:.0f}s", flush=True)
    finally:
        server.shutdown()

# v1.1.0 - the ring shot now at the island's free end (P1.1); shots for the premium side variant: hero (navy, Apple grey), night (graphite on black), top, wrist face, the end and its slot (starlight), the ring at the back, profile on the wrist, and a three-colour lineup
