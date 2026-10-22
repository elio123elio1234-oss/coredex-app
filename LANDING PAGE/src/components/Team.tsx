import { Fragment, type CSSProperties } from "react";
import portraitElio from "../assets/img/portrait-elio.webp";
import portraitTamir from "../assets/img/portrait-tamir.webp";

/* The team: the heading and its line, then each person as a portrait
   with the name and role set beside it. */

const PEOPLE = [
  {
    name: "Elio El Hassrouny",
    role: ["Founder & CEO", "ex-Samsung R&D"],
    src: portraitElio,
    w: 640,
    h: 800,
    /* a standing shot: zoomed to head-and-shoulders so both portraits frame alike */
    crop: { "--z": 1.9, "--zo": "52.8% 33.5%" } as CSSProperties,
  },
  {
    name: "Dr. Tamir Wolf, MD",
    role: ["External Clinical Advisor"],
    src: portraitTamir,
    w: 320,
    h: 400,
    crop: undefined,
  },
];

export default function Team() {
  return (
    <section className="section team" id="team" aria-labelledby="team-title">
      <div className="wrap">
        <header className="team-head">
          <h2 id="team-title" className="h2">
            The team.
          </h2>
          <p className="body-lg">Engineering from Samsung R&amp;D, with a physician as clinical advisor.</p>
        </header>
        <ul className="people">
          {PEOPLE.map((p) => (
            <li key={p.name} className="person">
              <div className="person-photo" style={p.crop}>
                <img
                  src={p.src}
                  alt={`Portrait of ${p.name}`}
                  width={p.w}
                  height={p.h}
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <div className="person-text">
                <h3 className="person-name">{p.name}</h3>
                <p className="person-role">
                  {p.role.map((r, k) => (
                    <Fragment key={r}>
                      {k > 0 && <br />}
                      {r}
                    </Fragment>
                  ))}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// v0.7.0 — heading over two portrait-and-name rows; the founder's standing shot zoomed to match the advisor's headshot
// v0.6.0 — the one-pager's team band: heading, then portrait + name + role for each person
