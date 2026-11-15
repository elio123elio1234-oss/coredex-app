# Band α main board, rev 0.1: design notes

Status: **drawn, not reviewed.** A person with electronics experience reviews this schematic before
any board is ordered (plan, stage 3). Nothing here has been built or measured.

- Brief: [`../DESIGN_INTENT.md`](../DESIGN_INTENT.md).
- Schematic: `band_alpha_main.kicad_sch` (KiCad 10). The PDF plot is `band_alpha_main.pdf`.
- Generator: `make_schematic.py`. Every part and connection is in one table there. The script has KiCad
  read the file back and checks that every pin landed on its net (449 pins, 0 mismatches), then runs ERC.
- ERC: 0 errors and 4 warnings. All four warnings are ADS1294 GPIO1–4 tied to ground, as the datasheet
  says to do with unused GPIOs.
- BOM: `bom.csv`. 131 parts; the DNP ones are marked.

Sources: TI SBAS459K (ADS129x), Raytac MDBT50Q datasheet ver. K, Microchip MCP73831 datasheet, TI LP5907
datasheet. Numbers this file has not yet re-read from a datasheet are marked **(confirm)** and are listed at
the end.

## 1. Blocks

| # | Block | Parts |
|---|---|---|
| 1 | Cell + protection | 401225-class LiPo, about 100 mAh, without its own protection board. DW01A plus two DMG1012T in the negative lead, on the main board. |
| 2 | Charging | Two flush contacts that work either way round, a Schottky bridge, and an isolation switch: TPS3839 driving a P-FET high side and an N-FET return. MCP73831-2 linear charger at 50 mA. |
| 3 | Rails | +3V0D always on: XC6206P302, about 1 µA quiescent. +3V0A for the ADS1294 only: LP5907-3.0, low noise, switched by the nRF. |
| 4 | Electrodes | Five sense lines and RLD: TVS, 2 × 47.5 kΩ 0.1 %, 1 nF C0G, then a 0 Ω link or a DNP AD8603 buffer. FPC to the strap (RA1, guard, RA2), spring contacts to the island plates. |
| 5 | AFE | ADS1294IPAG (TQFP-64). Decoupling per SBAS459K sec. 11 and Fig. 106. RLD integrator. Internal clock, with footprints for an external 2.048 MHz oscillator. |
| 6 | Controller | MDBT50Q-1MV2 (nRF52840) in normal-voltage mode, 32.768 kHz crystal, Tag-Connect SWD. |
| 7 | UI | White LED driven from VBAT through a FET, 8 mm ERM motor with a flyback diode, capacitive touch pad. |
| 8 | OPT-01 (DNP) | TMP117 skin thermometer and MAX30102 PPG with its own 1.8 V LDO, on one I2C bus. |

## 2. Patient safety (DESIGN_INTENT §5)

**Limits used.** IEC 60601-1 patient auxiliary current, DC: 10 µA in normal condition, 50 µA in single
fault condition. The brief asked for 10 µA *with* one fault. That would need about 300 kΩ per line and would
roughly triple the resistor noise. **This rev uses the standard's single-fault limit. The reviewer should
confirm or reject this choice.**

| Condition | Path | Current |
|---|---|---|
| Normal | ADS1294 input bias, lead-off source at its lowest setting, TVS leakage | nA range |
| Fault: one ADS input pin shorted to +3V0A | 3.0 V / (2 × 47.5 kΩ) | 32 µA, under 50 |
| Fault: one of the two series resistors shorted | 3.0 V / 47.5 kΩ, but only together with a second fault | not a single fault |
| Fault: RLDOUT stuck at a rail | 3.0 V / (2 × 100 kΩ) | 15 µA |
| A charge contact on the skin, stand absent | Body (about 1.5 V, set by RLD) → bridge diode → BR_P → TPS3839 VDD | about 0.15 µA **(confirm)** |

**Why the charge contacts float.** Both contacts sit on the skin. Without the switch, the body (held at
mid-supply by RLD) would find a path through the bridge into the charger input and back to circuit ground,
bypassing every series resistor. With the stand absent:
- Q3 (P-FET, source at BR_P) is off, and its body diode blocks current from BR_P into VCHG.
- Q5 (N-FET return) is off. Its body diode could only conduct if BR_N were below circuit ground, which
  the body cannot drive it to.
- VCHG is held at 0 V by 1 MΩ, so the charger's reverse leakage cannot back-bias Q3's body diode.
- The only DC path left is the supervisor's own supply current from BR_P.

With the stand present:
- Q5's body diode first closes the return path, and the supervisor sees about 3.8 V.
- CHG_PG goes high and turns on Q5 and, through Q4, Q3.
- The charger then sees BR_P minus about 0.3 V.

