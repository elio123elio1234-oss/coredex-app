"""CYPHIX Band alpha - bottom-up size, battery and mass budget.

The module size is an OUTPUT of this file, not an input: neither the 3D render
(35 x 26 x ~6 mm) nor the spec's MEC-01 (45 x 30 x 12 mm) was derived from the
parts, so both are treated as wrong until this budget says otherwise
(user decision, 2026-11-14).

Run:  python system/budget.py            -> prints the tables
      python system/budget.py --write    -> also rewrites system/BUDGET.md

Every number carries where it came from. `verified=False` means "from memory of
the datasheet, not yet re-read"; those rows are listed at the end of the report
so nobody mistakes them for checked facts.
"""
from __future__ import annotations

import argparse
import math
from dataclasses import dataclass
from pathlib import Path

VERSION = "0.1.0"


# --------------------------------------------------------------------------
# 1. Parts that set the board area and the stack height
# --------------------------------------------------------------------------
@dataclass(frozen=True)
class Part:
    key: str
    name: str
    l: float          # mm, footprint length on the board (incl. leads / lands)
    w: float          # mm
    h: float          # mm, max height above the board
    qty: int = 1
    side: str = "top"     # "top" = tall side, "bot" = low side, "notch" = sits in a cut-out of the board
    keepout: float = 0.5  # mm of clearance added on every side for placement
    source: str = ""
    verified: bool = False

    @property
    def area(self) -> float:
        return (self.l + 2 * self.keepout) * (self.w + 2 * self.keepout) * self.qty


PARTS: list[Part] = [
    # --- analog front end -------------------------------------------------
    Part("afe", "ADS1294 (NFBGA-64, ZXG)", 8.0, 8.0, 1.0, source="TI SBAS459K package drawing"),
    Part("afe_dec", "AFE decoupling, 0402 (AVDD/AVDD1/DVDD/VCAP2-4/VREF/WCT)", 1.6, 0.9, 0.55, qty=13,
         keepout=0.25, side="bot", source="SBAS459K Fig. 106 parts count"),
    Part("afe_vcap1", "VCAP1 22 uF C0G/tantalum (0805)", 2.6, 1.6, 1.3, keepout=0.25, source="SBAS459K Fig. 106"),
    Part("afe_vref", "VREF 10 uF (0603)", 2.2, 1.2, 0.9, keepout=0.25, side="bot", source="SBAS459K Fig. 106"),
    # --- electrode inputs: RA1, RA2, LA, LL1, LL2 --------------------------
    Part("in_r", "input series R, 0402", 1.6, 0.9, 0.4, qty=5, keepout=0.25, source="design"),
    Part("in_c", "input filter C, 0402", 1.6, 0.9, 0.55, qty=5, keepout=0.25, source="design"),
    Part("in_esd", "input ESD (0402 / SOD-882)", 1.6, 0.9, 0.5, qty=5, keepout=0.25, source="design"),
    Part("rld", "RLD loop: R || C feedback + output R, 0402", 1.6, 0.9, 0.55, qty=3, keepout=0.25, source="SBAS459K Fig. 94"),
    Part("buf", "optional electrode buffer footprint (MSOP-10) + 2 caps", 5.0, 3.2, 1.1, qty=2, side="bot",
         source="ELC-03: footprint only, populate if stage 1/2 measurements ask for it"),
    # --- controller / radio -----------------------------------------------
    Part("mcu", "nRF52840 module with antenna (Raytac MDBT50Q class)", 15.5, 10.5, 2.05,
         source="Raytac MDBT50Q-1MV2 datasheet"),
    Part("ant", "antenna keep-out under/next to the module (no copper, no parts)", 10.5, 4.5, 0.0, side="bot",
         keepout=0.0, source="module layout guide"),
    Part("xtal32k", "32.768 kHz crystal + 2 caps", 3.2, 1.8, 0.6, source="design"),
    # --- power --------------------------------------------------------------
    Part("pmic", "charger / PMIC (BQ25120A, DSBGA-25)", 2.5, 2.5, 0.63, source="TI BQ25120A datasheet"),
    Part("pmic_l", "buck inductor 2.0 x 1.6", 2.0, 1.6, 1.0, source="design"),
    Part("pmic_c", "PMIC capacitors / resistors, 0402 + 0603", 1.8, 1.0, 0.8, qty=7, keepout=0.25, source="design"),
    Part("ldo", "low-noise LDO for AVDD (X2SON / SOT-23-5) + 2 caps", 4.0, 3.0, 1.1, source="design"),
    Part("sw", "AFE rail load switch + pull-ups", 3.0, 2.5, 0.6, side="bot", source="design"),
    # --- user interface ------------------------------------------------------
    Part("btn", "side tactile switch", 3.9, 2.9, 1.7, source="design"),
    Part("led", "LED 0402 + resistor", 2.4, 1.0, 0.5, keepout=0.25, source="design"),
    Part("hap", "haptic driver (FET + diode + R)", 3.5, 2.5, 1.0, side="bot", source="design"),
    # --- connections ---------------------------------------------------------
    Part("spring", "spring contact to an electrode pad (LL1, LL2, RLD, LA)", 3.0, 1.6, 1.8, qty=4,
         source="spring-finger class part, height to be matched to the stack"),
    Part("fpc", "FPC connector for the strap flex (RA1, RA2 + guard), 0.5 mm 4-pin", 4.6, 3.6, 1.0,
         source="design"),
    Part("chg", "charge pads / pogo landing (VBUS, GND)", 2.5, 2.5, 0.0, qty=2, side="bot", source="design"),
    Part("bat_pad", "battery solder pads", 3.0, 2.0, 0.0, qty=2, side="bot", source="design"),
    Part("swd", "SWD programming pads (4 x 1 mm)", 5.0, 1.5, 0.0, side="bot", source="design"),
    # --- not on the board -----------------------------------------------------
    Part("motor", "coin vibration motor, 8 mm, in a notch of the board", 8.0, 8.0, 2.7, side="notch",
         source="generic 0827 coin ERM"),
]

