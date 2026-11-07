import { useEffect, useRef, useState } from "react";

/* Steps through a held stage by scroll: the stage holds under the bar while the visitor scrolls
   through its wrapper, whose travel is split evenly between the steps, and the hook reports the
   step in view (a re-render only when it changes). The stage holds only where the caller says it
   fits (a media query and the room under the bar); elsewhere `held` is false and nothing holds.

   Where the stage holds but the layout is stacked (a phone, a narrow window), `smooth` is true:
   the wheel is not notched but moves exactly with the scroll, one pixel for one pixel, so it
   feels like no effect at all (the user). Where the browser has scroll timelines, the browser
   itself draws it from the scroll position (index.css, wheel-0/1/2); the hook only tells it where
   the hold begins and ends (--wheel-a, --wheel-b on the wrapper). Elsewhere the hook writes each
   row's place on every scroll frame, with no glide in between. */

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/* where it holds: `minRoom`, the height under the bar the held stage needs where `wide` (a media
   query) matches, and `minRoomStacked` where it does not (by default it never holds there) */
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
    let range = "";
    const timeline =
      typeof CSS !== "undefined" &&
      CSS.supports("animation-timeline: scroll()") &&
      CSS.supports("animation-range: 0px 1px");

    const rows = () => Array.from(wrap.querySelectorAll<HTMLElement>("[data-wheel-i]"));

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
      const follow = fits && !mq.matches;
      if (follow !== isSmooth) {
        isSmooth = follow;
        setSmooth(follow);
        if (!follow)
          rows().forEach((li) => {
            li.style.removeProperty("opacity");
          });
        range = "";
        // redraw once React has applied the change (it sets or clears the rows' own places)
        window.setTimeout(() => window.dispatchEvent(new Event("scroll")), 0);
      }
    };

    const draw = () => {
      raf = 0;
      const r = wrap.getBoundingClientRect();
      const s = box.getBoundingClientRect();
      const travel = r.height - s.height;
      const p = travel > 0 ? clamp01((s.top - r.top) / travel) : 0;
      const at = Math.min(count - 1, Math.floor(p * count));
      if (isSmooth) {
        if (timeline) {
          // the scroll positions where the hold begins and ends, for the browser's own timeline
          const start = Math.round(r.top + window.scrollY - parseFloat(getComputedStyle(box).top));
          const next = `${start}px ${start + Math.round(travel)}px`;
          if (next !== range) {
            range = next;
            wrap.style.setProperty("--wheel-a", `${start}px`);
            wrap.style.setProperty("--wheel-b", `${start + Math.round(travel)}px`);
          }
        } else {
          // one pixel of scroll, one pixel of the wheel: the rows' places from the scroll itself
          const pos = p * (count - 1);
          rows().forEach((li) => {
            const d = Number(li.dataset.wheelI) - pos;
            const ad = Math.min(Math.abs(d), 2);
            li.style.setProperty("--d", d.toFixed(4));
            li.style.setProperty("--ad", ad.toFixed(4));
            li.style.opacity = (ad <= 1 ? 1 - ad * 0.7 : 0.3 * (2 - ad)).toFixed(3);
          });
        }
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
    // the page above can grow after load (images), moving where the hold begins
    const ro = new ResizeObserver(onScroll);
    ro.observe(document.body);
    fit();
    draw();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      ro.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [count, wide, minRoom, minRoomStacked]);

  return { pin, stage, step, held, smooth };
}

// v0.38.14 — stacked, the wheel held again (v0.38.12 took it away, also from narrow desktop windows) and moving one pixel for one pixel with the scroll: drawn by the browser's scroll timeline where it has one
// v0.38.12 — the finger-following wheel retired: stacked, nothing holds (the user: it "sank" the page)
// v0.38.11 — the following wheel glides toward the finger (0.08 s), drawn on every frame until it settles
// v0.38.9 — `smooth`: stacked, the wheel follows the finger (each row's place written every frame, rows marked data-wheel-i)
// v0.38.7 — a stacked minimum too (the wheel on a phone); the room from the layout viewport
// v0.38.6 — where it holds is the caller's (a media query and the room it needs), not the plain layout's height
// v0.38.4 — holds only where the content fits the window (`held`); the tabs' fill and jump retired with the tabs
// v0.38.0 — scroll steps for "Who it's for": the step in view, each step's fill, a smooth jump to a step
