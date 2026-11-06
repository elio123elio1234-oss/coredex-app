import { useCallback, useEffect, useRef, useState } from "react";

/* Steps through a held stage by scroll, in the manner of a product page: the stage holds under
   the bar while the visitor scrolls through its wrapper, whose travel is split evenly between the
   steps. It reports the step in view (a re-render only when it changes) and writes each step's own
   progress, 0 to 1, as `--fill` on the element marked `data-step-fill={i}`, without a re-render,
   for a line that fills as the visitor reads. `go(i)` scrolls smoothly to the middle of step i.
   The step is a switch, not a scrub: the change between two is a short transition in CSS. */

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export function useScrollSteps(count: number) {
  const pin = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const wrap = pin.current;
    const box = stage.current;
    if (!wrap || !box) return;
    const fills = Array.from(wrap.querySelectorAll<HTMLElement>("[data-step-fill]"));
    let raf = 0;
    let current = -1;
    const draw = () => {
      raf = 0;
      const r = wrap.getBoundingClientRect();
      const s = box.getBoundingClientRect();
      const travel = r.height - s.height;
      const p = travel > 0 ? clamp01((s.top - r.top) / travel) : 0;
      const at = Math.min(count - 1, Math.floor(p * count));
      fills.forEach((el) => {
        const i = Number(el.dataset.stepFill);
        el.style.setProperty("--fill", clamp01(p * count - i).toFixed(3));
      });
      if (at !== current) {
        current = at;
        setStep(at);
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
  }, [count]);

  const go = useCallback(
    (i: number) => {
      const wrap = pin.current;
      const box = stage.current;
      if (!wrap || !box) return;
      const travel = wrap.offsetHeight - box.offsetHeight;
      // the stage holds from where the wrapper's top meets the stage's sticky top (the bar)
      const top = wrap.getBoundingClientRect().top + window.scrollY - (parseFloat(getComputedStyle(box).top) || 0);
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.scrollTo({ top: top + ((i + 0.5) / count) * travel, behavior: reduce ? "auto" : "smooth" });
    },
    [count],
  );

  return { pin, stage, step, go };
}

// v0.38.0 — scroll steps for "Who it's for": the step in view, each step's fill, a smooth jump to a step
