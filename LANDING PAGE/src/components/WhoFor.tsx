import appLeads from "../assets/img/app-limb-leads.webp";
import { PHOTOS } from "../config/photos";
import { useScrollSteps } from "../lib/useScrollSteps";
import { LineClinic, LinePerson, LineStethoscope } from "./Icons";

/* Who it is for, in AliveCor's "Our customers" form: three rows, a line icon, the audience in
   bold beside it and the user's text; the app's limb-lead screen beside them. Where the three fit
   the screen, the stage holds while the visitor scrolls and the row in view is in full ink, the
   other two faded, so the scroll moves through them (lib/useScrollSteps); on a phone they read
   plainly. Cyphix records and displays; reading the ECG is the clinician's. */

const ROWS = [
  {
    icon: LinePerson,
    lead: "For patients:",
    text: "Peace of mind for those who need it most. Designed specifically for high-risk individuals and those suffering from undiagnosed transient symptoms, empowering them to capture clinical data exactly when it strikes.",
  },
  {
    icon: LineStethoscope,
    lead: "For clinicians:",
    text: "Diagnostic certainty. Receive pristine 6-lead morphology, transmitted instantly and presented in the standard clinical format you trust.",
  },
  {
    icon: LineClinic,
    lead: "For clinics & health systems:",
    text: "Proactive care that drives down costs. By capturing the elusive events that standard monitoring misses, Cyphix ends the expensive diagnostic odyssey and prevents unnecessary ER admissions.",
  },
];

export default function WhoFor() {
  const photo = PHOTOS.clinic;
  const { pin, stage, step, held } = useScrollSteps(ROWS.length);
  return (
    <section className="section who" id="who" aria-labelledby="who-title">
      <div className="wrap">
        <div className="rule-head">
          <h2 id="who-title" className="h2">
            Who it's for
          </h2>
        </div>
      </div>
      <div ref={pin} className={`who-pin${held ? " is-held" : ""}`}>
        <div ref={stage} className="who-stage">
          <div className="wrap rows-grid">
            <ul className="rows">
              {ROWS.map(({ icon: Icon, lead, text }, i) => (
                <li key={lead} className={i === step ? "is-on" : undefined}>
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
      </div>
    </section>
  );
}

// v0.38.4 — back to the rows (the user: the tabs were tiny, the change too fast, "confusing and messy"; "go back to the previous design, just the scroll between them"): all three in view, the one in view in full ink
// v0.38.2 — the full texts back, as paragraphs, not points (the user); the stepped tabs stay
// v0.38.0 — one audience at a time, stepped by scroll (tabs with a filling hairline, a line and three points, a short fade); the user: "it reads long… points that change as you scroll, smooth and clean, gentle like Apple"
// v0.37.10 — the three rows in the user's words: patients, clinicians, clinics & health systems
// v0.37.3 — no "Concept imagery" caption (the user: it is obvious; the footer's small print covers every image)
// v0.37.0 — the app's limb-lead phone in the user's sharper image (1719 x 871), same size on the page
// v0.9.0 — AliveCor-style "who it's for": patients, clinicians, clinics; photo slot "clinic" (interim: the app screen)
