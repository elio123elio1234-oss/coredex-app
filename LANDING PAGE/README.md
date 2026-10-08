# CYPHIX — Landing Page

Investor-facing landing page for the CYPHIX wrist-ECG concept. **Design base:**
the layout, motion, and WebGL are in place; real content is injected later.

## Stack

- **Vite + React + TypeScript** (static SPA)
- **framer-motion** for entrance + scroll reveals
- Hand-written **WebGL** aurora background (no 3D library)
- System font stack; no external fonts, no runtime dependencies beyond React

## Run locally

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # tsc --noEmit + vite build → dist/
npm run preview    # serve the production build
```

## Deploy (Vercel)

Zero-config — Vercel auto-detects Vite (`vercel.json` pins it explicitly).

```bash
vercel        # preview
vercel --prod # production
```

## Structure

```
src/
  App.tsx                 shell: header · hero · sections · footer
  index.css               design system (tokens, layout, responsive)
  components/
    Header.tsx            scroll-aware fixed header
    Hero.tsx              headline, CTAs, showcase
    WristVisual.tsx       hand → arrow → report (staged entrance)
    EcgReportCard.tsx     recreated 6-lead ECG report card
    MeshBackground.tsx    WebGL aurora (GLSL)
    Sections.tsx          placeholder scaffolding (stats/features/CTA)
    Footer.tsx            brand + version badge
    Logo.tsx              Cyphix wordmark (from brand SVG)
public/
  assets/hand-wrist.png   hero render (transparent PNG)
  favicon.svg
```

Reference: `Landing page hand section-handoff` (Claude Design export).
