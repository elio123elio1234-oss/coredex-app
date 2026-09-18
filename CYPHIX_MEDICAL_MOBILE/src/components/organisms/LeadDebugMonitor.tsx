/* ==================================================================
   LeadDebugMonitor (organism) — three stacked live traces:
   Lead I · Lead II-a · Lead II-b. Pure drawing: the rings arrive by ref
   from `useLeadDebug`, this only turns them into Skia paths.

   ⚠️ TEMPORARY DIAGNOSTIC (LEAD_DEBUG_SCREEN_ENABLED). See useLeadDebug.

   Drawing is SixLeadMonitor's, deliberately: same ECG paper, same
   0.38-of-height-per-mV scale, same window-mean centring, same 20 Hz
   redraw — so a trace here looks like the trace on the exam screen and
   a difference between them is a difference in the SIGNAL.

   ★ ALL THREE SHARE ONE SCALE. The point of the screen is comparing
   II-a with II-b by eye; auto-scaling each card would make a copy at a
   tenth of the amplitude look identical to a healthy one.
   ================================================================== */

import { Canvas, Group, Path, rect, rrect, RoundedRect, Skia, type SkPath } from '@shopify/react-native-skia';
import { useEffect, useMemo, useState, type MutableRefObject } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { LeadDebugChannel, LeadDebugRings } from '@/features/debug/useLeadDebug';
import { useIsDark, useTheme } from '@/theme/useTheme';

const CHANNELS: readonly { key: LeadDebugChannel; name: string; pair: string }[] = [
  { key: 'I', name: 'I', pair: 'LA − RA' },
  { key: 'IIa', name: 'II-a', pair: 'LL#1 − RA' },
  { key: 'IIb', name: 'II-b', pair: 'LL#2 − RA' },
];

const GAP = 8;
const CARD_PAD = 6;
const CARD_RADIUS = 14;
const REDRAW_MS = 50;
const MV_SCALE = 0.38;
const GRID_MINOR = 12;
const GRID_MAJOR = 60;

interface Props {
  width: number;
  height: number;
  rings: MutableRefObject<LeadDebugRings>;
  /** Peak-to-peak per channel (mV) — printed in the card's corner. */
  p2pMv: Record<LeadDebugChannel, number | null>;
  /** Shown in place of the third trace when the stream has no second copy. */
  noSecondCopyText: string;
}

