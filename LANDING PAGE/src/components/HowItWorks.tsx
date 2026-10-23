import moduleRender from "../assets/img/render-module.webp";
import { LinePulse, LineSend, LineWatch } from "./Icons";

/* How it works, in AliveCor's list form: a heading with a rule, three rows
   with line icons on the left, the strap's module and electrodes on the
   right (a render of the 3D model). */

const ROWS = [
  {
    icon: LineWatch,
    lead: "Wear it.",
    text: "The Cyphix module sits on the strap of the watch you already wear, and connects to any watch.",
  },
  {
    icon: LinePulse,
    lead: "Record when it happens.",
    text: "When symptoms occur, the module records a 6-lead ECG: leads I, II, III, aVR, aVL and aVF.",
  },
  {
    icon: LineSend,
    lead: "Send it to the clinician.",
    text: "The recording goes directly to the clinician. No adhesive patches, wires or professional setup.",
  },
];

export default function HowItWorks() {
  return (
    <section className="section how" id="how" aria-labelledby="how-title">
      <div className="wrap">
        <div className="rule-head">
          <h2 id="how-title" className="h2">
            How it works
          </h2>
        </div>
        <div className="rows-grid">
          <ul className="rows">
            {ROWS.map(({ icon: Icon, lead, text }) => (
              <li key={lead}>
                <Icon className="row-icon" />
                <p>
                  <strong>{lead}</strong> {text}
                </p>
              </li>
            ))}
          </ul>
          <figure className="rows-media is-render">
            <img
              src={moduleRender}
              width={1348}
              height={1528}
              alt="The Cyphix strap from behind: the module's electrodes on the band, beside the back of the watch."
              loading="lazy"
              decoding="async"
            />
            <figcaption className="media-note">Concept rendering from the Cyphix 3D model</figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}

// v0.9.0 — AliveCor-style list: wear · record · send with line icons, the module render beside it
