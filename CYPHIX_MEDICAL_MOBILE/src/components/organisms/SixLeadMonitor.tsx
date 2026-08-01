/* ==================================================================
   SixLeadMonitor (organism) — the six limb traces on ECG paper.

   ── SIGNAL PATH (frozen, identical to the web monitor) ──
     BLE ring buffer (raw I, II in mV)
       → filterSixLeads()  : filter the TWO measured leads, then derive
                             the other four from the FILTERED values
       → updateDC()        : keep each trace vertically centred
       → per-lead display ring buffers → Skia paths

   ⚠️ Filtering two and deriving six is deliberate and load-bearing —
   running six independent IIR chains breaks the Einthoven identities on
   the derived leads (see ecgDSP.ts). Do not "simplify" it. Note the
   BeatAlign-Native reference DOES filter six independently; that is the
   one thing here not copied from it, on purpose.

   ── LOOK (from the BeatAlign-Native reference, SixLeadDisplay.js) ──
   Each lead is its own card on ECG graph paper: minor grid every 16 px,
   major every 80 px, a coloured label chip in the top-left, the trace
   drawn at 35 % of card height per millivolt. Colours come from CYPHIX's
   own tokens rather than the reference's teal — the brand is navy on
   every platform (root CLAUDE.md §3.3) — but `#1e3f66` for the trace is
   both the reference's colour and CYPHIX's own blob-gradient navy.

   Per-sample work happens in refs at 320 Hz; only the finished paths hit
   React state, at the redraw rate.
   ================================================================== */

import {
  Canvas,
  Group,
  Path,
  rrect,
  rect,
  RoundedRect,
  Skia,
  type SkPath,
} from '@shopify/react-native-skia';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, useColorScheme, View } from 'react-native';
import {
  createDCTracker,
  createSixLeadFilter,
  LIMB_LEAD_ORDER,
  updateDC,
  filterSixLeads,
  type LimbLeadName,
} from '@cyphix/shared';
import { useBle } from '@/features/ble/useBle';
import { useTheme } from '@/theme/useTheme';

/** Seconds of signal visible per trace. */
const WINDOW_SECS = 4;
/** Redraw cadence — 20 Hz is plenty for a waveform and cheap on the JS thread. */
const REDRAW_MS = 50;
/** Reference: `scale = cardHeight * 0.35`, i.e. 1 mV = 35 % of a card. */
const MV_TO_CARD = 0.35;
/** ECG paper, from the reference. */
const GRID_MINOR = 16;
const GRID_MAJOR = 80;
/** Gap between lead cards. */
const CARD_GAP = 6;
const CARD_RADIUS = 12;

interface Props {
  width: number;
  height: number;
}