# Share of the board that routing, vias, fiducials and board-edge clearance eat
# on top of the bare footprints. 1.5 is a normal figure for a dense 6-layer
# wearable board; 1.9 is a roomy first spin that is easy to probe and rework.
ROUTING_FACTOR = {"tight": 1.5, "first spin": 1.9}


# --------------------------------------------------------------------------
# 2. Batteries (single-cell LiPo pouch with protection board)
# --------------------------------------------------------------------------
@dataclass(frozen=True)
class Cell:
    code: str
    mah: float
    t: float   # mm
    w: float
    l: float   # incl. protection board
    grams: float
    verified: bool = False


CELLS: list[Cell] = [
    Cell("301020", 40, 3.0, 10.0, 21.5, 1.0),
    Cell("301230", 80, 3.0, 12.0, 31.5, 1.9),
    Cell("401225", 100, 4.0, 12.0, 26.5, 2.4),
    Cell("402025", 150, 4.0, 20.0, 26.5, 3.4),
]


# --------------------------------------------------------------------------
# 3. Electrical budget
# --------------------------------------------------------------------------
@dataclass(frozen=True)
class Load:
    name: str
    ma: float
    source: str
    verified: bool = False


# Average currents on the 3 V rails while a recording is being streamed.
ACTIVE: list[Load] = [
    Load("ADS1294, HR mode, 500 SPS, 4 channels, int. ref + osc, RLD on", 2.0,
         "SBAS459K power table at 3 V (about 6 mW)"),
    Load("nRF52840 radio: about 25 notifications/s of 244 B on the 2M PHY", 0.5,
         "nRF52840 PS: 4.8 mA TX at 0 dBm, 4.6 mA RX, about 1.5 ms on air per packet"),
    Load("nRF52840 CPU: SPI read at 500 Hz, packing, BLE stack", 0.4,
         "nRF52840 PS: 3.3 mA running from flash, about 10 % duty"),
    Load("LDO + PMIC quiescent, LED at low duty, pull-ups", 0.3, "design estimate"),
]
RAIL_V = 3.0
BATT_V = 3.7
CONVERSION_EFF = 0.85       # buck from the cell to the 3 V rails
DESIGN_MARGIN = 1.5         # nobody's first current budget is right

ACTIVE_SECONDS_PER_RECORDING = 60.0   # connect, contact check, 10 s record, hand-off
HAPTIC_MAH_PER_RECORDING = 2 * (70.0 * 0.2 / 3600.0)   # two 0.2 s pulses at 70 mA

STANDBY_UA: list[Load] = [
    Load("nRF52840 System OFF, wake on button", 0.4 / 1000, "nRF52840 PS"),
    Load("PMIC with the 3 V rail off, battery monitor asleep", 1.0 / 1000, "BQ25120A class part"),
    Load("AFE rail switched off by the load switch (leakage)", 0.2 / 1000, "load-switch leakage"),
    Load("cell self-discharge, about 3 %/month of 100 mAh", 4.2 / 1000, "typical LiPo"),
]

