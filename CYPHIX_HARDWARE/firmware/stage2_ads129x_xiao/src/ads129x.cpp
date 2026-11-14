#include "ads129x.h"
#include <SPI.h>
#include "nrf_gpio.h"

// ============================================================
// ADS129x command / register access and configuration.
//
// WHY BIT-BANG HERE. Conversion frames are read by the SPIM peripheral (see
// ads_stream.cpp) as RECEIVE-ONLY transfers. Commands and registers, which need
// bytes TRANSMITTED, are bit-banged on the same three pads while the SPIM is
// disabled. Two reasons:
//   1. The XIAO's `SPI` object is SPIM3, and nRF52840 anomaly 198 says SPIM3
//      can corrupt TRANSMITTED data. A corrupted byte on DIN is an opcode the
//      ADS129x may execute (STOP, RESET, STANDBY). Receive-only transfers send
//      nothing from RAM, so the anomaly has nothing to corrupt.
//   2. Multi-byte commands need 4 tCLK between bytes (tSDECODE, section 7.6).
//      At ~250 kHz a byte takes 32 us, so the gap is true by construction.
// Register access is rare (boot, mode change, the 'i' key), so speed is free.
//
// SPI format (section 7.7 note): CPOL = 0, CPHA = 1. DOUT changes on the RISING
// edge of SCLK (section 9.5.1.4), DIN is latched on the FALLING edge (9.5.1.3).
// ============================================================

// 4 tCLK is 1.96 us at the nominal 2.048 MHz and 2.06 us at the slow end of the
// oscillator tolerance (tCLK max 514 ns, section 7.6). 5 us covers tSDECODE,
// tSCCS (last SCLK falling edge to CS high) and tCSH (CS high, 2 tCLK).
static const uint32_t ADS_GAP_US = 5;

static uint32_t P_SCK, P_MOSI, P_MISO, P_CS, P_START, P_RESET, P_PWDN;

#if   ADS_PGA_GAIN == 6
  #define ADS_GAIN_CODE 0
#elif ADS_PGA_GAIN == 1
  #define ADS_GAIN_CODE 1
#elif ADS_PGA_GAIN == 2
  #define ADS_GAIN_CODE 2
#elif ADS_PGA_GAIN == 3
  #define ADS_GAIN_CODE 3
#elif ADS_PGA_GAIN == 4
  #define ADS_GAIN_CODE 4
#elif ADS_PGA_GAIN == 8
  #define ADS_GAIN_CODE 5
#elif ADS_PGA_GAIN == 12
  #define ADS_GAIN_CODE 6
#else
  #error "ADS_PGA_GAIN must be 1, 2, 3, 4, 6, 8 or 12 (SBAS459K Table 22)"
#endif

uint8_t ads129x::gainCode() { return ADS_GAIN_CODE; }

// ---------- pins ----------
void ads129x::pinsBegin()
{
  P_SCK   = g_ADigitalPinMap[PIN_SPI_SCK];
  P_MOSI  = g_ADigitalPinMap[PIN_SPI_MOSI];
  P_MISO  = g_ADigitalPinMap[PIN_SPI_MISO];
  P_CS    = g_ADigitalPinMap[PIN_ADS_CS];
  P_START = g_ADigitalPinMap[PIN_ADS_START];
  P_RESET = g_ADigitalPinMap[PIN_ADS_RESET];
  P_PWDN  = g_ADigitalPinMap[PIN_ADS_PWDN];

  // Levels first, direction second, so no pin ever drives the wrong level.
  digitalWrite(PIN_ADS_CS, HIGH);
  digitalWrite(PIN_ADS_START, LOW);
  digitalWrite(PIN_ADS_RESET, LOW);    // held in reset + power-down until reset() runs
  digitalWrite(PIN_ADS_PWDN, LOW);
  pinMode(PIN_ADS_CS, OUTPUT);
  pinMode(PIN_ADS_START, OUTPUT);
  pinMode(PIN_ADS_RESET, OUTPUT);
  pinMode(PIN_ADS_PWDN, OUTPUT);
  // DRDY is a push-pull output of the ADS; the pull-up only keeps a loose
  // jumper from generating interrupts out of thin air.
  pinMode(PIN_ADS_DRDY, INPUT_PULLUP);
}

