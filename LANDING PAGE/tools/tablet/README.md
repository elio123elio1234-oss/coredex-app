# The hero tablet

The tablet beside the forearm in the hero is built here, not generated:

- `frame.webp`: the empty tablet frame the user made in ChatGPT (2026-10-24), with a transparent screen.
- `screen.html`: the screen, the CYPHIX recording view with the real wordmark, drawn at 1330 × 888.
  - Leads I and II are modelled with inferior ST elevation (II, III and aVF, in red) and the reciprocal change in I and aVL.
  - III, aVR, aVL and aVF are derived from I and II.
  - The axis and the rate come from the trace itself.
  - It is an illustrative recording, and says so.
- `render.mjs` renders the screen at 2× in headless Chrome; `compose.py` puts it behind the frame.

```
node tools/tablet/render.mjs tools/tablet/screen2x.png
python -I tools/tablet/compose.py tools/tablet/screen2x.png src/assets/photos/hero-system.webp
```

`screen2x.png` is a build product; don't commit it.

<!-- v0.18.0 — the hero tablet, built from the user's frame -->
