# Changelog — CYPHIX_HARDWARE

## v0.10.0 — 2026-11-15

**Why.** The owner, after P1.2: "I liked the design of version 3.1, but with
the premium version's electrodes." So concept v3.2 is v3.1 with one change:
the body, lugs, bar, strap and hook-and-loop closure stay as they were, and
the electrodes are the premium variant's. It becomes the main concept (first
on the plan page, the viewer's default); P1.2 stays beside it.

**What changed (`mechanical/band_id.py` 3.2.0).**

- Leg face: one rounded steel face (a plan-view rounded rectangle projected
  onto the curved face, corners smoothed by a C2 spline), cut into
  LL1 | RLD | LL2 by two hairlines of the body's material, one polished line
  round it. v3.1 had three separate framed pills.
- Wrist face: the same outline, LA1 | black ceramic centre | LA2. The centre
  holds the sapphire lens, now domed 0.35 mm so it meets the skin, and two
  flush charge contacts (v3.1: a flat window and two contacts recessed in
  dishes). The stand gets a shallow pocket for the dome.
- Larger electrodes: LL1/LL2 394 mm² each (v3.1: 290), RLD 287, LA 296 each
  (v3.1: 265). Same metal everywhere (316L), satin face + polished line; the
  RA pads keep their shape with the same 0.35 mm polished line.
- The status light moved 0.4 mm towards the end and is 2 mm deep instead of
  3, so it clears the steel face and the strap's tongue.
- Flush contacts always touch the skin, which makes the existing safety
  requirement in `electronics/DESIGN_INTENT.md` (both contacts high-impedance
  unless the charger is present) more important. Nothing in it changes.

**Kernel traps met on the way (fixed, and now checked).**

- Splitting the lugs off the wrist tray left an invalid tray and an empty
  second lug. v3.1's split box began at s = 19.5 with a face exactly on the
  slot's wall; it worked there by luck. The box now holds only the lug
  (from s = 22.6) with its inner face 0.3 mm inside the empty slot, and the
  build checks that the two lugs come out equal (79.3 mm³ each).
- The premium variant's "turn inside-out booleans the right way round"
  wrapper is now in `band_id.py` too.
- Checks: nothing inside touches the shells or the black centre; strap,
  tongue and status light touch nothing; no inlay touches the body or
  another inlay; all solids valid, volumes positive, symmetric to 0.0 mm.

Also: `render_v32.py` (v3.1's cameras and light with the premium steel
finish, so a v3.1 and a v3.2 picture differ only where the design does; a
lighter copy of the model for the pictures), `export_web_id.py` 3.2.0
(steel colours, black centre, flush contacts).

## v0.9.0 — 2026-11-15

**Why.** The owner on P1.1: "the island looks glued on top of the strap and
sticks out; it does not look like part of the strap." Two measurable
causes: the body is 30 mm wide on a 22 mm strap (4 mm overhang each side),
and at each end the 7.2 mm body stopped at a tall rounded face with the
2.8 mm strap going into a slot at its foot. It also broke a standing rule
from the owner's first review: the strap must read as a continuation of the
island, not something attached to it. P1.0-P1.1 should have kept it.

**What changed (`mechanical/band_premium.py` P1.2, 1.2.0).**

- The ceramic body ends at ±23 mm with its own section; the strap starts
  with exactly that section and narrows smoothly (quintic, no kink at either
  end) to 22 × 2.8 mm over 9 mm, at both ends. The body reads as a swelling of
  the band. The seam is where ceramic meets FKM, in the same colour.
- No slots, no rounded end pieces. At the free end the narrowing ends in a
  short tab whose end holds the ring's near bar (the strap still folds back
  beside the island, on the inside of the wrist).
- 46 mm of ceramic, 64 mm to where the strap has its own section.
- Checks: nothing inside touches the shell; strap, tab, ring and body touch
  nowhere; all solids valid; symmetric to 0.0 mm.

## v0.8.0 — 2026-11-15

**Why.** The owner on P1.0: the ring was on "the part that should be the top
of the strap - not comfortable, and certainly not fashionable". Right: worn
with the island on the inside of the wrist, the back of the wrist is what
everyone sees, and a buckle and a fold there press on it. v0.7.0 presented
the back-of-wrist closure as "where every watch closes"; for this band, whose
island sits on the inside, that was the wrong way round.

