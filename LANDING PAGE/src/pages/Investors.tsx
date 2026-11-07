import type { CSSProperties } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import ContactForm from "../components/ContactForm";
import PageHead from "../components/PageHead";
import NextLinks from "../components/NextLinks";
import { LineClinic, LinePerson, LinePulse, LineSend, LineStethoscope } from "../components/Icons";
import portraitElio from "../assets/img/portrait-elio.webp";
import portraitTamir from "../assets/img/portrait-tamir.webp";
import needDoor from "../assets/deck/need-door.webp";
import bench from "../assets/deck/proto-bench.webp";

/* Investors, behind "Explore": the need, the gap today's options leave, the
   market, the business model, what has been done and what comes next, in the
   investor deck's own words. The market figures are the ones the home page
   states (the deck's 2026 forecast differs; the page keeps one set). No
   amount is named for the round, and no partner is named before an
   agreement. Since v0.38.26 it also carries what the user's Future Health
   Challenge submission adds: whom it is for, most urgent first, and the
   outcome; how success will be measured; the timeline in months, the
   stakeholders, integration and regulatory path; risks and safeguards; and
   the team's capabilities (no employer named, no study site named). */

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

/* whom it is for, most urgent first (the submission's pyramid) */
const USERS = [
  {
    title: "Undiagnosed transient symptoms",
    text: "Palpitations, dizziness or fainting that short Holter tests keep missing.",
  },
  {
    title: "Active rhythm management",
    text: "After an ablation or a new antiarrhythmic drug, with waveform follow-up such as the QT interval.",
  },
  {
    title: "Post-discharge monitoring",
    text: "After a heart attack or heart surgery, as hospitals work to cut readmissions.",
  },
  {
    title: "Prevention and longevity",
    text: "At-risk adults and athletes who want more than a smartwatch.",
  },
];

const OUTCOMES = [
  {
    icon: LinePerson,
    who: "Patients",
    title: "An end to the diagnostic odyssey",
    text: "A fleeting symptom recorded the moment it happens, without Holter wires and patches.",
  },
  {
    icon: LineStethoscope,
    who: "Clinicians",
    title: "Clinical confidence",
    text: "A clear, data-based treatment decision right after the event, not months of trial and error.",
  },
  {
    icon: LineClinic,
    who: "Health systems",
    title: "Lower costs",
    text: "Fewer unnecessary emergency visits and readmissions.",
  },
];

/* how success will be measured (the submission's two measures) */
const MEASURES = [
  {
    n: "01",
    title: "Clinical-grade signal",
    setup: "Cyphix against a standard clinical ECG machine: the same patient, at the same time.",
    points: [
      "Lead-by-lead agreement of the waveform's shape",
      "The share of recordings a cardiologist, blinded, rates as diagnostic",
    ],
    when: "On the bench, then in the feasibility study",
  },
  {
    n: "02",
    title: "Earlier detection",
    setup: "In the clinical feasibility study, with 20 to 50 patients.",
    points: [
      "Cardiac events recorded at symptom onset that a later clinic ECG would miss",
      "The time from a symptom to a clinician's review, against standard care",
    ],
    when: "In the feasibility study",
  },
];

/* the path's four supports (the submission's cards; no study site named) */
const PATH = [
  {
    title: "Stakeholders",
    text: "Patients, cardiologists, health funds and hospitals, the Israel Innovation Authority and the regulators.",
  },
  {
    title: "Integration",
    text: "A web view and PDF reports from the first day; HL7 FHIR integration later.",
  },
  {
    title: "Regulatory",
    text: "An expected FDA Class II device, most likely through a 510(k); claims about the waveform only after clinical data.",
  },
  {
    title: "Sustainability",
    text: "Recurring monthly revenue for every active patient, paid by health systems, fitting remote-monitoring reimbursement where it exists.",
  },
];

/* risks and safeguards (the submission's table) */
const RISKS = [
  { risk: "Privacy", safe: "Encrypted and pseudonymised, and visible only to the care team." },
  { risk: "Security", safe: "Role-based access and audit logs; a security review before any pilot." },
  { risk: "Bias", safe: "A diverse study group; signal quality and performance reported for each subgroup." },
  { risk: "Explainability", safe: "The clinician sees the raw traces, the contact quality of every electrode, and the baseline behind any flag." },
  { risk: "Misuse", safe: "It never tells a patient they are fine; acute symptoms go to emergency services." },
  { risk: "Human oversight", safe: "A clinician reads every recording; any automated flag only supports their decision." },
  { risk: "Failure modes", safe: "Poor contact prompts a new recording; offline recordings sync later; it is not continuous monitoring." },
];

/* the team's capabilities (the submission's summary, without an employer's name) */
const TEAM = [
  {
    src: portraitElio,
    /* a half-length portrait: drawn closer, on the face */
    face: { scale: 2.6, origin: "51% 35%" },
    name: "Elio El Hassrouny",
    role: "Founder & CEO",
    points: [
      "B.Sc. in Electrical & Electronics Engineering, Tel Aviv University",
      "Over four years in hardware development and chip design",
      "Built the working prototype end to end: electrodes, signal processing, app and cloud",
    ],
  },
  {
    src: portraitTamir,
    face: { scale: 1, origin: "50% 30%" },
    name: "Dr. Tamir Wolf, MD",
    role: "Clinical Advisor",
    points: [
      "Physician, a graduate of the Technion; resident in paediatrics",
      "Supported the proof of concept on the medical side",
      "Translates clinical needs into product requirements",
    ],
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
    text: "Requirements developed with cardiologists, and a first study with patients agreed, to begin once the wearable is ready.",
  },
  {
    title: "Funding",
    text: "Funded by the Israel Innovation Authority (Tnufa): the patent filing, market research with a consulting firm and the first business materials.",
  },
];

