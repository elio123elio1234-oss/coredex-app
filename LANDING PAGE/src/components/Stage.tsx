/* Where we are: the one-pager's four achieved steps on one line, ending
   at the open next step. Filled dots are done; the hollow one is next.
   Static: the line is drawn, not drawing. */

const DONE = [
  "Working Hardware Prototype",
  "AI & Algorithmic Validation",
  "Patent-Pending Core Tech",
  "Backed by the Israel Innovation Authority",
];

export default function Stage() {
  return (
    <section className="section stage" id="stage" aria-labelledby="stage-title">
      <div className="wrap">
        <header className="section-head">
          <h2 id="stage-title" className="h2">
            Where we are.
          </h2>
          <p className="body-lg">
            From a validated prototype to a clinical-grade wearable, backed by leading institutions.
          </p>
        </header>

        <ol className="milestones">
          {DONE.map((t) => (
            <li key={t} className="ms is-done">
              <span className="ms-dot" aria-hidden="true" />
              <p>
                <span className="sr-only">Done: </span>
                {t}
              </p>
            </li>
          ))}
          <li className="ms is-next">
            <span className="ms-dot" aria-hidden="true" />
            <p>
              <strong>Next step:</strong> Wearable form factor &amp; clinical study
            </p>
          </li>
        </ol>
      </div>
    </section>
  );
}

// v0.38.1 — the milestones in an investor's terms (the advice the user passed on): hardware prototype, AI & algorithmic validation, patent-pending core tech, backed by the Israel Innovation Authority (no "Tnufa"); next, the wearable form factor and a clinical study (the hospital unnamed until the user confirms)
// v0.7.0 — static milestone line; the dots carry done/next (no "Done" labels), "Next step." in ink
// v0.6.0 — the one-pager's "Where we are" on a drawn line ending at the pulsing next step, then the exploded render
