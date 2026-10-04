# CYPHIX_TINVENT_DECK

The Cyphix pitch deck for the **t:invent** programme (Technion), deployed as a static
site on Vercel so it can be sent as a link and opened on any phone, tablet or laptop.

This folder is **build output + the script that produces it**. The deck itself is
authored elsewhere; here it is only reshaped for the web.

```
CYPHIX_TINVENT_DECK/
├── index.html                  ← generated. 17 slides, RTL, 1920×1080 stage
├── model.json                  ← generated. the 3D strap mesh, lifted out of index.html
├── favicon.webp                ← generated. the wordmark, extracted from the deck
├── og.png                      ← the cover slide, rendered at 1200×675 for link previews
├── media/demo.mp4              ← 11.9 MB · prototype demo, 0:31 (re-encoded, see CHANGELOG v1.1.0)
├── media/whiteboard.mp4        ← 16.7 MB · explainer, 2:22
├── download/Cyphix-tinvent.pdf ← 7 MB · flat fallback, served at /pdf
├── vercel.json                 ← caching, /pdf rewrite, noindex
├── tools/build.mjs             ← the only thing here written by hand
└── tools/assets/               ← inputs the build injects (the demo poster frame)
```

## Source of truth

The deck is exported from its authoring tool as a **single self-contained HTML file**:

```
C:\Users\elio1\Downloads\Cyphix-tinvent\Cyphix-tinvent\
├── Cyphix-tinvent.html   ← 48 MB, everything inlined (this is the input)
├── media/*.mp4           ← the same two videos, as files
├── PDF/Cyphix-tinvent.pdf
└── PowerPoint/Cyphix-tinvent.pptx
```

That file is built to run from `file://` with no network at all, which is exactly the
wrong shape for the web — 42 MB of it is the two videos as base64, and another 3.1 MB
is the 3D mesh. Nothing paints until the last byte arrives.

## Rebuilding

```bash
node tools/build.mjs "<path to>/Cyphix-tinvent.html" .
```

The script prints a check table and exits non-zero if any of its 24 assumptions about
the source file stop holding (the video blobs, `getModel()`, the `init3D()` guard, the
wordmark, the failure copy, and every editorial patch in section 2.5). **If the deck is re-exported and the build reports a FAIL,
fix the script — do not deploy the output.** A failed check means the patch it was
supposed to apply silently did nothing.

What it does:

1. **Videos stream from `/media`** instead of being decoded out of base64. Removes
   42 MB and, on iOS, the memory spike of turning a 23 MB data: URL into a Blob.
2. **The mesh moves to `model.json`**, preloaded in parallel while the document is
   still streaming. `getModel()` reads the fetched copy; `init3D()` gained a retry so a
   3D slide reached before the mesh lands recovers instead of caching the failure
   forever (it memoises per viewer kind — one early miss would have been permanent).
3. **A boot screen** — wordmark + progress bar — covers the ~1.4 MB the browser still
   has to download before the first slide can exist.
4. **Portrait on a phone asks the reader to rotate.** The stage is a fixed 1920×1080
   scaled to fit; in portrait on a 390 px phone that is 390×219, and 25 px body text
   lands at about 5 px. There is a "show anyway" escape hatch.
5. Link-preview metadata, a favicon, and copy that no longer tells the reader to open
   an offline file in Chrome.
6. **Editorial changes made after the export** (section 2.5): the slide 6 poster and
   duration, the business slide with its roadmap removed and re-centred, and moving
   "רצועה אחת. כל שעון." into the appendix. These live in the build script because
   `index.html` is generated — editing it by hand would not survive the next build.
   The deck's own source file in Downloads is never modified.

Result: `index.html` 48 MB → 2.3 MB (≈1.4 MB gzipped), first slide in well under a
second on the test machine, videos streamed on demand with range requests.

## Deploying

```bash
vercel --prod        # from this folder
```

`.vercelignore` keeps `tools/` and the docs out of the deployment. `vercel.json` sets
`X-Robots-Tag: noindex` — this is a deck sent to a named reader, not a public page.
Remove that header if it should be indexable.

If the production domain ever changes, pass it to the build so the `og:` tags point at
the right origin — they must be absolute or WhatsApp/Slack previews break:

```bash
node tools/build.mjs "<source>.html" . https://your-domain.example
```

## Verification

`tsc` has no opinion here and a clean build proves nothing, so the deck is driven in a
real browser before every deploy: all 17 slides walked at 1440×900, 390×844, 844×390
and 1024×768, plus a touch pass on an iPhone user agent covering swipe, tap, the
toolbar, the slide index, video playback and the 3D product slide. See CHANGELOG.md for
what that run found.

// v1.1.0 — how the deployable deck is produced and what the build actually changes
