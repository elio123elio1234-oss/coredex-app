import type { CSSProperties } from "react";
import appLeads from "../assets/img/app-limb-leads.webp";
import { PHOTOS } from "../config/photos";
import { useScrollSteps } from "../lib/useScrollSteps";
import { LineClinic, LinePerson, LineStethoscope } from "./Icons";

/* Who it is for, in AliveCor's "Our customers" form: three rows, a line icon, the audience in
   bold beside it and the user's text; the app's limb-lead screen beside them. Clinics first, then
   clinicians, then patients (the user). Where the two columns stand side by side and the window has
   the room, the stage holds while the visitor scrolls, close to a screen per row, and the rows turn
   on a wheel: the one in view in the middle at full size, its neighbours tilted back, smaller and
   faded, the rest out of the frame (lib/useScrollSteps). On a phone they read plainly. Cyphix
   records and displays; reading the ECG is the clinician's. */

const ROWS = [
  {
    icon: LineClinic,
    lead: "For clinics & health systems:",
    text: "Proactive care that drives down costs. By capturing the elusive events that standard monitoring misses, Cyphix ends the expensive diagnostic odyssey and prevents unnecessary ER admissions.",
  },
  {
    icon: LineStethoscope,
    lead: "For clinicians:",
    text: "Diagnostic certainty. Receive pristine 6-lead morphology, transmitted instantly and presented in the standard clinical format you trust.",
  },
  {
    icon: LinePerson,
    lead: "For patients:",
    text: "Peace of mind for those who need it most. Designed specifically for high-risk individuals and those suffering from undiagnosed transient symptoms, empowering them to capture clinical data exactly when it strikes.",
  },
];

/* the wheel holds side by side where the window has 420 px under the bar. Stacked (a phone, a narrow
   window, with 540 px) the rows flow: they scroll with the page itself between the heading, held at
   the top, and the phone image, held at the bottom, tilting and fading by their distance from the
   middle (lib/useScrollSteps). Nothing moves them but the page, so they cannot jump (the user) */
const HOLD = {
  wide: "(min-width: 1024px), (min-aspect-ratio: 5/4)",
  // the held stage itself needs about 380 px (measured); 500 dropped the wheel on a laptop at 100 %
  // (Windows display scaling: about 490 px under the bar). The user: "that must not happen"
  minRoom: 420,
  minRoomStacked: 540,
};

export default function WhoFor() {
  const photo = PHOTOS.clinic;
  const { pin, stage, step, held, flow } = useScrollSteps(ROWS.length, HOLD);
  return (
    <section className="section who" id="who" aria-labelledby="who-title">
      <div
        ref={pin}
        className={`who-pin${held ? " is-held" : ""}${flow ? " is-flow" : ""}`}
      >
        <div ref={stage} className="who-stage">
          {/* the heading holds with its rows, so the gap between them is the page's own */}
          <div className="wrap who-inner">
            <div className="rule-head">
              <h2 id="who-title" className="h2">
                Who it's for
              </h2>
            </div>
            <div className="rows-grid">
              <ul className="rows">
                {ROWS.map(({ icon: Icon, lead, text }, i) => (
                  <li
                    key={lead}
                    className={
                      i === step
                        ? "is-on"
                        : Math.abs(i - step) === 1
                          ? "is-near"
                          : "is-far"
                    }
                    data-wheel-i={i}
                    style={
                      held
                        ? ({
                            "--d": i - step,
                            "--ad": Math.abs(i - step),
                          } as CSSProperties)
                        : undefined
                    }
                    aria-hidden={held && i !== step ? true : undefined}
                  >
                    <Icon className="row-icon" />
                    <p>
                      <strong>{lead}</strong> {text}
                    </p>
                  </li>
                ))}
              </ul>
              <figure
                className={`rows-media${photo ? " is-photo" : " is-app"}`}
              >
                {photo ? (
                  <img
                    src={photo.src}
                    alt={photo.alt}
                    width={photo.w}
                    height={photo.h}
                    loading="lazy"
                    decoding="async"
                  />
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
                {!photo && (
                  <figcaption className="media-note">
                    The Cyphix app · limb-lead view
                  </figcaption>
                )}
              </figure>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// v0.38.25 — side by side the wheel holds from 420 px under the bar (500 turned it off on the user's laptop at 100 %)
// v0.38.20 — stacked, the rows flow with the page between a held heading and a held image (no more jumps on the iPhone)
// v0.38.17 — following the scroll, every row stays readable (no aria-hidden by step)
// v0.38.14 — stacked, the wheel holds again (the user: "that is not what I asked"; it had also left narrow desktop windows), moving one pixel for one pixel with the scroll
// v0.38.12 — a phone never holds (the user: the held wheel "sank" the page): the page scrolls at its own pace, the rows turn in CSS
// v0.38.9 — on a phone the wheel follows the finger (the user); the phone image centred
// v0.38.8 — holds from 540 px stacked (an iPhone with Safari's bars shown has about 600 under the bar)
// v0.38.7 — the wheel on a phone too (the user), stacked over the phone image, where the screen has 640 px under the bar
// v0.38.6 — a wheel: the row in view centred, its neighbours tilted back and faded, the rest out of frame; slower (0.9 screen a row); clinics, clinicians, patients (the user)
// v0.38.5 — the heading inside the held stage with its rows (the user: the gap between the heading and the screen)
// v0.38.4 — back to the rows (the user: the tabs were tiny, the change too fast, "confusing and messy"; "go back to the previous design, just the scroll between them"): all three in view, the one in view in full ink
// v0.38.2 — the full texts back, as paragraphs, not points (the user); the stepped tabs stay
// v0.38.0 — one audience at a time, stepped by scroll (tabs with a filling hairline, a line and three points, a short fade); the user: "it reads long… points that change as you scroll, smooth and clean, gentle like Apple"
// v0.37.10 — the three rows in the user's words: patients, clinicians, clinics & health systems
// v0.37.3 — no "Concept imagery" caption (the user: it is obvious; the footer's small print covers every image)
// v0.37.0 — the app's limb-lead phone in the user's sharper image (1719 x 871), same size on the page
// v0.9.0 — AliveCor-style "who it's for": patients, clinicians, clinics; photo slot "clinic" (interim: the app screen)
