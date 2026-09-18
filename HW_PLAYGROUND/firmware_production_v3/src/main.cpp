// ============================================================
// CYPHIX production firmware v3.0.0 — dual Lead II + dedicated RLD
//
// v2 plus ONE measured channel and ONE BLE characteristic. Everything a v2
// client can see is byte-identical: same device name, same service, same legacy
// characteristic, same 16 x 9 B packets, same Serial/SPP CSV line. A v2 app —
// including every build ever shipped — cannot tell the difference, except that
// the trace is quieter because the RLD finally has its own electrode.
//
//   CH1 Lead I (IN2-IN1) · CH2 Lead II-a (IN3-IN1) · CH3 Lead II-b (IN4-IN1)
//   RLD -> IN6.   See src/ads1293.cpp for the electrode plan and why v3 NEEDS
//   the second cable.
//
// WHY A SECOND CHARACTERISTIC instead of a wider sample on the old one: the web
// client of the day chose its stride with `len-2 >= count*9 ? 9 : 5`, so a
// 13-byte sample would have been read as 9-byte samples and drawn as garbage,
// silently. A new characteristic cannot be misread by anyone: old apps never
// look at it, new apps prefer it and fall back to the legacy one on v2 firmware.
// A client subscribes to ONE of the two; notify() on the other is a no-op.
// ============================================================

#include "main.h"
#include <SPI.h>
#include <BluetoothSerial.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

#define FW_VERSION "3.0.0"

// ============ Bluetooth Classic (SPP) — kept for Python/PC ============
BluetoothSerial SerialBT;
static volatile bool bt_connected = false;

void btCallback(esp_spp_cb_event_t event, esp_spp_cb_param_t *param) {
  if (event == ESP_SPP_SRV_OPEN_EVT) {
    bt_connected = true;
    Serial.println("[BT-SPP] Client connected!");
  } else if (event == ESP_SPP_CLOSE_EVT) {
    bt_connected = false;
    Serial.println("[BT-SPP] Client disconnected!");
  }
}

// ============ BLE GATT ============
#define ECG_SERVICE_UUID    "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define ECG_DATA_CHAR_UUID  "beb5483e-36e1-4688-b7f5-ea07361b26a8"  // legacy, FROZEN
#define ECG_DATA3_CHAR_UUID "beb5483f-36e1-4688-b7f5-ea07361b26a8"  // v3: three channels

BLEServer*         pServer   = NULL;
BLECharacteristic* pEcgChar  = NULL;
BLECharacteristic* pEcg3Char = NULL;
static volatile bool ble_connected = false;

// ---- legacy packet: [seq:1][count:1][samples: count x 9] — UNCHANGED from v2 ----
// Each sample: int32_le(LeadI_uV) + int32_le(LeadII_uV) + uint8(LOD)
// 2 + 16x9 = 146 B, inside the 182 B ATT payload of the negotiated MTU 185.
#define BLE_SAMPLES_PER_PACKET 16
static uint8_t  ble_buf[2 + BLE_SAMPLES_PER_PACKET * 9];
static uint8_t  ble_idx = 0;
static uint8_t  ble_seq = 0;

// ---- 3-channel packet: [seq:1][count:1][flags:1][rsv:1][samples: count x 13] ----
// Each sample: int32_le(LeadI) + int32_le(LeadII-a) + int32_le(LeadII-b) + uint8(LOD), uV
// 4 + 12x13 = 160 B — the exact size both playground builds streamed with zero
// sequence gaps at this MTU. 320 Hz / 12 -> one notification every 37.5 ms.
// Mirrors CYPHIX_SHARED/src/ble/protocol.ts (parseEcgPacket3). Change both or neither.
#define BLE3_SAMPLES_PER_PACKET 12
#define BLE3_SAMPLE_BYTES       13
#define BLE3_HEADER_BYTES        4
static uint8_t  ble3_buf[BLE3_HEADER_BYTES + BLE3_SAMPLES_PER_PACKET * BLE3_SAMPLE_BYTES];
static uint8_t  ble3_idx = 0;
static uint8_t  ble3_seq = 0;

#define ECG3_FLAG_ADS_OK          0x01
#define ECG3_FLAG_SAMPLES_MISSED  0x02  // the MCU fell behind the ADC since the last packet
#define ECG3_FLAG_RLD_FAULT       0x08  // RLD rail / common-mode out of range: RLD electrode most likely off
static uint8_t  ble3_flags_sticky = 0;  // per-packet flags, cleared once the packet is sent

class ECGBLECallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer* s) override {
    ble_connected = true;
    ble_idx = 0;
    ble3_idx = 0;
    Serial.println("[BLE] Web client connected!");
    // Allow more connections
    BLEDevice::startAdvertising();
  }
  void onDisconnect(BLEServer* s) override {
    ble_connected = false;
    ble_idx = 0;
    ble3_idx = 0;
    Serial.println("[BLE] Web client disconnected!");
    BLEDevice::startAdvertising();
  }
};

// ============================================================
// ESP32 DSP — Minimal Path (RAW output, all filtering in the apps)
// Fs_in = 1280 Hz (ADS1293: R1=4, R2=5, R3=8)
//
// 1. Median5         — single-sample ADC spike / impulse removal
// 2. Avg Decimate /4 — accumulate 4 samples, output mean → 320 Hz
// 3. Einthoven       — 6-lead derivation (I,II,III,aVR,aVL,aVF), from Lead II-a
//
// The third channel goes through the IDENTICAL median + decimation as the other
// two: the apps fuse II-a and II-b sample by sample, and two copies that had been
// filtered differently would disagree about the heart, not just about the noise.
// ============================================================

// ----- 5-point median filter (spike & impulse removal) -----
// Covers 3.9 ms at 1280 Hz — safe for QRS (80-120 ms wide)
struct MedianState {
  float buf[5] = {0,0,0,0,0};
  uint8_t idx = 0;
};

static MedianState med_ch1, med_ch2, med_ch3;

// ----- ADC to mV conversion -----
static const float ADC_MAX = 0xC35000;
static float convert_to_mv(uint32_t raw) {
  return ((float)raw / ADC_MAX - 0.5f) * 48000.0f / 35.0f;
}

static float median5(float a, float b, float c, float d, float e) {
  // Sort 5 values using sorting network (optimal for 5 elements)
  float t;
  if (a > b) { t=a; a=b; b=t; }
  if (c > d) { t=c; c=d; d=t; }
  if (a > c) { t=a; a=c; c=t; t=b; b=d; d=t; }
  if (b > e) { t=b; b=e; e=t; }
  if (b > c) { t=b; b=c; c=t; }
  if (d > e) { t=d; d=e; e=t; }
  // Median is c
  if (c > d) { c = d; }
  if (b > c) { c = b; }
  return c;
}

static float median_process(MedianState &s, float x) {
  s.buf[s.idx] = x;
  s.idx = (s.idx + 1) % 5;
  return median5(s.buf[0], s.buf[1], s.buf[2], s.buf[3], s.buf[4]);
}

// ----- Averaging decimation (not skip-decimation) -----
// Accumulate DECIM_FACTOR samples, then output average.
// Gives ~6 dB noise reduction vs just picking every Nth sample.
static uint8_t decim_count = 0;
static const uint8_t DECIM_FACTOR = 4;
static float acc_ch1 = 0.0f, acc_ch2 = 0.0f, acc_ch3 = 0.0f;  // accumulators

