import appLeads from "../assets/img/app-limb-leads.webp";
import { PHOTOS } from "../config/photos";
import { LineClinic, LinePerson, LineStethoscope } from "./Icons";

/* Who it is for, in AliveCor's "Our customers" form: three rows with line
   icons on the left; on the right the Gemini clinic photograph once
   supplied, until then the real app's limb-lead screen. Cyphix records and
   displays; reading the ECG is the clinician's. */

const ROWS = [
  {
    icon: LinePerson,
    lead: "For patients,",
    text: "a 6-lead ECG recorded the moment symptoms appear, wherever they are, on the watch they already wear.",
  },
  {
    icon: LineStethoscope,
    lead: "For clinicians,",
    text: "the six limb leads arrive directly, side by side, in the layout they already read.",
  },
  {
    icon: LineClinic,
    lead: "For clinics,",
    text: "their patients' recordings in one place, without fitting patches or scheduling a Holter.",
  },
];

export default function WhoFor() {
  const photo = PHOTOS.clinic;
  return (
    <section className="section who" id="who" aria-labelledby="who-title">
      <div className="wrap">
        <div className="rule-head">
          <h2 id="who-title" className="h2">
            Who it's for
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
          <figure className={`rows-media${photo ? " is-photo" : " is-app"}`}>
            {photo ? (
              <img src={photo.src} alt={photo.alt} width={photo.w} height={photo.h} loading="lazy" decoding="async" />
            ) : (
              <img
                src={appLeads}
                width={1719}
                height={871}
                alt="The Cyphix app on a phone, landscape: a Limb Leads screen with six ECG traces labelled I, II, III, aVR, aVL and aVF."
                loading="lazy"
                decoding="async"
              />
            )}
            {!photo && <figcaption className="media-note">The Cyphix app · limb-lead view</figcaption>}
          </figure>
        </div>
      </div>
    </section>
  );
}

// v0.37.3 — no "Concept imagery" caption (the user: it is obvious; the footer's small print covers every image)
// v0.37.0 — the app's limb-lead phone in the user's sharper image (1719 x 871), same size on the page
// v0.9.0 — AliveCor-style "who it's for": patients, clinicians, clinics; photo slot "clinic" (interim: the app screen)
