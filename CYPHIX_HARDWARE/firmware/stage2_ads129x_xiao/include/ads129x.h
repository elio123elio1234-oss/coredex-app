#ifndef CYPHIX_ADS129X_H
#define CYPHIX_ADS129X_H

// ADS1294 / ADS1296 / ADS1298 (and the R variants) - commands, registers and
// configuration. All values are from TI SBAS459K; the table / section each one
// comes from is quoted next to it.

#include <Arduino.h>
#include "config.h"

// ---- Register map (Table 16) ----
// An enum with a prefix, NOT #defines: the nRF5 SDK has hardware register fields
// called CONFIG, and a bare `#define CONFIG1 ...` style map is how the first XIAO
// port stopped compiling (see HW_PLAYGROUND/XIAO_NRF52840/include/ads1293.h).
enum AdsReg : uint8_t {
  ADS_REG_ID         = 0x00,
  ADS_REG_CONFIG1    = 0x01,
  ADS_REG_CONFIG2    = 0x02,
  ADS_REG_CONFIG3    = 0x03,
  ADS_REG_LOFF       = 0x04,
  ADS_REG_CH1SET     = 0x05,   // CH1SET..CH8SET = 0x05..0x0C
  ADS_REG_CH8SET     = 0x0C,
  ADS_REG_RLD_SENSP  = 0x0D,
  ADS_REG_RLD_SENSN  = 0x0E,
  ADS_REG_LOFF_SENSP = 0x0F,
  ADS_REG_LOFF_SENSN = 0x10,
  ADS_REG_LOFF_FLIP  = 0x11,
  ADS_REG_LOFF_STATP = 0x12,   // read-only
  ADS_REG_LOFF_STATN = 0x13,   // read-only
  ADS_REG_GPIO       = 0x14,
  ADS_REG_PACE       = 0x15,
  ADS_REG_RESP       = 0x16,
  ADS_REG_CONFIG4    = 0x17,
  ADS_REG_WCT1       = 0x18,
  ADS_REG_WCT2       = 0x19,
  ADS_REG_COUNT      = 0x1A
};

// ---- Opcodes (Table 15) ----
enum AdsCmd : uint8_t {
  ADS_CMD_WAKEUP  = 0x02,
  ADS_CMD_STANDBY = 0x04,
  ADS_CMD_RESET   = 0x06,
  ADS_CMD_START   = 0x08,
  ADS_CMD_STOP    = 0x0A,
  ADS_CMD_RDATAC  = 0x10,
  ADS_CMD_SDATAC  = 0x11,
  ADS_CMD_RDATA   = 0x12,
  ADS_CMD_RREG    = 0x20,      // 001r rrrr, then 000n nnnn (count - 1)
  ADS_CMD_WREG    = 0x40       // 010r rrrr, then 000n nnnn (count - 1)
};

// ---- Values this firmware writes ----
// CONFIG1 (Table 18): bit7 HR = 1 (high-resolution mode), bit6 DAISY_EN = 0,
// bit5 CLK_EN = 0, DR[2:0] = 010 -> fMOD/64 = 8 kSPS, 110 -> fMOD/1024 = 500 SPS.
#define ADS_CONFIG1_HR_8KSPS    0x82
#define ADS_CONFIG1_HR_500SPS   0x86   // the value Figure 93 uses
// CONFIG2 (Table 19): 0x00 = test signal off; 0x10 = INT_TEST (internal square
// wave, 1 mV x VREF/2.4, fCLK / 2^21 = 0.98 Hz) - both are Figure 93's values.
#define ADS_CONFIG2_NORMAL      0x00
#define ADS_CONFIG2_INT_TEST    0x10
// CONFIG3 (Table 20): bit7 PD_REFBUF = 1 (internal reference buffer ON),
// bit6 = 1 (reserved, always 1), bit5 VREF_4V = 0 (2.4 V), bit4 RLD_MEAS = 0,
// bit3 RLDREF_INT = 1 (RLD reference = mid-supply, generated internally),
// bit2 PD_RLD = 1 (RLD buffer ON), bit1 RLD_LOFF_SENS = 0, bit0 RLD_STAT (read-only).
#define ADS_CONFIG3_REF_RLD_ON  0xCC
#define ADS_CONFIG3_RO_MASK     0x01   // RLD_STAT is read-only: ignore it when verifying
// LOFF (Table 21): COMP_TH = 000 (95 % / 5 %), VLEAD_OFF_EN = 0 (current source),
// ILEAD_OFF = 00 (6 nA), FLEAD_OFF = 11 (DC lead-off).
#define ADS_LOFF_DC_6NA_95      0x03
// CONFIG4 (Table 33): bit1 PD_LOFF_COMP = 1 -> lead-off comparators ENABLED
// (section 10.1.1.1 writes exactly this), continuous conversion, WCT not on RLD.
#define ADS_CONFIG4_LOFF_COMP   0x02
// CHnSET (Table 22): bit7 PD, GAIN[2:0] in bits 6:4, MUX[2:0] in bits 2:0.
#define ADS_CHSET_PD_SHORTED    0x81   // powered down, inputs shorted (the datasheet's advice for unused channels)
#define ADS_MUX_ELECTRODE       0x00   // normal electrode input
#define ADS_MUX_TEST_SIGNAL     0x05   // internal test signal

struct AdsInfo {
  uint8_t     id;            // raw ID register
  bool        valid;         // the ID decodes to a member of the family
  bool        resp_variant;  // ADS129xR
  uint8_t     channels;      // 4, 6 or 8
  const char* name;
};

enum AdsRate : uint8_t { ADS_RATE_8KSPS, ADS_RATE_500SPS };

namespace ads129x {

// Control pins + CS as outputs, DRDY as input.
void pinsBegin();
// Claims the SPI pads, sets the over-read character to 0x00 and leaves the bus
// in bit-bang mode (SPIM disabled) - the state every function below expects.
void busBegin();

// Power-down + reset pulse, SDATAC, read the ID (section 11.1, Figure 93).
// Returns false when the ID is not an ADS129x.
bool reset(AdsInfo& info);

// nullptr when CHANNEL_MAP fits a device with `device_channels` channels,
// otherwise a sentence saying what is wrong with it.
const char* validatePlan(uint8_t device_channels);
uint8_t usedMask();          // bit n-1 set for every ADS channel n in CHANNEL_MAP
uint8_t maxUsedChannel();    // highest ADS channel in CHANNEL_MAP
uint8_t frameBytes(const AdsInfo& info);   // bytes clocked out per conversion

// Writes the whole configuration, reads every register back into regs_out and
// compares. Returns false (and logs nothing itself) on a mismatch; the first
// mismatching address is left in *bad_addr when the pointer is given.
// The device must be in SDATAC mode with START low.
bool configure(const AdsInfo& info, AdsRate rate, bool test_signal,
               uint8_t regs_out[ADS_REG_COUNT], uint8_t* bad_addr = nullptr);

// Low-level access. Only valid while the stream is stopped (bit-bang mode) and
// the device is in SDATAC mode: RREG is ignored in RDATAC mode (Table 15 note 1).
void    command(uint8_t opcode);
uint8_t readReg(uint8_t addr);
void    readRegs(uint8_t addr, uint8_t* out, uint8_t count);
void    writeReg(uint8_t addr, uint8_t value);
void    startPin(bool high);

const char* regName(uint8_t addr);
uint8_t     gainCode();      // GAIN[2:0] for ADS_PGA_GAIN

}  // namespace ads129x

#endif
// v0.1.0 - ADS129x register map, opcodes and the register values the stage-2 bench firmware writes, each tied to its datasheet table
