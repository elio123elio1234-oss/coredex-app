import { useEffect, useRef, useState } from "react";
import type { StrapScene } from "../lib/strapScene";
import HeroTablet from "./HeroTablet";
import stillSmart from "../assets/img/scene-smart.webp";
import stillStrap from "../assets/img/scene-strap.webp";
import stillAnalog from "../assets/img/scene-analog.webp";
import stillCyphix from "../assets/img/scene-cyphix.webp";

/* "One strap. Any watch." — the closing journey, near the end of the page.
   A tall section with a sticky stage; scroll progress through it drives the
   live 3D model (lib/strapScene) and everything around it, in five chapters:

     the moment    night: a close-up of the electrodes, found by a sweep of
                   light; a symptom comes and goes
     the strap     the product revealed, near full height, then the user's
                   four ways to wear it, in the team's order
     six leads     the analog face, straight on: the six lead axes of a
                   6-lead ECG (the hexaxial reference) drawn over its twelve
                   hours, which is exactly where they fall, 30 degrees apart
     ours          the Cyphix watch
     your clinician day: the canvas gives way to the CYPHIX app on a tablet

   The model is built ahead of time, once the page has loaded and the browser
   is idle (or as the section nears, if that comes first), so nothing is
   still loading or compiling on arrival. The model, the copy and the overlay
   glide to the scroll position together in one frame loop. Nothing here
   simulates a live signal or reads one: the lead axes are geometry, and the
   tablet shows an illustrative recording, labelled. Reduced motion, or no
   WebGL, shows the four ways to wear it as stills. */

type Mode = "idle" | "live" | "still";

/* Contiguous windows: one line always holds the stage. */
const STEPS = [
  { from: -0.1, to: 0.07, title: "A flutter. Then nothing.", text: "Symptoms are often transient." },
  {
    from: 0.07,
    to: 0.15,
    title: "By morning, it's gone.",
    text: "By the time a patient reaches care, the ECG may be normal.",
  },
  {
    from: 0.15,
    to: 0.29,
    title: "Unless it was on the wrist.",
    text: "A 6-lead ECG module on the strap of the watch you already wear.",
  },
  {
    from: 0.29,
    to: 0.37,
    title: "It lives in the strap.",
    text: "The Cyphix module and its electrodes sit on the band, not inside the watch.",
  },
  { from: 0.37, to: 0.52, title: "One strap.", text: "Without a watch, the strap closes into a bracelet. Cyphix is still there." },
  { from: 0.52, to: 0.645, title: "Any watch.", text: "Clip in an analog watch, and the same strap makes it a smart one." },
  {
    from: 0.645,
    to: 0.715,
    title: "Every watch face has twelve directions.",
    text: "Twelve hours, thirty degrees apart.",
  },
  {
    from: 0.715,
    to: 0.795,
    title: "A 6-lead ECG reads the heart along them.",
    text: "Leads I, II, III, aVR, aVL and aVF: six views of the heart, from the strap you already wear.",
  },
  { from: 0.795, to: 0.9, title: "Or ours.", text: "The Cyphix watch: our own screen, with the electrodes built into its band." },
  {
    from: 0.915, // once the light has reached the copy
    to: 1.01,
    title: "The moment, in your clinician's hands.",
    text: "Recorded when it happens, sent straight to the clinician.",
    day: true,
  },
];
const CHAPTERS = [
  { label: "The moment", from: -0.1, to: 0.15 },
  { label: "The strap", from: 0.15, to: 0.645 },
  { label: "Six leads", from: 0.645, to: 0.795 },
  { label: "Ours", from: 0.795, to: 0.905 },
  { label: "Your clinician", from: 0.905, to: 1.01 },
];
const FADE = 0.016;
/* seconds: how quickly the scene catches up with the scroll; short enough to feel attached, long
   enough to turn a wheel step into a glide */
const GLIDE = 0.12;

/* The hexaxial reference: each lead's positive pole, in degrees, 0 = lead I (the patient's left,
   drawn to the right), positive clockwise. On a watch face, 0 degrees is three o'clock, so the
   poles land on the hours: I 3, II 5, aVF 6, III 7, aVR 10, aVL 2. In the order they are drawn. */
const LEADS: [string, number][] = [
  ["I", 0],
  ["II", 60],
  ["III", 120],
  ["aVR", -150],
  ["aVL", -30],
  ["aVF", 90],
];
const RING = [0.68, 0.705]; // the twelve hours light up, one after another
const AXES = [0.705, 0.75]; // then the six leads, one after another
const OUT = [0.77, 0.79]; // and all of it fades as the camera pulls away

