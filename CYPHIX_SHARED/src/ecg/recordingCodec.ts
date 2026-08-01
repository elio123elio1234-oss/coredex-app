/* ==================================================================
   recordingCodec — Float32Array ⇄ base64, for persisting waveforms.

   Every store we have keeps strings: the browser's localStorage, React
   Native's AsyncStorage, a JSON column. So the samples have to survive a
   round trip through one. `JSON.stringify` of a 3 200-element number array
   is both enormous (~8 bytes/sample of text) and lossy at the edges of
   float printing; base64 of the raw buffer is exact and 5.33 bytes per
   sample.

   ══ WHY THE ALPHABET IS SPELLED OUT HERE ══
   The web copy of this file calls `btoa` / `atob`. Those are DOM globals.
   Hermes has shipped them since RN 0.74, but this package is required to
   run in plain Node with no polyfills (root CLAUDE.md §2.1), and a codec
   that silently depends on a host global is exactly the kind of thing that
   works in Expo Go and throws in a release build. The implementation below
   is ~15 lines of arithmetic and depends on nothing.

   Endianness: `Float32Array` uses the platform's byte order, which is
   little-endian on every target that exists in practice (x86, ARM). We do
   NOT normalise it here — but the exported CSV/EDF path must, and that is
   why the byte order is stated rather than assumed silently.
   ================================================================== */

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Reverse lookup, built once. `-1` marks a character that is not base64. */
const B64_INDEX: number[] = (() => {
  const table = new Array<number>(128).fill(-1);
  for (let i = 0; i < B64.length; i++) table[B64.charCodeAt(i)] = i;
  return table;
})();

function bytesToBase64(bytes: Uint8Array): string {
  let out = '';
  let i = 0;
  for (; i + 2 < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + B64[(n >> 6) & 63] + B64[n & 63];
  }
  // Tail: 1 or 2 bytes left over, padded to a 4-character group with '='.
  const rest = bytes.length - i;
  if (rest === 1) {
    const n = bytes[i] << 16;
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + '==';
  } else if (rest === 2) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8);
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + B64[(n >> 6) & 63] + '=';
  }
  return out;
}

function base64ToBytes(encoded: string): Uint8Array {
  // Strip padding and anything that is not in the alphabet (stray newlines
  // from a hand-edited store are the realistic case).
  let clean = '';
  for (let i = 0; i < encoded.length; i++) {
    const code = encoded.charCodeAt(i);
    if (code < 128 && B64_INDEX[code] >= 0) clean += encoded[i];
  }
  const groups = Math.floor(clean.length / 4);
  const rest = clean.length - groups * 4;
  const out = new Uint8Array(groups * 3 + (rest === 3 ? 2 : rest === 2 ? 1 : 0));

  let o = 0;
  let i = 0;
  for (let g = 0; g < groups; g++, i += 4) {
    const n =
      (B64_INDEX[clean.charCodeAt(i)] << 18) |
      (B64_INDEX[clean.charCodeAt(i + 1)] << 12) |
      (B64_INDEX[clean.charCodeAt(i + 2)] << 6) |
      B64_INDEX[clean.charCodeAt(i + 3)];
    out[o++] = (n >> 16) & 255;
    out[o++] = (n >> 8) & 255;
    out[o++] = n & 255;
  }
  if (rest === 2) {
    const n = (B64_INDEX[clean.charCodeAt(i)] << 18) | (B64_INDEX[clean.charCodeAt(i + 1)] << 12);
    out[o++] = (n >> 16) & 255;
  } else if (rest === 3) {
    const n =
      (B64_INDEX[clean.charCodeAt(i)] << 18) |
      (B64_INDEX[clean.charCodeAt(i + 1)] << 12) |
      (B64_INDEX[clean.charCodeAt(i + 2)] << 6);
    out[o++] = (n >> 16) & 255;
    out[o++] = (n >> 8) & 255;
  }
  return out;
}

/** Encode samples (mV) as base64. */
export function encodeChannel(samples: Float32Array): string {
  return bytesToBase64(new Uint8Array(samples.buffer, samples.byteOffset, samples.byteLength));
}

/** Decode base64 back into samples (mV). */
export function decodeChannel(encoded: string): Float32Array {
  const bytes = base64ToBytes(encoded);
  // Copy into a fresh buffer: the decoded array's buffer is only 4-byte
  // aligned by luck, and Float32Array demands alignment. Truncate to a
  // whole number of floats so a corrupted tail cannot throw.
  const usable = bytes.byteLength - (bytes.byteLength % 4);
  return new Float32Array(bytes.buffer.slice(0, usable));
}

/** Rough byte cost of a recording's payload — used for a storage budget. */
export function encodedSizeBytes(...encoded: string[]): number {
  return encoded.reduce((sum, e) => sum + e.length, 0);
}

// v1.0.0 — Dependency-free base64 codec for Float32 waveform channels
//          (no btoa/atob, so it runs in Node, Hermes and the browser alike).
