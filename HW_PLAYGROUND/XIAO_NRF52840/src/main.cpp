// ============================================================
// CYPHIX HW_PLAYGROUND - Seeed XIAO nRF52840 build
//
// ADS1293 @ 1280 Hz x 3 channels -> median-5 + avg-decim /4 -> 320 Hz
// (the exact production pipeline, x3 channels)
//
// Default electrode plan (preset 0): TWO copies of Lead II + ONE Lead I,
// with a dedicated RLD electrode on IN6.
//
// BLE GATT (name: CYPHIX-XIAO):
//   DATA  notify: [seq][count][preset][flags] + 12 x {i32 ch1uV, i32 ch2uV, i32 ch3uV, u8 lod}
//   CTRL  write:  register read/write, preset switch, stream pause, reg dump
//   STAT  notify: command replies
//
// Register access happens ONLY on loop(), never from the BLE callback -
// commands are queued into a single-producer/single-consumer ring - so SPI
// is never driven from two contexts at once.
//
// PORT NOTES vs firmware_playground (ESP32):
//   - BLEDevice/BLE2902      -> Adafruit Bluefruit (CCCD is implicit)
//   - FreeRTOS queue         -> plain SPSC ring (no RTOS API dependency)
//   - task notify + IRAM_ATTR -> volatile DRDY counter polled by loop()
//   - Serial.printf          -> vsnprintf helper (portable, and never blocks
//                               when no USB terminal is attached)
// ============================================================

#include <Arduino.h>
#include <SPI.h>
#include <bluefruit.h>
#include <stdarg.h>
#include "config.h"
#include "ads1293.h"

// ---------- 128-bit UUIDs ----------
// Bluefruit wants uuid128 LEAST-significant byte first, i.e. the printed UUID
// string reversed byte-by-byte. Getting this backwards is the classic nRF52
// porting bug: the service simply never shows up in a scan.
//   cf9a1293-0101-4b1c-9e0a-c0dec0dec0de
//   -> de c0 de c0 de c0 0a 9e 1c 4b 01 01 93 12 9a cf
static const uint8_t UUID_SVC[16]  = {0xde,0xc0,0xde,0xc0,0xde,0xc0,0x0a,0x9e,0x1c,0x4b,0x01,0x01,0x93,0x12,0x9a,0xcf};
static const uint8_t UUID_DATA[16] = {0xde,0xc0,0xde,0xc0,0xde,0xc0,0x0a,0x9e,0x1c,0x4b,0x02,0x01,0x93,0x12,0x9a,0xcf};
static const uint8_t UUID_CTRL[16] = {0xde,0xc0,0xde,0xc0,0xde,0xc0,0x0a,0x9e,0x1c,0x4b,0x03,0x01,0x93,0x12,0x9a,0xcf};
static const uint8_t UUID_STAT[16] = {0xde,0xc0,0xde,0xc0,0xde,0xc0,0x0a,0x9e,0x1c,0x4b,0x04,0x01,0x93,0x12,0x9a,0xcf};

BLEService        pgService(UUID_SVC);
BLECharacteristic pgData(UUID_DATA);
BLECharacteristic pgCtrl(UUID_CTRL);
BLECharacteristic pgStat(UUID_STAT);

// ---------- state ----------
static bool     ads_ok = false;
static volatile uint8_t g_preset    = PRESET_DEFAULT;
static volatile bool    g_streaming = true;
static uint8_t  g_nch = 3;                // channels in the data loop for g_preset
static volatile bool ble_connected = false;

#define PG_PACKET_BYTES (PG_HEADER_BYTES + PG_SAMPLES_PER_PACKET * PG_SAMPLE_BYTES)
static uint8_t ble_buf[PG_PACKET_BYTES];
static uint8_t ble_idx = 0;
static uint8_t ble_seq = 0;

// Health counters, surfaced in the packet flags byte.
static uint32_t missed_samples = 0;       // DRDY ticks we could not service in time
static uint32_t notify_fails   = 0;       // notify() rejected (BLE backpressure)
static bool     flag_missed    = false;
static bool     flag_notifail  = false;

// ---------- logging ----------
// Never blocks: USB CDC is only touched while a terminal actually has the
// port open, so an unattended board runs at full speed.
static void logf(const char* fmt, ...) {
  if (!Serial) return;
  char buf[160];
  va_list ap;
  va_start(ap, fmt);
  vsnprintf(buf, sizeof(buf), fmt, ap);
  va_end(ap);
  Serial.print(buf);
}

