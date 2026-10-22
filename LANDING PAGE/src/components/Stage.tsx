/* Where we are: the one-pager's four achieved steps on one line, ending
   at the open next step. Filled dots are done; the hollow one is next.
   Static: the line is drawn, not drawing. */

const DONE = [
  "Working prototype",
  "Technological and algorithmic proof of feasibility",
  "Patent pending on the core technology",
  "Israel Innovation Authority · Tnufa programme",
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
            From a working prototype to a wearable strap, ready for its first trial.
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
              <strong>Next step.</strong> A wearable strap, ready for its first trial.
            </p>
          </li>
        </ol>
      </div>
    </section>
  );
}

// v0.7.0 — static milestone line; the dots carry done/next (no "Done" labels), "Next step." in ink
// v0.6.0 — the one-pager's "Where we are" on a drawn line ending at the pulsing next step, then the exploded render