void setup() {
  Serial.begin(256000);
  delay(1000);
  Serial.println("=== ESP32 ADS1293 DSP Starting ===");
  Serial.println("[FW] CYPHIX v" FW_VERSION " - dual Lead II (IN3,IN4 vs IN1) + dedicated RLD on IN6");

  // ── Initialize Bluetooth Classic (SPP) for Python/PC ──
  SerialBT.register_callback(btCallback);
  if (!SerialBT.begin("ESP32_ECG_Monitor")) {
    Serial.println("[BT-SPP] Init FAILED!");
  } else {
    Serial.println("[BT-SPP] OK - Name: ESP32_ECG_Monitor");
  }

  // ── Initialize BLE GATT ──
  BLEDevice::init("BeatAlign ECG");
  BLEDevice::setMTU(185);
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new ECGBLECallbacks());

  BLEService* pService = pServer->createService(ECG_SERVICE_UUID);
  pEcgChar = pService->createCharacteristic(
    ECG_DATA_CHAR_UUID,
    BLECharacteristic::PROPERTY_NOTIFY | BLECharacteristic::PROPERTY_READ
  );
  pEcgChar->addDescriptor(new BLE2902());
  pEcg3Char = pService->createCharacteristic(
    ECG_DATA3_CHAR_UUID,
    BLECharacteristic::PROPERTY_NOTIFY | BLECharacteristic::PROPERTY_READ
  );
  pEcg3Char->addDescriptor(new BLE2902());
  pService->start();

  BLEAdvertising* pAdv = BLEDevice::getAdvertising();
  pAdv->addServiceUUID(ECG_SERVICE_UUID);
  pAdv->setScanResponse(true);
  pAdv->setMinPreferred(0x06);
  BLEDevice::startAdvertising();
  Serial.println("[BLE] Advertising - Name: BeatAlign ECG");

  ads1293::spi_Init(18, 19, 23, 4);
  Serial.println("SPI Init OK");

  attachInterrupt(digitalPinToInterrupt(ADS1293_DRDY_PIN), DRDYHandler, FALLING);
  Serial.println("Interrupt attached");

  vTaskPrioritySet(NULL, 1);
  loop_task = xTaskGetCurrentTaskHandle();
  xTaskCreate(LEDTask, "LED", 2048, NULL, 4, NULL);

  Serial.print("DRDY Pin: "); Serial.println(ADS1293_DRDY_PIN);
  Serial.print("CS Pin: ");   Serial.println(ADS1293_CSB_PIN);

  ads1293::Init(&is_ads1293_init);
  Serial.print("ADS1293 Init: ");
  Serial.println(is_ads1293_init ? "OK" : "FAIL");

  // Read the electrode plan BACK from the chip: a register that did not take is
  // a wrong lead on the patient's report, and only the chip knows.
  Serial.print("REVID=0x");       Serial.println(ads1293::Reg_Read(REVID), HEX);
  Serial.print("FLEX_CH1_CN=0x"); Serial.println(ads1293::Reg_Read(FLEX_CH1_CN), HEX);
  Serial.print("FLEX_CH2_CN=0x"); Serial.println(ads1293::Reg_Read(FLEX_CH2_CN), HEX);
  Serial.print("FLEX_CH3_CN=0x"); Serial.println(ads1293::Reg_Read(FLEX_CH3_CN), HEX);
  Serial.print("RLD_CN=0x");      Serial.println(ads1293::Reg_Read(RLD_CN), HEX);
  Serial.print("CMDET_EN=0x");    Serial.println(ads1293::Reg_Read(CMDET_EN), HEX);
  Serial.print("LOD_EN=0x");      Serial.println(ads1293::Reg_Read(LOD_EN), HEX);
  Serial.print("AFE_SHDN_CN=0x"); Serial.println(ads1293::Reg_Read(AFE_SHDN_CN), HEX);
  Serial.print("CH_CNFG=0x");     Serial.println(ads1293::Reg_Read(CH_CNFG), HEX);
  Serial.print("ERROR_LOD=0x");   Serial.println(ads1293::Reg_Read(ERROR_LOD), HEX);

  Serial.println("DSP (ESP32): Median5 + AvgDecim/4 -> 320 Hz  |  RAW mV output");
  Serial.println("Output: LeadI,LeadII,LeadIII,aVR,aVL,aVF,LOD (uV)");
  Serial.println("[BLE] legacy char: 16 samples x 9 bytes (int32 uV) @ 20 Hz");
  Serial.println("[BLE] 3-ch char:   12 samples x 13 bytes (int32 uV) @ 26.7 Hz");
}

// ----- once-per-second status line -----
static uint32_t status_counter = 0;
static const uint32_t STATUS_INTERVAL = 320;  // every 320 output samples = ~1 sec

static uint8_t lod_prev = 0xFF;  // Force first print

// RLD fault must persist this long before it is reported: the RLD loop and the
// common-mode detector both swing through their limits for a moment whenever an
// electrode is touched, and a warning that flickers is a warning people ignore.
static const uint16_t RLD_FAULT_SAMPLES = 160;  // 0.5 s at 320 Hz
static uint16_t rld_fault_run = 0;

uint32_t DRDY_notify = 0;

