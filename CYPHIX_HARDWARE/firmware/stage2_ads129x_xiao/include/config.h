#ifndef CYPHIX_STAGE2_CONFIG_H
#define CYPHIX_STAGE2_CONFIG_H

// ============================================================
// CYPHIX Band alpha - stage 2 bench firmware
// Seeed XIAO nRF52840  <-SPI->  TI ADS1294 / ADS1296 / ADS1298
//
// Everything a person may need to change for a bench session lives in this
// file. Datasheet references are to TI SBAS459K (ADS129x family).
// ============================================================

#include <Arduino.h>

#define FW_NAME     "CYPHIX stage-2 bench: ADS129x + XIAO nRF52840"
#define FW_VERSION  "0.1.0"

// ------------------------------------------------------------
// 1. Pads (numbers are the XIAO silkscreen)
// ------------------------------------------------------------
// Verified against variants/Seeed_XIAO_nRF52840(_Sense)/variant.cpp of the core
// this project builds with (framework-arduinoadafruitnrf52-seeed 1.10101.0):
//   pad 0 = P0.02   pad 1 = P0.03   pad 2 = P0.28   pad 3 = P0.29
//   pad 7 = P1.12   pad 8 = P1.13 (SCK)   pad 9 = P1.14 (MISO)   pad 10 = P1.15 (MOSI)
// The plain and the Sense variant share this map, so the wiring is the same on both.
#if !defined(D0) || !defined(D10) || !defined(PIN_SPI_SCK)
  #error "Seeed XIAO pin macros not found - check `board = xiaoble(sense)_adafruit` in platformio.ini"
#endif

#define PIN_ADS_PWDN    D0    // pad 0  -> ADS PWDN   (active low: LOW = powered down)
#define PIN_ADS_RESET   D1    // pad 1  -> ADS RESET  (active low)
#define PIN_ADS_START   D2    // pad 2  -> ADS START  (HIGH = convert)
#define PIN_ADS_DRDY    D3    // pad 3  <- ADS DRDY   (falls when a conversion is ready)
#define PIN_ADS_CS      D7    // pad 7  -> ADS CS     (active low)
// pad 8  -> ADS SCLK      pad 9  <- ADS DOUT      pad 10 -> ADS DIN
// These three are fixed by the board variant; the checks below stop the build
// if a different core ever moves them.
static_assert(PIN_SPI_SCK  == 8,  "the wiring guide says SCLK = pad 8");
static_assert(PIN_SPI_MISO == 9,  "the wiring guide says DOUT (MISO) = pad 9");
static_assert(PIN_SPI_MOSI == 10, "the wiring guide says DIN (MOSI) = pad 10");

// ------------------------------------------------------------
// 2. THE CHANNEL TABLE - fill this in from the wiring guide
// ------------------------------------------------------------
// The product measures four differential channels:
//   logical CH1 = LA  - RA1      (Lead I,   copy 1)
//   logical CH2 = LA  - RA2      (Lead I,   copy 2)
//   logical CH3 = LL1 - LA       (Lead III, copy 1)
//   logical CH4 = LL2 - LA       (Lead III, copy 2)
// Each row says which ADS129x channel (1..8) carries that logical channel and
// with which polarity:
//   sign +1 : the ADS channel measures it as written  (first electrode on INxP,
//             second on INxN)
//   sign -1 : the board has the two electrodes the other way round (first
//             electrode on INxN, second on INxP); the firmware flips the sign
//             and swaps the lead-off bits to match.
// On our own board the default (1..4, all +1) is the plan. On TI's ADS1298ECG-FE
// the electrode connector is wired for a standard 12-lead ECG, so the rows will
// change once that mapping is known.
struct LogicalChannel {
  uint8_t ads_channel;   // 1..8
  int8_t  sign;          // +1 or -1
};

// Which board is on the bench.
//   1 = TI ADS1298ECG-FE with the one-wire patch of experiments/E2_ti_board_bench.md
//       (JP16 off, shunts off JP26/31/32/33, wire JP32-3 -> JP33-1). The shared bus
//       on the N inputs of channels 4..7 is then LA, and the electrodes on J1 pins
//       1, 2, 3, 4 reach IN4P, IN5P, IN6P, IN7P. Derived from the SBAU171D
//       schematic; not yet confirmed on a board.
//   0 = our own board: the product's wiring, channels 1..4.
#ifndef BENCH_BOARD_TI_EVM
#define BENCH_BOARD_TI_EVM 1
#endif

#if BENCH_BOARD_TI_EVM
static const LogicalChannel CHANNEL_MAP[4] = {
  { 6, -1 },   // logical CH1 = LA  - RA1 : RA1 on IN6P (J1-3), LA bus on IN6N
  { 7, -1 },   // logical CH2 = LA  - RA2 : RA2 on IN7P (J1-4), LA bus on IN7N
  { 4, +1 },   // logical CH3 = LL1 - LA  : LL1 on IN4P (J1-1), LA bus on IN4N
  { 5, +1 },   // logical CH4 = LL2 - LA  : LL2 on IN5P (J1-2), LA bus on IN5N
};
// On TI's board GPIO1/GPIO2 go to open header pins and GPIO3/GPIO4 to an unfitted
// header. The datasheet says not to leave GPIO pins floating (section 9.3.2.1),
// so the four pins become outputs driving low.
#define ADS_GPIO_ALL_OUTPUTS  1
#else
static const LogicalChannel CHANNEL_MAP[4] = {
  { 1, +1 },   // logical CH1 = LA  - RA1
  { 2, +1 },   // logical CH2 = LA  - RA2
  { 3, +1 },   // logical CH3 = LL1 - LA
  { 4, +1 },   // logical CH4 = LL2 - LA
};
#define ADS_GPIO_ALL_OUTPUTS  0
#endif

