/* One view against six (the user's Future Health Challenge submission, "Why 6 leads, not 1"):
   two circles of the frontal plane. A watch's single lead looks along one axis, lead I; the six
   limb leads look along six, at their standard angles (I 0°, II +60°, aVF +90°, III +120°,
   aVL −30°, aVR −150°), and the three that face the inferior wall (II, III, aVF) are shaded.
   Anatomy, not a reading: it describes where each lead looks, nothing about any recording. */

const R = 70;
const LEADS: { name: string; deg: number; inferior?: boolean }[] = [
  { name: "I", deg: 0 },
  { name: "II", deg: 60, inferior: true },
  { name: "aVF", deg: 90, inferior: true },
  { name: "III", deg: 120, inferior: true },
  { name: "aVL", deg: -30 },
  { name: "aVR", deg: -150 },
];

const at = (deg: number, r: number) => {
  const a = (deg * Math.PI) / 180;
  return [Math.cos(a) * r, Math.sin(a) * r] as const;
};

/* the wedge the inferior leads span, +60° to +120° */
const wedge = (() => {
  const [x1, y1] = at(60, R);
  const [x2, y2] = at(120, R);
  return `M0 0 L${x1.toFixed(2)} ${y1.toFixed(2)} A${R} ${R} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
})();

function Heart() {
  return (
    <g>
      <circle r="13" className="sv-core" />
      <path d="M0 5.2 C-6.5 0.6 -7.2 -4.6 -3.6 -5.6 C-1.8 -6.1 -0.4 -5 0 -3.6 C0.4 -5 1.8 -6.1 3.6 -5.6 C7.2 -4.6 6.5 0.6 0 5.2Z" className="sv-heart" />
    </g>
  );
}

function Lead({ name, deg }: { name: string; deg: number }) {
  const [x, y] = at(deg, R);
  const [lx, ly] = at(deg, R + 16);
  return (
    <g>
      <line x1={at(deg, 16)[0]} y1={at(deg, 16)[1]} x2={x} y2={y} className="sv-axis" />
      <circle cx={x} cy={y} r="2.6" className="sv-tip" />
      <text x={lx} y={ly} className="sv-label" textAnchor="middle" dominantBaseline="central">
        {name}
      </text>
    </g>
  );
}

export default function SixViews() {
  return (
    <figure className="six-views">
      <div className="six-views-pair">
        <div className="six-views-one">
          <svg viewBox="-110 -110 220 220" role="img" aria-labelledby="sv-watch">
            <title id="sv-watch">A watch: one view of the heart, along lead I.</title>
            <circle r={R} className="sv-ring" />
            <Lead name="I" deg={0} />
            <Heart />
          </svg>
          <p className="six-views-cap">
            <strong>A watch</strong> One view
          </p>
        </div>
        <div className="six-views-one">
          <svg viewBox="-110 -110 220 220" role="img" aria-labelledby="sv-cyphix">
            <title id="sv-cyphix">
              Cyphix: six views of the heart, along leads I, II, III, aVR, aVL and aVF; II, III and aVF face the inferior wall.
            </title>
            <circle r={R} className="sv-ring" />
            <path d={wedge} className="sv-wedge" />
            {LEADS.map((l) => (
              <Lead key={l.name} name={l.name} deg={l.deg} />
            ))}
            <Heart />
          </svg>
          <p className="six-views-cap">
            <strong>Cyphix</strong> Six views, the inferior wall among them
          </p>
        </div>
      </div>
    </figure>
  );
}

// v0.38.26 — one view against six, from the user's submission: the frontal plane's six limb-lead axes, the inferior wedge shaded
