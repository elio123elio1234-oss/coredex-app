import Header from "../components/Header";
import Footer from "../components/Footer";
import ContactForm from "../components/ContactForm";
import PageHead from "../components/PageHead";
import NextLinks from "../components/NextLinks";
import { LineClinic, LinePulse, LineSend } from "../components/Icons";
import needDoor from "../assets/deck/need-door.webp";
import bench from "../assets/deck/proto-bench.webp";

/* Investors, behind "Explore": the need, the gap today's options leave, the
   market, the business model, what has been done and what comes next, in the
   investor deck's own words. The market figures are the ones the home page
   states (the deck's 2026 forecast differs; the page keeps one set). No
   amount is named for the round, and no partner is named before an
   agreement. */

const GAP = [
  {
    title: "Clinical depth",
    kind: "Holter monitors, 12-lead devices",
    text: "Clinical quality, but adhesive electrodes, wires and a professional setup, at the cost of availability and comfort.",
  },
  {
    title: "Monitoring over time",
    kind: "Patches",
    text: "Built to follow the rhythm over days, without the reliable ST-segment morphology a broader clinical assessment needs.",
  },
  {
    title: "Comfort and independence",
    kind: "Smartwatches",
    text: "A single lead, mainly for atrial fibrillation. Six-lead devices exist, but they are carried and used separately.",
  },
];

const MODEL = [
  { icon: LineClinic, q: "Who pays", a: "Health systems: health funds and public clinics." },
  { icon: LinePulse, q: "For what", a: "A follow-up programme in which the device stays with the patient over time." },
  { icon: LineSend, q: "How", a: "A fixed monthly fee for every active patient in the programme." },
];

const DONE = [
  {
    title: "Product and technology",
    text: "A proof of concept that reads several ECG leads, with an app connected to the hardware fully and continuously.",
  },
  {
    title: "Intellectual property",
    text: "A patent filed on the core technology, and a strategic IP layer being built around the innovation's components.",
  },
  {
    title: "Clinical",
    text: "Consultations with several cardiologists, and talks toward a first trial with patients once the advanced prototype is complete.",
  },
  {
    title: "Funding",
    text: "Funded by the Israel Innovation Authority (Tnufa): the patent filing, market research with a consulting firm and the first business materials.",
  },
];

const NEXT = [
  {
    when: "Now",
    title: "Preparing the next stage.",
    text: "Wider IP protection and freedom to operate, the clinical requirements, and a development partner.",
  },
  {
    when: "1",
    title: "A wearable product, ready for a trial.",
    text: "Quality proven with dry electrodes; the system miniaturised; lab prototypes built.",
  },
  {
    when: "2",
    title: "A clinical feasibility trial.",
    text: "20 to 50 patients: the system in real use; clinical, engineering and usability fixes; the design frozen for the regulatory stage.",
  },
  {
    when: "3",
    title: "Regulatory validation and approval.",
    text: "A beta series; safety and usability testing; a multi-centre trial and an FDA submission.",
  },
];

