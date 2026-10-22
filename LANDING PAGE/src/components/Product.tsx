import exploded from "../assets/img/exploded.webp";
import appLeads from "../assets/img/app-limb-leads.webp";

/* The product: the exploded concept render annotated with the hero's
   leader-line callouts (what each part does), then the real app's
   limb-lead screen beside how the recording reaches the clinician.

   The callouts live in the render's own empty space (1506 × 832 image
   px), each with a short hero-length leader: the module's from its round
   coral electrode down into the clear area under the plate, the strap's
   from the upper strap half down into the band between the two halves,
   the watch's from its lower bezel left into the space under the strap.
   Below 1024 px the labels become a legend under the image. */

type Part = {
  id: string;
  dot: [number, number];
  /** where the leader ends: the label hangs below it ("below") or sits to its left ("left") */
  end: [number, number];
  place: "below" | "left";
  title: string;
  text: string;
  /** dropped on phones, where the image is cropped to the module and strap */
  wide?: boolean;
};

const IMG = { w: 1506, h: 832 };

const PARTS: Part[] = [
  {
    id: "module",
    dot: [78, 335],
    end: [78, 492],
    place: "below",
    title: "Cyphix module",
    text: "Coral electrodes capture six limb leads when symptoms occur.",
  },
  {
    id: "strap",
    dot: [620, 215],
    end: [620, 288],
    place: "below",
    title: "Strap",
    text: "The band of the watch you already wear.",
  },
  {
    id: "watch",
    dot: [1225, 780],
    end: [1100, 780],
    place: "left",
    title: "Your watch",
    text: "Connects to any watch.",
    wide: true,
  },
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

        <figure className="xf-wrap">
          <div className="xf">
            <div className="xf-img">
              <img
                src={exploded}
                width={1506}
                height={832}
                alt="Exploded concept rendering: the Cyphix module with its coral electrodes and housing, the strap, and the watch."
                loading="lazy"
                decoding="async"
              />
            </div>
            <svg className="xf-lines" viewBox={`0 0 ${IMG.w} ${IMG.h}`} aria-hidden="true">
              {PARTS.map((p) => (
                <path key={p.id} className="co-line" d={`M${p.dot[0]} ${p.dot[1]} L${p.end[0]} ${p.end[1]}`} />
              ))}
              {PARTS.map((p) => (
                <circle key={p.id} className="co-dot" cx={p.dot[0]} cy={p.dot[1]} r={7.5} />
              ))}
            </svg>
            {PARTS.map((p) => (
              <div
                key={p.id}
                className={`xf-label is-${p.place}`}
                style={
                  p.place === "below"
                    ? { left: pct(p.end[0], IMG.w), top: pct(p.end[1] + 10, IMG.h) }
                    : { right: pct(IMG.w - p.end[0] + 10, IMG.w), top: pct(p.end[1], IMG.h) }
                }
              >
                <h3>{p.title}</h3>
                <p>{p.text}</p>
              </div>
            ))}
          </div>
          <ul className="xf-legend">
            {PARTS.map((p) => (
              <li key={p.id} className={p.wide ? "is-wide" : undefined}>
                <h3>{p.title}</h3>
                <p>{p.text}</p>
              </li>
            ))}
          </ul>
          <figcaption className="fig-caption">Concept rendering · module, strap and watch</figcaption>
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

// v0.7.0 — the exploded render on the ground; short leader-line callouts set in its own empty space (module, strap, watch); the app's limb-lead view beside "sent straight to the clinician"