// ---------- control command queue (SPSC ring) ----------
// Producer: the Bluefruit callback context. Consumer: loop().
// Single core + preemptive scheduler => volatile indices are sufficient here;
// a context switch is itself a barrier, and only one side writes each index.
struct CtrlCmd { uint8_t op, a, b; };
static const uint8_t CTRL_Q_LEN = 16;
static CtrlCmd ctrl_q[CTRL_Q_LEN];
static volatile uint8_t ctrl_head = 0;    // written by the BLE context only
static volatile uint8_t ctrl_tail = 0;    // written by loop() only

static void ctrlPush(const CtrlCmd& c) {
  uint8_t h = ctrl_head;
  uint8_t n = (uint8_t)((h + 1) % CTRL_Q_LEN);
  if (n == ctrl_tail) return;             // full - drop rather than block the BLE stack
  ctrl_q[h] = c;
  ctrl_head = n;
}

// ---------- DRDY ----------
static volatile uint32_t drdy_ticks   = 0;
static uint32_t          drdy_handled = 0;

static void drdyISR() { drdy_ticks++; }

// ---------- BLE callbacks ----------
static void connect_cb(uint16_t conn_handle) {
  BLEConnection* conn = Bluefruit.Connection(conn_handle);
  ble_connected = true;
  ble_idx = 0;
  ble_seq = 0;                            // per-connection seq, matching the GUI's loss counter
  char name[32] = {0};
  if (conn) conn->getPeerName(name, sizeof(name) - 1);
  logf("[BLE] connected to %s\n", name[0] ? name : "central");
}

static void disconnect_cb(uint16_t conn_handle, uint8_t reason) {
  (void)conn_handle;
  ble_connected = false;
  ble_idx = 0;
  logf("[BLE] disconnected (reason 0x%02X)\n", reason);
}

static void ctrl_write_cb(uint16_t conn_handle, BLECharacteristic* chr, uint8_t* data, uint16_t len) {
  (void)conn_handle; (void)chr;
  if (len < 1) return;
  CtrlCmd cmd = { data[0],
                  (uint8_t)(len > 1 ? data[1] : 0),
                  (uint8_t)(len > 2 ? data[2] : 0) };
  ctrlPush(cmd);                          // never touch SPI from here
}

static void statNotify(const uint8_t* payload, size_t len) {
  if (!ble_connected) return;
  pgStat.notify(payload, len);
}

// ---------- DSP (identical maths to production) ----------
static const float ADC_MAX = 0xC35000;
static float convert_to_mv(uint32_t raw) {
  return ((float)raw / ADC_MAX - 0.5f) * 48000.0f / 35.0f;
}

struct MedianState { float buf[5] = {0,0,0,0,0}; uint8_t idx = 0; };

static float median5(float a, float b, float c, float d, float e) {
  float t;
  if (a > b) { t=a; a=b; b=t; }
  if (c > d) { t=c; c=d; d=t; }
  if (a > c) { t=a; a=c; c=t; t=b; b=d; d=t; }
  if (b > e) { t=b; b=e; e=t; }
  if (b > c) { t=b; b=c; c=t; }
  if (d > e) { t=d; d=e; e=t; }
  if (c > d) { c = d; }
  if (b > c) { c = b; }
  return c;
}

static float median_process(MedianState &s, float x) {
  s.buf[s.idx] = x;
  s.idx = (s.idx + 1) % 5;
  return median5(s.buf[0], s.buf[1], s.buf[2], s.buf[3], s.buf[4]);
}

static MedianState med[3];
static float acc[3] = {0, 0, 0};
static uint8_t decim_count = 0;

static void resetPipeline() {
  for (int c = 0; c < 3; c++) { med[c] = MedianState(); acc[c] = 0.0f; }
  decim_count = 0;
  ble_idx = 0;
}

