import heroRender from "../assets/img/render-hero.webp";
import { ArrowDown, ArrowRight } from "./Icons";

/* The opening: the one-pager's headline, lede and action on the left; on
   the right the product itself — the Cyphix strap on a smartwatch,
   rendered from the team's 3D model (screen, module and electrodes in one
   three-quarter view) on a soft studio light. */

export default function Hero() {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="wrap hero-grid">
        <div className="hero-copy">
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
            <a className="btn-link" href="#any-watch">
              See it on any watch <ArrowDown />
            </a>
          </div>
        </div>

        <figure className="hero-figure">
          <div className="hero-product">
            <img
              src={heroRender}
              width={1289}
              height={1358}
              alt="The Cyphix strap on a smartwatch: the watch shows CYPHIX 6-lead ECG, the module with its electrodes sits on the band beside it."
              decoding="async"
            />
          </div>
          <figcaption className="fig-caption">Concept rendering from the Cyphix 3D model</figcaption>
        </figure>
      </div>
    </section>
  );
}

// v0.8.0 — split opening: the copy beside a render of the team's 3D model (the flat concept pair is retired)
// v0.7.0 — the one-pager's opening: headline, lede, the deck, the product pair with its callouts
