import { Fragment, useLayoutEffect, useRef, useState, type CSSProperties, type MouseEvent } from "react";
import { useMotionValueEvent, useReducedMotion, useScroll } from "framer-motion";
import EcgTrace from "./EcgTrace";
import { ArrowRight, ArrowDown } from "./Icons";
import { LEADS } from "../lib/ecgModel";
import { sceneFrame, sceneLayout, type Rect, type SceneLayout } from "../lib/heroScene";
import watchFront from "../assets/img/watch-front.webp";
import watchModule from "../assets/img/watch-module.webp";

/* ==================================================================
   HeroScene — "out of the screen".

   The visitor lands inside the CYPHIX display: six limb leads running,
   the headline under them. Scrolling zooms out until that display is
   the screen of the watch, then the module arrives beside it and the
   one-pager's four callouts draw. Geometry lives in lib/heroScene.ts;
   this component only writes each frame into styles (no re-render per
   frame). With reduced motion the display stands still and the device
   pair is shown as a plain figure underneath.
   ================================================================== */

/** The render's own display palette: salmon, peach, butter, mint, sky, lavender. */
const TRACE_COLORS = ["#FF8C7C", "#F8B07A", "#EED37F", "#9EE0BD", "#8DCFF1", "#BCA7F6"];

interface Callout {
  on: "module" | "watch";
  at: [number, number];
  side: "left" | "right";
  label: string;
  sub?: string;
}
const CALLOUTS: Callout[] = [
  { on: "module", at: [0.17, 0.18], side: "left", label: "Strap" },
  { on: "module", at: [0.08, 0.66], side: "left", label: "Cyphix module", sub: "Electrodes shown in coral" },
  { on: "watch", at: [0.9, 0.24], side: "right", label: "Your watch", sub: "Connects to any watch" },
  { on: "watch", at: [0.8, 0.62], side: "right", label: "6-lead ECG" },
];

const PLATE_CAPTION = ["Concept renderings", "electrodes in coral", "illustrative signal"];

const px = (n: number) => `${n.toFixed(2)}px`;

