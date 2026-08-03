/* ==================================================================
   CYPHIX ECG BLE wire protocol — THE frozen contract with the ESP32
   firmware. Platform-neutral: consumed by Web Bluetooth (web), the
   Swift CoreBluetooth module (iOS) and the Kotlin GATT module
   (Android). If a value here changes, THREE apps and the firmware
   change together — treat every constant as frozen (root CLAUDE.md
   §2.3, web CLAUDE.md §6.0).

   PACKET FORMAT (binary, little-endian):
     ┌────────┬──────────┬────────────────────────────────┐
     │ seq:u8 │ count:u8 │ count × sample (5 or 9 bytes)  │
     └────────┴──────────┴────────────────────────────────┘
     legacy sample (5 B) = int16 LeadI(µV) │ int16 LeadII(µV) │ uint8 LOD
     int32  sample (9 B) = int32 LeadI(µV) │ int32 LeadII(µV) │ uint8 LOD

   The stride is derived from the packet length, so every client
   accepts BOTH firmware generations (two-sided deploy tolerance —
   web CLAUDE.md §12). The 9-byte format exists because int16 µV
   clamps at ±32.767 mV and an ordinary electrode DC offset railed a
   lead into a silent flat line.
   ================================================================== */

/** GATT service the ESP32 advertises. */
export const ECG_SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
/** Notify characteristic carrying ECG packets. */
export const ECG_DATA_CHAR_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26a8';

/** Hardware sample rate (Hz) — matches ESP32 firmware. FROZEN. */
export const SAMPLE_RATE = 320;
/** Ring buffers hold 10 seconds of data on every platform. */
export const BUFFER_SECONDS = 10;
export const BUFFER_SIZE = SAMPLE_RATE * BUFFER_SECONDS;

/** The int16 clamp rail, in µV (legacy 5-byte samples saturate here). */
export const ADC_RAIL_UV = 32767;
/** Treat as railed within a hair of the rail (median filter can shave it). */
export const RAIL_MARGIN_UV = 8;
/** Sustained for this long ⇒ saturation, not a transient artefact. */
export const RAIL_SAMPLES_TO_LATCH = SAMPLE_RATE / 2;

/**
 * How long a gap in arriving samples means the stream is STALE, not just
 * jittery. Derived from the frozen cadence, not picked by feel: the firmware
 * notifies every 16 samples (50 ms at 320 Hz) and the native bridges flush to
 * JS at 10 Hz, so a healthy link delivers something at least every ~100 ms.
 * 600 ms is six missed flushes — far outside normal jitter, far inside the
 * time a person would keep believing a frozen trace.
 *
 * ⚠️ THE FAILURE THIS EXISTS FOR (root CLAUDE.md §3.2): when the phone locks
 * or the app backgrounds, iOS stops delivering CoreBluetooth notifications,
 * but the last waveform stays on screen. Without a watchdog that is a frozen
 * trace being presented as a live patient signal — the exact reading error a
 * monitor must never allow. Consumers treat stale as NOT streaming, so an
 * in-flight recording is discarded rather than completed against silence.
 */
export const STREAM_STALE_MS = 600;

/** One decoded ECG sample. Leads in MILLIVOLTS, LOD bits raw from hardware. */
export interface EcgSample {
  leadI: number;
  leadII: number;
  lod: number;
}

export interface ParsedEcgPacket {
  seq: number;
  /** 5 = legacy int16 firmware, 9 = current int32 firmware. */
  stride: 5 | 9;
  samples: EcgSample[];
  /**
   * Rail flags for THIS packet (legacy stride only): a lead whose raw µV sits
   * at the int16 clamp. Consumers latch it over RAIL_SAMPLES_TO_LATCH before
   * surfacing a saturation warning — never silently hide it.
   */
  railed: { I: boolean; II: boolean };
}

/**
 * Decode one BLE notification payload. Pure function — the ONLY packet
 * parser on any platform (native modules mirror it 1:1; keep them in sync).
 * Returns null on a malformed packet rather than throwing: BLE links glitch,
 * and a corrupt packet must never take the pipeline down.
 */
export function parseEcgPacket(bytes: Uint8Array): ParsedEcgPacket | null {
  if (bytes.length < 2) return null;
  const seq = bytes[0];
  const count = bytes[1];
  if (count === 0) return null;

  const payload = bytes.length - 2;
  if (payload % count !== 0) return null;
  const stride = payload / count;
  if (stride !== 5 && stride !== 9) return null;

  const view = new DataView(bytes.buffer, bytes.byteOffset + 2, payload);
  const samples: EcgSample[] = new Array(count);
  let railedI = false;
  let railedII = false;

  for (let i = 0; i < count; i++) {
    const off = i * stride;
    let uvI: number;
    let uvII: number;
    if (stride === 5) {
      uvI = view.getInt16(off, true);
      uvII = view.getInt16(off + 2, true);
      if (Math.abs(uvI) >= ADC_RAIL_UV - RAIL_MARGIN_UV) railedI = true;
      if (Math.abs(uvII) >= ADC_RAIL_UV - RAIL_MARGIN_UV) railedII = true;
    } else {
      uvI = view.getInt32(off, true);
      uvII = view.getInt32(off + 4, true);
    }
    samples[i] = {
      leadI: uvI / 1000, // µV → mV
      leadII: uvII / 1000,
      lod: view.getUint8(off + (stride === 5 ? 4 : 8)),
    };
  }

  return { seq, stride, samples, railed: { I: railedI, II: railedII } };
}

/** Sequence-gap check: how many packets were lost between two seq bytes. */
export function droppedBetween(prevSeq: number, seq: number): number {
  if (prevSeq < 0) return 0; // first packet ever
  return (seq - prevSeq - 1 + 256) % 256;
}

// v1.1.0 — Adds STREAM_STALE_MS: the gap after which a live trace must stop
//          being called live (root CLAUDE.md §3.2). Wire contract unchanged.
