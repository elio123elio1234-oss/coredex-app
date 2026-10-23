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
    // three.js lives in its own lazy chunk (lib/strapScene), loaded only near the closing scene
    chunkSizeWarningLimit: 700,
  },
});

// v0.8.0 — the lazy three.js chunk is expected; warning limit raised to 700 kB
