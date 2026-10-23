# Changelog — CYPHIX Landing

## v0.11.1 — 2026-10-23 — the forearm alone, lower in the band

**Why.** The user: "the hand reaches too high; cut some of its bottom. And
remove the watch: it doesn't look natural there, and it's further down the
page anyway."

**What changed.**
- **The forearm is shorter.** The lower quarter is cropped away
  (`hero-wrist.webp` is now 670 × 1344), and the image is sized to the band's
  height minus 150 px, so the fingertips sit well below the band's top. The hand
  is larger than before; the module and a little forearm stay above the bottom
  edge.
- **The render and its two-line key are out of the hero.** The figure shows
  only the forearm, with the note "Concept imagery". The render still shows
  under "Our solution" and in the closing scene, and it stands in for the hero
  photo only when no photo is supplied.

## v0.11.0 — 2026-10-23 — the hero: the user's wrist, hand raised, beside the render

**Why.** The user sent their own image for the hero, made in ChatGPT and
shared by link: a forearm wearing the Cyphix strap, with the module on the
inside of the wrist showing its three outer electrodes. They asked:
- "make it look like the hand is facing up, not at an angle";
- "next to it, add the current rendering of the product, so they understand
  this is the back part".

**What changed.**
- **The image.** It was downloaded from the share link's `og:image`
  (1774 × 887 PNG with a transparent background) and prepared:
  - the matte's faint haze removed (it showed as specks on dark backgrounds);
  - the subject made opaque (it came in at 99 %);
  - turned 90° so the hand points straight up;
  - cropped with the forearm's cut on the bottom edge;
  - saved as `src/assets/photos/hero-wrist.webp` (670 × 1768, 132 kB), with a
    provenance sidecar.

  It fills the `hero` slot in `src/config/photos.ts`.
- **The hero's right side is a pair.**
  - The forearm rises from the slate band's lower edge, sized to the band's
    height at every width. On a phone it is 420 px tall.
  - Beside it sits `render-hero` (the strap on a smartwatch), with a two-line
    key: "On top: your watch. / Underneath, against the wrist: the Cyphix
    module."
  - The note reads "Concept imagery and rendering".
- **The Gemini hero prompt** (`gemini/PROMPTS.md` §1) is marked as supplied.

**Checked.** In headless Chrome at 1440 × 900, 1280 × 720, 820 × 1180 and
390 × 844: no sideways scroll, and the forearm's bottom meets the band's bottom
edge exactly.

## v0.10.1 — 2026-10-23 — the bracelet is an oval you could wear

**Why.** The user, looking at v0.10.0 on their phone: "does that look like
something you can put on your hand? Why did you close it in a straight line?
Look at the reference and match it. It looks like half an arch."

They were right. v0.10.0 closed the strap by sweeping a link between its two
cut ends. The slate strap is shaped to hold a flat watch: near where the watch
sits it runs almost straight. A link continuing that line closed the loop into
a "D", with a long straight front.

**The reference.** The team's own closed band, `woven_band_band` in the OBJ.
It is the strap worn without a watch: an oval about 71 × 49 mm outside,
rounded across the front like a wrist.

**What changed.**
- **The strap bends to that oval as it closes.** `bendToBracelet` in `studio.ts`
  turns the woven band's centreline into a table, its radius every 5° from the
  loop centre. It measures the slate strap's own centreline by casting rays to
  its inner and outer faces at every degree, then moves each point of the
  strap, the link and the RA electrode along the radius by the difference
  between the two. The band keeps its thickness.
- **It is a GPU morph tied to the closing.** The link grows from both cut ends
  while the strap curls into the oval, and both run backwards before the
  analog watch clicks in.
- **The bend fades out before the module** (112° to 140°), so the module and
  its hinges don't move.
- **The bent strap's normals come from the bent surface.** Turning the
  original normals left a dark crease where the curvature changes fastest.
- **The spring-bar levers hide while the strap is closed;** they only matter
  with a watch in the strap.
