import { useEffect, useRef, useState } from "react";

/* Steps through a held stage by scroll: the stage holds under the bar while the visitor scrolls
   through its wrapper, whose travel is split evenly between the steps, and the hook reports the
   step in view (a re-render only when it changes). The stage holds only where the caller says it
   fits (a media query and the room under the bar).

   Stacked (a phone, a narrow window) nothing holds: `flow` is true, and the rows scroll with the
   page itself, between a heading held at the top and an image held at the bottom (CSS sticky).
   Their place is the page's own scroll, so nothing can make them jump; the hook only tilts and
   fades each row by its distance from the middle of that window, read from where the row really
   is on screen. (v0.38.12 to v0.38.17 moved the rows by the scroll, in script or in the browser's
   scroll timeline; on an iPhone, while Safari's bars slide or the page coasts, both jumped.) */

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/* where it holds: `minRoom`, the height under the bar the held stage needs where `wide` (a media
   query) matches, and `minRoomStacked` where it does not (the room the flowing wheel needs) */
type Opts = { wide?: string; minRoom?: number; minRoomStacked?: number };

export function useScrollSteps(
  count: number,
  { wide = "all", minRoom = 0, minRoomStacked = Infinity }: Opts = {},
) {
  const pin = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);
  const [held, setHeld] = useState(false);
  const [flow, setFlow] = useState(false);

  useEffect(() => {
    const wrap = pin.current;
    const box = stage.current;
    if (!wrap || !box) return;
    let raf = 0;
    let current = -1;
    let isHeld = false;
    let isFlow = false;

    const rows = () => Array.from(wrap.querySelectorAll<HTMLElement>("[data-wheel-i]"));
    const mq = window.matchMedia(wide);
    const fit = () => {
      const bar =
        parseFloat(
          getComputedStyle(document.documentElement).getPropertyValue("--bar"),
        ) || 72;
      // the layout viewport: on a phone it does not change as the toolbars come and go
      const room = document.documentElement.clientHeight - bar;
      const holds = mq.matches && room >= minRoom;
      const flows = !mq.matches && room >= minRoomStacked;
      if (holds !== isHeld) {
        isHeld = holds;
        setHeld(holds);
      }
      if (flows !== isFlow) {
        isFlow = flows;
        setFlow(flows);
        if (!flows)
          rows().forEach((li) => {
            li.style.removeProperty("transform");
            li.style.removeProperty("opacity");
          });
        window.setTimeout(() => window.dispatchEvent(new Event("scroll")), 0);
      }
    };

    // flowing: each row tilted and faded by its distance from the window's middle, in rows
    const shade = () => {
      const head = wrap.querySelector<HTMLElement>(".rule-head");
      const foot = wrap.querySelector<HTMLElement>(".rows-media");
      const list = rows();
      if (!head || !foot || list.length < 2) return;
      const top = head.getBoundingClientRect().bottom;
      const bottom = foot.getBoundingClientRect().top;
      const mid = (top + bottom) / 2;
      const boxes = list.map((li) => li.getBoundingClientRect());
      const notch = boxes[1].top + boxes[1].height / 2 - (boxes[0].top + boxes[0].height / 2) || 1;
      list.forEach((li, i) => {
        const b = boxes[i];
        const d = (b.top + b.height / 2 - mid) / notch;
        const ad = Math.min(Math.abs(d), 1.5);
        li.style.transform = `rotateX(${(-22 * Math.max(-1.5, Math.min(1.5, d))).toFixed(2)}deg) scale(${(1 - ad * 0.08).toFixed(4)})`;
        li.style.opacity = Math.max(0.15, 1 - ad * 0.75).toFixed(3);
      });
    };

    const draw = () => {
      raf = 0;
      if (isFlow) {
        shade();
        return;
      }
      if (!isHeld) return;
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
  }, [count, wide, minRoom, minRoomStacked]);

  return { pin, stage, step, held, flow };
}

// v0.38.20 — stacked, the rows scroll with the page itself (`flow`) between a held heading and a held image; the hook only tilts and fades them by where they are (the user: "it flickers again, fix it once and for all")
// v0.38.17 — the timeline's range measured from the layout when it changes, never from the screen while scrolling
// v0.38.14 — stacked, the wheel held again and moving one pixel for one pixel with the scroll: drawn by the browser's scroll timeline where it has one
// v0.38.12 — the finger-following wheel retired: stacked, nothing holds (the user: it "sank" the page)
// v0.38.11 — the following wheel glides toward the finger (0.08 s), drawn on every frame until it settles
// v0.38.9 — `smooth`: stacked, the wheel follows the finger (each row's place written every frame, rows marked data-wheel-i)
// v0.38.7 — a stacked minimum too (the wheel on a phone); the room from the layout viewport
// v0.38.6 — where it holds is the caller's (a media query and the room it needs), not the plain layout's height
// v0.38.4 — holds only where the content fits the window (`held`); the tabs' fill and jump retired with the tabs
// v0.38.0 — scroll steps for "Who it's for": the step in view, each step's fill, a smooth jump to a step
