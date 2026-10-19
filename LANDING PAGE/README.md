# CYPHIX — Landing Page

Investor-facing home page for CYPHIX, a wearable 6-lead ECG on the watch you
already wear. It is the PDF one-pager at web scale. Since v0.6.0 the hero
zooms **out of a live 6-lead display into the watch**.

## Stack

- **Vite + React + TypeScript** (static SPA)
- **framer-motion** for scroll progress, reveals and count-ups
- Canvas for the ECG traces (`EcgTrace`), no chart library
- **Sora** + **Geist Mono** self-hosted from `src/assets/fonts` (no external requests)

## Run locally

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # tsc --noEmit + vite build → dist/
npm run preview    # serve the production build
```

## Deploy (Vercel)

Zero-config (`vercel.json` pins Vite). Deploying is the owner's call:

```bash
vercel        # preview
vercel --prod # production
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
  App.tsx                 bar · hero scene · need · six leads · stage · market · team · form · footer
  index.css               the whole design system (tokens, sections, compact, reduced motion)
  lib/
    heroScene.ts          geometry of the zoom (layout per viewport + one frame per scroll value)
    ecgModel.ts           illustrative dipole model; III/aVR/aVL/aVF derived from I and II
  components/
    HeroScene.tsx         the sticky "out of the screen" scene + callouts
    EcgTrace.tsx          canvas leads: "sweep" (monitor) or "scroll" (watch strip)
    Header.tsx            red wordmark, anchors, the deck pill, scroll hairline
    Need / Leads / Stage / Market / Team / ContactForm / Footer
    CountUp, Reveal, Icons, Logo
  assets/img              WebP renders + portraits (from the user's one-pager materials)
  assets/fonts            Sora + Geist Mono variable woff2 (OFL)
PRODUCT.md                product truth for design work (Impeccable)
DESIGN.md                 the visual system as built (Impeccable)
.impeccable/surfaces/     the page's surface brief + direction contract
```

## Changing the hero

The watch render's display rectangle is hard-coded in `WATCH.screen` in
`src/lib/heroScene.ts` (image px of `watch-front.webp`). If the render is
replaced, re-measure it, or the live display will no longer land on the
watch's screen.
<!-- v0.6.0 — the investor redesign: stack, structure, and how the hero finds the watch screen -->
