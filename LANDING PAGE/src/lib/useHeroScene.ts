import { useEffect, useRef } from "react";

/* The home page's opening as a short scroll scene. The stage holds under the bar while the
   visitor scrolls through its wrapper, in three beats:

     the opening   the slate hero as it always was
     the moment    a dissolve in turns, so nothing is ever seen through anything else: the hero's
                   copy, hand and tablet fade out on the slate; the day's light fades in; the
                   clinician's screen fades in, already writing; "The moment, in your hands."
                   follows, rising a few pixels
     the swap      a step further the line changes, plainly, to "on your hand."; then the page
                   scrolls on

   Fades, nothing more: nothing in the hero moves, nothing flies, nothing is drawn over the
   scene. (v0.37.0 opened a white circle of light: "hard on the eye, 2005"; v0.37.1 lowered the
   hand and glided the tablet: "childish, not a medical startup". The user: something gentle.)
   The swap is a switch, not a scrub, so it reads as a change and never stops half-way. Scrolling
   back undoes each beat. */

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/* beats, as progress through the wrapper's travel */
const OUT = [0.06, 0.18] as const; // the hero's copy, hand and tablet fade out
const LIGHT = [0.16, 0.3] as const; // the day's light fades in
const SCREEN = [0.26, 0.4] as const; // the clinician's screen fades in
const COPY = [0.32, 0.46] as const; // the line fades in, rising a few pixels
export const SWAP_AT = 0.64; // "in your hands" → "on your hand"

export function useHeroScene() {
  const pin = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const moment = useRef<HTMLElement>(null);

  useEffect(() => {
    const wrap = pin.current;
    const box = stage.current;
    const scene = moment.current;
    if (!wrap || !box || !scene) return;
    const hero = Array.from(
      box.querySelectorAll<HTMLElement>(".hero .hero-copy, .hero .hero-arm, .hero .hero-system, .hero .media-note"),
    );
    const bg = scene.querySelector<HTMLElement>(".hm-bg");
    const screen = scene.querySelector<HTMLElement>(".hm-media");
    const words = scene.querySelector<HTMLElement>(".hm-copy");
    let raf = 0;
    let swapped = false;
    let shown = false;

    const draw = () => {
      raf = 0;
      const r = wrap.getBoundingClientRect();
      const s = box.getBoundingClientRect();
      const travel = r.height - s.height;
      const p = travel > 0 ? clamp01((s.top - r.top) / travel) : 0;

      const out = smooth(OUT[0], OUT[1], p);
      const light = smooth(LIGHT[0], LIGHT[1], p);
      const shine = smooth(SCREEN[0], SCREEN[1], p);
      const rise = smooth(COPY[0], COPY[1], p);
      hero.forEach((el) => (el.style.opacity = String(1 - out)));

      // out of the layout until it begins to fade in, so its monitor starts as it appears
      const on = light > 0;
      if (on !== shown) {
        shown = on;
        scene.style.display = on ? "" : "none";
        scene.setAttribute("aria-hidden", on ? "false" : "true");
      }
      if (on) {
        if (bg) bg.style.opacity = String(light);
        if (screen) screen.style.opacity = String(shine);
        if (words) {
          words.style.opacity = String(rise);
          words.style.translate = `0 ${((1 - rise) * 8).toFixed(1)}px`;
        }
      }

      const swap = p >= SWAP_AT;
      if (swap !== swapped) {
        swapped = swap;
        scene.classList.toggle("is-swapped", swap);
      }
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(draw);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    draw();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return { pin, stage, moment };
}

// v0.37.2 — fades in turns: the hero's content out, the light in, the screen in, the line in; nothing moves
// v0.37.1 — no white circle: the hand lowers, the tablet glides into the scene, the light changes behind it
// v0.37.0 — the opening as a scroll scene: the hero, the light and the clinician's screen, the swap to "on your hand"
