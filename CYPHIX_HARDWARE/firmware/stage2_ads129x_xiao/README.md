# stage2_ads129x_xiao — bench firmware for stage 2 of the risk plan

Seeed XIAO nRF52840 driving a TI **ADS1294 / ADS1296 / ADS1298** over SPI. The
chip is identified by its ID register, so the same binary runs on the TI
ADS1298ECG-FE board that is on the desk today and on the ADS1294 the product
will carry.

> **Status: compiles clean, has never run on hardware.** No ADS129x has been
> connected to this firmware. Everything below about behaviour is what the code
> is written to do; the list in [Unverified](#unverified-until-it-runs-on-the-hardware)
> says what only the bench can confirm.

## The two things it proves

1. **The chip and the channel plan.** The ADS129x family, wired for the
   product's four channels, delivers a signal from the electrodes:

   | Logical channel | Measures | Lead |
   |---|---|---|
   | CH1 | LA − RA1 | Lead I, copy 1 |
   | CH2 | LA − RA2 | Lead I, copy 2 |
   | CH3 | LL1 − LA | Lead III, copy 1 |
   | CH4 | LL2 − LA | Lead III, copy 2 |

2. **The existing apps show it, unchanged.** In COMPAT mode (the default) the
   board presents the production v3 Bluetooth identity and the production packet
   at exactly 320 Hz. No app, shared-package or server change is needed for
   this test.

## Wiring

Pad numbers are the XIAO silkscreen. They were checked against the board
variant files of the core this project builds with; the plain and the Sense
XIAO share the map.

| XIAO pad | nRF pin | Direction | ADS129x signal |
|---|---|---|---|
| 0 | P0.02 | out | `PWDN` (active low) |
| 1 | P0.03 | out | `RESET` (active low) |
| 2 | P0.28 | out | `START` |
| 3 | P0.29 | in | `DRDY` |
| 7 | P1.12 | out | `CS` |
| 8 | P1.13 | out | `SCLK` |
| 9 | P1.14 | in | `DOUT` |
| 10 | P1.15 | out | `DIN` |
| GND | | | digital ground |

Not driven by the XIAO, and the wiring guide must settle each one:

- **Supply rails** of the ADS board, and where each comes from.
- **`DVDD` must be 3.0–3.3 V.** The XIAO's outputs are 3.3 V; into a 1.8 V
  `DVDD` they exceed the chip's absolute maximum.
- **`CLKSEL`**: high for the internal 2.048 MHz oscillator, or the board's own
  clock. The firmware does not care which, but the time base is that clock.
- **`GPIO1..4`** stay inputs (reset default). If they float on the board they
  should be tied to ground through a resistor.

While electrodes are on a person the setup runs from a battery, and a laptop
used for the serial port is unplugged from its charger — the same rule as the
existing prototype.

## The channel table

`include/config.h` -> `CHANNEL_MAP`. One row per logical channel: which ADS
channel carries it, and the polarity. `BENCH_BOARD_TI_EVM` picks the table.

**TI ADS1298ECG-FE with the one-wire patch (the default, `BENCH_BOARD_TI_EVM 1`).**
The patch is in `experiments/E2_ti_board_bench.md`: JP16 off, the shunts off
JP26 / JP31 / JP32 / JP33, one wire from JP32 pin 3 to JP33 pin 1. The shared bus
on the N inputs of channels 4 to 7 then carries LA.

| Logical channel | Electrodes | Electrode on J1 pin | ADS channel | Sign |
|---|---|---|---|---|
| CH1 | LA - RA1 | RA1 on 3 | 6 | -1 |
| CH2 | LA - RA2 | RA2 on 4 | 7 | -1 |
| CH3 | LL1 - LA | LL1 on 1 | 4 | +1 |
| CH4 | LL2 - LA | LL2 on 2 | 5 | +1 |

LA goes to J1 pin 10 and RLD to J1 pin 14. This mapping was derived from the
schematic in TI's board guide (SBAU171D); it has not been confirmed on a board.
With this table the frame read is 24 bytes (48 us of the 125 us period at 4 MHz).
The same switch turns the chip's four GPIO pins into outputs driving low, because
this board leaves them floating.

**Our own board (`BENCH_BOARD_TI_EVM 0`).** Channels 1 to 4, all `+1`.

Sign `+1` means the first electrode is on `INxP` and the second on `INxN`;
`-1` means the board has them the other way round. The firmware derives from
this table: which channels are powered, the right-leg-drive inputs, the
lead-off inputs, how many bytes are read per conversion and which lead-off bit
belongs to which electrode. The `i` key prints the result.

## What the firmware does

**Sampling.** The chip runs at 8 kSPS in high-resolution mode. Every `DRDY`
falling edge raises an interrupt that reads one frame over SPI. The radio never
times a sample. Every edge is also counted by a hardware timer, so a late
interrupt costs one of the 25 conversions that make an output sample, never a
slice of time.

**Registers written** (all read back and compared; a mismatch stops the stream
and prints a dump):

| Register | Value | Meaning |
|---|---|---|
| `CONFIG3` | `0xCC` | internal 2.4 V reference on, RLD buffer on, RLD reference = mid-supply, internal |
| `CONFIG1` | `0x82` / `0x86` | high-resolution mode, 8 kSPS (compat) / 500 SPS (native) |
| `CONFIG2` | `0x00` / `0x10` | test signal off / internal test signal (`t` key) |
| `LOFF` | `0x03` | DC lead-off, current source, 6 nA, comparators at 95 % / 5 % |
| `CHnSET`, used | `0x00` / `0x05` | powered, gain 6, electrode input / test signal |
| `CHnSET`, unused | `0x81` | powered down, inputs shorted |
| `RLD_SENSP`, `RLD_SENSN` | used channels | right-leg drive derived from both inputs of every used channel |
| `LOFF_SENSP`, `LOFF_SENSN` | used channels | lead-off sensing on both inputs of every used channel |
| `LOFF_FLIP` | `0x00` | no flip (`ADS_LOFF_FLIP_MASK`) |
| `CONFIG4` | `0x02` | lead-off comparators on, continuous conversion |

`GPIO`, `PACE`, `RESP`, `WCT1`, `WCT2` are left at their reset values and shown
in the dump.

**COMPAT output (default).** 25 conversions are averaged into one sample:
8000 / 25 = 320 Hz. In microvolts, as the production firmware sends them:

| Production field | Built from |
|---|---|
| Lead I | (CH1 + CH2) / 2 |
| Lead II copy A | CH1 + CH3 = LL1 − RA1 |
| Lead II copy B | CH2 + CH4 = LL2 − RA2 |
| LOD bit RA | RA1 off **or** RA2 off (`COMPAT_RA_OFF_IF_ANY`) |
| LOD bits LA, LL, LL2 | LA, LL1, LL2 off |
| flag ADS OK | the chip was identified and configured |
| flag samples missed | a sample was built from fewer than 13 of its 25 conversions, or was lost |
| flag RLD fault | every sensed input on one side reads "off" for 0.5 s (see Unverified) |

Bluetooth identity: name `BeatAlign ECG`, service `4fafc201-…`, the legacy
characteristic `beb5483e-…` (16 × 9 B) and the 3-channel characteristic
`beb5483f-…` (12 × 13 B), both notify + read, as in
`HW_PLAYGROUND/firmware_production_v3` and `CYPHIX_SHARED/src/ble/protocol.ts`.
**Switch the ESP32 prototype off while testing**: two devices with this name
cannot be told apart in a picker.

The averaging is a 25-point moving average: nulls at every multiple of 320 Hz,
3 dB down near 142 Hz. Between 160 and 320 Hz it only attenuates 4 to 30 dB, so
that band aliases. The production chain has the same weakness; this is a
like-for-like substitute for the bench, not the product's filter.

## Build

```powershell
cd C:\Users\elio1\Desktop\Coredex_App\CYPHIX_HARDWARE\firmware\stage2_ads129x_xiao
C:\Users\elio1\.platformio\penv\Scripts\pio.exe run
```

Built on 2026-11-14 with zero warnings on this project's sources
(`-Wall -Wextra -Wno-unused-parameter`; the last flag is there because the
SoftDevice's own headers trip it): RAM 17,344 B (7.3 %), flash 135,512 B
(16.7 %).

`platformio.ini` targets the XIAO nRF52840 **Sense** (USB PID `0x8045`). For
the plain XIAO (`0x8044`) change the board line to `xiaoble_adafruit`.

## Flash

The procedure is the one `HW_PLAYGROUND/XIAO_NRF52840/FLASHING.md` proved.

1. Find the board by USB ID, never by a remembered COM number:

   ```powershell
   Get-CimInstance Win32_PnPEntity | Where-Object { $_.Name -match 'COM\d+' } | Select-Object Name, DeviceID | Format-List
   ```

   Only a port whose DeviceID starts `USB\VID_2886` is the XIAO.

2. Upload to that port (replace `COM7` with the one from step 1):

   ```powershell
   C:\Users\elio1\.platformio\penv\Scripts\pio.exe run -t upload --upload-port COM7
   ```

   If the board does not re-enumerate, double-tap its RESET button and run the
   command again.

3. Open the serial port (the number usually changes after a flash; check step 1
   again):

   ```powershell
   C:\Users\elio1\.platformio\penv\Scripts\pio.exe device monitor -p COM10 -b 115200
   ```

## First power-up: what to expect

With the ADS board wired and powered, a terminal attached within two seconds of
boot shows:

```
=== CYPHIX stage-2 bench: ADS129x + XIAO nRF52840 v0.1.0 ===
pads: PWDN=0 RESET=1 START=2 DRDY=3 CS=7 SCLK=8 DOUT=9 DIN=10
[BLE] advertising as "BeatAlign ECG" (production v3 identity)
[ADS] power-up and reset (1000 ms)...
[ADS] ID = 0x92 -> ADS1298, 8 channels
[ADS] streaming: 8000 SPS, 15-byte frames (30 us of the 125 us period), 1 output per 25 conversions
```

and then a status line every five seconds:

```
# ADS1298 compat: 8001.2 SPS -> 320.04 Hz out | missed=0 overrun=0 badsync=0 ring_ovf=0 rail=0/0/0/0 | lod=0x0F rld=1 | BLE adv nf=0
```

Expected IDs: `0x90` ADS1294, `0x91` ADS1296, `0x92` ADS1298 (`0xD0`–`0xD2` for
the R variants). `0x00` or `0xFF` means the chip is not answering. If the chip
is not found, the firmware retries every three seconds, so a jumper pushed back
in does not need a reset.

**Before any electrode**, press `t`. Every used channel then carries the chip's
internal 1 mV, ~1 Hz square wave, and the app shows it. That one step checks
SPI, scaling, the 320 Hz stream, Bluetooth and the app with nothing on a
person. A square wave recorded this way is a test pattern; do not keep it as a
recording. Press `t` again for the electrodes.

## Serial keys (USB, 115200)

| Key | Does |
|---|---|
| `r` | raw CSV on: `count, ch1..ch4 (µV), LOFF_STATP, LOFF_STATN, conversions averaged` |
| `s` | CSV off |
| `i` | info: device ID, every register read back, the channel table, electrode → input map, stream statistics, Bluetooth state. Restarts the stream (a few milliseconds, and up to 37 ms of samples dropped): not for use during a recording |
| `n` | native test: 500 SPS straight from the chip over serial. The Bluetooth stream stops while it runs |
| `c` | back to COMPAT (320 Hz, Bluetooth stream on) |
| `t` | internal test signal on / off |
| `h` | help |

Lines starting with `#` are for a person; tools reading the CSV skip them.

## If the status line shows trouble

| Counter | Means | Try |
|---|---|---|
| `badsync` rising | frames do not start with the `1100` marker | `DOUT` wiring; `ADS_STREAM_SPI_HZ 2000000`; `ADS_READ_FULL_FRAME 1` |
| `overrun` rising | the frame read is not finished before the next conversion | `ADS_STREAM_SPI_HZ 8000000` |
| `missed` rising slowly | the interrupt was late now and then | nothing: the averages simply use 24 of 25 conversions |
| `rail` rising | a channel is clipped at the ADC limit | an electrode is off, or its DC offset exceeds ±400 mV |
| `ring_ovf` rising | `loop()` stalled for more than 0.4 s | usually a blocked serial terminal |
| rate far from 8000 | the chip's clock is off | `CLKSEL` and the clock source on the board |

## Unverified until it runs on the hardware

1. **Everything.** The firmware has been compiled, not run. No register value,
   timing or signal below has been seen on a chip.
2. **Shortened frame reads.** By default the read stops after the highest
   channel in the table (15 bytes instead of 27 on an ADS1298). The datasheet
   says the interface resets when `CS` rises and documents unread conversions,
   but does not spell out a shortened read. `ADS_READ_FULL_FRAME 1` is the
   fallback.
3. **Reading frames inside the interrupt** with a receive-only SPIM transfer
   and the over-read byte set to `0x00`. The pieces are documented; the
   combination has not been timed on this board.
4. **The hardware edge counter** (GPIOTE event → PPI → TIMER4 through the
   SoftDevice's PPI call). If it cannot be set up the firmware says so at boot
   and counts in the interrupt instead, where the output rate can slip.
5. **Interrupt load.** 8000 interrupts a second of roughly 40–65 µs each next
   to the Bluetooth stack. How many conversions are missed is what `missed` and
   `overrun` will tell.
6. **Bit-banged command timing** (about 250 kHz, mode 1) against a real chip.
7. **Lead-off thresholds with dry electrodes.** 6 nA and 95 % / 5 % are the
   gentlest settings; whether a dry pad on skin reads "on" is unknown.
8. **LA lead-off is ambiguous by construction.** LA feeds two `P` inputs (pulled
   up) and two `N` inputs (pulled down), so with LA lifted those currents
   cancel and the node drifts instead of being driven to a rail. The bit may be
   late or wrong. `ADS_LOFF_FLIP_MASK` can make it one-sided, at the cost of
   24 nA through the LA contact.
9. **The RLD-fault flag is a heuristic.** The ADS129x has no live "RLD rail"
   bit like the ADS1293; its own RLD check works only with the RLD amplifier
   off. The firmware reports a fault when every sensed input on one side reads
   "off" for 0.5 s — the pattern an unreferenced body should produce. Whether
   it does is a bench question.
10. **The time base is the chip's clock.** With the internal oscillator the
    datasheet gives ±0.5 % at 25 °C and ±2 % over 0–70 °C, so "320 Hz" can be
    318–322 Hz at room temperature. The status line prints the rate measured
    against the XIAO's crystal. The ESP32 prototype has a crystal and does not
    have this error.
11. **On-air compatibility.** The packets match the production firmware and the
    shared parser by reading the code. No app has connected to this board yet.
12. **The channel table for the TI board** (derived from TI's schematic, not
    yet seen working), and the board's supplies, `DVDD` level and clock source.
13. **Scaling.** `µV = counts × 2.4 V / (6 × (2²³ − 1))` is the datasheet's
    formula; the `t` test signal is the first chance to see a known amplitude.

<!-- v0.1.0 — first version: what it proves, wiring, the channel table to fill in, build/flash, serial keys, and the list of what only hardware can confirm -->
