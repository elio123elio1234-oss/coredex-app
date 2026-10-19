import { useEffect, useRef } from "react";
import { leadAt, type LeadId } from "../lib/ecgModel";

/* ==================================================================
   EcgTrace — limb leads drawn like a bedside monitor: the pen sweeps
   left to right, a short gap erases ahead of it, and a small head dot
   marks "now". One canvas draws every row (one lead per row, equal
   heights). devicePixelRatio-aware, paused while off-screen; with
   reduced motion it draws one still strip instead.
   ================================================================== */

type Props = {
  leads: readonly LeadId[];
  /** One colour per row, or one for all. */
  colors: readonly string[] | string;
  /** Pixels per second of signal (the paper speed). */
  speed?: number;
  /** Pixels per millivolt as a fraction of the row height. */
  gain?: number;
  lineWidth?: number;
  /** Glow on the pen head (for dark grounds). */
  glow?: boolean;
  /** Where the baseline sits inside a row, 0 = top, 1 = bottom. */
  baseline?: number;
  /**
   * "sweep": a bedside monitor — the pen travels, the strip stays.
   * "scroll": a phone/watch strip — the pen stays at the right edge and
   * the strip moves, so every part of it is alive (the hero crops it).
   */
  mode?: "sweep" | "scroll";
  className?: string;
};

const GAP = 26; // px erased ahead of the pen

export default function EcgTrace({
  leads,
  colors,
  speed = 120,
  gain = 0.36,
  lineWidth = 1.6,
  glow = false,
  baseline = 0.6,
  mode = "sweep",
  className,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const leadKey = leads.join(",");
  const colorKey = typeof colors === "string" ? colors : colors.join(",");

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const rows = leadKey.split(",") as LeadId[];
    const palette = colorKey.split(",");
    const colorOf = (i: number) => palette[i % palette.length];
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let w = 0;
    let h = 0;
    let bufs: Float32Array[] = [];
    let filled = new Uint8Array(0);
    let head = 0;
    let clock = 0;
    let frac = 0; // sub-pixel remainder, so the scrolling strip glides
    let raf = 0;
    let last = 0;
    let visible = true;

    const resize = () => {
      // Layout size, not getBoundingClientRect: the hero scales this canvas
      // with a transform, and the strip must not reset while it zooms.
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const nw = Math.max(1, canvas.clientWidth);
      const nh = Math.max(1, canvas.clientHeight);
      if (nw === w && nh === h) return;
      w = nw;
      h = nh;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      bufs = rows.map(() => new Float32Array(w));
      filled = new Uint8Array(w);
      head = 0;
      // A still strip, or a scrolling one that is already full on load.
      if (reduce || mode === "scroll") {
        for (let x = 0; x < w; x++) {
          rows.forEach((lead, i) => (bufs[i][x] = leadAt(lead, x / speed)));
          filled[x] = 1;
        }
        clock = w / speed;
      }
      draw();
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      const rowH = h / rows.length;
      const k = rowH * gain;
      ctx.lineWidth = lineWidth;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      const newest = (head - 1 + w) % w;
      const scroll = mode === "scroll" && !reduce;
      rows.forEach((_, i) => {
        const mid = rowH * i + rowH * baseline;
        const buf = bufs[i];
        ctx.strokeStyle = colorOf(i);
        ctx.beginPath();
        let pen = false;
        for (let x = 0; x < w; x++) {
          // Sweep: column x holds sample x. Scroll: oldest sample on the left.
          const idx = scroll ? (head + x) % w : x;
          const ahead = (x - head + w) % w;
          if (!filled[idx] || (!reduce && !scroll && ahead < GAP)) {
            pen = false;
            continue;
          }
          const px = scroll ? x - frac : x;
          const y = mid - buf[idx] * k;
          if (pen) ctx.lineTo(px, y);
          else ctx.moveTo(px, y);
          pen = true;
        }
        ctx.stroke();
        if (!reduce && filled[newest]) {
          const hx = scroll ? w - 1 - frac : newest;
          ctx.save();
          ctx.fillStyle = colorOf(i);
          if (glow) {
            ctx.shadowColor = colorOf(i);
            ctx.shadowBlur = 10;
          }
          ctx.beginPath();
          ctx.arc(hx, mid - buf[newest] * k, lineWidth * 1.8, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      });
    };

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (!visible) return;
      if (!last) last = now;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      // One sample per pixel column; the fractional remainder carries over.
      const travel = frac + dt * speed;
      const steps = Math.floor(travel);
      frac = travel - steps;
      for (let s = 0; s < steps; s++) {
        clock += 1 / speed;
        for (let i = 0; i < rows.length; i++) bufs[i][head] = leadAt(rows[i], clock);
        filled[head] = 1;
        head = (head + 1) % w;
      }
      draw();
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      last = 0;
    });
    io.observe(canvas);
    if (!reduce) raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
    };
  }, [leadKey, colorKey, speed, gain, lineWidth, glow, baseline, mode]);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}

// v0.6.0 — limb leads on one canvas, N rows; sweep (monitor) or scroll (watch strip); paused off-screen, reduced-motion still
