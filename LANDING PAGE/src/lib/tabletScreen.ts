/* The hero tablet's screen, drawn live as one SVG (1330 × 888 units) so it
   stays sharp at any size, zoom or pixel density. It is the CYPHIX recording
   view with an illustrative recording, and labelled as one.

   Leads I and II are modelled, with ST elevation in II and a reciprocal
   depression in I. III, aVR, aVL and aVF are derived from them by Einthoven's
   and Goldberger's relations, so the elevation appears in II, III and aVF and
   the reciprocal change in aVL, as in a real limb-lead recording. The axis and
   the rate shown beside it are computed from this trace, not typed. Everything
   is built once at import from a seeded source, so every visitor sees the
   same screen. */

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const sig = (x: number) => 1 / (1 + Math.exp(-x));
const f = (n: number) => (Math.round(n * 10) / 10).toString();

/* Ramer–Douglas–Peucker: the flat stretches between beats collapse to a few points */
function simplify(pts: [number, number][], eps: number): [number, number][] {
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack: [number, number][] = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop()!;
    const [ax, ay] = pts[a];
    const [bx, by] = pts[b];
    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.hypot(dx, dy) || 1;
    let far = -1;
    let best = eps;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs(dy * (pts[i][0] - ax) - dx * (pts[i][1] - ay)) / len;
      if (d > best) {
        best = d;
        far = i;
      }
    }
    if (far > 0) {
      keep[far] = 1;
      stack.push([a, far], [far, b]);
    }
  }
  return pts.filter((_, i) => keep[i]);
}

const line = (pts: [number, number][]) => pts.map(([x, y], i) => `${i ? "L" : "M"}${f(x)} ${f(y)}`).join("");

/* ---------- the recording ---------- */

type Wave = [amp: number, at: number, before: number, after: number];
const WAVES: Record<"I" | "II", Wave[]> = {
  I: [
    [0.06, -0.165, 0.024, 0.024],
    [-0.03, -0.028, 0.009, 0.009],
    [0.58, 0, 0.011, 0.011],
    [-0.08, 0.026, 0.011, 0.011],
    [0.12, 0.27, 0.055, 0.04],
  ],
  II: [
    [0.11, -0.165, 0.024, 0.024],
    [-0.05, -0.028, 0.009, 0.009],
    [0.98, 0, 0.011, 0.011],
    [-0.2, 0.026, 0.011, 0.011],
    [0.3, 0.27, 0.06, 0.042],
  ],
};
// ST shift from the J point into the T wave, mV: inferior elevation, reciprocal in I
const ST = { I: -0.06, II: 0.3 };
const stShape = (dt: number) => sig((dt - 0.05) / 0.007) * (1 - sig((dt - 0.31) / 0.028));

const SECONDS = 10;
const FS = 250;
const RR = [0.8, 0.81, 0.79, 0.8, 0.82, 0.79, 0.8, 0.81, 0.8, 0.79, 0.8, 0.81, 0.8, 0.8];

const PEAKS: number[] = [];
for (let t = 0.42, i = 0; i < RR.length && t <= SECONDS + 0.5; t += RR[i++]) PEAKS.push(t);

export const LEADS = ["I", "II", "III", "aVR", "aVL", "aVF"] as const;
type Lead = (typeof LEADS)[number];
const ST_LEADS = new Set<Lead>(["II", "III", "aVF"]);

function record(): Record<Lead, number[]> {
  const rand = mulberry32(320);
  const n = SECONDS * FS + 1;
  const noise = Array.from({ length: n }, () => (rand() - 0.5) * 0.012);
  const I: number[] = [];
  const II: number[] = [];
  for (let k = 0; k < n; k++) {
    const t = k / FS;
    let a = 0.01 * Math.sin(2 * Math.PI * 0.18 * t + 0.4);
    let b = 0.014 * Math.sin(2 * Math.PI * 0.18 * t + 0.9);
    for (const p of PEAKS) {
      const dt = t - p;
      if (dt < -0.4 || dt > 0.6) continue;
      for (const lead of ["I", "II"] as const) {
        let s = ST[lead] * stShape(dt);
        for (const [amp, at, w0, w1] of WAVES[lead]) {
          const w = dt < at ? w0 : w1;
          s += amp * Math.exp(-0.5 * ((dt - at) / w) ** 2);
        }
        if (lead === "I") a += s;
        else b += s;
      }
    }
    const m = (noise[k - 1] ?? 0) * 0.25 + noise[k] * 0.5 + (noise[k + 1] ?? 0) * 0.25;
    I.push(a + m * 0.8);
    II.push(b + m);
  }
  return {
    I,
    II,
    III: II.map((v, k) => v - I[k]),
    aVR: II.map((v, k) => -(I[k] + v) / 2),
    aVL: II.map((v, k) => I[k] - v / 2),
    aVF: II.map((v, k) => v - I[k] / 2),
  };
}

