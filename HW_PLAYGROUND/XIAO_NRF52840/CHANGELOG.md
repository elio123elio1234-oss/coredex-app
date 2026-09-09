# CHANGELOG — XIAO_NRF52840

This project keeps its own changelog on purpose. The instruction was that the
existing HW_PLAYGROUND code must not be touched, and `../CHANGELOG.md` is
existing code — appending to it would have broken that. The ESP playground's
history stays exactly where it was.

---

## v0.1.2 — 2026-09-09 — the GUI opens from an icon, not a command

"How do I open the GUI" was asked twice, which means the answer was wrong both
times: it was a command block. Now it is `OPEN_GUI.bat` and a Desktop shortcut.
The launcher starts the local web server, opens Chrome on the page, and reuses
an already-running server rather than dying on a busy port. Both paths were run,
not just written.

**Why a server at all**, rather than double-clicking `gui/index.html`: Chrome
refuses Web Bluetooth on `file://` origins. The page would load and look
completely normal while Connect could never work — a failure with no error
message. The launcher exists so that trap cannot be stepped in.

Two launcher bugs that only running it could find:

- `set PY=…` and `%PY%` were inside the same parenthesised `if` block, where cmd
  expands variables at parse time and the value comes back empty. Moved out.
- `timeout /t` aborts with *"Input redirection is not supported"* whenever stdin
  is redirected. Replaced with `ping -n`.

### FLASHING.md corrections

- **The Sense note was backwards.** It told you to switch *to* the board that
  v0.1.1 had already made the default.
- **`--upload-port COMx` is now flagged in the open**, with a real port next to
  it. Pasting that placeholder verbatim is exactly what broke the previous
  upload — and because nothing got flashed, the board never advertised, so the
  symptom presented as "Bluetooth cannot find the device" rather than as a
  failed upload. A placeholder that reads like a value is a defect in a document
  meant to be followed literally.
- **The monitor step** now says the port is usually *not* the one you uploaded
  to, and that a missing startup banner is expected on an already-running board:
  CSV flowing at all already proves `REVID` read `0x01`, because the firmware
  refuses to sample otherwise.

---

## v0.1.1 — 2026-09-09 — it ran on real hardware, and the hardware found a bug

v0.1.0 shipped with an explicit "no hardware has been touched" caveat. That is
now obsolete: the board was flashed and the whole chain verified end to end.

### What the hardware actually says

- `REVID = 0x01`, **read back from the live ADS1293 over BLE.** Every preset-0
  register verified against intent on the running chip: `FLEX_CH1_CN = 0x19`
  (Lead II #1), `FLEX_CH2_CN = 0x21` (Lead II #2), `FLEX_CH3_CN = 0x11`
  (Lead I), `RLD_CN = 0x06` (RLD → IN6), `LOD_EN = 0x0F`, `CH_CNFG = 0x70`.
- **Output rate 320.1 Hz** measured over 5 s against a 320 Hz target — the
  1280 Hz → median-5 → ÷4 pipeline is intact on nRF52.
- **BLE: 26.6 packets/s, 160 B each, 12 samples each, zero sequence gaps** over
  repeated 6 s runs. `CYPHIX-XIAO` advertises at RSSI −17 with service UUID
  `cf9a1293-0101-…`, so the little-endian UUID byte order was right.
- `lod_raw = 0b001111` — lead-off on IN1..IN4 exactly, which is the four
  electrodes preset 0 enables, all correctly reported as detached.

So the wiring table in [WIRING.md](WIRING.md) is now confirmed by a working
device, not just by reading the variant files. In particular **pad 3 carries
DRDB fine** — DRDY interrupts arrive 1280 times a second through it.

### The bug the bench found

Every connection's first packet arrived with the backpressure flag (bit2) set,
and burnt a sequence number the receiver never saw. Cause: a central is
connected for a moment *before* it writes the CCCD, and `notify()` fails for the
whole of that window — so the firmware incremented `ble_seq`, failed to send,
and flagged congestion that did not exist. A GUI would have reported phantom
packet loss on every single connect.

Fixed by gating the notify on `pgData.notifyEnabled(conn)`, so a sequence number
is only ever consumed by a packet that is actually transmitted. Re-verified on
hardware across three connect/stream cycles: `first seq = 0` and no spurious
flag on any of them.

### One honest measurement, left as-is

Roughly 1–5 packets per 160 still carry bit1 ("samples missed since the last
packet") during plain streaming — on the order of 0.05 % of the 1280 Hz input.
This is almost certainly the SoftDevice preempting `loop()` during radio events;
at 1280 Hz there are only 780 µs between samples, and a BLE connection event can
exceed that. It is not being hidden: this is visible precisely because the port
was built to count and report it rather than emit a gap-free-looking trace. Left
alone for now — worth revisiting only if the noise measurements turn out to care.

### Also

`board` switched to `xiaoblesense_adafruit`. The unit reported USB PID `0x8045`
under its factory firmware, which is the Sense; the plain XIAO is `0x8044`. The
two variants' `D0..D10` and SPI pin maps were diffed and are identical, so this
changes no wiring — it just makes the board definition match the real hardware.

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

<!-- v0.1.2 — OPEN_GUI.bat launcher + FLASHING.md placeholder fixes; v0.1.1 — first hardware run: REVID 0x01, 320.1 Hz, notify gated on a real CCCD subscription; v0.1.0 — first XIAO nRF52840 build of the ADS1293 playground -->