**What changed (`mechanical/band_premium.py` P1.1, 1.1.0).**

- The polished steel ring moves to the island's free end, on the inside of
  the wrist, held by a steel tongue in that end's slot (the slot is now the
  tongue's size). One strap: from the fixed end round the wrist, over the top
  (only RA1 and RA2 on it), under the ring's far bar, up and back onto itself
  with hook-and-loop, beside the island - the way Apple's Sport Loop closes
  next to the case. The tail is 8 mm shorter than the first P1.1 render
  showed (tip at s = 58), so on the design wrist it stays on the inside half
  and never climbs to the top.
- The plain S / M / L strap of P1.0 is gone with the junction it needed, so
  "three strap lengths" is open again, as in v3.1. RA1/RA2 are back at v3.1's
  places (-55 / -69).
- Checks: nothing inside touches the shell; the strap touches neither the
  body, the ring nor the ring's tongue; the ring clears the body; all solids
  valid.

## v0.7.0 — 2026-11-15

**Why.** The owner on concept v3.1: "Can it be upgraded to look like an Apple
product? Make a side version that looks premium; from the outside it looks
cheap and unprofessional." Looking at v3.1's pictures with that in mind, the
causes were clear: a glossy plastic-looking shell perched on a wide band, three
plates each framed by a bright outline (reads as stickers), lugs and a bar,
a pinched fixed end, and a white status light.

**What changed: a side variant, not a replacement** (`mechanical/band_premium.py`
P1 1.0.0; v3.1 is untouched). Same inside (board, cell, sensors, springs,
flex) and the same 7.2 × 30 mm the parts set; a new outside:

- One soft body, ceramic (zirconia) in the band's colour: the same section all
  along and the same at both ends, each end rounded off with one 3 mm radius.
  The strap goes into a slot in each end, the way a watch band goes into its
  case, between two solid rounded corners. The strap is 22 mm (v3.1: 24),
  narrower than the 30 mm body, as a watch band is. No lugs, no pins, no bar on
  the island. 52 mm end to end.
- The leg face is one rounded steel face cut into LL1 | RLD | LL2 by two
  hairlines of the body's material, with one polished line round the outside.
  The wrist face has the same outline: LA1 | polished black ceramic with a
  sapphire lens domed 0.35 mm towards the skin and two flush contacts | LA2.
  Still one metal (316L) on every plate. LL 394 mm² each (v3.1: 290), RLD 287,
  LA 296, RA 235 / 233.
- Closure at the back of the wrist: the strap with the conductor ends in a
  polished steel ring; a plain strap from the free end goes through it and
  folds back with hook-and-loop. The tail lies on the plain strap, so it never
  covers RA1/RA2 (moved 2 mm towards the island). The plain strap clicks in on
  a latch, so it can come in S / M / L: v3.1's "three strap lengths" item.
- Status light: a glossy line in the body's colour, seen only when lit.
- Pictures in three colourways (brand navy, warm white, graphite) on an
  Apple-grey set and a black set (`render_p.py`, `studio/harness.ts` 3.2.0:
  palettes, night set, backgrounds); the plan page's 3D viewer switches
  between P1 and v3.1 (`export_web_p.py`, `plan/model/band_p.json`).
- Checks in the model: nothing inside touches the shell, neither strap touches
  the body, the ring or each other, every solid is valid with a positive
  volume, symmetric across to 0.0 mm.

**Kernel traps found on the way** (written down because they cost hours):
rounding the end faces with a fillet was refused; lofting the rounded ends in
one piece with the body made every later split through them fail (the wrist
half came back inside out, with the wrong volume), so each end is its own
piece of the same material; cutting the whole ring out of the strap left an
invalid solid (a straight hole for the bar does not); killing only Chrome's
launcher left headless Chrome holding the render profile, after which every
render quietly produced nothing. Booleans in `band_premium.py` now turn an
inside-out result the right way round and say so.

