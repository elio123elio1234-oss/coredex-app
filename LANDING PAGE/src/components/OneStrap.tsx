import { useEffect, useRef, useState, type ReactNode } from "react";
import type { StrapStory } from "../lib/strapStory";
import HeroTablet from "./HeroTablet";
import stillSmart from "../assets/img/scene-smart.webp";
import stillStrap from "../assets/img/scene-strap.webp";
import stillAnalog from "../assets/img/scene-analog.webp";
import stillCyphix from "../assets/img/scene-cyphix.webp";

/* "One strap. Any watch." — the page's one dark moment, near its end.

   No transitions, only the page's own scroll. The screen goes dark and
   pins; the four ways to wear Cyphix stand one under the other, a screen
   apart, live from the team's 3D model (lib/strapStory). Each holds while
   its copy holds (an eyebrow, a large headline, a line whose key phrases
   are set brighter, centred above the product), then the scroll carries it
   up and away at exactly the scroll's speed while the next comes up from
   below, as the page itself would. Each turns slowly as it goes by. Last,
   the white page slides up the same way with the clinician's screen,
   writing its illustrative recording like a monitor.

   The model is built ahead of time, once the page has loaded and the
   browser is idle (or as the section nears), so nothing is loading on
   arrival. Reduced motion, or no WebGL, shows the same story still. */

type Mode = "idle" | "live" | "still";
type Panel = { eyebrow: string; title: string; text: ReactNode };

/* the timeline, in screens of scroll: a hold on each panel, a one-screen move between them (the
   same distance the column moves, so it reads as the page scrolling); mirrored by lib/strapStory */
const HOLD = 0.7;
const PAN = 1;
const PANELS = 5; // four products, then the clinician
const SCREENS = PANELS * HOLD + (PANELS - 1) * PAN; // 7.5

const DARK: Panel[] = [
  {
    eyebrow: "One strap. Any watch.",
    title: "Catch the moment.",
    text: (
      <>
        Symptoms are often transient. Cyphix lives in <strong>the strap of the watch you already wear,</strong> so
        a <strong>6-lead ECG</strong> is there when it happens.
      </>
    ),
  },
  {
    eyebrow: "As a bracelet",
    title: "One strap.",
    text: (
      <>
        Without a watch, the strap closes into a bracelet. <strong>Cyphix is still there.</strong>
      </>
    ),
  },
  {
    eyebrow: "On an analog watch",
    title: "Any watch.",
    text: (
      <>
        Clip in an analog watch, and <strong>the same strap makes it a smart one.</strong>
      </>
    ),
  },
  {
    eyebrow: "The Cyphix watch",
    title: "Or ours.",
    text: (
      <>
        Our own screen, with <strong>the electrodes built into its band.</strong>
      </>
    ),
  },
];
const CLINIC: Panel = {
  eyebrow: "Your clinician",
  title: "The moment, in their hands.",
  text: (
    <>
      Recorded when it happens and <strong>sent straight to the clinician.</strong> Cyphix records and displays;{" "}
      <strong>the reading stays with the clinician.</strong>
    </>
  ),
};
/* seconds: how quickly the scene catches up with the scroll; short enough to feel attached, long
   enough to smooth a wheel step */
const GLIDE = 0.12;

const STILLS = [
  { src: stillSmart, label: "On your smartwatch", alt: "The Cyphix strap on a smartwatch, the module and its electrodes on the band." },
  { src: stillStrap, label: "As a bracelet", alt: "The Cyphix strap on its own, closed into a bracelet, with the module and its electrodes." },
  { src: stillAnalog, label: "On an analog watch", alt: "The same Cyphix strap on an analog watch." },
  { src: stillCyphix, label: "The Cyphix watch", alt: "The Cyphix watch in black titanium, with the electrodes built into its band." },
];

/** the column's position for `s` screens of scroll: whole numbers are holds */
function columnAt(s: number) {
  let t = s;
  for (let i = 0; i < PANELS - 1; i++) {
    if (t <= HOLD) return i;
    t -= HOLD;
    if (t <= PAN) return i + t / PAN;
    t -= PAN;
  }
  return PANELS - 1;
}

