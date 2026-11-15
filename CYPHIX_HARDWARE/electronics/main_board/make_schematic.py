"""CYPHIX Band alpha main board - schematic generator (rev 0.1, first wearable spin).

Every part and every connection of the board is written ONCE, in the tables below, and this script turns them
into a KiCad 10 schematic: each part is placed in its block, and every pin gets a net label (or a no-connect
flag) exactly on its connection point. The script then has KiCad itself read the file back (netlist export) and
checks that every pin landed on the net the table says, so a wrong coordinate can never silently join two nets.

Why a generator and not hand drawing: the board will change after stage 1 / stage 2 measurements (input
network values, buffers, power tree); a table is reviewable line by line, diffs cleanly in git, and the
drawing can always be regenerated. The output is an ordinary KiCad project: open it, move things, add
wires, route the board. (After hand edits, edit the drawing, not this script.)

The design brief is electronics/DESIGN_INTENT.md; every value and its source is in DESIGN_NOTES.md.

Run:   .venv/Scripts/python electronics/main_board/make_schematic.py
Makes: band_alpha_main.kicad_sch / .kicad_pro, bom.csv, erc.rpt, band_alpha_main.pdf / .svg (KiCad's own plot)
"""
from __future__ import annotations

import csv
import json
import math
import re
import subprocess
import sys
import uuid
from collections import defaultdict
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import kicad_sym as KS  # noqa: E402

NAME = "band_alpha_main"
REV = "0.1"
DATE = "2026-11-15"
CLI = Path(r"C:/Users/elio1/AppData/Local/Programs/KiCad/10.0/bin/kicad-cli.exe")
NS = uuid.UUID("6f1c0b7e-0d6a-4c39-9a1e-3c2b8f5e7a10")


def uid(*k) -> str:
    return str(uuid.uuid5(NS, "/".join(str(x) for x in k)))


ROOT = uid("root")
G = 1.27                                    # KiCad's connection grid
SX, SY = 1.3, 1.5                           # the tables use a compact layout; spread it over the A1 sheet


def snap(v: float) -> float:
    return round(round(v / G) * G, 4)


# ------------------------------------------------------------------ the sheet
lib_text: dict[str, str] = {}               # lib_id -> flattened library symbol
items: list[str] = []
parts: list[dict] = []
intent: dict[tuple[str, str], str] = {}     # (ref, pin) -> net, what the table says
refs_seen: set[str] = set()


def fx(s: str) -> str:
    return s.replace("\\", "\\\\").replace('"', '\\"')


def text(x, y, s, size=2.0, bold=False):
    x, y = x * SX, y * SY
    b = " (bold yes)" if bold else ""
    items.append(f'\t(text "{fx(s)}"\n\t\t(exclude_from_sim no)\n\t\t(at {snap(x)} {snap(y)} 0)\n'
                 f'\t\t(effects\n\t\t\t(font\n\t\t\t\t(size {size} {size}){b}\n\t\t\t)\n\t\t\t(justify left bottom)\n\t\t)\n'
                 f'\t\t(uuid "{uid("text", x, y, s)}")\n\t)')


def label(net, x, y, ang):
    just = "left bottom" if ang in (0, 90) else "right bottom"
    items.append(f'\t(label "{fx(net)}"\n\t\t(at {x} {y} {ang})\n\t\t(effects\n\t\t\t(font\n\t\t\t\t(size 1.27 1.27)\n\t\t\t)\n'
                 f'\t\t\t(justify {just})\n\t\t)\n\t\t(uuid "{uid("label", net, x, y)}")\n\t)')


def noconn(x, y):
    items.append(f'\t(no_connect\n\t\t(at {x} {y})\n\t\t(uuid "{uid("nc", x, y)}")\n\t)')