**Not proven.** That a zirconia housing is affordable (several times a plastic
one; bonded, not welded; an engineering plastic in the same shape keeps most
of the look), the antenna (steel on both faces, as in v3.1), and the look
itself: real premium comes from tolerances, finishes and material samples in
the hand, with an industrial designer and a manufacturer.

**Tried and dropped while building P1** (each was rendered and looked at):
a 20 mm slot in a narrowed 26 mm end with the strap necking down to it (thin
walls beside the slot read as knuckles, the neck as a lump); an end floating
over the strap (a step under the end, a notch in the side view); ends that
narrowed and dropped along an S-curve (a stepped shoulder at every corner from
above).

## v0.6.0 — 2026-11-15

**Why.** Two remarks from the owner on concept v3, both right:

1. "The right bar is superfluous: no strap wraps round it." v3 put a bar and
   lugs at the fixed end only to copy the render's symmetry; the fixed strap
   ran under it into the end face, so the bar did nothing.
2. "Are the electrode materials good?" No, not as v3 drew them: a dark coating
   on each plate's face with bare steel at its edge puts two materials on one
   electrode (a small offset between them, on the skin), and most dark
   coatings conduct poorly (DLC is nearly an insulator). v0.5.0's entry called
   it "a dark conductive finish to be tested"; that was too generous.

**What changed (`mechanical/band_id.py` v3.1.0).**

- Bar and lugs only at the free end, where the strap goes round. The fixed end
  narrows from 30 to the strap's 24 mm and down to 5 mm high, stays on the
  skin, and the strap leaves from under it on the same inner line; inside, the
  tongue, bead, anchor and flex sit in the 4 mm end wall as before. The island
  is 52 mm long with the lugs (59 in v3.0).
- Every plate is one metal, 316L stainless steel, the same on all seven: a
  satin (bead-blasted) face and a polished edge. The plan page gains a
  materials section (why 316L, its weakness against Ag/AgCl, nickel, options
  for later, the other materials).
- `electronics/DESIGN_INTENT.md`: the electrode material requirement.

## v0.5.0 — 2026-11-15

**Why.** The owner sent a picture of their own render of Band α (the landing
page model on a hand) next to concept v2. v2 had answered the engineering
questions but lost the owner's design language: a long tapered shoulder on
one end, bright plates edge to edge, a navy body. Their render has a compact
framed island that is the same at both ends, small lugs with the bar ends
showing at the four corners, three dark pill-shaped electrodes with bright
edges, a graphite body and a slate strap.

**What changed (`mechanical/band_id.py` v3.0.0, design concept v3).**

- The island is the same at both ends: the shoulder is gone, each end has two
  short lugs (the side walls continuing) and a bar that runs through them, so
  its ends show at the four corners. The fixed end of the strap runs under its
  bar into the end face (tongue, bead, anchor and flex inside a 4 mm end
  wall); the free end runs under its bar, round it and back (hook-and-loop).
  The end faces are lofted square to the band, so the strap meets them flush.
