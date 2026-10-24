# CYPHIX — Landing Page

Investor-facing home page for CYPHIX, a wearable 6-lead ECG on the watch you
already wear. Live at **https://cyphix-landing.vercel.app**.

Since v0.9.0 the page follows alivecor.com's structure in Cyphix's colours, with four
photograph slots generated in Gemini (prompts and reference images in `gemini/`;
wire one in via `src/config/photos.ts`). Since v0.8.0 every product image is rendered from the team's own 3D model
(`public/models/cyphix.glb`). The page closes on a live WebGL scene, "One strap. Any
watch.", showing the four ways to wear it:
1. On a smartwatch, the strap turns as you scroll.
2. The watch lifts out, and the strap closes into a bracelet.
3. An analog watch clicks into the same strap.
4. The Cyphix watch (the team's Contour) takes its place.

The user's own images carry the page:
- the hero: the raised forearm, and the CYPHIX app on a tablet;
- beside "1 in 3": a physician reviewing a recording;
- "Our solution": the four-watch image, cut per watch.

The "More than an ECG" section was removed in v0.13.0. The hero's tablet is built,
not generated: `HeroTablet.tsx` draws the CYPHIX screen live as SVG (data in
`lib/tabletScreen.ts`) under the user's frame (`tablet-frame.webp`).

## Stack

- **Vite + React + TypeScript** (static SPA)
- Plain CSS for the one load arrival (no animation library)
- **three.js 0.169** for the closing scene, in its own lazy chunk (`src/lib/strapScene.ts`),
  loading the meshopt-compressed GLB from `public/models/`. It is built ahead of time, once the
  page has loaded and the browser is idle (every shader compiled, every texture uploaded), and it
  moves with the scroll in one frame loop with the copy (`OneStrap.tsx`): the watches unclip and
  rise out, the strap closes into a bracelet, the analog clicks in, the Cyphix watch rises in
- **Sora** + **Geist Mono** self-hosted from `src/assets/fonts` (no external requests)

## Run locally

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # tsc --noEmit + vite build → dist/
npm run preview    # serve the production build
```

## Deploy (Vercel)

Zero-config (`vercel.json` pins Vite). The folder is linked to the Vercel
project `cyphix-landing`:

```bash
vercel deploy --prod --yes --scope elio123elio1234-5098s-projects
```

## The "Request the deck" form

`src/components/ContactForm.tsx` posts a lead to the CYPHIX API
(`POST {API_BASE_URL}/api/v1/leads`, see `src/config/api.ts`; the production
server by default, `VITE_API_BASE_URL` to override) with `orgType: "other"`
and `source: "landing"`. The server decides whether a CAPTCHA is needed
(`GET /api/v1/auth/captcha`); the Turnstile widget is rendered only when it
says so.

## Structure

```
src/
  App.tsx                 the home page: bar · hero · facts · need · solution · who · stage · team · form · footer
  pages/                  the pages behind "Explore" in the bar, each its own document (technology.html …):
    OneStrapPage.tsx      /one-strap: the 3D journey, then the form
    Technology.tsx        /technology: how it works, the multi-element array (from the investor deck)
    Investors.tsx         /investors: the need, today's compromise, market, model, what's done, what's next
  entries/                one entry per page document
  config/nav.ts           the site map shared by the bar and the footer
  index.css               the whole design system (tokens, sections, tablet, phone, the arrival)
  components/
    Hero.tsx              headline beside the 3D render of the strap on a smartwatch
    Need.tsx              1 in 3, then the three-way comparison
    Product.tsx           "Our solution": the user's four watches (hover grows one) under the navy card
    OneStrap.tsx          the closing journey: copy left, the product right, four chapters, the day and the clinician's live screen; still fallback
    PageHead.tsx          the head of a page behind "Explore" (the hero's slate band, left-aligned)
    NextLinks.tsx         the other pages, as two wide links before the form
    Header / Stage / Team / ContactForm / Footer / Icons / Logo
  lib/usePopover.ts       the bar's panels (the phone's number, Explore): click, click outside, Escape
  lib/strapScene.ts       the scroll-driven three.js scene: render(p), every part moving physically
  assets/img              renders of the 3D model (with provenance sidecars) + portraits + app screen
  assets/deck             pictures from the user's investor deck (the prototype, its band, two strips), with sidecars
public/models/cyphix.glb  the team's 3D model: strap, smartwatch, analog, contour (one origin)
  assets/fonts            Sora + Geist Mono variable woff2 (OFL)
public/og.jpg             the 1200×630 link-preview card
PRODUCT.md                product truth for design work (Impeccable)
DESIGN.md                 the visual system as built (Impeccable)
.impeccable/surfaces/     the page's surface brief + direction contract
```

## The 3D model and its renders

`public/models/cyphix.glb` was built from the three-d-stage export
`cyphix-ecg-straps (1).obj`. It holds four groups that share one origin:
- `strap`
- `smartwatch`
- `analog`
- `contour`, the Cyphix watch, moved from the OBJ's far right onto the same origin

The scene moves the groups by name. The closing band that turns the strap into a
bracelet is built at load time from the strap's own cut ends. As it closes, the whole
strap bends to the oval of the team's own closed band (`woven_band_band` in the OBJ,
kept as a centreline table, `CLOSED_BAND` in `studio.ts`). If the
model changes, re-export the same four groups, and re-render the stills
(`render-hero`, `scene-*`). Their sidecars record each one's angle
and light.
<!-- v0.19.0 — the tablet screen is live SVG (HeroTablet.tsx); tools/tablet removed -->
<!-- v0.18.0 — tools/tablet builds the hero tablet: the user's frame with the CYPHIX screen drawn in HTML -->
<!-- v0.15.0 — HowItWorks.tsx and render-module.webp removed at the user's request -->
<!-- v0.14.0 — Compare.tsx ("Why Cyphix") and Market.tsx removed at the user's request -->
<!-- v0.13.0 — Sensors.tsx and lib/vitals.ts removed; the user's images in the hero, beside "1 in 3" and in "Our solution" -->
<!-- v0.12.0 — the user's images in the hero and "Our solution"; the sensors section as charts (lib/vitals.ts) -->
<!-- v0.10.1 — the bracelet bends to the team's closed band -->
<!-- v0.10.0 — four ways to wear it; the contour group; Sensors.tsx -->
<!-- v0.9.0 — AliveCor-style layout; gemini/ prompts and the photo slots -->
<!-- v0.35.0 — the pages behind "Explore": pages/, entries/, config/nav.ts, assets/deck -->
<!-- v0.33.0 — the journey reset to v0.27.0 (lib/strapScene back, strapStory removed) -->
<!-- v0.31.0 — the product in place, lit out of the dark -->
<!-- v0.30.0 — the dark moment is plain scroll past a column of products -->
<!-- v0.29.0 — the closing scene is the calm dark moment (lib/strapStory) -->
<!-- v0.27.0 — the closing scene is a five-chapter journey -->
<!-- v0.26.0 — the closing scene is built ahead at idle and glides with the scroll -->
<!-- v0.8.0 — the 3D model, the closing scene, three.js, how to re-render -->
<!-- v0.7.0 — the professional rebuild: no animation library, the frame-mapped callouts, the og card, the deploy command -->
<!-- v0.6.0 — the investor redesign: stack, structure, and how the hero finds the watch screen -->
