import heroRender from "../assets/img/render-hero.webp";
import { PHOTOS } from "../config/photos";
import { ArrowRight } from "./Icons";

/* The opening, AliveCor-style: a slate band; on the left a notice chip,
   the two-line headline (the second line in coral) and the action; on the
   right the product — the Gemini wrist photograph once supplied, until then
   the render of the team's 3D model. */

export default function Hero() {
  const photo = PHOTOS.hero;
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-copy">
        <p className="chip">In development · Not for sale</p>
        <h1 id="hero-title" className="hero-title">
          Clinical Depth.
          <span className="is-coral">Wearable Ease.</span>
        </h1>
        <p className="hero-lede">
          A 6-lead ECG module on the strap of the watch you already wear. It records when
          symptoms occur and sends the recording directly to the clinician.
        </p>
        <a className="btn btn-solid" href="#contact">
          Request the deck <ArrowRight />
        </a>
      </div>
      <figure className={`hero-media${photo ? " is-photo" : ""}`}>
        {photo ? (
          <img src={photo.src} alt={photo.alt} width={photo.w} height={photo.h} decoding="async" />
        ) : (
          <img
            className="hero-render"
            src={heroRender}
            width={1289}
            height={1358}
            alt="The Cyphix strap on a smartwatch: the watch shows CYPHIX 6-lead ECG, the module with its electrodes sits on the band beside it."
            decoding="async"
          />
        )}
        <figcaption className="media-note">Concept rendering</figcaption>
      </figure>
    </section>
  );
}

// v0.9.0 — AliveCor-style slate hero: chip, two-line headline, solid button; product media on the right (photo slot "hero")
// v0.8.0 — split opening: the copy beside a render of the team's 3D model (the flat concept pair is retired)
