# Changelog — CYPHIX Landing

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
