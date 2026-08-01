/* ==================================================================
   EcgWave — live Lead II sweep rendered with Skia (GPU, off the JS
   layout path). Reads the ring buffer directly — samples NEVER pass
   through Redux (root CLAUDE.md §3.2).

   v0.1 redraws on a 30 Hz timer, which is plenty for a preview. The
   production path (worklet-driven Skia picture fed by the native
   buffer) replaces the timer, not this component's API.
   ================================================================== */

import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import { useEffect, useState } from 'react';
import type { EcgBufferView } from '@cyphix/shared';
import { BUFFER_SIZE, SAMPLE_RATE } from '@cyphix/shared';
import { useTheme } from '@/theme/useTheme';

interface Props {
  buffer: EcgBufferView;
  /** Seconds of signal shown in the window. */
  seconds?: number;
  width: number;
  height: number;
  active: boolean;
}

const REDRAW_MS = 33;

export default function EcgWave({ buffer, seconds = 4, width, height, active }: Props) {
  const t = useTheme();
  const [path, setPath] = useState(() => Skia.Path.Make());

  useEffect(() => {
    if (!active) return;
    const window = Math.min(seconds * SAMPLE_RATE, BUFFER_SIZE);
    const timer = setInterval(() => {
      const p = Skia.Path.Make();
      const end = buffer.writeIdx;
      const start = Math.max(0, end - window);
      const n = end - start;
      if (n < 2) {
        setPath(p);
        return;
      }
      // Fixed ±1.6 mV viewport — a calm default for a preview trace.
      const mvSpan = 3.2;
      // 4 s at 320 Hz is ~1280 samples into ~340 px. Draw the MIN AND MAX of
      // each pixel column rather than every Nth sample: plain subsampling
      // walks over the R peak and makes the QRS shrink and flicker frame to
      // frame — a waveform must never look smaller than the data.
      const columns = Math.max(1, Math.floor(width));
      const perColumn = Math.max(1, Math.floor(window / columns));
      const toY = (v: number) => height / 2 - (v / mvSpan) * height;

      for (let c = 0; c < columns; c++) {
        const from = c * perColumn;
        if (from >= n) break;
        const to = Math.min(from + perColumn, n);
        let lo = Infinity;
        let hi = -Infinity;
        for (let i = from; i < to; i++) {
          const v = buffer.leadII[(start + i) % BUFFER_SIZE];
          if (v < lo) lo = v;
          if (v > hi) hi = v;
        }
        const x = (from / (window - 1)) * width;
        if (c === 0) p.moveTo(x, toY(hi));
        else p.lineTo(x, toY(hi));
        if (lo !== hi) p.lineTo(x, toY(lo));
      }
      setPath(p);
    }, REDRAW_MS);
    return () => clearInterval(timer);
  }, [active, buffer, seconds, width, height]);

  return (
    <Canvas style={{ width, height }}>
      <Path path={path} color={active ? t.accentLive : t.textTertiary} style="stroke" strokeWidth={2} strokeJoin="round" strokeCap="round" />
    </Canvas>
  );
}

// v0.1.1 — Min/max-per-column decimation so the QRS keeps its true amplitude.