USABLE_FRACTION = 0.8       # do not plan on the last 20 % of a small pouch cell

PROFILES = {
    "one patient at home (4 recordings/day)": 4,
    "shared in a clinic (60 recordings/day)": 60,
}


def active_ma_at_battery() -> float:
    rail_ma = sum(x.ma for x in ACTIVE) * DESIGN_MARGIN
    return rail_ma * RAIL_V / (BATT_V * CONVERSION_EFF)


def mah_per_recording() -> float:
    return active_ma_at_battery() * ACTIVE_SECONDS_PER_RECORDING / 3600.0 + HAPTIC_MAH_PER_RECORDING


def standby_mah_per_day() -> float:
    return sum(x.ma for x in STANDBY_UA) * 24.0


def days_per_charge(cell: Cell, recordings_per_day: int) -> float:
    per_day = recordings_per_day * mah_per_recording() + standby_mah_per_day()
    return cell.mah * USABLE_FRACTION / per_day


# --------------------------------------------------------------------------
# 4. Board area
# --------------------------------------------------------------------------
def footprint_area(side: str | None = None) -> float:
    """Area the parts claim, clearance included. A notch part claims area like any other."""
    return sum(p.area for p in PARTS if side is None or p.side == side)


def board_area(mode: str) -> float:
    """Outline area of a two-sided board that carries everything."""
    return footprint_area() * ROUTING_FACTOR[mode] / 2.0


def tallest(side: str) -> float:
    return max((p.h for p in PARTS if p.side == side), default=0.0)


def notch_height() -> float:
    """Tallest thing that stands in a board cut-out; it has the whole cavity height to itself."""
    return max((p.h for p in PARTS if p.side == "notch"), default=0.0)


# --------------------------------------------------------------------------
# 5. Mechanical stack -> envelope
# --------------------------------------------------------------------------
STRAP_WIDTH = 22.0          # mm, standard quick-release strap; sets the module width
PCB_T = 0.8                 # 6-layer 0.8 mm
SHELL = 1.2                 # mm, printed / moulded wall
PAD_PROUD = 0.3             # electrode pads stand this far out of each face
AIR = 0.3                   # assembly clearance between stacked items
SIDE_WALL = 1.5             # wall + seal land around the cavity
GAP = 0.8                   # between board and cell when they sit side by side
EDGE_CLR = 0.3              # assembly clearance between the contents and each cavity wall
BOARD_W = STRAP_WIDTH + 2.0  # across the strap; the cavity is a little wider than the strap


@dataclass(frozen=True)
class Envelope:
    layout: str
    cell: Cell
    mode: str
    length: float    # along the strap
    width: float     # across the strap
    thickness: float
    board_l: float
    board_w: float

    @property
    def volume_cm3(self) -> float:
        return self.length * self.width * self.thickness / 1000.0


# --------------------------------------------------------------------------
# 5a. Electrode faces (needed by the envelope)
# --------------------------------------------------------------------------
PAD_GAP = 2.0       # insulating land between neighbouring pads (sweat bridging)
PAD_EDGE = 2.5      # from the outer pads to the end of the face


LEG_PAD = (7.0, 21.0)       # LL1, RLD, LL2: along the strap x across it (as drawn in the render)
WRIST_PAD = (5.5, 21.0)     # LA1, LA2


def face_fits(face_len: float, pad_along: float, n: int) -> tuple[bool, float]:
    need = n * pad_along + (n - 1) * PAD_GAP + 2 * PAD_EDGE
    return need <= face_len, need


FACE_MIN_LENGTH = face_fits(0.0, LEG_PAD[0], 3)[1]   # the leg face with three pads sets the shortest module


MAX_WIDTH = 31.0            # across the strap; wider than this digs into the hand and the forearm


