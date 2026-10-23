import { PHOTOS } from "../config/photos";

/* The need, AliveCor-style: a photograph filling the left half (the Gemini
   "home moment" once supplied; until then the one-pager's figure set large
   on the navy, so the page never repeats the hero render), the statement and
   its paragraph on the right. */

export default function Need() {
  const photo = PHOTOS.home;
  return (
    <section className="split" id="need" aria-labelledby="need-title">
      {photo ? (
        <figure className="split-media is-photo">
          <img
            src={photo.src}
            alt={photo.alt}
            width={photo.w}
            height={photo.h}
            style={{ objectPosition: photo.focus }}
            loading="lazy"
            decoding="async"
          />
          <figcaption className="media-note">Concept imagery</figcaption>
        </figure>
      ) : (
        <div className="split-media is-figure" aria-hidden="true">
          <span className="split-figure is-coral">1 in 3</span>
        </div>
      )}
      <div className="split-copy">
        <h2 id="need-title" className="statement">
          1 in 3 deaths worldwide is cardiovascular.
        </h2>
        <p className="body-lg">
          Symptoms are often transient. By the time a patient reaches care, the ECG may be
          normal. Cyphix records at the moment it happens, on the watch the patient is already
          wearing.
        </p>
      </div>
    </section>
  );
}

// v0.13.0 — the user's image fills the slot (a physician reviewing a recording), cropped to keep the laptop
// v0.9.0 — interim panel is the "1 in 3" figure on navy, not a repeated render
// v0.9.0 — AliveCor-style split: photo slot "home" left, the need right (the comparison moved to Compare)
// v0.7.0 — explicit table roles (the phone layout re-displays the rows); the need, then the trade-off as a three-way comparison
