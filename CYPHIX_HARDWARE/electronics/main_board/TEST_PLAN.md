# Band α main board rev 0.1: how we find out it works

Three kinds of checking, in this order. Each catches what the one before cannot.

| Level | Where | What it proves | Status |
|---|---|---|---|
| 1. Design checks | On the computer: KiCad ERC, DRC, board/schematic parity | Every pin is on the net the design says. Copper meets the board house's rules. The board matches the schematic. | Done for rev 0.1 (see DESIGN_NOTES.md §8–9) |
| 2. Bench test of the chip | Stage 2: the owner's TI ADS1298 board wired to the XIAO nRF52840 (`firmware/stage2_ads129x_xiao/`, `experiments/E2/`) | The AFE settings, SPI, the 1 kSPS → 500 SPS chain, noise, and electrodes on a person, before any board of ours exists | Firmware builds; waiting for the owner's bench |
| 3. Bring-up of our board | When boards arrive (stage 3), with the steps below | That **this** board works: rails, radio, AFE, charging isolation, then a real recording | Needs boards (after review + order) |

Levels 1 and 2 are why level 3 should be short. A board that fails level 3 sends us back to level 1 with
a measurement.

## Level 3, step by step

Tools: a bench supply with a current limit, a multimeter, the Tag-Connect TC2030 cable and a J-Link or
similar SWD probe, the phone app. **No person on the electrodes until step 7. Never with the board on a
charger or a USB-powered probe connected to anything mains-powered.**

| # | Test | How | Pass |
|---|---|---|---|
| 1 | Look | Microscope: TQFP-64 joints, solder bridges, part orientation, no DNP part fitted | Clean |
| 2 | Shorts | Ohmmeter, unpowered: TP5 VBAT, TP6 +3V0D, TP7 +3V0A, TP8 VCHG, each to TP9 GND | > 1 kΩ each (caps charge up, so the reading climbs) |
| 3 | First power | Bench supply 3.7 V, **20 mA limit**, on the cell pads (BT1), no cell fitted | Current settles under 1 mA. TP6 = 3.00 V ± 2 %. TP7 = 0 V (analog rail off by default). |
| 4 | Program | TC2030 + SWD: flash the nRF52840, read its device ID | Flash and verify OK |
| 5 | Radio | Advertise; the phone sees it at 1 m and at 5 m | Connects |
| 6 | AFE alive | Firmware drives AFE_PWR_EN: TP7 = 3.00 V. Read the ADS1294 ID register. Run its internal test signal, stream it to the app. | ID read, as on the stage-2 bench. Square wave of the expected amplitude on all 4 channels. |
| 7 | Standby current | Firmware in sleep, meter in series with the supply | About 6 µA (DESIGN_NOTES.md §5). Over 20 µA means something is wrong. |
| 8 | Charge isolation (safety) | Stand absent: meter from each charge contact (TP1, TP2) to GND and to VBAT | No DC path: µA leakage at most (DESIGN_NOTES §2) |
| 9 | Charging | 5 V stand on the two contacts, **both ways round** | VCHG (TP8) ≈ 4.4 V. VBUS_DET high. Charge current ≈ 50 mA into a cell. Firmware refuses to record. |
| 10 | Electrodes, simulated | Patient simulator, or resistors from a signal generator, on the plates through the flex | Clean leads I and III, both copies. II derived. No 50 Hz. |
| 11 | On a person | **Battery only, nothing connected to mains.** The owner's own wrist and leg, a 10 s recording. | A readable 6-lead recording in the app |
| 12 | Safety lab | Accredited IEC 60601-1 testing | Their report, not ours |

Write every result into `experiments/E3/` with the date and the board's serial number. A failure
recorded is worth more than a pass that nobody wrote down.

## What the board has for this

- **Test pads TP5–TP9:** VBAT, +3V0D, +3V0A, VCHG, GND, on the wrist face. TP3 is ADS_CLK.
- **TC2030 pads (J2):** SWD programming and debug, with SWO and reset.
- **AFE_PWR_EN:** the analog rail can be switched and measured on its own.
- **VBUS_DET and CHG_STAT:** the firmware can see the charger.

<!-- v0.1.0 — bring-up and verification plan for main board rev 0.1: design checks, stage-2 bench, 12-step board bring-up with pass criteria; test pads TP5-TP9 -->
