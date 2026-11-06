import wearSmart from "../assets/photos/wear-smart.webp";
import wearBracelet from "../assets/photos/wear-bracelet.webp";
import wearAnalog from "../assets/photos/wear-analog.webp";
import wearCyphix from "../assets/photos/wear-cyphix.webp";

/* The four ways to wear it across a slate band: the user's own image, cut into one image per
   watch at a shared scale. Under a pointer, the watch it rests on grows and the others step back.
   It stood in the home page's "Our solution" band until v0.37.0; it now lives on /visualizations,
   behind "Explore" (the user: not relevant at this stage). */

const WEAR = [
  { src: wearSmart, w: 507, alt: "The Cyphix strap on a smartwatch: the module with its electrodes on the band, the watch showing CYPHIX 6-lead ECG." },
  { src: wearBracelet, w: 466, alt: "The Cyphix strap on its own, closed into a bracelet." },
  { src: wearAnalog, w: 528, alt: "The same Cyphix strap on an analog watch." },
  { src: wearCyphix, w: 513, alt: "The Cyphix watch: our own screen, with the module built into its band." },
];

export default function WearStills({ className = "" }: { className?: string }) {
  return (
    <figure className={`solution-media is-render ${className}`.trim()}>
      <div className="solution-stills">
        {WEAR.map((s) => (
          <img key={s.alt} src={s.src} alt={s.alt} width={s.w} height={621} loading="lazy" decoding="async" />
        ))}
      </div>
      <figcaption className="media-note">Concept imagery</figcaption>
    </figure>
  );
}

// v0.37.0 — the four watches out of "Our solution" (Product.tsx v0.12.0), onto their own page
