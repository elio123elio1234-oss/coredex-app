// Cyphix wordmark — the 2026-10-10 artwork, recolorable via currentColor.
// Mirrors `@cyphix/shared` brand/wordmark.ts (this app is built on its own and
// does not resolve the shared package); an edit belongs in both.
import type { CSSProperties } from "react";

type Props = { className?: string; style?: CSSProperties; title?: string };

export default function Logo({ className, style, title = "Cyphix" }: Props) {
  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 346 72"
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{title}</title>
      <path fill="currentColor" d="M65.36 19.19 C60.25 7.51 49.44 0.68 34.81 0.68 C14.92 0.68 0.31 15.76 0.31 36.3 C0.31 56.84 14.92 71.92 34.81 71.92 C49.47 71.92 60.29 65.07 65.39 53.35 L58.74 50.81 C54.64 60.21 46.19 65.69 34.81 65.69 C19.51 65.69 7.47 52.74 7.47 36.3 C7.47 19.86 19.51 6.91 34.81 6.91 C46.09 6.91 54.5 12.31 58.63 21.57Z M67.26 1.88 L75.36 1.88 L97.81 37.25 L120.03 1.88 L128.09 1.88 L101.42 44.33 L101.42 70.72 L94.22 70.72 L94.22 44.34Z M132.75 27.44 L132.75 24.68 C132.75 10 141.97 1.28 157.5 1.28 C173.03 1.28 182.26 10 182.26 24.68 C182.26 36.78 172.74 45.54 159.57 45.54 L154.27 45.54 C145.7 45.54 139.96 51.05 139.96 59.27 L139.96 70.72 L132.6 70.72 L132.6 59.27 C132.6 47.14 141.15 39.24 154.27 39.24 L159.57 39.24 C168.22 39.24 174.9 32.89 174.9 24.68 C174.9 13.86 168.51 7.58 157.5 7.58 C146.49 7.58 140.11 13.86 140.11 24.68 L140.11 27.44Z M201.59 32.17 L201.59 1.88 L194.43 1.88 L194.43 70.72 L201.59 70.72 L201.59 38.44 L243.38 38.44 L243.38 70.72 L250.54 70.72 L250.54 1.88 L243.38 1.88 L243.38 32.17Z M267.67 1.88 L274.82 1.88 L274.82 70.72 L267.67 70.72Z M344.19 1.88 L335.66 1.88 L315.17 29.47 L294.7 1.88 L286.03 1.88 L310.83 35.31 L284.54 70.72 L293.08 70.72 L315.1 41.06 L337.09 70.72 L345.77 70.72 L319.44 35.22Z" />
    </svg>
  );
}

// v0.5.0 — The 2026-10-10 lettering-only wordmark, tight viewBox 0 0 346 72.
//           Aspect 4.81 vs the old 4.14 — `.brand-logo` is sized by HEIGHT
//           (22px), so the header/footer rows do not move; the mark is simply
//           ~16 % wider on the same line.
// v0.1.0 — Cyphix wordmark component (inline SVG, currentColor)
