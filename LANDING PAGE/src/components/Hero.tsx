import moduleRender from "../assets/img/watch-module.webp";
import watchRender from "../assets/img/watch-front.webp";
import { ArrowDown, ArrowRight } from "./Icons";

/* The one-pager's opening, played straight: the headline, the lede, the
   action, then the product pair with its four leader-line callouts.

   The pair sits in a 1200 × 520 frame. The module render (1142 × 1389)
   is placed at x 150, y 10, 500 px tall; the watch render (642 × 999) at
   x 690, y 15, 490 px tall. Each callout dot is a point on a render
   (strap band, lower electrode, case, screen trace) mapped into that
   frame, so the dots stay on the product at every width. */

type Callout = {
  id: string;
  side: "left" | "right";
  label: string;
  sub?: string;
  dot: [number, number];
  /** x where the line meets the label */
  end: number;
};

const CALLOUTS: Callout[] = [
  { id: "strap", side: "left", label: "Strap", dot: [232.8, 107.2], end: 132 },
  { id: "module", side: "left", label: "Cyphix module", dot: [211.2, 370], end: 132 },
  { id: "watch", side: "right", label: "Your watch", sub: "Connects to any watch", dot: [945.1, 137.6], end: 1010 },
  { id: "ecg", side: "right", label: "6-lead ECG", dot: [913.2, 339.7], end: 1010 },
];


const pct = (v: number, of: number) => `${(v / of) * 100}%`;

export default function Hero() {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="wrap hero-copy">
        <h1 id="hero-title" className="hero-title">
          <span className="line">
            <span>Clinical Depth.</span>
          </span>
          <span className="line is-coral">
            <span>Wearable Ease.</span>
          </span>
        </h1>
        <p className="hero-lede">
          A wearable 6-lead ECG acquisition system designed to capture clinically relevant
          cardiac signals when symptoms occur, and transmit them directly to the clinician,
          without adhesive patches, wires or professional setup.
        </p>
        <div className="hero-actions">
          <a className="btn btn-primary" href="#contact">
            Request the deck <ArrowRight />
          </a>
          <a className="btn-link" href="#product">
            How it works <ArrowDown />
          </a>
        </div>
      </div>

      <figure className="wrap hero-figure-wrap">
        <div className="hero-figure">
          <span className="hf-floor is-module" aria-hidden="true" />
          <span className="hf-floor is-watch" aria-hidden="true" />
          <img
            className="hf-render hf-module"
            src={moduleRender}
            width={1142}
            height={1389}
            alt="The Cyphix module on a watch strap: coral electrodes on the outer face, the watch's back beside it."
            decoding="async"
          />
          <img
            className="hf-render hf-watch"
            src={watchRender}
            width={642}
            height={999}
            alt="The watch, front view, its screen showing six ECG leads labelled CYPHIX, 6-lead ECG."
            decoding="async"
          />
          <svg className="hf-lines" viewBox="0 0 1200 520" aria-hidden="true">
            {CALLOUTS.map((c) => (
              <path
                key={c.id}
                className="co-line"
                pathLength={1}
                d={
                  c.side === "left"
                    ? `M${c.end + 6} ${c.dot[1]} H${c.dot[0]}`
                    : `M${c.end - 6} ${c.dot[1]} H${c.dot[0]}`
                }
              />
            ))}
            {CALLOUTS.map((c) => (
              <circle key={c.id} className="co-dot" cx={c.dot[0]} cy={c.dot[1]} r={6} />
            ))}
          </svg>
          {CALLOUTS.map((c) => (
            <span
              key={c.id}
              className={`co-label is-${c.side}`}
              style={
                c.side === "left"
                  ? { right: pct(1200 - c.end, 1200), top: pct(c.dot[1], 520) }
                  : { left: pct(c.end, 1200), top: pct(c.dot[1], 520) }
              }
              aria-hidden="true"
            >
              {c.label}
              {c.sub && <small>{c.sub}</small>}
            </span>
          ))}
        </div>
        <ul className="hero-tags" aria-hidden="true">
          <li>
            Cyphix module<small>on the strap</small>
          </li>
          <li>
            Your watch<small>6-lead ECG</small>
          </li>
        </ul>
        <figcaption className="hero-caption fig-caption">
          Concept renderings · electrodes shown in coral
        </figcaption>
      </figure>
    </section>
  );
}

// v0.7.0 — the one-pager's opening: headline, lede, the deck, the product pair with its callouts