// ------------------------------------------------------------
// 3. Analog settings
// ------------------------------------------------------------
#define ADS_PGA_GAIN          6          // 1, 2, 3, 4, 6, 8 or 12 (Table 22). 6 = +/-400 mV input range at VREF 2.4 V
#define ADS_VREF_UV           2400000L   // internal reference, CONFIG3.VREF_4V = 0 (Table 20)

// Lead-off detection: DC, current source, 6 nA (the smallest the chip offers),
// comparators at 95 % / 5 % of the analog supply (LOFF = 0x03, Table 21).
// LOFF_FLIP swaps which side of a channel is pulled up. Leave 0x00 until a
// measurement asks for it (one bit per ADS channel, Table 27).
#define ADS_LOFF_FLIP_MASK    0x00

// ------------------------------------------------------------
// 4. Rates
// ------------------------------------------------------------
// COMPAT mode: the chip runs at 8 kSPS and every 25 conversions are averaged
// into one sample -> exactly 320 Hz, the rate the existing apps are frozen at.
#define ADS_COMPAT_SPS        8000
#define COMPAT_DECIMATION     25
#define OUT_RATE_HZ           320
static_assert(ADS_COMPAT_SPS / COMPAT_DECIMATION == OUT_RATE_HZ && ADS_COMPAT_SPS % COMPAT_DECIMATION == 0,
              "the decimation must land exactly on the app's sample rate");
// NATIVE test mode ('n' on the serial port): 500 SPS straight from the chip,
// no decimation, serial only.
#define ADS_NATIVE_SPS        500

// ------------------------------------------------------------
// 5. SPI
// ------------------------------------------------------------
// Conversion frames are clocked out by the SPIM peripheral at this rate.
// 4 MHz reads a 15-byte frame in 30 us and a 27-byte frame in 54 us, out of the
// 125 us between conversions at 8 kSPS. Use 8000000 if `overrun` counts up in
// the status line, 2000000 if `badsync` does (long jumper wires).
#define ADS_STREAM_SPI_HZ     4000000UL
// Commands and registers are bit-banged at about 1 / (2 * this) MHz. Slow on
// purpose: it is rare, and it keeps the 4 tCLK decode gaps trivially true.
#define ADS_BITBANG_HALF_US   2
// 1 = standard drive strength on SCLK / DIN (gentler edges on jumper wires).
// 0 = keep the core's high-drive setting (meant for short PCB traces).
#define ADS_SPI_STANDARD_DRIVE 1
// 0 = stop clocking after the highest channel in CHANNEL_MAP (shorter interrupt).
// 1 = always clock out the whole frame of the detected device.
// Set to 1 if `badsync` counts up with correct wiring.
#define ADS_READ_FULL_FRAME   0

// ------------------------------------------------------------
// 6. Power-up timing (section 11.1, Table 38, Figure 93)
// ------------------------------------------------------------
#define ADS_POWER_UP_MS       1000   // >= tPOR (2^18 tCLK = 128 ms) AND until VCAP1 >= 1.1 V
#define ADS_REF_SETTLE_MS     150    // internal reference start-up time (Electrical Characteristics)

// ------------------------------------------------------------
// 7. Resources used to count DRDY edges in hardware
// ------------------------------------------------------------
// TIMER0 belongs to the SoftDevice and the core reads TIMER2 at boot; TIMER4 is free.
#define TICK_TIMER            NRF_TIMER4
#define TICK_PPI_CHANNEL      7      // 0..16 are the application's with the S140 SoftDevice

// ------------------------------------------------------------
// 8. BLE identity - the PRODUCTION v3 identity, on purpose
// ------------------------------------------------------------
// The web app filters on the name prefix "BeatAlign", the phone apps on the
// service UUID. Switch the old ESP32 prototype OFF while testing: two devices
// with this name cannot be told apart in a picker.
#define BLE_DEVICE_NAME       "BeatAlign ECG"
#define BLE_TX_POWER_DBM      0
#define BLE_CONN_LED          0      // 0 = no blinking LED next to an ECG front end

// ------------------------------------------------------------
// 9. COMPAT stream policy
// ------------------------------------------------------------
// A 320 Hz sample built from fewer than this many of its 25 conversions raises
// ECG3_FLAG_SAMPLES_MISSED in its packet.
#define COMPAT_MIN_CONVERSIONS  13
// The RLD-fault flag needs the condition to hold this many 320 Hz samples
// (0.5 s) - the same figure the production firmware uses.
#define RLD_FAULT_SAMPLES       160
// The production LOD byte has ONE "RA" bit. 1 = set it when EITHER RA pad is
// off (both fingers must be down). 0 = only when BOTH are off.
#define COMPAT_RA_OFF_IF_ANY    1

#endif
// v0.1.0 - stage-2 bench config: pads, the logical-channel table, 8 kSPS / 25 = 320 Hz compat rate, production BLE identity
