#ifndef __ADS_1293_H
#define __ADS_1293_H

#include <Arduino.h>
#include "config.h"

// ---- ADS1293 register map (same names as production firmware) ----
#define CONFIG          0x00
#define FLEX_CH1_CN     0x01
#define FLEX_CH2_CN     0x02
#define FLEX_CH3_CN     0x03
#define FLEX_PACE_CN    0x04
#define FLEX_VBAT_CN    0x05
#define LOD_CN          0x06
#define LOD_EN          0x07
#define LOD_CURRENT     0x08
#define LOD_AC_CN       0x09
#define CMDET_EN        0x0a
#define CMDET_CN        0x0b
#define RLD_CN          0x0c
#define WILSON_EN1      0x0d
#define WILSON_EN2      0x0e
#define WILSON_EN3      0x0f
#define WILSON_CN       0x10
#define REF_CN          0x11
#define OSC_CN          0x12
#define AFE_RES         0x13
#define AFE_SHDN_CN     0x14
#define AFE_FAULT_CN    0x15
#define AFE_PACE_CN     0x17
#define ERROR_LOD       0x18
#define ERROR_STATUS    0x19
#define ERROR_RANGE1    0x1a
#define ERROR_RANGE2    0x1b
#define ERROR_RANGE3    0x1c
#define ERROR_SYNC      0x1d
#define ERROR_MISC      0x1e
#define DIGO_STRENGTH   0x1f
#define R2_RATE         0x21
#define R3_RATE_CH1     0x22
#define R3_RATE_CH2     0x23
#define R3_RATE_CH3     0x24
#define R1_RATE         0x25
#define DIS_EFILTER     0x26
#define DRDYB_SRC       0x27
#define SYNCB_CN        0x28
#define MASK_DRDYB      0x29
#define MASK_ERB        0x2a
#define ALARM_FILTER    0x2e
#define CH_CNFG         0x2f
#define DATA_STATUS     0x30
#define DATA_CH1_ECG    0x37
#define DATA_CH2_ECG    0x3a
#define DATA_CH3_ECG    0x3d
#define REVID           0x40
#define DATA_LOOP       0x50

class ads1293
{
  public:
    static void spi_Init();
    // Full re-configuration for one of the playground presets (stops + restarts conversion).
    // Returns true when REVID reads back sane (0x01) after config.
    static bool Apply_Preset(uint8_t preset_id);
    static void Reg_Write(uint8_t addr, uint8_t data);
    static uint8_t Reg_Read(uint8_t addr);
    // One burst read of the data loop (CH1+CH2+CH3 ECG = 9 bytes when CH_CNFG=0x70).
    static void Read_Data_Stream(uint8_t* data, int length = 9);
    static void Disable_Start();
    static void Enable_Start();
    static uint8_t Read_LOD_Status();
};

#endif
// v0.1.0 — ADS1293 driver header: production register map + preset API + 9-byte loop read
