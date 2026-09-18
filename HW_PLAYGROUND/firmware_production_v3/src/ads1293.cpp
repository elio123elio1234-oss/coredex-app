#include "ads1293.h"
#include <SPI.h>

void ads1293::spi_Init(uint8_t sck, uint8_t miso, uint8_t mosi, uint8_t ss)
{
  pinMode(ADS1293_CSB_PIN, OUTPUT);
  pinMode(ADS1293_DRDY_PIN, INPUT_PULLUP);
  // start the SPI library:
  SPI.begin(sck, miso, mosi, ss);
  SPI.setBitOrder(MSBFIRST);
  //CPOL = 0, CPHA = 0 SPI_MODE0
  //CPOL = 0, CPHA = 1 SPI_MODE1
  SPI.setDataMode(SPI_MODE0);
  // Selecting 2Mhz clock for SPI
  SPI.setClockDivider(SPI_CLOCK_DIV2);
}

// ============================================================
// v3 electrode plan — REGISTERS ONLY, no hardware change.
//
//   socket P1 (unchanged):  IN1 = RA    IN2 = LA    IN3 = LL#1
//   socket P2 (new cable):  IN4 = LL#2  IN5 = spare IN6 = RLD electrode
//
//   CH1 = IN2-IN1  Lead I      (as v2)
//   CH2 = IN3-IN1  Lead II-a   (as v2 — the copy every app draws)
//   CH3 = IN4-IN1  Lead II-b   (NEW — second measurement of the same lead)
//
// Same pins and the same LOD/CMDET/RLD/SHDN/CH_CNFG values as the XIAO
// playground's preset 0, which were read back from a live chip (REVID 0x01,
// RLD_CN=0x06, LOD_EN=0x0F, CH_CNFG=0x70). Only the channel ORDER differs:
// production keeps Lead I on CH1 and Lead II on CH2 so that everything
// downstream of the first two channels is untouched.
//
// What actually changes for the signal: in v2 the RLD amplifier drove the body
// THROUGH the LL measuring electrode (RLD_CN=0x03) because there was no fourth
// electrode. v3 gives it its own. Consequence, and it is not optional: with
// RLD_CN=0x06 a body with nothing on IN6 has no common-mode reference at all
// (HW_PLAYGROUND v0.1.1 saw exactly that as "heavy noise"). v3 therefore NEEDS
// the P2 cable. The firmware reports a missing/failed RLD electrode in the
// 3-channel packet's flags byte instead of pretending the signal is fine.
// ============================================================
void ads1293::Init(bool* is_init)
{
    *is_init = false;
    Disable_Start();
    Reg_Write(FLEX_CH1_CN, 0b00010001); // INP to IN2 and INN to IN1 (Lead I: LA-RA)
    Reg_Write(FLEX_CH2_CN, 0b00011001); // INP to IN3 and INN to IN1 (Lead II-a: LL#1-RA)
    Reg_Write(FLEX_CH3_CN, 0b00100001); // INP to IN4 and INN to IN1 (Lead II-b: LL#2-RA)
    Reg_Write(FLEX_PACE_CN, 0);
    Reg_Write(FLEX_VBAT_CN, 0);
    // Lead-Off Detection: DC mode, on the four MEASURING electrodes
    Reg_Write(LOD_CN, 0x00);          // DC lead-off, LOW threshold (most sensitive)
    Reg_Write(LOD_EN, 0x0F);          // Enable LOD on IN1, IN2, IN3, IN4
    Reg_Write(LOD_CURRENT, 0x04);     // 80nA excitation current
    Reg_Write(LOD_AC_CN, 0x00);       // AC LOD off (using DC mode)
    Reg_Write(CMDET_EN, 0b00001111);  // common-mode detector from IN1..IN4
    Reg_Write(RLD_CN, 0b00000110);    // RLD output -> IN6 (its own electrode)
    Reg_Write(WILSON_EN1, 0x00);      // Wilson/WCT explicitly OFF - plain differential
    Reg_Write(WILSON_EN2, 0x00);
    Reg_Write(WILSON_EN3, 0x00);
    Reg_Write(WILSON_CN, 0x00);
    Reg_Write(REF_CN, 0); // Turn on internal REF
    Reg_Write(OSC_CN, 0b100); // use external clock
    Reg_Write(AFE_RES, 0b00001000); // 204800Hz ADC
    Reg_Write(AFE_SHDN_CN, 0b000000); // all three channels active
    Reg_Write(AFE_PACE_CN, 0b000); // turn off PACE
    Reg_Write(R1_RATE, 0b000); // standard DATA rate, R1 = 4
    Reg_Write(R2_RATE, 0b0010); // R2 = 5
    Reg_Write(R3_RATE_CH1, 0b100); // R3 = 8
    Reg_Write(R3_RATE_CH2, 0b100); // R3 = 8, 1280 Hz, ADCMax = 0xC35000, Bandwidth: 260Hz
    Reg_Write(R3_RATE_CH3, 0b100); // same rate on the third channel — the copies must share a clock
    Reg_Write(DRDYB_SRC, 0b001000); // connect DRDY to CH1
    Reg_Write(CH_CNFG, 0b01110000); // loop read-back mode, for CH1 + CH2 + CH3
    Enable_Start();
    *is_init = true;
}

void ads1293::Reg_Write (unsigned char READ_WRITE_ADDRESS, unsigned char DATA)
{
    digitalWrite(ADS1293_CSB_PIN, LOW);
    SPI.transfer(READ_WRITE_ADDRESS & 0x7f);
    SPI.transfer(DATA);
    digitalWrite(ADS1293_CSB_PIN, HIGH);
}

byte ads1293::Reg_Read (unsigned char READ_WRITE_ADDRESS)
{
    byte tmp = 0;
    digitalWrite(ADS1293_CSB_PIN, LOW);
    SPI.transfer(READ_WRITE_ADDRESS | 0x80);
    tmp = SPI.transfer(0xff);
    digitalWrite(ADS1293_CSB_PIN, HIGH);
    return tmp;
}

void ads1293::Read_Data_Stream(byte* data, int length)
{
    digitalWrite(ADS1293_CSB_PIN, LOW);
    SPI.transfer(DATA_LOOP | 0x80);
    for (int i=0; i<length; i++) {
        data[i] = SPI.transfer(0xff);
    }
    digitalWrite(ADS1293_CSB_PIN, HIGH);
}

void ads1293::Disable_Start(void)
{
    Reg_Write(CONFIG, 0x00);
}

void ads1293::Enable_Start(void)
{
    Reg_Write(CONFIG, 0x01);
    delayMicroseconds(10);
}

byte ads1293::Read_LOD_Status(void)
{
    return Reg_Read(ERROR_LOD);  // Return raw byte for debug
}

byte ads1293::Read_Error_Misc(void)
{
    return Reg_Read(ERROR_MISC);
}

// v3.0.0 — CH3 = IN4-IN1 (Lead II-b), RLD -> IN6, LOD/CMDET on IN1..IN4, three channels in the data loop.
