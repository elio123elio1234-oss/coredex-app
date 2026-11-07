import Header from "../components/Header";
import Footer from "../components/Footer";
import ContactForm from "../components/ContactForm";
import PageHead from "../components/PageHead";
import NextLinks from "../components/NextLinks";
import { ArrowRight, LineGlobe, LinePulse, LineShield, LineWatch } from "../components/Icons";
import SixViews from "../components/SixViews";
import wear from "../assets/deck/proto-wear.webp";
import electrodes from "../assets/deck/proto-electrodes.webp";
import appLeads from "../assets/img/app-limb-leads.webp";
import traceRaw from "../assets/deck/trace-raw.webp";
import traceWeighted from "../assets/deck/trace-weighted.webp";

/* Technology, behind "Explore": how a strap records a 6-lead ECG, and the
   innovation under it, in the investor deck's own words: each contact point
   an array of elements, weighted by the quality of its contact (patent filed
   in Israel). The pictures are the deck's: the working prototype, its band,
   and two strips labelled illustrative. Nothing here reads an ECG. Since
   v0.38.26 it also carries what the user's Future Health Challenge
   submission adds: one view against six, the three noise sources, what
   follows the recording (the clinician's portal, and the AI baseline, in
   development, as decision support only), the hardware, and the demo. */

/* the three noise sources a wearable ECG meets (the submission's hardware slide) */
const NOISE = [
  { title: "Motion", text: "The arm moves and the contact shifts under the electrode." },
  { title: "Loose contact", text: "An electrode lifts a little off the skin." },
  { title: "Muscle", text: "The wrist's own muscles add their electrical signal." },
];

/* after the recording (the submission's steps 03 and 04) */
const AFTER = [
  {
    tag: "From the first day",
    title: "The clinician's portal.",
    text: "Clean 6-lead recordings reach the clinician in a web view and as PDF reports; integration with clinical systems through HL7 FHIR follows.",
  },
  {
    tag: "In development",
    title: "A baseline for every patient.",
    text: "An AI model learns each patient's own baseline from every recording and points the clinician to changes from it. It supports the clinician's decision and never replaces it: a clinician reads every recording, and Cyphix never tells a patient they are fine.",
  },
];

/* the hardware (the submission's four cards) */
const HARDWARE = [
  { icon: LinePulse, title: "Working prototype", text: "Three dry electrodes, an acquisition board and a phone app." },
  { icon: LineWatch, title: "Final form", text: "A 6-lead module on a strap that fits any watch." },
  { icon: LineGlobe, title: "Sourcing", text: "Off-the-shelf parts, and a medical-device partner for miniaturisation." },
  { icon: LineShield, title: "Safety and standards", text: "Low voltage, designed toward IEC 60601-1 for electrical safety, ISO 10993 for skin contact and ISO 13485 for quality management." },
];

/* see it working (the submission's links) */
const DEMOS = [
  { href: "https://cyphixweb.vercel.app/demo", title: "The clinician's web app", text: "A live demo, no login needed", host: "cyphixweb.vercel.app/demo" },
  { href: "https://youtu.be/d6_nFknGYuM", title: "The prototype at work", text: "A demo video of the working prototype", host: "youtu.be" },
];

const STEPS = [
  {
    n: "01",
    title: "Wear it, and measure.",
    text: "A short measurement with the strap: no adhesive patches, no wires and no professional setup, with feedback on the quality of contact as it records.",
    img: wear,
    w: 1100,
    h: 744,
    fit: "bottom",
    alt: "A man wearing the Cyphix prototype band on his left wrist, a finger of the right hand on its outer electrode, beside the Cyphix app's Limb Leads screen on a phone.",
    note: "Working prototype",
  },
  {
    n: "02",
    title: "A smart array, weighted.",
    text: "Each contact point is an array of elements, each read by its own ADC. The processing measures every element and weights its signal, in real time, by the quality of its actual contact.",
    img: electrodes,
    w: 700,
    h: 933,
    fit: "cover",
    alt: "The prototype band: three snap electrodes on a navy woven band, with their leads.",
    note: "Prototype band: the left-leg contact as two elements, LL 1 and LL 2, beside the reference, RLD",
  },
  {
    n: "03",
    title: "Six leads, to the cardiologist.",
    text: "The processed signals become the six limb leads, I, II, III, aVR, aVL and aVF, and go straight to the care team.",
    img: appLeads,
    w: 1719,
    h: 871,
    fit: "device",
    alt: "The Cyphix app on a phone, landscape: a Limb Leads screen with six ECG traces labelled I, II, III, aVR, aVL and aVF.",
    note: "The Cyphix app · limb-lead view",
  },
];

