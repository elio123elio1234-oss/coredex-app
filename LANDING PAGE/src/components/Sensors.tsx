import wristView from "../assets/img/sensors-wrist.webp";
import outerView from "../assets/img/sensors-outer.webp";

/* More than an ECG: the module's two faces, rendered from the team's 3D
   model on the dark studio set, with numbered pins on the parts and the
   same numbers in the list. Everything named here is in the model: steel
   electrodes on both faces and on the strap, the PPG window with its green
   LEDs, the temperature sensor. Pins sit at each part's projected centre. */

type Pin = [n: number, x: number, y: number];

const VIEWS: { src: string; label: string; alt: string; pins: Pin[] }[] = [
  {
    src: wristView,
    label: "Against the wrist",
    alt: "The Cyphix module's wrist side: two steel ECG electrodes, a round temperature sensor, and the PPG window with its green LEDs.",
    pins: [
      [1, 52.6, 36.6],
      [2, 64.8, 64.3],
      [3, 40.1, 68.0],
    ],
  },
  {
    src: outerView,
    label: "Outer face",
    alt: "The Cyphix module's outer face: three steel ECG electrodes.",
    pins: [[1, 38.6, 50.6]],
  },
];

const ITEMS = [
  {
    n: 1,
    title: "6-lead ECG",
    text: "Steel electrodes on both faces of the module, and one on the strap, record the limb leads I, II, III, aVR, aVL and aVF.",
  },
  {
    n: 2,
    title: "Continuous heart rate",
    text: "A PPG optical sensor against the wrist follows the pulse between ECG recordings.",
  },
  {
    n: 3,
    title: "Skin temperature",
    text: "A contact sensor beside it measures the temperature of the skin.",
  },
];

export default function Sensors() {
  return (
    <section className="sensors" id="sensors" aria-labelledby="sensors-title" data-bar-dark>
      <div className="wrap">
        <div className="sensors-head">
          <h2 id="sensors-title" className="sensors-title">
            More than an ECG.
          </h2>
          <p className="sensors-lede">
            Every sensor sits in one titanium module on the strap: the ECG electrodes, an optical
            heart-rate sensor and a skin-temperature sensor.
          </p>
        </div>
        <div className="sensors-grid">
          <div className="sensors-views">
            {VIEWS.map((v) => (
              <figure key={v.label} className="sensors-view">
                <div className="sensors-img">
                  <img src={v.src} alt={v.alt} width={1081} height={1637} loading="lazy" decoding="async" />
                  {v.pins.map(([n, x, y]) => (
                    <span key={n} className="pin" style={{ left: `${x}%`, top: `${y}%` }} aria-hidden="true">
                      {n}
                    </span>
                  ))}
                </div>
                <figcaption>{v.label}</figcaption>
              </figure>
            ))}
          </div>
          <ol className="sensors-list">
            {ITEMS.map((i) => (
              <li key={i.n}>
                <span className="pin is-key" aria-hidden="true">
                  {i.n}
                </span>
                <div>
                  <h3>{i.title}</h3>
                  <p>{i.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <p className="sensors-note">Concept rendering from the Cyphix 3D model. In development.</p>
      </div>
    </section>
  );
}

// v0.10.0 — "More than an ECG": the module's wrist side and outer face from the 3D model, pinned; ECG, PPG heart rate, skin temperature
