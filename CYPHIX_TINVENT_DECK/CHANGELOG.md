# Changelog — CYPHIX_TINVENT_DECK

## v2.0.0 — 2026-10-04

Rebuilt from a new export. The deck was re-authored and the export itself changed shape,
so the build script changed with it.

**The export now ships its own web build.** `Website-Vercel/cyphix-tinvent/` contains an
index.html with the videos already as files — no base64 blobs. That folder is the input
now, instead of the 62 MB single-file `Cyphix-tinvent.html`. The script asserts this on
every run and refuses to build, with an explanation, if a future export goes back to the
self-contained shape — rather than quietly producing a broken folder.

**All three editorial patches from v1.1.0 are gone.** The new deck already has them, made
properly in the authoring tool: the short demo clip on the prototype slide, the business
slide without "הדרך להסכם רחב", and "רצועה אחת. כל שעון." in the appendix. Re-applying
them would have been fighting the source. The hand-encoded 12.5 MB video is dropped in
favour of the export's own 8.8 MB cut of the same footage, which is better compressed
(2.3 Mbps, 30 fps) and already faststart.

**The deck itself:** 11 main slides (was 12) and 6 appendices (was 4). New appendices
`how` ("איך זה עובד?") and `demofull` ("הדגמה מלאה", the full 1:06 demo), with the 0:32
short cut now on the main prototype slide. Three videos instead of two.

**What this script still adds,** since the tool's build does not:

- the 3.1 MB mesh out of the document into `model.json`, preloaded in parallel — the
  tool's index.html is 5.5 MB and nothing paints until its last byte lands;
- the boot screen over the ~1.3 MB that still has to arrive first;
- the portrait rotate prompt;
- `og:image`, `og:url` and the twitter tags — the export has `og:title` and
  `og:description` but no picture, so the link would arrive as a bare line;
- the Cyphix wordmark as the favicon, replacing an emoji (🫀) data-URI;
- video-failure copy that does not tell a web reader to open an offline file in Chrome.

It also copies the media and the PDF out of the export and deletes any video left in the
deployment that the new deck no longer references, so one command updates everything.

**Verified** on the live site: 18 slides walked at 1440×900, 390×844, 844×390 and
1024×768 with no console errors and no failed requests; **all three videos played** on
every viewport (0:32, 1:06, 2:22 — the check now exercises every video in the deck
instead of only the first); both 3D viewers initialised from the external mesh. Plus the
touch pass under an iPhone UA: swipe, tap, toolbar, index, video-from-tap, the 3D slide,
and the portrait card with its escape hatch.

**Not verified:** still nothing on a physical iPhone or Android handset.

## v1.1.0 — 2026-10-04

Three editorial changes, requested after the first deploy. All three are implemented as
patches inside `tools/build.mjs`, not as edits to `index.html` — that file is generated,
so a hand-edit would vanish on the next build. Each patch asserts the text it expects to
find and the build now runs 24 checks instead of 11.

- **Slide 6 — new demo video.** `ECG_How_It_Works_31s_1080p60.mp4` replaces the old
  1:06 clip. The source was 26.5 MB for 31 s (6.8 Mbps, 1080p60); re-encoded with x264
  CRF 23, preset slow, faststart, original AAC copied — **12.5 MB**, still smaller than
  the 15.9 MB file it replaces. The duration label follows it from 1:06 to 0:31, and the
  poster is a new frame (7.2 s, the "close the circuit" shot). The video's own title card
  was tried as the poster first and rejected: the play button lands in the middle of
  "Wearable 6-Lead ECG".
- **Slide 9 — the business model stands alone.** "הדרך להסכם רחב" is gone: its heading,
  its three steps and the two arrows that fed them. The three remaining columns are
  centred in the space that opened up (`.bm-col` top 196 → 370, arrows 276 → 450). The
  closing line had a 2.6 s entrance delay timed to land after a roadmap that no longer
  builds in front of it — retimed to 1.45 s, so it arrives just after the last column.
- **"רצועה אחת. כל שעון." moved to the appendix.** It is appendix 4 now, after the
  explainer, with its 3D viewer intact. The main deck is 12 slides instead of 13 and the
  counters follow. The appendix divider gained a fifth card for it, and the web-app link
  renumbered from 4 to 5; the grid went from four columns to five with slightly tighter
  cards.

**Verified** on the live site: slide order and appendix numbering read back from the DOM,
all 17 slides walked at 1440×900, 390×844, 844×390 and 1024×768 with no console errors
and no failed requests, the new video playing from /media with `duration: 31.3` on every
viewport. The three changed slides were looked at, not just counted.

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
