#ifndef __XIAO_PG_CONFIG_H
#define __XIAO_PG_CONFIG_H

// ============================================================
// CYPHIX HW_PLAYGROUND — Seeed XIAO nRF52840 build
// Port of firmware_playground (ESP32) to nRF52840 + Bluefruit.
// Wiring: see ../WIRING.md — pad names match the board silkscreen.
// ============================================================

// ---- Pins (XIAO silkscreen pad names) ----
// SPI is FIXED by the XIAO variant and must not be redefined here:
//   pad 8  = SCK  (P1.13) · pad 9 = MISO (P1.14) · pad 10 = MOSI (P1.15)
// Only CS and DRDY are ours to choose.
#if !defined(D3) || !defined(D7)
  #error "Seeed XIAO pin macros D0..D10 not found - check `board = xiaoble` (or xiaoblesense) in platformio.ini"
#endif
#define PIN_ADS_CS    D7    // pad "7"  · P1.12 → CJMCU CSB
#define PIN_ADS_DRDY  D3    // pad "3"  · P0.29 → CJMCU DRDB
#define ADS_SPI_HZ    2000000UL   // explicit 2 MHz (the ESP build used an ambiguous clock divider)

// ---- BLE identity ----
// Deliberately distinct from BOTH production AND the ESP playground build:
// the two research boards must be scannable side-by-side without ambiguity,
// and their preset IDs differ (see PRESETS below), so cross-connecting the
// wrong GUI would silently mislabel every channel.
#define PG_DEVICE_NAME   "CYPHIX-XIAO"
#define PG_SERVICE_UUID  "cf9a1293-0101-4b1c-9e0a-c0dec0dec0de"
#define PG_DATA_UUID     "cf9a1293-0102-4b1c-9e0a-c0dec0dec0de"  // notify: sample packets
#define PG_CTRL_UUID     "cf9a1293-0103-4b1c-9e0a-c0dec0dec0de"  // write:  commands
#define PG_STAT_UUID     "cf9a1293-0104-4b1c-9e0a-c0dec0dec0de"  // notify: command replies

// ---- Data packet — byte-identical to the ESP build, so recorded CSVs
//      from both boards are directly comparable ----
// [seq:u8][count:u8][preset:u8][flags:u8] + count × { i32 ch1_uV, i32 ch2_uV, i32 ch3_uV, u8 lod_raw }
// 12 samples × 13 B + 4 = 160 B  (fits the 244 B payload of Bluefruit's MTU 247)
#define PG_SAMPLES_PER_PACKET 12
#define PG_SAMPLE_BYTES       13
#define PG_HEADER_BYTES        4

// ---- Control opcodes (write to PG_CTRL_UUID) — unchanged from the ESP build ----
#define PG_OP_WREG    0x01   // [addr][val]
#define PG_OP_RREG    0x02   // [addr]      → [0x02][addr][val]
#define PG_OP_PRESET  0x03   // [presetId]  → [0x03][id][ok]
#define PG_OP_STREAM  0x04   // [0|1]       → [0x04][v]
#define PG_OP_DUMP    0x05   //             → [0x05][start][n][vals…]

// ---- Presets ----
// ⚠ RENUMBERED vs the ESP build. Preset 0 is the electrode plan the user
// actually wants: TWO copies of Lead II + ONE Lead I + a dedicated RLD
// electrode ("plan C" in docs/ADS1293_RESEARCH.md §5).
//   0  2×II + I  shared RA   CH1=IN3-IN1 CH2=IN4-IN1 CH3=IN2-IN1  RLD→IN6
//   1  2×II + I  indep pairs CH1=IN3-IN1 CH2=IN5-IN4 CH3=IN2-IN1  RLD→IN6
//   2  3×II      shared RA   (= ESP preset A)                     RLD→IN6
//   3  3×II      indep pairs (= ESP preset B)                     RLD off
//   4  production baseline   (= ESP preset C) CH1=Lead I CH2=Lead II, CH3 off
#define PRESET_2xII_I_SHARED   0
#define PRESET_2xII_I_INDEP    1
#define PRESET_3xII_SHARED     2
#define PRESET_3xII_INDEP      3
#define PRESET_PRODUCTION      4
#define PRESET_COUNT           5
#define PRESET_DEFAULT         PRESET_2xII_I_SHARED

// ---- Rates: identical to production ----
// ADS1293: AFE 204.8 kHz, R1=4, R2=5, R3=8 → 1280 Hz per channel
// MCU: median-5 + averaging decimation ÷4 → 320 Hz output
#define ADS_RATE_HZ   1280
#define OUT_RATE_HZ    320
#define DECIM_FACTOR     4

// ---- Diagnostics ----
#define SERIAL_CSV     1     // stream the 320 Hz CSV to USB CDC when a terminal is open

#endif
// v0.1.0 — XIAO nRF52840 config: pads 7/3 for CS/DRDY, own BLE identity, 5 presets (default = 2×LeadII + LeadI + RLD)