// ---------- control command execution (loop() only) ----------
static void execCtrl(const CtrlCmd& cmd) {
  uint8_t reply[19];
  switch (cmd.op) {
    case PG_OP_WREG:
      ads1293::Reg_Write(cmd.a, cmd.b);
      logf("[CTRL] wreg 0x%02X <- 0x%02X\n", cmd.a, cmd.b);
      reply[0] = PG_OP_WREG; reply[1] = cmd.a; reply[2] = cmd.b;
      statNotify(reply, 3);
      break;
    case PG_OP_RREG: {
      uint8_t v = ads1293::Reg_Read(cmd.a);
      logf("[CTRL] rreg 0x%02X -> 0x%02X\n", cmd.a, v);
      reply[0] = PG_OP_RREG; reply[1] = cmd.a; reply[2] = v;
      statNotify(reply, 3);
      break;
    }
    case PG_OP_PRESET: {
      bool ok = ads1293::Apply_Preset(cmd.a);
      if (ok) {
        g_preset = cmd.a;
        g_nch = ads1293::Preset_Channels(cmd.a);
        resetPipeline();
        drdy_handled = drdy_ticks;        // do not report the reconfig gap as sample loss
      }
      logf("[CTRL] preset %u -> %s\n", cmd.a, ok ? "OK" : "FAIL");
      reply[0] = PG_OP_PRESET; reply[1] = cmd.a; reply[2] = ok ? 1 : 0;
      statNotify(reply, 3);
      break;
    }
    case PG_OP_STREAM:
      g_streaming = cmd.a != 0;
      ble_idx = 0;
      logf("[CTRL] stream %s\n", g_streaming ? "on" : "off");
      reply[0] = PG_OP_STREAM; reply[1] = cmd.a;
      statNotify(reply, 2);
      break;
    case PG_OP_DUMP:
      // 0x00..0x2F in chunks of 16: [op][start][n][vals...]
      for (uint8_t start = 0x00; start < 0x30; start += 16) {
        reply[0] = PG_OP_DUMP; reply[1] = start; reply[2] = 16;
        for (uint8_t i = 0; i < 16; i++) reply[3 + i] = ads1293::Reg_Read(start + i);
        statNotify(reply, 19);
        delay(10);                        // let the SoftDevice drain the HVN queue
      }
      drdy_handled = drdy_ticks;          // the dump stalls sampling; not a hardware loss
      logf("[CTRL] reg dump sent\n");
      break;
    default:
      logf("[CTRL] unknown op 0x%02X\n", cmd.op);
  }
}

// ---------- setup ----------
void setup() {
  Serial.begin(115200);
  // Bounded wait: give a USB terminal a moment to attach, but never hang when
  // the board is running on battery with nothing listening.
  uint32_t t0 = millis();
  while (!Serial && (millis() - t0) < 2000) delay(10);
  logf("=== CYPHIX HW_PLAYGROUND - XIAO nRF52840 ===\n");

  // --- BLE ---
  Bluefruit.configPrphBandwidth(BANDWIDTH_MAX);   // MTU 247 + deeper HVN queue; MUST precede begin()
  Bluefruit.begin();
  Bluefruit.setTxPower(4);
  Bluefruit.setName(PG_DEVICE_NAME);
  Bluefruit.Periph.setConnectCallback(connect_cb);
  Bluefruit.Periph.setDisconnectCallback(disconnect_cb);
  // 7.5-15 ms connection interval: 26.7 notifies/s needs far less, but the
  // headroom keeps a 160 B packet from queueing up behind a slow central.
  Bluefruit.Periph.setConnInterval(6, 12);

  pgService.begin();                              // service first, then its characteristics

  pgData.setProperties(CHR_PROPS_NOTIFY | CHR_PROPS_READ);
  pgData.setPermission(SECMODE_OPEN, SECMODE_NO_ACCESS);
  pgData.setMaxLen(PG_PACKET_BYTES);
  pgData.begin();

  pgCtrl.setProperties(CHR_PROPS_WRITE | CHR_PROPS_WRITE_WO_RESP);
  pgCtrl.setPermission(SECMODE_NO_ACCESS, SECMODE_OPEN);
  pgCtrl.setMaxLen(20);
  pgCtrl.setWriteCallback(ctrl_write_cb);
  pgCtrl.begin();

  pgStat.setProperties(CHR_PROPS_NOTIFY | CHR_PROPS_READ);
  pgStat.setPermission(SECMODE_OPEN, SECMODE_NO_ACCESS);
  pgStat.setMaxLen(19);
  pgStat.begin();

  Bluefruit.Advertising.addFlags(BLE_GAP_ADV_FLAGS_LE_ONLY_GENERAL_DISC_MODE);
  Bluefruit.Advertising.addTxPower();
  Bluefruit.Advertising.addService(pgService);     // 128-bit UUID = 18 of the 31 adv bytes
  Bluefruit.ScanResponse.addName();                // name goes in the scan response
  Bluefruit.Advertising.restartOnDisconnect(true);
  Bluefruit.Advertising.setInterval(32, 244);
  Bluefruit.Advertising.setFastTimeout(30);
  Bluefruit.Advertising.start(0);
  logf("[BLE] advertising as %s\n", PG_DEVICE_NAME);

  // --- ADS1293 ---
  ads1293::spi_Init();
  ads_ok = ads1293::Apply_Preset(PRESET_DEFAULT);
  g_nch  = ads1293::Preset_Channels(PRESET_DEFAULT);
  logf("ADS1293 init (preset %u): %s | REVID=0x%02X\n",
       PRESET_DEFAULT, ads_ok ? "OK" : "FAIL", ads1293::Reg_Read(REVID));
  if (!ads_ok) {
    logf("  -> REVID != 0x01: check CSB(pad 7) / SCLK(8) / SDO(9) / SDI(10) / shared GND / 3V3\n");
  }

  drdy_ticks   = 0;
  drdy_handled = 0;
  attachInterrupt(digitalPinToInterrupt(PIN_ADS_DRDY), drdyISR, FALLING);
#if SERIAL_CSV
  logf("Serial CSV: ch1_uV,ch2_uV,ch3_uV,combined_uV,lod_raw,count @ %u Hz\n", OUT_RATE_HZ);
#endif
}