- `scene-strap.webp` and `gemini/refs/ref-3-strap-closed-bracelet.png` are
  re-rendered.

## v0.10.0 — 2026-10-23 — four ways to wear it; More than an ECG

**Why.** The user liked v0.9.0 ("perfect") and caught a miss: the product
comes in four configurations, not three:
- on a smartwatch;
- the strap on its own, which must be **closed like a bracelet**, "don't leave
  it open with adapters";
- on an analog watch, "turning an analog watch into a smart one";
- the **Cyphix watch**, "the screen itself is ours too".

They also asked whether to add the other sensors, "FULL VITALS": the 6-lead limb
ECG, temperature, and PPG for continuous pulse. They weren't sure it was needed.
Decided: yes, as one quiet section, because every one of those sensors is
already in their 3D model.

**What was wrong in v0.9.** The team's OBJ always held all four
configurations side by side:
- the smartwatch on the slate strap;
- a closed band;
- the analog watch on a green strap;
- `contour_*`, a complete Cyphix watch in black titanium, with an ink band, the
  electrodes in the band, and its own PPG and temperature sensors.

The v0.8 conversion kept only the strap, the smartwatch and the analog head,
and it moved the smartwatch's lug housings onto the strap. That is why the
strap on its own looked like an open band with adapters.

**What changed.**
- **The model.** `public/models/cyphix.glb` now carries the fourth assembly,
  `contour`, the team's own Cyphix watch, on the same origin. It is 1.6 MB, up
  from 0.93 MB, because the Contour's case is a dense, unwelded surface.
- **The studio** (`src/lib/studio.ts`):
  - Each watch keeps its own lug housings.
  - Without a watch, the strap closes with a band swept between its two cut
    ends. The cut's size and tilt are read from the strap mesh, and the band
    leaves each end along the strap's own direction, so the joins are smooth.
  - The Contour gets its own face: the wordmark, the time, and the labels
    ECG / HR / TEMP, with no values.
  - Its display is rebuilt as a clean panel. The simplifier had folded some
    of its wedges, which culled away and broke the AO pass. Its coplanar
    cover glass is dropped; the display's clearcoat stands in for it.
- **The scene** (`src/lib/strapScene.ts`, 560vh) runs in the team's order:
  1. On the smartwatch, the strap turns.
  2. The watch lifts out, and the strap closes into a bracelet: the band grows
     from both cut ends and meets in the middle.
  3. It opens again. The analog watch clicks in: "the same strap makes it a
     smart one".
  4. The strap and the analog watch rise out together, and the Cyphix watch
     comes down: "Or ours."
- **The renders.** There are four scene stills (`scene-cyphix.webp` is new),
  used both in "Our solution" (2 × 2 on phones) and in the reduced-motion
  fallback.
- **"More than an ECG."** A new dark band after "How it works" shows the
  module's wrist side and outer face, rendered from the model, with numbered
  pins at each part's projected centre:
  1. 6-lead ECG electrodes, on both faces and on the strap;
  2. the PPG optical sensor, for continuous heart rate;
  3. the skin-temperature sensor.
- **Copy.** "Our solution", "Wear it", the scene steps and the footer map now
  name the four ways to wear it.
- **Gemini.** Prompt 3 is now four wrists: smartwatch, closed bracelet, analog,
  and the Cyphix watch. Refs 3–5 are re-rendered: `ref-3-strap-closed-bracelet`,
  `ref-4-…`, and the new `ref-5-cyphix-watch`.

**Not done.** The Impeccable finish review stays deferred until the Gemini
photos are in, as planned in v0.9.0. DESIGN.md is still at v0.8.

## v0.9.0 — 2026-10-23 — AliveCor's grammar, for Cyphix; four Gemini photo slots

**Why.** While v0.8 was in review, the user (in Hebrew) pointed at
https://alivecor.com/: "do it like that but for my product. Where a
visualisation image is needed, write me a prompt for Gemini's image model and
we'll put the image there."

