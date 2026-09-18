/* ==================================================================
   verify-fusion — does leadFusion keep its promises?

   Run (any tsx will do; the server ships one):
     node ../CYPHIX_SERVER/node_modules/tsx/dist/cli.mjs scripts/verify-fusion.ts [recording.csv …]

   Two kinds of evidence, because each proves what the other cannot:

     SIMULATED — a synthetic heart with known truth, observed by two copies
       that share an RA electrode (common noise) and differ in their LL
       electrodes (independent noise), plus per-copy DC offset and drift. Only
       here can "closer to the truth" be measured, so only here are the
       clinical guarantees asserted: R amplitude, ST level, an ectopic beat
       passing through, a bumped electrode being weighted out.

     REAL — HW_PLAYGROUND CSVs (t_ms,ch1_uV,ch2_uV,…). No truth exists, so the
       script reports rather than asserts: non-repeatable noise before/after,
       and how far R amplitude and ST level moved relative to copy A.
       Recordings of a real person stay OUT of the repo — pass paths in.

   Exits non-zero if any assertion fails.
   ================================================================== */

import { readFileSync } from 'node:fs';
import { fuseLeadII } from '../src/ecg/leadFusion';
import { detectRPeaks } from '../src/ecg/ecgAnalysis';
import { parseEcgPacket, parseEcgPacket3, ECG3_FLAG_ADS_OK, ECG3_FLAG_RLD_FAULT, LOD_LL2 } from '../src/ble/protocol';

