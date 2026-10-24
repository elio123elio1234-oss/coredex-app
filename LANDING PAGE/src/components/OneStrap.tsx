import { useEffect, useRef, useState } from "react";
import type { StrapScene } from "../lib/strapScene";
import stillSmart from "../assets/img/scene-smart.webp";
import stillStrap from "../assets/img/scene-strap.webp";
import stillAnalog from "../assets/img/scene-analog.webp";
import stillCyphix from "../assets/img/scene-cyphix.webp";

/* "One strap. Any watch." — the user's own scene, near the end of the page.
   A tall section with a sticky dark stage; scroll progress through it drives
   the live 3D model (lib/strapScene) and the copy beside it: the four ways to
   wear Cyphix, in the team's order. The model is built ahead of time, once
   the page has loaded and the browser is idle (or as the section nears, if
   that comes first), so nothing is still loading or compiling on arrival. The
   model and the copy glide to the scroll position in one frame loop, instead
   of jumping with each wheel step. Reduced motion, or no WebGL, shows the
   same four states as stills. */

type Mode = "idle" | "live" | "still";

/* Contiguous windows: one line always holds the stage. Each line arrives as its part
   starts to come down (the timings in lib/strapScene). */
const STEPS = [
  {
    from: -0.1,
    to: 0.43,
    title: "It lives in the strap.",
    text: "The Cyphix module and its electrodes sit on the band, not inside the watch.",
  },
  { from: 0.43, to: 0.68, title: "One strap.", text: "Without a watch, the strap closes into a bracelet. Cyphix is still there." },
  { from: 0.68, to: 0.885, title: "Any watch.", text: "Clip in an analog watch, and the same strap makes it a smart one." },
  { from: 0.885, to: 1.01, title: "Or ours.", text: "The Cyphix watch: our own screen, with the electrodes built into its band." },
];
const DOTS = ["Smartwatch", "Bracelet", "Analog", "Cyphix watch"];
const FADE = 0.02;
/* seconds: how quickly the scene catches up with the scroll; short enough to feel attached, long
   enough to turn a wheel step into a glide */
const GLIDE = 0.12;

const STILLS = [
  { src: stillSmart, label: "On your smartwatch", alt: "The Cyphix strap on a smartwatch, its screen showing a 6-lead ECG." },
  { src: stillStrap, label: "As a bracelet", alt: "The Cyphix strap on its own, closed into a bracelet, with the module and its electrodes." },
  { src: stillAnalog, label: "On an analog watch", alt: "The same Cyphix strap on an analog watch." },
  { src: stillCyphix, label: "The Cyphix watch", alt: "The Cyphix watch in black titanium, its face showing the time, with the electrodes built into its band." },
];

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

