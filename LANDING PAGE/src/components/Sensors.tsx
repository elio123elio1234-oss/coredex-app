import { useEffect, useRef } from "react";
import { ECG_H, ECG_W, ecgStrip, heartRateDay, skinTempNight, type Trend } from "../lib/vitals";

/* More than an ECG: what the module measures, shown as the data it gives,
   not as the part that gives it. A 6-lead strip on paper scale, a day of
   heart rate from the PPG sensor and a night of skin temperature. The data is
   illustrative and fixed (lib/vitals.ts); nothing is interpreted. The plots
   draw in once, left to right, as the section arrives. */

const STRIP = ecgStrip();
const HR = heartRateDay();
const TEMP = skinTempNight();

type Tick = [label: string, at: number];

function TrendPlot({
  data,
  tone,
  unit,
  yTicks,
  xTicks,
  label,
}: {
  data: Trend;
  tone: "coral" | "sky";
  unit: string;
  yTicks: number[];
  xTicks: Tick[];
  label: string;
}) {
  const id = `fill-${tone}`;
  return (
    <div className={`trend is-${tone}`}>
      <div className="trend-plot">
        <svg viewBox={`0 0 ${data.w} ${data.h}`} preserveAspectRatio="none" role="img" aria-label={label}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" className="trend-fill-top" />
              <stop offset="1" className="trend-fill-end" />
            </linearGradient>
          </defs>
          {yTicks.map((v) => (
            <line key={v} className="trend-grid" x1="0" x2={data.w} y1={(data.y(v) / 100) * data.h} y2={(data.y(v) / 100) * data.h} />
          ))}
          <path className="trend-area" d={data.area} fill={`url(#${id})`} />
          <path className="trend-line" d={data.line} />
        </svg>
        {yTicks.map((v) => (
          <span key={v} className="trend-y" style={{ top: `${data.y(v)}%` }}>
            {v}
          </span>
        ))}
        <span className="trend-unit">{unit}</span>
      </div>
      <div className="trend-x" aria-hidden="true">
        {xTicks.map(([t, at]) => (
          <span key={t} style={{ left: `${at}%` }}>
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function Sensors() {
  const ref = useRef<HTMLDivElement>(null);

  // one arrival: armed only if the section is still below the fold and motion is welcome
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight) return;
    el.classList.add("is-armed");
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        el.classList.add("is-in");
        io.disconnect();
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section className="sensors" id="sensors" aria-labelledby="sensors-title" data-bar-dark>
      <div className="wrap">
        <div className="sensors-head">
          <h2 id="sensors-title" className="sensors-title">
            More than an ECG.
          </h2>
          <p className="sensors-lede">
            One titanium module on the strap holds every sensor: the ECG electrodes, an optical
            heart-rate sensor and a skin-temperature sensor.
          </p>
        </div>

        <div className="vitals" ref={ref}>
          <figure className="vital vital-ecg">
            <header className="vital-head">
              <h3>6-lead ECG</h3>
              <p>
                Electrodes on both faces of the module and one on the strap record the six limb
                leads together.
              </p>
            </header>
            <div className="ecg-plot" style={{ aspectRatio: `${ECG_W} / ${ECG_H}` }}>
              <svg
                viewBox={`0 0 ${ECG_W} ${ECG_H}`}
                preserveAspectRatio="none"
                role="img"
                aria-label="An illustrative 6-lead ECG strip: leads I, II, III, aVR, aVL and aVF, four seconds each."
              >
                <defs>
                  <pattern id="ecg-mm" width="1" height="1" patternUnits="userSpaceOnUse">
                    <path d="M1 0V1H0" className="ecg-grid-minor" />
                  </pattern>
                  <pattern id="ecg-5mm" width="5" height="5" patternUnits="userSpaceOnUse">
                    <path d="M5 0V5H0" className="ecg-grid-major" />
                  </pattern>
                </defs>
                <rect className="ecg-minor" width={ECG_W} height={ECG_H} fill="url(#ecg-mm)" />
                <rect width={ECG_W} height={ECG_H} fill="url(#ecg-5mm)" />
                {STRIP.map((l) => (
                  <path key={l.name} className="ecg-trace" d={l.d} />
                ))}
              </svg>
              {STRIP.map((l) => (
                <span key={l.name} className="ecg-lead" style={{ top: `${l.labelTop}%` }}>
                  {l.name}
                </span>
              ))}
            </div>
            <figcaption className="vital-scale">25 mm/s · 10 mm/mV</figcaption>
          </figure>

          <figure className="vital">
            <header className="vital-head">
              <h3>Continuous heart rate</h3>
              <p>A PPG optical sensor against the wrist follows the pulse between ECG recordings.</p>
            </header>
            <TrendPlot
              data={HR}
              tone="coral"
              unit="bpm"
              yTicks={[60, 90, 120]}
              xTicks={[
                ["00:00", 0],
                ["06:00", 25],
                ["12:00", 50],
                ["18:00", 75],
                ["24:00", 100],
              ]}
              label="Illustrative heart rate over one day, from about 55 beats per minute at night to a peak near 140 in the early evening."
            />
          </figure>

          <figure className="vital">
            <header className="vital-head">
              <h3>Skin temperature</h3>
              <p>A contact sensor beside it measures the temperature of the skin through the night.</p>
            </header>
            <TrendPlot
              data={TEMP}
              tone="sky"
              unit="°C"
              yTicks={[33, 34, 35]}
              xTicks={[
                ["22:00", 0],
                ["01:00", 30],
                ["04:00", 60],
                ["08:00", 100],
              ]}
              label="Illustrative skin temperature over one night, rising from about 33.7 °C to 35.3 °C and falling again by morning."
            />
          </figure>
        </div>

        <p className="sensors-note">Illustrative data, drawn for this page: not a recording. Cyphix is in development.</p>
      </div>
    </section>
  );
}

// v0.12.0 — the user: show the metrics, not the module. A 6-lead strip, a day of heart rate, a night of skin temperature, drawn in once
// v0.10.0 — "More than an ECG": the module's wrist side and outer face from the 3D model, pinned; ECG, PPG heart rate, skin temperature