void ads129x::busBegin()
{
  SPI.begin();   // SPIM claims pads 8 / 9 / 10 and configures their GPIO side

  // Over-read character: what the SPIM puts on DIN during a receive-only
  // transfer. The core sets 0xFF; the datasheet wants DIN LOW for the whole
  // read (section 9.4.1.3), so make it 0x00 on whichever instance `SPI` is.
  NRF_SPIM_Type* spim = NRF_SPIM3;
#ifdef NRF_SPIM2
  if ((NRF_SPIM3->PSEL.SCK & 0x3Ful) != P_SCK) spim = NRF_SPIM2;
#endif
  spim->ORC = 0x00;

  SPI.endTransaction();   // = disable the SPIM: the pads are plain GPIO again, for bit-bang

#if ADS_SPI_STANDARD_DRIVE
  // The core sets high drive for 32 MHz PCB traces. On jumper wires that only
  // buys ringing. SCLK must keep its input buffer connected (nrfx_spim note).
  nrf_gpio_cfg(P_SCK,  NRF_GPIO_PIN_DIR_OUTPUT, NRF_GPIO_PIN_INPUT_CONNECT,
               NRF_GPIO_PIN_NOPULL, NRF_GPIO_PIN_S0S1, NRF_GPIO_PIN_NOSENSE);
  nrf_gpio_cfg(P_MOSI, NRF_GPIO_PIN_DIR_OUTPUT, NRF_GPIO_PIN_INPUT_DISCONNECT,
               NRF_GPIO_PIN_NOPULL, NRF_GPIO_PIN_S0S1, NRF_GPIO_PIN_NOSENSE);
#endif
  nrf_gpio_pin_clear(P_SCK);    // CPOL = 0: SCLK idles low
  nrf_gpio_pin_clear(P_MOSI);   // DIN idles low
}

void ads129x::startPin(bool high)
{
  if (high) nrf_gpio_pin_set(P_START); else nrf_gpio_pin_clear(P_START);
}

// ---------- bit-banged SPI, mode 1 ----------
static uint8_t bbByte(uint8_t out)
{
  uint8_t in = 0;
  for (int8_t bit = 7; bit >= 0; bit--) {
    if (out & (1u << bit)) nrf_gpio_pin_set(P_MOSI); else nrf_gpio_pin_clear(P_MOSI);
    nrf_gpio_pin_set(P_SCK);                       // rising edge: the ADS shifts the next DOUT bit out
    delayMicroseconds(ADS_BITBANG_HALF_US);
    in = (uint8_t)((in << 1) | (nrf_gpio_pin_read(P_MISO) ? 1u : 0u));
    nrf_gpio_pin_clear(P_SCK);                     // falling edge: the ADS latches DIN
    delayMicroseconds(ADS_BITBANG_HALF_US);
  }
  nrf_gpio_pin_clear(P_MOSI);
  return in;
}

static inline void csLow()
{
  nrf_gpio_pin_clear(P_CS);
  delayMicroseconds(1);                            // tCSSC: CS low to first SCLK >= 6 ns
}

static inline void csHigh()
{
  delayMicroseconds(ADS_GAP_US);                   // tSCCS: >= 4 tCLK after the last falling edge
  nrf_gpio_pin_set(P_CS);
  delayMicroseconds(ADS_GAP_US);                   // tCSH >= 2 tCLK, and 4 tCLK before the next command
}

void ads129x::command(uint8_t opcode)
{
  csLow();
  bbByte(opcode);
  csHigh();
}

void ads129x::readRegs(uint8_t addr, uint8_t* out, uint8_t count)
{
  if (count == 0) return;
  csLow();
  bbByte((uint8_t)(ADS_CMD_RREG | (addr & 0x1F)));
  delayMicroseconds(ADS_GAP_US);                   // tSDECODE between the bytes of a multi-byte command
  bbByte((uint8_t)((count - 1) & 0x1F));
  for (uint8_t i = 0; i < count; i++) {
    delayMicroseconds(ADS_GAP_US);
    out[i] = bbByte(0x00);
  }
  csHigh();
}

uint8_t ads129x::readReg(uint8_t addr)
{
  uint8_t v = 0;
  readRegs(addr, &v, 1);
  return v;
}

void ads129x::writeReg(uint8_t addr, uint8_t value)
{
  csLow();
  bbByte((uint8_t)(ADS_CMD_WREG | (addr & 0x1F)));
  delayMicroseconds(ADS_GAP_US);
  bbByte(0x00);                                    // one register
  delayMicroseconds(ADS_GAP_US);
  bbByte(value);
  csHigh();
}

// ---------- power-up and identification ----------
static void decodeId(uint8_t id, AdsInfo& info)
{
  // Table 17: bits 7:5 = family (100 = ADS129x, 110 = ADS129xR), bits 4:3 always
  // read 10b, bits 2:0 = channel count (000 = 4, 001 = 6, 010 = 8).
  info.id = id;
  info.valid = false;
  info.resp_variant = false;
  info.channels = 0;
  info.name = "unknown";

  const uint8_t family = (uint8_t)(id >> 5);
  const uint8_t fixed  = (uint8_t)((id >> 3) & 0x03);
  const uint8_t chcode = (uint8_t)(id & 0x07);
  if (fixed != 0x02) return;
  if (family != 0x04 && family != 0x06) return;
  info.resp_variant = (family == 0x06);
  switch (chcode) {
    case 0: info.channels = 4; info.name = info.resp_variant ? "ADS1294R" : "ADS1294"; break;
    case 1: info.channels = 6; info.name = info.resp_variant ? "ADS1296R" : "ADS1296"; break;
    case 2: info.channels = 8; info.name = info.resp_variant ? "ADS1298R" : "ADS1298"; break;
    default: return;
  }
  info.valid = true;
}

