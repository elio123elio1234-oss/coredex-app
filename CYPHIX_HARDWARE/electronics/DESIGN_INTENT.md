# Band α main board — design intent

What the schematic has to do and why. This is the brief the schematic is drawn
from and the first thing a reviewing engineer should read. Requirement IDs
(SYS-, ELC-, PWR-, SAF-, …) refer to the Band α specification.

Status: intent for the **first wearable spin** (stage 3 of the plan). Values
marked *to compute* are computed in `DESIGN_NOTES.md` next to the schematic,
with the datasheet section they come from.

## 1. What the board is

A battery-powered, body-worn 4-channel ECG recorder. Six dry electrodes on
seven pads reach it through spring contacts and one short flex:

| Electrode | Pads | Where | Reaches the board by |
|---|---|---|---|
| RA1, RA2 | 2 | strap top, right-hand fingers | flex in the strap, 4-pin FPC connector |
| LA | 2 pads, one net | inner face, left wrist | two spring contacts, low side of the board |
| LL1, LL2 | 2 | outer face, left leg | spring contacts, tall side of the board |
| RLD | 1 | outer face, between LL1 and LL2 | spring contact, tall side |

It records 10 seconds at a time and streams over Bluetooth LE. It never
records while it is charging (SAF-01).

## 2. Signal chain

- **AFE: TI ADS1294** (ELC-02), 4 simultaneous 24-bit channels, datasheet
  SBAS459K. First spin uses the **TQFP-64 (ADS1294IPAG)**: visible joints,
  reworkable, probe-able. The NFBGA comes later, for the tight board.
  The ADS1296/ADS1298 share the pin table, so IN5–IN8 are tied as the
  datasheet requires for unused inputs and the same board takes any of them.
- **Channel plan** (the specification's AFE section):
  CH1 = LA − RA1 (IN1P = LA, IN1N = RA1), CH2 = LA − RA2 (IN2P = LA, IN2N = RA2),
  CH3 = LL1 − LA (IN3P = LL1, IN3N = LA), CH4 = LL2 − LA (IN4P = LL2, IN4N = LA).
  LA therefore feeds four inputs. Lead I has two copies, Lead III has two
  copies, Lead II = I + III.
- **Sampling** (SYS-02): 500 SPS per channel, High-Resolution mode, internal
  2.4 V reference, internal oscillator (CLKSEL high). Bandwidth 0.05–150 Hz is
  met in firmware; the hardware must not add a high-pass (DC-coupled inputs).
- **RLD**: RLDOUT drives the RLD pad through a protection resistor; RLDINV
  feedback R ∥ C; internal RLDREF; the RLD is derived from the four used
  channels. Loop values *to compute*, with the stability check stated.
- **Input network per electrode** (ELC-03): series resistance for patient
  protection, clamp to the analog rails with low-leakage parts, RC filter.
  Parts matched between the two inputs of every channel (0.1 % resistors, C0G
  capacitors), because mismatch converts common mode to differential.
- **Optional active buffers** (ELC-03): footprints only, bypassed by 0 Ω
  links, for one FET-input buffer per sense electrode (five). Populated only
  if stage 1 / stage 2 measurements ask for it.
- **Lead-off**: the ADS129x internal DC lead-off sources at their lowest
  current; no external pull resistors.

## 3. Controller and radio

- **nRF52840 in a pre-certified module** (ELC-04): Raytac **MDBT50Q-1MV2**
  (chip antenna). KiCad ships its symbol and footprint. Follow Raytac's
  antenna keep-out exactly; the antenna end goes at the board edge that faces
  away from the cell and the electrode plates.
- nRF Connect SDK, signed over-the-air updates (FW-01), so: SWD pads, and a
  32.768 kHz crystal footprint.
- ADS1294 on SPI plus DRDY, START, RESET and PWDN on GPIOs. DRDY must be on a
  pin that can wake / interrupt.

## 4. Power

- One LiPo cell with its own protection board, about 100 mAh (budget:
  `system/BUDGET.md`).
- **Deliberate deviation from PWR-01 (BQ25120A).** The first spin uses a
  **linear-only** power tree: a small linear charger, a nano-power LDO for the
  always-on digital rail, and a low-noise LDO for the analog rail that the
  controller switches on only for a recording. Reasons:
  1. no switching regulator next to a microvolt signal;
  2. the BQ25120A is a 0.4 mm-pitch chip-scale part and was out of stock in
     October 2026;
  3. at about 4 mA for 60 seconds per recording, a buck converter would save
     under 10 % of a budget that already gives two weeks.
  If the reviewer wants the BQ25120A or an nPM1100 back, it is a contained
  change.
- Rails: digital 3.0 V always on (nRF52840 + ADS1294 DVDD), analog 3.0 V
  switched (ADS1294 AVDD/AVDD1). The datasheet's AVDD−DVDD limits and
  power-up sequence must hold in both directions.
- Standby target: under 5 µA total. Battery voltage measured through a
  switched divider.
- Charging through two contacts on the housing (pogo cradle), 5 V.

## 5. Patient safety (designed in, measured later)

These are requirements on the schematic, not notes.

1. **Battery only.** There is no path from the charge contacts to anything
   while the device records; firmware refuses to record when the charge
   voltage is present, and the hardware makes VBUS presence readable.
2. **Patient current limited by resistance, even with one fault.** With any
   single pin shorted to a 3.0 V rail or to ground, DC through the body stays
   below **10 µA** (SAF-01). That sets the series resistance per electrode
   line and at the RLD output; show the arithmetic.
3. **The charge contacts are bare metal on the housing and will touch skin.**
   A ground contact on the skin would tie the body to circuit ground and
   bypass every series resistor. So BOTH charge contacts must be high
   impedance to the circuit unless the charge voltage is present
   (for example back-to-back FETs in the return path, enabled by VBUS).
   State the leakage this leaves.
4. No DC blocking that would hide a fault; no part whose failure can connect
   the cell directly to an electrode.
5. Electrode lines keep their creepage from the charge and battery nets; say
   what clearance the layout must hold.

## 6. User interface and options

- One button (also the wake source), one LED, one coin vibration motor from
  the cell through a FET with a flyback diode (UI-01).
- **OPT-01, not populated:** I2C pads and footprints for an optical PPG
  sensor and a skin temperature sensor on the wrist side. They must cost
  nothing when unpopulated.

## 7. What is deliberately not decided here

- Final input-network values and whether the buffers are populated: after
  stage 1 and stage 2 measurements.
- Electrode plate size: stage 1.
- Board outline: from `mechanical/band_alpha.py` once the part list is final.
- Moving the apps to 4 channels and 500 SPS: needs the owner's approval; the
  board does not depend on it.

<!-- v0.1.0 — first design intent for the Band α main board, first wearable spin -->