- Three pill plates inside a slim frame on the leg face (290 mm² each, about
  twice the render's 147 because the owner asked for larger electrodes, 13 %
  less than v2's edge-to-edge plates), two LA pills (265 mm²) either side of
  the sensor window, RA pills in the same style. Each plate is one piece of
  steel with a dark conductive face and a 0.45 mm bright edge.
- Graphite body, dark bars, slate blue-grey FKM.
- The touch spot and light ring (no room without the shoulder) became a short
  light line in the frame at the fixed end, with the frame round it as the
  touch zone, and wake on electrode contact.
- Checks pass: nothing inside touches the shells, the strap clears both lugs
  pairs and both bars, the island is symmetric to 0.0 mm.

**Not like the render, on purpose.** Size (the render's 35 x 26 x 6 mm cannot
hold the board and the cell; the island is 46 x 30 x 7.2 mm, 59 with the lugs)
and plate width (larger electrodes, as asked).

**Open.** The dark finish has to be shown not to raise skin contact impedance
(fallback: bright steel faces, frame kept); the antenna now has the frame,
side walls and end faces as its metal-free zone (an LDS antenna inside the
frame, to decide with an RF engineer).

## v0.4.0 — 2026-11-15

**Why.** The owner looked at design concept v1 on the phone and found seven
faults, all real:

1. The island was not symmetric; it looked as if it leaned to one side.
   Cause: v1 left a metal-free "service strip" along one edge for the antenna,
   so the plates covered only y = −13.4 to +9.0 and sat off centre. The page's
   3D viewer made it worse by rotating round the middle of the band instead of
   the island, which skews the island in perspective.
2. The PPG sensor and the skin thermometer were missing. The original model
   had them on the wrist face; v1 dropped them without saying so.
3. The surfaces looked rippled and the joint with the strap lumpy. Causes:
   rounded-rectangle sections whose corner radius jumped at the free end, a
   separate strap whose sections did not match the island's, and pictures and
   viewer shading computed from a coarse mesh instead of the surface.
4. The hole-and-stud closure put holes on the top of the wrist, next to the RA
   pads, so the band looked as if it was worn the wrong way round. The owner asked
   for hook-and-loop.
5. The battery was drawn connected to nothing.
6. RA1 and RA2 were 3 mm apart; they should sit close together.
7. The viewer stopped at 180°, so the band could not be turned island-down.

**What changed (`mechanical/band_id.py` v2.0.0, design concept v2).**

- **Symmetric island.** All five plates on the island are centred and run
  across the full width, wrapping over the rounded edges (leg plates
  333 mm² each, LA 298 each). The model checks it: the island's bounding box
  is symmetric to 0.0 mm. What lived in the service strip moved to the
  shoulder, the only metal-free zone, on the centre line.
- **PPG + thermometer (OPT-01).** An 8.6 mm sapphire window at the centre of
  the wrist face; behind it an optical module against a boss on the window,
  and a skin thermometer on a thermal pad. One charge contact on each side of
  the window; the charge input is polarity-free, so the band charges whichever
  way it hangs (two contacts instead of v1's four).
- **Smooth surfaces.** Each section is a closed C2 spline through a rounded
  section with its own radius on each face, every size change follows a
  quintic step (no kink, no curvature jump), and the strap is one loft along
  one smooth centre line from the island round the wrist, under and round the
  bar and back out, starting with exactly the island's last section. A
  0.3 mm parting groove marks plastic to FKM, and the FKM is the island's navy.
  Meshes now carry the surface's own normals (renders and viewer).
- **Hook-and-loop closure.** Hooks on the underside of the folded-back tail,
  loops laminated flush into the strap's outer face on the free side; the loop
  strip ends before the RA pads, and the last 3 mm of the tail has no hooks so
  it can be lifted. Holes and stud are gone.
- **RA1/RA2** 1 mm apart (centres at −55 and −69 mm).
- **Battery** connected: two nickel tabs onto pads at the board's end. The
  cell is drawn without its own protection board (the protection IC is on the
  main board): with a folded protection board the cell is 26.5 mm across and
  its top corner touched the curved shell (0.2 mm³, caught by the model's own
  check).
- **Control:** a sealed touch spot with a light ring on the shoulder
  (proposal; a membrane switch at the same spot is the fallback).
- Free-rotation viewer (TrackballControls) and a "from above" button.
- Found on the way: CadQuery's default volume integration is off by 10 % or
  more on these spline bodies; the model's checks now integrate with a real
  tolerance.

**Also.** `electronics/DESIGN_INTENT.md`: 1 kSPS with decimation to meet
150 Hz, a footprint for an external 2.048 MHz clock, the antenna problem and
the shoulder-antenna proposal, polarity-free charging, the touch spot, and
OPT-01 with a place. `system/budget.py`: PPG, thermometer, five plate springs,
two charge springs, the bridge, the protection IC, the RF feed; the flat-box
envelope is now 48.9 x 30.1 x 7.5 mm (first spin), 42.1 (tight).

**Not done / not proven.** Antenna placement needs an RF engineer and a
measurement on a wrist; hook-and-loop is harder to disinfect between patients
than smooth FKM (medical-grade loop or a replaceable tail); the island is still
drawn for the tight board; the touch spot is a proposal; nothing is measured.

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

<!-- v0.10.0 — the hardware folder's history, newest first; latest: concept v3.2, v3.1's design with the premium electrodes -->
