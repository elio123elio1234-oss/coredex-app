import appLeads from "../assets/img/app-limb-leads.webp";
import { PHOTOS } from "../config/photos";
import { useScrollSteps } from "../lib/useScrollSteps";
import { LineClinic, LinePerson, LineStethoscope } from "./Icons";

/* Who it is for, one audience at a time. The section's stage holds under the bar while the visitor
   scrolls, and steps through patients, clinicians, and clinics & health systems
   (lib/useScrollSteps): the three as tabs, a hairline under the one in view filling as the visitor
   reads on, its line and three short points below, changing with a short fade and a few pixels of
   rise; the app's limb-lead screen stands beside them throughout. A tab is also a button: it
   scrolls to its audience. The words are the user's (v0.37.10), cut into points (the user: it read
   long). Cyphix records and displays; reading the ECG is the clinician's. */

const AUDIENCES = [
  {
    icon: LinePerson,
    tab: "Patients",
    head: "Peace of mind for those who need it most.",
    points: [
      "For high-risk individuals",
      "For undiagnosed, transient symptoms",
      "Clinical data, captured the moment it strikes",
    ],
  },
  {
    icon: LineStethoscope,
    tab: "Clinicians",
    head: "Diagnostic certainty.",
    points: [
      "Pristine 6-lead morphology",
      "Transmitted instantly",
      "In the standard clinical format you trust",
    ],
  },
  {
    icon: LineClinic,
    tab: "Clinics & health systems",
    head: "Proactive care that drives down costs.",
    points: [
      "Captures the elusive events standard monitoring misses",
      "Ends the expensive diagnostic odyssey",
      "Prevents unnecessary ER admissions",
    ],
  },
];

export default function WhoFor() {
  const photo = PHOTOS.clinic;
  const { pin, stage, step, go } = useScrollSteps(AUDIENCES.length);
  return (
    <section className="section who" id="who" aria-labelledby="who-title">
      <div className="wrap">
        <div className="rule-head">
          <h2 id="who-title" className="h2">
            Who it's for
          </h2>
        </div>
      </div>
      <div ref={pin} className="who-pin">
        <div ref={stage} className="who-stage">
          <div className="wrap who-grid">
            <div className="who-panel">
              <div className="who-tabs" role="group" aria-label="Who it's for">
                {AUDIENCES.map((a, i) => (
                  <button
                    key={a.tab}
                    type="button"
                    className={`who-tab${i === step ? " is-on" : ""}`}
                    aria-pressed={i === step}
                    onClick={() => go(i)}
                  >
                    <span className="who-tab-label">For {a.tab.toLowerCase()}</span>
                    <span className="who-tab-line" aria-hidden="true">
                      <span data-step-fill={i} />
                    </span>
                  </button>
                ))}
              </div>
              <div className="who-slides">
                {AUDIENCES.map(({ icon: Icon, tab, head, points }, i) => (
                  <div
                    key={tab}
                    className={`who-slide${i === step ? " is-on" : i < step ? " is-past" : ""}`}
                    aria-hidden={i !== step}
                  >
                    <Icon className="who-icon" />
                    <h3 className="who-head">{head}</h3>
                    <ul className="who-points">
                      {points.map((p) => (
                        <li key={p}>{p}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
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

// v0.38.0 — one audience at a time, stepped by scroll (tabs with a filling hairline, a line and three points, a short fade); the user: "it reads long… points that change as you scroll, smooth and clean, gentle like Apple"
// v0.37.10 — the three rows in the user's words: patients, clinicians, clinics & health systems
// v0.37.3 — no "Concept imagery" caption (the user: it is obvious; the footer's small print covers every image)
// v0.37.0 — the app's limb-lead phone in the user's sharper image (1719 x 871), same size on the page
// v0.9.0 — AliveCor-style "who it's for": patients, clinicians, clinics; photo slot "clinic" (interim: the app screen)