def envelope(layout: str, cell: Cell, mode: str) -> Envelope:
    """Smallest envelope for this layout, trying the cell both ways round."""
    if layout not in ("side by side", "stacked"):
        raise ValueError(layout)
    board_w = BOARD_W
    board_l = board_area(mode) / board_w
    board_stack = tallest("bot") + PCB_T + tallest("top")
    options: list[Envelope] = []
    for along, across in ((cell.w, cell.l), (cell.l, cell.w)):   # cell size along / across the strap
        if layout == "side by side":
            cav_l = board_l + GAP + along + 2 * EDGE_CLR   # cell next to the board
            cav_t = max(board_stack, cell.t) + AIR
        else:
            cav_l = max(board_l, along) + 2 * EDGE_CLR     # cell lies on the low side of the board
            cav_t = board_stack + AIR + cell.t + AIR
        cav_w = max(board_w, across) + 2 * EDGE_CLR
        cav_t = max(cav_t, notch_height() + AIR)
        options.append(Envelope(
            layout=layout, cell=cell, mode=mode,
            length=max(cav_l + 2 * SIDE_WALL, FACE_MIN_LENGTH),
            width=cav_w + 2 * SIDE_WALL,
            thickness=cav_t + 2 * SHELL + 2 * PAD_PROUD,
            board_l=board_l, board_w=board_w,
        ))
    narrow = [e for e in options if e.width <= MAX_WIDTH] or options
    return min(narrow, key=lambda e: e.volume_cm3)


def recommended() -> Envelope:
    """The layout the CAD model is built from: thin, cell beside the board, first-spin board."""
    cell = next(c for c in CELLS if c.code == "401225")
    return envelope("side by side", cell, "first spin")


# --------------------------------------------------------------------------
# 7. Mass
# --------------------------------------------------------------------------
def mass_grams(env: Envelope) -> dict[str, float]:
    shell_cm3 = (
        2 * env.length * env.width * SHELL            # two faces
        + 2 * (env.length + env.width) * (env.thickness - 2 * SHELL) * SIDE_WALL
    ) / 1000.0
    pads_cm3 = (3 * 7.0 * 21.0 * 0.8 + 2 * 5.5 * 21.0 * 0.8) / 1000.0
    strap_cm3 = STRAP_WIDTH * 2.5 * 190.0 / 1000.0
    return {
        "shell (PA12, 1.01 g/cm3)": shell_cm3 * 1.01,
        "electrode pads (316L, 8.0 g/cm3)": pads_cm3 * 8.0,
        "board with parts": env.board_l * env.board_w * PCB_T / 1000.0 * 1.85 + 1.6,
        "cell": env.cell.grams,
        "motor, contacts, screws, gasket": 1.8,
        "strap with flex and RA pads (silicone, 1.15 g/cm3)": strap_cm3 * 1.15 + 1.5,
    }


