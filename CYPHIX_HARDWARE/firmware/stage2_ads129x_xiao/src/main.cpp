// ============================================================
// CYPHIX Band alpha - stage 2 bench firmware
//
// Seeed XIAO nRF52840 driving a TI ADS1294 / ADS1296 / ADS1298 over SPI. The
// device is identified by its ID register, so one binary runs on all three.
//
// What it proves:
//   1. The ADS129x family and the product's four-channel plan
//        CH1 = LA - RA1   CH2 = LA - RA2   CH3 = LL1 - LA   CH4 = LL2 - LA
//      deliver a signal from the electrodes.
//   2. The EXISTING apps display it, unchanged: in COMPAT mode (the default)
//      the board presents the production v3 BLE identity and the production
//      packet at exactly 320 Hz.
//
// Data path
//   DRDY interrupt (8 kSPS) -> SPI frame -> sum of 25 conversions  [ads_stream.cpp]
//   loop(): counts -> microvolts -> production leads -> BLE packets [this file + compat_ble.cpp]
//
// COMPAT mapping (microvolts, as the production firmware sends them):
//   Lead I         = (CH1 + CH2) / 2        the two copies of LA - RA
//   Lead II copy A = CH1 + CH3              = LL1 - RA1
//   Lead II copy B = CH2 + CH4              = LL2 - RA2
//
// Decimation: 25 conversions at 8 kSPS are averaged into one 320 Hz sample. A
// 25-point moving average has nulls at every multiple of 320 Hz, is 3 dB down
// at about 142 Hz and 3.9 dB down at 160 Hz. Between 160 and 320 Hz it only
// attenuates 4 to 30 dB, so that band aliases - 350 Hz lands on 30 Hz 21 dB
// down. The production chain (ADS1293 at 1280 Hz, average of 4) has the same
// weakness; it is a like-for-like bench substitute, not the product's filter.
//
// Serial keys (USB, 115200): r raw CSV | s stop CSV | i info + register dump |
//   n native 500 SPS over serial | c back to compat | t internal test signal | h help
// ============================================================

#include <Arduino.h>
#include <Adafruit_TinyUSB.h>
#include <stdarg.h>
#include "config.h"
#include "ads129x.h"
#include "ads_stream.h"
#include "compat_ble.h"

// ---------- state ----------
enum Mode : uint8_t { MODE_COMPAT, MODE_NATIVE };

static Mode     g_mode  = MODE_COMPAT;
static bool     g_test  = false;      // internal square-wave test signal instead of the electrodes
static bool     g_csv   = false;      // raw CSV on the serial port
static bool     g_adsOk = false;
static bool     g_hwTicks = false;
static AdsInfo  g_info  = { 0, false, false, 0, "none" };
static uint8_t  g_regs[ADS_REG_COUNT];

// Which LOFF_STATP / LOFF_STATN bits belong to each electrode, derived from CHANNEL_MAP.
struct ElectrodeBits { uint8_t p; uint8_t n; };
static ElectrodeBits E_LA, E_RA1, E_RA2, E_LL1, E_LL2;
static uint8_t  g_usedMask = 0;

static int32_t  g_uv[4] = {0, 0, 0, 0};   // last good value per logical channel, held through an empty block
static uint32_t g_sampleCount = 0;
static uint16_t g_rldRun = 0;
static uint32_t g_ringOverflowSeen = 0;
static uint8_t  g_lastLod = 0;
static bool     g_lastRldFault = false;

// ---------- logging ----------
// Never blocks an unattended board: USB CDC is only touched while a terminal
// actually has the port open.
static void logf(const char* fmt, ...) __attribute__((format(printf, 1, 2)));
static void logf(const char* fmt, ...)
{
  if (!Serial) return;
  char buf[200];
  va_list ap;
  va_start(ap, fmt);
  vsnprintf(buf, sizeof(buf), fmt, ap);
  va_end(ap);
  Serial.print(buf);
}

// ---------- electrodes ----------
static void addInput(ElectrodeBits& e, uint8_t ads_channel, bool positive_input)
{
  const uint8_t bit = (uint8_t)(1u << (ads_channel - 1));
  if (positive_input) e.p |= bit; else e.n |= bit;
}

// Logical channel `idx` measures (first - second).
static void mapChannel(uint8_t idx, ElectrodeBits& first, ElectrodeBits& second)
{
  const LogicalChannel& lc = CHANNEL_MAP[idx];
  const bool straight = lc.sign > 0;            // +1: first electrode on INxP, second on INxN
  addInput(first,  lc.ads_channel, straight);
  addInput(second, lc.ads_channel, !straight);
}

