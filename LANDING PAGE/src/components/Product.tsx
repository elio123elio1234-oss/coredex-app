import moduleRender from "../assets/img/render-module.webp";
import appLeads from "../assets/img/app-limb-leads.webp";

/* The product: the strap from behind, rendered from the team's 3D model,
   with leader-line callouts on the module's electrodes, the watch and the
   band; then the real app's limb-lead screen beside how the recording
   reaches the clinician.

   The render (674 × 764 css px) sits in the middle of a frame with 280
   units of room on each side for labels. Each dot is a point projected from
   the model into the render (electrode LL2, the watch's back sensor, the
   lower band's surface), so the callouts stay on the product at every width.
   Below 1024 px the labels become a legend under the image. */

type Part = {
  id: string;
  dot: [number, number];
  side: "left" | "right";
  title: string;
  text: string;
};

const IMG = { w: 674, h: 764 };
const FRAME = { w: IMG.w + 560, h: IMG.h, x: 280 };

const PARTS: Part[] = [
  {
    id: "module",
    dot: [491, 480],
    side: "right",
    title: "Cyphix module",
    text: "Its electrodes sit on the outside of the band.",
  },
  { id: "watch", dot: [280, 333], side: "left", title: "Your watch", text: "Connects to any watch." },
  { id: "strap", dot: [271, 591], side: "left", title: "Strap", text: "The band of the watch you already wear." },
];

const pct = (v: number, of: number) => `${(v / of) * 100}%`;

export default function Product() {
  return (
    <section className="section product" id="product" aria-labelledby="product-title">
      <div className="wrap">
        <header className="product-head">
          <h2 id="product-title" className="h2">
            A module on the strap of the watch you already wear.
          </h2>
          <p className="body-lg">
            Cyphix adds 6-lead ECG acquisition to the watch strap. It captures clinically
            relevant cardiac signals when symptoms occur and transmits them directly to the
            clinician.
          </p>
        </header>

        <figure className="mf-wrap">
          <div className="mf">
            <img
              className="mf-img"
              src={moduleRender}
              width={1348}
              height={1528}
              alt="The Cyphix strap from behind: the module's three large electrodes on the band, beside the back of the watch."
              loading="lazy"
              decoding="async"
            />
            <svg className="mf-lines" viewBox={`0 0 ${FRAME.w} ${FRAME.h}`} aria-hidden="true">
              {PARTS.map((p) => {
                const x = p.dot[0] + FRAME.x;
                const end = p.side === "right" ? FRAME.x + IMG.w + 28 : FRAME.x - 28;
                return <path key={p.id} className="co-line" d={`M${x} ${p.dot[1]} H${end}`} />;
              })}
              {PARTS.map((p) => (
                <circle key={p.id} className="co-dot" cx={p.dot[0] + FRAME.x} cy={p.dot[1]} r={6} />
              ))}
            </svg>
            {PARTS.map((p) => (
              <div
                key={p.id}
                className={`mf-label is-${p.side}`}
                style={
                  p.side === "right"
                    ? { left: pct(FRAME.x + IMG.w + 40, FRAME.w), top: pct(p.dot[1], FRAME.h) }
                    : { right: pct(FRAME.w - FRAME.x + 40, FRAME.w), top: pct(p.dot[1], FRAME.h) }
                }
              >
                <h3>{p.title}</h3>
                <p>{p.text}</p>
              </div>
            ))}
          </div>
          <ul className="mf-legend">
            {PARTS.map((p) => (
              <li key={p.id}>
                <h3>{p.title}</h3>
                <p>{p.text}</p>
              </li>
            ))}
          </ul>
          <figcaption className="fig-caption">Concept rendering from the Cyphix 3D model</figcaption>
        </figure>

        <div className="app-row">
          <figure className="app-figure">
            <img
              src={appLeads}
              width={876}
              height={463}
              alt="The Cyphix app on a phone, landscape: a Limb Leads screen with six ECG traces labelled I, II, III, aVR, aVL and aVF."
              loading="lazy"
              decoding="async"
            />
            <figcaption className="fig-caption">The Cyphix app · limb-lead view</figcaption>
          </figure>
          <div className="app-copy">
            <h3 className="h3">Sent straight to the clinician.</h3>
            <p className="body">
              The recording goes directly to the clinician, who reads leads I, II, III, aVR, aVL
              and aVF side by side in the Cyphix app.
            </p>
            <p className="body">No adhesive patches, wires or professional setup.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

// v0.8.0 — re-rendered in the product studio (AO, contact shadow); dots re-projected, the strap's on the band surface
// v0.8.0 — the strap from behind, rendered from the team's 3D model, with callouts on module, watch and band (the exploded concept render is retired)
// v0.7.0 — the exploded render on the ground; short leader-line callouts set in its own empty space (module, strap, watch)
