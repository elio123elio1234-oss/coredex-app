# CHANGELOG — XIAO_NRF52840

This project keeps its own changelog on purpose. The instruction was that the
existing HW_PLAYGROUND code must not be touched, and `../CHANGELOG.md` is
existing code — appending to it would have broken that. The ESP playground's
history stays exactly where it was.

---

## v0.1.0 — 2026-09-09 — the playground runs on an nRF52840, and Lead I stops polluting Lead II

Replaces the ESP32 with a Seeed XIAO nRF52840 as the playground MCU, in a new
self-contained folder. `git status` confirms not one existing file changed.

**Why a new folder rather than a second env in `firmware_playground`:** the two
builds diverge in more than pins. Different BLE stack, different preset
numbering, different combine rule, and a register map that has to be an enum on
nRF52 but was fine as `#define` on ESP32. Sharing a tree would have meant
`#ifdef`-ing all of that into the working ESP firmware, which is the opposite of
leaving it alone.

### The electrode plan changed, and that changed the maths

The ESP playground was built around **three** copies of Lead II. The actual
requirement is **two copies of Lead II, one Lead I, and a dedicated RLD
electrode** — "plan C" in `../docs/ADS1293_RESEARCH.md` §5. That is now preset 0
and the default.

This has a consequence that is easy to miss and would have quietly ruined the
data: **CH3 now carries Lead I, and Lead I must never be averaged into a Lead II
estimate.** The ESP GUI averages all three channels unconditionally — correct
when all three are Lead II, nonsense here. Both the firmware's serial `combined`
column and the GUI's combine step are now restricted to the channels measuring
the same lead (`COMBINE_CH`). Presets 2/3 still average all three; preset 4 still
passes CH2 through. A headless test asserts each case, including that a huge
value on CH3 cannot move the preset-0 result.

### Preset IDs are renumbered — and that is why the BLE identity changed

Preset 0/1 are the new 2×II+I plans; the ESP's A/B/C became 2/3/4. A GUI and a
firmware that disagree about preset numbering would mislabel every channel
without erroring. So this build advertises as **`CYPHIX-XIAO`** on its own
service UUIDs (`cf9a1293-01xx-…`), and ships its own GUI. The two research
boards can now advertise simultaneously and are structurally impossible to
cross-connect. This extends the rule the ESP build already set for itself:
its identity was deliberately separated from production for the same reason.

### The port

- **BLE:** `BLEDevice`/`BLE2902` → Adafruit Bluefruit. CCCDs are implicit;
  MTU 247 via `configPrphBandwidth(BANDWIDTH_MAX)` before `begin()`; 128-bit
  UUIDs as least-significant-byte-first arrays. The 160 B packet format is
  byte-identical to the ESP build so recorded CSVs stay comparable.
- **Threading:** the FreeRTOS queue became a plain SPSC ring, and the DRDY task
  notification became a `volatile` counter polled by `loop()`. No RTOS API
  dependency at all now. Falling behind is **counted and reported** through the
  packet flags rather than silently producing a gap-free-looking trace.
- **SPI:** `SPI.begin(sck,miso,mosi,ss)` does not exist on nRF52 — the pins are
  fixed by the variant (pads 8/9/10). The clock is now pinned explicitly to
  2 MHz with `SPISettings`; the ESP build used `SPI_CLOCK_DIV2`, whose actual
  frequency did not match its own comment.
- **Logging:** `Serial.printf` → a `vsnprintf` helper that writes only while a
  USB terminal has the port open, so an unattended board never stalls on CDC.

### Two things the build found that reading could not

- **`#define CONFIG 0x00` breaks the nRF5 SDK.** `nrf_spim.h` contains
  `p_reg->CONFIG = config;`; the macro rewrote it to `p_reg->0x00` and the core
  refused to compile. The whole ADS1293 register map is now an `enum` — same
  spellings everywhere, no textual substitution. This was an actual failed
  build, fixed and rebuilt clean.
- **PlatformIO has no XIAO nRF52840 board.** `nordicnrf52@11.0.0` does not ship
  one and `pio boards xiao` returns only the SAMD21 and ESP32 XIAOs, so
  `board = xiaoble` fails outright. The board defs live in maxgerhardt's
  platform fork, which `platformio.ini` now points at, with the reasoning
  written down beside it.

### Correction to an earlier claim in this session

`../flashing/FLASHING.md` says "COM7 is the prototype — never flash it". At the
time of writing, **COM7 enumerated as `USB\VID_2886&PID_8045` — the Seeed XIAO**
— with the ESP prototype not plugged in at all. Windows reassigns COM numbers per
device and per port; the number is not an identity. [FLASHING.md](FLASHING.md)
now identifies boards by USB VID/PID and lists the four VIDs in play. The old
file was left untouched, as instructed, so that stale warning is still sitting
in it — worth fixing there when the ESP project is next opened.

### Verified / not verified

Verified: builds `SUCCESS` (RAM 6.1%, flash 15.3%); the pin map in
[WIRING.md](WIRING.md) checked against `variants/Seeed_XIAO_nRF52840/variant.h`
and `variant.cpp` rather than against a wiki page; the GUI parses and its
combine/label logic passes a headless test; `git status` shows no existing file
modified.

Not verified — **no hardware has been touched.** No electrode attached, no
`REVID` read over real wires, no trace seen, no BLE connection made. Whether
`VUSB` actually carries 5 V on this board revision could not be confirmed from
Seeed's published documentation, which is why WIRING.md §3 opens with a
multimeter check instead of an assertion.

<!-- v0.1.0 — first XIAO nRF52840 build of the ADS1293 playground -->