static void buildElectrodeMap()
{
  E_LA = E_RA1 = E_RA2 = E_LL1 = E_LL2 = ElectrodeBits{0, 0};
  mapChannel(0, E_LA,  E_RA1);                  // CH1 = LA  - RA1
  mapChannel(1, E_LA,  E_RA2);                  // CH2 = LA  - RA2
  mapChannel(2, E_LL1, E_LA);                   // CH3 = LL1 - LA
  mapChannel(3, E_LL2, E_LA);                   // CH4 = LL2 - LA
  g_usedMask = ads129x::usedMask();
}

static inline bool electrodeOff(const ElectrodeBits& e, uint8_t stat_p, uint8_t stat_n)
{
  return ((stat_p & e.p) | (stat_n & e.n)) != 0;
}

static void printInputs(const char* name, const ElectrodeBits& e)
{
  logf("  %-4s ->", name);
  for (uint8_t ch = 1; ch <= 8; ch++) {
    if (e.p & (1u << (ch - 1))) logf(" IN%uP", ch);
    if (e.n & (1u << (ch - 1))) logf(" IN%uN", ch);
  }
  logf("\n");
}

// ---------- scaling ----------
// One LSB is VREF / (2^23 - 1) at gain 1 (SBAS459K section 9.4.1.3.3), so the
// input-referred value of an average is  sum / n * VREF / (gain * (2^23 - 1)).
static int32_t countsToUv(int32_t sum, uint8_t n)
{
  const int64_t num = (int64_t)sum * (int64_t)ADS_VREF_UV;
  const int64_t den = (int64_t)n * (int64_t)ADS_PGA_GAIN * 8388607LL;
  return (int32_t)((num >= 0 ? num + den / 2 : num - den / 2) / den);
}

// ---------- housekeeping state (the stream restarts reset it) ----------
static uint32_t g_statusMs = 0, g_statusTicks = 0;
static uint32_t g_wdMs = 0, g_wdTicks = 0, g_wdServiced = 0, g_wdBadSync = 0;
static uint8_t  g_wdSilent = 0;
static uint32_t g_retryMs = 0;
static uint32_t g_blePollMs = 0;
static bool     g_bleWasConnected = false, g_bleWasSub = false;
static CompatStats g_ble = { false, false, false, 0, 0, 0, 0 };

// The stream statistics restart from zero with every stream::start(), so the
// watchdog and the rate meter must restart with them.
static void resetWatch()
{
  const uint32_t now = millis();
  g_statusMs = g_wdMs = now;
  g_statusTicks = g_wdTicks = stream::tickNow();
  g_wdServiced = 0;
  g_wdBadSync = 0;
  g_wdSilent = 0;
}

// ---------- stream control ----------
static void startStream()
{
  const uint8_t  frame_bytes = ads129x::frameBytes(g_info);
  const uint16_t decimation  = (g_mode == MODE_COMPAT) ? COMPAT_DECIMATION : 1;

  // Conversions are halted here, so RDATAC cannot land in the 4 tCLK keep-out
  // zone around a DRDY edge (Figure 70).
  ads129x::startPin(false);
  delayMicroseconds(50);                        // tSDSU: 16 tCLK (8 us) for START low to take
  ads129x::command(ADS_CMD_RDATAC);

  g_rldRun = 0;
  g_ringOverflowSeen = 0;
  g_sampleCount = 0;
  compat::resetPackers();
  stream::start(frame_bytes, decimation);       // interrupt armed before the first conversion exists
  ads129x::startPin(true);                      // START high: first DRDY after tSETTLE (Table 12)
  resetWatch();

  const uint32_t sps = (g_mode == MODE_COMPAT) ? ADS_COMPAT_SPS : ADS_NATIVE_SPS;
  const uint32_t read_us = (uint32_t)frame_bytes * 8u * 1000000u / ADS_STREAM_SPI_HZ;
  const uint32_t period_us = 1000000u / sps;
  logf("[ADS] streaming: %lu SPS, %u-byte frames (%lu us of the %lu us period), 1 output per %u conversions\n",
       (unsigned long)sps, frame_bytes, (unsigned long)read_us, (unsigned long)period_us, decimation);
  if (read_us * 10u > period_us * 6u) {
    logf("[ADS] WARNING: the frame read takes more than 60 %% of the conversion period - raise ADS_STREAM_SPI_HZ\n");
  }
}

