import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

// CYPHIX landing — Vite + React.
// Default build → multi-file static SPA (Vercel).
// SINGLE=1 build → one self-contained index.html (offline / artifact preview):
//   CSS, JS, and the hero image are all inlined as data URIs.
const single = process.env.SINGLE === "1";

export default defineConfig({
  plugins: [react(), ...(single ? [viteSingleFile()] : [])],
  build: {
    target: "es2019",
    cssTarget: "chrome80",
    sourcemap: false,
    outDir: single ? "dist-single" : "dist",
    assetsInlineLimit: single ? 100_000_000 : 4096,
    // three.js lives in its own lazy chunk (lib/strapScene), loaded only by the /one-strap page
    chunkSizeWarningLimit: 700,
    // one document per page: the home page, and the three behind "Explore" (served without the
    // extension: vercel.json's cleanUrls). The single-file build stays the home page alone.
    rollupOptions: single
      ? undefined
      : {
          input: {
            main: "index.html",
            technology: "technology.html",
            investors: "investors.html",
            "one-strap": "one-strap.html",
          },
        },
  },
});

// v0.35.0 — four documents: the home page, /technology, /investors and /one-strap
// v0.8.0 — the lazy three.js chunk is expected; warning limit raised to 700 kB