export default function SixLeadMonitor({ width, height }: Props) {
  const t = useTheme();
  const dark = useColorScheme() === 'dark';
  const { subscribe, getBuffer, SAMPLE_RATE } = useBle();
  const [paths, setPaths] = useState<Record<string, SkPath>>({});

  const rows = LIMB_LEAD_ORDER.length;
  const cardH = (height - CARD_GAP * (rows - 1)) / rows;
  const step = cardH + CARD_GAP;

  /* ── ECG paper. Static for a given size, so build it once. ── */
  const grid = useMemo(() => {
    const minor = Skia.Path.Make();
    const major = Skia.Path.Make();
    for (let x = 0; x <= width; x += GRID_MINOR) {
      const p = x % GRID_MAJOR === 0 ? major : minor;
      p.moveTo(x, 0);
      p.lineTo(x, cardH);
    }
    for (let y = 0; y <= cardH; y += GRID_MINOR) {
      const p = y % GRID_MAJOR === 0 ? major : minor;
      p.moveTo(0, y);
      p.lineTo(width, y);
    }
    return { minor, major };
  }, [width, cardH]);

  const paper = dark ? '#1a1d27' : '#FFFFFF';
  const gridMinor = dark ? 'rgba(56,189,248,0.05)' : 'rgba(30,63,102,0.05)';
  const gridMajor = dark ? 'rgba(56,189,248,0.10)' : 'rgba(30,63,102,0.10)';
  const trace = dark ? '#38bdf8' : '#1e3f66';

  /* ── Per-sample state: refs only ── */
  const filtersRef = useRef(createSixLeadFilter());
  const dcRef = useRef(createDCTracker());
  const lastIdxRef = useRef(0);
  const capacity = Math.max(1, Math.round(WINDOW_SECS * SAMPLE_RATE));
  const displayRef = useRef<Record<LimbLeadName, Float32Array>>(
    Object.fromEntries(
      LIMB_LEAD_ORDER.map((l) => [l, new Float32Array(capacity)]),
    ) as Record<LimbLeadName, Float32Array>,
  );
  const writeRef = useRef(0);

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
        const six = filterSixLeads(filtersRef.current, b.leadI[i % size], b.leadII[i % size]);
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
     Each path is in ITS OWN card's coordinates (origin at the card's top
     left); the Canvas translates per row. */
  useEffect(() => {
    const iv = setInterval(() => {
      const next: Record<string, SkPath> = {};
      const total = writeRef.current;
      const n = Math.min(total, capacity);
      const start = total - n;
      const mid = cardH / 2;
      const scale = cardH * MV_TO_CARD;

      LIMB_LEAD_ORDER.forEach((lead) => {
        const p = Skia.Path.Make();
        if (n >= 2) {
          const buf = displayRef.current[lead];
          // Min/max per pixel column: plain subsampling walks over the R peak
          // and shrinks the QRS (same reason as EcgWave).
          const columns = Math.max(1, Math.floor(width));
          const per = Math.max(1, Math.floor(n / columns));
          for (let c = 0; c < columns; c++) {
            const from = c * per;
            if (from >= n) break;
            const to = Math.min(from + per, n);
            let lo = Infinity;
            let hi = -Infinity;
            for (let i = from; i < to; i++) {
              const v = buf[(start + i) % capacity];
              if (v < lo) lo = v;
              if (v > hi) hi = v;
            }
            const x = (from / (n - 1)) * width;
            // Clamp inside the card, as the reference does.
            const yHi = Math.max(2, Math.min(cardH - 2, mid - hi * scale));
            const yLo = Math.max(2, Math.min(cardH - 2, mid - lo * scale));
            if (c === 0) p.moveTo(x, yHi);
            else p.lineTo(x, yHi);
            if (yLo !== yHi) p.lineTo(x, yLo);
          }
        }
        next[lead] = p;
      });
      setPaths(next);
    }, REDRAW_MS);
    return () => clearInterval(iv);
  }, [width, cardH, capacity]);

  return (
    <View style={{ width, height }}>
      <Canvas style={{ width, height }}>
        {LIMB_LEAD_ORDER.map((lead, row) => (
          <Group key={lead} transform={[{ translateY: row * step }]}>
            {/* The paper */}
            <RoundedRect
              x={0}
              y={0}
              width={width}
              height={cardH}
              r={CARD_RADIUS}
              color={paper}
            />
            {/* Grid + trace, clipped to the rounded card */}
            <Group clip={rrect(rect(0, 0, width, cardH), CARD_RADIUS, CARD_RADIUS)}>
              <Path path={grid.minor} color={gridMinor} style="stroke" strokeWidth={0.5} />
              <Path path={grid.major} color={gridMajor} style="stroke" strokeWidth={0.8} />
              {paths[lead] ? (
                <Path
                  path={paths[lead]}
                  color={trace}
                  style="stroke"
                  strokeWidth={1.5}
                  strokeJoin="round"
                  strokeCap="round"
                />
              ) : null}
            </Group>
            {/* Hairline border */}
            <RoundedRect
              x={0.5}
              y={0.5}
              width={width - 1}
              height={cardH - 1}
              r={CARD_RADIUS}
              color={t.border}
              style="stroke"
              strokeWidth={1}
            />
          </Group>
        ))}
      </Canvas>

      {/* Lead label chips — RN text over the canvas (Skia text needs a font
          asset; the label is chrome, not signal). */}
      {LIMB_LEAD_ORDER.map((lead, row) => (
        <View
          key={lead}
          style={[styles.chip, { top: row * step + 6, backgroundColor: t.brandNavy }]}
          pointerEvents="none"
        >
          <Text allowFontScaling={false} style={styles.chipText}>
            {lead}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    position: 'absolute',
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  chipText: { fontSize: 10, fontWeight: '800', color: '#FFFFFF' },
});

// v2.0.0 — ECG paper look ported from the BeatAlign-Native reference: per-lead
//          cards, 16/80 px grid, label chips, 1 mV = 35 % of card height.