**What follows AliveCor.** The structure and component language, played in
Cyphix's own colours and words:
- **Top of the page:** a navy announcement bar ("Now raising a $1.9M seed round |
  Request the deck"), then a white sticky bar with the wordmark, four links, the
  phone number and a solid uppercase button.
- **Hero:** a slate band with a notice chip ("In development · Not for sale"), a
  two-line headline (second line coral) and the product on the right.
- **Facts band:** navy, with line icons and the $4.53B market.
- **"1 in 3" split:** photograph left, statement right.
- **"Our solution":** a full-bleed photograph under a navy card.
- **"How it works" and "Who it's for":** list rows with line icons beside an image,
  each under a heading with a hairline rule.
- **"Why Cyphix":** the comparison on a pale band.
- **Kept from earlier versions:** the stage line, the market band, the team, the
  user's "One strap. Any watch." scene and the form.
- **Footer:** link columns over a pale legal band.

**The photographs.** `gemini/PROMPTS.md` holds the four prompts, with a slot, a
file name, an aspect ratio and the reference images to attach for each:
- hero wrist;
- home moment;
- three people, three watches, one strap;
- clinic.

`gemini/refs/` holds the 3D-model renders Gemini must match. Until the photos
arrive, every slot shows a real asset in its place (a render, the app screen,
or the "1 in 3" figure), so the page is complete today. Wiring a photo in is
one line in `src/config/photos.ts`. Generated people are labelled "Concept
imagery" and are never presented as customers.

**Not claimed, unlike the reference:** AliveCor shows user counts, publication
counts and "doctor-recommended". Cyphix has none of these, so the facts band
uses only what the one-pager states.

**Review state.** Not yet through the finish review. That runs once the
photographs are in, because they change three of the page's biggest surfaces.

## v0.8.0 — 2026-10-23 — the 3D model leads: "One strap. Any watch."

**Why.** On v0.7 the user wrote (in Hebrew): "I still don't like it at all! It still
looks unprofessional." They asked whether we had their 3D modelling materials, and
described the scene they wanted near the end: the watch rotates as you scroll,
becomes only the strap, then an analog watch, so "one strap on any watch" is
understood. v0.7 fixed the motion problem but kept the one-pager's flat concept
renders, and those renders were the weakest thing on the page.

**The model.** `Downloads/cyphix-ecg-straps (1).obj` (three-d-stage export,
2026-09-27) holds four assemblies side by side:
- the smartwatch with the Cyphix strap and module;
- the strap alone;
- an analog watch on the same strap;
- a "Contour" watch.

The strap, smartwatch and analog parts were split by name and bounding box and
moved onto one origin; the analog sits 0.224 m along x in the export, so it is
shifted back by that much. They got PBR materials named after the export's own
(aluminium, brushed titanium, polished steel electrodes, slate silicone,
sapphire), plus a static CYPHIX 6-lead screen on the display. The result is
`public/models/cyphix.glb`: 930 KB with meshopt, 70k triangles. Every product
image on the page is now rendered from it with three.js in one studio light.

**What changed.**
- **Hero:** copy left, the strap on the smartwatch right (`render-hero.webp`), a
  three-quarter view showing the CYPHIX screen and the module's electrodes, on a
  white studio glow with a floor shadow.
- **Product:** the strap from behind (`render-module.webp`), with leader-line
  callouts on the module's electrodes, the watch and the band. The exploded
  concept render is retired.
- **The user's scene** (`OneStrap.tsx`, `lib/strapScene.ts`), between Team and the
  form. A 400vh section holds a sticky dark stage, and the GLB renders live in
  WebGL, driven only by scroll:
  - the strap turns to show the electrodes;
  - the smartwatch lifts out and fades ("One strap.");
  - the analog watch drops into the same strap ("Any watch.").

  The copy fades per phase, a three-step indicator sits underneath, and the
  header turns dark over the stage. three.js loads in its own lazy chunk
  (151 kB gzip) only when the section is near, so the first load is unchanged.
  Reduced motion, or no WebGL, shows the three states as stills.
- **Share card:** `og.jpg` rebuilt on the new render.

**The product studio (finish-review round).** The reviewer judged the first
renders as "a CAD viewport, not a studio product shot". They also flagged the
watch's ghosted fade as "a CG ghost". `src/lib/studio.ts` now dresses the model
the same way for the stills and the live scene:
- **Environment:** a photographer's set baked to PMREM, with an overhead
  softbox, key and rim strips, a kicker and a warm bounce.
- **Materials:** silicone with sheen; clearcoated aluminium; mirror-polished
  electrodes; clearcoat glass over the screen.
- **Screen and dial:** the real CYPHIX wordmark on the watch screen (the first
  pass drew a generic "CYPHIX" in Arial), and an analog dial with indices and a
  seconds sub-dial.
- **Lug adapters:** they move from the watch to the strap, so the strap alone
  ends in finished adapters, not cut slabs, and the analog watch clips into
  those same adapters.

A second review round made the electrodes bright polished stainless against a
satin titanium module, with a front-high fill so they catch light. It added an
object-space silicone grain to the band. The light plates' shadow became a true
contact shadow: height-limited, lighter, and rendered as its own layer under the
product so it never darkens the band.

The stills add a GTAO pass and a soft contact shadow. In the scene nothing
fades any more. The smartwatch unclips and rises out of frame, opaque; the
analog comes down and clicks in. The copy windows run back to back, so the
stage is never without a line.

**State at commit.**
- **Deployment:** not deployed. Production stays on v0.7.0.
- **Finish review:** three rounds. Wordmark, analog dial, band ends, physical
  exit, copy windows, tall stages, the seed reference, DESIGN.md and the shadow
  regression are all resolved.
- **Still partial:** on the light renders the electrode faces read as even grey.
  Strip lights for their reflection angle were being placed when the user
  pointed at alivecor.com as the style to follow, and that became v0.9.

**Removed:** `watch-front.webp`, `watch-module.webp`, `exploded.webp` and their
sidecars. Every new raster carries a provenance sidecar that names the model,
the angle, the light and the studio.

## v0.7.0 — 2026-10-22 — the professional rebuild: a still company page

**Why.** On seeing v0.6.1 live, the user wrote: "its cute but over
simulation and doesn't seem like a professional company did it". They were
right. v0.6.0 opened inside a dark live-sweeping 6-lead display that zoomed
into the watch over 330svh of scroll-jacking. A second simulated Lead II
strip ran under the need, and the counters, strike-throughs, timeline and
callouts all drew themselves. That reads as a tech demo, not a medtech
company. The v0.6.0 entry called the scene the page's "memorable moment";
for an investor arriving cold it was noise in front of the facts.

**What it is now.** The PDF one-pager, played straight as a company homepage
at the craft level of the Withings ScanWatch, Neko Health and Apple Watch
pages (recorded in PRODUCT.md as a standing "Professional canon" commitment):
- **Hero:** "Clinical Depth. / Wearable Ease." centred, the one-pager lede, the
  red "Request the deck" and a "How it works" link. Below sit the real module
  and watch renders with the one-pager's four leader-line callouts. The pair's
  size follows the viewport's height, so most of the product shows above the
  fold on a laptop.
- **Need:** one band. "1 in 3 deaths…" sits beside the need line and the
  trade-off, with a three-way comparison under it (Smartwatch ECG · Holter
  and clinic ECG · Cyphix). Every cell restates the one-pager. On phones each
  capability becomes its own block.
- **Product:** the exploded concept render on the page's ground, annotated
  with the hero's leader-line device (module, strap, watch). On phones it is
  cropped to the module and strap. Beside the real app's limb-lead screen:
  "Sent straight to the clinician."
- **Stage, Market, Team, Request the deck:** the same facts, now still.
  - The stage line marks done and next with its dots alone.
  - The market discs stand on a floor shadow, as in the one-pager.
  - The team is set as portrait-and-name rows. The founder's standing photo is
    zoomed to head-and-shoulders so both portraits frame alike.
- **Footer:** a company footer (map, contact, small print, badge).
- **Link-preview card:** `public/og.jpg` plus `og:image` and twitter meta, so a
  pasted link shows the headline and the product.

**Motion.** One arrival on load: the headline rises, the renders settle and
the callouts draw once. After that the page holds still apart from hover
feedback. Reduced motion shows the final frame.

**Removed:** `HeroScene`, `EcgTrace`, `ecgModel`, `heroScene`, `CountUp`,
`Reveal`, `Leads`, the scroll-progress line, and the `framer-motion`
dependency. The JS bundle drops from 298 kB to 166 kB, measured against the
live v0.6.1. The footer no longer says traces are synthetic, because the page
draws none; the only traces are inside the renders and the app screenshot.

**Built with Impeccable.** The direction contract is in
`.impeccable/surfaces/src-app-tsx.md`. The build was captured at 1440, 1280×720
and 390 and checked with `impeccable detect`.

The finish reviewer judged that it "now reads as a restrained medtech company
homepage" and kept the hero as built. It returned eight fixes for the
sections below the hero, all applied:
- a dead product tile;
- one layout repeated five times;
- duplicated stage facts;
- two uncited accent uses;
- an empty team column;
- tracking below the -0.04em floor;
- a wrap on phones;
- DESIGN.md.

DESIGN.md and `.impeccable/design.json` were re-derived from the build by the
documenter.

## v0.6.1 — 2026-10-21 — deployed; the thank-you stops promising an e-mail

**Deployed for the first time:** **https://cyphix-landing.vercel.app**. The
Vercel project is `cyphix-landing` in `elio123elio1234-5098s-projects`, and
this folder is linked to it (`.vercel/`, ignored). Redeploy with
`vercel deploy --prod --yes --scope elio123elio1234-5098s-projects`.

**Why the copy changed.** v0.4.0–v0.6.0 thanked the sender with "a
confirmation is on its way to <e-mail>". The production server's `/healthz`
reports `"email":"off"`: the Resend key was never pasted into Render. So no
confirmation is sent, and the team is not mailed either. The promise was
false on the day the page went public, so it is gone. The sent state now
reads "Your request is in. We will reply to <e-mail> within a few days."

**Checked live.**
- The page, the bundle (`"0.6.1"`) and the favicon serve.
- A phone-size capture of the live site shows no overflow.
- A CORS preflight for `POST /api/v1/leads` from the new origin answers
  204 and allows it; no lead was written.
- `GET /auth/captcha` is still refused from this origin. That is harmless
  while the server's captcha is off. If Turnstile is ever switched on, add
  this origin to the server's CORS for that route, or the form cannot get
  the site key.

**Where leads go today:** the web cockpit's `/admin/leads`
(cyphixweb.vercel.app). No e-mail arrives until `RESEND_API_KEY` is set on
Render.

## v0.6.0 — 2026-10-20 — the investor redesign: "out of the screen"

**Why.** The user asked for a professional, venture-style home page for
investors, "minimalistic as in my one-pager", with the CYPHIX wordmark in
red, and the design and motion carrying it. The v0.3–v0.5 page was a
"design base": a WebGL aurora, a hand photo and a recreated report card,
with placeholder sections. None of that was the one-pager's world, and
the content spoke to clinics, not investors. This version replaces the
look entirely and keeps what worked: the lead form, the API wiring and
the wordmark.

Built with the **Impeccable** design skill (`npx impeccable install`,
project scope in `Coredex_App/.claude`). Its process ran in this order:
`PRODUCT.md` from a short product interview, a structural roll, and a
direction contract in `.impeccable/surfaces/src-app-tsx.md`. Of the dealt
structures, the user picked **"Out of the screen"**.

**What**

- **The hero is the device.** You land inside a dark CYPHIX display with
  six live limb leads (I, II, III, aVR, aVL, aVF) and the headline
  "Clinical Depth. / Wearable Ease." under them. Scrolling zooms out until
  that live display *is* the screen of the frontal watch render. The watch
  then steps right while the module render arrives on its left, and the
  one-pager's four callouts (Strap, Cyphix module, Your watch, 6-lead ECG)
  draw in. The geometry is pure arithmetic in `src/lib/heroScene.ts`: one
  uniform scale plus a clip-path crop, so the canvas never re-allocates
  mid-zoom. The display rect was measured off the render
  (56, 296, 486 × 538 px, radius ≈ 108).
- **The traces are honest.** `src/lib/ecgModel.ts` projects one synthetic
  cardiac dipole onto leads I and II, then derives III, aVR, aVL and aVF
  with Einthoven's and Goldberger's equations. Every trace is labelled
  illustrative (on the display, in the plate caption and in the footer).
  No copy interprets a signal.
- **Sections in the one-pager's order:**
  - **The need:** "1 in 3" in coral, and a full-bleed Lead II strip on a
    faint coral millimetre grid.
  - **The trade-off:** "Wearable ease ~~or~~ and clinical depth": the
    "or" is struck through and becomes "and" on view.
  - **Six leads:** the real app's limb-lead screen, drifting against the
    scroll, beside "Adhesive patches / Wires / Professional setup" being
    struck through one by one.
  - **Where we are:** the exploded render, then the four milestones on a
    line that draws to a pulsing "Next" dot.
  - **Market:** TAM/SAM as the one-pager's nested circles (equal-area
    ratio, √(2.76/4.53)), with leader lines and count-up figures, and the
    **$1.9M** seed ask beside them.
  - **The team:** both portraits.
  - **Request the deck:** the form, plus direct e-mail, phone and city.