export default function HeroScene() {
  const reduce = useReducedMotion() ?? false;
  const sceneRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const screenRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const metaRef = useRef<HTMLSpanElement>(null);
  const watchRef = useRef<HTMLImageElement>(null);
  const moduleRef = useRef<HTMLImageElement>(null);
  const shadowRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const layoutRef = useRef<SceneLayout | null>(null);
  const [L, setL] = useState<SceneLayout | null>(null);

  const { scrollYProgress } = useScroll({ target: sceneRef, offset: ["start start", "end end"] });

  const apply = (p: number) => {
    const l = layoutRef.current;
    const screen = screenRef.current;
    if (!l || !screen) return;
    const f = sceneFrame(reduce ? 0 : p, l);

    screen.style.transform = `translate3d(${px(f.tx)}, ${px(f.ty)}, 0) scale(${f.scale.toFixed(5)})`;
    screen.style.clipPath = f.clip;

    const place = (el: HTMLElement | null, r: Rect, base: Rect, opacity: number) => {
      if (!el) return;
      el.style.transform = `translate3d(${px(r.x)}, ${px(r.y)}, 0) scale(${(r.w / base.w).toFixed(5)})`;
      el.style.opacity = opacity.toFixed(3);
      el.style.visibility = opacity <= 0.001 ? "hidden" : "visible";
    };
    place(watchRef.current, f.watch, l.watchA, f.watchOpacity);
    place(moduleRef.current, f.module, l.moduleB, f.moduleOpacity);

    const copy = copyRef.current;
    if (copy) {
      copy.style.opacity = f.copy.toFixed(3);
      copy.style.transform = `translate3d(0, ${px((1 - f.copy) * -28)}, 0)`;
      copy.style.visibility = f.copy <= 0.001 ? "hidden" : "visible";
    }
    // The in-screen "illustrative" label leaves with the headline; a note under
    // the zoom carries it until the plate's caption (which repeats it) arrives.
    if (metaRef.current) metaRef.current.style.opacity = f.copy.toFixed(3);
    overlayRef.current?.style.setProperty("--n", f.note.toFixed(3));
    shadowRef.current?.style.setProperty("--b", f.moduleOpacity.toFixed(3));
    overlayRef.current?.style.setProperty("--s", f.statement.toFixed(3));
    overlayRef.current?.style.setProperty("--c", f.callouts.toFixed(3));
  };

  useMotionValueEvent(scrollYProgress, "change", apply);

  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const measure = () => {
      const l = sceneLayout(stage.clientWidth, stage.clientHeight);
      layoutRef.current = l;
      setL(l);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(stage);
    return () => ro.disconnect();
  }, []);

  useLayoutEffect(() => {
    apply(scrollYProgress.get());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [L, reduce]);

  /** "See the device" — scroll to the end of the zoom, where the pair stands. */
  const toDevice = (e: MouseEvent<HTMLAnchorElement>) => {
    const scene = sceneRef.current;
    if (!scene || reduce) return;
    e.preventDefault();
    const top = scene.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: top + (scene.offsetHeight - window.innerHeight) * 0.97, behavior: "smooth" });
  };

  const screenStyle = L
    ? ({
        left: L.full.x,
        top: L.full.y,
        width: L.full.w,
        height: L.full.h,
        "--pad": `${L.pad}px`,
        "--leads-top": `${L.leadsTop}px`,
        "--leads-h": `${L.leadsH}px`,
      } as CSSProperties)
    : undefined;

  return (
    <section ref={sceneRef} className={`scene${reduce ? " is-static" : ""}`} aria-label="Cyphix — Clinical depth. Wearable ease.">
      <div ref={stageRef} className="scene-stage">
        <div className="scene-glow" aria-hidden="true" />

        {L && !reduce && (
          <>
            <div ref={shadowRef} className="scene-shadows" aria-hidden="true">
              <span style={floorStyle(L.moduleB)} />
              <span style={floorStyle(L.watchB)} />
            </div>
            <img
              ref={moduleRef}
              className="scene-img"
              src={watchModule}
              alt="Concept rendering: the Cyphix module on the watch strap, electrodes shown in coral"
              width={L.moduleB.w}
              height={L.moduleB.h}
              style={{ width: L.moduleB.w, height: L.moduleB.h }}
              draggable={false}
            />
            <img
              ref={watchRef}
              className="scene-img"
              src={watchFront}
              alt="Concept rendering: the watch, its screen showing a 6-lead ECG"
              width={L.watchA.w}
              height={L.watchA.h}
              style={{ width: L.watchA.w, height: L.watchA.h }}
              draggable={false}
            />
          </>
        )}

        <div ref={screenRef} className={`screen${L ? " is-ready" : ""}`} style={screenStyle}>
          <div className="screen-head">
            <div className="screen-brand">
              <span className="screen-name">CYPHIX</span>
              <span className="screen-sub">
                6-lead ECG <i className="rec-dot" aria-hidden="true" />
              </span>
            </div>
            <span ref={metaRef} className="screen-meta">
              <Dotted items={["Illustrative signal", "not patient data"]} />
            </span>
          </div>

          <div className="screen-leads" aria-hidden="true">
            <div className="screen-grid" />
            <ol className="screen-labels">
              {LEADS.map((l, i) => (
                <li key={l} style={{ color: TRACE_COLORS[i] }}>
                  {l}
                </li>
              ))}
            </ol>
            {L && (
              <EcgTrace
                className="screen-canvas"
                leads={LEADS}
                colors={TRACE_COLORS}
                mode="scroll"
                glow
                speed={L.compact ? 88 : 148}
                gain={0.42}
                lineWidth={L.compact ? 1.5 : 1.9}
              />
            )}
          </div>

          <div ref={copyRef} className="screen-copy">
            <h1 className="hero-title">
              <span className="line">
                <span>Clinical Depth.</span>
              </span>
              <span className="line is-accent">
                <span>Wearable Ease.</span>
              </span>
            </h1>
            <div className="hero-side">
              <p className="hero-lede">
                A wearable 6-lead ECG acquisition system that captures clinically relevant cardiac
                signals when symptoms occur, and sends them straight to the clinician. No adhesive
                patches, wires or professional setup.
              </p>
              <div className="hero-actions">
                <a className="btn btn-primary" href="#contact">
                  Request the deck <ArrowRight />
                </a>
                <a className="btn-link is-light" href="#device" onClick={toDevice}>
                  See the device <ArrowDown />
                </a>
              </div>
            </div>
          </div>
        </div>

        {L && !reduce && (
          <div ref={overlayRef} className={`scene-overlay${L.compact ? " is-compact" : ""}`}>
            {L.compact ? (
              <>
                <p className="scene-tag is-start" style={tagStyle(L.moduleB, 0, "start")}>
                  Cyphix module
                </p>
                <p className="scene-tag" style={tagStyle(L.watchB, 1, "center")}>
                  Your watch · 6-lead ECG
                </p>
              </>
            ) : (
              CALLOUTS.map((c, i) => <CalloutLine key={c.label} c={c} i={i} L={L} />)
            )}
            <p className="caption scene-note" aria-hidden="true">
              <Dotted items={["Illustrative signal", "not patient data"]} />
            </p>
            <div className="scene-statement">
              <p>A module on the strap of the watch you already wear.</p>
              <span className="caption">
                <Dotted items={PLATE_CAPTION} />
              </span>
            </div>
          </div>
        )}
      </div>

      {reduce && (
        <figure className="device-plate" id="device-plate">
          <img src={watchModule} alt="Concept rendering: the Cyphix module on the watch strap, electrodes shown in coral" />
          <img src={watchFront} alt="Concept rendering: the watch, its screen showing a 6-lead ECG" />
          <figcaption>
            <p>A module on the strap of the watch you already wear.</p>
            <span className="caption">
              <Dotted items={PLATE_CAPTION} />
            </span>
          </figcaption>
        </figure>
      )}
    </section>
  );
}

