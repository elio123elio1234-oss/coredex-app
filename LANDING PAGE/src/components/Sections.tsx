import Reveal from "./Reveal";

/* Placeholder scaffolding below the hero — real copy is injected later.
   Kept short, calm, and on-brand so the page reads as complete. */

function IconWave() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M2 13h4l2-7 3 14 2.5-9 1.5 4H22" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconWrist() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="6" y="8" width="12" height="8" rx="2.5" stroke="currentColor" strokeWidth="1.7" />
      <path d="M9 8V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V8M9 16v2.5A1.5 1.5 0 0 0 10.5 20h3a1.5 1.5 0 0 0 1.5-1.5V16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}
function IconAi() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8 12.5l2.6 2.5L16 9" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const STATS = [
  { num: <><em>6</em></>, cap: "Leads reconstructed" },
  { num: <>&lt;<em>30</em>s</>, cap: "From wrist to report" },
  { num: <><em>1</em></>, cap: "Simple measurement" },
];

const FEATURES = [
  { icon: <IconWrist />, title: "One-touch capture", body: "A single measurement from the wrist — no gel, no leads, no clinic." },
  { icon: <IconWave />, title: "Clinical-grade signal", body: "Advanced processing reconstructs a full multi-lead waveform from one site." },
  { icon: <IconAi />, title: "AI-ECG analysis", body: "An automated read surfaces rhythm and abnormalities in plain language." },
];

export default function Sections() {
  return (
    <>
      {/* stat strip */}
      <section className="stats" id="how">
        <div className="container">
          <div className="stats-grid">
            {STATS.map((s, i) => (
              <Reveal className="stat" key={i} delay={i * 0.08}>
                <div className="num">{s.num}</div>
                <div className="cap">{s.cap}</div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* features */}
      <section className="section features" id="technology">
        <div className="container">
          <div className="section-head">
            <Reveal className="section-eyebrow" as="div">
              How it works
            </Reveal>
            <Reveal as="div" delay={0.05}>
              <h2>A lab-grade ECG, distilled to a wristband</h2>
            </Reveal>
            <Reveal className="section-sub" as="div" delay={0.1}>
              Three ideas do the heavy lifting. The detail comes next — this is the
              shape of the story.
            </Reveal>
          </div>

          <div className="feature-grid">
            {FEATURES.map((f, i) => (
              <Reveal className="card" key={i} delay={i * 0.08}>
                <div className="card-icon">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* closing CTA */}
      <section className="section cta" id="vision">
        <div className="container">
          <div className="section-head">
            <Reveal as="div">
              <h2>Cardiology, without the cardiology visit</h2>
            </Reveal>
            <Reveal className="section-sub" as="div" delay={0.06}>
              We are building the bridge from everyday wearables to clinical
              insight. Come see where it goes.
            </Reveal>
          </div>
          <Reveal className="cta-actions" as="div" delay={0.12}>
            <a className="btn btn-primary" href="#contact">Request access</a>
            <a className="btn btn-ghost" href="#top">Back to top</a>
          </Reveal>
        </div>
      </section>
    </>
  );
}

// v0.1.0 — placeholder scaffolding: stats, features, closing CTA