void loop() {
  DRDY_notify = ulTaskNotifyTake(pdTRUE, 1);
  if (DRDY_notify > 0) {
    // More than one pending DRDY means at least one 1280 Hz sample came and went
    // unread. `seq` cannot show this — nothing was lost on the radio — so it is
    // reported in the packet flags instead of silently producing a clean-looking trace.
    if (DRDY_notify > 1) ble3_flags_sticky |= ECG3_FLAG_SAMPLES_MISSED;

    // --- Read raw ADC from ADS1293: CH1, CH2, CH3 in one data-loop burst ---
    byte raw[9];
    ads1293::Read_Data_Stream(raw, 9);

    uint32_t raw1 = ((uint32_t)raw[0] << 16) | ((uint32_t)raw[1] << 8) | (uint32_t)raw[2];
    uint32_t raw2 = ((uint32_t)raw[3] << 16) | ((uint32_t)raw[4] << 8) | (uint32_t)raw[5];
    uint32_t raw3 = ((uint32_t)raw[6] << 16) | ((uint32_t)raw[7] << 8) | (uint32_t)raw[8];

    // --- Convert to mV, median filter (remove single-sample spikes) ---
    float mv1 = median_process(med_ch1, convert_to_mv(raw1));
    float mv2 = median_process(med_ch2, convert_to_mv(raw2));
    float mv3 = median_process(med_ch3, convert_to_mv(raw3));

    // --- Averaging decimation: accumulate, then output mean ---
    acc_ch1 += mv1;
    acc_ch2 += mv2;
    acc_ch3 += mv3;
    decim_count++;
    if (decim_count < DECIM_FACTOR) return;

    float lead_i    = acc_ch1 / (float)DECIM_FACTOR;
    float lead_ii   = acc_ch2 / (float)DECIM_FACTOR;
    float lead_ii_b = acc_ch3 / (float)DECIM_FACTOR;
    acc_ch1 = 0.0f;
    acc_ch2 = 0.0f;
    acc_ch3 = 0.0f;
    decim_count = 0;

    // --- Lead-Off Detection ---
    // ERROR_LOD: bit0 = IN1 (RA), bit1 = IN2 (LA), bit2 = IN3 (LL#1), bit3 = IN4 (LL#2)
    //
    // v2 carried a special case here: RLD rode on the LL electrode, so LL coming
    // off broke the RLD loop and made RA and LA report off as well, and the
    // firmware rewrote that pattern to "only LL". With RLD on its own electrode
    // that coupling is gone — each bit now means what it says — so the rewrite is
    // gone too. (When the RLD electrode itself is off the inputs may ALL read
    // off; that case has its own flag below rather than another pattern-guess.)
    byte lod_raw = ads1293::Read_LOD_Status() & 0x0F;
    byte lod_legacy = lod_raw & 0x07;  // the legacy stream never knew about LL#2

    // --- Right-leg drive health ---
    byte misc = ads1293::Read_Error_Misc() & (ERROR_MISC_CMOR | ERROR_MISC_RLDRAIL);
    if (misc) { if (rld_fault_run < 0xFFFF) rld_fault_run++; } else { rld_fault_run = 0; }
    bool rld_fault = rld_fault_run >= RLD_FAULT_SAMPLES;

    // --- Debug: LOD on change, status once per second ---
    status_counter++;
    if (lod_raw != lod_prev) {
      Serial.print("[LOD] raw=0x");
      Serial.print(lod_raw, HEX);
      Serial.print(" -> RA=");
      Serial.print((lod_raw & 0x01) ? "OFF" : "ok");
      Serial.print(" LA=");
      Serial.print((lod_raw & 0x02) ? "OFF" : "ok");
      Serial.print(" LL=");
      Serial.print((lod_raw & 0x04) ? "OFF" : "ok");
      Serial.print(" LL2=");
      Serial.println((lod_raw & 0x08) ? "OFF" : "ok");
      lod_prev = lod_raw;
    }

    // --- Einthoven 6-lead calculation (from Lead II-a, as always) ---
    float lead_iii = lead_ii - lead_i;
    float avr = -(lead_i + lead_ii) / 2.0f;
    float avl = lead_i - lead_ii / 2.0f;
    float avf = lead_ii - lead_i / 2.0f;

    // --- Send as integers (mV * 1000 = microvolts) for precision ---
    int32_t i1  = (int32_t)(lead_i    * 1000.0f);
    int32_t i2  = (int32_t)(lead_ii   * 1000.0f);
    int32_t i2b = (int32_t)(lead_ii_b * 1000.0f);
    int32_t i3  = (int32_t)(lead_iii  * 1000.0f);
    int32_t ir  = (int32_t)(avr       * 1000.0f);
    int32_t il  = (int32_t)(avl       * 1000.0f);
    int32_t ifv = (int32_t)(avf       * 1000.0f);

    if (status_counter >= STATUS_INTERVAL) {
      status_counter = 0;
      // '#' lines are for a human at the monitor; the CSV line below is unchanged
      // from v2, so every existing Python tool keeps parsing it.
      Serial.printf("# v3 IIa=%ld IIb=%ld diff=%ld uV lod=0x%02X misc=0x%02X rld_fault=%d\n",
                    (long)i2, (long)i2b, (long)(i2 - i2b), lod_raw, misc, rld_fault ? 1 : 0);
    }

    // Sample sequence counter — wraps at 2^32.  Python uses this to detect dropped lines.
    static uint32_t sample_count = 0;

    // Build the output string once (avoid multiple slow print calls) — v2 format, untouched
    char out_buf[96];
    int len = snprintf(out_buf, sizeof(out_buf), "%ld,%ld,%ld,%ld,%ld,%ld,%d,%lu\n",
                       i1, i2, i3, ir, il, ifv, lod_legacy, (unsigned long)sample_count++);

    // Send via USB Serial (fast, always)
    Serial.write(out_buf, len);

    // Send via Bluetooth Classic SPP (for Python on PC)
    SerialBT.write((uint8_t*)out_buf, len);

    if (ble_connected) {
      // ── legacy characteristic: byte-identical to v2 ──
      // (ESP32 is little-endian, so memcpy gives the int32_le the client expects.)
      if (pEcgChar) {
        int off = 2 + ble_idx * 9;
        memcpy(&ble_buf[off],     &i1, 4);
        memcpy(&ble_buf[off + 4], &i2, 4);
        ble_buf[off + 8] = (uint8_t)lod_legacy;
        ble_idx++;

        if (ble_idx >= BLE_SAMPLES_PER_PACKET) {
          ble_buf[0] = ble_seq++;
          ble_buf[1] = ble_idx;
          pEcgChar->setValue(ble_buf, 2 + ble_idx * 9);
          pEcgChar->notify();
          ble_idx = 0;
        }
      }

      // ── 3-channel characteristic ──
      if (pEcg3Char) {
        int off = BLE3_HEADER_BYTES + ble3_idx * BLE3_SAMPLE_BYTES;
        memcpy(&ble3_buf[off],     &i1,  4);
        memcpy(&ble3_buf[off + 4], &i2,  4);
        memcpy(&ble3_buf[off + 8], &i2b, 4);
        ble3_buf[off + 12] = (uint8_t)lod_raw;
        ble3_idx++;
        if (rld_fault) ble3_flags_sticky |= ECG3_FLAG_RLD_FAULT;

        if (ble3_idx >= BLE3_SAMPLES_PER_PACKET) {
          ble3_buf[0] = ble3_seq++;
          ble3_buf[1] = ble3_idx;
          ble3_buf[2] = ble3_flags_sticky | (is_ads1293_init ? ECG3_FLAG_ADS_OK : 0);
          ble3_buf[3] = 0;
          pEcg3Char->setValue(ble3_buf, BLE3_HEADER_BYTES + ble3_idx * BLE3_SAMPLE_BYTES);
          pEcg3Char->notify();
          ble3_idx = 0;
          ble3_flags_sticky = 0;
        }
      }
    }
  }
}

void IRAM_ATTR DRDYHandler(void)
{
  if (!is_ads1293_init) return;
  BaseType_t xHigherPriorityTaskWoken = pdFALSE;
  configASSERT(loop_task != NULL);
  vTaskNotifyGiveFromISR(loop_task, &xHigherPriorityTaskWoken);
  portYIELD_FROM_ISR();
}

void LEDTask(void *pvParameters) {
  pinMode(LED_BUILTIN, OUTPUT);
  for (;;) {
    digitalWrite(LED_BUILTIN, HIGH);
    vTaskDelay(1000 / portTICK_PERIOD_MS);
    digitalWrite(LED_BUILTIN, LOW);
    vTaskDelay(1000 / portTICK_PERIOD_MS);
  }
  vTaskDelete(NULL);
}

void SerialTask(void *pvParameters) {
  while(true) {
    //only send data when connected
  }
  vTaskDelete(NULL);
}

// v3.0.0 — third measured channel (Lead II-b) through the identical median+decimation, 3-channel BLE characteristic (12 x 13 B + flags), RLD health flag, v2's LL-disconnect LOD rewrite removed (RLD no longer rides on LL). Legacy characteristic and Serial/SPP CSV byte-identical to v2.
