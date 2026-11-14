# Changelog — CYPHIX_HARDWARE

## v0.2.0 — 2026-11-14

**Why.** The owner said he already owns TI's ADS1298 kit, so stage 2 no longer
needs a purchase or a board of our own: it needs a way to use the kit's small
board without TI's motherboard. And he was promised a way to turn the model
round himself; FreeCAD was not installed because the disk is nearly full, so
the page does it instead.

- `experiments/E2_ti_board_bench.md` — the stage 2 guide: jumpers, the three
  supply points, the nine signal wires to the XIAO nRF52840, a meter check
  after every step, the internal test signal before any electrode, and a
  one-wire electrode patch that puts the four product channels on ADS channels
  4–7. Researched against TI's board guide SBAU171D, its schematic and TI's
  forum answers; **not yet tried on a board**, and it says so.
- `electronics/DESIGN_INTENT.md` — what the main-board schematic has to do and
  why, including five patient-safety requirements. One of them is new: the
  charge contacts are bare metal that touches skin, so both must be high
  impedance to the circuit unless the charge voltage is present. It also
  records a deliberate deviation from the spec's PWR-01 (a linear-only power
  tree instead of the BQ25120A), which the owner has not yet approved.
- `mechanical/export_web.py` → `plan/model/band_alpha.json`, and a 3D viewer in
  the plan page (rotate, exploded view, cover off, with the strap, flip to the
  wrist side). Opened in headless Chrome before publishing.
- The plan page now carries the size budget, the six renders, the model's
  findings and the stage 1 instructions.

## v0.1.0 — 2026-11-14

**Why this folder exists.** The owner wants to take the Band α specification,
the 3D render and the ADS1294 principle schematic to something a factory can
build, without first paying for an outside design. He asked for a
risk-reduction plan broken into parts, and for the work to start.

**What was found before anything was designed.**

- Every 3D asset is a render mesh (`cyphix.glb`, the OBJ and Blender files).
  There was no solid CAD anywhere, so nothing could be sent to a factory.
- The module in the render measures 35 × 26 mm and about 6 mm thick; the
  spec's MEC-01 says about 45 × 30 × 12 mm. The owner's ruling: neither binds,
  both are wrong, recompute from the parts.
- In the render the RA electrode sits on the strap, past the hinge, so RA1 and
  RA2 need two conductors through the strap.
- The owner already owns TI's ADS1298 kit and could not get anything out of it
  through TI's motherboard and PC software.

**What was added.**

- `plan/plan.html` — the risk-reduction plan as a Hebrew page: five stages
  (0 computer, 1 dry pads on the existing prototype, 2 the new chip on the
  bench, 3 first wearable, 4 fixes and safety), the risk register, eight work
  parts, the owner's tasks and a dated log. Stage 2 uses the TI board the owner
  already has, wired straight to the XIAO nRF52840, so it needs no purchase.
- `system/budget.py` → `system/BUDGET.md` — size, battery and mass computed
  bottom-up. First result: with the cell beside the board the module is about
  48.5 × 30.1 × 7.3 mm on a roomy first board and 41.8 × 30.1 × 7.3 mm on a
  tight one; stacked it is about 36 × 28 × 11.6 mm. A 10-second recording is so
  short that a 100 mAh cell lasts a shared clinic device about two weeks, so
  the spec's 150–300 mAh is more than the device needs.
- `mechanical/band_alpha.py` + `render.py` — the first solid model (CadQuery),
  built from the budget: tray, cover, seal, seven electrode plates on bonded
  ledges, the board with real part bodies, cell, motor, the strap halves with
  the flex to RA1/RA2. It writes STEP files and checks the internal parts for
  collisions.
- `experiments/E1_dry_electrodes.md` — the stage 1 protocol the owner runs on
  the existing prototype.
- `firmware/stage2_ads129x_xiao/` — the bench firmware for stage 2.

**What is not proven.** Nothing here has been measured. The budget rows marked
as not re-read from a datasheet are estimates; the model is a fit concept, not
the industrial design (no closure, screws or draft angles yet); the firmware
has only been compiled.

**Tools.** KiCad 10.0.8 was installed per user (installer checksum matched the
winget manifest). FreeCAD was not installed: the disk had 15.7 GB free and the
solid model does not need it.

<!-- v0.1.0 — first entry: why the folder exists, what was found, what was added -->
