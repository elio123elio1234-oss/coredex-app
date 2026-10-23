/* Illustrative data for "More than an ECG": a 6-lead strip, a day of heart
   rate and a night of skin temperature, built once from fixed anchors and a
   seeded noise source, so every visitor sees the same figures. Nothing here
   is a recording, and nothing is derived from one.

   The six leads come from two (I and II) by Einthoven's and Goldberger's
   relations, as a real limb-lead recording does. */

/* deterministic noise, so the figures never change between loads */
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

function smooth(v: number[], passes = 1) {
  let out = v;
  for (let p = 0; p < passes; p++) {
    out = out.map((x, i) => ((out[i - 1] ?? x) + 2 * x + (out[i + 1] ?? x)) / 4);
  }
  return out;
}

/* monotone cubic (Fritsch–Carlson) through the anchors: no overshoot between them */
function monotone(points: [number, number][]) {
  const n = points.length;
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const d = xs.slice(0, -1).map((x, i) => (ys[i + 1] - ys[i]) / (xs[i + 1] - x));
  const m = xs.map((_, i) => (i === 0 ? d[0] : i === n - 1 ? d[n - 2] : d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2));
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i] / d[i];
    const b = m[i + 1] / d[i];
    const s = a * a + b * b;
    if (s > 9) {
      const t = 3 / Math.sqrt(s);
      m[i] = t * a * d[i];
      m[i + 1] = t * b * d[i];
    }
  }
  return (x: number) => {
    let i = 0;
    while (i < n - 2 && x > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i];
    const t = Math.min(1, Math.max(0, (x - xs[i]) / h));
    const t2 = t * t;
    const t3 = t2 * t;
    return (
      (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1]
    );
  };
}

const f = (n: number) => n.toFixed(2).replace(/\.?0+$/, "");

/* ---------- the 6-lead strip ---------- */

export const ECG = {
  seconds: 4,
  mmPerS: 25,
  mmPerMv: 10,
  /** the calibration pulse and its margin, mm */
  lead: 8,
  /** row pitch, mm: room for a lead's full swing and its 1 mV pulse */
  pitch: 20,
  top: 2,
};
export const ECG_W = ECG.lead + ECG.seconds * ECG.mmPerS;
export const ECG_H = ECG.top * 2 + ECG.pitch * 6;

type Wave = [amp: number, at: number, before: number, after: number];
// P, Q, R, S, T for leads I and II (mV, seconds from the R peak, widths before and after)
const BEAT: Record<"I" | "II", Wave[]> = {
  I: [
    [0.07, -0.165, 0.024, 0.024],
    [-0.045, -0.028, 0.009, 0.009],
    [0.62, 0, 0.011, 0.011],
    [-0.11, 0.027, 0.011, 0.011],
    [0.17, 0.27, 0.055, 0.04],
  ],
  II: [
    [0.12, -0.165, 0.024, 0.024],
    [-0.06, -0.028, 0.009, 0.009],
    [1.02, 0, 0.011, 0.011],
    [-0.21, 0.027, 0.011, 0.011],
    [0.27, 0.27, 0.055, 0.04],
  ],
};
const R_PEAKS = [0.42, 1.28, 2.17, 3.02, 3.9, 4.77];

export const LEADS = ["I", "II", "III", "aVR", "aVL", "aVF"] as const;
export type Lead = (typeof LEADS)[number];

function limbLeads(fs = 200) {
  const rand = mulberry32(320);
  const n = ECG.seconds * fs + 1;
  const I: number[] = [];
  const II: number[] = [];
  const noise = smooth(
    Array.from({ length: n }, () => (rand() - 0.5) * 0.014),
    2,
  );
  for (let k = 0; k < n; k++) {
    const t = k / fs;
    let a = 0.012 * Math.sin(2 * Math.PI * 0.21 * t + 0.6);
    let b = 0.016 * Math.sin(2 * Math.PI * 0.21 * t + 1.1);
    for (const r of R_PEAKS) {
      const dt = t - r;
      if (dt < -0.4 || dt > 0.6) continue;
      for (const [lead, waves] of [
        ["I", BEAT.I],
        ["II", BEAT.II],
      ] as const) {
        let s = 0;
        for (const [amp, at, w0, w1] of waves) {
          const w = dt < at ? w0 : w1;
          s += amp * Math.exp(-0.5 * ((dt - at) / w) ** 2);
        }
        if (lead === "I") a += s;
        else b += s;
      }
    }
    I.push(a + noise[k] * 0.8);
    II.push(b + noise[k]);
  }
  const out: Record<Lead, number[]> = {
    I,
    II,
    III: II.map((v, k) => v - I[k]),
    aVR: II.map((v, k) => -(I[k] + v) / 2),
    aVL: II.map((v, k) => I[k] - v / 2),
    aVF: II.map((v, k) => v - I[k] / 2),
  };
  return out;
}

