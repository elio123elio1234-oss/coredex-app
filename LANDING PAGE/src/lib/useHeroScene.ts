import { useEffect, useRef } from "react";

/* The home page's opening as a short scroll scene. The stage holds under the bar while the
   visitor scrolls through its wrapper, in three beats:

     the opening   the slate hero as it always was
     the moment    light opens out of the hero's tablet and fills the stage; the clinician's
                   screen rises in it, already writing: "The moment, in your hands."
     the swap      a step further, the line changes, plainly, to "on your hand."; then the page
                   scrolls on

   The light and the rise follow the scroll; the swap is a switch, not a scrub, so it reads as
   a change and never stops half-way. Scrolling back undoes each beat. */

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/* beats, as progress through the wrapper's travel */
const LIGHT = [0.1, 0.36] as const; // the light opens
const RISE = [0.2, 0.42] as const; // the tablet and the line rise
export const SWAP_AT = 0.62; // "in your hands" → "on your hand"

export function useHeroScene() {
  const pin = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const moment = useRef<HTMLElement>(null);

  useEffect(() => {
    const wrap = pin.current;
    const box = stage.current;
    const scene = moment.current;
    if (!wrap || !box || !scene) return;
    let raf = 0;
    let swapped = false;
    let shown = false;

    const draw = () => {
      raf = 0;
      const r = wrap.getBoundingClientRect();
      const s = box.getBoundingClientRect();
      const travel = r.height - s.height;
      const p = travel > 0 ? clamp01((s.top - r.top) / travel) : 0;

      const light = smooth(LIGHT[0], LIGHT[1], p);
      const rise = smooth(RISE[0], RISE[1], p);
      const on = light > 0;
      if (on !== shown) {
        shown = on;
        // out of the layout until the light opens, so its monitor starts as it appears
        scene.style.display = on ? "" : "none";
        scene.setAttribute("aria-hidden", on ? "false" : "true");
      }
      if (on) {
        // the light opens where the hero's tablet stands
        const t = box.querySelector(".hero .hero-system")?.getBoundingClientRect();
        const cx = t && t.width ? t.left + t.width / 2 - s.left : s.width * 0.7;
        const cy = t && t.height ? t.top + t.height / 2 - s.top : s.height * 0.5;
        const far = Math.hypot(Math.max(cx, s.width - cx), Math.max(cy, s.height - cy));
        const rad = light * (far + 160);
        const mask =
          light >= 1
            ? "none"
            : `radial-gradient(circle at ${cx.toFixed(0)}px ${cy.toFixed(0)}px, #000 ${Math.max(0, rad - 160).toFixed(0)}px, transparent ${rad.toFixed(0)}px)`;
        scene.style.maskImage = mask;
        scene.style.setProperty("-webkit-mask-image", mask);
        scene.style.setProperty("--rise", rise.toFixed(3));
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

// v0.37.0 — the opening as a scroll scene: the hero, the light and the clinician's screen, the swap to "on your hand"
