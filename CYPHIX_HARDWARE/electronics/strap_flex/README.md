# Strap flex, rev 0.1

The flexible circuit moulded inside the FKM strap. It carries RA1 and RA2 from the two finger plates on top
of the strap into the island, to J1 on the main board.

**Status:** drawn and checked by KiCad's DRC: 0 errors, 0 unconnected. One warning stays visible: the guard
trace ends open at its far end, which is how a guard is meant to be. Not reviewed, not ordered.

| | |
|---|---|
| Files | `strap_flex.kicad_pcb`, from `make_flex.py` (KiCad's Python). Picture: `pics/flex_top3d.png` |
| Build | Single-sided: 18 µm rolled-annealed copper on 25 µm polyimide, coverlay both sides, about 0.11 mm thick. ENIG on the exposed pads and fingers. |
| Size (flat) | 61.7 mm long. 13.4 mm wide in the strap, which is 24 mm wide. 2.5 mm tail. |
| Lanes | RA1 at y +3.4 mm, guard at 0, RA2 at −3.4 mm. 0.3 mm wide in the strap, 0.2 mm in the tail. Each RA plate on its own trace, the guard between them (DESIGN_INTENT §1, the owner's rule). |
| Post pads | 4 mm round pads, exposed. RA1 at 34.5 mm and RA2 at 49.1 mm from the island's end, measured along the strap's mid-thickness on the design wrist (`mechanical/band_id.py` v3.2: posts at s = −55 / −69, y = ±3.4). The plate's steel post presses onto its pad. |
| Interlock | 20 holes, 1.1 mm, down both edges every 4 mm. The FKM flows through them and locks the flex in place. None within 3.5 mm of a post pad. |
| Tail | 4 fingers, 0.5 mm pitch, 3 mm long, pulled back 0.3 mm from the tip. 0.2 mm PI stiffener, 0.3 mm total, for the ZIF connector J1 (Amphenol F32Q). Pin 1 RA1, 2 guard, 3 RA2, 4 unused. Net names as on the main board. |

**To confirm before ordering:**
- The FPC tail width, finger length and contact side against the F32Q-1A7x1-11004 drawing (top or bottom
  contact decides which way the fingers face).
- The exact post positions once the strap length per size is decided. Three strap lengths are still open.
- Bend life of the tail where it rises from mid-strap to the board, about 2.3 mm in height. The board
  house's flex rules apply.

<!-- v0.1.0 — strap flex rev 0.1: what it is, build, geometry from the 3D model, tail for J1, items to confirm -->