// ---------- main loop ----------
void loop() {
  // 1) drain queued BLE control commands (SPI stays single-context)
  while (ctrl_tail != ctrl_head) {
    CtrlCmd c = ctrl_q[ctrl_tail];
    ctrl_tail = (uint8_t)((ctrl_tail + 1) % CTRL_Q_LEN);
    execCtrl(c);
  }

  if (!ads_ok) { delay(1); return; }

  // 2) has a new conversion landed?
  uint32_t ticks = drdy_ticks;
  if (ticks == drdy_handled) { yield(); return; }
  uint32_t behind = ticks - drdy_handled;
  if (behind > 1) {
    // The data loop only ever holds the newest conversion, so whatever we fell
    // behind on is genuinely gone. Count it instead of pretending otherwise.
    missed_samples += (behind - 1);
    flag_missed = true;
  }
  drdy_handled = ticks;

  const uint8_t nch = g_nch;
  const int loop_bytes = nch * 3;
  uint8_t raw[9] = {0};
  ads1293::Read_Data_Stream(raw, loop_bytes);

  float mv[3] = {0, 0, 0};
  for (uint8_t c = 0; c < nch; c++) {
    uint32_t r = ((uint32_t)raw[c*3] << 16) | ((uint32_t)raw[c*3+1] << 8) | raw[c*3+2];
    mv[c] = median_process(med[c], convert_to_mv(r));
    acc[c] += mv[c];
  }

  if (++decim_count < DECIM_FACTOR) return;

  int32_t uv[3];
  for (int c = 0; c < 3; c++) {
    uv[c] = (int32_t)(acc[c] / (float)DECIM_FACTOR * 1000.0f);
    acc[c] = 0.0f;
  }
  decim_count = 0;

  uint8_t lod_raw = ads1293::Read_LOD_Status();

#if SERIAL_CSV
  {
    // "combined" is only the Lead II copies: in presets 0 and 1, CH3 carries
    // Lead I and must NOT be averaged into a Lead II estimate.
    static uint32_t sample_count = 0;
    int32_t comb;
    switch (g_preset) {
      case PRESET_2xII_I_SHARED:
      case PRESET_2xII_I_INDEP: comb = (uv[0] + uv[1]) / 2; break;
      case PRESET_PRODUCTION:   comb = uv[1];               break;
      default:                  comb = (uv[0] + uv[1] + uv[2]) / 3; break;
    }
    logf("%ld,%ld,%ld,%ld,%u,%lu\n",
         (long)uv[0], (long)uv[1], (long)uv[2], (long)comb,
         lod_raw, (unsigned long)sample_count++);
  }
#endif

  // 3) pack + notify
  if (g_streaming && ble_connected) {
    int off = PG_HEADER_BYTES + ble_idx * PG_SAMPLE_BYTES;
    memcpy(&ble_buf[off],     &uv[0], 4);
    memcpy(&ble_buf[off + 4], &uv[1], 4);
    memcpy(&ble_buf[off + 8], &uv[2], 4);
    ble_buf[off + 12] = lod_raw;
    ble_idx++;

    if (ble_idx >= PG_SAMPLES_PER_PACKET) {
      ble_buf[0] = ble_seq++;
      ble_buf[1] = ble_idx;
      ble_buf[2] = g_preset;
      // flags: bit0 = ADS healthy, bit1 = samples missed since the last packet,
      //        bit2 = the previous notify was rejected (BLE backpressure)
      ble_buf[3] = (uint8_t)((ads_ok ? 0x01 : 0x00)
                           | (flag_missed ? 0x02 : 0x00)
                           | (flag_notifail ? 0x04 : 0x00));
      bool ok = pgData.notify(ble_buf, PG_HEADER_BYTES + ble_idx * PG_SAMPLE_BYTES);
      if (!ok) { notify_fails++; flag_notifail = true; }
      else     { flag_notifail = false; }
      flag_missed = false;
      ble_idx = 0;
    }
  } else {
    ble_idx = 0;
  }
}

// v0.1.0 - XIAO main: Bluefruit GATT, SPSC ctrl ring, DRDY counter with honest loss reporting, 320 Hz pipeline