// Leaves the device in SDATAC mode with conversions halted, bus in bit-bang mode.
static void pauseStream()
{
  stream::stop();
  ads129x::command(ADS_CMD_SDATAC);             // "issue at any time" (section 9.5.2.7); needed before RREG / WREG
  ads129x::startPin(false);
}

static void dumpRegs()
{
  for (uint8_t a = 0; a < ADS_REG_COUNT; a++) {
    logf("  0x%02X %-10s = 0x%02X\n", a, ads129x::regName(a), g_regs[a]);
  }
}

static bool configureAndStart()
{
  uint8_t bad = 0xFF;
  const AdsRate rate = (g_mode == MODE_COMPAT) ? ADS_RATE_8KSPS : ADS_RATE_500SPS;
  if (!ads129x::configure(g_info, rate, g_test, g_regs, &bad)) {
    logf("[ADS] register %s (0x%02X) did not read back as written - got 0x%02X. Dump:\n",
         ads129x::regName(bad), bad, g_regs[bad]);
    dumpRegs();
    return false;
  }
  buildElectrodeMap();
  startStream();
  return true;
}

// Full power-up: reset, identify, configure, stream.
static bool bringUp()
{
  stream::stop();
  logf("[ADS] power-up and reset (%u ms)...\n", (unsigned)ADS_POWER_UP_MS);
  if (!ads129x::reset(g_info)) {
    logf("[ADS] ID register = 0x%02X: not an ADS129x.\n", g_info.id);
    logf("      0x00 / 0xFF usually means no answer: check 3V3 and GND, CS (pad 7), SCLK (8), DOUT (9),\n");
    logf("      DIN (10), RESET (1), PWDN (0), and that the board's DVDD is 3.0-3.3 V.\n");
    return false;
  }
  logf("[ADS] ID = 0x%02X -> %s, %u channels\n", g_info.id, g_info.name, g_info.channels);

  const char* err = ads129x::validatePlan(g_info.channels);
  if (err) {
    logf("[ADS] %s - fix CHANNEL_MAP in include/config.h\n", err);
    return false;
  }
  return configureAndStart();
}

// Mode / test-signal change without a full reset.
static void reconfigure()
{
  if (!g_info.valid) { g_adsOk = bringUp(); return; }
  pauseStream();
  g_adsOk = configureAndStart();
}

// ---------- one decimated sample ----------
static void processSample(const OutSample& s)
{
  if (s.n > 0) {
    for (uint8_t i = 0; i < 4; i++) g_uv[i] = countsToUv(s.sum[i], s.n);
  }
  // With the test signal the electrodes are disconnected and lead-off sensing
  // is off, so the status bits mean nothing.
  const uint8_t sp = g_test ? 0 : s.stat_p;
  const uint8_t sn = g_test ? 0 : s.stat_n;

  if (g_mode == MODE_COMPAT) {
    const bool ra1 = electrodeOff(E_RA1, sp, sn);
    const bool ra2 = electrodeOff(E_RA2, sp, sn);
    uint8_t lod = 0;
    if (COMPAT_RA_OFF_IF_ANY ? (ra1 || ra2) : (ra1 && ra2)) lod |= LOD_RA;
    if (electrodeOff(E_LA,  sp, sn)) lod |= LOD_LA;
    if (electrodeOff(E_LL1, sp, sn)) lod |= LOD_LL;
    if (electrodeOff(E_LL2, sp, sn)) lod |= LOD_LL2;

    // Right-leg drive health. The ADS129x has no live "RLD rail" bit like the
    // ADS1293's ERROR_MISC: its RLD lead-off check only works with the RLD
    // amplifier switched off (section 9.3.1.7.5). What a missing reference
    // electrode does produce is a common-mode voltage with nothing holding it,
    // which drifts until EVERY sensed input on one side crosses its comparator.
    // That pattern, held for 0.5 s, is reported as the RLD fault. A heuristic:
    // see the README's list of things only hardware can confirm.
    const bool cm_out = !g_test && g_usedMask != 0 &&
                        ((sp & g_usedMask) == g_usedMask || (sn & g_usedMask) == g_usedMask);
    if (cm_out) { if (g_rldRun < 0xFFFF) g_rldRun++; } else { g_rldRun = 0; }
    const bool rld_fault = g_rldRun >= RLD_FAULT_SAMPLES;

    uint8_t flags = ECG3_FLAG_ADS_OK;
    if (rld_fault) flags |= ECG3_FLAG_RLD_FAULT;
    StreamStats st;
    stream::stats(st);
    const bool overflowed = st.ring_overflow != g_ringOverflowSeen;
    g_ringOverflowSeen = st.ring_overflow;
    if (s.n < COMPAT_MIN_CONVERSIONS || (s.flags & OUT_FLAG_DISCONTINUITY) || overflowed) {
      flags |= ECG3_FLAG_SAMPLES_MISSED;
    }

    const int32_t lead_i    = (g_uv[0] + g_uv[1]) / 2;
    const int32_t lead_ii_a = g_uv[0] + g_uv[2];
    const int32_t lead_ii_b = g_uv[1] + g_uv[3];
    compat::push(lead_i, lead_ii_a, lead_ii_b, lod, flags);

    if (lod != g_lastLod || rld_fault != g_lastRldFault) {
      logf("# lead-off: RA1=%s RA2=%s LA=%s LL1=%s LL2=%s | lod=0x%02X rld_fault=%d\n",
           ra1 ? "OFF" : "ok", ra2 ? "OFF" : "ok",
           (lod & LOD_LA) ? "OFF" : "ok", (lod & LOD_LL) ? "OFF" : "ok", (lod & LOD_LL2) ? "OFF" : "ok",
           lod, rld_fault ? 1 : 0);
      g_lastLod = lod;
      g_lastRldFault = rld_fault;
    }
  }

  if (g_csv) {
    logf("%lu,%ld,%ld,%ld,%ld,%02X,%02X,%u\n", (unsigned long)g_sampleCount,
         (long)g_uv[0], (long)g_uv[1], (long)g_uv[2], (long)g_uv[3], sp, sn, s.n);
  }
  g_sampleCount++;
}

