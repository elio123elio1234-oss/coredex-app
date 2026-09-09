#ifndef __ADS_1293_XIAO_H
#define __ADS_1293_XIAO_H

#include <Arduino.h>
#include "config.h"

// ---- ADS1293 register map ----
// Identical spellings to the production firmware, but an enum rather than
// #defines, and that is deliberate: the nRF5 SDK's nrf_spim.h contains
//     p_reg->CONFIG = config;
// referring to a hardware register FIELD called CONFIG. A `#define CONFIG 0x00`
// rewrites that line to `p_reg->0x00` and the whole core stops compiling - which
// is exactly what the first XIAO build did. An enum leaves member names alone
// while every call site below keeps reading the same as the ESP firmware.
enum Ads1293Reg : uint8_t {
  CONFIG        = 0x00,
  FLEX_CH1_CN   = 0x01,
  FLEX_CH2_CN   = 0x02,
  FLEX_CH3_CN   = 0x03,
  FLEX_PACE_CN  = 0x04,
  FLEX_VBAT_CN  = 0x05,
  LOD_CN        = 0x06,
  LOD_EN        = 0x07,
  LOD_CURRENT   = 0x08,
  LOD_AC_CN     = 0x09,
  CMDET_EN      = 0x0a,
  CMDET_CN      = 0x0b,
  RLD_CN        = 0x0c,
  WILSON_EN1    = 0x0d,
  WILSON_EN2    = 0x0e,
  WILSON_EN3    = 0x0f,
  WILSON_CN     = 0x10,
  REF_CN        = 0x11,
  OSC_CN        = 0x12,
  AFE_RES       = 0x13,
  AFE_SHDN_CN   = 0x14,
  AFE_FAULT_CN  = 0x15,
  AFE_PACE_CN   = 0x17,
  ERROR_LOD     = 0x18,
  ERROR_STATUS  = 0x19,
  ERROR_RANGE1  = 0x1a,
  ERROR_RANGE2  = 0x1b,
  ERROR_RANGE3  = 0x1c,
  ERROR_SYNC    = 0x1d,
  ERROR_MISC    = 0x1e,
  DIGO_STRENGTH = 0x1f,
  R2_RATE       = 0x21,
  R3_RATE_CH1   = 0x22,
  R3_RATE_CH2   = 0x23,
  R3_RATE_CH3   = 0x24,
  R1_RATE       = 0x25,
  DIS_EFILTER   = 0x26,
  DRDYB_SRC     = 0x27,
  SYNCB_CN      = 0x28,
  MASK_DRDYB    = 0x29,
  MASK_ERB      = 0x2a,
  ALARM_FILTER  = 0x2e,
  CH_CNFG       = 0x2f,
  DATA_STATUS   = 0x30,
  DATA_CH1_ECG  = 0x37,
  DATA_CH2_ECG  = 0x3a,
  DATA_CH3_ECG  = 0x3d,
  REVID         = 0x40,
  DATA_LOOP     = 0x50,
};

class ads1293
{
  public:
    // Configures CS/DRDY pins and the XIAO's hardware SPI (pads 8/9/10).
    static void spi_Init();
    // Full re-configuration for one of the playground presets (stops + restarts conversion).
    // Returns true when REVID reads back sane (0x01) after config.
    static bool Apply_Preset(uint8_t preset_id);
    // How many ECG channels the given preset puts in the data loop (2 or 3).
    // Drives the burst read length; returns 0 for an out-of-range preset id.
    static uint8_t Preset_Channels(uint8_t preset_id);
    static void Reg_Write(uint8_t addr, uint8_t data);
    static uint8_t Reg_Read(uint8_t addr);
    // One burst read of the data loop (CH1+CH2+CH3 ECG = 9 bytes when CH_CNFG=0x70).
    static void Read_Data_Stream(uint8_t* data, int length = 9);
    static void Disable_Start();
    static void Enable_Start();
    static uint8_t Read_LOD_Status();
};

#endif
// v0.1.0 - XIAO port of the ADS1293 driver header: register map as an enum (nRF5 CONFIG clash), plus Preset_Channels()