function webglAvailable() {
  try {
    const c = document.createElement("canvas");
    return Boolean(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

export default function OneStrap() {
  const sectionRef = useRef<HTMLElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const copyRefs = useRef<(HTMLDivElement | null)[]>([]);
  const dotRefs = useRef<(HTMLLIElement | null)[]>([]);
  const [mode, setMode] = useState<Mode>("idle");

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !webglAvailable()) {
      setMode("still");
      return;
    }
    const section = sectionRef.current;
    const host = hostRef.current;
    if (!section || !host) return;

    let scene: StrapScene | null = null;
    let disposed = false;
    let raf = 0;
    let shown = 0; // the progress on screen, gliding toward the scroll's
    let last = 0;

    // the pinned stage's own height, not the window's: a phone's address bar changes the window
    // as it hides, and the scene used to jump with it
    const measure = () => {
      const r = section.getBoundingClientRect();
      const travel = r.height - host.clientHeight;
      return {
        p: travel > 0 ? clamp01(-r.top / travel) : 0,
        inView: r.bottom > 0 && r.top < window.innerHeight,
      };
    };
    const copy = (p: number) => {
      STEPS.forEach((s, i) => {
        const o = Math.min(clamp01((p - s.from) / FADE), clamp01((s.to - p) / FADE));
        const el = copyRefs.current[i];
        if (el) {
          el.style.opacity = String(o);
          el.style.transform = `translateY(${(1 - o) * 14}px)`;
          el.setAttribute("aria-hidden", o < 0.5 ? "true" : "false");
        }
        dotRefs.current[i]?.classList.toggle("is-on", p >= s.from && p < s.to);
      });
    };
    // one loop draws the model and the copy together, in the same frame as the scroll it read
    const tick = (now: number) => {
      raf = 0;
      const { p, inView } = measure();
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 1 / 60;
      last = now;
      // off screen, or before the model is ready, there is nothing to glide: jump to the scroll
      if (!inView || !scene) shown = p;
      else shown += (p - shown) * (1 - Math.exp(-dt / GLIDE));
      if (Math.abs(p - shown) < 1e-4) shown = p;
      if (inView) {
        scene?.render(shown);
        copy(shown);
      }
      if (shown !== p) raf = requestAnimationFrame(tick);
      else last = 0;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const onResize = () => {
      scene?.resize();
      onScroll();
    };

    let started = false;
    const start = () => {
      if (started || disposed) return;
      started = true;
      io.disconnect();
      import("../lib/strapScene")
        .then((m) => m.createStrapScene(host))
        .then((s) => {
          if (disposed) return s.dispose();
          scene = s;
          setMode("live");
          onScroll();
        })
        .catch(() => !disposed && setMode("still"));
    };
    // as the section nears, if the idle build below has not started yet
    const io = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && start(), {
      rootMargin: "150% 0px",
    });
    io.observe(section);
    // don't wait for the visitor to reach the scene: once the page has loaded, build it when the
    // browser is idle (not on a data-saver connection, where it waits for the section)
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
    const hasIdle = typeof window.requestIdleCallback === "function"; // Safari has no idle callback
    let idle = 0;
    const whenIdle = () => {
      idle = hasIdle ? window.requestIdleCallback(start, { timeout: 3000 }) : window.setTimeout(start, 1500);
    };
    if (!saveData) {
      if (document.readyState === "complete") whenIdle();
      else window.addEventListener("load", whenIdle, { once: true });
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    onScroll();

    return () => {
      disposed = true;
      io.disconnect();
      window.removeEventListener("load", whenIdle);
      if (idle) {
        if (hasIdle) window.cancelIdleCallback(idle);
        else window.clearTimeout(idle);
      }
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      if (raf) cancelAnimationFrame(raf);
      scene?.dispose();
    };
  }, []);

  if (mode === "still") {
    return (
      <section className="strap-scene is-still" id="any-watch" aria-labelledby="any-watch-title" data-bar-dark>
        <div className="wrap ss-still">
          <h2 id="any-watch-title" className="ss-still-title">
            One strap. <span>Any watch.</span>
          </h2>
          <p className="ss-still-text">
            The Cyphix module and its electrodes sit on the band: on your smartwatch, on an analog
            watch, or on their own as a bracelet. The Cyphix watch has them built into its band.
          </p>
          <ul className="ss-stills">
            {STILLS.map((s) => (
              <li key={s.label}>
                <img src={s.src} alt={s.alt} width={1200} height={1200} loading="lazy" decoding="async" />
                <span>{s.label}</span>
              </li>
            ))}
          </ul>
          <p className="ss-note">Concept rendering from the Cyphix 3D model</p>
        </div>
      </section>
    );
  }

  return (
    <section
      ref={sectionRef}
      className={`strap-scene is-${mode}`}
      id="any-watch"
      aria-labelledby="any-watch-title"
      data-bar-dark
    >
      <div className="ss-stage">
        <div ref={hostRef} className="ss-canvas" />
        <div className="wrap ss-copy">
          <h2 id="any-watch-title" className="sr-only">
            One strap. Any watch. Or ours.
          </h2>
          {STEPS.map((s, i) => (
            <div key={s.title} className="ss-step" ref={(el) => (copyRefs.current[i] = el)}>
              <p className="ss-title">{s.title}</p>
              <p className="ss-text">{s.text}</p>
            </div>
          ))}
        </div>
        <ol className="ss-steps" aria-hidden="true">
          {DOTS.map((t, i) => (
            <li key={t} ref={(el) => (dotRefs.current[i] = el)}>
              {t}
            </li>
          ))}
        </ol>
        <p className="ss-note">Concept rendering from the Cyphix 3D model, rendered live</p>
        {mode === "idle" && <span className="ss-loading" aria-hidden="true" />}
      </div>
    </section>
  );
}

// v0.26.0 — smooth scroll: built ahead at idle, one frame loop draws the model and the copy, a short glide to the scroll position, progress from the pinned stage's height
// v0.10.0 — four ways to wear it: smartwatch, the strap closed into a bracelet, analog, the Cyphix watch; four stills
// v0.8.0 — contiguous copy windows (no empty frame); "One strap." once the watch has left
// v0.8.0 — the "One strap. Any watch." section: sticky dark stage, lazy WebGL scene, scroll-scrubbed copy, still fallback