// ---------- serial ----------
static void printHelp()
{
  logf("keys: r = raw CSV on   s = CSV off   i = info + register dump\n");
  logf("      n = native 500 SPS test (serial only, BLE stream paused)   c = back to compat 320 Hz\n");
  logf("      t = internal 1 mV square-wave test signal on/off   h = this help\n");
}

static void printCsvHeader()
{
  logf("# count,ch1_uV,ch2_uV,ch3_uV,ch4_uV,loff_statp_hex,loff_statn_hex,conversions_averaged   (%s)\n",
       g_mode == MODE_COMPAT ? "320 Hz" : "500 Hz");
}

static void printInfo()
{
  StreamStats st;
  stream::stats(st);
  const bool was_running = stream::running();
  // Registers can only be read in SDATAC mode, so the stream stops for the read
  // and is back on before the slow part (printing). The restart drops a
  // half-built BLE packet: this key is not for use during a recording.
  if (g_info.valid) {
    if (was_running) pauseStream();
    ads129x::readRegs(0x00, g_regs, ADS_REG_COUNT);
    if (was_running) startStream();
  }

  logf("=== %s v%s ===\n", FW_NAME, FW_VERSION);
  logf("mode: %s%s | BLE identity check: %s | DRDY edge counter: %s\n",
       g_mode == MODE_COMPAT ? "COMPAT 8 kSPS / 25 = 320 Hz" : "NATIVE 500 SPS (serial only)",
       g_test ? " + INTERNAL TEST SIGNAL" : "",
       compat::identityOk() ? "ok" : "UUID ARRAYS WRONG",
       g_hwTicks ? "hardware (TIMER + PPI)" : "SOFTWARE FALLBACK (rate can slip under load)");
  if (g_info.valid) {
    logf("device: ID 0x%02X = %s, %u channels. Registers read back now:\n", g_info.id, g_info.name, g_info.channels);
    dumpRegs();
    logf("CONFIG3 bit0 RLD_STAT = %u (only meaningful with the RLD amplifier off)\n", g_regs[ADS_REG_CONFIG3] & 0x01);
  } else {
    logf("device: NOT DETECTED (last ID read 0x%02X)\n", g_info.id);
  }
  logf("channel table (include/config.h):\n");
  static const char* const WHAT[4] = { "LA  - RA1", "LA  - RA2", "LL1 - LA ", "LL2 - LA " };
  for (uint8_t i = 0; i < 4; i++) {
    logf("  logical CH%u = %s  <- ADS channel %u, sign %+d\n", i + 1, WHAT[i],
         CHANNEL_MAP[i].ads_channel, CHANNEL_MAP[i].sign);
  }
  logf("electrode -> ADS input (lead-off bits):\n");
  printInputs("LA", E_LA); printInputs("RA1", E_RA1); printInputs("RA2", E_RA2);
  printInputs("LL1", E_LL1); printInputs("LL2", E_LL2);
  logf("since the stream last started: edges=%lu read=%lu missed=%lu overrun=%lu badsync=%lu out=%lu ring_ovf=%lu starved=%lu\n",
       (unsigned long)st.ticks, (unsigned long)st.serviced, (unsigned long)st.missed, (unsigned long)st.overrun,
       (unsigned long)st.bad_sync, (unsigned long)st.out_samples, (unsigned long)st.ring_overflow, (unsigned long)st.starved);
  logf("conversions at the ADC rail: ch1=%lu ch2=%lu ch3=%lu ch4=%lu\n",
       (unsigned long)st.rail[0], (unsigned long)st.rail[1], (unsigned long)st.rail[2], (unsigned long)st.rail[3]);
  CompatStats cs;
  compat::stats(cs);
  logf("BLE: %s%s%s mtu=%u packets(3ch)=%lu packets(legacy)=%lu notify_fails=%lu\n",
       cs.connected ? "connected" : "advertising", cs.sub3 ? " [3-channel subscribed]" : "",
       cs.sub_legacy ? " [legacy subscribed]" : "", cs.mtu,
       (unsigned long)cs.packets3, (unsigned long)cs.packets_legacy, (unsigned long)cs.notify_fails);
  printHelp();

  if (!g_info.valid) g_adsOk = bringUp();       // nothing detected yet: try again right now
}

