#!/usr/bin/env bash
# Pictures of the board: 3D renders of both faces and the copper of each routing layer, from KiCad's own plotter.
# Run from this folder after make_pcb.py. Needs kicad-cli (KiCad 10) and, for the PNGs, Chrome + puppeteer-core
# (the LANDING PAGE project's node_modules) through a small screenshot script passed as $1.
set -e
K="${KICAD_CLI:-/c/Users/elio1/AppData/Local/Programs/KiCad/10.0/bin/kicad-cli.exe}"
SHOT="$1"
B=band_alpha_main.kicad_pcb
mkdir -p pics
"$K" pcb render --side top --quality high --width 1600 --height 1300 -o pics/routed_top3d.png "$B" >/dev/null
"$K" pcb render --side bottom --quality high --width 1600 --height 1300 -o pics/routed_bottom3d.png "$B" >/dev/null
for L in F.Cu In2.Cu In3.Cu B.Cu; do
  "$K" pcb export svg -l "$L,Edge.Cuts" --mode-single --page-size-mode 2 --exclude-drawing-sheet -o "pics/layer_${L%%.*}.svg" "$B" >/dev/null
done
"$K" pcb export svg -l "F.Cu,In2.Cu,In3.Cu,B.Cu,Edge.Cuts" --mode-single --page-size-mode 2 --exclude-drawing-sheet -o pics/layer_all.svg "$B" >/dev/null
if [ -n "$SHOT" ]; then
  D="$(cd pics && pwd -W 2>/dev/null || pwd)"
  for n in layer_all layer_F layer_In2 layer_In3 layer_B; do
    node "$SHOT" "$D/$n.svg" "$D/$n.png" 1400 1140
  done
fi
echo "pictures in pics/"
# v0.1.0 - 3D renders of both faces + copper plots per routing layer (F, In2, In3, B) and all together