**Charging and recording are exclusive in firmware.** VBUS_DET (CHG_PG through a 100k/200k divider, 2.9 V)
tells the nRF the stand is there, and the firmware refuses to record. With both FETs off there is no
galvanic path from the stand to the electrodes either.

**Layout must keep** (for the layout review):
- Creepage: electrode nets (`*_PAD`, `*_S`) away from VBAT, VCHG and BR_P.
- Copper: no copper under the 47.5 kΩ resistors except their own nets.
- Guard ring: around the high-impedance nodes (`*_F`, `*_ADC`).

## 3. Input network

- **Series resistance:** 2 × 47.5 kΩ, 0.1 %, per line. Two in series, so one resistor failing short still
  leaves 47.5 kΩ.
- **Thermal noise of 95 kΩ:** √(4kTR) = 40 nV/√Hz at 37 °C, which is 0.49 µVrms over 150 Hz per line, and
  0.7 µVrms differential. That is the same order as the ADS1294's own noise at 500 SPS. With dry 316L
  electrodes, the skin–electrode impedance (MΩ range) will dominate. Stage 1 measures it, and stage 2 sees
  it through the real chip. If the noise is too high, the series resistance can go down to about 60 kΩ and
  still meet 50 µA.
- **RC filter:** 1 nF C0G to ground after the resistors, so fc = 1/(2π · 95 kΩ · 1 nF) = 1.7 kHz. This is an
  EMI and anti-alias filter. It is well above 150 Hz (SYS-02) and far below the modulator rate.
- **Matching:**
  - Every channel's two inputs see the same network: 0.1 % resistors, and C0G capacitors in one value and
    one reel.
  - LA feeds four ADS inputs from one filtered node. Its load is four input leakages, nA in total, so the
    mismatch against RA1, RA2, LL1 and LL2 is negligible at 95 kΩ.
- **Buffers:** an AD8603 footprint per line (1 pA bias, rail to rail), DNP, bypassed by a fitted 0 Ω. Fit
  them only if stage 1 or stage 2 shows the electrode impedance needs them (ELC-03).
- **ESD:** two TPD4E02B04 (0.25 pF) on the pad side, ahead of the resistors. Their leakage at 1.5 V adds
  nA **(confirm)**.
- **Strap guard:** the guard trace between the RA1 and RA2 traces goes to ground through 0 Ω. If stage 2
  shows pickup, it can later be driven from the RLD reference instead.

## 4. AFE (ADS1294)

- **Channels:**
  - CH1 = LA − RA1 (IN1P LA, IN1N RA1)
  - CH2 = LA − RA2 (IN2P LA, IN2N RA2)
  - CH3 = LL1 − LA (IN3P LL1, IN3N LA)
  - CH4 = LL2 − LA (IN4P LL2, IN4N LA)

  Lead I twice and Lead III twice; II = I + III.
- **Data rate:** 1 kSPS in high-resolution mode, decimated to 500 SPS in firmware. The converter's −3 dB
  point is 0.262 × fDR (SBAS459K, Electrical Characteristics). At 500 SPS that is 131 Hz, below the 150 Hz
  that SYS-02 asks for. At 1 kSPS it is 262 Hz.
- **Supplies:**
  - AVDD and AVDD1 come from +3V0A, star-connected, with AVSS and AVSS1 to ground.
  - DVDD comes from +3V0D.
  - Bypassing is 1 µF ‖ 0.1 µF on each supply group (sec. 11), and VREFP has 10 µF ‖ 0.1 µF to
    VREFN = AVSS.
- **VCAP1:** 22 µF **tantalum**. Sec. 11 says that on a board that vibrates, X5R and X7R parts are
  piezoelectric and appear as noise, and this board carries a vibration motor.
- **VCAP2, VCAP3, VCAP4:** 1 µF each. WCT: 1 nF, with the WCT amplifiers left powered down.
- **Unused pins:**
  - Analog inputs IN5–IN8 and RLDIN go to AVDD.
  - DAISY_IN, GPIO1–4 and RESV1 go to DGND (sec. 9.3.2, pin table).
  - TESTP/TESTN_PACE and RLDREF are left open. RLDREF is set to internal in CONFIG3.
- **Clock:** CLKSEL is tied high through 0 Ω, so the internal 2.048 MHz oscillator runs. There are DNP
  footprints for an external 2.048 MHz oscillator (Y2) and for the CLKSEL pull-down. The internal
  oscillator's tolerance turns directly into heart-rate error (DESIGN_INTENT §2).
