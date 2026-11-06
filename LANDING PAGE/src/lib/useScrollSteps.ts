import { useEffect, useRef, useState } from "react";

/* Steps through a held stage by scroll: the stage holds under the bar while the visitor scrolls
   through its wrapper, whose travel is split evenly between the steps, and the hook reports the
   step in view (a re-render only when it changes). The stage holds only where the caller says it
   fits (a media query and the room under the bar); elsewhere (a phone), `held` is false, nothing
   holds and the page reads plainly. The change between two steps is a transition in CSS. */

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/* where it holds: `query` (a media query the layout needs) and `minRoom` (the window's height under
   the bar the held stage needs, in px) */
type Opts = { query?: string; minRoom?: number };

export function useScrollSteps(count: number, { query = "all", minRoom = 0 }: Opts = {}) {
  const pin = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);
  const [held, setHeld] = useState(false);

  useEffect(() => {
    const wrap = pin.current;
    const box = stage.current;
    if (!wrap || !box) return;
    let raf = 0;
    let current = -1;
    let isHeld = false;

    // does the held stage fit: the layout it needs, and the room under the bar (the sticky top)?
    const mq = window.matchMedia(query);
    const fit = () => {
      const bar = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--bar")) || 72;
      const fits = mq.matches && window.innerHeight - bar >= minRoom;
      if (fits !== isHeld) {
        isHeld = fits;
        setHeld(fits);
      }
    };
    const draw = () => {
      raf = 0;
      const r = wrap.getBoundingClientRect();
      const s = box.getBoundingClientRect();
      const travel = r.height - s.height;
      const p = travel > 0 ? clamp01((s.top - r.top) / travel) : 0;
      const at = Math.min(count - 1, Math.floor(p * count));
      if (at !== current) {
        current = at;
        setStep(at);
      }
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(draw);
    };
    const onResize = () => {
      fit();
      onScroll();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    fit();
    draw();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [count, query, minRoom]);

  return { pin, stage, step, held };
}

// v0.38.6 — where it holds is the caller's (a media query and the room it needs), not the plain layout's height
// v0.38.4 — holds only where the content fits the window (`held`); the tabs' fill and jump retired with the tabs
// v0.38.0 — scroll steps for "Who it's for": the step in view, each step's fill, a smooth jump to a step