- **The world.**
  - Ground `#F1F3F6` with soft coral and blue light.
  - Navy `#0B1A30`, coral `#F2574C`, and red `#C7362C` for the wordmark
    and the one action (white on red is 5.3:1).
  - **Sora** + **Geist Mono**, the one-pager's own faces, self-hosted as
    variable woff2 (34 KB + 23 KB), so the page makes no Google request.
  - Selection, caret, focus ring and scrollbar are themed. A coral
    scroll hairline runs under the bar, and the favicon is the red C.
- **Investor form.** Name, work e-mail, fund or company, message. The lead
  contract has no investor type yet, so the form posts `orgType: "other"`
  with the fund in `organization` (see "Not done").
- **Assets** were taken from the user's own materials:
  - From the one-pager PDF: the module render, the app screen.
  - From the investor-site reference bundle (`One-pager design
    variations.zip`): the frontal watch, the exploded view, both
    portraits.
  - All converted to WebP; the largest is 70 KB.
- **Reduced motion:** the display stands still, and the device pair
  becomes a plain figure. Every reveal starts from visible content.
- Removed: `Hero`, `WristVisual`, `EcgReportCard`, `ScaleToFit`,
  `Sections` and `hand-wrist.png`.

**Verified, and what that means.** `tsc --noEmit` and `vite build` are
clean (98 KB gzipped JS, 6 KB CSS). Headless Chrome ran two capture
rounds at 1440×900, 1280×720 and 390×844 @2x, covering the hero, five
points of the zoom and every section. It found no horizontal overflow and
no page errors. The only console error is the pre-existing CORS refusal
of `GET /auth/captcha` from localhost; the form already tolerates it.
None of this proves how the zoom *feels* on a real trackpad or phone.