export default function Investors() {
  return (
    <>
      <Header page="investors" />
      <main id="top">
        <PageHead
          id="investors-title"
          chip="Investors"
          title="The ECG that stays"
          accent="with the patient."
          lede="Cyphix is raising its seed round. The need, the market and the plan are below; the deck has the rest."
          action
        />

        <section className="facts" aria-label="The need and the market in figures">
          <div className="wrap facts-grid">
            <div className="fact">
              <span className="fact-figure">17.9M</span>
              <p>Deaths a year from cardiovascular disease</p>
            </div>
            <div className="fact">
              <span className="fact-figure">$4.53B</span>
              <p>Global mobile ECG market</p>
            </div>
            <div className="fact">
              <span className="fact-figure">$2.76B</span>
              <p>Home healthcare segment</p>
            </div>
          </div>
          <p className="wrap facts-source">Deaths: World Health Organization.</p>
        </section>

        <section className="split" aria-labelledby="need-title">
          <figure className="split-media is-soft">
            <img src={needDoor} width={585} height={559} alt="An open door between a clinic room and a living room, an ECG line passing through it." loading="lazy" decoding="async" />
            <figcaption className="media-note">Concept imagery</figcaption>
          </figure>
          <div className="split-copy">
            <h2 id="need-title" className="statement">
              The need for an ECG doesn't stop at the clinic door.
            </h2>
            <p className="body-lg">
              An ECG is the basic tool for diagnosing and following conditions such as ischaemia,
              infarction and arrhythmia. The need for one comes after discharge, between
              appointments and at the moment a symptom appears. A recording with clinical depth
              still depends on equipment and a clinical setting.
            </p>
          </div>
        </section>

        <section className="section" aria-labelledby="gap-title">
          <div className="wrap">
            <div className="rule-head">
              <h2 id="gap-title" className="h2">
                Today's options ask for a compromise
              </h2>
            </div>
            <ul className="gap">
              {GAP.map((g) => (
                <li key={g.title}>
                  <h3 className="gap-title">{g.title}</h3>
                  <p className="gap-kind">{g.kind}</p>
                  <p className="gap-text">{g.text}</p>
                </li>
              ))}
            </ul>
            <p className="gap-close">
              <strong>The trade-off remains:</strong> the more clinical the quality, the more it asks
              of the patient. Cyphix brings clinical depth that stays with the patient.
            </p>
          </div>
        </section>

        <section className="section" aria-labelledby="model-title">
          <div className="wrap">
            <div className="rule-head">
              <h2 id="model-title" className="h2">
                Business model
              </h2>
            </div>
            <ol className="model">
              {MODEL.map(({ icon: Icon, q, a }) => (
                <li key={q}>
                  <Icon className="row-icon" />
                  <h3 className="model-q">{q}</h3>
                  <p className="model-a">{a}</p>
                </li>
              ))}
            </ol>
            <p className="gap-close">
              <strong>Clinical value and business value in one model:</strong> continuous follow-up
              for the patient, recurring revenue.
            </p>
          </div>
        </section>

        <section className="section" aria-labelledby="done-title">
          <div className="wrap">
            <div className="rule-head">
              <h2 id="done-title" className="h2">
                What has been done
              </h2>
            </div>
            <div className="done-grid">
              <ul className="done">
                {DONE.map((d) => (
                  <li key={d.title}>
                    <h3 className="done-title">{d.title}</h3>
                    <p className="done-text">{d.text}</p>
                  </li>
                ))}
              </ul>
              <figure className="done-media">
                <img src={bench} width={1100} height={819} alt="The working prototype: a white enclosure with its cables and snap electrodes on a blue woven band." loading="lazy" decoding="async" />
                <figcaption className="media-note">Working prototype</figcaption>
              </figure>
            </div>
          </div>
        </section>

        <section className="section stage" aria-labelledby="next-title">
          <div className="wrap">
            <header className="section-head">
              <h2 id="next-title" className="h2">
                What comes next.
              </h2>
              <p className="body-lg">
                Each stage is built to lower the technological, clinical and regulatory risk on the
                way to market approval.
              </p>
            </header>
            <ol className="milestones is-road">
              {NEXT.map((n, i) => (
                <li key={n.when} className={`ms ${i === 0 ? "is-next" : "is-later"}`}>
                  <span className="ms-dot" aria-hidden="true" />
                  <p className="ms-when">{n.when}</p>
                  <p>
                    <strong>{n.title}</strong> {n.text}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <NextLinks
          links={[
            { href: "/technology", title: "Technology", text: "How a strap records a 6-lead ECG" },
            { href: "/#team", title: "The team", text: "Engineering from Samsung R&D, a physician as clinical advisor" },
          ]}
        />
        <ContactForm />
      </main>
      <Footer />
    </>
  );
}

// v0.35.0 — Investors: the need, today's compromise, the market, the business model, what has been done and what comes next, from the investor deck (no round amount, no partner named)
