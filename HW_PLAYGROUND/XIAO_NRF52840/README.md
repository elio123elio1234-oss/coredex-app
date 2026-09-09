# XIAO_NRF52840 — ADS1293 playground on a Seeed XIAO nRF52840

A **self-contained** port of `../firmware_playground` from the ESP32 to the
Seeed XIAO nRF52840, plus its own Web Bluetooth GUI.

> **Nothing outside this folder was modified.** `firmware_current/`,
> `firmware_playground/`, `gui/`, `docs/`, `flashing/` and the HW_PLAYGROUND
> `CHANGELOG.md` are all byte-identical to what they were before this project
> existed — verified with `git status`. The ESP build still builds and still
> flashes. This directory has its own changelog and its own version footers so
> that stays true.

| | |
|---|---|
| **Wiring** | [WIRING.md](WIRING.md) — pad names exactly as silkscreened |
| **Build & flash** | [FLASHING.md](FLASHING.md) |
| **Firmware** | [platformio.ini](platformio.ini) · [include/](include/) · [src/](src/) |
| **GUI** | [gui/index.html](gui/index.html) — Chrome/Edge, Web Bluetooth |
| **History** | [CHANGELOG.md](CHANGELOG.md) |

---

## What it does

ADS1293 at 1280 Hz × 3 channels → median-5 → averaging decimation ÷4 → **320 Hz**,
streamed over BLE. The DSP maths is copied unchanged from the ESP build, which
copied it from production — same coefficients, same constants, so numbers from
the two boards are directly comparable.

**Default electrode plan (preset 0): two copies of Lead II + one Lead I, with a
dedicated RLD electrode.** Five electrodes on the body, `IN5` spare:

| ADS input | Electrode | Channel |
|---|---|---|
| `IN1` | RA (shared) | — |
| `IN2` | LA | CH3 = Lead I (`IN2−IN1`) |
| `IN3` | LL #1 | CH1 = Lead II #1 (`IN3−IN1`) |
| `IN4` | LL #2 | CH2 = Lead II #2 (`IN4−IN1`) |
| `IN5` | spare | — |
| `IN6` | RLD (right leg) | driven, not measured |

## Presets

⚠ **The preset IDs are renumbered relative to the ESP build.** Preset 0 is what
the user actually asked for; the ESP's A/B/C survive as 2/3/4.

| # | Plan | CH1 | CH2 | CH3 | RLD |
|---|---|---|---|---|---|
| **0** | **2×II + I, shared RA** *(default)* | II (`IN3−IN1`) | II (`IN4−IN1`) | **I** (`IN2−IN1`) | IN6 |
| 1 | 2×II + I, independent II pairs | II (`IN3−IN1`) | II (`IN5−IN4`) | **I** (`IN2−IN1`) | IN6 |
| 2 | 3×II, shared RA (= ESP preset A) | II | II | II | IN6 |
| 3 | 3×II, independent (= ESP preset B) | II | II | II | off |
| 4 | production baseline (= ESP preset C) | **I** | II | off | IN3 |

Because the IDs differ, this build **must not** be driven by the ESP playground
GUI — it would mislabel every channel without erroring. That is prevented
structurally: different device name (`CYPHIX-XIAO`) and different service UUIDs,
so the two boards can advertise side by side and cannot be cross-connected.

### The combine rule that matters

In presets 0 and 1, **CH3 carries Lead I**. Averaging it into a "combined Lead II"
estimate would be meaningless, so the GUI's combine step is restricted to the
channels that actually measure the same lead (`COMBINE_CH` in the GUI, and the
`comb` term in the serial CSV). The ESP GUI averaged all three unconditionally —
correct there, wrong here. This is the single most important behavioural
difference between the two GUIs.

## Port notes (ESP32 → nRF52840)

| Concern | ESP32 | XIAO nRF52840 |
|---|---|---|
| BLE stack | `BLEDevice` + explicit `BLE2902` | Adafruit Bluefruit (CCCD implicit), MTU 247 via `configPrphBandwidth(BANDWIDTH_MAX)` |
| 128-bit UUIDs | strings | `uint8_t[16]` **least-significant byte first** — the reversed string |
| Command hand-off | FreeRTOS queue | plain SPSC ring, no RTOS API dependency |
| DRDY | ISR → `vTaskNotifyGive`, `IRAM_ATTR` | ISR → `volatile` counter polled by `loop()`; being behind is counted and reported, not hidden |
| SPI pins | `SPI.begin(sck,miso,mosi,ss)` | fixed by the variant (pads 8/9/10); clock set explicitly to 2 MHz via `SPISettings` |
| `Serial.printf` | ESP-specific | `vsnprintf` helper, and only writes while a terminal has the port open |
| Register map | `#define CONFIG 0x00` | **`enum`** — see below |

**The `CONFIG` collision.** The nRF5 SDK's `nrf_spim.h` contains
`p_reg->CONFIG = config;`, referring to a hardware register field. A
`#define CONFIG 0x00` rewrites that to `p_reg->0x00` and the entire core stops
compiling. The register map is therefore an `enum` here — identical spellings at
every call site, no textual substitution. This is a real build failure that was
hit and fixed, not a precaution.

## Health reporting

The packet's `flags` byte carries bit0 = ADS healthy, bit1 = samples missed since
the last packet, bit2 = the previous notify was rejected (BLE backpressure). The
GUI surfaces all three. A stalled pipeline or a saturated link should be visible,
not quietly baked into the trace.

## Status — running on hardware

Flashed and verified end to end (v0.1.1):

| Check | Result |
|---|---|
| `REVID` read from the live chip over BLE | **`0x01`** |
| Preset-0 registers on the running chip | all match intent (`0x19` / `0x21` / `0x11`, `RLD_CN=0x06`) |
| Output rate | **320.1 Hz** measured (target 320) |
| BLE stream | 26.6 packets/s · 160 B · 12 samples · **0 sequence gaps** |
| Advertising | `CYPHIX-XIAO`, RSSI −17, service UUID matches |
| Lead-off | `0b001111` = IN1..IN4, exactly the electrodes preset 0 enables |

The wiring in [WIRING.md](WIRING.md) is therefore confirmed by a working device.
Pad `3` carries DRDB correctly — interrupts arrive 1280×/s through it.

**Still untested: anything to do with signal quality.** No electrode has been on
a body, no ECG has been recorded, no noise floor measured, and the `VUSB` supply
question in WIRING.md §3 is still open. Every number above is about plumbing,
not about the ECG. Treat morphology, noise and the 2×Lead II averaging claim as
unverified until there is a real trace.

~1–5 packets in 160 report bit1 (a missed input sample), ≈0.05 % of the 1280 Hz
stream — almost certainly SoftDevice radio events preempting `loop()`. Visible
only because the firmware counts it; see the changelog.

<!-- v0.1.1 — hardware-verified status table (REVID 0x01, 320.1 Hz, 0 seq gaps); v0.1.0 — XIAO nRF52840 port: isolated project, preset 0 = 2×Lead II + Lead I + RLD, own BLE identity and GUI -->
