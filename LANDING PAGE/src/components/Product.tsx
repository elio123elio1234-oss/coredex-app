import wearSmart from "../assets/photos/wear-smart.webp";
import wearBracelet from "../assets/photos/wear-bracelet.webp";
import wearAnalog from "../assets/photos/wear-analog.webp";
import wearCyphix from "../assets/photos/wear-cyphix.webp";
import { ArrowDown } from "./Icons";

/* "Our solution", AliveCor-style: the four ways to wear it across the slate
   band (the user's own image, cut into one image per watch at a shared scale),
   with a navy card rising over its lower edge. Under a pointer, the watch it
   rests on grows and the others step back. */

const WEAR = [
  { src: wearSmart, w: 507, alt: "The Cyphix strap on a smartwatch: the module with its electrodes on the band, the watch showing CYPHIX 6-lead ECG." },
  { src: wearBracelet, w: 466, alt: "The Cyphix strap on its own, closed into a bracelet." },
  { src: wearAnalog, w: 528, alt: "The same Cyphix strap on an analog watch." },
  { src: wearCyphix, w: 513, alt: "The Cyphix watch: our own screen, with the module built into its band." },
];

export default function Product() {
  return (
    <section className="solution" id="solution" aria-labelledby="solution-title">
      <figure className="solution-media is-render">
        <div className="solution-stills">
          {WEAR.map((s) => (
            <img key={s.alt} src={s.src} alt={s.alt} width={s.w} height={621} loading="lazy" decoding="async" />
          ))}
        </div>
      </figure>
      <div className="wrap">
        <div className="solution-card">
          <h2 id="solution-title">Our solution</h2>
          <p>
            Cyphix is a module on the strap of the watch you already wear. When symptoms occur it
            records a 6-lead ECG and sends it directly to the clinician, without adhesive patches,
            wires or professional setup. Wear it on a smartwatch, on an analog watch, on its own as
            a bracelet, or as the Cyphix watch.
          </p>
          <a className="card-link" href="#how">
            See how it works <ArrowDown width={16} height={16} />
          </a>
        </div>
      </div>
    </section>
  );
}

// v0.12.0 — the user's four-watch image (cut per watch) replaces the renders; the hovered watch grows
// v0.10.0 — four stills: smartwatch, bracelet, analog, the Cyphix watch
// v0.9.0 — "Our solution": full-bleed photo slot "group" (interim: three renders) under a navy card
// v0.8.0 — re-rendered in the product studio (AO, contact shadow); dots re-projected, the strap's on the band surface