const FS = 320;
let failures = 0;
function check(name: string, ok: boolean, detail: string): void {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name} — ${detail}`);
  if (!ok) failures++;
}

/* ── deterministic noise ── */
function rng(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function gaussian(r: () => number): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = r();
  while (v === 0) v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
/** Broadband + a 25–40 Hz resonance: what surface EMG looks like. Unit RMS. */
function emg(n: number, r: () => number): Float64Array {
  const x = new Float64Array(n);
  let y1 = 0;
  let y2 = 0;
  const pole = 0.88;
  const ang = (2 * Math.PI * 30) / FS;
  for (let i = 0; i < n; i++) {
    const w = gaussian(r);
    const y = 2 * pole * Math.cos(ang) * y1 - pole * pole * y2 + w;
    y2 = y1;
    y1 = y;
    x[i] = 0.5 * w + 0.15 * y;
  }
  let p = 0;
  for (let i = 0; i < n; i++) p += x[i] * x[i];
  const s = Math.sqrt(p / n) || 1;
  for (let i = 0; i < n; i++) x[i] /= s;
  return x;
}

interface Sim {
  a: Float32Array;
  b: Float32Array;
  /** Copy A's additive offset + drift, known exactly: subtracting IT (rather than
      an estimated baseline) keeps baseline-estimator error out of the verdict. */
  baseA: Float64Array;
  truth: Float64Array;
  beats: number[];
  ectopic: number[];
}

/** mV. `indep`/`common` are noise RMS in mV. */
function simulate(o: { seconds: number; indep: number; common: number; seed: number; ectopicAt?: number[]; bumpB?: boolean; stShift?: number }): Sim {
  const n = Math.round(o.seconds * FS);
  const r = rng(o.seed);
  const truth = new Float64Array(n);
  const beats: number[] = [];
  const ectopic: number[] = [];
  // [amplitude mV, centre s, width s]
  const normal = [[0.12, -0.19, 0.022], [-0.1, -0.03, 0.0085], [1.0, 0, 0.0095], [-0.22, 0.03, 0.011], [0.3, 0.21, 0.042]];
  const pvc = [[-1.1, 0.004, 0.03], [0.5, 0.15, 0.055]];
  let t = 0.6;
  let k = 0;
  while (t < o.seconds - 0.6) {
    const isPvc = o.ectopicAt?.includes(k) ?? false;
    const centre = isPvc ? t - 0.13 : t;
    const idx = Math.round(centre * FS);
    beats.push(idx);
    if (isPvc) ectopic.push(idx);
    // breathing modulates R amplitude a few percent — real, and NOT noise
    const breath = 1 + 0.04 * Math.sin(2 * Math.PI * 0.25 * centre);
    for (let i = Math.max(0, idx - Math.round(0.45 * FS)); i < Math.min(n, idx + Math.round(0.55 * FS)); i++) {
      const tt = i / FS - centre;
      for (const [amp, mu, sd] of isPvc ? pvc : normal) {
        truth[i] += amp * breath * Math.exp(-((tt - mu) * (tt - mu)) / (2 * sd * sd));
      }
      if (o.stShift && !isPvc) {
        const sig = (x: number): number => 1 / (1 + Math.exp(-x));
        truth[i] += o.stShift * sig((tt - 0.052) / 0.012) * sig((0.3 - tt) / 0.055);
      }
    }
    t += 0.86 * (1 + 0.06 * (r() * 2 - 1));
    k++;
  }
  const nRA = emg(n, r); // enters through the shared electrode: in BOTH copies
  const nA = emg(n, r);
  const nB = emg(n, r);
  const a = new Float32Array(n);
  const b = new Float32Array(n);
  const baseA = new Float64Array(n);
  const gainB = 0.97;
  for (let i = 0; i < n; i++) {
    const tt = i / FS;
    const hum = 0.01 * Math.sin(2 * Math.PI * 50 * tt);
    baseA[i] = 6.5 + 0.35 * Math.sin(2 * Math.PI * 0.21 * tt);
    a[i] = truth[i] + o.common * nRA[i] + o.indep * nA[i] + hum + baseA[i];
    b[i] = gainB * truth[i] + o.common * nRA[i] + o.indep * nB[i] + 0.7 * hum + 11.4 + 0.5 * Math.sin(2 * Math.PI * 0.13 * tt + 1);
  }
  if (o.bumpB) {
    // one electrode gets knocked: a slow 3 mV swing on copy B only, for ~0.7 s
    const c = Math.round(0.5 * n);
    const wid = 0.22 * FS;
    for (let i = 0; i < n; i++) b[i] += 3 * Math.exp(-((i - c) * (i - c)) / (2 * wid * wid)) * (1 + 0.25 * Math.sin((i - c) / 6));
  }
  return { a, b, baseA, truth, beats, ectopic };
}

/* ── measurement helpers (the same ones for every trace, so they compare) ── */
function notch50(x: ArrayLike<number>): Float64Array {
  const w0 = (2 * Math.PI * 50) / FS;
  const alpha = Math.sin(w0) / 60;
  const a0 = 1 + alpha;
  const b = [1 / a0, (-2 * Math.cos(w0)) / a0, 1 / a0];
  const a = [1, (-2 * Math.cos(w0)) / a0, (1 - alpha) / a0];
  const run = (v: Float64Array): Float64Array => {
    const y = new Float64Array(v.length);
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    for (let i = 0; i < v.length; i++) {
      const o = b[0] * v[i] + b[1] * x1 + b[2] * x2 - a[1] * y1 - a[2] * y2;
      x2 = x1; x1 = v[i]; y2 = y1; y1 = o; y[i] = o;
    }
    return y;
  };
  return run(run(Float64Array.from(x)).reverse()).reverse();
}
/** For SIMULATED traces: take out the baseline that was put in, exactly, then the
    mains the report chain removes anyway. What is left is heart + noise. */
function cleanSim(x: ArrayLike<number>, base: Float64Array): Float64Array {
  const y = new Float64Array(x.length);
  for (let i = 0; i < y.length; i++) y[i] = x[i] - base[i];
  return notch50(y);
}
function detrended(x: ArrayLike<number>): Float64Array {
  // zero-phase 50 Hz notch is NOT applied here on purpose: the comparison is
  // made on what the fusion returns, after only a slow moving-median baseline.
  const n = x.length;
  const half = Math.round(0.3 * FS);
  const out = new Float64Array(n);
  const buf: number[] = [];
  for (let i = 0; i < n; i += 8) {
    buf.length = 0;
    for (let j = Math.max(0, i - half); j < Math.min(n, i + half); j += 4) buf.push(x[j]);
    buf.sort((p, q) => p - q);
    const m = buf[buf.length >> 1];
    for (let j = i; j < Math.min(n, i + 8); j++) out[j] = x[j] - m;
  }
  return out;
}
function median(v: number[]): number {
  const s = [...v].sort((p, q) => p - q);
  return s.length ? s[s.length >> 1] : 0;
}
/** R amplitude and ST level (J+60 ms) against the PR segment, per beat → median. */
function fiducials(x: Float64Array, beats: number[]): { r: number; st: number } {
  const rs: number[] = [];
  const sts: number[] = [];
  const mean = (from: number, to: number): number => {
    let s = 0;
    for (let i = from; i < to; i++) s += x[i];
    return s / (to - from);
  };
  for (const p of beats) {
    if (p - Math.round(0.12 * FS) < 0 || p + Math.round(0.16 * FS) >= x.length) continue;
    const pr = mean(p - Math.round(0.1 * FS), p - Math.round(0.06 * FS));
    let peak = -Infinity;
    for (let i = p - 3; i <= p + 3; i++) peak = Math.max(peak, x[i]);
    rs.push(peak - pr);
    sts.push(mean(p + Math.round(0.1 * FS), p + Math.round(0.13 * FS)) - pr);
  }
  return { r: median(rs), st: median(sts) };
}
function rmsError(x: Float64Array, truth: Float64Array, from = 0, to = x.length): number {
  let s = 0;
  for (let i = from; i < to; i++) s += (x[i] - truth[i]) * (x[i] - truth[i]);
  return Math.sqrt(s / (to - from));
}
const dB = (before: number, after: number): string => `${(20 * Math.log10(before / after)).toFixed(1)} dB`;

/* ══════════════════ 1. the wire format ══════════════════ */
console.log('\n[1] BLE packet parsers');
{
  const count = 12;
  const bytes = new Uint8Array(4 + count * 13);
  const view = new DataView(bytes.buffer);
  bytes[0] = 200;
  bytes[1] = count;
  bytes[2] = ECG3_FLAG_ADS_OK | ECG3_FLAG_RLD_FAULT;
  for (let i = 0; i < count; i++) {
    view.setInt32(4 + i * 13, 1000 + i, true);
    view.setInt32(8 + i * 13, -250000 + i, true); // beyond int16: must survive
    view.setInt32(12 + i * 13, 685000 - i, true);
    bytes[16 + i * 13] = LOD_LL2;
  }
  const p = parseEcgPacket3(bytes);
  check('3-channel packet decodes', !!p && p.samples.length === 12 && p.seq === 200, `seq=${p?.seq} n=${p?.samples.length}`);
  check('values survive in mV', !!p && p.samples[3].leadI === 1.003 && p.samples[3].leadII === -249.997 && p.samples[3].leadIIb === 684.997, JSON.stringify(p?.samples[3]));
  check('flags + LOD carried', !!p && (p.flags & ECG3_FLAG_RLD_FAULT) !== 0 && p.samples[0].lod === LOD_LL2, `flags=${p?.flags} lod=${p?.samples[0].lod}`);
  check('wrong length is rejected, not guessed', parseEcgPacket3(bytes.subarray(0, bytes.length - 1)) === null, 'len−1 → null');
  check('legacy parser refuses a 3-channel packet', parseEcgPacket(bytes) === null, '4+12×13 on the 5/9 parser → null');
  const legacy = new Uint8Array(2 + 16 * 9);
  legacy[1] = 16;
  check('legacy 16×9 still parses', parseEcgPacket(legacy)?.stride === 9, 'stride 9');
  check('…and the 3-channel parser refuses it', parseEcgPacket3(legacy) === null, '→ null');
}

/* ══════════════════ 2. simulated, truth known ══════════════════ */
console.log('\n[2] Simulated — independent 25 µV + shared 15 µV EMG, 10 s');
{
  const s = simulate({ seconds: 10, indep: 0.025, common: 0.015, seed: 7 });
  const { fused, info } = fuseLeadII(s.a, s.b, FS);
  const stage1 = fuseLeadII(s.a, s.b, FS, { beatAveraging: false }).fused;
  const truth = notch50(s.truth);
  const eA = rmsError(cleanSim(s.a, s.baseA), truth);
  const e1 = rmsError(cleanSim(stage1, s.baseA), truth);
  const e2 = rmsError(cleanSim(fused, s.baseA), truth);
  console.log(`  info: ${JSON.stringify(info)}`);
  check('mode is fused', info.mode === 'fused', `gain ${info.gain.toFixed(3)}, agreement ${info.copyAgreement.toFixed(3)}`);
  check('gain recovered', Math.abs(info.gain - 1 / 0.97) < 0.02, `${info.gain.toFixed(4)} vs ${(1 / 0.97).toFixed(4)}`);
  check('fusion alone is closer to the truth than copy A', e1 < eA, `${(eA * 1000).toFixed(1)} → ${(e1 * 1000).toFixed(1)} µV (${dB(eA, e1)})`);
  check('full output ≥ 3 dB closer to the truth', 20 * Math.log10(eA / e2) >= 3, `${(eA * 1000).toFixed(1)} → ${(e2 * 1000).toFixed(1)} µV (${dB(eA, e2)})`);
  const fT = fiducials(truth, s.beats);
  const fO = fiducials(cleanSim(fused, s.baseA), s.beats);
  check('R amplitude within 2 %', Math.abs(fO.r / fT.r - 1) < 0.02, `${fO.r.toFixed(4)} vs ${fT.r.toFixed(4)} mV`);
  check('ST level within 10 µV', Math.abs(fO.st - fT.st) < 0.01, `${(1000 * (fO.st - fT.st)).toFixed(1)} µV off`);
}

console.log('\n[3] Simulated — ST elevation 150 µV must survive');
{
  const s = simulate({ seconds: 10, indep: 0.03, common: 0.02, seed: 11, stShift: 0.15 });
  const { fused } = fuseLeadII(s.a, s.b, FS);
  const fT = fiducials(notch50(s.truth), s.beats);
  const fA = fiducials(cleanSim(s.a, s.baseA), s.beats);
  const fO = fiducials(cleanSim(fused, s.baseA), s.beats);
  check('ST level preserved', Math.abs(fO.st - fT.st) < 0.01, `truth ${(fT.st * 1000).toFixed(0)} µV, copy A ${(fA.st * 1000).toFixed(0)}, output ${(fO.st * 1000).toFixed(0)}`);
}

console.log('\n[4] Simulated — a lone ectopic beat is passed through, not rewritten');
{
  const s = simulate({ seconds: 12, indep: 0.025, common: 0.015, seed: 3, ectopicAt: [6] });
  const { fused, info } = fuseLeadII(s.a, s.b, FS);
  const stage1 = fuseLeadII(s.a, s.b, FS, { beatAveraging: false }).fused;
  const p = s.ectopic[0];
  let worst = 0;
  for (let i = p - Math.round(0.1 * FS); i < p + Math.round(0.3 * FS); i++) worst = Math.max(worst, Math.abs(fused[i] - stage1[i]));
  check('stage 2 left the ectopic beat alone', worst < 0.002, `max change ${(worst * 1000).toFixed(2)} µV (passed through: ${info.beatsPassedThrough})`);
  const truth = notch50(s.truth);
  const e = rmsError(cleanSim(fused, s.baseA), truth, p - 32, p + 96);
  const eA = rmsError(cleanSim(s.a, s.baseA), truth, p - 32, p + 96);
  check('…and it is no further from the truth than copy A', e <= eA * 1.05, `${(eA * 1000).toFixed(1)} → ${(e * 1000).toFixed(1)} µV`);
}

console.log('\n[5] Simulated — copy B gets bumped: it must be weighted out, not averaged in');
{
  const s = simulate({ seconds: 10, indep: 0.02, common: 0.01, seed: 5, bumpB: true });
  const { fused } = fuseLeadII(s.a, s.b, FS);
  const c = Math.round(0.5 * s.a.length);
  const from = c - Math.round(0.4 * FS);
  const to = c + Math.round(0.4 * FS);
  const truth = notch50(s.truth);
  const naive = new Float64Array(s.a.length);
  const da = cleanSim(s.a, s.baseA);
  const db = detrended(s.b); // copy B's true baseline is not exposed; the 3 mV bump dwarfs the difference
  for (let i = 0; i < naive.length; i++) naive[i] = 0.5 * (da[i] + db[i] / 0.97);
  const eNaive = rmsError(naive, truth, from, to);
  const eOut = rmsError(cleanSim(fused, s.baseA), truth, from, to);
  const eA = rmsError(da, truth, from, to);
  check('output stays near copy A through the bump', eOut < 2.5 * eA, `copy A ${(eA * 1000).toFixed(0)} µV · naive average ${(eNaive * 1000).toFixed(0)} µV · output ${(eOut * 1000).toFixed(0)} µV`);
}

console.log('\n[6] Fallbacks — never worse than copy A');
{
  const s = simulate({ seconds: 10, indep: 0.02, common: 0.01, seed: 9 });
  check('no second copy', fuseLeadII(s.a, null, FS).fused === s.a, 'returns copy A itself');
  check('length mismatch', fuseLeadII(s.a, s.b.subarray(0, 100), FS).info.fallback === 'length-mismatch', 'single');
  const flat = new Float32Array(s.a.length).fill(12);
  check('flat copy B', fuseLeadII(s.a, flat, FS).info.fallback === 'flat', 'single');
  const other = new Float32Array(s.a.length);
  for (let i = 0; i < other.length; i++) other[i] = 0.3 * Math.sin((2 * Math.PI * 1.7 * i) / FS) + 0.02 * Math.sin(i);
  check('copy B is not Lead II', fuseLeadII(s.a, other, FS).info.fallback === 'not-same-lead', 'single');
  const floating = Float32Array.from(s.b);
  const r = rng(1);
  for (let i = 1600; i < 2400; i++) floating[i] = 40 * gaussian(r); // LL#2 off for 2.5 s: garbage
  const res = fuseLeadII(s.a, floating, FS);
  const truth = notch50(s.truth);
  const e = rmsError(cleanSim(res.fused, s.baseA), truth, 1700, 2300);
  const eA = rmsError(cleanSim(s.a, s.baseA), truth, 1700, 2300);
  check('LL#2 off mid-recording does not leak in', e < 2 * eA, `mode ${res.info.mode}${res.info.fallback ? '/' + res.info.fallback : ''}: copy A ${(eA * 1000).toFixed(0)} µV, output ${(e * 1000).toFixed(0)} µV`);
}

/* ══════════════════ 3. real recordings (report only) ══════════════════ */
for (const path of process.argv.slice(2)) {
  console.log(`\n[real] ${path.split(/[\\/]/).pop()}`);
  const rows = readFileSync(path, 'utf8').trim().split(/\r?\n/).slice(1).map((l) => l.split(',').map(Number));
  // playground preset A: ch1 = IN3−IN1 (copy A), ch2 = IN4−IN1 (copy B) — the v3 electrode pair
  const all = { a: Float32Array.from(rows.map((r) => r[1] / 1000)), b: Float32Array.from(rows.map((r) => r[2] / 1000)) };
  const seg = 10 * FS;
  console.log('   t(s) | mode    gain  agree  w̄B  | noise µV: copyA → fused → output        | ΔR vs A    ΔST vs A');
  for (let s0 = 0; s0 + seg <= all.a.length; s0 += seg) {
    const a = all.a.slice(s0, s0 + seg);
    const b = all.b.slice(s0, s0 + seg);
    const { fused, info } = fuseLeadII(a, b, FS);
    const da = detrended(a);
    const dout = detrended(fused);
    const peaks = detectRPeaks(Float32Array.from(da), FS);
    const fa = fiducials(da, peaks);
    const fo = fiducials(dout, peaks);
    const tail = info.mode === 'fused'
      ? `${info.noiseCopyAUv.toFixed(1).padStart(5)} → ${info.noiseFusedUv.toFixed(1).padStart(5)} → ${info.noiseOutputUv.toFixed(1).padStart(5)}  (${dB(info.noiseCopyAUv, info.noiseOutputUv).padStart(7)}) | ${(100 * (fo.r / fa.r - 1)).toFixed(2).padStart(6)} %  ${(1000 * (fo.st - fa.st)).toFixed(1).padStart(6)} µV`
      : `— ${info.fallback}`;
    console.log(`  ${String(s0 / FS).padStart(5)} | ${info.mode.padEnd(6)} ${info.gain.toFixed(3)} ${info.copyAgreement.toFixed(3)}  ${info.meanWeightB.toFixed(2)} | ${tail}`);
  }
}

console.log(failures ? `\n${failures} check(s) FAILED` : '\nall checks passed');
process.exit(failures ? 1 : 0);

// v1.0.0 — first headless check in the repo: BLE parsers (legacy + 3-channel) and
//          the leadFusion guarantees (truth-referenced on simulation, reported on
//          real HW_PLAYGROUND recordings).