bool ads129x::reset(AdsInfo& info)
{
  // A known state even after a warm MCU reset that left the chip streaming:
  // power-down + reset, then the datasheet's power-up sequence (section 11.1,
  // Figure 93). CS high, START low throughout.
  nrf_gpio_pin_set(P_CS);
  startPin(false);
  nrf_gpio_pin_clear(P_RESET);
  nrf_gpio_pin_clear(P_PWDN);
  delay(10);
  nrf_gpio_pin_set(P_PWDN);            // leave power-down: oscillator and reference wake up
  nrf_gpio_pin_set(P_RESET);
  delay(ADS_POWER_UP_MS);              // tPOR >= 2^18 tCLK (128 ms), and VCAP1 must reach 1.1 V

  nrf_gpio_pin_clear(P_RESET);         // tRST >= 2 tCLK (about 1 us), Table 38
  delayMicroseconds(20);
  nrf_gpio_pin_set(P_RESET);
  delay(1);                            // >= 18 tCLK (9 us) before the first command (section 9.3.2.3)

  // The device wakes up in RDATAC mode, where RREG is ignored: SDATAC first.
  command(ADS_CMD_SDATAC);
  delay(1);

  // Two reads that must agree: one flipped bit on a jumper wire must not turn
  // an ADS1298 into "unknown device".
  const uint8_t a = readReg(ADS_REG_ID);
  const uint8_t b = readReg(ADS_REG_ID);
  decodeId(a, info);
  if (a != b) info.valid = false;
  return info.valid;
}

// ---------- the channel plan ----------
uint8_t ads129x::usedMask()
{
  uint8_t m = 0;
  for (uint8_t i = 0; i < 4; i++) {
    const uint8_t ch = CHANNEL_MAP[i].ads_channel;
    if (ch >= 1 && ch <= 8) m |= (uint8_t)(1u << (ch - 1));
  }
  return m;
}

uint8_t ads129x::maxUsedChannel()
{
  uint8_t mx = 0;
  for (uint8_t i = 0; i < 4; i++) if (CHANNEL_MAP[i].ads_channel > mx) mx = CHANNEL_MAP[i].ads_channel;
  return mx;
}

const char* ads129x::validatePlan(uint8_t device_channels)
{
  uint8_t seen = 0;
  for (uint8_t i = 0; i < 4; i++) {
    const uint8_t ch = CHANNEL_MAP[i].ads_channel;
    const int8_t  sg = CHANNEL_MAP[i].sign;
    if (ch < 1 || ch > 8) return "CHANNEL_MAP: ads_channel must be 1..8";
    if (ch > device_channels) return "CHANNEL_MAP uses a channel this device does not have";
    if (sg != 1 && sg != -1) return "CHANNEL_MAP: sign must be +1 or -1";
    const uint8_t bit = (uint8_t)(1u << (ch - 1));
    if (seen & bit) return "CHANNEL_MAP: two logical channels share one ADS channel";
    seen |= bit;
  }
  return nullptr;
}

uint8_t ads129x::frameBytes(const AdsInfo& info)
{
  // 24 status bits, then 24 bits per channel in channel order (section 9.4.1.3.2).
#if ADS_READ_FULL_FRAME
  return (uint8_t)(3 + 3 * info.channels);
#else
  (void)info;
  return (uint8_t)(3 + 3 * maxUsedChannel());
#endif
}