/** A soft floor shadow under an image box (end of phase B). */
function floorStyle(r: Rect): CSSProperties {
  return { left: r.x + r.w * 0.12, top: r.y + r.h * 0.965, width: r.w * 0.76 };
}

/** A phone tag under an image: left-aligned at its edge, or centred under it. */
function tagStyle(r: Rect, i: number, align: "start" | "center"): CSSProperties {
  const left = align === "start" ? r.x + 4 : r.x + r.w / 2;
  return { left, top: r.y + r.h + 12, "--i": i } as CSSProperties;
}

/** "a · b · c" that wraps only between items, never leaving a "·" to start a line. */
function Dotted({ items }: { items: readonly string[] }) {
  return (
    <>
      {items.map((t, i) => (
        <Fragment key={t}>
          {i > 0 ? " " : ""}
          <span className="nowrap">
            {t}
            {i < items.length - 1 && <span className="sep"> ·</span>}
          </span>
        </Fragment>
      ))}
    </>
  );
}

function CalloutLine({ c, i, L }: { c: Callout; i: number; L: SceneLayout }) {
  const box = c.on === "module" ? L.moduleB : L.watchB;
  const ax = box.x + c.at[0] * box.w;
  const ay = box.y + c.at[1] * box.h;
  const end = c.side === "left" ? L.moduleB.x - 36 : L.watchB.x + L.watchB.w + 36;
  const left = Math.min(ax, end);
  const width = Math.abs(ax - end);
  return (
    <div
      className={`callout is-${c.side}`}
      style={{ left, top: ay, width, "--i": i } as CSSProperties}
    >
      <span className="callout-line" />
      <span className="callout-dot" />
      <span className="callout-label">
        <b>{c.label}</b>
        {c.sub && <small>{c.sub}</small>}
      </span>
    </div>
  );
}

// v0.6.0 — the hero: a live 6-lead display that zooms out into the watch, then the module and the one-pager callouts