**Finish review.** The Impeccable finish reviewer ran against the
screenshots and the direction contract. Its agents were installed
mid-session and do not register until a new session, so it ran as a
general-purpose agent that loaded the reviewer's own definition. It
returned "fix" with 8 items:
- the mobile end plate left a dead band below the pair;
- at 1280×720 the hero headline was smaller than the next heading;
- mono type was used beyond its roles;
- the mobile market chart had orphaned dots;
- the strip label collided with the trace;
- a "·" was left alone at the start of a wrapped line;
- the traces lost their "illustrative" label during the zoom;
- the heading-left / body-right template repeated six times.

All 8 were fixed in two rounds, and the four follow-ups were resolved.
Its last pass left one item: the founder's role line overflowed on
phones. That was fixed after the review budget ran out (the credential
gets its own line on a phone) and checked by a recapture, but the
reviewer did not score it again. `DESIGN.md` + `.impeccable/design.json`
describe the system as built, written by the Impeccable documenter.
Shipped images carry their origin in `*.webp.json` sidecars. The
detector's "overused font" note on Geist Mono is ignored for that one
value, because it is the one-pager's own face.

**Not done / follow-ups**

- **Not deployed.** No Vercel project exists for this page; `vercel --prod`
  is the user's call.
- An `investor` value for `LeadOrgType` needs a shared + server change.
- Hebrew / RTL (LAUNCH_PLAN L4) is still open.
- The Turnstile policy probe is CORS-refused from origins other than the
  server's allow-list; once deployed, check it from the real domain.

