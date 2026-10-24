import { useEffect, useRef, useState, type ReactNode } from "react";
import type { StrapStory } from "../lib/strapStory";
import HeroTablet from "./HeroTablet";
import stillSmart from "../assets/img/scene-smart.webp";
import stillStrap from "../assets/img/scene-strap.webp";
import stillAnalog from "../assets/img/scene-analog.webp";
import stillCyphix from "../assets/img/scene-cyphix.webp";

/* "One strap. Any watch." — the page's one dark moment, near its end.

   The screen goes dark and pins. The product stands large and centred
   under centred copy (an eyebrow, a large headline, a line whose key
   phrases are set brighter) and turns slowly with the scroll; it never
   moves across the screen. Between the ways to wear it, its light goes out
   into the dark with its copy, and the next is lit out of the dark with
   its own: two products are never on screen at once. Last, the same way,
   the clinician's screen is lit out of the dark and writes its illustrative
   recording like a monitor; then the page scrolls on.

   The model is built ahead of time, once the page has loaded and the
   browser is idle (or as the section nears), so nothing is loading on
   arrival. Reduced motion, or no WebGL, shows the same story still. */

type Mode = "idle" | "live" | "still";
type Panel = { eyebrow: string; title: string; text: ReactNode };

/* the timeline, in screens of scroll (the stage's own height): each way to wear it has a span; the
   light goes out over DIP before a span's end and comes back over DIP after the next one's start */
const SPANS: [number, number][] = [
  [0, 1.4],
  [1.4, 2.8],
  [2.8, 4.2],
  [4.2, 5.4],
  [5.4, 6.6], // the clinician's screen
];
const DIP = 0.24;
const CLINIC_AT = 4;
const SCREENS = 6.6; // the section's travel: 760svh less the stage

const PANELS: Panel[] = [
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
  {
    eyebrow: "Your clinician",
    title: "The moment, in their hands.",
    text: (
      <>
        Recorded when it happens and <strong>sent straight to the clinician.</strong> Cyphix records and displays;{" "}
        <strong>the reading stays with the clinician.</strong>
      </>
    ),
  },
];
/* seconds: how quickly the scene catches up with the scroll; short enough to feel attached, long
   enough to smooth a wheel step */
const GLIDE = 0.12;

const STILLS = [
  { src: stillSmart, label: "On your smartwatch", alt: "The Cyphix strap on a smartwatch, the module and its electrodes on the band." },
  { src: stillStrap, label: "As a bracelet", alt: "The Cyphix strap on its own, closed into a bracelet, with the module and its electrodes." },
  { src: stillAnalog, label: "On an analog watch", alt: "The same Cyphix strap on an analog watch." },
  { src: stillCyphix, label: "The Cyphix watch", alt: "The Cyphix watch in black titanium, with the electrodes built into its band." },
];

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const span = (a: number, b: number, v: number) => clamp01((v - a) / (b - a));