const STILLS = [
  { src: stillSmart, label: "On your smartwatch", alt: "The Cyphix strap on a smartwatch, its screen showing a 6-lead ECG." },
  { src: stillStrap, label: "As a bracelet", alt: "The Cyphix strap on its own, closed into a bracelet, with the module and its electrodes." },
  { src: stillAnalog, label: "On an analog watch", alt: "The same Cyphix strap on an analog watch." },
  { src: stillCyphix, label: "The Cyphix watch", alt: "The Cyphix watch in black titanium, its face showing the time, with the electrodes built into its band." },
];

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const span = (a: number, b: number, v: number) => clamp01((v - a) / (b - a));
const smooth = (a: number, b: number, v: number) => {
  const t = span(a, b, v);
  return t * t * (3 - 2 * t);
};
const rad = (d: number) => (d * Math.PI) / 180;

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
  const stageRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const dayRef = useRef<HTMLDivElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);
  const heartRef = useRef<HTMLDivElement>(null);
  const wheelRef = useRef<SVGGElement>(null);
  const clinicRef = useRef<HTMLDivElement>(null);
  const copyRefs = useRef<(HTMLDivElement | null)[]>([]);
  const chapterRefs = useRef<(HTMLLIElement | null)[]>([]);
  const [mode, setMode] = useState<Mode>("idle");

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !webglAvailable()) {
      setMode("still");
      return;
    }
    const section = sectionRef.current;
    const stage = stageRef.current;
    const host = hostRef.current;
    const wheel = wheelRef.current;
    if (!section || !stage || !host || !wheel) return;
    const ring = wheel.querySelector<SVGCircleElement>(".ss-ring")!;
    const ticks = Array.from(wheel.querySelectorAll<SVGLineElement>(".ss-tick"));
    const axes = Array.from(wheel.querySelectorAll<SVGGElement>(".ss-axis"));
    const hub = wheel.querySelector<SVGCircleElement>(".ss-hub")!;

    let scene: StrapScene | null = null;
    let disposed = false;
    let raf = 0;
    let shown = 0; // the progress on screen, gliding toward the scroll's
    let last = 0;
    let isDay = false;

    // the pinned stage's own height, not the window's: a phone's address bar changes the window
    // as it hides, and the scene used to jump with it
    const measure = () => {
      const r = section.getBoundingClientRect();
      const travel = r.height - stage.clientHeight;
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
      });
      CHAPTERS.forEach((c, i) => chapterRefs.current[i]?.classList.toggle("is-on", p >= c.from && p < c.to));
    };

    // the six leads over the analog's twelve hours, centred on the dial as the camera sees it
    const leads = (p: number) => {
      const dial = scene?.dial();
      const fade = 1 - smooth(OUT[0], OUT[1], p);
      if (!dial || p < RING[0] || fade <= 0) {
        wheel.style.opacity = "0";
        if (heartRef.current) heartRef.current.style.opacity = "0";
        return;
      }
      const w = stage.clientWidth;
      const h = stage.clientHeight;
      // reach past the case, but keep every label inside the stage, clear of the bar and the chapters
      const room = Math.min(dial.x, w - dial.x, dial.y - 80, h - dial.y - 76) - 30;
      const R = Math.max(40, Math.min(dial.r * 1.55, room / 1.14));
      wheel.style.opacity = String(fade);
      // drawn in pixels about the dial's centre (a scaled group would scale the labels' type too)
      wheel.setAttribute("transform", `translate(${dial.x.toFixed(1)} ${dial.y.toFixed(1)})`);
      const at = (deg: number, r: number) => [(Math.cos(rad(deg)) * r).toFixed(1), (Math.sin(rad(deg)) * r).toFixed(1)];
      const lit = span(RING[0], RING[1], p);
      ring.setAttribute("r", R.toFixed(1));
      ring.style.opacity = String(0.22 * lit);
      ticks.forEach((t, i) => {
        const [x1, y1] = at(i * 30, R * 0.93);
        const [x2, y2] = at(i * 30, R);
        t.setAttribute("x1", x1);
        t.setAttribute("y1", y1);
        t.setAttribute("x2", x2);
        t.setAttribute("y2", y2);
        t.style.opacity = String(clamp01(lit * 12 - i));
      });
      const drawn = span(AXES[0], AXES[1], p) * LEADS.length;
      axes.forEach((g, i) => {
        const k = clamp01(drawn - i);
        const e = 1 - (1 - k) ** 3;
        const [, deg] = LEADS[i];
        const [pos, neg, label] = Array.from(g.children) as SVGElement[];
        const [px, py] = at(deg, R * e);
        const [nx, ny] = at(deg + 180, R * e);
        const [lx, ly] = at(deg, R * 1.14);
        pos.setAttribute("x2", px);
        pos.setAttribute("y2", py);
        neg.setAttribute("x2", nx);
        neg.setAttribute("y2", ny);
        label.setAttribute("x", lx);
        label.setAttribute("y", ly);
        pos.style.opacity = neg.style.opacity = k > 0 ? "1" : "0";
        label.style.opacity = String(clamp01(k * 2 - 1));
      });
      hub.style.opacity = String(lit);
      const heart = heartRef.current;
      if (heart) {
        heart.style.opacity = String(fade * span(RING[0], AXES[1], p));
        heart.style.transform = `translate(${(dial.x - R * 1.4).toFixed(1)}px, ${(dial.y - R * 1.4).toFixed(1)}px)`;
        heart.style.width = heart.style.height = `${(R * 2.8).toFixed(1)}px`;
      }
    };

    // night into day: the light opens out of the watch, a soft circle that grows until it fills the
    // stage, and the clinician's screen rises in it
    const day = (p: number) => {
      const light = smooth(0.885, 0.93, p);
      const w = stage.clientWidth;
      const h = stage.clientHeight;
      const wide = w / h >= 1.15;
      const cx = wide ? w * 0.7 : w * 0.5; // where the camera holds the product
      const cy = wide ? h * 0.5 : h * 0.58;
      const far = Math.hypot(Math.max(cx, w - cx), Math.max(cy, h - cy));
      const r = light * (far + 160);
      const sky = dayRef.current;
      if (sky) {
        const mask =
          light >= 1
            ? "none"
            : `radial-gradient(circle at ${cx.toFixed(0)}px ${cy.toFixed(0)}px, #000 ${Math.max(0, r - 160).toFixed(0)}px, transparent ${r.toFixed(0)}px)`;
        sky.style.opacity = light > 0 ? "1" : "0";
        sky.style.maskImage = mask;
        sky.style.setProperty("-webkit-mask-image", mask);
      }
      host.style.opacity = String(1 - smooth(0.92, 0.935, p));
      if (scrimRef.current) scrimRef.current.style.opacity = String(1 - light);
      const rise = smooth(0.905, 0.95, p);
      const clinic = clinicRef.current;
      if (clinic) {
        clinic.style.opacity = String(rise);
        clinic.style.setProperty("--rise", `${((1 - rise) * 48).toFixed(1)}px`);
        clinic.setAttribute("aria-hidden", rise < 0.5 ? "true" : "false");
      }
      const nowDay = light > 0.5;
      if (nowDay !== isDay) {
        isDay = nowDay;
        stage.classList.toggle("is-day", isDay);
        // the bar follows: dark over the night stage, light over the day one
        if (isDay) section.removeAttribute("data-bar-dark");
        else section.setAttribute("data-bar-dark", "");
        window.dispatchEvent(new Event("scroll"));
      }
    };

    // one loop draws the model, the copy and the overlay together, in the frame of the scroll it read
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
        leads(shown);
        day(shown);
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
      <div ref={stageRef} className="ss-stage">
        <div ref={heartRef} className="ss-heart" aria-hidden="true" />
        <div ref={hostRef} className="ss-canvas" />
        <div ref={scrimRef} className="ss-scrim" aria-hidden="true" />
        <div ref={dayRef} className="ss-day" aria-hidden="true" />
        <svg className="ss-leads" aria-hidden="true">
          <g ref={wheelRef} style={{ opacity: 0 }}>
            <circle className="ss-ring" r="1" />
            {Array.from({ length: 12 }, (_, i) => (
              <line key={i} className="ss-tick" />
            ))}
            {LEADS.map(([name]) => (
              <g key={name} className="ss-axis">
                <line className="ss-axis-pos" x1="0" y1="0" x2="0" y2="0" />
                <line className="ss-axis-neg" x1="0" y1="0" x2="0" y2="0" />
                <text className="ss-lead" textAnchor="middle" dominantBaseline="central">
                  {name}
                </text>
              </g>
            ))}
            <circle className="ss-hub" r="4" />
          </g>
        </svg>
        <div ref={clinicRef} className="ss-clinic" aria-hidden="true">
          <HeroTablet />
        </div>
        <div className="wrap ss-copy">
          <h2 id="any-watch-title" className="sr-only">
            One strap. Any watch. Six leads. To your clinician.
          </h2>
          {STEPS.map((s, i) => (
            <div
              key={s.title}
              className={`ss-step${s.day ? " is-day" : ""}`}
              ref={(el) => (copyRefs.current[i] = el)}
            >
              <p className="ss-title">{s.title}</p>
              <p className="ss-text">{s.text}</p>
            </div>
          ))}
        </div>
        <ol className="ss-steps" aria-hidden="true">
          {CHAPTERS.map((c, i) => (
            <li key={c.label} ref={(el) => (chapterRefs.current[i] = el)}>
              <span>{c.label}</span>
            </li>
          ))}
        </ol>
        <p className="ss-note">Concept rendering from the Cyphix 3D model, rendered live</p>
        {mode === "idle" && <span className="ss-loading" aria-hidden="true" />}
      </div>
    </section>
  );
}

// v0.27.0 — the journey in five chapters: the moment (night, the electrodes), the strap, six leads (the hexaxial axes over the analog's twelve hours), ours, your clinician (day, the app on a tablet)
// v0.26.0 — smooth scroll: built ahead at idle, one frame loop draws the model and the copy, a short glide to the scroll position, progress from the pinned stage's height
// v0.10.0 — four ways to wear it: smartwatch, the strap closed into a bracelet, analog, the Cyphix watch; four stills
// v0.8.0 — contiguous copy windows (no empty frame); "One strap." once the watch has left
// v0.8.0 — the "One strap. Any watch." section: sticky dark stage, lazy WebGL scene, scroll-scrubbed copy, still fallback
