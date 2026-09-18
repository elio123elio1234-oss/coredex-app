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

   ══ DUAL LEAD II (firmware v3+) — A SECOND CHARACTERISTIC ══
   Firmware v3 measures Lead II TWICE (a second left-leg electrode on
   ADS1293 IN4) and drives RLD through a dedicated electrode (IN6). The
   extra copy does NOT ride on the packet above. It has its own notify
   characteristic, ECG_DATA3_CHAR_UUID:
     ┌────────┬──────────┬──────────┬────────┬───────────────────────┐
     │ seq:u8 │ count:u8 │ flags:u8 │ rsv:u8 │ count × sample (13 B) │
     └────────┴──────────┴──────────┴────────┴───────────────────────┘
     sample (13 B) = int32 LeadI │ int32 LeadII-a │ int32 LeadII-b │ uint8 LOD
   12 samples per packet = 160 B (the size the HW_PLAYGROUND builds proved
   loss-free at MTU 185), one notification every 37.5 ms.

   Why a new characteristic and not a third stride: the legacy one stays
   BYTE-IDENTICAL, so every app build ever shipped keeps working against v3
   firmware, and a new app falls back to the legacy characteristic on older
   firmware. A 13-byte stride on the old characteristic would have been read
   as 9-byte samples by the web client of the day — a shredded trace with no
   error — which is the exact failure the two-sided rule exists to prevent.
   A client subscribes to ONE of the two, never both.
   ================================================================== */

/** GATT service the ESP32 advertises. */
export const ECG_SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
/** Notify characteristic carrying ECG packets. */
export const ECG_DATA_CHAR_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26a8';
/**
 * Notify characteristic carrying the 3-channel stream (Lead I, Lead II-a,
 * Lead II-b). Present on firmware v3+ only — absence means "legacy device",
 * not an error.
 */
export const ECG_DATA3_CHAR_UUID = 'beb5483f-36e1-4688-b7f5-ea07361b26a8';

/** Bytes before the first sample in a 3-channel packet. */
export const ECG3_HEADER_BYTES = 4;
/** int32 × 3 + LOD. */
export const ECG3_SAMPLE_BYTES = 13;

/** `flags` byte of a 3-channel packet. Unlisted bits are reserved (0). */
export const ECG3_FLAG_ADS_OK = 0x01;
/** The MCU fell behind the ADC since the previous packet — samples were lost
    BEFORE the radio, so `seq` cannot show it. */
export const ECG3_FLAG_SAMPLES_MISSED = 0x02;
/** The right-leg drive is out of range: the RLD electrode is most likely
    off. Every channel is unreferenced while this is set. */
export const ECG3_FLAG_RLD_FAULT = 0x08;

/** LOD byte, one bit per measuring electrode (ADS1293 ERROR_LOD, IN1..IN4).
    Bits 0–2 mean the same thing on the legacy characteristic. */
export const LOD_RA = 0x01;
export const LOD_LA = 0x02;
export const LOD_LL = 0x04;
/** The second left-leg electrode — only ever set on the 3-channel stream. */
export const LOD_LL2 = 0x08;

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
 * notifies every 16 samples (50 ms at 320 Hz; every 12 samples = 37.5 ms on the
 * 3-channel characteristic) and the native bridges flush to JS at 10 Hz, so a
 * healthy link delivers something at least every ~100 ms either way.
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

/** One decoded sample of the 3-channel stream. `leadII` IS Lead II-a — the
    same electrode pair the legacy stream calls Lead II, so everything that
    draws or gates on `leadII` behaves identically on either stream. */
export interface EcgSample3 extends EcgSample {
  /** The redundant Lead II copy (second left-leg electrode), in mV. */
  leadIIb: number;
}

export interface ParsedEcgPacket3 {
  seq: number;
  stride: 13;
  /** Raw flags byte — test with the ECG3_FLAG_* masks. */
  flags: number;
  samples: EcgSample3[];
}

/**
 * Decode one notification from ECG_DATA3_CHAR_UUID. Deliberately STRICT where
 * `parseEcgPacket` infers: the length must be exactly header + count × 13, or
 * the packet is dropped. A parser that guesses a stride is how a format change
 * turns into a plausible-looking wrong trace.
 */
export function parseEcgPacket3(bytes: Uint8Array): ParsedEcgPacket3 | null {
  if (bytes.length < ECG3_HEADER_BYTES) return null;
  const seq = bytes[0];
  const count = bytes[1];
  if (count === 0) return null;
  if (bytes.length !== ECG3_HEADER_BYTES + count * ECG3_SAMPLE_BYTES) return null;

  const view = new DataView(bytes.buffer, bytes.byteOffset + ECG3_HEADER_BYTES, count * ECG3_SAMPLE_BYTES);
  const samples: EcgSample3[] = new Array(count);
  for (let i = 0; i < count; i++) {
    const off = i * ECG3_SAMPLE_BYTES;
    samples[i] = {
      leadI: view.getInt32(off, true) / 1000, // µV → mV
      leadII: view.getInt32(off + 4, true) / 1000,
      leadIIb: view.getInt32(off + 8, true) / 1000,
      lod: view.getUint8(off + 12),
    };
  }
  return { seq, stride: 13, flags: bytes[2], samples };
}

/** Sequence-gap check: how many packets were lost between two seq bytes. */
export function droppedBetween(prevSeq: number, seq: number): number {
  if (prevSeq < 0) return 0; // first packet ever
  return (seq - prevSeq - 1 + 256) % 256;
}

// v1.2.0 — Dual Lead II: ECG_DATA3_CHAR_UUID + parseEcgPacket3 (13-byte samples
//          on a SECOND characteristic; the legacy characteristic and its parser
//          are untouched), packet flags, LOD_* electrode bits.
// v1.1.0 — Adds STREAM_STALE_MS: the gap after which a live trace must stop
//          being called live (root CLAUDE.md §3.2). Wire contract unchanged.