/** how lit way `i` is at `s` screens (the first is lit as the section scrolls in) */
function lightOf(i: number, s: number) {
  const [a, b] = SPANS[i];
  const inn = i === 0 ? span(-0.7, 0, s) : span(a, a + DIP, s);
  const out = i === SPANS.length - 1 ? 1 : 1 - span(b - DIP, b, s);
  return Math.min(inn, out);
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
  const clinicRef = useRef<HTMLDivElement>(null);
  const noteRef = useRef<HTMLParagraphElement>(null);
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
    const clinic = clinicRef.current;
    if (!section || !stage || !host || !clinic) return;

    let story: StrapStory | null = null;
    let disposed = false;
    let raf = 0;
    let shown = -1; // screens of scroll on screen, gliding toward the scroll's
    let last = 0;

    // screens scrolled into the pinned stage, by the stage's own height (a phone's address bar
    // changes the window as it hides; the stage does not move with it); negative while it arrives
    const measure = () => {
      const r = section.getBoundingClientRect();
      const s = Math.min(SCREENS, -r.top / stage.clientHeight);
      return { s, inView: r.bottom > 0 && r.top < window.innerHeight };
    };

    // the clinician's screen as large as the room under its copy allows (the phone's whole width)
    const fit = () => {
      const copy = copyRefs.current[CLINIC_AT];
      if (!copy) return;
      const top = copy.offsetTop + copy.offsetHeight + 28;
      const room = stage.clientHeight - top - 24;
      const width = Math.max(200, Math.min(880, stage.clientWidth * 0.92, room * 1.45));
      clinic.style.width = `${width.toFixed(0)}px`;
      clinic.style.top = `${(top + Math.max(0, (room - width / 1.45) / 2)).toFixed(0)}px`;
    };

    const paint = (s: number) => {
      // the way on screen: the one whose span holds s (at a boundary the light is out, so it swaps unseen)
      let i = SPANS.findIndex(([, b]) => s < b);
      if (i < 0) i = SPANS.length - 1;
      const [a, b] = SPANS[i];
      const light = lightOf(i, s);
      // the product, or (for the clinician) the last one, gone into the dark
      if (i < CLINIC_AT) story?.render(i, span(a, b, s), light);
      else story?.render(CLINIC_AT - 1, 1, 0);
      copyRefs.current.forEach((el, k) => {
        if (!el) return;
        const o = k === i ? light : 0;
        el.style.opacity = o.toFixed(3);
        el.style.visibility = o > 0 ? "visible" : "hidden";
      });
      // the clinician's screen, lit out of the dark like the watches; out of the layout while dark, so
      // its monitor starts from an empty strip the moment it appears
      const lit = i === CLINIC_AT ? light : 0;
      clinic.style.opacity = lit.toFixed(3);
      clinic.style.display = lit > 0 ? "" : "none";
      if (noteRef.current) noteRef.current.style.opacity = (1 - (i === CLINIC_AT ? light : 0)).toFixed(3);
    };

    // one loop draws the product and sets the copy together, in the frame of the scroll it read
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
      fit();
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
    fit();
    document.fonts?.ready.then(() => !disposed && fit());
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
          <p className="st-eyebrow">{PANELS[0].eyebrow}</p>
          <h2 id="any-watch-title" className="st-title">
            {PANELS[0].title}
          </h2>
          <p className="st-text">{PANELS[0].text}</p>
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
        {PANELS.map((p, i) => (
          <div key={p.title} className="st-panel" ref={(el) => (copyRefs.current[i] = el)}>
            <Copy p={p} />
          </div>
        ))}
        <div ref={clinicRef} className="st-clinic" style={{ display: "none" }}>
          <HeroTablet live />
        </div>
        <p ref={noteRef} className="st-note">
          Concept rendering from the Cyphix 3D model, rendered live
        </p>
        {mode === "idle" && <span className="st-loading" aria-hidden="true" />}
      </div>
    </section>
  );
}

// v0.32.0 — the clinician's screen is lit out of the dark on the navy stage like the watches (the white sheet sliding up withdrawn: the user found it ugly); the page then scrolls on
// v0.31.0 — the product never moves across the screen: it turns in place, and between the ways to wear it the light goes out into the black with the copy and the next is lit out of the dark; the clinician's screen sized to the room under its copy (a phone's whole width)
// v0.30.0 — no transitions, only the scroll: four products in a column a screen apart, carried up at the scroll's own speed; the white page and the clinician's monitor slide up the same way
// v0.29.0 — the dark moment, calm, in the manner of a product page: centred copy over the product, large; a soft dissolve between ways
// v0.28.0 — eased, directional copy fades; a longer glide; the day rises from below; the clinician's tablet writes its traces live
// v0.27.0 — the journey in five chapters (night, the strap, six leads, ours, your clinician)
// v0.26.0 — smooth scroll: built ahead at idle, one frame loop, a short glide
// v0.10.0 — four ways to wear it: smartwatch, the strap closed into a bracelet, analog, the Cyphix watch; four stills
// v0.8.0 — the "One strap. Any watch." section: sticky dark stage, lazy WebGL scene, scroll-scrubbed copy, still fallback
