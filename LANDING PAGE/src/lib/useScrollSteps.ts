import { useEffect, useRef, useState } from "react";

/* Steps through a held stage by scroll: the stage holds under the bar while the visitor scrolls
   through its wrapper, whose travel is split evenly between the steps, and the hook reports the
   step in view (a re-render only when it changes). The stage holds only where the caller says it
   fits (a media query and the room under the bar); elsewhere (a phone), `held` is false, nothing
   holds and the page reads plainly. The change between two steps is a transition in CSS. */

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
/* seconds: how quickly the following wheel catches up with the finger; short enough to feel held,
   long enough to smooth the uneven scroll events of a phone (v0.38.9 jumped from event to event) */
const GLIDE = 0.08;

/* where it holds: `minRoom`, the height under the bar the held stage needs where `wide` (a media
   query) matches, and `minRoomStacked` where it does not */
type Opts = { wide?: string; minRoom?: number; minRoomStacked?: number };

export function useScrollSteps(
  count: number,
  { wide = "all", minRoom = 0, minRoomStacked = Infinity }: Opts = {},
) {
  const pin = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);
  const [held, setHeld] = useState(false);
  const [smooth, setSmooth] = useState(false);

  useEffect(() => {
    const wrap = pin.current;
    const box = stage.current;
    if (!wrap || !box) return;
    let raf = 0;
    let current = -1;
    let isHeld = false;
    let isSmooth = false;
    let shown = -1; // the following wheel's position on screen, gliding toward the scroll's
    let last = 0;
    let list: HTMLElement[] = [];

    // does the held stage fit: the layout it needs, and the room under the bar (the sticky top)?
    const mq = window.matchMedia(wide);
    const fit = () => {
      const bar =
        parseFloat(
          getComputedStyle(document.documentElement).getPropertyValue("--bar"),
        ) || 72;
      // the layout viewport: on a phone it does not change as the toolbars come and go
      const room = document.documentElement.clientHeight - bar;
      const fits = room >= (mq.matches ? minRoom : minRoomStacked);
      if (fits !== isHeld) {
        isHeld = fits;
        setHeld(fits);
      }
      // stacked (a phone), the wheel follows the finger: each row's place written every frame
      const follow = fits && !mq.matches;
      if (follow !== isSmooth) {
        isSmooth = follow;
        setSmooth(follow);
        if (!follow) rows().forEach((li) => li.style.removeProperty("opacity"));
        shown = -1;
        // redraw once React has applied the change (it sets or clears the rows' own places)
        window.setTimeout(() => window.dispatchEvent(new Event("scroll")), 0);
      }
    };
    const rows = () => {
      list = Array.from(wrap.querySelectorAll<HTMLElement>("[data-wheel-i]"));
      return list;
    };
    rows();
    const draw = (now: number) => {
      raf = 0;
      const r = wrap.getBoundingClientRect();
      const s = box.getBoundingClientRect();
      const travel = r.height - s.height;
      const p = travel > 0 ? clamp01((s.top - r.top) / travel) : 0;
      const at = Math.min(count - 1, Math.floor(p * count));
      if (isSmooth) {
        // the wheel's position, continuous: row i is centred in the middle of its step; what is
        // drawn glides toward it in a few frames, so it moves at the finger's pace, evenly
        const pos = Math.min(count - 1, Math.max(0, p * count - 0.5));
        const dt = last ? Math.min(0.1, (now - last) / 1000) : 1 / 60;
        last = now;
        shown =
          shown < 0 || r.bottom < 0 || r.top > window.innerHeight
            ? pos
            : shown + (pos - shown) * (1 - Math.exp(-dt / GLIDE));
        if (Math.abs(pos - shown) < 0.002) shown = pos;
        if (!list.length) rows();
        list.forEach((li) => {
          const d = Number(li.dataset.wheelI) - shown;
          const ad = Math.abs(d);
          li.style.setProperty("--d", d.toFixed(4));
          li.style.setProperty("--ad", Math.min(ad, 2).toFixed(4));
          li.style.opacity = Math.max(0, 1 - ad * 0.85).toFixed(3);
        });
        if (shown !== pos) raf = requestAnimationFrame(draw);
        else last = 0;
      }
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
    draw(performance.now());
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [count, wide, minRoom, minRoomStacked]);

  return { pin, stage, step, held, smooth };
}

// v0.38.11 — the following wheel glides toward the finger (0.08 s), drawn on every frame until it settles: no more stepping from one uneven scroll event to the next
// v0.38.9 — `smooth`: stacked, the wheel follows the finger (each row's place written every frame, rows marked data-wheel-i)
// v0.38.7 — a stacked minimum too (the wheel on a phone); the room from the layout viewport
// v0.38.6 — where it holds is the caller's (a media query and the room it needs), not the plain layout's height
// v0.38.4 — holds only where the content fits the window (`held`); the tabs' fill and jump retired with the tabs
// v0.38.0 — scroll steps for "Who it's for": the step in view, each step's fill, a smooth jump to a step
