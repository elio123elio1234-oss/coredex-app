# CYPHIX — Landing Page

Investor-facing home page for CYPHIX, a wearable 6-lead ECG on the watch you
already wear. Since v0.7.0 it is the PDF one-pager played straight as a company
homepage: real renders, still sections, one quiet arrival on load and no
simulated signal. Live at **https://cyphix-landing.vercel.app**.

## Stack

- **Vite + React + TypeScript** (static SPA)
- Plain CSS for the one load arrival (no animation library)
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
    Hero.tsx              headline, the product pair with its callouts, the facts row
    Need.tsx              1 in 3, then the three-way comparison
    Product.tsx           exploded render, wear · record · send, the app's limb-lead view
    Header / Stage / Market / Team / ContactForm / Footer / Icons / Logo
  assets/img              WebP renders + portraits (from the user's one-pager materials)
  assets/fonts            Sora + Geist Mono variable woff2 (OFL)
public/og.jpg             the 1200×630 link-preview card
PRODUCT.md                product truth for design work (Impeccable)
DESIGN.md                 the visual system as built (Impeccable)
.impeccable/surfaces/     the page's surface brief + direction contract
```

## Changing the hero

The product pair lives in a 1200 × 520 frame (`Hero.tsx`). Each callout dot
is a point on a render mapped into that frame. If a render is replaced,
re-measure the strap, electrode, case and screen points, or the dots will
miss the product.
<!-- v0.7.0 — the professional rebuild: no animation library, the frame-mapped callouts, the og card, the deploy command -->
<!-- v0.6.0 — the investor redesign: stack, structure, and how the hero finds the watch screen -->
