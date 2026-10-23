import smartStill from "../assets/img/scene-smart.webp";
import strapStill from "../assets/img/scene-strap.webp";
import analogStill from "../assets/img/scene-analog.webp";
import { PHOTOS } from "../config/photos";
import { ArrowDown } from "./Icons";

/* "Our solution", AliveCor-style: a full-bleed photograph (the Gemini
   "three people, three watches, one strap" once supplied; until then the
   strap on a smartwatch, alone, and on an analog watch, rendered from the
   3D model) with a navy card rising over its lower edge. */

const STILLS = [
  { src: smartStill, alt: "The Cyphix strap on a smartwatch." },
  { src: strapStill, alt: "The Cyphix strap on its own." },
  { src: analogStill, alt: "The same Cyphix strap on an analog watch." },
];

export default function Product() {
  const photo = PHOTOS.group;
  return (
    <section className="solution" id="solution" aria-labelledby="solution-title">
      <figure className={`solution-media${photo ? " is-photo" : " is-render"}`}>
        {photo ? (
          <img src={photo.src} alt={photo.alt} width={photo.w} height={photo.h} loading="lazy" decoding="async" />
        ) : (
          <div className="solution-stills">
            {STILLS.map((s) => (
              <img key={s.alt} src={s.src} alt={s.alt} width={1200} height={1200} loading="lazy" decoding="async" />
            ))}
          </div>
        )}
      </figure>
      <div className="wrap">
        <div className="solution-card">
          <h2 id="solution-title">Our solution</h2>
          <p>
            Cyphix is a module on the strap of the watch you already wear. When symptoms occur it
            records a 6-lead ECG and sends it directly to the clinician, without adhesive patches,
            wires or professional setup. One strap, on any watch.
          </p>
          <a className="card-link" href="#how">
            See how it works <ArrowDown width={16} height={16} />
          </a>
        </div>
      </div>
    </section>
  );
}

// v0.9.0 — "Our solution": full-bleed photo slot "group" (interim: three renders) under a navy card
// v0.8.0 — re-rendered in the product studio (AO, contact shadow); dots re-projected, the strap's on the band surface
