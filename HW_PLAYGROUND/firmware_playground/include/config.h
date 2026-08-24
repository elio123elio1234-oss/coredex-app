#ifndef __PLAYGROUND_CONFIG_H
#define __PLAYGROUND_CONFIG_H

// ============================================================
// CYPHIX HW_PLAYGROUND — configuration
// חיווט זהה לחומרה הקיימת (ראה docs/CJMCU-1293_BOARD_MAP.md)
// ============================================================

// ---- Pins (identical to the production ESP wiring) ----
#define PIN_SPI_SCK   18
#define PIN_SPI_MISO  19
#define PIN_SPI_MOSI  23
#define PIN_ADS_CS     4
#define PIN_ADS_DRDY  32

// ---- BLE identity (deliberately DIFFERENT from production, so the
//      CYPHIX apps never mistake the playground device for the real one) ----
#define PG_DEVICE_NAME   "CYPHIX-PLAYGROUND"
#define PG_SERVICE_UUID  "cf9a1293-0001-4b1c-9e0a-c0dec0dec0de"
#define PG_DATA_UUID     "cf9a1293-0002-4b1c-9e0a-c0dec0dec0de"  // notify: sample packets
#define PG_CTRL_UUID     "cf9a1293-0003-4b1c-9e0a-c0dec0dec0de"  // write:  commands
#define PG_STAT_UUID     "cf9a1293-0004-4b1c-9e0a-c0dec0dec0de"  // notify: command replies

// ---- Data packet ----
// [seq:u8][count:u8][preset:u8][flags:u8] + count × { i32 ch1_uV, i32 ch2_uV, i32 ch3_uV, u8 lod_raw }
// 12 samples × 13 B + 4 = 160 B  (fits the 182 B ATT payload of MTU 185)
// 320 Hz / 12  → notify every 37.5 ms (~26.7 Hz)
#define PG_SAMPLES_PER_PACKET 12
#define PG_SAMPLE_BYTES       13
#define PG_HEADER_BYTES        4

// ---- Control opcodes (write to PG_CTRL_UUID) ----
// 0x01 [addr][val]  register write (raw, transparent)
// 0x02 [addr]       register read  → status notify [0x02][addr][val]
// 0x03 [presetId]   apply preset (wraps stop/start) → ack [0x03][id]
// 0x04 [0|1]        stream pause/resume → ack [0x04][v]
// 0x05              register dump 0x00..0x2F → notifies [0x05][start][n][vals…]
#define PG_OP_WREG    0x01
#define PG_OP_RREG    0x02
#define PG_OP_PRESET  0x03
#define PG_OP_STREAM  0x04
#define PG_OP_DUMP    0x05

// ---- Presets (see docs/ADS1293_RESEARCH.md §5) ----
// A: CH1=IN3-IN1, CH2=IN4-IN1, CH3=IN5-IN1, RLD→IN6  (shared RA + dedicated RLD)
// B: CH1=IN3-IN1, CH2=IN5-IN2, CH3=IN6-IN4, RLD off  (3 independent pairs)
// C: production baseline — CH1=Lead I, CH2=Lead II, CH3 off, RLD→IN3
#define PRESET_A_SHARED_RA    0
#define PRESET_B_INDEPENDENT  1
#define PRESET_C_CLASSIC      2
#define PRESET_DEFAULT        PRESET_A_SHARED_RA

// ---- Rates: identical to production ----
// ADS1293: AFE 204.8 kHz, R1=4, R2=5, R3=8 → 1280 Hz per channel
// ESP: median-5 + averaging decimation ÷4 → 320 Hz output
#define ADS_RATE_HZ   1280
#define OUT_RATE_HZ    320
#define DECIM_FACTOR     4

#endif
// v0.1.0 — playground config: pins mirror production, new BLE identity, presets A/B/C