// ---------- configuration ----------
bool ads129x::configure(const AdsInfo& info, AdsRate rate, bool test_signal,
                        uint8_t regs_out[ADS_REG_COUNT], uint8_t* bad_addr)
{
  const uint8_t used = usedMask();

  uint8_t want[ADS_REG_COUNT];
  uint8_t mask[ADS_REG_COUNT];     // 0 = not written, do not verify
  memset(want, 0, sizeof(want));
  memset(mask, 0, sizeof(mask));

  // Reference and RLD first, then let the reference settle (Figure 93 writes
  // CONFIG3 before anything else for exactly this reason).
  want[ADS_REG_CONFIG3] = ADS_CONFIG3_REF_RLD_ON;
  mask[ADS_REG_CONFIG3] = (uint8_t)~ADS_CONFIG3_RO_MASK;

  want[ADS_REG_CONFIG1] = (rate == ADS_RATE_8KSPS) ? ADS_CONFIG1_HR_8KSPS : ADS_CONFIG1_HR_500SPS;
  mask[ADS_REG_CONFIG1] = 0xFF;
  want[ADS_REG_CONFIG2] = test_signal ? ADS_CONFIG2_INT_TEST : ADS_CONFIG2_NORMAL;
  mask[ADS_REG_CONFIG2] = 0xFF;
  want[ADS_REG_LOFF]    = ADS_LOFF_DC_6NA_95;
  mask[ADS_REG_LOFF]    = 0xFF;

  // Used channels: powered, PGA gain, electrode input (or the internal test
  // signal). Every other channel the device has: powered down, inputs shorted.
  const uint8_t mux = test_signal ? ADS_MUX_TEST_SIGNAL : ADS_MUX_ELECTRODE;
  for (uint8_t ch = 1; ch <= info.channels; ch++) {
    const uint8_t addr = (uint8_t)(ADS_REG_CH1SET + ch - 1);
    const bool in_use = (used & (1u << (ch - 1))) != 0;
    want[addr] = in_use ? (uint8_t)((ADS_GAIN_CODE << 4) | mux) : (uint8_t)ADS_CHSET_PD_SHORTED;
    mask[addr] = 0xFF;
  }

  // With the test signal on a channel its electrodes are disconnected by the
  // multiplexer, so neither the right-leg drive nor lead-off may look at them.
  const uint8_t sense = test_signal ? 0x00 : used;
  want[ADS_REG_RLD_SENSP]  = sense;  mask[ADS_REG_RLD_SENSP]  = 0xFF;
  want[ADS_REG_RLD_SENSN]  = sense;  mask[ADS_REG_RLD_SENSN]  = 0xFF;
  want[ADS_REG_LOFF_SENSP] = sense;  mask[ADS_REG_LOFF_SENSP] = 0xFF;
  want[ADS_REG_LOFF_SENSN] = sense;  mask[ADS_REG_LOFF_SENSN] = 0xFF;
  want[ADS_REG_LOFF_FLIP]  = (uint8_t)(ADS_LOFF_FLIP_MASK & used);
  mask[ADS_REG_LOFF_FLIP]  = 0xFF;
  want[ADS_REG_CONFIG4]    = ADS_CONFIG4_LOFF_COMP;
  mask[ADS_REG_CONFIG4]    = 0xFF;
#if ADS_GPIO_ALL_OUTPUTS
  // GPIO register (0x14): bits 3:0 are the direction bits, 1 = input (reset value
  // 0x0F). 0x00 makes all four pins outputs driving low, for a board that leaves
  // them floating. Only the direction bits are compared on read-back.
  want[ADS_REG_GPIO] = 0x00;
  mask[ADS_REG_GPIO] = 0x0F;
#endif
  // PACE, RESP, WCT1, WCT2 (and GPIO unless the switch above is set) stay at their
  // reset values. They are read back and shown, not written.

  writeReg(ADS_REG_CONFIG3, want[ADS_REG_CONFIG3]);
  delay(ADS_REF_SETTLE_MS);
  for (uint8_t addr = ADS_REG_CONFIG1; addr < ADS_REG_COUNT; addr++) {
    if (addr == ADS_REG_CONFIG3 || mask[addr] == 0) continue;
    writeReg(addr, want[addr]);
  }

  // A register that did not take is a wrong lead on somebody's recording, and
  // only the chip knows: read everything back.
  readRegs(0x00, regs_out, ADS_REG_COUNT);
  for (uint8_t addr = 0; addr < ADS_REG_COUNT; addr++) {
    if (mask[addr] == 0) continue;
    if ((regs_out[addr] & mask[addr]) != (want[addr] & mask[addr])) {
      if (bad_addr) *bad_addr = addr;
      return false;
    }
  }
  return true;
}

const char* ads129x::regName(uint8_t addr)
{
  static const char* const NAMES[ADS_REG_COUNT] = {
    "ID", "CONFIG1", "CONFIG2", "CONFIG3", "LOFF",
    "CH1SET", "CH2SET", "CH3SET", "CH4SET", "CH5SET", "CH6SET", "CH7SET", "CH8SET",
    "RLD_SENSP", "RLD_SENSN", "LOFF_SENSP", "LOFF_SENSN", "LOFF_FLIP",
    "LOFF_STATP", "LOFF_STATN", "GPIO", "PACE", "RESP", "CONFIG4", "WCT1", "WCT2",
  };
  return addr < ADS_REG_COUNT ? NAMES[addr] : "?";
}

// v0.1.0 - ADS129x driver: bit-banged mode-1 command/register access, datasheet power-up sequence, ID decode, full configuration with read-back verify
