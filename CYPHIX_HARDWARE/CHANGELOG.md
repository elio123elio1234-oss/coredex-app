# Changelog — CYPHIX_HARDWARE

## v0.3.0 — 2026-11-15

**Why.** The owner looked at the first solid model and rejected it: no charging
answer, no closure or sizing, a flat plate where the reference is concave,
electrodes too small, no account of how the conductor is held in the strap or
enters the island, and a dated, box-like look. He was right, and the cause was
mine: v0 was a packaging check (does the electronics fit) and its pictures were
shown as if they were the design. v0 stays in the repo as exactly that.

**The design model (`mechanical/band_id.py`, industrial design concept v1).**
Everything is built on one master curve, the skin line of a 163 mm design
wrist, so the inside of the band is one continuous round line and the island
is concave by construction (radius 44.3 mm at its centre, 4.2 mm deep over its
length; the owner's guess of 40 to 50 mm was right).

- Island: 50.5 x 30 x 7.2 mm, a long shoulder running out into the strap on
  the fixed side, two slim lugs and a polished bar on the other. The board
  inside stays flat; the cell sits beside it at its own angle.
- Electrodes: plates inlaid flush in both curved faces. LL1 / RLD / LL2 are
  264 mm2 each (147 in the render: +80 %), LA is 2 x 278, RA is 2 x 234.
- Charging: four recessed gold contacts on the wrist face between the LA
  plates, no opening in the housing, and a stand whose arm takes the wrist's
  place so the concave face seats itself. Magnets belong in the stand, not in
  a cardiac patient's wearable. Wireless charging was ruled out: steel covers
  both faces, so a coil has no metal-free window.
- Closure and sizing: one continuous strap, fixed to the island on one side,
  threaded under the bar and folded back on the other, locked by a steel stud
  in one of seven holes at 6 mm; counterbored on the skin side. Three strap
  lengths are needed to cover 130 to 210 mm without the tail reaching the RA
  pads.
- Conductor: a flex circuit at mid-thickness of a fluoroelastomer strap, keyed
  in by perforated edges, with a separate trace and post for each RA pad and a
  guard trace between; the strap enters the island as a tongue with a bead and
  a rigid anchor, and the flex goes through a slit to a connector on the board.
- A service strip along one side of the island is the only metal-free zone:
  the antenna, the button and the status light live there.

The model checks itself: no internal part touches a shell, the tail clears the
island and the lugs.

**Pictures (`mechanical/render_id.py`, `mechanical/studio/`).** Rendered with
the landing page's own studio environment and contact shadow, in headless
Chrome on the real graphics chip. Two things cost time and are worth knowing:
software rendering never finished this scene, and Chrome's own screenshot
switch never returned, so the page posts the finished picture back to the
render script. The plan page's 3D viewer now shows this model
(`export_web_id.py`), with a see-through strap to show the flex.

**Not done / not proven.** It is a geometric design, not yet an industrial
designer's surfaces; the island is drawn for the tight 24 x 26 mm board and the
first board will be about 6 mm longer; antenna performance in the service strip
is untested; stud-and-hole closure has not been tried with elderly users; the
budget script has not been re-run for the curved housing.

**Also.** `firmware/stage2_ads129x_xiao` now defaults to the TI board's
channel table. The schematic and the component-verification jobs were cut off
when the account's usage limit ran out; `electronics/` still holds only the
design intent.

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
