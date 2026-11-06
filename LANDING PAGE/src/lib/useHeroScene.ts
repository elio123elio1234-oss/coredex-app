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
const OUT = [0.12, 0.24] as const; // after a hold on the whole hero: its copy, hand and tablet fade out
const LIGHT = [0.22, 0.34] as const; // the day's light fades in
const SCREEN = [0.3, 0.42] as const; // the clinician's screen fades in
const COPY = [0.36, 0.48] as const; // the line fades in, rising a few pixels
export const SWAP_AT = 0.66; // "in your hands" → "on your hand"

/* the slide: on wide screens both scenes are laid out once at this size and scaled to the stage
   as a whole, so every zoom and window shows the same composition (index.css, .hero-slide) */
const SLIDE_W = 1440;
const SLIDE_H = 828;
/* the slide's top is empty slate (the hero's copy starts 215 px down); on a short window up to 180
   px of it is cropped rather than the whole slide shrunk to fit (v0.37.3 shrank it, and on a
   laptop's wide, short window everything came out smaller: the user, "worse and smaller") */
const SLIDE_SPARE = 180;

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
    const bg = box.querySelector<HTMLElement>(".hm-bg");
    const screen = scene.querySelector<HTMLElement>(".hm-media");
    const words = scene.querySelector<HTMLElement>(".hm-copy");
    let raf = 0;
    let swapped = false;
    let shown = false;

    const fit = () => {
      const k = Math.min(box.clientWidth / SLIDE_W, box.clientHeight / (SLIDE_H - SLIDE_SPARE));
      box.style.setProperty("--k", k.toFixed(4));
    };

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
    const onResize = () => {
      fit();
      onScroll();
    };
    window.addEventListener("resize", onResize);
    fit();
    draw();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return { pin, stage, moment };
}

// v0.37.4 — the slide crops its empty top on short windows instead of shrinking
// v0.37.3 — the slide's scale (--k) from the stage; a longer hold on the whole hero before the fades
// v0.37.2 — fades in turns: the hero's content out, the light in, the screen in, the line in; nothing moves
// v0.37.1 — no white circle: the hand lowers, the tablet glides into the scene, the light changes behind it
// v0.37.0 — the opening as a scroll scene: the hero, the light and the clinician's screen, the swap to "on your hand"