- **Switched analog rail:** the LP5907 is off between recordings, and the firmware drives every ADS digital
  input low before it switches AVDD on.
  - Sec. 11.1 power-up: inputs low until the supplies are stable, wait tPOR (2^18 tCLK) or until VCAP1 is
    above 1.1 V, then reset.
  - The absolute maximum ratings set no limit between AVDD and DVDD, so DVDD can stay on while AVDD is off
    **(confirm in the full table)**.
- **RLD:** RLDOUT goes through 2 × 100 kΩ to the RLD plate. The integrator is 1 MΩ ‖ 1.5 nF between RLDINV
  and RLDOUT. These are TI's example values (SBAS459K Fig. 94) and the values on the working prototype
  (R12 / C13 on the CJMCU board). RLD is derived from the four channels.
  - Not done: a stability analysis with the electrode impedance. On the stage-2 bench it is checked by
    stepping the common-mode voltage and watching RLDOUT ring.

## 5. Power

**Stand voltage.** The stand supplies 5.0 V. After two MBR0520 drops (about 0.28 V each at 50 mA
**(confirm)**), the charger sees about 4.4 V. The MCP73831 needs 3.75–6 V and regulates to 4.20 V.

**Charge current.** IREG = 1000 V / RPROG, so RPROG = 20 kΩ gives 50 mA, 0.5 C for 100 mAh. A full charge
takes about 2.5 h.

**Rails:**
- +3V0D: XC6206P302 (about 1 µA Iq **(confirm)**), 1 µF in and out.
- +3V0A: LP5907MFX-3.0, 6.5 µVrms, 1 µF in and out. EN is pulled down by 100 kΩ, so the rail is off until
  the firmware asks.
- The LiPo holds 3.0 V regulation down to about 3.15 V. Firmware ends recordings below about 3.3 V.

