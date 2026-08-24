#include "ads1293.h"
#include <SPI.h>

// SPI conventions identical to the production firmware:
// MODE0, MSB-first, ~2 MHz. Write = addr & 0x7F, read = addr | 0x80.

void ads1293::spi_Init()
{
  pinMode(PIN_ADS_CS, OUTPUT);
  digitalWrite(PIN_ADS_CS, HIGH);
  pinMode(PIN_ADS_DRDY, INPUT_PULLUP);
  SPI.begin(PIN_SPI_SCK, PIN_SPI_MISO, PIN_SPI_MOSI, PIN_ADS_CS);
  SPI.setBitOrder(MSBFIRST);
  SPI.setDataMode(SPI_MODE0);
  SPI.setClockDivider(SPI_CLOCK_DIV2);
}

// One entry per preset; -1 means "skip this register".
struct PresetRegs {
  uint8_t flex_ch1, flex_ch2, flex_ch3;
  uint8_t lod_en, cmdet_en, rld_cn, afe_shdn, ch_cnfg;
};

// See docs/ADS1293_RESEARCH.md §5-6 for the reasoning behind every value.
static const PresetRegs PRESETS[] = {
  // A — shared RA: CH1=IN3-IN1, CH2=IN4-IN1, CH3=IN5-IN1, RLD→IN6 (dedicated)
  { 0x19, 0x21, 0x29, 0x1D, 0x1D, 0x06, 0x00, 0x70 },
  // B — independent pairs: CH1=IN3-IN1, CH2=IN5-IN2, CH3=IN6-IN4, RLD off
  { 0x19, 0x2A, 0x34, 0x3F, 0x3F, 0x00, 0x00, 0x70 },
  // C — production baseline: CH1=Lead I (IN2-IN1), CH2=Lead II (IN3-IN1),
  //     CH3 shut down, RLD→IN3 (rides on the LL electrode, as today)
  { 0x11, 0x19, 0x00, 0x07, 0x07, 0x03, 0x24, 0x30 },
};

bool ads1293::Apply_Preset(uint8_t preset_id)
{
  if (preset_id >= sizeof(PRESETS) / sizeof(PRESETS[0])) return false;
  const PresetRegs& p = PRESETS[preset_id];

  Disable_Start();
  Reg_Write(FLEX_CH1_CN, p.flex_ch1);
  Reg_Write(FLEX_CH2_CN, p.flex_ch2);
  Reg_Write(FLEX_CH3_CN, p.flex_ch3);
  Reg_Write(FLEX_PACE_CN, 0x00);
  Reg_Write(FLEX_VBAT_CN, 0x00);
  // Lead-off detection: DC mode, most sensitive threshold, 80 nA (as production)
  Reg_Write(LOD_CN, 0x00);
  Reg_Write(LOD_EN, p.lod_en);
  Reg_Write(LOD_CURRENT, 0x04);
  Reg_Write(LOD_AC_CN, 0x00);
  Reg_Write(CMDET_EN, p.cmdet_en);
  Reg_Write(RLD_CN, p.rld_cn);
  Reg_Write(WILSON_EN1, 0x00);      // Wilson/WCT explicitly OFF — plain differential
  Reg_Write(WILSON_EN2, 0x00);
  Reg_Write(WILSON_EN3, 0x00);
  Reg_Write(WILSON_CN, 0x00);
  Reg_Write(REF_CN, 0x00);          // internal reference
  Reg_Write(OSC_CN, 0b100);         // on-module crystal (same value as production)
  Reg_Write(AFE_RES, 0b00001000);   // 204.8 kHz ADC — same as production
  Reg_Write(AFE_SHDN_CN, p.afe_shdn);
  Reg_Write(AFE_PACE_CN, 0x00);
  Reg_Write(R1_RATE, 0b000);        // R1 = 4
  Reg_Write(R2_RATE, 0b0010);       // R2 = 5
  Reg_Write(R3_RATE_CH1, 0b100);    // R3 = 8 → 1280 Hz
  Reg_Write(R3_RATE_CH2, 0b100);
  Reg_Write(R3_RATE_CH3, 0b100);
  Reg_Write(DRDYB_SRC, 0b001000);   // DRDY from CH1 ECG
  Reg_Write(CH_CNFG, p.ch_cnfg);    // ECG channels in the data loop
  Enable_Start();

  return Reg_Read(REVID) == 0x01;
}

void ads1293::Reg_Write(uint8_t addr, uint8_t data)
{
  digitalWrite(PIN_ADS_CS, LOW);
  SPI.transfer(addr & 0x7f);
  SPI.transfer(data);
  digitalWrite(PIN_ADS_CS, HIGH);
}

uint8_t ads1293::Reg_Read(uint8_t addr)
{
  digitalWrite(PIN_ADS_CS, LOW);
  SPI.transfer(addr | 0x80);
  uint8_t v = SPI.transfer(0xff);
  digitalWrite(PIN_ADS_CS, HIGH);
  return v;
}

void ads1293::Read_Data_Stream(uint8_t* data, int length)
{
  digitalWrite(PIN_ADS_CS, LOW);
  SPI.transfer(DATA_LOOP | 0x80);
  for (int i = 0; i < length; i++) data[i] = SPI.transfer(0xff);
  digitalWrite(PIN_ADS_CS, HIGH);
}

void ads1293::Disable_Start() { Reg_Write(CONFIG, 0x00); }

void ads1293::Enable_Start()
{
  Reg_Write(CONFIG, 0x01);
  delayMicroseconds(10);
}

uint8_t ads1293::Read_LOD_Status() { return Reg_Read(ERROR_LOD); }

// v0.1.0 — ADS1293 driver: presets A/B/C, production rates (1280 Hz), 9-byte loop read
