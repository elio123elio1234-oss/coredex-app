"""Puts the rendered screen behind the empty tablet frame and writes the hero image.

usage: python -I tools/tablet/compose.py <screen2x.png> <out.webp>
The frame (the user's ChatGPT mockup, 1536 x 1024) has a transparent screen at
x 105..1432, y 70..955; the screen goes under it at (104, 69) at 1330 x 888, and
the frame's bezel covers the edges and corners."""
import sys
from pathlib import Path
from PIL import Image

here = Path(__file__).parent
screen = Image.open(sys.argv[1]).convert('RGBA').resize((1330, 888), Image.LANCZOS)
frame = Image.open(here / 'frame.webp').convert('RGBA')
canvas = Image.new('RGBA', frame.size, (0, 0, 0, 0))
canvas.paste(screen, (104, 69))
canvas.alpha_composite(frame)
box = frame.getchannel('A').point(lambda v: 255 if v > 16 else 0).getbbox()
dev = canvas.crop(box)
r, g, b, a = dev.split()
a = a.point(lambda v: 0 if v < 32 else (255 if v >= 245 else v))  # no grey haze around the device
dev = Image.merge('RGBA', (r, g, b, a))
dev = dev.resize((1000, round(dev.size[1] * 1000 / dev.size[0])), Image.LANCZOS)
dev.save(sys.argv[2], 'WEBP', quality=90, method=6)
print(dev.size)
# v0.18.0 — composes the hero tablet