def _transform(px, py, rot):
    """Library point (y up) -> offset on the sheet (y down) for a symbol rotated `rot` degrees on screen."""
    u, v = px, -py
    for _ in range((rot // 90) % 4):
        u, v = v, -u                       # 90 degrees counter-clockwise on the screen (y down)
    return u, v


def _prop(name, value, x, y, hide=False, just=None, ang=0):
    h = "\n\t\t\t(hide yes)" if hide else ""
    j = f"\n\t\t\t\t(justify {just})" if just else ""
    return (f'\t\t(property "{name}" "{fx(value)}"\n\t\t\t(at {snap(x)} {snap(y)} {ang}){h}\n\t\t\t(effects\n\t\t\t\t(font\n'
            f'\t\t\t\t\t(size 1.27 1.27)\n\t\t\t\t){j}\n\t\t\t)\n\t\t)')


def place(lib_id: str, ref: str, value: str, x: float, y: float, nets: dict, fp: str | None = None,
          rot: int = 0, dnp: bool = False, note: str = "", bom: bool = True):
    """Put one part on the sheet. `nets` maps EVERY pin number to a net name, or to None for no-connect."""
    assert ref not in refs_seen, ref
    refs_seen.add(ref)
    lib, name = lib_id.split(":")
    if lib_id not in lib_text:
        t = KS.flat(lib, name)
        lib_text[lib_id] = t.replace(f'(symbol "{name}"', f'(symbol "{lib_id}"', 1)
    st = lib_text[lib_id]
    up = KS.units_pins(st, name)
    pins = up.get(0, []) + up.get(1, [])
    if not fp:
        m = re.search(r'\(property "Footprint" "([^"]*)"', st)
        fp = m.group(1) if m else ""
    x, y = snap(x * SX), snap(y * SY)
    nums = {p["num"] for p in pins}
    missing = nums - set(nets)
    extra = set(nets) - nums
    assert not missing and not extra, f"{ref} ({lib_id}): missing pins {sorted(missing)}, unknown pins {sorted(extra)}"
    done_pos = set()
    pin_lines = []
    for p in pins:
        dx, dy = _transform(p["x"], p["y"], rot)
        px, py = round(x + dx, 4), round(y + dy, 4)
        a = math.radians(p["a"])
        u, v = _transform(math.cos(a), math.sin(a), rot)       # pin direction (towards the body) on the sheet
        ang = {(1, 0): 180, (-1, 0): 0, (0, 1): 90, (0, -1): 270}[(round(u), round(v))]  # label points away
        net = nets[p["num"]]
        if (px, py) not in done_pos:
            done_pos.add((px, py))
            if net is None:
                noconn(px, py)
            else:
                label(net, px, py, ang)
        if net is not None:
            intent[(ref, p["num"])] = net
        pin_lines.append(f'\t\t(pin "{p["num"]}"\n\t\t\t(uuid "{uid("pin", ref, p["num"])}")\n\t\t)')
    # reference / value where the library puts them (rotated with the part)
    props = []
    if lib_id in ("Device:R", "Device:C", "Device:C_Polarized"):
        # two-pin passives: name above / value below when lying, both to the right when standing, never on top
        # of each other (the library's own positions overlap once the part is rotated)
        if rot % 180:
            # KiCad turns field text with the part: a field at 90 on a part turned 90 reads horizontally
            props.append(_prop("Reference", ref, x, y - 2.54, ang=90))
            props.append(_prop("Value", value, x, y + 2.54, ang=90))
        else:
            props.append(_prop("Reference", ref, x + 2.54, y - 1.27, just="left"))
            props.append(_prop("Value", value, x + 2.54, y + 1.27, just="left"))
    else:
        for pname, pval in (("Reference", ref), ("Value", value)):
            m = re.search(r'\(property "%s" "[^"]*"\s*\(at ([-\d.]+) ([-\d.]+)' % pname, st)
            ox, oy = (float(m.group(1)), float(m.group(2))) if m else (0.0, 0.0)
            dx, dy = _transform(ox, oy, rot)
            hide = pname == "Reference" and ref.startswith("#")
            props.append(_prop(pname, pval, x + dx, y + dy, hide=hide))
    props.append(_prop("Footprint", fp, x, y, hide=True))
    props.append(_prop("Datasheet", "", x, y, hide=True))
    if note:
        props.append(_prop("Note", note, x, y, hide=True))
    items.append(f'\t(symbol\n\t\t(lib_id "{lib_id}")\n\t\t(at {x} {y} {rot})\n\t\t(unit 1)\n\t\t(exclude_from_sim no)\n'
                 f'\t\t(in_bom {"yes" if bom else "no"})\n\t\t(on_board {"yes" if bom else "no"})\n\t\t(dnp {"yes" if dnp else "no"})\n'
                 f'\t\t(uuid "{uid("sym", ref)}")\n' + "\n".join(props) + "\n" + "\n".join(pin_lines) +
                 f'\n\t\t(instances\n\t\t\t(project "{NAME}"\n\t\t\t\t(path "/{ROOT}"\n\t\t\t\t\t(reference "{ref}")\n'
                 f'\t\t\t\t\t(unit 1)\n\t\t\t\t)\n\t\t\t)\n\t\t)\n\t)')
    if bom:
        parts.append(dict(ref=ref, value=value, footprint=fp, dnp=dnp, lib_id=lib_id, note=note))


# --------------------------------------------------------- passives helpers
R0402, C0402, C0603, C0805 = ("Resistor_SMD:R_0402_1005Metric", "Capacitor_SMD:C_0402_1005Metric",
                              "Capacitor_SMD:C_0603_1608Metric", "Capacitor_SMD:C_0805_2012Metric")
_n = defaultdict(int)


def nref(prefix):
    _n[prefix] += 1
    return f"{prefix}{_n[prefix]}"


def R(value, a, b, x, y, rot=90, fp=R0402, dnp=False, note=""):
    ref = nref("R")
    place("Device:R", ref, value, x, y, {"1": a, "2": b}, fp=fp, rot=rot, dnp=dnp, note=note)
    return ref


def C(value, a, b, x, y, rot=0, fp=C0402, dnp=False, note=""):
    ref = nref("C")
    place("Device:C", ref, value, x, y, {"1": a, "2": b}, fp=fp, rot=rot, dnp=dnp, note=note)
    return ref


_flag_n = 0


def pwr_flag(net, x, y):
    global _flag_n
    _flag_n += 1
    place("power:PWR_FLAG", f"#FLG{_flag_n:02d}", "PWR_FLAG", x, y, {"1": net}, bom=False)


# ============================================================ the board
GND, VBAT, V3D, V3A = "GND", "VBAT", "+3V0D", "+3V0A"

# ---------------------------------------------------------------- 1. battery and its protection
text(20, 22, "1  CELL + PROTECTION   (DW01A, two N-FETs in the cell's negative lead)", 2.4, True)
place("Device:Battery_Cell", "BT1", "LiPo 401225 ~100 mAh (no own PCM)", 30, 50, {"1": VBAT, "2": "CELL_N"},
      fp="", note="cell tabs soldered to pads at the board end; see mechanical/band_id.py")
place("Battery_Management:DW01A", "U1", "DW01A", 75, 50,
      {"1": "DW_OD", "2": "DW_CS", "3": "DW_OC", "4": None, "5": "DW_VCC", "6": "CELL_N"})
R("100", VBAT, "DW_VCC", 60, 32, note="DW01A supply filter (typical application)")
C("100n", "DW_VCC", "CELL_N", 105, 40)
R("1k", "DW_CS", GND, 105, 58, note="DW01A current-sense input to P-")
place("Transistor_FET:DMG1012T", "Q1", "DMG1012T", 60, 80, {"1": "DW_OD", "2": "CELL_N", "3": "PROT_MID"},
      note="discharge FET, source at the cell")
place("Transistor_FET:DMG1012T", "Q2", "DMG1012T", 95, 80, {"1": "DW_OC", "2": GND, "3": "PROT_MID"},
      note="charge FET, source at P- (board ground)")
C("4u7", VBAT, GND, 130, 50, fp=C0603)
pwr_flag(GND, 150, 34)
pwr_flag("CELL_N", 40, 66)
pwr_flag("DW_VCC", 60, 22)

# ---------------------------------------------------------------- 2. charging: two contacts, either way round, isolated
text(170, 22, "2  CHARGING   two contacts, either polarity; both float unless the stand is there (SAF-01)", 2.4, True)
place("Connector:TestPoint", "TP1", "charge contact A", 180, 45, {"1": "CHG_A"}, fp="TestPoint:TestPoint_Pad_D2.0mm",
      note="flush 2 mm contact in the black centre, wrist face")
place("Connector:TestPoint", "TP2", "charge contact B", 180, 75, {"1": "CHG_B"}, fp="TestPoint:TestPoint_Pad_D2.0mm",
      note="flush 2 mm contact in the black centre, wrist face")
place("Diode:MBR0520", "D1", "MBR0520", 205, 40, {"2": "CHG_A", "1": "BR_P"})
place("Diode:MBR0520", "D2", "MBR0520", 205, 55, {"2": "CHG_B", "1": "BR_P"})
place("Diode:MBR0520", "D3", "MBR0520", 205, 70, {"2": "BR_N", "1": "CHG_A"})
place("Diode:MBR0520", "D4", "MBR0520", 205, 85, {"2": "BR_N", "1": "CHG_B"})
place("Diode:PESD5V0S1UL", "D5", "PESD5V0S1UL", 230, 62, {"1": "BR_P", "2": "BR_N"}, rot=90,
      note="ESD across the bridge output; leaks only inside the bridge loop, never to circuit ground")
place("Power_Supervisor:TPS3839DBZ", "U2", "TPS3839K33DBZR", 255, 45, {"3": "BR_P", "1": GND, "2": "CHG_PG"},
      note="VIT ~3.08 V (K33, to confirm); ~150 nA from BR_P is the only DC path from a contact when not charging")
R("1M", "CHG_PG", GND, 275, 60, rot=0)
place("Transistor_FET:AO3401A", "Q3", "AO3401A", 300, 40, {"1": "Q3_G", "2": "BR_P", "3": "VCHG"},
      note="high-side switch: P-FET, source at the bridge, body diode blocks contact <- charger")
R("1M", "Q3_G", "BR_P", 320, 28, rot=0)
place("Transistor_FET:DMG1012T", "Q4", "DMG1012T", 300, 70, {"1": "CHG_PG", "2": GND, "3": "Q3_G"},
      note="turns Q3 on when the supervisor sees the stand")
place("Transistor_FET:DMG1012T", "Q5", "DMG1012T", 255, 85, {"1": "CHG_PG", "2": GND, "3": "BR_N"},
      note="return switch; its body diode closes the loop for the supervisor's first start")
R("1M", "VCHG", GND, 335, 55, rot=0)
C("4u7", "VCHG", GND, 345, 55, fp=C0603)
place("Battery_Management:MCP73831-2-OT", "U3", "MCP73831-2-OT", 370, 50,
      {"4": "VCHG", "2": GND, "3": VBAT, "5": "CHG_PROG", "1": "CHG_STAT_RAW"},
      note="4.20 V linear charger; IREG = 1000 V / RPROG")
R("20k", "CHG_PROG", GND, 390, 70, rot=0, note="RPROG: 1000 V / 20 kOhm = 50 mA (0.5 C)")
C("4u7", VBAT, GND, 400, 50, fp=C0603)
R("100k", "CHG_STAT_RAW", "CHG_STAT", 405, 80, note="STAT swings to VCHG (4.4 V): divider to the 3.0 V GPIO")
R("200k", "CHG_STAT", GND, 420, 90, rot=0)
R("100k", "CHG_PG", "VBUS_DET", 275, 90, note="CHG_PG ~4.4 V when charging -> 2.9 V at the GPIO")
R("200k", "VBUS_DET", GND, 285, 100, rot=0)
pwr_flag("BR_P", 220, 30)
pwr_flag("VCHG", 330, 38)

# ---------------------------------------------------------------- 3. rails
text(450, 22, "3  RAILS   +3V0D always on (1 uA LDO)   +3V0A switched, low noise, ADS1294 only", 2.4, True)
place("Regulator_Linear:XC6206PxxxMR", "U4", "XC6206P302MR", 480, 50, {"3": VBAT, "2": V3D, "1": GND},
      note="3.0 V, ~1 uA quiescent: nRF52840, ADS1294 DVDD, sensors")
C("1u", VBAT, GND, 465, 62)
C("1u", V3D, GND, 497, 62)
place("Regulator_Linear:LP5907MFX-3.0", "U5", "LP5907MFX-3.0", 540, 50,
      {"1": VBAT, "2": GND, "3": "AFE_PWR_EN", "4": None, "5": V3A},
      note="6.5 uVrms low-noise LDO, on only while recording (EN from the nRF)")
C("1u", VBAT, GND, 522, 66)
C("1u", V3A, GND, 560, 66)
R("100k", "AFE_PWR_EN", GND, 530, 80, rot=0, note="keeps the analog rail off until firmware asks")
R("10M", VBAT, "VBAT_SENSE", 590, 45, rot=0, note="battery divider, 0.21 uA always")
R("10M", "VBAT_SENSE", GND, 590, 65, rot=0)
C("100n", "VBAT_SENSE", GND, 603, 65, note="sampling reservoir for the SAADC (high-impedance divider)")

# ---------------------------------------------------------------- 4. electrodes and input network
text(20, 128, "4  ELECTRODES + INPUT NETWORK   pad -> TVS -> 2 x 47.5k 0.1 % -> 1 nF C0G -> [buffer DNP / 0 Ohm] -> ADS1294", 2.4, True)
text(20, 134, "Single fault (pin to a 3.0 V rail): 3.0 V / 95 kOhm = 32 uA < 50 uA DC (IEC 60601-1, single fault). Lead-off: ADS1294 internal, lowest current.", 1.6)
LINES = [("RA1", "strap top, right-hand finger 1 (FPC pin 1)"), ("RA2", "strap top, right-hand finger 2 (FPC pin 3)"),
         ("LA", "wrist face, two pads on one net (spring contacts SC1, SC2)"),
         ("LL1", "leg face, left leg (spring contact SC3)"), ("LL2", "leg face, left leg (spring contact SC4)")]
row_y = 155
for i, (e, where) in enumerate(LINES):
    y = row_y + i * 27
    text(58, y - 7, f"{e}: {where}", 1.5)
    R("47.5k 0.1%", f"{e}_PAD", f"{e}_S", 70, y, note="patient series resistance, half 1 (matched 0.1 %)")
    R("47.5k 0.1%", f"{e}_S", f"{e}_F", 92, y, note="patient series resistance, half 2")
    C("1n C0G", f"{e}_F", GND, 108, y + 6, note="common-mode RC with 95 kOhm: fc = 1.7 kHz")
    R("0", f"{e}_F", f"{e}_ADC", 130, y, note="buffer bypass (populated)")
    place("Amplifier_Operational:AD8603", nref("U") if False else f"U{20 + i}", "AD8603", 160, y + 2,
          {"3": f"{e}_F", "4": f"{e}_BUF", "1": f"{e}_BUF", "5": V3A, "2": GND}, dnp=True,
          note="ELC-03 optional unity-gain buffer, 1 pA bias; populate only if stage 1/2 ask for it")
    R("0", f"{e}_BUF", f"{e}_ADC", 190, y, dnp=True, note="buffer output link (DNP with the buffer)")
# RLD output line
y = row_y + 5 * 27
text(58, y - 7, "RLD: leg face, between LL1 and LL2 (spring contact SC5)", 1.5)
R("100k", "RLD_OUT", "RLD_S", 70, y, note="RLD series resistance, half 1: fault 3.0 V / 200 kOhm = 15 uA")
R("100k", "RLD_S", "RLD_PAD", 92, y, note="RLD series resistance, half 2")
# pads: FPC to the strap, spring contacts on the island
place("Connector_Generic:Conn_01x04", "J1", "FPC 4p 0.5 mm, Amphenol F32Q (strap flex)", 30, 160,
      {"1": "RA1_PAD", "2": "STRAP_GUARD", "3": "RA2_PAD", "4": None},
      fp="Connector_FFC-FPC:Amphenol_F32Q-1A7x1-11004_1x04-1MP_P0.5mm_Horizontal",
      note="the strap's flex: RA1 trace | guard | RA2 trace (mechanical/band_id.py)")
R("0", "STRAP_GUARD", GND, 30, 182, rot=0, note="guard trace to AVSS; option: drive it from the RLD reference later")
for k, (net, what) in enumerate((("LA_PAD", "LA pad 1"), ("LA_PAD", "LA pad 2"), ("LL1_PAD", "LL1"), ("LL2_PAD", "LL2"),
                                 ("RLD_PAD", "RLD"))):
    place("Connector:TestPoint", f"SC{k + 1}", f"spring contact {what}", 30, 205 + k * 14,
          {"1": net}, fp="TestPoint:TestPoint_Pad_1.5x1.5mm", note="gold spring contact to the 316L plate")
# ESD on every pad, low leakage, to ground
place("Power_Protection:TPD4E02B04DQA", "U10", "TPD4E02B04DQA", 230, 175,
      {"1": "RA1_PAD", "2": "RA2_PAD", "4": "LA_PAD", "5": "LL1_PAD", "3": GND, "8": GND,
       "6": None, "7": None, "9": None, "10": None}, note="ESD, 0.25 pF, low leakage")
place("Power_Protection:TPD4E02B04DQA", "U11", "TPD4E02B04DQA", 230, 225,
      {"1": "LL2_PAD", "2": "RLD_PAD", "4": None, "5": None, "3": GND, "8": GND,
       "6": None, "7": None, "9": None, "10": None}, note="ESD, 0.25 pF, low leakage")

# ---------------------------------------------------------------- 5. AFE
text(270, 128, "5  AFE   TI ADS1294 (ADS1298 symbol: same TQFP-64 pin table)   CH1 LA-RA1  CH2 LA-RA2  CH3 LL1-LA  CH4 LL2-LA", 2.4, True)
text(270, 134, "1 kSPS HR mode, decimated to 500 SPS in firmware (-3 dB = 0.262 fDR); internal 2.4 V reference, internal 2.048 MHz clock, internal RLDREF.", 1.6)
ads = {
    "16": "LA_ADC", "15": "RA1_ADC", "14": "LA_ADC", "13": "RA2_ADC", "12": "LL1_ADC", "11": "LA_ADC",
    "10": "LL2_ADC", "9": "LA_ADC",
    "1": V3A, "2": V3A, "3": V3A, "4": V3A, "5": V3A, "6": V3A, "7": V3A, "8": V3A,   # IN5..IN8 unused -> AVDD
    "17": None, "18": None,                                                          # TESTP/TESTN_PACE: unused
    "19": V3A, "21": V3A, "22": V3A, "56": V3A, "59": V3A, "54": V3A,                # AVDD, AVDD1
    "20": GND, "23": GND, "32": GND, "57": GND, "58": GND, "53": GND,                # AVSS, AVSS1
    "24": "VREFP", "25": GND, "26": "VCAP4", "27": None, "28": "VCAP1", "29": None, "30": "VCAP2", "55": "VCAP3",
    "31": GND,                                                                       # RESV1 -> DGND
    "33": GND, "49": GND, "51": GND, "48": V3D, "50": V3D,                           # DGND, DVDD
    "34": "ADS_DIN", "35": "ADS_PWDN", "36": "ADS_RESET", "37": "ADS_CLK", "38": "ADS_START", "39": "ADS_CS",
    "40": "ADS_SCLK", "41": GND, "42": GND, "43": "ADS_DOUT", "44": GND, "45": GND, "46": GND, "47": "ADS_DRDY",
    "52": "ADS_CLKSEL", "60": None, "61": "RLD_INV", "62": V3A, "63": "RLD_OUT", "64": "WCT",
}
place("Analog_ADC:ADS1298xPAG", "U6", "ADS1294IPAG", 330, 210, ads, fp="Package_QFP:TQFP-64_10x10mm_P0.5mm",
      note="ADS1294IPAG first spin (visible joints); NFBGA later")
cx = 385
for k, (val, a, fpp, why) in enumerate((("1u", V3A, C0402, "AVDD"), ("100n", V3A, C0402, "AVDD"),
                                         ("1u", V3A, C0402, "AVDD"), ("100n", V3A, C0402, "AVDD"),
                                         ("1u", V3A, C0402, "AVDD1, star to AVDD"), ("100n", V3A, C0402, "AVDD1"),
                                         ("1u", V3D, C0402, "DVDD"), ("100n", V3D, C0402, "DVDD"))):
    C(val, a, GND, cx + k * 9, 160, fp=fpp, note=f"{why} bypass (SBAS459K sec. 11)")
C("10u", "VREFP", GND, cx, 185, fp=C0603, note="VREFP-VREFN 10 uF || 0.1 uF (SBAS459K Fig. 106)")
C("100n", "VREFP", GND, cx + 9, 185)
place("Device:C_Polarized", "C90", "22u tantalum", cx + 20, 185, {"1": "VCAP1", "2": GND},
      fp="Capacitor_Tantalum_SMD:CP_EIA-2012-12_Kemet-R",
      note="VCAP1 22 uF: tantalum, NOT X5R/X7R - the motor vibrates the board (SBAS459K sec. 11)")
C("1u", "VCAP2", GND, cx + 30, 185, note="VCAP2")
C("1u", "VCAP3", GND, cx + 39, 185, note="VCAP3 (AVDD + 1.9 V charge pump)")
C("1u", "VCAP4", GND, cx + 48, 185, note="VCAP4")
C("1n", "WCT", GND, cx + 57, 185, note="WCT (Fig. 106); WCT amplifiers stay powered down")
# RLD feedback
R("1M", "RLD_INV", "RLD_OUT", cx + 5, 215, note="RLD integrator, TI example value; stability check in DESIGN_NOTES.md")
C("1.5n", "RLD_INV", "RLD_OUT", cx + 5, 228, rot=90, note="RLD integrator capacitor")
# clock: internal by default, footprints for an external 2.048 MHz oscillator
R("0", "ADS_CLKSEL", V3D, cx + 25, 215, note="CLKSEL high = internal 2.048 MHz oscillator")
R("0", "ADS_CLKSEL", GND, cx + 25, 228, dnp=True, note="fit instead of the one above for an external clock")
place("Oscillator:ASDMB-xxxMHz", "Y2", "ASDMB-2.048MHz", cx + 52, 225,
      {"4": V3D, "1": V3D, "2": GND, "3": "OSC_OUT"}, dnp=True,
      note="external 2.048 MHz option if the internal oscillator's tolerance shows as a heart-rate error")
R("0", "OSC_OUT", "ADS_CLK", cx + 52, 245, dnp=True)
place("Connector:TestPoint", "TP3", "ADS_CLK", cx + 70, 240, {"1": "ADS_CLK"}, fp="TestPoint:TestPoint_Pad_D1.0mm")

# ---------------------------------------------------------------- 6. controller + radio
text(470, 128, "6  CONTROLLER + RADIO   Raytac MDBT50Q-1MV2 (nRF52840), normal-voltage mode: VDD = VDDH = +3V0D", 2.4, True)
text(470, 134, "-U1MV2 (RF pad / u.FL) has the same pinout: the choice of antenna is open (RF engineer). USB unused: VBUS to GND, D+/D- open.", 1.6)
nrf_used = {
    "42": "ADS_SCLK", "44": "ADS_DIN", "43": "ADS_DOUT", "41": "ADS_CS", "46": "ADS_DRDY", "45": "ADS_START",
    "48": "ADS_RESET", "49": "ADS_PWDN", "50": "AFE_PWR_EN",
    "27": "I2C_SDA", "29": "I2C_SCL", "22": "PPG_INT", "24": "TEMP_ALERT",
    "11": "VBAT_SENSE", "9": "TOUCH", "23": "VBUS_DET", "19": "CHG_STAT",
    "37": "LED_EN", "36": "MOTOR_EN",
    "17": "XL1", "18": "XL2", "40": "NRF_RESET", "51": "SWDIO", "53": "SWDCLK", "47": "SWO",
    "28": V3D, "30": V3D, "31": None, "32": GND, "34": None, "35": None,
    "1": GND, "2": GND, "15": GND, "33": GND, "55": GND,
}
nrf_sym = KS.flat("RF_Module", "MDBT50Q-1MV2")
nrf_all = {p["num"] for u, l in KS.units_pins(nrf_sym, "MDBT50Q-1MV2").items() for p in l}
nrf = {n: nrf_used.get(n) for n in nrf_all}
place("RF_Module:MDBT50Q-1MV2", "U7", "MDBT50Q-1MV2", 520, 210, nrf,
      note="pin map to be reviewed against the nRF52840 PS 'pin assignments' (high-speed SPI on P0.17/19-22)")
C("4u7", V3D, GND, 570, 160, fp=C0603, note="module supply")
C("100n", V3D, GND, 579, 160)
place("Device:Crystal", "Y1", "32.768 kHz, CL 9 pF", 580, 200, {"1": "XL1", "2": "XL2"},
      fp="Crystal:Crystal_SMD_2012-2Pin_2.0x1.2mm", note="LF clock for BLE timing (Raytac reference X2)")
C("12p C0G", "XL1", GND, 572, 212)
C("12p C0G", "XL2", GND, 588, 212)
place("Connector:Conn_ARM_SWD_TagConnect_TC2030-NL", "J2", "TC2030-NL", 600, 240,
      {"1": V3D, "2": "SWDIO", "3": "NRF_RESET", "4": "SWDCLK", "5": GND, "6": "SWO"},
      note="factory programming / debug pads inside the housing (no exposed contacts)")

# ---------------------------------------------------------------- 7. user interface
text(470, 280, "7  USER INTERFACE   light line, haptic, touch zone", 2.4, True)
place("Device:LED", "D6", "white 0402", 490, 300, {"2": "LED_A", "1": "LED_K"}, rot=0, fp="LED_SMD:LED_0402_1005Metric",
      note="light line in the frame, behind a light pipe")
R("330", VBAT, "LED_A", 478, 290, rot=0, note="(3.6 V - 2.8 V) / 330 Ohm ~ 2.4 mA")
place("Transistor_FET:DMG1012T", "Q6", "DMG1012T", 505, 318, {"1": "LED_EN", "2": GND, "3": "LED_K"},
      note="LED from VBAT through a FET: a white LED needs more than the 3.0 V rail")
place("Motor:Motor_DC", "M1", "coin motor 8 mm", 545, 300, {"1": VBAT, "2": "MOT_N"}, fp="",
      note="ERM coin motor on the leg side of the board, solder pads")
place("Diode:MBR0520", "D7", "MBR0520", 560, 300, {"1": VBAT, "2": "MOT_N"}, rot=90, note="flyback")
place("Transistor_FET:DMG1012T", "Q7", "DMG1012T", 555, 320, {"1": "MOT_G", "2": GND, "3": "MOT_N"})
R("1k", "MOTOR_EN", "MOT_G", 535, 332)
R("100k", "MOT_G", GND, 548, 340, rot=0)
place("Connector:TestPoint", "TP4", "touch zone", 590, 300, {"1": "TOUCH_PAD"}, fp="TestPoint:TestPoint_Pad_2.0x2.0mm",
      note="capacitive electrode under the frame round the light line (proposal, not yet approved)")
R("1k", "TOUCH_PAD", "TOUCH", 600, 315, note="series resistor; sensing by the nRF's COMP (values set at bring-up)")

# ---------------------------------------------------------------- 8. options
text(270, 280, "8  OPT-01 (DNP until decided)   skin temperature TMP117 + PPG MAX30102, both on I2C", 2.4, True)
place("Sensor_Temperature:TMP117xxDRV", "U8", "TMP117AIDRVR", 300, 310,
      {"1": "I2C_SCL", "2": GND, "3": "TEMP_ALERT", "4": GND, "5": V3D, "6": "I2C_SDA"}, dnp=True,
      note="+-0.1 C, coupled to the sapphire window through a thermal pad; I2C 0x48")
C("100n", V3D, GND, 320, 300, dnp=True)
R("4.7k", "I2C_SDA", V3D, 335, 300, rot=0, dnp=True, note="I2C pull-up (fit with either option)")
R("4.7k", "I2C_SCL", V3D, 345, 300, rot=0, dnp=True)
R("10k", "TEMP_ALERT", V3D, 355, 300, rot=0, dnp=True)
place("Sensor:MAX30102", "U9", "MAX30102", 390, 320,
      {"1": None, "2": "I2C_SCL", "3": "I2C_SDA", "4": GND, "5": None, "6": None, "7": None, "8": None,
       "9": VBAT, "10": VBAT, "11": "+1V8_PPG", "12": GND, "13": "PPG_INT", "14": None}, dnp=True,
      note="integrated PPG (LEDs + photodiode + AFE) on the boss inside the window; SDA/SCL/INT tolerate 3.0 V pull-ups (to confirm)")
R("10k", "PPG_INT", V3D, 415, 300, rot=0, dnp=True)
C("10u", VBAT, GND, 405, 300, fp=C0603, dnp=True, note="VLED+ reservoir")
place("Regulator_Linear:XC6206PxxxMR", "U12", "XC6206P182MR", 360, 340, {"3": VBAT, "2": "+1V8_PPG", "1": GND}, dnp=True,
      note="1.8 V for the PPG's VDD")
C("1u", "+1V8_PPG", GND, 377, 350, dnp=True)

# ============================================================ write
def write():
    lib = "\n".join("\t\t" + t.replace("\n", "\n\t") for t in lib_text.values())
    body = "\n".join(items)
    sch = f"""(kicad_sch
	(version 20250610)
	(generator "eeschema")
	(generator_version "10.0")
	(uuid "{ROOT}")
	(paper "A1")
	(title_block
		(title "CYPHIX Band alpha - main board")
		(date "{DATE}")
		(rev "{REV}")
		(company "CYPHIX")
		(comment 1 "First wearable spin (stage 3). Generated by make_schematic.py from one parts/nets table.")
		(comment 2 "Brief: electronics/DESIGN_INTENT.md. Values and sources: DESIGN_NOTES.md.")
		(comment 3 "NOT reviewed yet: a person with electronics experience reviews it before any board is ordered.")
	)
	(lib_symbols
{lib}
	)
{body}
	(sheet_instances
		(path "/"
			(page "1")
		)
	)
	(embedded_fonts no)
)
"""
    (HERE / f"{NAME}.kicad_sch").write_text(sch, encoding="utf-8")
    # project library tables: only KiCad's stock libraries, through KiCad's own path variables, so ERC can also
    # check that every symbol and footprint named here exists
    slibs = sorted({k.split(":")[0] for k in lib_text})
    flibs = sorted({p["footprint"].split(":")[0] for p in parts if ":" in p["footprint"]})
    (HERE / "sym-lib-table").write_text("(sym_lib_table\n\t(version 7)\n" + "".join(
        f'\t(lib (name "{n}")(type "KiCad")(uri "${{KICAD10_SYMBOL_DIR}}/{n}.kicad_sym")(options "")(descr ""))\n'
        for n in slibs) + ")\n", encoding="utf-8")
    (HERE / "fp-lib-table").write_text("(fp_lib_table\n\t(version 7)\n" + "".join(
        f'\t(lib (name "{n}")(type "KiCad")(uri "${{KICAD10_FOOTPRINT_DIR}}/{n}.pretty")(options "")(descr ""))\n'
        for n in flibs) + ")\n", encoding="utf-8")
    pro = HERE / f"{NAME}.kicad_pro"
    if not pro.exists():
        pro.write_text(json.dumps({"meta": {"filename": f"{NAME}.kicad_pro", "version": 1},
                                   "sheets": [[ROOT, "Root"]]}, indent=2), encoding="utf-8")


def bom():
    rows = defaultdict(list)
    for p in parts:
        rows[(p["value"], p["footprint"], p["dnp"])].append(p["ref"])
    with open(HERE / "bom.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["qty", "value", "footprint", "fit", "references"])
        for (v, fp, dnp), refs in sorted(rows.items(), key=lambda kv: (kv[0][2], kv[1][0])):
            w.writerow([len(refs), v, fp, "DNP" if dnp else "fit", " ".join(sorted(refs, key=lambda r: (re.sub(r"\d", "", r), int(re.sub(r"\D", "", r) or 0))))])
    return len(parts)


def verify():
    """KiCad reads the file back; every pin must sit on the net the table gave it."""
    net = HERE / f"{NAME}.net"
    subprocess.run([str(CLI), "sch", "export", "netlist", "--format", "kicadsexpr", "-o", str(net),
                    str(HERE / f"{NAME}.kicad_sch")], check=True, capture_output=True)
    t = net.read_text(encoding="utf-8")
    got = {}
    for chunk in re.split(r'\(net\s+\(code', t)[1:]:
        name = re.search(r'\(name "([^"]*)"\)', chunk).group(1).lstrip("/")
        for nm in re.finditer(r'\(node\s+\(ref "([^"]+)"\)\s+\(pin "([^"]+)"\)', chunk):
            got[(nm.group(1), nm.group(2))] = name
    bad = [(k, v, got.get(k)) for k, v in intent.items() if not k[0].startswith("#") and got.get(k) != v]
    net.unlink()
    return bad, len(got)


def erc():
    rpt = HERE / "erc.rpt"
    subprocess.run([str(CLI), "sch", "erc", "--severity-error", "--severity-warning", "-o", str(rpt),
                    str(HERE / f"{NAME}.kicad_sch")], capture_output=True)
    t = rpt.read_text(encoding="utf-8", errors="replace") if rpt.exists() else ""
    return t


def plot():
    for fmt in ("pdf", "svg"):
        out = HERE / (f"{NAME}.pdf" if fmt == "pdf" else "svg")
        subprocess.run([str(CLI), "sch", "export", fmt, "-o", str(out), str(HERE / f"{NAME}.kicad_sch")],
                       check=True, capture_output=True)


if __name__ == "__main__":
    write()
    n = bom()
    bad, seen = verify()
    print(f"{n} parts, {len(set(intent.values()))} nets, {seen} pins read back by KiCad")
    if bad:
        print("PIN/NET MISMATCHES:")
        for k, want, have in bad[:40]:
            print("  ", k, "want", want, "have", have)
    t = erc()
    m = re.search(r"\*\* ERC messages: (\d+)\s+Errors (\d+)\s+Warnings (\d+)", t)
    print("ERC:", m.group(0) if m else t[-400:])
    if "--plot" in sys.argv:
        plot()

# v0.1.0 - main board rev 0.1: cell + DW01A protection, polarity-free isolated charging (bridge, TPS3839, back-to-back switches, MCP73831), 1 uA digital LDO + switched low-noise analog LDO, five electrode lines (TVS, 2 x 47.5k, 1 nF, DNP buffer), RLD, ADS1294, MDBT50Q, crystal, SWD, LED, motor, touch, OPT-01 sensors