## v0.5.0 — 2026-10-10 — the new CYPHIX wordmark

**Why.** The brand changed; the header and the footer were still drawing
the 2024 lettering. `Logo.tsx` now carries the 2026-10-10 artwork,
mirroring `@cyphix/shared` v1.34.0 `brand/wordmark.ts` (this app builds
standalone and does not resolve the shared package, so the mirror is the
arrangement — an edit belongs in both).

`.brand-logo` sizes by **height** (22px), so the header and footer rows do
not move; the new mark is simply ~16 % wider on the same line, its aspect
being 4.81 against the old crop's 4.14.

**Not deployed.** This page has not been put on Vercel since v0.4.0 — the
version badge will not show the change until someone ships it.

## v0.4.0 — 2026-10-09 — "Request access" is a real form (LAUNCH_PLAN 5.4, L1)

**Why:** every CTA on the page said "Request access" and scrolled to a footer
with no form, no address and no phone (hole L1 in the launch plan). The
server now has a door for exactly this (`POST /api/v1/leads`, v0.23.0).

**What**

- New `ContactForm` section (`#contact`) between the closing CTA and the
  footer: full name, work e-mail, "I am" (clinic / hospital / private
  practice / patient / other), organization (optional), message (optional).
  Posts a lead with `source: "landing"`; the server thanks the sender by
  e-mail and tells the team. A "sent" state replaces the form; errors are
  said plainly (a bad field, too many requests, no connection).
