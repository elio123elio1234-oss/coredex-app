/* ==================================================================
   SixLeadMonitor (organism) — the six limb traces, live.
   A port of the web organism of the same name, drawing included.

   ══ THE GRID IS 2 × 3, NOT 6 × 1 ══
   `.limb-monitor .lead-grid` is `repeat(2, 1fr) / repeat(3, 1fr)` with a
   10 px gap, filled row-major:

        ┌──── I ────┬──── II ───┐
        ├─── III ───┼─── aVR ───┤
        ├─── aVL ───┼─── aVF ───┤
        └───────────┴───────────┘

   Six stacked rows is what the web falls back to below 720 px, not the
   layout — and stacking them on a phone gives every trace ~55 px of
   height, which squeezes the QRS complexes into a fuzzy band. Two
   columns of three is what a clinician reads.

   ── SIGNAL PATH (frozen, identical to the web monitor) ──
     BLE ring buffer (raw I, II in mV)
       → filterSixLeads()  : filter the TWO measured leads, then derive
                             the other four from the FILTERED values
       → updateDC()        : keep each trace vertically centred
       → per-lead display ring buffers → Skia paths

   ⚠️ Filtering two and deriving six is deliberate and load-bearing —
   running six independent IIR chains breaks the Einthoven identities on
   the derived leads (see ecgDSP.ts). Do not "simplify" it.

   ⚠️ THIS IS THE SCREEN, NOT THE RECORDING. Nothing here reaches the
   report: useLimbRecorder captures the RAW BLE samples and runs the
   offline diagnostic chain on them. These buffers are patient feedback,
   so they are filtered for a calm, legible trace.

   Per-sample work happens in refs at 320 Hz; only the finished paths hit
   React state, at the redraw rate.
   ================================================================== */

import {
  Canvas,
  Group,
  Path,
  rect,
  rrect,
  RoundedRect,
  Skia,
  type SkPath,
} from '@shopify/react-native-skia';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  createDCTracker,
  createSixLeadFilter,
  LIMB_LEAD_ORDER,
  updateDC,
  filterSixLeads,
  type LimbLeadName,
} from '@cyphix/shared';
import { useBle } from '@/features/ble/useBle';
import { useIsDark, useTheme } from '@/theme/useTheme';

/** `.lead-grid { grid-template-columns: repeat(2, …) }` */
const COLS = 2;
const ROWS = 3;
/** `.lead-grid { gap: 10px }` */
const GAP = 10;
/** `.lead-card { padding: 8px; border-radius: var(--radius-md) }`.
    On a phone in landscape a cell is ~65 px tall, where 16 px of padding is
    a quarter of the trace's whole height — so short cards keep the border
    radius but halve the inset. The web never meets this case: its cards are
    a 110 px canvas plus padding. */
const CARD_PAD_FULL = 8;
const CARD_PAD_TIGHT = 4;
const CARD_TIGHT_BELOW = 90;
const CARD_RADIUS = 14;

/** Visible window per card: 3 seconds, same as the web and the reference
    monitor. Longer windows squeeze more cycles into the same pixels, which
    turns ordinary sensor noise into a solid fuzzy band. */
const VISIBLE_SECONDS = 3;
/** Redraw cadence — 20 Hz is plenty for a waveform and cheap on the JS
    thread (the web can afford rAF; a phone should not spend it here). */
const REDRAW_MS = 50;
/** ~0.38 of card height per 1 mV — verbatim from the web/legacy scaling. */
const MV_SCALE = 0.38;
/** ECG paper, from the web `drawGrid`. */
const GRID_MINOR = 12;
const GRID_MAJOR = 60;

interface Props {
  width: number;
  height: number;
}