static void handleSerial()
{
  while (Serial && Serial.available() > 0) {
    const int c = Serial.read();
    switch (c) {
      case 'r': g_csv = true; printCsvHeader(); break;
      case 's': g_csv = false; logf("# CSV off\n"); break;
      case 'i': printInfo(); break;
      case 'n':
        if (g_mode != MODE_NATIVE) { g_mode = MODE_NATIVE; reconfigure(); }
        g_csv = true;
        printCsvHeader();
        break;
      case 'c':
        if (g_mode != MODE_COMPAT) { g_mode = MODE_COMPAT; reconfigure(); }
        logf("# compat mode: 320 Hz, BLE stream on\n");
        break;
      case 't':
        g_test = !g_test;
        reconfigure();
        logf("# internal test signal %s\n", g_test ? "ON: every channel carries a 1 mV, ~1 Hz square wave" : "off: electrodes");
        break;
      case 'h': case '?': printHelp(); break;
      default: break;
    }
  }
}

// ---------- housekeeping ----------
static void housekeeping()
{
  const uint32_t now = millis();

  // BLE state, four times a second (each query is a SoftDevice call).
  if (now - g_blePollMs >= 250) {
    g_blePollMs = now;
    compat::stats(g_ble);
    const bool sub = g_ble.sub3 || g_ble.sub_legacy;
    if (g_ble.connected != g_bleWasConnected || sub != g_bleWasSub) {
      logf("# BLE %s%s mtu=%u\n", g_ble.connected ? "connected" : "disconnected",
           g_ble.sub3 ? ", 3-channel stream subscribed" : (g_ble.sub_legacy ? ", legacy stream subscribed" : ""),
           g_ble.mtu);
      g_bleWasConnected = g_ble.connected;
      g_bleWasSub = sub;
    }
  }
  const CompatStats& cs = g_ble;

  if (!g_adsOk) {
    // Keep trying: a jumper pushed back in should not need a reflash or a reset.
    if (now - g_retryMs >= 3000) {
      g_adsOk = bringUp();
      g_retryMs = millis();
    }
    return;
  }

  // Watchdog, once a second: is DRDY moving, and do the frames look like frames?
  if (now - g_wdMs >= 1000) {
    StreamStats st;
    stream::stats(st);
    const uint32_t ticks = stream::tickNow();
    g_wdSilent = (ticks == g_wdTicks) ? (uint8_t)(g_wdSilent + 1) : 0;
    const uint32_t d_tick = ticks - g_wdTicks;
    const uint32_t d_serv = st.serviced - g_wdServiced;
    const uint32_t d_bad  = st.bad_sync - g_wdBadSync;
    g_wdMs = now; g_wdTicks = ticks; g_wdServiced = st.serviced; g_wdBadSync = st.bad_sync;

    if (g_wdSilent >= 2) {
      logf("# DRDY has not moved for 2 s (pad 3, START pad 2) - re-initialising the ADS\n");
      stream::stop();
      g_adsOk = false; g_wdSilent = 0; g_retryMs = now - 3000;
      return;
    }
    if (d_tick > 100 && d_serv == 0) {
      logf("# DRDY is toggling but no frame was read for 1 s - restarting the stream\n");
      stream::stop();
      g_adsOk = false; g_retryMs = now - 3000;
      return;
    }
    if (d_serv > 100 && d_bad * 2 > d_serv) {
      logf("# more than half of the frames fail the 1100b status check (DOUT pad 9, SPI rate, ADS_READ_FULL_FRAME) - re-initialising\n");
      stream::stop();
      g_adsOk = false; g_retryMs = now - 3000;
      return;
    }
  }

  // Status line every 5 s. The measured rate is the ADS oscillator seen through
  // the XIAO's 32.768 kHz crystal: with the internal oscillator expect +/-0.5 %
  // at room temperature (SBAS459K Electrical Characteristics).
  if (now - g_statusMs >= 5000) {
    StreamStats st;
    stream::stats(st);
    const uint32_t ticks = stream::tickNow();
    const uint32_t dt = now - g_statusMs;
    const uint32_t sps_x10 = dt ? (uint32_t)(((uint64_t)(ticks - g_statusTicks) * 10000u) / dt) : 0;
    const uint32_t decim = (g_mode == MODE_COMPAT) ? COMPAT_DECIMATION : 1;
    const uint32_t out_x100 = sps_x10 * 10u / decim;
    g_statusMs = now; g_statusTicks = ticks;
    logf("# %s %s%s: %lu.%lu SPS -> %lu.%02lu Hz out | missed=%lu overrun=%lu badsync=%lu ring_ovf=%lu rail=%lu/%lu/%lu/%lu | lod=0x%02X rld=%d | BLE %s nf=%lu\n",
         g_info.name, g_mode == MODE_COMPAT ? "compat" : "native", g_test ? "+test" : "",
         (unsigned long)(sps_x10 / 10), (unsigned long)(sps_x10 % 10),
         (unsigned long)(out_x100 / 100), (unsigned long)(out_x100 % 100),
         (unsigned long)st.missed, (unsigned long)st.overrun, (unsigned long)st.bad_sync, (unsigned long)st.ring_overflow,
         (unsigned long)st.rail[0], (unsigned long)st.rail[1], (unsigned long)st.rail[2], (unsigned long)st.rail[3],
         g_lastLod, g_lastRldFault ? 1 : 0,
         cs.sub3 ? "3ch" : (cs.sub_legacy ? "legacy" : (cs.connected ? "connected" : "adv")),
         (unsigned long)cs.notify_fails);
  }
}

