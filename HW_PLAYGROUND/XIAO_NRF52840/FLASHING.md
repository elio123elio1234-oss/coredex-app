# FLASHING — XIAO nRF52840 playground build

> ⚠ **Do not trust a remembered COM number.** The rule in
> `../flashing/FLASHING.md` ("COM7 = the prototype, never flash it") was written
> when the ESP32 held that port. On 2026-09-09 **COM7 enumerated as the XIAO**
> (`USB\VID_2886&PID_8045`, VID 2886 = Seeed) with the ESP prototype unplugged.
> Windows reassigns COM numbers per device, per port. **Identify by VID/PID, every
> time** — step 1 below.

---

## Step 0 — wire it

See [WIRING.md](WIRING.md). Do not skip the `VUSB` multimeter check in §3.

## Step 1 — identify the board (never skip)

```powershell
Get-CimInstance Win32_PnPEntity |
  Where-Object { $_.Name -match 'COM\d+' } |
  Select-Object Name, DeviceID | Format-List
```

| You are looking at | VID / PID |
|---|---|
| **Seeed XIAO nRF52840** (this project) | `VID_2886` · `PID_8045` |
| Seeed XIAO RP2040 | `VID_2E8A` |
| ESP32 DevKit, CP2102 bridge | `VID_10C4` |
| ESP32 DevKit, CH340 bridge | `VID_1A86` |

Only flash a port whose DeviceID starts `USB\VID_2886`.

## Step 2 — build

```powershell
cd C:\Users\elio1\Desktop\Coredex_App\HW_PLAYGROUND\XIAO_NRF52840
C:\Users\elio1\.platformio\penv\Scripts\pio.exe run
```

The first build downloads the `nordicnrf52` platform and the Adafruit nRF52
core (Bluefruit ships inside it — there are no `lib_deps`). Later builds are fast.

`platformio.ini` is set to `board = xiaoblesense_adafruit`, because this unit
reported USB PID `0x8045` under its factory firmware — that is the Sense; the
plain XIAO is `0x8044`. If yours is the plain one, switch to
`board = xiaoble_adafruit`. No wiring changes either way: the two variants'
`D0..D10` and SPI pin maps were diffed and are identical, and this firmware
never touches the IMU/microphone that separates them.

A clean build ends with roughly:

```
RAM:   [=         ]   6.1% (used 14524 bytes from 237568 bytes)
Flash: [==        ]  15.3% (used 124212 bytes from 811008 bytes)
============================= [SUCCESS] =============================
```

## Step 3 — upload

The XIAO does not take an ESP-style serial flash. This board definition uploads
with **`nrfutil` DFU over the USB serial port**, and PlatformIO drives the whole
thing for you — including the 1200 bps "touch" that reboots the board into its
bootloader first:

> ⚠ **`COMx` is not a port.** Substitute the real one from step 1. Pasting the
> placeholder verbatim fails with `could not open port 'COMx'` — and because
> nothing then gets flashed, the board never advertises, so the next symptom
> looks like "Bluetooth cannot find the device". That exact sequence already
> cost one debugging round here.

```powershell
C:\Users\elio1\.platformio\penv\Scripts\pio.exe run -t upload --upload-port COM7
```

(`COM7` was the port on 2026-09-09 — check it against step 1 before every
upload, it moves.) The bootloader re-enumerates on a *different* port mid-upload;
PlatformIO follows it by itself, so the number above is only the starting point.

If the 1200 bps touch does not take (the port never re-enumerates), **double-tap
the RESET button** — quickly, twice — to force the bootloader, then re-run.

> A note on UF2: this build emits `firmware.elf`, `firmware.hex` and
> `firmware.zip` (the nrfutil DFU package) — **it does not produce a `.uf2`**, so
> there is no file to drag onto the bootloader drive. Drag-and-drop is only an
> option if you convert the hex yourself with Microsoft's `uf2conv.py`. The
> nrfutil path above is the supported one; use it.

## Step 4 — serial check

```powershell
C:\Users\elio1\.platformio\penv\Scripts\pio.exe device monitor -p COM10 -b 115200
```

(again: confirm the port from step 1 — after a flash it is usually **not** the
one you uploaded to. It was `COM10` after the 2026-09-09 upload.)

The banner only prints if a terminal attaches within ~2 s of boot, so on an
already-running board you drop straight into the CSV stream instead. That is not
a fault: if CSV lines are flowing at all then `REVID` already read back `0x01`,
because the firmware refuses to sample otherwise.

Expected:

```
=== CYPHIX HW_PLAYGROUND - XIAO nRF52840 ===
[BLE] advertising as CYPHIX-XIAO
ADS1293 init (preset 0): OK | REVID=0x01
Serial CSV: ch1_uV,ch2_uV,ch3_uV,combined_uV,lod_raw,count @ 320 Hz
```

`REVID` must be `0x01`. Anything else is SPI wiring — the firmware prints the
pads to check. The usual culprit is `SDI`/`SDO` swapped (they are named from the
ADS module's point of view: `SDI` → pad **10**, `SDO` → pad **9**).

The USB CSV stream is written only while a terminal actually has the port open,
so leaving the board unattended costs nothing.

## Step 5 — GUI

**Double-click `OPEN_GUI.bat`** (or the **CYPHIX XIAO GUI** shortcut on the
Desktop). It starts a local web server, opens Chrome on the page, and reuses the
server if one is already running. Then press **"התחבר ל-XIAO"** and pick
`CYPHIX-XIAO` from the Bluetooth dialog.

Two small windows appear: a launcher console that closes itself, and a minimised
**"GUI server"** window that keeps the page alive — close that one when you are
done.

> Why a server rather than just opening `index.html`: Chrome refuses Web
> Bluetooth on `file://` origins. The page would load and look fine, but Connect
> could never work. The launcher exists so that trap cannot be stepped in.

This GUI talks **only** to `CYPHIX-XIAO`. The ESP playground GUI talks only to
`CYPHIX-PLAYGROUND`. They use different service UUIDs on purpose, so the two
research boards can advertise at the same time and cannot be cross-connected —
which matters because their preset IDs differ and a mismatched pair would
mislabel every channel without erroring.

## Prototype safety

The production prototype is **not** flashed from this project, ever. The gate in
`../flashing/FLASHING.md` still stands: winning preset chosen from recorded CSV
data, LOD verified, 10 minutes with no BLE loss, merge strategy agreed and
landed in `CYPHIX_SHARED` first, backup confirmed — and explicit approval.

<!-- v0.1.1 — GUI opens from OPEN_GUI.bat / Desktop shortcut instead of typed commands; v0.1.0 — flashing the XIAO build: VID/PID identification, UF2 path, REVID triage, separate BLE identity rationale -->
