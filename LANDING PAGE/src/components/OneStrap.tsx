import { useEffect, useRef, useState, type ReactNode } from "react";
import type { StrapStory } from "../lib/strapStory";
import HeroTablet from "./HeroTablet";
import stillSmart from "../assets/img/scene-smart.webp";
import stillStrap from "../assets/img/scene-strap.webp";
import stillAnalog from "../assets/img/scene-analog.webp";
import stillCyphix from "../assets/img/scene-cyphix.webp";

/* "One strap. Any watch." — the page's one dark moment, near its end. As the
   section arrives the whole screen goes dark; the scroll carries a calm
   story, in the manner of a product page: centred copy (an eyebrow, a large
   headline, a line whose key phrases are set brighter) over the product,
   large, live from the team's 3D model (lib/strapStory). Each way to wear
   it is a chapter that arrives with a soft dissolve; nothing is drawn over
   the product. Then the day comes back with the clinician's screen, its
   illustrative recording writing itself in a gentle loop.

   The model is built ahead of time, once the page has loaded and the
   browser is idle (or as the section nears), so nothing is loading on
   arrival; the scene and the copy glide to the scroll position together in
   one frame loop. Reduced motion, or no WebGL, shows the same story still. */

type Mode = "idle" | "live" | "still";
type Step = { from: number; to: number; eyebrow: string; title: string; text: ReactNode; day?: boolean };

/* contiguous windows: one line always holds the stage (the day's waits for the light) */
const STEPS: Step[] = [
  {
    from: -0.1,
    to: 0.18,
    eyebrow: "One strap. Any watch.",
    title: "Catch the moment.",
    text: (
      <>
        Symptoms are often transient. <strong>A 6-lead ECG on the strap of the watch you already wear</strong> is
        there when it happens.
      </>
    ),
  },
  {
    from: 0.18,
    to: 0.36,
    eyebrow: "On your smartwatch",
    title: "It lives in the strap.",
    text: (
      <>
        The Cyphix module and its <strong>electrodes</strong> sit on the band, <strong>not inside the watch.</strong>
      </>
    ),
  },
  {
    from: 0.36,
    to: 0.52,
    eyebrow: "As a bracelet",
    title: "One strap.",
    text: (
      <>
        Without a watch, the strap closes into a bracelet. <strong>Cyphix is still there.</strong>
      </>
    ),
  },
  {
    from: 0.52,
    to: 0.68,
    eyebrow: "On an analog watch",
    title: "Any watch.",
    text: (
      <>
        Clip in an analog watch, and <strong>the same strap makes it a smart one.</strong>
      </>
    ),
  },
  {
    from: 0.68,
    to: 0.86,
    eyebrow: "The Cyphix watch",
    title: "Or ours.",
    text: (
      <>
        Our own screen, with <strong>the electrodes built into its band.</strong>
      </>
    ),
  },
  {
    from: 0.895,
    to: 1.01,
    eyebrow: "Your clinician",
    title: "The moment, in their hands.",
    text: (
      <>
        Recorded when it happens and <strong>sent straight to the clinician.</strong> Cyphix records and displays;{" "}
        <strong>the reading stays with the clinician.</strong>
      </>
    ),
    day: true,
  },
];
/* each line eases out upward and the next eases in from below, over this much progress */
const FADE = 0.022;
const DRIFT = 18; // px
/* seconds: how quickly the scene catches up with the scroll; short enough to feel attached, long
   enough to turn a wheel step into a glide */
const GLIDE = 0.15;

const STILLS = [
  { src: stillSmart, label: "On your smartwatch", alt: "The Cyphix strap on a smartwatch, the module and its electrodes on the band." },
  { src: stillStrap, label: "As a bracelet", alt: "The Cyphix strap on its own, closed into a bracelet, with the module and its electrodes." },
  { src: stillAnalog, label: "On an analog watch", alt: "The same Cyphix strap on an analog watch." },
  { src: stillCyphix, label: "The Cyphix watch", alt: "The Cyphix watch in black titanium, with the electrodes built into its band." },
];

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const span = (a: number, b: number, v: number) => clamp01((v - a) / (b - a));
const smooth = (a: number, b: number, v: number) => {
  const t = span(a, b, v);
  return t * t * (3 - 2 * t);
};

