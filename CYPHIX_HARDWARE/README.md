# CYPHIX_HARDWARE — Band α hardware design

The product hardware for **CYPHIX Band α**: the wearable 6-lead ECG strap with
dry electrodes that replaces the ESP32 + ADS1293 prototype. Requirements come
from the Band α specification (the bilingual artifact page,
`claude.ai/artifact/PpmwYJec8DWmWGM8rhy5re`).

This folder is run as a **risk-reduction plan**: every risk is tested in the
cheapest way that can prove it, and the next stage is paid for only after the
previous one passes. The plan, with its live progress log, is the Hebrew page
published from `plan/plan.html`
(`claude.ai/artifact/PyT22bDzE1Ed9x9vdyoaew`).

## Stages

| # | Stage | Proves | Cost |
|---|---|---|---|
| 0 | On the computer | the design closes: size from the parts, schematic, parts available, everything fits in a solid model | none |
| 1 | Dry pads on the existing prototype | steel pads at the planned size give a readable ECG | about none |
| 2 | The new chip on the bench | the ADS129x family, the 4-channel plan and the existing apps work together | about none: the TI ADS1298 board is already owned |
| 3 | First wearable | miniature board, housing, strap and the flex inside it work on a wrist | $800–1,500 for five |
| 4 | Fixes and safety | safe and stable enough for a hospital study | $800–1,500 plus an accredited lab |

## Layout

```
CYPHIX_HARDWARE/
├── plan/          the plan page (plan.html + img/); publish plan.html to update the page
├── system/        budget.py → BUDGET.md: size, battery and mass, computed bottom-up from the parts
├── mechanical/    band_alpha.py (CadQuery solid model) + render.py; out/ holds STEP and pictures
├── electronics/   KiCad projects (product schematic and board)
├── firmware/      stage2_ads129x_xiao/: the bench firmware (XIAO nRF52840 + TI ADS1298 board)
├── experiments/   step-by-step protocols for the tests a person has to run
└── tools/         helper scripts
```

`HW_PLAYGROUND/` (the ADS1293 research area) stays as it is and is read-only
from here.

## Rules that are specific to this folder

- **No size is an input.** The render (35 × 26 × ~6 mm) and the spec's MEC-01
  (45 × 30 × 12 mm) were not derived from the parts. `system/budget.py` is the
  one place the module size comes from; the CAD model imports it.
- **The apps stay frozen at 320 Hz until the hardware is proven.** Stage 2
  firmware has a compatibility mode that streams the existing packet format, so
  no app change is needed to test new hardware. Moving the apps to 4 channels
  and 500 SPS is a `CYPHIX_SHARED` change and needs the owner's approval.
- **Patient safety is designed in from the first schematic**: patient current
  limited by series resistance, no recording while charging, battery-only
  operation whenever electrodes are on a person.
- **Nothing here has been measured until a stage says so.** A clean ERC/DRC, a
  collision-free model and a compiling firmware prove the design is
  well-formed, not that it works.
- A person with electronics experience reviews every board before it is ordered.

## Tools

- Python 3.12 in `.venv/` (`requirements.txt`): CadQuery for solids and STEP,
  PyVista for the pictures.
- KiCad 10 installed per user at
  `%LOCALAPPDATA%\Programs\KiCad\10.0` (`bin\kicad-cli.exe`).
- PlatformIO at `%USERPROFILE%\.platformio\penv\Scripts\pio.exe`.

<!-- v0.1.0 — what the hardware folder is, its stages, layout and rules -->
