import { useRef } from "react";
import { useInView } from "framer-motion";
import Reveal from "./Reveal";
import EcgTrace from "./EcgTrace";

/* The need and the trade-off, in the one-pager's words. The trade-off
   line strikes its "or" and writes "and" when it comes into view —
   the whole positioning in one word. */

export default function Need() {
  const lineRef = useRef<HTMLHeadingElement>(null);
  const on = useInView(lineRef, { once: true, margin: "0px 0px -22% 0px" });

  return (
    <section className="section need" id="need">
      <div className="wrap need-grid">
        <Reveal as="div" className="need-stat">
          <h2 className="display">
            <span className="is-coral">1 in 3</span> deaths worldwide is cardiovascular.
          </h2>
        </Reveal>
        <Reveal as="div" className="need-side" delay={0.12}>
          <p>
            Symptoms are often transient. By the time a patient reaches care, the ECG may be
            normal.
          </p>
        </Reveal>
      </div>

      <div className="need-strip" aria-hidden="true">
        <EcgTrace className="need-canvas" leads={["II"]} colors="#9AA6B8" speed={150} gain={0.3} lineWidth={1.4} />
        <span className="caption need-strip-label">Lead II · illustrative</span>
      </div>

      <div className="wrap tradeoff">
        <h2 ref={lineRef} className={`tradeoff-line${on ? " is-on" : ""}`}>
          Wearable ease{" "}
          <span className="swap" aria-hidden="true">
            <span className="swap-or">or</span>
            <span className="swap-and">and</span>
          </span>
          <span className="sr-only">and</span> clinical depth.
        </h2>
        <Reveal as="div" className="tradeoff-sub" delay={0.1}>
          <p>
            Today it’s one or the other. Cyphix delivers both, on the watch people already wear.
            The crowded market is our installed base.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

// v0.6.0 — the need (1 in 3), a Lead II strip, and the trade-off whose "or" becomes "and"