const NEXT = [
  {
    when: "Now · month 0",
    title: "Preparing the next stage.",
    text: "Wider IP protection and freedom to operate, the clinical requirements, and a development partner.",
  },
  {
    when: "Months 9–13",
    title: "A wearable product, ready for a trial.",
    text: "Quality proven with dry electrodes; the system miniaturised; ten wearable prototypes built.",
  },
  {
    when: "Month 13 on",
    title: "A clinical feasibility trial.",
    text: "20 to 50 patients: the system in real use, and the data to train its model; clinical, engineering and usability fixes; the design frozen for the regulatory stage.",
  },
  {
    when: "By month ~51",
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

        <section className="section" aria-labelledby="users-title">
          <div className="wrap">
            <div className="rule-head">
              <h2 id="users-title" className="h2">
                Who it's for, most urgent first
              </h2>
            </div>
            <div className="inv-users">
              <ol className="inv-pyramid">
                {USERS.map((u, i) => (
                  <li key={u.title} style={{ "--k": i } as CSSProperties}>
                    <span className="inv-tier" aria-hidden="true">
                      <span>{i + 1}</span>
                    </span>
                    <div>
                      <h3 className="inv-pyramid-title">{u.title}</h3>
                      <p className="inv-pyramid-text">{u.text}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <div className="inv-outcomes">
                <p className="inv-kicker">Intended outcome</p>
                <ul>
                  {OUTCOMES.map(({ icon: Icon, who, title, text }) => (
                    <li key={who}>
                      <Icon className="inv-outcome-icon" />
                      <div>
                        <p className="inv-outcome-who">{who}</p>
                        <h3 className="inv-outcome-title">{title}</h3>
                        <p className="inv-outcome-text">{text}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <p className="inv-aim">
              <strong>Cyphix aims to cut the time to diagnosis for elusive arrhythmias from months to
              days,</strong>{" "}
              with fewer unnecessary emergency visits and a 6-lead recording of clinical depth at the
              exact moment of a symptom.
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
              for the patient, recurring revenue, and a fit with remote-monitoring reimbursement where it
              exists.
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

        <section className="section" aria-labelledby="measure-title">
          <div className="wrap">
            <div className="rule-head">
              <h2 id="measure-title" className="h2">
                How success will be measured
              </h2>
            </div>
            <ol className="inv-measures">
              {MEASURES.map((m) => (
                <li key={m.n}>
                  <p className="inv-measure-n" aria-hidden="true">
                    {m.n}
                  </p>
                  <h3 className="inv-measure-title">{m.title}</h3>
                  <p className="inv-measure-setup">{m.setup}</p>
                  <ul>
                    {m.points.map((pt) => (
                      <li key={pt}>{pt}</li>
                    ))}
                  </ul>
                  <p className="inv-measure-when">
                    <span>When</span> {m.when}
                  </p>
                </li>
              ))}
            </ol>
            <p className="gap-close">
              <strong>Also tracked:</strong> first recordings made without help. The targets are set
              with the clinical team before the study.
            </p>
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
            <ul className="inv-path">
              {PATH.map((x) => (
                <li key={x.title}>
                  <h3 className="inv-path-title">{x.title}</h3>
                  <p className="inv-path-text">{x.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="section" aria-labelledby="risk-title">
          <div className="wrap">
            <div className="rule-head">
              <h2 id="risk-title" className="h2">
                Risks and safeguards
              </h2>
            </div>
            <table className="inv-risks">
              <thead>
                <tr>
                  <th scope="col">Risk</th>
                  <th scope="col">Safeguard</th>
                </tr>
              </thead>
              <tbody>
                {RISKS.map((r) => (
                  <tr key={r.risk}>
                    <th scope="row">{r.risk}</th>
                    <td>{r.safe}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="section" aria-labelledby="inv-team-title">
          <div className="wrap">
            <div className="rule-head">
              <h2 id="inv-team-title" className="h2">
                The team
              </h2>
            </div>
            <ul className="inv-team">
              {TEAM.map((t) => (
                <li key={t.name}>
                  <div className="inv-team-head">
                    <span className="inv-team-face">
                      <img
                        src={t.src}
                        alt={`${t.name}, portrait`}
                        width={160}
                        height={200}
                        loading="lazy"
                        decoding="async"
                        style={{ transform: `scale(${t.face.scale})`, transformOrigin: t.face.origin }}
                      />
                    </span>
                    <div>
                      <h3 className="inv-team-name">{t.name}</h3>
                      <p className="inv-team-role">{t.role}</p>
                    </div>
                  </div>
                  <ul className="inv-team-points">
                    {t.points.map((pt) => (
                      <li key={pt}>{pt}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <NextLinks
          links={[
            { href: "/technology", title: "Technology", text: "How a strap records a 6-lead ECG" },
            { href: "/one-strap", title: "One strap. Any watch.", text: "The four ways to wear it, in 3D" },
          ]}
        />
        <ContactForm />
      </main>
      <Footer />
    </>
  );
}

// v0.38.26 — from the user's Future Health Challenge submission: whom it is for (most urgent first) and the outcome, how success is measured, the timeline in months with its stakeholders, integration, regulatory path and sustainability, risks and safeguards, the team's capabilities (no study site or employer named)
// v0.37.3 — the team link without Samsung; no "Concept imagery" caption (the user)
// v0.35.0 — Investors: the need, today's compromise, the market, the business model, what has been done and what comes next, from the investor deck (no round amount, no partner named)
