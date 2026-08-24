// ============================================================
// CYPHIX HW_PLAYGROUND firmware — 3× Lead II experiment
//
// ADS1293 @ 1280 Hz × 3 channels → median-5 + avg-decim ÷4 → 320 Hz
// (the exact production pipeline, ×3 channels)
//
// BLE GATT (name: CYPHIX-PLAYGROUND):
//   DATA  notify: [seq][count][preset][flags] + 12 × {i32 ch1uV, i32 ch2uV, i32 ch3uV, u8 lod}
//   CTRL  write:  register read/write, preset switch, stream pause, reg dump
//   STAT  notify: command replies
//
// Register access happens ONLY on the loop task (commands are queued from
// the BLE callback) so SPI is never used from two tasks at once.
// ============================================================

#include <Arduino.h>
#include <SPI.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include "config.h"
#include "ads1293.h"

// ---------- state ----------
static bool ads_ok = false;
static volatile uint8_t g_preset = PRESET_DEFAULT;
static volatile bool g_streaming = true;
static TaskHandle_t loop_task = NULL;

// ---------- BLE ----------
BLEServer* pServer = NULL;
BLECharacteristic* pDataChar = NULL;
BLECharacteristic* pStatChar = NULL;
static volatile bool ble_connected = false;

static uint8_t ble_buf[PG_HEADER_BYTES + PG_SAMPLES_PER_PACKET * PG_SAMPLE_BYTES];
static uint8_t ble_idx = 0;
static uint8_t ble_seq = 0;

// Commands from the BLE write callback → executed on the loop task.
struct CtrlCmd { uint8_t op, a, b; };
static QueueHandle_t ctrl_q = NULL;

class PgServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer*) override {
    ble_connected = true;
    ble_idx = 0;
    Serial.println("[BLE] client connected");
    BLEDevice::startAdvertising();
  }
  void onDisconnect(BLEServer*) override {
    ble_connected = false;
    ble_idx = 0;
    Serial.println("[BLE] client disconnected");
    BLEDevice::startAdvertising();
  }
};

class PgCtrlCallbacks : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic* c) override {
    std::string v = c->getValue();
    if (v.empty()) return;
    CtrlCmd cmd = { (uint8_t)v[0],
                    (uint8_t)(v.size() > 1 ? v[1] : 0),
                    (uint8_t)(v.size() > 2 ? v[2] : 0) };
    xQueueSend(ctrl_q, &cmd, 0);  // never block the BT task
  }
};