/** One path per lead in millimetres (the calibration pulse first), each centred in its row. */
export function ecgStrip() {
  const leads = limbLeads();
  return LEADS.map((name, row) => {
    const v = leads[name];
    const mid = ECG.top + ECG.pitch * row + ECG.pitch / 2;
    // the row holds the trace and its calibration pulse (0 to 1 mV)
    const hi = Math.max(1, ...v);
    const lo = Math.min(0, ...v);
    const base = mid + ((hi + lo) / 2) * ECG.mmPerMv;
    const step = 1 / (v.length - 1);
    let d = `M1 ${f(base)}H2V${f(base - ECG.mmPerMv)}H7V${f(base)}H${ECG.lead}`;
    v.forEach((mv, k) => {
      d += `L${f(ECG.lead + k * step * ECG.seconds * ECG.mmPerS)} ${f(base - mv * ECG.mmPerMv)}`;
    });
    return { name, d, labelTop: ((mid - ECG.pitch / 2 + 1.2) / ECG_H) * 100 };
  });
}

/* ---------- trends ---------- */

export type Trend = {
  line: string;
  area: string;
  w: number;
  h: number;
  /** a value's height in the plot, percent from the top */
  y: (v: number) => number;
};

function trend(values: number[], lo: number, hi: number, w = 520, h = 200): Trend {
  const y = (v: number) => (1 - (v - lo) / (hi - lo)) * h;
  const step = w / (values.length - 1);
  const line = values.map((v, i) => `${i ? "L" : "M"}${f(i * step)} ${f(y(v))}`).join("");
  return { line, area: `${line}L${w} ${h}L0 ${h}Z`, w, h, y: (v) => (y(v) / h) * 100 };
}

/** Heart rate through a day, every five minutes (bpm, 00:00 to 24:00). */
export function heartRateDay() {
  const at = monotone([
    [0, 63], [1, 59], [2, 57], [3, 55], [4, 56], [5, 56], [6, 58], [6.6, 64], [7, 73], [7.5, 84],
    [8, 79], [8.5, 74], [9.5, 77], [10.5, 71], [11.5, 75], [12.5, 83], [13.5, 76], [14.5, 72],
    [15.5, 74], [16.5, 78], [17.4, 84], [17.8, 112], [18.1, 131], [18.5, 138], [18.8, 126],
    [19.1, 98], [19.5, 86], [20.5, 79], [21.5, 74], [22.5, 68], [23.3, 63], [24, 61],
  ]);
  const rand = mulberry32(72);
  const raw = Array.from({ length: 289 }, (_, i) => {
    const h = i / 12;
    const day = h > 6.5 && h < 22.5;
    return at(h) + (rand() - 0.5) * (day ? 5 : 2.4);
  });
  return trend(smooth(raw), 40, 150);
}

/** Skin temperature through a night, every ten minutes (°C, 22:00 to 08:00). */
export function skinTempNight() {
  const at = monotone([
    [0, 33.7], [0.5, 33.9], [1, 34.3], [1.5, 34.7], [2, 34.95], [3, 35.15], [4, 35.2], [5, 35.1],
    [5.5, 35.25], [6.5, 35.3], [7.5, 35.15], [8.5, 35], [9, 34.6], [9.5, 34], [10, 33.6],
  ]);
  const rand = mulberry32(35);
  const raw = Array.from({ length: 61 }, (_, i) => at(i / 6) + (rand() - 0.5) * 0.09);
  return trend(smooth(raw), 32.5, 36);
}

// v0.12.0 — illustrative vitals for the sensors section: six limb leads from two, a day of heart rate, a night of skin temperature
