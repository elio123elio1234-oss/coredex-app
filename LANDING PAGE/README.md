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

Since v0.12.0, "More than an ECG" shows what the module measures as charts: a 6-lead
strip, a day of heart rate and a night of skin temperature. The data is illustrative,
built in `src/lib/vitals.ts`. The hero holds the user's own images (the raised forearm
and the CYPHIX app on a tablet), and "Our solution" shows the user's four-watch image,
cut per watch.

## Stack

- **Vite + React + TypeScript** (static SPA)
- Plain CSS for the one load arrival (no animation library)
- **three.js 0.169** for the closing scene, in its own lazy chunk (`src/lib/strapScene.ts`),
  loading the meshopt-compressed GLB from `public/models/`
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
  App.tsx                 bar · hero · need · product · stage · market · team · form · footer
  index.css               the whole design system (tokens, sections, tablet, phone, the arrival)
  components/
    Hero.tsx              headline beside the 3D render of the strap on a smartwatch
    Need.tsx              1 in 3, then the three-way comparison
    Product.tsx           the strap from behind with callouts, the app's limb-lead view
    OneStrap.tsx          "One strap. Any watch." — sticky dark stage, lazy WebGL, still fallback
    Sensors.tsx           "More than an ECG" — a 6-lead strip, a day of heart rate, a night of skin temperature
  lib/vitals.ts           the illustrative data behind those charts (fixed anchors, seeded noise)
    Header / Stage / Market / Team / ContactForm / Footer / Icons / Logo
  lib/strapScene.ts       the scroll-driven three.js scene (turn, lift, hold, drop)
  assets/img              renders of the 3D model (with provenance sidecars) + portraits + app screen
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
(`render-hero`, `render-module`, `scene-*`). Their sidecars record each one's angle
and light. The callout dots in `Product.tsx` are points projected from the model
into `render-module.webp`; re-project them if that render changes.
<!-- v0.12.0 — the user's images in the hero and "Our solution"; the sensors section as charts (lib/vitals.ts) -->
<!-- v0.10.1 — the bracelet bends to the team's closed band -->
<!-- v0.10.0 — four ways to wear it; the contour group; Sensors.tsx -->
<!-- v0.9.0 — AliveCor-style layout; gemini/ prompts and the photo slots -->
<!-- v0.8.0 — the 3D model, the closing scene, three.js, how to re-render -->
<!-- v0.7.0 — the professional rebuild: no animation library, the frame-mapped callouts, the og card, the deploy command -->
<!-- v0.6.0 — the investor redesign: stack, structure, and how the hero finds the watch screen -->
