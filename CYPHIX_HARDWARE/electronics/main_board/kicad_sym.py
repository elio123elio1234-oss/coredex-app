"""Read KiCad symbol definitions (with 'extends' flattened) and their pins."""
import re
from pathlib import Path

KLIB = Path(r"C:/Users/elio1/AppData/Local/Programs/KiCad/10.0/share/kicad/symbols")
BS = chr(92)
_cache = {}


def block(text, i):
    depth, k, n = 0, i, len(text)
    while k < n:
        c = text[k]
        if c == '"':
            k += 1
            while text[k] != '"':
                if text[k] == BS:
                    k += 1
                k += 1
        elif c == '(':
            depth += 1
        elif c == ')':
            depth -= 1
            if depth == 0:
                return text[i:k + 1]
        k += 1
    raise ValueError("unbalanced")


def raw(lib, name):
    if lib not in _cache:
        _cache[lib] = (KLIB / f"{lib}.kicad_sym").read_text(encoding="utf-8")
    t = _cache[lib]
    m = re.search(r'\n\t\(symbol "%s"\n' % re.escape(name), t)
    if not m:
        raise KeyError(f"{lib}:{name}")
    return block(t, m.start() + 2)


def flat(lib, name):
    """The symbol text with its parent's body if it 'extends' another; sub-units renamed to `name`."""
    s = raw(lib, name)
    m = re.search(r'\(extends "([^"]+)"\)', s)
    if not m:
        return s
    parent = flat(lib, m.group(1))
    pname = m.group(1)
    # the parent's graphical/pin units, renamed
    units = []
    for um in re.finditer(r'\n\t\t\(symbol "%s_(\d+_\d+)"' % re.escape(pname), parent):
        u = block(parent, um.start() + 3)
        units.append(u.replace(f'(symbol "{pname}_', f'(symbol "{name}_', 1))
    # parent's header flags (pin_names, exclude_from_sim, in_bom, on_board) + child's properties
    head_flags = []
    for key in ("pin_numbers", "pin_names", "exclude_from_sim", "in_bom", "on_board"):
        km = re.search(r'\n\t\t\(%s\b' % key, parent)
        if km:
            head_flags.append(block(parent, km.start() + 3))
    props = [block(s, pm.start() + 3) for pm in re.finditer(r'\n\t\t\(property ', s)]
    # child lacks some properties? take them from the parent
    have = {re.match(r'\(property "([^"]+)"', p).group(1) for p in props}
    for pm in re.finditer(r'\n\t\t\(property ', parent):
        p = block(parent, pm.start() + 3)
        if re.match(r'\(property "([^"]+)"', p).group(1) not in have:
            props.append(p)
    body = "\n\t\t".join(head_flags + props + units)
    return f'(symbol "{name}"\n\t\t{body}\n\t)'


def pins(symtext):
    out = []
    for pm in re.finditer(r'\(pin (\w+) (\w+)', symtext):
        p = block(symtext, pm.start())
        at = re.search(r'\(at ([-\d.]+) ([-\d.]+) ?([-\d.]*)\)', p)
        name = re.search(r'\(name "([^"]*)"', p).group(1)
        num = re.search(r'\(number "([^"]*)"', p).group(1)
        unit = None
        out.append(dict(num=num, name=name, etype=pm.group(1), x=float(at.group(1)), y=float(at.group(2)),
                        a=float(at.group(3) or 0), hidden="(hide yes)" in p or " hide" in p.split("(name")[0]))
    return out


def units_pins(symtext, name):
    """{unit: [pins]} using the sub-symbol names NAME_U_S."""
    res = {}
    for um in re.finditer(r'\(symbol "%s_(\d+)_(\d+)"' % re.escape(name), symtext):
        u = int(um.group(1))
        b = block(symtext, um.start())
        res.setdefault(u, []).extend(pins(b))
    return res

# v0.1.0 - reads KiCad 10 library symbols (derived symbols flattened) and their pins, for make_schematic.py
