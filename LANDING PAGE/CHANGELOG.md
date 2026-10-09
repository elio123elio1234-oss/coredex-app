# Changelog — CYPHIX Landing

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