- Bot protection is the server's decision: the form asks `GET /auth/captcha`
  and renders Cloudflare's Turnstile widget only when the policy names a
  provider. Nothing is loaded otherwise — the page stays dependency-free.
- The API base is `https://cyphix-api.onrender.com` by default
  (`VITE_API_BASE_URL` overrides it). The server answers this route from
  any origin, so the page can live on whatever domain it is deployed to.
- The footer is `#footer` now; `#contact` is the form.
- The form says what it is for: access requests, no medical details.

**Not done:** Hebrew / RTL (L4), the sign-in and store links (L2), legal
links (L3) — separate items in the launch plan.

## v0.3.1 — 2026-08-24 — Fit fix: clip overflow + true centering

**Why:** v0.3.0 looked right in a raw browser window but broke when viewed
through the published Artifact (and on mid-width windows): the headline was
clipped and the report card ran off the right edge. Root cause — `transform:
scale()` shrinks a block *visually* but it still occupies its full natural
width (1112px) in layout. On any box narrower than that, the block overflowed,
widened the document, and broke centering. My earlier checks only used a raw
`file://` window, which hid the bug — that was the miss.

**Fix**

- The scale wrapper now `overflow: hidden`s the clipped layout width and
  centers with an explicit `translateX` (origin top-left) instead of auto
  margins (which can't center a child wider than its container).
- Added `overflow-x: hidden` on `html` as a belt-and-suspenders guard.
- Verified with automated checks at 1920, 1440, 1280, 1100, 1000, 900,
  a tall auto-height-iframe simulation, and mobile: **zero horizontal
  overflow, card never cut, composition centered, hero fits the fold** at
  every one.

## v0.3.0 — 2026-08-24 — Scale-to-fit hero (fits any screen)

**Why:** on a smaller laptop the hero was oversized — the headline filled the
screen and the wrist→ECG images fell below the fold. The ask: it should fit the
screen width on any laptop, "headline on top and the images below it," visible
together — exactly how the handoff reference scaled its whole block to fit.

**Changes**

- New `ScaleToFit` wrapper. The entire hero (headline + subhead + CTAs + the
  wrist→arrow→report composition + disclaimer) is one fixed-width block that
  **scales down uniformly to fit both the viewport width and the remaining
  height**, capped at 1:1 so big screens stay crisp. Verified fitting the fold
  at 1280×800, 1366×768, 1440×900, 1536×864 with zero horizontal overflow.
- Below 820px it steps aside: the composition stacks (hand → down-arrow →
  card) with the normal responsive layout.
- The showcase is now a tight, fixed composition (hand 520 · arrow 110 ·
  card 450) instead of a loose flex row that drifted apart on wide screens.

## v0.2.0 — 2026-08-24 — Clean light redesign (reference-matched)

**Why:** v0.1.0 opened on a dark-navy hero with a WebGL "aurora." The reference
is a **white, clean** section, and that dark treatment read as heavy and
overdone — the opposite of the brief. Corrected.

**Changes**

- Hero is now **white**, matching the reference: navy headline, gray subhead,
  the pink→magenta gradient on the "6-lead ECG report" keyword only.
- **Removed the WebGL background** entirely (`MeshBackground` deleted) — no more
  "smoke." Animations are now only subtle fade/rise reveals, the ECG print-in,
  and the arrow's signal flow.
- All sections lightened to a cohesive white / `#f7f9fc` system; report card
  keeps the reference's soft shadow (dropped the teal glow) and the floaty bob.
- Buttons: navy solid primary + light ghost secondary.
- **Fixed** a real mobile bug: `.showcase-hand`'s `flex-basis: 560px` was
  becoming a 560px *height* in the stacked column layout, leaving ~400px of dead
  space between the hand and the card. Reset to `flex: 0 0 auto` on mobile.

**Verified:** `tsc --noEmit` + `vite build` pass; screenshotted clean at desktop
(1440) and mobile (390) with zero horizontal overflow and the gap gone.

## v0.1.0 — 2026-08-24 — Design base

First cut of the investor landing page. **Design over content:** the layout and
motion are the deliverable; real copy is injected in a later pass.

**Why this shape**

- The opening follows the handoff reference (`Wrist to ECG.dc.html`): the hero is
  the wrist → signal arrow → 6-lead ECG report story, with the exact report card
  (patient meta, six lead traces on grid paper, AI-ECG conclusion) recreated.
- Reference art is a light section; we open on **deep navy** instead so the brand
  color leads and a WebGL aurora has room to breathe — premium, not "vibe-coding."
  The white report card floats on the navy with a soft glow.

**What's in it**

- Hero: eyebrow chip, headline with the pink→magenta gradient keyword, subhead,
  two CTAs, and the animated wrist→ECG showcase (staged entrance; leads print in
  row-by-row; arrow signal flows).
- WebGL: a hand-written GLSL aurora (`MeshBackground`) — fbm + domain warp, DPR
  capped at 1.5, pauses off-screen / hidden / on reduced-motion, CSS fallback.
- Scroll-aware fixed header (transparent on the dark hero → light glass on scroll)
  with the real Cyphix wordmark (extracted from the brand SVG, recolorable).
- Placeholder scaffolding below the hero (stats strip, three feature cards, closing
  CTA, footer) so the page reads as complete. Copy is intentionally light.
- Fully responsive: on mobile the showcase stacks and the arrow rotates to point
  down; type scales with `clamp()`; targets stay large.

**Verified:** `tsc --noEmit` + `vite build` pass (well-formed + bundles). Motion
and layout still need a human eye on real devices.
