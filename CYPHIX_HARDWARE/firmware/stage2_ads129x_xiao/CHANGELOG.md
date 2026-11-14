# CHANGELOG — stage2_ads129x_xiao

## v0.1.0, addition on 2026-11-15

The channel table now defaults to TI's ADS1298ECG-FE with the one-wire patch
(`BENCH_BOARD_TI_EVM 1`): the four product channels sit on ADS channels 6, 7, 4
and 5, with the two RA channels sign-flipped, and the four GPIO pins are made
outputs because that board leaves them floating. Derived from TI's schematic;
not yet confirmed on a board. Rebuilt clean.

## v0.1.0 — 2026-11-14 — first version: the bench firmware for stage 2

**Why it exists.** Stage 2 of the Band α risk plan asks one question before any
board of ours is designed: does the ADS129x family, wired for the product's
four channels, give a signal from dry electrodes, and do the existing apps show
it? The TI ADS1298 board is already on the desk and the XIAO nRF52840 already
runs our Bluetooth code, so the only missing piece was firmware that joins the
two. This is it.

**Why COMPAT mode is the default.** The apps, the shared package and the DSP
are frozen at 320 Hz and at the production packet. Changing them to test new
hardware would put two unknowns on the bench at once. So the board pretends to
be the production prototype: same name, same service, same two
characteristics, same packets, exactly 320 Hz. The apps are not touched. The
new four-channel, 500 SPS format comes later, on its own characteristic, after
the hardware is proven — and only with approval, because it is a change to
three apps.

**Why 8 kSPS divided by 25.** 320 Hz is not a rate the ADS129x offers
(500 SPS, 1 kSPS, 2 kSPS … are). 8000 / 25 is the lowest of its rates that
lands on 320 exactly with a whole-number division.

**Why every `DRDY` edge is counted in hardware.** The production ESP32 firmware
once streamed "320 Hz" at 306–309 Hz: conversions that were overwritten before
anyone read them also vanished from its sample count, so every interval the
apps measured was 4 % short (`firmware_production_v3`, v3.0.1). Here a timer
counts the edges through PPI with no CPU involved, and 25 edges always make
one output sample. A late interrupt costs one of the 25 conversions in an
average, never time.

**Why commands are bit-banged.** The XIAO's SPI is the nRF52840's SPIM3, which
has a documented fault (anomaly 198): transmitted bytes can be corrupted. A
corrupted byte on `DIN` is an opcode the chip may obey. Conversion frames are
therefore read receive-only (nothing is transmitted from memory), and the few
bytes that must be transmitted — commands and register writes — are clocked
out by hand at about 250 kHz while the SPI peripheral is off.

**Added beyond the brief, and why.**
- `t`, the chip's internal test signal: a known 1 mV square wave checks SPI,
  scaling, the stream, Bluetooth and the app before an electrode is involved.
- `c`, back to COMPAT after the native test.
- Automatic retry every three seconds when the chip is not found, and a
  watchdog that restarts the stream when `DRDY` stops or the frames stop
  looking like frames. A bench session has loose wires.
- A measured data rate in the status line. The chip's internal oscillator is
  ±0.5 % at room temperature (±2 % over temperature), so the time base of this
  board is not as exact as the crystal-clocked prototype's. The number makes
  that visible instead of assumed.

**What is not in it.** No new Bluetooth characteristic, no change to any app,
no 500 SPS over the air, no power saving. The RLD-fault flag is a heuristic
(see the README). Nothing has run on hardware: built clean on 2026-11-14
(RAM 7.3 %, flash 16.7 %), not flashed.

<!-- v0.1.0 — first entry -->
