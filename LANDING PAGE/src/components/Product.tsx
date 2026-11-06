/* "Our solution", AliveCor-style: the slate band, with a navy card rising
   over its lower edge. The band is empty since v0.37.0: its four watches
   moved to /visualizations, behind "Explore" (the user: keep the grey band,
   the watches are not relevant at this stage). */

export default function Product() {
  return (
    <section className="solution" id="solution" aria-labelledby="solution-title">
      <div className="solution-media is-empty" aria-hidden="true" />
      <div className="wrap">
        <div className="solution-card">
          <h2 id="solution-title">Our solution</h2>
          <p>
            Cyphix is a module on the strap of the watch you already wear. When symptoms occur it
            records a 6-lead ECG and sends it directly to the clinician, without adhesive patches,
            wires or professional setup. Wear it on a smartwatch, on an analog watch, on its own as
            a bracelet, or as the Cyphix watch.
          </p>
        </div>
      </div>
    </section>
  );
}

// v0.37.0 — the band kept, empty; its four watches moved to /visualizations (WearStills)
// v0.15.0 — the card's "See how it works" link goes with that section
// v0.12.0 — the user's four-watch image (cut per watch) replaces the renders; the hovered watch grows
// v0.10.0 — four stills: smartwatch, bracelet, analog, the Cyphix watch
// v0.9.0 — "Our solution": full-bleed photo slot "group" (interim: three renders) under a navy card
// v0.8.0 — re-rendered in the product studio (AO, contact shadow); dots re-projected, the strap's on the band surface