export default function SixLeadMonitor({ width, height }: Props) {
  const t = useTheme();
  const dark = useIsDark();
  const { subscribe, getBuffer, SAMPLE_RATE } = useBle();
  const [paths, setPaths] = useState<Record<string, SkPath>>({});

  /* ── Cell geometry ── */
  const cardW = (width - GAP * (COLS - 1)) / COLS;
  const cardH = (height - GAP * (ROWS - 1)) / ROWS;
  const cardPad = cardH < CARD_TIGHT_BELOW ? CARD_PAD_TIGHT : CARD_PAD_FULL;
  const plotW = Math.max(1, cardW - cardPad * 2);
  const plotH = Math.max(1, cardH - cardPad * 2);

  /* ── ECG paper. Static for a given cell size, so build it once. ── */
  const grid = useMemo(() => {
    const minor = Skia.Path.Make();
    const major = Skia.Path.Make();
    // Web: minor every 12 px both ways, major verticals every 60 px.
    for (let x = 0; x < plotW; x += GRID_MINOR) {
      minor.moveTo(x, 0);
      minor.lineTo(x, plotH);
    }
    for (let y = 0; y < plotH; y += GRID_MINOR) {
      minor.moveTo(0, y);
      minor.lineTo(plotW, y);
    }
    for (let x = 0; x < plotW; x += GRID_MAJOR) {
      major.moveTo(x, 0);
      major.lineTo(x, plotH);
    }
    return { minor, major };
  }, [plotW, plotH]);

  /* Colours are the web's own, not re-picked (SixLeadMonitor.tsx). */
  const paper = dark ? '#0D1424' : '#FFFFFF';
  const gridMinor = dark ? 'rgba(76,141,255,0.10)' : 'rgba(0,82,255,0.06)';
  const gridMajor = dark ? 'rgba(76,141,255,0.20)' : 'rgba(0,82,255,0.14)';
  const trace = dark ? '#4ADE80' : '#0A2540';

  /* ── Per-sample state: refs only ── */
  const capacity = Math.max(1, Math.round(VISIBLE_SECONDS * SAMPLE_RATE));
  const filtersRef = useRef(createSixLeadFilter());
  const dcRef = useRef(createDCTracker());
  const lastIdxRef = useRef(0);
  const displayRef = useRef<Record<LimbLeadName, Float32Array>>(
    Object.fromEntries(
      LIMB_LEAD_ORDER.map((l) => [l, new Float32Array(capacity)]),
    ) as Record<LimbLeadName, Float32Array>,
  );
  const writeRef = useRef(0);

  /* Depend on the STABLE subscribe/getBuffer, never on the whole `ble`
     object — that is a fresh object every render, and depending on it
     re-subscribed and reset the filter state on every parent re-render
     (e.g. every progress tick), which made the traces jump. */
  useEffect(() => {
    filtersRef.current = createSixLeadFilter();
    dcRef.current = createDCTracker();
    lastIdxRef.current = getBuffer()?.writeIdx ?? 0;

    return subscribe(() => {
      const b = getBuffer();
      if (!b) return;
      const ni = b.writeIdx;
      let pi = lastIdxRef.current;
      if (ni <= pi) return;
      // A long stall must not replay minutes of buffer in one frame.
      if (ni - pi > capacity) pi = ni - capacity;

      const size = b.leadI.length;
      for (let i = pi; i < ni; i++) {
        // 1. Filter the two MEASURED leads, derive the other four from the
        //    filtered values (order matters — see ecgDSP.ts).
        const six = filterSixLeads(filtersRef.current, b.leadI[i % size], b.leadII[i % size]);
        // 2. Remove DC offset + store into the visible window.
        const w = writeRef.current % capacity;
        for (const lead of LIMB_LEAD_ORDER) {
          displayRef.current[lead][w] = updateDC(dcRef.current, lead, six[lead]);
        }
        writeRef.current++;
      }
      lastIdxRef.current = ni;
    });
  }, [subscribe, getBuffer, capacity]);

  /* ── Publish finished paths at the redraw rate ──
     Each path is in ITS OWN plot's coordinates (origin at the card's inner
     top-left); the Canvas translates per cell. */
  useEffect(() => {
    const iv = setInterval(() => {
      const next: Record<string, SkPath> = {};
      const total = writeRef.current;
      const n = Math.min(total, capacity);
      const start = total > capacity ? total - capacity : 0;
      // The window is a fixed 3 s wide whether or not it has filled yet, so
      // a starting trace draws in from the left instead of stretching.
      const pxPerSample = plotW / capacity;
      const mid = plotH / 2;
      const scale = plotH * MV_SCALE;

      LIMB_LEAD_ORDER.forEach((lead) => {
        const p = Skia.Path.Make();
        if (n >= 2) {
          const data = displayRef.current[lead];

          /* ── Centre on the VISIBLE WINDOW's own mean ──
             What the reference desktop monitor does at every redraw
             (`data - np.mean(data)`), and why its traces sit flat while
             ours drifted. The IIR high-pass upstream removes baseline
             wander eventually, but "eventually" is seconds — a 0.5 Hz
             high-pass fed a step (an electrode settling, a patient
             shifting) decays over several of them, and the operator
             watches the trace wander off the card the whole time.
             Subtracting the window mean is a zero-latency correction.

             DISPLAY ONLY. The report is computed from the raw captured
             samples, never from these display buffers. */
          let mean = 0;
          for (let s = 0; s < n; s++) mean += data[(start + s) % capacity];
          mean /= n;

          for (let s = 0; s < n; s++) {
            const v = data[(start + s) % capacity] - mean;
            const x = s * pxPerSample;
            // Clamp inside the plot: a saturated lead must not paint over
            // the card's neighbours.
            const y = Math.max(1, Math.min(plotH - 1, mid - v * scale));
            if (s === 0) p.moveTo(x, y);
            else p.lineTo(x, y);
          }
        }
        next[lead] = p;
      });
      setPaths(next);
    }, REDRAW_MS);
    return () => clearInterval(iv);
  }, [plotW, plotH, capacity]);

  /** Row-major placement, as CSS grid auto-flow fills `.lead-grid`. */
  const cellXY = (i: number) => ({
    x: (i % COLS) * (cardW + GAP),
    y: Math.floor(i / COLS) * (cardH + GAP),
  });

  return (
    <View style={{ width, height }}>
      <Canvas style={{ width, height }}>
        {LIMB_LEAD_ORDER.map((lead, i) => {
          const { x, y } = cellXY(i);
          return (
            <Group key={lead} transform={[{ translateX: x }, { translateY: y }]}>
              {/* .lead-card — surface, hairline border, rounded */}
              <RoundedRect
                x={0}
                y={0}
                width={cardW}
                height={cardH}
                r={CARD_RADIUS}
                color={t.surface}
              />
              <RoundedRect
                x={0.5}
                y={0.5}
                width={cardW - 1}
                height={cardH - 1}
                r={CARD_RADIUS}
                color={t.border}
                style="stroke"
                strokeWidth={1}
              />
              {/* The canvas inside the card's 8 px padding: paper, grid, trace */}
              <Group
                transform={[{ translateX: cardPad }, { translateY: cardPad }]}
                clip={rrect(rect(0, 0, plotW, plotH), 6, 6)}
              >
                <RoundedRect x={0} y={0} width={plotW} height={plotH} r={6} color={paper} />
                <Path path={grid.minor} color={gridMinor} style="stroke" strokeWidth={0.5} />
                <Path path={grid.major} color={gridMajor} style="stroke" strokeWidth={1} />
                {paths[lead] ? (
                  <Path
                    path={paths[lead]}
                    color={trace}
                    style="stroke"
                    strokeWidth={1.6}
                    strokeJoin="round"
                    strokeCap="round"
                  />
                ) : null}
              </Group>
            </Group>
          );
        })}
      </Canvas>

      {/* .lead-label — RN text over the canvas (Skia text needs a font asset,
          and the label is chrome, not signal). */}
      {LIMB_LEAD_ORDER.map((lead, i) => {
        const { x, y } = cellXY(i);
        return (
          <View
            key={lead}
            pointerEvents="none"
            style={[
              styles.label,
              {
                left: x + cardPad + 4,
                top: y + cardPad + 2,
                backgroundColor: t.surface,
                borderColor: t.border,
              },
            ]}
          >
            <Text
              allowFontScaling={false}
              style={[
                styles.labelText,
                { color: t.textSecondary, fontSize: cardPad === CARD_PAD_TIGHT ? 11 : 13 },
              ]}
            >
              {lead}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    position: 'absolute',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  labelText: { fontWeight: '800', letterSpacing: 0.5 },
});

// v3.0.0 — 2 × 3 lead grid with the web's own drawing: 3 s window, 12/60 px
//          paper, 0.38 mV scale, per-frame window-mean centring.
