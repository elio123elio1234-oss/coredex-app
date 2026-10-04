# Changelog — CYPHIX_TINVENT_DECK

## v1.0.0 — 2026-10-04

First web build of the t:invent deck, for sending to the programme manager as a link.

**Why this exists at all.** The deck already existed as a single 48 MB HTML file that
runs offline from `file://`. That file cannot simply be uploaded: 42 MB of it is the two
videos encoded as base64 inside `<script>` tags, and a browser shows nothing at all
until the final byte of a document arrives. On a phone that is a blank screen for the
length of a 48 MB download, and on iOS decoding a 23 MB data: URL into a Blob is a
plausible way to get the tab killed. Everything in this build follows from that.

- **Videos stream from `/media`.** `data-embed` is stripped from both players, so they
  use the `src="media/*.mp4"` that was already there as the online path. −42 MB.
- **The 3D strap mesh moved to `model.json`** (3.1 MB), preloaded in parallel with the
  rest of the document. This one needed care: `init3D()` memoises per viewer kind, so a
  3D slide reached before the mesh arrived would have cached the failure and shown
  nothing for the rest of the session. It now retries when the mesh lands, and only if
  that slide is still on screen. Slide 4 is early enough for this to have mattered.
- **Boot screen** while the remaining ~1.4 MB downloads — wordmark and a progress bar,
  rather than a dark rectangle.
- **Portrait on a phone asks the reader to rotate.** The stage is a fixed 1920×1080
  scaled to fit the window; in portrait on a 390 px phone that is 390×219 and the 25 px
  body text renders at about 5 px. No scaling fixes that, so the deck asks — with a
  "show anyway" link for anyone who wants it regardless, and the card returns if they
  rotate back to portrait later. Android Chrome additionally holds landscape while
  presenting full-screen; iOS ignores the orientation lock API and always will.
- **Link preview**: `og:`/`twitter:` tags and `og.png`, which is the real cover slide
  rendered at 1200×675 — so the link arrives as a card, not a bare URL.
- **Favicon** extracted from the deck's own wordmark.
- **Copy fix**: the video failure message told the reader to "open the offline version
  in Chrome", which is meaningless on a hosted page. It now points at their connection.
- `vercel.json`: a week of caching for media and the mesh, none for the HTML, `/pdf` as
  a short link to the flat PDF, and `X-Robots-Tag: noindex` — this is a deck for one
  named reader, not a public page.

**What was caught while building it.** Two things, both found by opening the page rather
than by the build passing:

1. A first attempt shrank the mobile control bar with `transform: scale(.86)`. `#ui`
   uses `transform: translate(-50%, …)` for *both* its horizontal centering and its
   slide-in, so that would have left the toolbar off-centre and unable to animate — and
   it would never have shown up in a screenshot, because the toolbar is hidden until
   touched. The button sizes are set directly instead.
2. The rotate icon was a bare phone outline. Mid-animation, rotated 90°, it reads as a
   battery. It now has a rotation arc around it.

**Verified.** Chrome, local static server with range requests. All 17 slides walked at
1440×900, 390×844, 844×390 and 1024×768 — no console errors, no failed requests, both
3D viewers initialised, `demo.mp4` playing from `/media` on every one. A separate touch
pass under an iPhone user agent at 844×390: swipe forward and back, tap to advance, the
toolbar appearing on a bottom touch and sitting centred, the slide index opening and
jumping to the appendix, the explainer video playing from a tap, the 3D product slide
with its four variants, the portrait card appearing and its escape hatch working.

**Not verified.** Nothing here has run on a physical iPhone or Android handset. Chrome
with an iPhone user agent is not Safari: it shares no video stack, no memory limits and
no fullscreen behaviour. The deck should be opened once on a real phone before the link
goes out.

// v1.0.0 — first web build of the t:invent deck
