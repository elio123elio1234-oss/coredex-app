import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

/**
 * ScaleToFit — shrinks a fixed-size composition so the whole thing fits the
 * available box (width, and optionally the remaining viewport height), the way
 * the handoff reference scaled its block to the screen. Never upscales past 1:1.
 *
 * Critical detail: `transform: scale()` shrinks the composition *visually* but
 * the element still occupies its natural width in layout. So the outer box
 * MUST `overflow: hidden` (to clip that layout width and stop the page from
 * widening), and we center with an explicit translateX rather than auto
 * margins (which can't center a child wider than its container).
 *
 * Below `disableUnder` px it steps aside and the child uses its own responsive
 * (stacked) layout.
 */
export default function ScaleToFit({
  disableUnder = 820,
  fitHeight = true,
  bottomGap = 40,
  children,
}: {
  disableUnder?: number;
  fitHeight?: boolean;
  bottomGap?: number;
  children: ReactNode;
}) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [s, setS] = useState({ scale: 1, tx: 0, enabled: true, height: undefined as number | undefined });

  useLayoutEffect(() => {
    const fit = () => {
      const o = outer.current;
      const i = inner.current;
      if (!o || !i) return;

      if (window.innerWidth < disableUnder) {
        setS({ scale: 1, tx: 0, enabled: false, height: undefined });
        return;
      }

      // offsetWidth/Height are layout metrics — unaffected by the transform.
      const W = i.offsetWidth;
      const H = i.offsetHeight;
      if (!W || !H) return;

      const availW = o.clientWidth;
      let scale = Math.min(1, availW / W);

      if (fitHeight) {
        const top = Math.max(0, o.getBoundingClientRect().top);
        const availH = window.innerHeight - top - bottomGap;
        if (availH > 0) scale = Math.min(scale, availH / H);
      }

      const tx = Math.max(0, (availW - W * scale) / 2);
      setS({ scale, tx, enabled: true, height: Math.round(H * scale) });
    };

    fit();
    const ro = new ResizeObserver(fit);
    if (outer.current) ro.observe(outer.current);
    if (inner.current) ro.observe(inner.current);
    window.addEventListener("resize", fit);
    const t = window.setTimeout(fit, 300);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", fit);
      window.clearTimeout(t);
    };
  }, [disableUnder, fitHeight, bottomGap]);

  return (
    <div
      ref={outer}
      style={{ width: "100%", height: s.height, overflow: s.enabled ? "hidden" : "visible" }}
    >
      <div
        ref={inner}
        style={
          s.enabled
            ? {
                width: "max-content",
                transformOrigin: "top left",
                transform: `translateX(${s.tx}px) scale(${s.scale})`,
              }
            : undefined
        }
      >
        {children}
      </div>
    </div>
  );
}

// v0.3.1 — scale-to-fit with overflow clipping + explicit centering (no layout overflow)