export default function LeadDebugMonitor({ width, height, rings, p2pMv, noSecondCopyText }: Props) {
  const t = useTheme();
  const dark = useIsDark();
  const [paths, setPaths] = useState<Partial<Record<LeadDebugChannel, SkPath>>>({});
  const [hasSecondCopy, setHasSecondCopy] = useState(false);

  const cardH = (height - GAP * (CHANNELS.length - 1)) / CHANNELS.length;
  const plotW = Math.max(1, width - CARD_PAD * 2);
  const plotH = Math.max(1, cardH - CARD_PAD * 2);

  const grid = useMemo(() => {
    const minor = Skia.Path.Make();
    const major = Skia.Path.Make();
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

  const paper = dark ? '#0D1424' : '#FFFFFF';
  const gridMinor = dark ? 'rgba(76,141,255,0.10)' : 'rgba(0,82,255,0.06)';
  const gridMajor = dark ? 'rgba(76,141,255,0.20)' : 'rgba(0,82,255,0.14)';
  const trace = dark ? '#4ADE80' : '#0A2540';
  // The copy that is normally never drawn gets its own ink, so a screenshot
  // of this screen cannot be mistaken for the exam monitor.
  const traceB = t.accentLive;

  useEffect(() => {
    const iv = setInterval(() => {
      const r = rings.current;
      const n = Math.min(r.written, r.capacity);
      const start = r.written > r.capacity ? r.written - r.capacity : 0;
      const pxPerSample = plotW / r.capacity;
      const mid = plotH / 2;
      const scale = plotH * MV_SCALE;

      const next: Partial<Record<LeadDebugChannel, SkPath>> = {};
      for (const { key } of CHANNELS) {
        if (key === 'IIb' && !r.hasSecondCopy) continue;
        const data = r[key];
        const p = Skia.Path.Make();
        if (n >= 2) {
          let mean = 0;
          for (let s = 0; s < n; s++) mean += data[(start + s) % r.capacity];
          mean /= n;
          for (let s = 0; s < n; s++) {
            const v = data[(start + s) % r.capacity] - mean;
            const x = s * pxPerSample;
            const y = Math.max(1, Math.min(plotH - 1, mid - v * scale));
            if (s === 0) p.moveTo(x, y);
            else p.lineTo(x, y);
          }
        }
        next[key] = p;
      }
      setPaths(next);
      setHasSecondCopy(r.hasSecondCopy);
    }, REDRAW_MS);
    return () => clearInterval(iv);
  }, [rings, plotW, plotH]);

  return (
    <View style={{ width, height }}>
      <Canvas style={{ width, height }}>
        {CHANNELS.map(({ key }, i) => {
          const path = paths[key];
          return (
            <Group key={key} transform={[{ translateY: i * (cardH + GAP) }]}>
              <RoundedRect x={0} y={0} width={width} height={cardH} r={CARD_RADIUS} color={t.surface} />
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
              <Group
                transform={[{ translateX: CARD_PAD }, { translateY: CARD_PAD }]}
                clip={rrect(rect(0, 0, plotW, plotH), 8, 8)}
              >
                <RoundedRect x={0} y={0} width={plotW} height={plotH} r={8} color={paper} />
                <Path path={grid.minor} color={gridMinor} style="stroke" strokeWidth={0.5} />
                <Path path={grid.major} color={gridMajor} style="stroke" strokeWidth={1} />
                {path ? (
                  <Path
                    path={path}
                    color={key === 'IIb' ? traceB : trace}
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

      {CHANNELS.map(({ key, name, pair }, i) => {
        const top = i * (cardH + GAP);
        const p2p = p2pMv[key];
        const absent = key === 'IIb' && !hasSecondCopy;
        return (
          <View key={key} pointerEvents="none" style={[styles.overlay, { top, height: cardH }]}>
            <View style={[styles.label, { backgroundColor: t.surface, borderColor: t.border }]}>
              <Text allowFontScaling={false} style={[styles.labelName, { color: t.textPrimary }]}>
                {name}
              </Text>
              <Text allowFontScaling={false} style={[styles.labelPair, { color: t.textSecondary }]}>
                {pair}
              </Text>
            </View>
            {p2p !== null ? (
              <View style={[styles.readout, { backgroundColor: t.surface, borderColor: t.border }]}>
                <Text allowFontScaling={false} style={[styles.readoutText, { color: t.textSecondary }]}>
                  {p2p.toFixed(2)} mV p-p
                </Text>
              </View>
            ) : null}
            {absent ? (
              <View style={styles.absent}>
                <Text style={[styles.absentText, { color: t.textSecondary }]}>{noSecondCopyText}</Text>
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', left: 0, right: 0 },
  label: {
    position: 'absolute',
    left: CARD_PAD + 4,
    top: CARD_PAD + 3,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  labelName: { fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },
  labelPair: { fontSize: 11, fontWeight: '600' },
  readout: {
    position: 'absolute',
    right: CARD_PAD + 4,
    top: CARD_PAD + 3,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  readoutText: { fontSize: 11, fontWeight: '700', fontVariant: ['tabular-nums'] },
  absent: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  absentText: { fontSize: 13, fontWeight: '600', textAlign: 'center', lineHeight: 19 },
});

// v1.0.0 — TEMPORARY (behind LEAD_DEBUG_SCREEN_ENABLED): Lead I, II-a and the
//          normally-never-drawn II-b, stacked on one shared scale.
