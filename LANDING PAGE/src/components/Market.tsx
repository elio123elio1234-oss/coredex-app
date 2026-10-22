import { ArrowRight } from "./Icons";

/* Market and ask, drawn the way the one-pager draws them: two nested
   circles (SAM at 0.78 of TAM's diameter, the square root of 2.76 / 4.53,
   so their areas compare honestly), a marker on each with a leader line
   to its figure; the seed ask beyond a rule. Static figures. */

export default function Market() {
  return (
    <section className="section market" id="market" aria-labelledby="market-title">
      <div className="wrap">
        <header className="section-head">
          <h2 id="market-title" className="h2">
            Built for a $4.53B market.
          </h2>
          <p className="body-lg">Global mobile ECG, and the home-healthcare segment within it.</p>
        </header>

        <div className="market-grid">
          <div className="market-chart">
            <div className="circles" aria-hidden="true">
              <span className="circle is-tam" />
              <span className="circle is-sam" />
              <span className="mk is-tam" />
              <span className="mk is-sam" />
            </div>
            <dl className="market-rows">
              <div className="market-row is-tam">
                <dt className="label">TAM</dt>
                <dd>
                  <span className="market-figure">$4.53B</span>
                  <span className="market-desc">Global mobile ECG market</span>
                </dd>
              </div>
              <div className="market-row is-sam">
                <dt className="label">SAM</dt>
                <dd>
                  <span className="market-figure">$2.76B</span>
                  <span className="market-desc">Home healthcare segment</span>
                </dd>
              </div>
            </dl>
          </div>

          <div className="ask">
            <span className="label">Seed ask</span>
            <span className="ask-figure">$1.9M</span>
            <a className="btn btn-primary" href="#contact">
              Request the deck <ArrowRight />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

// v0.7.0 — static figures (no count-up, no growing circles)
// v0.6.0 — TAM / SAM as the one-pager's nested circles with leader lines; the $1.9M seed ask