static void statNotify(const uint8_t* payload, size_t len) {
  if (!ble_connected || !pStatChar) return;
  pStatChar->setValue((uint8_t*)payload, len);
  pStatChar->notify();
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

// ---------- control command execution (loop task only) ----------
static void execCtrl(const CtrlCmd& cmd) {
  uint8_t reply[19];
  switch (cmd.op) {
    case PG_OP_WREG:
      ads1293::Reg_Write(cmd.a, cmd.b);
      Serial.printf("[CTRL] wreg 0x%02X <- 0x%02X\n", cmd.a, cmd.b);
      reply[0] = PG_OP_WREG; reply[1] = cmd.a; reply[2] = cmd.b;
      statNotify(reply, 3);
      break;
    case PG_OP_RREG: {
      uint8_t v = ads1293::Reg_Read(cmd.a);
      Serial.printf("[CTRL] rreg 0x%02X -> 0x%02X\n", cmd.a, v);
      reply[0] = PG_OP_RREG; reply[1] = cmd.a; reply[2] = v;
      statNotify(reply, 3);
      break;
    }
    case PG_OP_PRESET: {
      bool ok = ads1293::Apply_Preset(cmd.a);
      if (ok) { g_preset = cmd.a; resetPipeline(); }
      Serial.printf("[CTRL] preset %u -> %s\n", cmd.a, ok ? "OK" : "FAIL");
      reply[0] = PG_OP_PRESET; reply[1] = cmd.a; reply[2] = ok ? 1 : 0;
      statNotify(reply, 3);
      break;
    }
    case PG_OP_STREAM:
      g_streaming = cmd.a != 0;
      ble_idx = 0;
      Serial.printf("[CTRL] stream %s\n", g_streaming ? "on" : "off");
      reply[0] = PG_OP_STREAM; reply[1] = cmd.a;
      statNotify(reply, 2);
      break;
    case PG_OP_DUMP:
      // 0x00..0x2F in chunks of 16: [op][start][n][vals...]
      for (uint8_t start = 0x00; start < 0x30; start += 16) {
        reply[0] = PG_OP_DUMP; reply[1] = start; reply[2] = 16;
        for (uint8_t i = 0; i < 16; i++) reply[3 + i] = ads1293::Reg_Read(start + i);
        statNotify(reply, 19);
        delay(10);  // let the BT stack drain
      }
      Serial.println("[CTRL] reg dump sent");
      break;
    default:
      Serial.printf("[CTRL] unknown op 0x%02X\n", cmd.op);
  }
}

// ---------- setup ----------
void IRAM_ATTR DRDYHandler(void);

void setup() {
  Serial.begin(256000);
  delay(1000);
  Serial.println("=== CYPHIX HW_PLAYGROUND (3x Lead II) ===");

  ctrl_q = xQueueCreate(16, sizeof(CtrlCmd));

  BLEDevice::init(PG_DEVICE_NAME);
  BLEDevice::setMTU(185);
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new PgServerCallbacks());

  BLEService* svc = pServer->createService(PG_SERVICE_UUID);
  pDataChar = svc->createCharacteristic(
      PG_DATA_UUID, BLECharacteristic::PROPERTY_NOTIFY | BLECharacteristic::PROPERTY_READ);
  pDataChar->addDescriptor(new BLE2902());
  BLECharacteristic* ctrl = svc->createCharacteristic(
      PG_CTRL_UUID, BLECharacteristic::PROPERTY_WRITE | BLECharacteristic::PROPERTY_WRITE_NR);
  ctrl->setCallbacks(new PgCtrlCallbacks());
  pStatChar = svc->createCharacteristic(
      PG_STAT_UUID, BLECharacteristic::PROPERTY_NOTIFY | BLECharacteristic::PROPERTY_READ);
  pStatChar->addDescriptor(new BLE2902());
  svc->start();

  BLEAdvertising* adv = BLEDevice::getAdvertising();
  adv->addServiceUUID(PG_SERVICE_UUID);
  adv->setScanResponse(true);
  adv->setMinPreferred(0x06);
  BLEDevice::startAdvertising();
  Serial.printf("[BLE] advertising as %s\n", PG_DEVICE_NAME);

  ads1293::spi_Init();
  attachInterrupt(digitalPinToInterrupt(PIN_ADS_DRDY), DRDYHandler, FALLING);

  vTaskPrioritySet(NULL, 1);
  loop_task = xTaskGetCurrentTaskHandle();

  ads_ok = ads1293::Apply_Preset(PRESET_DEFAULT);
  Serial.printf("ADS1293 init (preset %u): %s | REVID=0x%02X\n",
                PRESET_DEFAULT, ads_ok ? "OK" : "FAIL", ads1293::Reg_Read(REVID));
  Serial.println("Serial CSV: ch1_uV,ch2_uV,ch3_uV,mean_uV,lod_raw,count @ 320 Hz");
}

// ---------- main loop ----------
void loop() {
  // Execute queued BLE control commands between samples (SPI stays single-task).
  CtrlCmd cmd;
  while (ctrl_q && xQueueReceive(ctrl_q, &cmd, 0) == pdTRUE) execCtrl(cmd);

  if (ulTaskNotifyTake(pdTRUE, 1) == 0) return;

  // Preset C keeps only CH1+CH2 in the loop (6 bytes); A/B carry 9.
  const bool three_ch = (g_preset != PRESET_C_CLASSIC);
  const int loop_bytes = three_ch ? 9 : 6;
  uint8_t raw[9] = {0};
  ads1293::Read_Data_Stream(raw, loop_bytes);

  float mv[3] = {0, 0, 0};
  const int nch = three_ch ? 3 : 2;
  for (int c = 0; c < nch; c++) {
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

  static uint32_t sample_count = 0;
  int32_t mean3 = three_ch ? (uv[0] + uv[1] + uv[2]) / 3 : uv[1];
  Serial.printf("%ld,%ld,%ld,%ld,%u,%lu\n",
                (long)uv[0], (long)uv[1], (long)uv[2], (long)mean3,
                lod_raw, (unsigned long)sample_count++);

  if (g_streaming && ble_connected && pDataChar) {
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
      ble_buf[3] = ads_ok ? 1 : 0;
      pDataChar->setValue(ble_buf, PG_HEADER_BYTES + ble_idx * PG_SAMPLE_BYTES);
      pDataChar->notify();
      ble_idx = 0;
    }
  }
}

void IRAM_ATTR DRDYHandler(void) {
  if (!ads_ok) return;
  BaseType_t hp = pdFALSE;
  if (loop_task) vTaskNotifyGiveFromISR(loop_task, &hp);
  portYIELD_FROM_ISR();
}

// v0.1.0 — playground main: 3-ch pipeline (median5+avg4 → 320 Hz), BLE data/ctrl/stat, presets A/B/C