# --------------------------------------------------------------------------
# Report
# --------------------------------------------------------------------------
def report() -> str:
    out: list[str] = []
    w = out.append
    w("# Band alpha - size, battery and mass budget")
    w("")
    w(f"Generated by `system/budget.py` v{VERSION}. Do not edit by hand: change the numbers in the script and run it with `--write`.")
    w("")
    w("The module size is an output of this budget. The render (35 x 26 x ~6 mm) and the spec's MEC-01 (45 x 30 x 12 mm) were not derived from the parts.")
    w("")

    # ---- battery ---------------------------------------------------------
    w("## 1. Battery")
    w("")
    w("| Load while a recording is streamed | mA at 3 V | Source |")
    w("|---|---:|---|")
    for x in ACTIVE:
        w(f"| {x.name} | {x.ma:.2f} | {x.source} |")
    rail = sum(x.ma for x in ACTIVE)
    w(f"| **Sum** | **{rail:.2f}** | |")
    w("")
    w(f"With a x{DESIGN_MARGIN} design margin and a {CONVERSION_EFF:.0%} converter, that is **{active_ma_at_battery():.1f} mA from the cell**. "
      f"One recording keeps the device awake about {ACTIVE_SECONDS_PER_RECORDING:.0f} s, so it costs **{mah_per_recording():.3f} mAh** including two haptic pulses.")
    w("")
    w(f"Standby (radio off, AFE rail off, self-discharge included): **{standby_mah_per_day():.2f} mAh/day**.")
    w("")
    head = "| Cell | mAh | T x W x L mm | " + " | ".join(PROFILES) + " |"
    w(head)
    w("|---|---:|---|" + "---:|" * len(PROFILES))
    for c in CELLS:
        cols = " | ".join(f"{days_per_charge(c, n):.0f} days" for n in PROFILES.values())
        w(f"| {c.code} | {c.mah:.0f} | {c.t:.1f} x {c.w:.0f} x {c.l:.1f} | {cols} |")
    w("")
    w("Days between charges, using 80 % of the cell. A 10-second recording is so short that the spec's 150-300 mAh is far more than the device needs; "
      "an 80-100 mAh cell already gives a shared clinic device more than a week.")
    w("")

    # ---- board -----------------------------------------------------------
    w("## 2. Board area")
    w("")
    w("| Part | Qty | Footprint mm | Height mm | Side | Area with clearance mm2 |")
    w("|---|---:|---|---:|---|---:|")
    for p in PARTS:
        w(f"| {p.name} | {p.qty} | {p.l:.1f} x {p.w:.1f} | {p.h:.2f} | {p.side} | {p.area:.0f} |")
    w(f"| **Sum on the board** | | | | | **{footprint_area():.0f}** |")
    w("")
    for mode, k in ROUTING_FACTOR.items():
        a = board_area(mode)
        w(f"- **{mode}** (routing factor {k}): {a:.0f} mm2 of outline on a two-sided board = **{a / BOARD_W:.1f} x {BOARD_W:.0f} mm**.")
    w("")
    w(f"Tallest part on the high side {tallest('top'):.2f} mm (the radio module's shield), on the low side {tallest('bot'):.2f} mm. Board {PCB_T} mm.")
    w("")

    # ---- envelopes -------------------------------------------------------
    w("## 3. Module envelope")
    w("")
    w("Length runs along the strap, width across it, thickness through the wrist. Walls "
      f"{SHELL} mm, side wall with seal {SIDE_WALL} mm, pads {PAD_PROUD} mm proud on both faces.")
    w("")
    w("| Layout | Cell | Board | Length | Width | Thickness | Volume cm3 |")
    w("|---|---|---|---:|---:|---:|---:|")
    rows: list[Envelope] = []
    for layout in ("side by side", "stacked"):
        for cell in CELLS:
            for mode in ROUTING_FACTOR:
                e = envelope(layout, cell, mode)
                rows.append(e)
                w(f"| {layout} | {cell.code} ({cell.mah:.0f} mAh) | {mode} | {e.length:.1f} | {e.width:.1f} | {e.thickness:.1f} | {e.volume_cm3:.1f} |")
    w("")

    # ---- electrode faces -------------------------------------------------
    w("## 4. Do the electrode pads fit the faces?")
    w("")
    w(f"Pads run across the strap. Gap between pads {PAD_GAP} mm, {PAD_EDGE} mm from the last pad to the end of the face.")
    w("")
    w("| Face | Pads | Pad along the strap mm | Face length needed mm |")
    w("|---|---|---:|---:|")
    for face, names, pad, cnt in (("outer (leg)", "LL1, RLD, LL2", LEG_PAD[0], 3), ("inner (wrist)", "LA, LA, sensor window", WRIST_PAD[0], 3)):
        _, need = face_fits(1e9, pad, cnt)
        w(f"| {face} | {names} | {pad:.1f} | {need:.1f} |")
    w("")
    w("Every envelope in section 3 that is at least 30 mm long has room for the pads at the size drawn in the render "
      "(7.0 x 21 mm on the leg face). Whether that pad area is ENOUGH for a clean dry-contact signal is what stage 1 measures.")
    w("")

    # ---- mass ------------------------------------------------------------
    pick = recommended()
    w("## 5. Mass of the recommended layout")
    w("")
    w(f"Side by side, {pick.cell.code} cell, first-spin board: {pick.length:.1f} x {pick.width:.1f} x {pick.thickness:.1f} mm.")
    w("")
    w("| Item | g |")
    w("|---|---:|")
    total = 0.0
    for k, v in mass_grams(pick).items():
        total += v
        w(f"| {k} | {v:.1f} |")
    w(f"| **Total** | **{total:.1f}** |")
    w("")
    w("The spec allows 40 g with the strap.")
    w("")

    # ---- honesty ---------------------------------------------------------
    w("## 6. Numbers not yet re-read from a datasheet")
    w("")
    unverified = [p.name for p in PARTS if not p.verified] + [f"cell {c.code}" for c in CELLS if not c.verified] \
        + [x.name for x in ACTIVE + STANDBY_UA if not x.verified]
    for name in unverified:
        w(f"- {name}")
    w("")
    w(f"<!-- v{VERSION} - generated size, battery and mass budget -->")
    return "\n".join(out) + "\n"


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--write", action="store_true", help="rewrite system/BUDGET.md")
    args = ap.parse_args()
    text = report()
    print(text)
    if args.write:
        Path(__file__).with_name("BUDGET.md").write_text(text, encoding="utf-8", newline="\n")

# v0.1.0 - first bottom-up budget: battery from the duty cycle, board from footprints, envelope from the stack
