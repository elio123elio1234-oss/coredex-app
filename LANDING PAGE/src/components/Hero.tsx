import heroRender from "../assets/img/render-hero.webp";
import { PHOTOS } from "../config/photos";
import { useEffect, useState } from "react";
import { useHeroScene } from "../lib/useHeroScene";
import HeroTablet from "./HeroTablet";

/* The opening, AliveCor-style: a slate band; on the left a notice chip and
   the two-line headline (the second line in coral); on the right the
   product: the user's raised forearm with the module on the inside of the
   wrist, rising from the band's lower edge, and behind it on the left the
   system, the CYPHIX app on a tablet, as AliveCor stands its tablet behind
   the hand (until a photo is supplied, the render of the team's 3D model
   stands in).

   On a wide screen the band holds while the visitor scrolls
   (lib/useHeroScene): its content fades out, the day's light and the
   clinician's screen fade in, already writing, "Catch the Invisible.", and
   the page scrolls on. On a phone or a portrait screen nothing holds (the
   user: the held scene squeezed the hand): the band in its own phone layout,
   and the clinician's screen as a section of its own under it. */

/* the held scene needs the two columns side by side */
const WIDE = "(min-width: 1024px), (min-aspect-ratio: 5/4)";

function useWide() {
  const [wide, setWide] = useState(() => window.matchMedia(WIDE).matches);
  useEffect(() => {
    const mq = window.matchMedia(WIDE);
    const on = () => setWide(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return wide;
}

export default function Hero() {
  const photo = PHOTOS.hero;
  const wide = useWide();
  const { pin, stage, moment } = useHeroScene(wide);
  // reduced motion: the clinician's screen holds still, its recording in full
  const [live] = useState(
    () => !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  const band = (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-copy">
        <p className="chip">In development · Not for sale</p>
        <h1 id="hero-title" className="hero-title">
          End the Diagnostic
          <span className="is-coral">Blind Spot.</span>
        </h1>
        <p className="hero-lede">
          A clinical-grade 6-lead ECG integrated into your everyday watch strap.
          Capture transient symptoms the exact moment they strike, and share
          pristine data directly with your clinician.
        </p>
      </div>
      <figure className={`hero-media${photo ? " is-arm" : ""}`}>
        {photo ? (
          <>
            <HeroTablet />
            <img
              className="hero-arm"
              src={photo.src}
              alt={photo.alt}
              width={photo.w}
              height={photo.h}
              decoding="async"
            />
          </>
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
      </figure>
    </section>
  );

  const scene = (
    <div className="wrap hm-inner">
      <div className="hm-copy">
        <h2 id="moment-title" className="hm-title">
          Catch the Invisible.
        </h2>
        <p className="hm-text">
          Transient symptoms disappear quickly. Cyphix records clinical-grade
          morphology at symptom onset, ensuring your clinician never misses a
          critical event.
        </p>
      </div>
      <div className="hm-media">
        <HeroTablet live={live} full />
      </div>
    </div>
  );

  if (!wide) {
    return (
      <>
        {band}
        <section className="hero-moment is-flat" aria-labelledby="moment-title">
          {scene}
        </section>
      </>
    );
  }

  return (
    <div ref={pin} className="hero-pin">
      <div ref={stage} className="hero-stage">
        <div className="hero-slide">{band}</div>

        {/* the day's light fills the whole stage, behind the scene's slide */}
        <div className="hm-bg" aria-hidden="true" />

        <div className="hero-slide is-moment">
          <section
            ref={moment}
            className="hero-moment"
            aria-labelledby="moment-title"
            aria-hidden="true"
            style={{ display: "none" }}
          >
            {scene}
          </section>
        </div>
      </div>
    </div>
  );
}

// v0.38.34 — the headline "End the Diagnostic / Blind Spot." (the user: "let's try"), the same white over coral
// v0.38.9 — phones and portrait screens: no held scene (the user: "small and not good… maybe on such screens no transition, just a screen below"); the band in its phone layout, the clinician's screen a section under it
// v0.37.6 — the scene's words, the user's: "Catch the Invisible." and its line (the "in your hands" / "on your hand" swap retired)
// v0.37.5 — the slide's scaling withdrawn (its wrappers stay as the scene's layers)
// v0.37.4 — the opening line, the user's new wording ("A clinical-grade 6-lead ECG integrated into your everyday watch strap…")
// v0.37.3 — both scenes on a "slide" (1440 x 828) scaled to the stage, the same composition at any zoom; the light behind it fills the stage; no "Concept imagery" caption
// v0.37.2 — the scene cross-fades in over the unmoved hero
// v0.37.1 — the day's light as its own layer (no white circle): the tablet glides into the scene
// v0.37.0 — "Request the deck" leaves the hero (the user); the band holds on scroll and turns into the clinician's screen, "The moment, in your hands." then "on your hand."
// v0.19.0 — the tablet is a component: its screen drawn live as vectors (HeroTablet)
// v0.18.0 — the tablet is built: the user's empty frame with the CYPHIX screen drawn in tools/tablet (1000 x 690)
// v0.16.0 — the user's third tablet image (1000 x 647); same width and place
// v0.13.0 — the user's new tablet image (wider, 1000 x 563); the hand further over its right side
// v0.12.0 — the forearm at its v0.11.0 size, lower in the band; the user's tablet image of the system behind it
// v0.11.1 — the forearm alone (the render beside it looked staged, and it appears further down the page)
// v0.11.0 — the user's raised-forearm image beside the render: the module underneath, the watch on top
// v0.9.0 — AliveCor-style slate hero: chip, two-line headline, solid button; product media on the right (photo slot "hero")
// v0.8.0 — split opening: the copy beside a render of the team's 3D model (the flat concept pair is retired)