**nRF52840 supply.** Normal-voltage mode (Raytac ref. 8.3): VDD = VDDH = +3V0D, DCCH open.
- USB is unused: VBUS goes to GND, D+ and D− are open **(confirm against the nRF52840 PS)**.
- The 32.768 kHz crystal is fitted (Raytac: the module's default code expects it). Load capacitors are
  2 × 12 pF for CL = 9 pF.

**Battery measurement.** 10 MΩ / 10 MΩ divider with a 100 nF reservoir, into AIN0. It draws 0.21 µA all the
time, so no switch is needed. The SAADC must use a long acquisition time.

**Standby estimate.**

| Part | Current |
|---|---|
| DW01A | 3 µA typ. **(confirm)** |
| nRF52840 System ON idle with RTC | about 2 µA |
| XC6206 | 1 µA |
| Battery divider | 0.2 µA |
| **Total** | **about 6 µA**, above the brief's 5 µA |

DW01A is half of it. A lower-current protector is the obvious swap if the shelf time matters (100 mAh at
6 µA is still about 1.9 years).

**Recording estimate.**

| Part | Current |
|---|---|
| ADS1294, 4 channels HR | about 1 mA |
| LP5907 | 12 µA |
| nRF BLE streaming | 3–5 mA |
| **Total** | **about 4–6 mA** for about 60 s per recording |

This matches `system/BUDGET.md`.

## 6. Controller pin map (nRF52840 via MDBT50Q-1MV2)

| Signal | nRF pin | Module pin | Note |
|---|---|---|---|
| ADS SCLK / DIN / DOUT / CS | P0.19 / P0.20 / P0.21 / P0.17 | 42 / 44 / 43 / 41 | High-speed capable pins (the QSPI group). **SPI mode 1** (ADS129x). |
| ADS DRDY | P0.22 | 46 | Interrupt and wake source. FW-01: each sample is read on DRDY. |
| ADS START / RESET / PWDN | P0.23 / P0.24 / P0.25 | 45 / 48 / 49 | |
| AFE_PWR_EN | P1.02 | 50 | LP5907 EN |
| I2C SDA / SCL | P0.11 / P0.12 | 27 / 29 | OPT-01 sensors |
| PPG_INT / TEMP_ALERT | P0.06 / P0.08 | 22 / 24 | |
| VBAT_SENSE | P0.02 / AIN0 | 11 | |
| TOUCH | P0.03 / AIN1 | 9 | COMP-based capacitive sensing |
| VBUS_DET / CHG_STAT | P0.07 / P0.26 | 23 / 19 | Both through dividers: the 4.4 V signals never reach a 3.0 V pin. |
| LED_EN / MOTOR_EN | P0.13 / P0.14 | 37 / 36 | |
| XL1 / XL2 | P0.00 / P0.01 | 17 / 18 | 32.768 kHz |
| SWDIO / SWDCLK / nRESET / SWO | — / — / P0.18 / P1.00 | 51 / 53 / 40 / 47 | Tag-Connect TC2030-NL |

The pin map is to be reviewed against the nRF52840 PS chapter "Pin assignments", which lists the pins
recommended only for low-frequency I/O near the radio.

## 7. Open, and why

- **Antenna.** The schematic uses the chip-antenna module; the -U1MV2 (RF out) variant has the same pinout.
  Steel covers both faces of the island, so the antenna is an RF engineer's decision.
- **Board outline and layout.** Not started. The outline comes from `mechanical/band_id.py`, about
  25 × 26 mm on the tight board. The first spin is roomier and uses the TQFP.
- **Single-fault limit.** 50 µA (IEC) versus the brief's 10 µA, see §2.
- **Buffers, final series resistance, RLD values.** After the stage 1 and stage 2 measurements.
- **Touch.** A proposal that has not been approved. The pad and its resistor cost nothing if unused.

## 9. Board rev 0.1: placement (not routed)

**Files.**
- Board: `band_alpha_main.kicad_pcb`.
- Generator: `make_pcb.py`, run with KiCad's own Python. It reads the same parts and nets table as the
  schematic.
- Pictures: `pics/top3d.png`, `pics/bottom3d.png`, `pics/ratsnest.png` (from `draw_ratsnest.py`).

**Board.** 32 × 26 mm, 0.8 mm thick, 4 layers:
- F.Cu: signals
- In1.Cu: GND plane
- In2.Cu: signals and power
- B.Cu: signals

It is the island's flat board from `mechanical/band_id.py`, made 7 mm longer for the first spin's TQFP-64.
The island grows with it, which is allowed: every size is a recommendation.

**Placed from the housing, not by eye.** Board x runs along the band and equals the island's s + 1.5 mm.
- Spring contacts under the steel faces:
  - leg face (top): LL1 at x −6.2, RLD at x 3.3, LL2 at x 14.6
  - wrist face (bottom): LA pads at x −8.5 and x 11.0
- Charge contacts at (1.5, ±9): the model's CHG_Y.
- The PPG and the thermometer inside the sapphire window, a 4.6 mm keep-out circle at x 1.5.
- The strap's FPC opening flush with the fixed end.
- Cell tabs at the free end.
- An 8 mm keep-out circle on top where the coin motor sits.

**Big parts by hand:**
- ADS1294: on the leg face, analog pins towards the FPC and the springs, SPI pins towards the radio.
- Radio module: its antenna end and its all-layer keep-out on a side wall (plastic, the metal-free zone),
  away from the cell.

**Everything else automatically.**
- Each part goes next to the pin it decouples, or next to the pads it connects to, on its assigned face.
- No courtyard overlaps, inside the outline, outside the keep-outs.
- Caps for the ADS1294's lower-edge pins go under the chip, on the wrist face.

**Checks (KiCad DRC with zone refill and schematic parity).**

| Check | Result |
|---|---|
| Footprints placed | 131 of 131 |
| Courtyard overlaps | 0 |
| Board vs. schematic (footprint parity) | 0 errors: every footprint, field and pad net matches |
| Electrical DRC errors | 0 |
| Unconnected pads | 308. Expected: nothing is routed yet. |
| Isolated copper | 1, the GND plane, which has no vias until routing |

Reference names are on the assembly (Fab) layers only. The few silkscreen warnings that remain stay
visible in `drc.rpt`; none were silenced.

**Not done: routing.** The plan is Freerouting, an open-source autorouter, run locally on the exported
Specctra file and imported back. Its Windows build is downloaded and its checksum matches the one the
project publishes, but running a downloaded program needs the owner's permission, so it has not been run.
Either way, a human layout pass follows. Analog nets need short, guarded routes, the ground plane
needs care under the AFE, and the antenna needs its keep-out kept. A reviewer checks the result before
anything is ordered.

## 10. Numbers not yet re-read from a datasheet (confirm)

| Part | To confirm |
|---|---|
| TPS3839K33 | threshold about 3.08 V, supply current about 150 nA, output behaviour below 0.6 V |
| MAX30102 | SDA, SCL and INT tolerate pull-ups to 3.0 V while VDD is 1.8 V |
| DW01A | typical application values (100 Ω, 0.1 µF, 1 kΩ) and 3 µA operating current |
| MBR0520 | Vf at 50 mA |
| XC6206P302 | quiescent current |
| TPD4E02B04 | leakage at 1.5 V |
| nRF52840 | VBUS handling with USB unused; low-frequency-only pins |
| ADS1294 | full absolute-maximum table: any AVDD–DVDD limit with AVDD off |

<!-- v0.2.0 — design notes for main board rev 0.1 (+ board placement, sec. 9): blocks, patient-safety arithmetic (IEC 60601-1 limits, floating charge contacts), input network, AFE connections from SBAS459K, power and standby budget, nRF pin map, open items and the numbers still to confirm -->
