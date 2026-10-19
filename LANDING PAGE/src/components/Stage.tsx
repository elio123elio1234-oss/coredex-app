import { useRef, type CSSProperties } from "react";
import { useInView } from "framer-motion";
import Reveal from "./Reveal";
import exploded from "../assets/img/exploded.webp";

/* Where we are — the one-pager's four facts on one drawn line, ending at
   the open, pulsing next step; the exploded render follows as the line's
   figure. The line draws left to right (top to bottom on a phone) when it
   comes into view; each milestone lands as the pen passes it. */

const DONE = [
  "Working prototype",
  "Technological & algorithmic proof of feasibility",
  "Patent pending on the core technology",
  "Israel Innovation Authority · Tnufa program",
];

export default function Stage() {
  const lineRef = useRef<HTMLOListElement>(null);
  const on = useInView(lineRef, { once: true, margin: "0px 0px -20% 0px" });

  return (
    <section className="section stage" id="stage">
      <div className="wrap">
        <Reveal as="div" className="stage-head">
          <h2 className="display">Where we are.</h2>
          <p className="body-lg">
            From a working prototype to a wearable strap, ready for its first trial.
          </p>
        </Reveal>

        <ol ref={lineRef} className={`milestones${on ? " is-on" : ""}`}>
          {DONE.map((t, i) => (
            <li key={t} className="milestone is-done" style={{ "--i": i } as CSSProperties}>
              <span className="milestone-dot" aria-hidden="true" />
              <span className="milestone-text">{t}</span>
            </li>
          ))}
          <li className="milestone is-next" style={{ "--i": DONE.length } as CSSProperties}>
            <span className="milestone-dot" aria-hidden="true" />
            <span className="milestone-text">
              <b>Next step</b>A wearable strap, ready for its first trial.
            </span>
          </li>
        </ol>

        <Reveal as="div" className="stage-figure" y={36}>
          <img
            src={exploded}
            alt="Concept rendering, exploded: the Cyphix module, the strap and the watch"
            width={1506}
            height={832}
            loading="lazy"
            decoding="async"
          />
          <span className="caption">Concept rendering · module, strap, watch</span>
        </Reveal>
      </div>
    </section>
  );
}

// v0.6.0 — the one-pager's "Where we are" on a drawn line ending at the pulsing next step, then the exploded render