export default function Technology() {
  return (
    <>
      <Header page="technology" />
      <main id="top">
        <PageHead
          id="tech-title"
          chip="Technology"
          title="Six views of the heart."
          accent="From a strap."
          lede="A smartwatch sees the heart from one angle. The Cyphix strap sees it from six, as a test in the clinic does, in ten seconds."
        />

        <section className="section" aria-labelledby="how-title">
          <div className="wrap">
            <div className="rule-head">
              <h2 id="how-title" className="h2">
                How it works
              </h2>
            </div>
            <ol className="steps">
              {STEPS.map((s) => (
                <li key={s.n} className="step">
                  <figure className={`step-media is-${s.fit}`}>
                    <img src={s.img} alt={s.alt} width={s.w} height={s.h} loading="lazy" decoding="async" />
                  </figure>
                  <p className="step-n" aria-hidden="true">
                    {s.n}
                  </p>
                  <h3 className="step-title">{s.title}</h3>
                  <p className="step-text">{s.text}</p>
                  <p className="media-note">{s.note}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="section" aria-labelledby="views-title">
          <div className="wrap tech-views">
            <div className="tech-views-copy">
              <h2 id="views-title" className="h2">
                Six views, not one.
              </h2>
              <p className="body-lg">
                A smartwatch records a single lead: one view of the heart's electrical activity.
                Cyphix records the six limb leads, I, II, III, aVR, aVL and aVF, each looking at the
                heart from its own angle, among them the three that face its inferior wall, II, III and
                aVF.
              </p>
            </div>
            <SixViews />
          </div>
        </section>

        <section className="section" aria-labelledby="noise-title">
          <div className="wrap tech-noise">
            <div className="tech-noise-copy">
              <h2 id="noise-title" className="h2">
                Noise, solved in hardware.
              </h2>
              <p className="body-lg">
                Where the electrode meets the skin is where a wearable ECG picks up its noise. A
                single electrode carries every change in that contact straight into the trace.
              </p>
              <p className="body-lg">
                Cyphix splits each contact point into an array of elements, each with its own ADC,
                and weights them in real time by the quality of their actual contact. An element
                losing its contact counts for less, and the lead keeps its detail.
              </p>
              <ul className="tech-noise-list" aria-label="The three noise sources the array handles">
                {NOISE.map((n) => (
                  <li key={n.title}>
                    <strong>{n.title}.</strong> {n.text}
                  </li>
                ))}
              </ul>
              <p className="tech-patent">
                <LineShield className="tech-patent-icon" />
                <span>
                  <strong>Multi-element array.</strong> Patent filed in Israel.
                </span>
              </p>
            </div>
            <figure className="tech-traces">
              <div className="tech-trace">
                <p className="tech-trace-label">One electrode, raw</p>
                <img src={traceRaw} width={1182} height={405} alt="An ECG strip from a single electrode, with heavy noise between the beats." loading="lazy" decoding="async" />
              </div>
              <div className="tech-trace">
                <p className="tech-trace-label">The same lead, weighted across the array</p>
                <img src={traceWeighted} width={1025} height={350} alt="The same lead after weighting: a clean strip with a clear shape to each beat." loading="lazy" decoding="async" />
              </div>
              <figcaption className="media-note">Illustrative.</figcaption>
            </figure>
          </div>
        </section>

        <section className="section" aria-labelledby="after-title">
          <div className="wrap">
            <div className="rule-head">
              <h2 id="after-title" className="h2">
                After the recording
              </h2>
            </div>
            <ul className="tech-after">
              {AFTER.map((a) => (
                <li key={a.title}>
                  <p className="tech-tag">{a.tag}</p>
                  <h3 className="tech-after-title">{a.title}</h3>
                  <p className="tech-after-text">{a.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="section" aria-labelledby="hw-title">
          <div className="wrap">
            <div className="rule-head">
              <h2 id="hw-title" className="h2">
                The hardware
              </h2>
            </div>
            <ul className="tech-hw">
              {HARDWARE.map(({ icon: Icon, title, text }) => (
                <li key={title}>
                  <Icon className="row-icon" />
                  <h3 className="tech-hw-title">{title}</h3>
                  <p className="tech-hw-text">{text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="section" aria-labelledby="demo-title">
          <div className="wrap">
            <div className="rule-head">
              <h2 id="demo-title" className="h2">
                See it working
              </h2>
            </div>
            <ul className="tech-demos">
              {DEMOS.map((d) => (
                <li key={d.href}>
                  <a href={d.href} target="_blank" rel="noopener noreferrer">
                    <span className="tech-demo-title">{d.title}</span>
                    <span className="tech-demo-text">{d.text}</span>
                    <span className="tech-demo-host">
                      {d.host}
                      <ArrowRight />
                    </span>
                  </a>
                </li>
              ))}
            </ul>
            <p className="gap-close">A live demonstration of the hardware, the app and the clinician's view is available on request.</p>
          </div>
        </section>

        <NextLinks
          links={[
            { href: "/one-strap", title: "One strap. Any watch.", text: "The four ways to wear it, in 3D" },
            { href: "/investors", title: "Investors", text: "The need, the market and the plan" },
          ]}
        />
        <ContactForm />
      </main>
      <Footer />
    </>
  );
}

// v0.38.26 — from the user's Future Health Challenge submission: six views against one, the three noise sources, after the recording (the portal; the AI baseline in development, decision support only), the hardware, the demo and the video
// v0.37.0 — the app's limb-lead phone in the user's sharper image (1719 x 871)
// v0.35.0 — Technology: how it works in three steps (the working prototype, its band, the app), and the innovation, the multi-element array weighted by contact quality (patent filed in Israel), from the investor deck