// ---------- setup ----------
void setup()
{
  // First thing: hold the ADS in reset / power-down with CS high, before
  // anything else can wiggle the bus.
  ads129x::pinsBegin();

  Serial.begin(115200);
  // Bounded wait: give a USB terminal a moment to attach, never hang on battery.
  const uint32_t t0 = millis();
  while (!Serial && (millis() - t0) < 2000) delay(10);

  logf("\n=== %s v%s ===\n", FW_NAME, FW_VERSION);
  logf("pads: PWDN=0 RESET=1 START=2 DRDY=3 CS=7 SCLK=8 DOUT=9 DIN=10\n");

  compat::begin();                    // enables the SoftDevice; must precede stream::begin()
  logf("[BLE] advertising as \"%s\" (production v3 identity)%s\n", BLE_DEVICE_NAME,
       compat::identityOk() ? "" : " - UUID ARRAYS DO NOT MATCH THE STRINGS, FIX compat_ble.cpp");

  ads129x::busBegin();
  g_hwTicks = stream::begin();
  if (!g_hwTicks) logf("[ADS] hardware DRDY counter unavailable - falling back to counting in the interrupt\n");

  buildElectrodeMap();
  g_adsOk = bringUp();
  printHelp();

  const uint32_t now = millis();
  g_statusMs = g_wdMs = g_retryMs = now;
  g_statusTicks = g_wdTicks = stream::tickNow();
}

// ---------- loop: the OUTPUT half only. It never touches the ADC. ----------
void loop()
{
  handleSerial();

  bool any = false;
  if (g_adsOk) {
    OutSample s;
    while (stream::pop(s)) {
      processSample(s);
      any = true;
    }
  }

  housekeeping();
  if (!any) delay(1);                 // 320 samples/s: a 1 ms nap costs a third of a sample of latency
}

// v0.1.0 - stage-2 bench main: bring-up with retry, counts-to-microvolts, compat lead mapping + lead-off mapping, serial keys r/s/i/n/c/t, watchdog and rate report