function webglAvailable() {
  try {
    const c = document.createElement("canvas");
    return Boolean(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

function Copy({ p }: { p: Panel }) {
  return (
    <>
      <p className="st-eyebrow">{p.eyebrow}</p>
      <p className="st-title">{p.title}</p>
      <p className="st-text">{p.text}</p>
    </>
  );
}

export default function OneStrap() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const dayRef = useRef<HTMLDivElement>(null);
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
    let shown = 0; // screens of scroll on screen, gliding toward the scroll's
    let last = 0;
    let barDark = true;

    // screens scrolled into the pinned stage, by the stage's own height (a phone's address bar
    // changes the window as it hides; the stage does not move with it)
    const measure = () => {
      const r = section.getBoundingClientRect();
      const s = Math.min(SCREENS, Math.max(0, -r.top / stage.clientHeight));
      return { s, inView: r.bottom > 0 && r.top < window.innerHeight };
    };

    const paint = (s: number) => {
      const pos = columnAt(s);
      const h = stage.clientHeight;
      story?.render(pos, s);
      copyRefs.current.forEach((el, i) => {
        if (!el) return;
        const off = (i - pos) * h;
        el.style.transform = `translate3d(0, ${off.toFixed(1)}px, 0)`;
        el.style.visibility = Math.abs(i - pos) < 1.2 ? "visible" : "hidden";
      });
      const day = dayRef.current;
      const off = (PANELS - 1 - pos) * h;
      if (day) {
        day.style.transform = `translate3d(0, ${off.toFixed(1)}px, 0)`;
        day.style.visibility = off < h ? "visible" : "hidden";
      }
      // the bar follows: dark over the night stage, light once the white page has reached it
      const dark = off > 36;
      if (dark !== barDark) {
        barDark = dark;
        if (dark) section.setAttribute("data-bar-dark", "");
        else section.removeAttribute("data-bar-dark");
        window.dispatchEvent(new Event("scroll"));
      }
    };

    // one loop draws the column and moves the copy together, in the frame of the scroll it read
    const tick = (now: number) => {
      raf = 0;
      const { s, inView } = measure();
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 1 / 60;
      last = now;
      // off screen, before the model is ready, or a jump (a link, a reload): no glide, just go there
      if (!inView || !story || Math.abs(s - shown) > 0.6) shown = s;
      else shown += (s - shown) * (1 - Math.exp(-dt / GLIDE));
      if (Math.abs(s - shown) < 1e-4) shown = s;
      if (inView) paint(shown);
      if (shown !== s) raf = requestAnimationFrame(tick);
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
        .then((st) => {
          if (disposed) return st.dispose();
          story = st;
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
          <p className="st-eyebrow">{DARK[0].eyebrow}</p>
          <h2 id="any-watch-title" className="st-title">
            {DARK[0].title}
          </h2>
          <p className="st-text">{DARK[0].text}</p>
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
        <h2 id="any-watch-title" className="sr-only">
          One strap. Any watch.
        </h2>
        {DARK.map((p, i) => (
          <div key={p.title} className="st-panel" ref={(el) => (copyRefs.current[i] = el)}>
            <Copy p={p} />
          </div>
        ))}
        <p className="st-note">Concept rendering from the Cyphix 3D model, rendered live</p>
        <div ref={dayRef} className="st-day">
          <div className="st-panel is-day">
            <Copy p={CLINIC} />
          </div>
          <div className="st-clinic">
            <HeroTablet live />
          </div>
        </div>
        {mode === "idle" && <span className="st-loading" aria-hidden="true" />}
      </div>
    </section>
  );
}

// v0.30.0 — no transitions, only the scroll (the user: the dissolves looked unprofessional): four products in a column a screen apart, each holding with its copy, carried up at the scroll's own speed; the white page and the clinician's monitor slide up the same way
// v0.29.0 — the dark moment, calm, in the manner of a product page: centred copy over the product, large; a chapter per way to wear it, each arriving with a soft dissolve
// v0.28.0 — eased, directional copy fades; a longer glide; the day rises from below; the clinician's tablet writes its traces live
// v0.27.0 — the journey in five chapters (night, the strap, six leads, ours, your clinician)
// v0.26.0 — smooth scroll: built ahead at idle, one frame loop, a short glide
// v0.10.0 — four ways to wear it: smartwatch, the strap closed into a bracelet, analog, the Cyphix watch; four stills
// v0.8.0 — the "One strap. Any watch." section: sticky dark stage, lazy WebGL scene, scroll-scrubbed copy, still fallback