const REC = record();

/* ---------- the paper: 12.5 mm/s, 10 mm/mV, in the paper's own box ---------- */

export const PAPER = { x: 39, y: 178, w: 924, h: 679 };
const X0 = 82;
const X1 = PAPER.w - 14;
const MM = (X1 - X0) / (SECONDS * 12.5);
const PX_PER_MV = 10 * MM;
const ROW = PAPER.h / 6;

function grid() {
  let minor = "";
  let major = "";
  for (let x = X0 % MM; x < PAPER.w; x += MM) {
    const seg = `M${f(x)} 0V${f(PAPER.h)}`;
    if (Math.round((x - X0) / MM) % 5 === 0) major += seg;
    else minor += seg;
  }
  for (let y = 0; y < PAPER.h; y += MM) {
    const seg = `M0 ${f(y)}H${f(PAPER.w)}`;
    if (Math.round(y / MM) % 5 === 0) major += seg;
    else minor += seg;
  }
  return { minor, major };
}

export const GRID = grid();

export const STRIPS = LEADS.map((name, row) => {
  const v = REC[name];
  const hi = Math.max(1, ...v);
  const lo = Math.min(0, ...v);
  const base = row * ROW + ROW / 2 + ((hi + lo) / 2) * PX_PER_MV + 6;
  const y = (mv: number) => base - mv * PX_PER_MV;
  const step = (X1 - X0) / (v.length - 1);
  // the 1 mV calibration pulse, 0.2 s wide, then the trace
  const p0 = 58;
  const pw = 0.2 * 12.5 * MM;
  const pulse = `M51 ${f(y(0))}H${p0}V${f(y(1))}H${f(p0 + pw)}V${f(y(0))}H${X0}`;
  const pts = simplify(
    v.map((mv, k) => [X0 + k * step, y(mv)] as [number, number]),
    0.12,
  );
  const st: string[] = [];
  if (ST_LEADS.has(name)) {
    for (const p of PEAKS) {
      const k0 = Math.round((p + 0.045) * FS);
      const k1 = Math.round((p + 0.27) * FS);
      if (k0 < 0 || k1 >= v.length) continue;
      const seg: [number, number][] = [];
      for (let k = k0; k <= k1; k++) seg.push([X0 + k * step, y(v[k])]);
      st.push(line(simplify(seg, 0.08)));
    }
  }
  return { name, d: pulse + line(pts).replace(/^M/, "L"), st, labelY: base + 5 };
});

/* ---------- what the app shows beside it, computed from the trace ---------- */

function netQrs(lead: Lead) {
  let s = 0;
  for (const p of PEAKS) {
    const k0 = Math.max(0, Math.round((p - 0.05) * FS));
    const k1 = Math.min(REC[lead].length - 1, Math.round((p + 0.05) * FS));
    for (let k = k0; k <= k1; k++) s += REC[lead][k];
  }
  return s;
}

export const AXIS = Math.round((Math.atan2(netQrs("aVF"), netQrs("I")) * 180) / Math.PI);
export const BPM = Math.round(60 / (RR.slice(0, PEAKS.length - 1).reduce((a, b) => a + b, 0) / (PEAKS.length - 1)));

/* the axis wheel, centred on (0, 0), radius 88 */
const R = 88;
const rad = (d: number) => (d * Math.PI) / 180;
const pt = (d: number, r: number): [number, number] => [r * Math.cos(rad(d)), r * Math.sin(rad(d))];
const [sx, sy] = pt(-30, R);
const [ex, ey] = pt(90, R);
const [ax, ay] = pt(AXIS, R * 0.92);
export const WHEEL = {
  r: R,
  sector: `M0 0L${f(sx)} ${f(sy)}A${R} ${R} 0 0 1 ${f(ex)} ${f(ey)}Z`,
  spokes: Array.from({ length: 12 }, (_, i) => pt(i * 30, R)).map(([x, y]) => `M0 0L${f(x)} ${f(y)}`).join(""),
  labels: (
    [
      ["I", 0],
      ["II", 60],
      ["aVF", 90],
      ["III", 120],
      ["aVR", -150],
      ["aVL", -30],
    ] as const
  ).map(([t, d]) => {
    const [x, y] = pt(d, R + 17);
    return { t, x: +f(x), y: +f(y + 5) };
  }),
  needle: [+f(ax), +f(ay)] as const,
};

// v0.19.0 — the hero tablet's screen as live vectors (it shipped as a raster in v0.18.0)
