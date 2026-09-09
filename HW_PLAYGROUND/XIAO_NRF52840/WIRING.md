# WIRING — CJMCU-1293 (ADS1293) ↔ Seeed XIAO nRF52840

Pad names below are **exactly what is printed on the two boards**. Nothing here
is an Arduino alias or a chip port number — if the label is not on your
silkscreen, it is not in this table.

- **XIAO pads:** `0 1 2 3 4 5 6 7 8 9 10 3V3 GND VUSB`
- **ADS module pads (header P3):** `+5V GND SCLK SDI SDO CSB WCT ALAB DRDB`

---

## 1. The table

| ADS1293 module pad | → | XIAO pad | What it is |
|---|---|---|---|
| `+5V`  | → | **`VUSB`** | supply into the module's on-board 3.3 V regulator (see §3) |
| `GND`  | → | **`GND`**  | common ground — **mandatory** |
| `SCLK` | → | **`8`**    | SPI clock |
| `SDI`  | → | **`10`**   | SPI data *into* the ADS (the XIAO's MOSI) |
| `SDO`  | → | **`9`**    | SPI data *out of* the ADS (the XIAO's MISO) |
| `CSB`  | → | **`7`**    | chip select, active low |
| `DRDB` | → | **`3`**    | data-ready, active low — interrupt input |
| `ALAB` | → | *nothing* | optional alarm line; leave it off |
| `WCT`  | → | *nothing* | Wilson central terminal; unused in every preset |

Nine wires on the module, **seven of them actually connected.**

Verified against `variants/Seeed_XIAO_nRF52840/variant.h` and `variant.cpp` in
the core this firmware actually compiles with — not against a wiki page:
pad `8` = `P1.13` (SCK), `9` = `P1.14` (MISO), `10` = `P1.15` (MOSI),
`7` = `P1.12`, `3` = `P0.29`.

> Side effect worth knowing: pads `6`/`7` are the hardware UART (`Serial1`
> TX/RX), so using pad `7` for `CSB` gives up `Serial1`. That costs nothing
> here — all logging goes over USB CDC.

> ⚠ `SDI` goes to pad **10**, and `SDO` goes to pad **9** — not the other way
> round. These are named from the *ADS module's* point of view: its "data in"
> is the XIAO's data out. Swapping them is the single most common reason
> `REVID` reads back `0x00` or `0xFF` instead of `0x01`.

---

## 2. Where the pads physically are

Hold the XIAO with the **USB-C connector pointing up**, component side toward
you. The right-hand column top-to-bottom is `VUSB GND 3V3 10 9 8 7`, and the
left-hand column top-to-bottom is `0 1 2 3 4 5 6`:

```
                ┌───[ USB-C ]───┐
                │ 0         VUSB│ ──→ ADS +5V
                │ 1          GND│ ──→ ADS GND
                │ 2         3V3 │      (alternative supply — §3)
   ADS DRDB ←── │ 3          10 │ ──→ ADS SDI
                │ 4           9 │ ──→ ADS SDO
                │ 5           8 │ ──→ ADS SCLK
                │ 6           7 │ ──→ ADS CSB
                └───────────────┘
                    XIAO nRF52840
```

Pads `0 1 2 4 5 6` stay empty.

Six of the seven wires land on the **right edge in header order**, so the
module's P3 header ribbon runs almost straight across. Only `DRDB` crosses to
the left side, to pad `3`.

---

## 3. Power — read this before plugging in

The module's `+5V` pad is **not** a 5 V rail for the chip. It is the *input* of
the MIC5219-3.3 LDO sitting on the CJMCU board, which produces the 3.3 V that
actually feeds the ADS1293. So:

- **The ADS1293's supply and all its SPI lines are 3.3 V.** The nRF52840 is a
  3.3 V part. **No level shifting, no series resistors — connect directly.**
- Feeding `VUSB` (≈5 V from USB) into `+5V` gives that LDO ~1.7 V of headroom,
  so it genuinely *regulates* — it rejects the ripple the nRF52840 puts on its
  own rail every time the BLE radio transmits. For a front end resolving
  microvolts, that isolation is worth having. **This is the recommended wiring.**

**Verify before you trust it:** with USB plugged into the XIAO and nothing else
connected, put a multimeter between `VUSB` and `GND`. You want ≈5 V.

- **Reads ≈5 V** → use the table above, done.
- **Reads 0 V** → wire `3V3` → `+5V` instead. It works (the LDO passes ~3.25 V
  straight through, comfortably inside the ADS1293's supply range), but it is
  in dropout, so it provides no regulation and the analog rail now shares every
  disturbance on the XIAO's 3.3 V rail. Fine for bring-up; revisit it if you
  see radio-correlated noise on the trace.

I could not confirm from Seeed's published documentation whether `VUSB` is
connected to USB 5 V out of the box on every board revision, which is why the
meter check is step one rather than a footnote.

**Battery operation:** the XIAO's `VUSB` is dead when USB is unplugged. For an
untethered run, feed the module's `+5V` from the LiPo (the `BAT+` pad on the
back of the XIAO, 3.7–4.2 V) — still enough headroom for the LDO to regulate,
and it takes the whole ECG front end off mains entirely, which usually does
more for 50 Hz than any register tweak.

---

## 4. Electrode plan (firmware preset 0 — the default)

Two copies of Lead II, one Lead I, and a dedicated RLD electrode. Five
electrodes on the body; `IN5` stays spare.

| ADS input | Electrode | Which 3.5 mm jack contact |
|---|---|---|
| `IN1` | **RA** — right arm (shared by all three channels) | P1 · contact 1 |
| `IN2` | **LA** — left arm | P1 · contacts 2+3 |
| `IN3` | **LL #1** — left leg | P1 · contact 4 |
| `IN4` | **LL #2** — left leg, a few cm from LL#1 | P2 · contact 1 |
| `IN5` | *spare* | P2 · contacts 2+3 |
| `IN6` | **RLD** — right leg (driven, not measured) | P2 · contact 4 |

Which gives:

| Channel | Measures | Register |
|---|---|---|
| CH1 | Lead II #1 = `IN3 − IN1` | `FLEX_CH1_CN = 0x19` |
| CH2 | Lead II #2 = `IN4 − IN1` | `FLEX_CH2_CN = 0x21` |
| CH3 | Lead I = `IN2 − IN1` | `FLEX_CH3_CN = 0x11` |
| — | RLD driven out on `IN6` | `RLD_CN = 0x06` |

Cable P1 carries RA / LA / LL#1; cable P2 carries LL#2 and RLD.

Because RA is shared, its noise is **common to both Lead II copies and will not
average out**. The compensation is that `CH1 − CH2` becomes a pure noise trace —
a direct quality meter for LL#1 vs LL#2. Preset 1 swaps this for two fully
independent Lead II pairs (six electrodes, no spare) if you want the full √2.

---

## 5. First-power checklist

1. Wire `GND` first, `+5V` last.
2. Nothing but the XIAO plugged into USB; confirm `VUSB` ≈ 5 V (§3).
3. Flash per [FLASHING.md](FLASHING.md).
4. Open the serial monitor at 115200. You want:
   `ADS1293 init (preset 0): OK | REVID=0x01`
5. `REVID` anything other than `0x01` → SPI wiring. Check, in this order:
   `SDI`↔pad 10 and `SDO`↔pad 9 not swapped, `CSB`↔pad 7, `SCLK`↔pad 8,
   and that both boards share `GND`.

<!-- v0.1.0 — pad-name-exact wiring for CJMCU-1293 ↔ XIAO nRF52840, power options, preset-0 electrode plan -->
