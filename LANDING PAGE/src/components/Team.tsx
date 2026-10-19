import { Fragment } from "react";
import Reveal from "./Reveal";
import portraitElio from "../assets/img/portrait-elio.webp";
import portraitTamir from "../assets/img/portrait-tamir.webp";

/* The team, set the way the one-pager sets it: one band between two
   hairlines — the heading, then each person as portrait + name + role. */

const PEOPLE = [
  {
    name: "Elio El Hassrouny",
    role: ["Founder & CEO", "ex-Samsung R&D"],
    src: portraitElio,
    w: 640,
    h: 800,
    crop: " is-wide",
  },
  {
    name: "Dr. Tamir Wolf, MD",
    role: ["External Clinical Advisor"],
    src: portraitTamir,
    w: 320,
    h: 400,
    crop: "",
  },
];

export default function Team() {
  return (
    <section className="section team" id="team">
      <div className="wrap">
        <div className="team-band">
          <Reveal as="div">
            <h2 className="display">The team.</h2>
          </Reveal>
          <ul className="people">
            {PEOPLE.map((p, i) => (
              <Reveal as="li" key={p.name} className="person" delay={0.08 + i * 0.1}>
                <div className={`person-photo${p.crop}`}>
                  <img src={p.src} alt={`Portrait of ${p.name}`} width={p.w} height={p.h} loading="lazy" decoding="async" />
                </div>
                <div className="person-text">
                  <h3 className="person-name">{p.name}</h3>
                  <p className="person-role">
                    {p.role.map((r, k) => (
                      <Fragment key={r}>
                        {k > 0 ? " " : ""}
                        <span className="nowrap">
                          {k > 0 && <span className="sep">· </span>}
                          {r}
                        </span>
                      </Fragment>
                    ))}
                  </p>
                </div>
              </Reveal>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

// v0.6.0 — the one-pager's team band: heading, then portrait + name + role for each person
