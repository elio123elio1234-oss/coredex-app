import { useRef } from "react";
import { useInView } from "framer-motion";
import Reveal from "./Reveal";
import CountUp from "./CountUp";
import { ArrowRight } from "./Icons";

/* Market and ask, drawn the way the one-pager draws them: two nested
   circles (sized by the ratio of the two markets' areas), a dot on each,
   a leader line to its figure; the seed ask on the far side of a rule. */

export default function Market() {
  const chartRef = useRef<HTMLDivElement>(null);
  const on = useInView(chartRef, { once: true, margin: "0px 0px -20% 0px" });

  return (
    <section className="section market" id="market">
      <div className="wrap">
        <div className="section-head">
          <Reveal as="div">
            <h2 className="display">Built for a $4.53B market.</h2>
          </Reveal>
          <Reveal as="div" delay={0.08}>
            <p className="body-lg">Global mobile ECG, and the home-healthcare segment within it.</p>
          </Reveal>
        </div>

        <div className="market-grid">
          <div ref={chartRef} className={`market-chart${on ? " is-on" : ""}`}>
            <div className="circles" aria-hidden="true">
              <span className="circle is-tam" />
              <span className="circle is-sam" />
              <span className="mk-dot is-tam" />
              <span className="mk-dot is-sam" />
              <span className="mk-line is-tam" />
              <span className="mk-line is-sam" />
            </div>
            <dl className="market-rows">
              <div className="market-row is-tam">
                <dt className="caption">TAM</dt>
                <dd>
                  <CountUp className="market-figure" value={4.53} decimals={2} prefix="$" suffix="B" />
                  <span className="market-desc">Global mobile ECG market</span>
                </dd>
              </div>
              <div className="market-row is-sam">
                <dt className="caption">SAM</dt>
                <dd>
                  <CountUp className="market-figure" value={2.76} decimals={2} prefix="$" suffix="B" />
                  <span className="market-desc">Home healthcare segment</span>
                </dd>
              </div>
            </dl>
          </div>

          <Reveal as="div" className="ask" delay={0.15}>
            <span className="caption">Seed ask</span>
            <CountUp className="ask-figure" value={1.9} decimals={1} prefix="$" suffix="M" duration={1.9} />
            <a className="btn btn-primary" href="#contact">
              Request the deck <ArrowRight />
            </a>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

// v0.6.0 — TAM / SAM as the one-pager's nested circles with leader lines; the $1.9M seed ask
