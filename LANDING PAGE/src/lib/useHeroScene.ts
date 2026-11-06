import { useEffect, useRef } from "react";

/* The home page's opening as a short scroll scene. The stage holds under the bar while the
   visitor scrolls through its wrapper, in four beats:

     the opening   the slate hero as it always was
     clearing      the hand lowers out of the band and the copy fades
     the moment    the tablet itself carries the scene: it glides from its place in the hero to
                   its place beside the new line, growing, while the slate turns to the day's
                   light behind it; "The moment, in your hands." rises in, the screen already
                   writing
     the swap      a step further the line changes, plainly, to "on your hand."; then the page
                   scrolls on

   No light, mask or overlay is drawn over the scene (v0.37.0 opened a white circle; the user
   found it hard on the eye and dated). The glide is one element moving, measured from where the
   hero's tablet stands to where the scene's stands. The swap is a switch, not a scrub, so it reads
   as a change and never stops half-way. Scrolling back undoes each beat. */

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/* beats, as progress through the wrapper's travel */
const CLEAR = [0.04, 0.2] as const; // the hand lowers, the copy fades
const GLIDE = [0.2, 0.46] as const; // the tablet glides, the light changes
const COPY = [0.36, 0.52] as const; // the new line rises
export const SWAP_AT = 0.66; // "in your hands" → "on your hand"

export function useHeroScene() {
  const pin = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const moment = useRef<HTMLElement>(null);

  useEffect(() => {
    const wrap = pin.current;
    const box = stage.current;
    const scene = moment.current;
    if (!wrap || !box || !scene) return;
    const q = <T extends Element>(root: Element, sel: string) => root.querySelector<T>(sel);
    const copy = q<HTMLElement>(box, ".hero .hero-copy");
    const arm = q<HTMLElement>(box, ".hero .hero-arm");
    const note = q<HTMLElement>(box, ".hero .media-note");
    const from = q<HTMLElement>(box, ".hero .hero-system"); // the hero's tablet
    const bg = q<HTMLElement>(scene, ".hm-bg");
    const media = q<HTMLElement>(scene, ".hm-media"); // where the scene's tablet stands
    const to = q<HTMLElement>(scene, ".hm-media .hero-system");
    const words = q<HTMLElement>(scene, ".hm-copy");
    let raf = 0;
    let swapped = false;
    let shown = false;

    const draw = () => {
      raf = 0;
      const r = wrap.getBoundingClientRect();
      const s = box.getBoundingClientRect();
      const travel = r.height - s.height;
      const p = travel > 0 ? clamp01((s.top - r.top) / travel) : 0;

      const clear = smooth(CLEAR[0], CLEAR[1], p);
      const glide = smooth(GLIDE[0], GLIDE[1], p);
      const rise = smooth(COPY[0], COPY[1], p);

      // the hero clears: the hand lowers out of the band, the copy and the note fade
      if (copy) {
        copy.style.opacity = String(1 - clear);
        copy.style.translate = `0 ${(-clear * 16).toFixed(1)}px`;
      }
      if (arm) {
        // whole, not see-through over the tablet: it lowers out of the band and fades only at the end
        arm.style.opacity = String(1 - smooth(0.6, 1, clear));
        arm.style.translate = `0 ${(clear * 105).toFixed(2)}%`;
      }
      if (note) note.style.opacity = String(1 - clear);

      // the scene takes over once the tablet begins to move; until then it is out of the layout,
      // so its monitor starts as it appears
      const on = p >= GLIDE[0];
      if (on !== shown) {
        shown = on;
        scene.style.display = on ? "" : "none";
        scene.setAttribute("aria-hidden", on ? "false" : "true");
        if (from) from.style.visibility = on ? "hidden" : "";
      }
      if (on) {
        if (bg) bg.style.opacity = String(glide);
        if (words) {
          words.style.opacity = String(rise);
          words.style.translate = `0 ${((1 - rise) * 20).toFixed(1)}px`;
        }
        // the glide: the scene's tablet drawn from the hero tablet's place and size to its own
        if (from && media && to) {
          const a = from.getBoundingClientRect();
          const b = media.getBoundingClientRect();
          if (a.width && b.width) {
            const k = 1 - glide;
            const scale = 1 + (a.width / b.width - 1) * k;
            const dx = (a.left - b.left) * k;
            const dy = (a.top - b.top) * k;
            to.style.transformOrigin = "0 0";
            to.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) scale(${scale.toFixed(4)})`;
            // its shadow arrives with the light, so the hand-over from the hero's tablet is unseen
            to.style.filter = `drop-shadow(0 30px 40px rgba(11, 26, 48, ${(0.18 * glide).toFixed(3)}))`;
          }
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

// v0.37.1 — no white circle: the hand lowers, the tablet glides into the scene, the light changes behind it
// v0.37.0 — the opening as a scroll scene: the hero, the light and the clinician's screen, the swap to "on your hand"
