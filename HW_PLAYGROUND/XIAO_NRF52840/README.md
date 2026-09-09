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

## Status

Builds clean (`SUCCESS`, RAM 6.1%, flash 15.3%) against the actual XIAO variant;
the pin map in [WIRING.md](WIRING.md) is verified against
`variants/Seeed_XIAO_nRF52840/variant.{h,cpp}` rather than against documentation.
The GUI's combine/label logic is covered by a headless test.

**None of that means it works on hardware.** Per the root CLAUDE.md §6.4: it
typechecks and builds. Nothing here has been on a bench, no electrode has been
attached, `REVID` has never been read from a real chip over these wires. Treat
every claim about signal quality as untested until you have a trace.

<!-- v0.1.0 — XIAO nRF52840 port: isolated project, preset 0 = 2×Lead II + Lead I + RLD, own BLE identity and GUI -->