function webglAvailable() {
  try {
    const c = document.createElement("canvas");
    return Boolean(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

function Copy({ s }: { s: Step }) {
  return (
    <>
      <p className="st-eyebrow">{s.eyebrow}</p>
      <p className="st-title">{s.title}</p>
      <p className="st-text">{s.text}</p>
    </>
  );
}

export default function OneStrap() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const dayRef = useRef<HTMLDivElement>(null);
  const clinicRef = useRef<HTMLDivElement>(null);
  const copyRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [mode, setMode] = useState<Mode>("idle");

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !webglAvailable()) {
      setMode("still");
      return;
    }
    const section = sectionRef.current;
    const stage = stageRef.current;
    const host = hostRef.current;
    if (!section || !stage || !host) return;

    let story: StrapStory | null = null;
    let disposed = false;
    let raf = 0;
    let shown = 0; // the progress on screen, gliding toward the scroll's
    let last = 0;
    let isDay = false;
    let clinicShown = false;

    // the pinned stage's own height, not the window's: a phone's address bar changes the window
    // as it hides, and the scene would jump with it
    const measure = () => {
      const r = section.getBoundingClientRect();
      const travel = r.height - stage.clientHeight;
      return { p: travel > 0 ? clamp01(-r.top / travel) : 0, inView: r.bottom > 0 && r.top < window.innerHeight };
    };

    const copy = (p: number) => {
      STEPS.forEach((s, i) => {
        const inn = smooth(s.from, s.from + FADE, p);
        const out = 1 - smooth(s.to - FADE, s.to, p);
        const o = Math.min(inn, out);
        const el = copyRefs.current[i];
        if (el) {
          const y = p < (s.from + s.to) / 2 ? (1 - inn) * DRIFT : -(1 - out) * DRIFT;
          el.style.opacity = String(o);
          el.style.transform = `translateY(${y.toFixed(1)}px)`;
          el.setAttribute("aria-hidden", o < 0.5 ? "true" : "false");
        }
      });
    };

    // the day comes back: morning rises from below the stage with a soft straight edge, the canvas
    // gives way, and the clinician's screen rises into it
    const day = (p: number) => {
      const light = smooth(0.85, 0.9, p);
      const EDGE = 38; // % of the stage the edge is soft over
      const top = light * (100 + EDGE);
      const sky = dayRef.current;
      if (sky) {
        const mask = light >= 1 ? "none" : `linear-gradient(to top, #000 ${(top - EDGE).toFixed(1)}%, transparent ${top.toFixed(1)}%)`;
        sky.style.opacity = light > 0 ? "1" : "0";
        sky.style.maskImage = mask;
        sky.style.setProperty("-webkit-mask-image", mask);
      }
      host.style.opacity = String(1 - smooth(0.88, 0.9, p));
      const rise = smooth(0.89, 0.95, p);
      const clinic = clinicRef.current;
      // the traces write themselves from an empty strip each time the clinician's screen arrives
      if (rise > 0 && !clinicShown) clinic?.querySelector<SVGSVGElement>("svg.hero-system-screen")?.setCurrentTime(0);
      clinicShown = rise > 0;
      if (clinic) {
        clinic.style.opacity = String(rise);
        clinic.style.setProperty("--rise", `${((1 - rise) * 56).toFixed(1)}px`);
        clinic.setAttribute("aria-hidden", rise < 0.5 ? "true" : "false");
      }
      const nowDay = light > 0.5;
      if (nowDay !== isDay) {
        isDay = nowDay;
        stage.classList.toggle("is-day", isDay);
        // the bar follows: dark over the night stage, light over the day
        if (isDay) section.removeAttribute("data-bar-dark");
        else section.setAttribute("data-bar-dark", "");
        window.dispatchEvent(new Event("scroll"));
      }
    };

    // one loop draws the scene and the copy together, in the frame of the scroll it read
    const tick = (now: number) => {
      raf = 0;
      const { p, inView } = measure();
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 1 / 60;
      last = now;
      // off screen, before the model is ready, or a jump (a link, a reload): no glide, just go there
      if (!inView || !story || Math.abs(p - shown) > 0.08) shown = p;
      else shown += (p - shown) * (1 - Math.exp(-dt / GLIDE));
      if (Math.abs(p - shown) < 1e-4) shown = p;
      if (inView) {
        story?.render(shown);
        copy(shown);
        day(shown);
      }
      if (shown !== p) raf = requestAnimationFrame(tick);
      else last = 0;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const onResize = () => {
      story?.resize();
      onScroll();
    };

    let started = false;
    const start = () => {
      if (started || disposed) return;
      started = true;
      near.disconnect();
      import("../lib/strapStory")
        .then((m) => m.createStrapStory(host))
        .then((s) => {
          if (disposed) return s.dispose();
          story = s;
          setMode("live");
          onScroll();
        })
        .catch(() => !disposed && setMode("still"));
    };
    // as the section nears, if the idle build below has not started yet
    const near = new IntersectionObserver((es) => es.some((e) => e.isIntersecting) && start(), { rootMargin: "150% 0px" });
    near.observe(section);
    // don't wait for the visitor: once the page has loaded, build it when the browser is idle
    // (not on a data-saver connection, where it waits for the section)
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
      near.disconnect();
      window.removeEventListener("load", whenIdle);
      if (idle) {
        if (hasIdle) window.cancelIdleCallback(idle);
        else window.clearTimeout(idle);
      }
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      if (raf) cancelAnimationFrame(raf);
      story?.dispose();
    };
  }, []);

  if (mode === "still") {
    return (
      <section className="strap-scene is-still" id="any-watch" aria-labelledby="any-watch-title" data-bar-dark>
        <div className="wrap st-still">
          <p className="st-eyebrow">{STEPS[0].eyebrow}</p>
          <h2 id="any-watch-title" className="st-title">
            {STEPS[0].title}
          </h2>
          <p className="st-text">{STEPS[0].text}</p>
          <ul className="st-stills">
            {STILLS.map((s) => (
              <li key={s.label}>
                <img src={s.src} alt={s.alt} width={1200} height={1200} loading="lazy" decoding="async" />
                <span>{s.label}</span>
              </li>
            ))}
          </ul>
          <p className="st-note">Concept rendering from the Cyphix 3D model</p>
        </div>
      </section>
    );
  }

  return (
    <section ref={sectionRef} className={`strap-scene is-${mode}`} id="any-watch" aria-labelledby="any-watch-title" data-bar-dark>
      <div ref={stageRef} className="st-stage">
        <div ref={hostRef} className="st-host" />
        <div ref={dayRef} className="st-day" aria-hidden="true" />
        <div ref={clinicRef} className="st-clinic" aria-hidden="true">
          <HeroTablet live />
        </div>
        <div className="st-copy">
          <h2 id="any-watch-title" className="sr-only">
            One strap. Any watch.
          </h2>
          {STEPS.map((s, i) => (
            <div key={s.title} className={`st-step${s.day ? " is-day" : ""}`} ref={(el) => (copyRefs.current[i] = el)}>
              <Copy s={s} />
            </div>
          ))}
        </div>
        <p className="st-note">Concept rendering from the Cyphix 3D model, rendered live</p>
        {mode === "idle" && <span className="st-loading" aria-hidden="true" />}
      </div>
    </section>
  );
}

// v0.29.0 — the dark moment, calm, in the manner of a product page (the user, after apple.com/iphone-duo, keeping the dark scroll): centred copy over the product, large; a rise, then a chapter per way to wear it, each arriving with a soft dissolve; no lines, falls or cranes; the day and the clinician's live screen at the end
// v0.28.0 — eased, directional copy fades; a longer glide; the hour marks lit on the dial itself; the backdrop moves with the camera's fall; the day rises from below; the clinician's tablet writes its traces live
// v0.27.0 — the journey in five chapters (night, the strap, six leads, ours, your clinician)
// v0.26.0 — smooth scroll: built ahead at idle, one frame loop, a short glide
// v0.10.0 — four ways to wear it: smartwatch, the strap closed into a bracelet, analog, the Cyphix watch; four stills
// v0.8.0 — the "One strap. Any watch." section: sticky dark stage, lazy WebGL scene, scroll-scrubbed copy, still fallback
