#include "main.h"
#include <SPI.h>
#include <BluetoothSerial.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

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

// ============ BLE GATT — for Web Bluetooth (phone app) ============
#define ECG_SERVICE_UUID   "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define ECG_DATA_CHAR_UUID "beb5483e-36e1-4688-b7f5-ea07361b26a8"

BLEServer*         pServer   = NULL;
BLECharacteristic* pEcgChar  = NULL;
static volatile bool ble_connected = false;

// BLE binary packet: [seq:1][count:1][samples: count × 9]
// Each sample: int32_le(LeadI_uV) + int32_le(LeadII_uV) + uint8(LOD)
//
// int32, not int16: the ADC spans ±685.7 mV (convert_to_mv) but int16 µV
// clamps at ±32.767 mV, so an ordinary electrode DC offset pinned a lead at
// the clamp and the web app drew it flat, while the serial/SPP path — which
// always sent the full int32 — showed the same lead alive. Every transport
// now carries the same number.
// 2 + 16×9 = 146 B, inside the 182 B ATT payload of the negotiated MTU 185.
#define BLE_SAMPLES_PER_PACKET 16
static uint8_t  ble_buf[2 + BLE_SAMPLES_PER_PACKET * 9];
static uint8_t  ble_idx = 0;
static uint8_t  ble_seq = 0;

class ECGBLECallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer* s) override {
    ble_connected = true;
    ble_idx = 0;
    Serial.println("[BLE] Web client connected!");
    // Allow more connections
    BLEDevice::startAdvertising();
  }
  void onDisconnect(BLEServer* s) override {
    ble_connected = false;
    ble_idx = 0;
    Serial.println("[BLE] Web client disconnected!");
    BLEDevice::startAdvertising();
  }
};

// ============================================================
// ESP32 DSP — Minimal Path (RAW output, all filtering in Python)
// Fs_in = 1280 Hz (ADS1293: R1=4, R2=5, R3=8)
//
// 1. Median5         — single-sample ADC spike / impulse removal
// 2. Avg Decimate /4 — accumulate 4 samples, output mean → 320 Hz
// 3. Einthoven       — 6-lead derivation (I,II,III,aVR,aVL,aVF)
//
// All IIR filtering (HP 0.67Hz, Notch 50Hz, LP 100Hz, DIAGNOSTIC)
// is done in Python (ecg_dsp.py) at DISPLAY time so that:
//   a) Raw ADC data is always preserved on disk / memory.
//   b) Filters can be toggled on/off after recording.
//   c) DIAGNOSTIC mode shows near-raw signal (0.05-150 Hz).
// ============================================================

// ----- 5-point median filter (spike & impulse removal) -----
// Covers 3.9 ms at 1280 Hz — safe for QRS (80-120 ms wide)
struct MedianState {
  float buf[5] = {0,0,0,0,0};
  uint8_t idx = 0;
};

static MedianState med_ch1, med_ch2;

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
static float acc_ch1 = 0.0f, acc_ch2 = 0.0f;  // accumulators

// ----- Helper functions for dual output (Serial + Bluetooth) -----
void printToBoth(const char* str, bool newline = false) {
  if (newline) {
    Serial.println(str);
    SerialBT.println(str);
  } else {
    Serial.print(str);
    SerialBT.print(str);
  }
}

void printToBoth(int32_t val, bool newline = false) {
  if (newline) {
    Serial.println(val);
    SerialBT.println(val);
  } else {
    Serial.print(val);
    SerialBT.print(val);
  }
}

void printToBoth(uint8_t val, int format = DEC) {
  Serial.print(val, format);
  SerialBT.print(val, format);
}

void setup() {
  Serial.begin(256000);
  delay(1000);
  Serial.println("=== ESP32 ADS1293 DSP Starting ===");
  
  // ── Initialize Bluetooth Classic (SPP) for Python/PC ──
  SerialBT.register_callback(btCallback);
  if (!SerialBT.begin("ESP32_ECG_Monitor")) {
    Serial.println("[BT-SPP] Init FAILED!");
  } else {
    Serial.println("[BT-SPP] OK - Name: ESP32_ECG_Monitor");
  }
  
  // ── Initialize BLE GATT for Web Bluetooth (phone) ──
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
  
  // Debug: verify LOD register configuration
  Serial.print("LOD_CN=0x");  Serial.println(ads1293::Reg_Read(0x06), HEX);
  Serial.print("LOD_EN=0x");  Serial.println(ads1293::Reg_Read(0x07), HEX);
  Serial.print("LOD_CUR=0x"); Serial.println(ads1293::Reg_Read(0x08), HEX);
  Serial.print("ERROR_LOD=0x"); Serial.println(ads1293::Reg_Read(0x18), HEX);
  
  Serial.println("DSP (ESP32): Median5 + AvgDecim/4 -> 320 Hz  |  RAW mV output");
  Serial.println("Output: LeadI,LeadII,LeadIII,aVR,aVL,aVF,LOD (uV)");
  Serial.println("[BLE] Binary packets: 16 samples x 9 bytes (int32 uV) @ 20 Hz");
}

// ----- LOD debug: print raw register value once per second -----
static uint32_t lod_debug_counter = 0;
static const uint32_t LOD_DEBUG_INTERVAL = 320;  // every 320 output samples = ~1 sec

static uint8_t lod_prev = 0xFF;  // Force first print

uint32_t DRDY_notify = 0;

void loop() {
  DRDY_notify = ulTaskNotifyTake(pdTRUE, 1);
  if (DRDY_notify > 0) {
    // --- Read raw ADC from ADS1293 ---
    byte ch1_buf[3], ch2_buf[3];
    ads1293::Read_Data_Stream(ch1_buf, 3);  // CH1 from DATA_LOOP
    
    digitalWrite(4, LOW);
    SPI.transfer(DATA_CH2_ECG | 0x80);
    ch2_buf[0] = SPI.transfer(0xff);
    ch2_buf[1] = SPI.transfer(0xff);
    ch2_buf[2] = SPI.transfer(0xff);
    digitalWrite(4, HIGH);
    
    uint32_t raw1 = ((uint32_t)ch1_buf[0] << 16) | ((uint32_t)ch1_buf[1] << 8) | (uint32_t)ch1_buf[2];
    uint32_t raw2 = ((uint32_t)ch2_buf[0] << 16) | ((uint32_t)ch2_buf[1] << 8) | (uint32_t)ch2_buf[2];
    
    // --- Convert to mV ---
    float mv1 = convert_to_mv(raw1);
    float mv2 = convert_to_mv(raw2);
    
    // --- Median filter (remove single-sample spikes) ---
    mv1 = median_process(med_ch1, mv1);
    mv2 = median_process(med_ch2, mv2);
    
    // --- Averaging decimation: accumulate, then output mean ---
    // (IIR clinical/diagnostic filters run in Python at display time)
    acc_ch1 += mv1;
    acc_ch2 += mv2;
    decim_count++;
    if (decim_count < DECIM_FACTOR) return;
    
    float lead_i  = acc_ch1 / (float)DECIM_FACTOR;
    float lead_ii = acc_ch2 / (float)DECIM_FACTOR;
    acc_ch1 = 0.0f;
    acc_ch2 = 0.0f;
    decim_count = 0;
    
    // --- Read Lead-Off Detection status ---
    byte lod_raw = ads1293::Read_LOD_Status();
    // Build per-electrode status from ERROR_LOD register:
    //   bit0 = IN1 (RA), bit1 = IN2 (LA), bit2 = IN3 (LL)
    //
    // IMPORTANT: RLD is connected to IN3 (LL). When LL disconnects,
    // the RLD feedback loop breaks, causing common-mode drift.
    // This makes IN1 and IN2 ALSO report lead-off (false positives).
    // Pattern: raw=0x03 (bits 0+1 set, bit 2 clear) = LL disconnect.
    // We detect this pattern and only flag LL, not RA/LA.
    byte lod_status = 0;
    if ((lod_raw & 0x03) == 0x03 && !(lod_raw & 0x04)) {
      // Both IN1+IN2 triggered but IN3 not directly flagged
      // → RLD (LL) disconnected, RA/LA are false positives
      lod_status = 0x04;  // Only flag LL
    } else {
      // Normal per-electrode detection
      if (lod_raw & 0x01) lod_status |= 0x01;  // RA (IN1)
      if (lod_raw & 0x02) lod_status |= 0x02;  // LA (IN2)
      if (lod_raw & 0x04) lod_status |= 0x04;  // LL (IN3)
    }
    
    // --- Debug: print LOD status when it changes or periodically ---
    lod_debug_counter++;
    if (lod_raw != lod_prev || lod_debug_counter >= LOD_DEBUG_INTERVAL) {
      if (lod_raw != lod_prev) {
        Serial.print("[LOD] raw=0x");
        Serial.print(lod_raw, HEX);
        Serial.print(" -> RA=");
        Serial.print((lod_status & 0x01) ? "OFF" : "ok");
        Serial.print(" LA=");
        Serial.print((lod_status & 0x02) ? "OFF" : "ok");
        Serial.print(" LL=");
        Serial.println((lod_status & 0x04) ? "OFF" : "ok");
      }
      lod_prev = lod_raw;
      lod_debug_counter = 0;
    }
    
    // --- Einthoven 6-lead calculation ---
    float lead_iii = lead_ii - lead_i;
    float avr = -(lead_i + lead_ii) / 2.0f;
    float avl = lead_i - lead_ii / 2.0f;
    float avf = lead_ii - lead_i / 2.0f;
    
    // --- Send as integers (mV * 1000 = microvolts) for precision ---
    int32_t i1  = (int32_t)(lead_i   * 1000.0f);
    int32_t i2  = (int32_t)(lead_ii  * 1000.0f);
    int32_t i3  = (int32_t)(lead_iii * 1000.0f);
    int32_t ir  = (int32_t)(avr      * 1000.0f);
    int32_t il  = (int32_t)(avl      * 1000.0f);
    int32_t ifv = (int32_t)(avf      * 1000.0f);
    
    // Sample sequence counter — wraps at 2^32.  Python uses this to detect dropped lines.
    static uint32_t sample_count = 0;

    // Build the output string once (avoid multiple slow print calls)
    char out_buf[96];
    int len = snprintf(out_buf, sizeof(out_buf), "%ld,%ld,%ld,%ld,%ld,%ld,%d,%lu\n",
                       i1, i2, i3, ir, il, ifv, lod_status, (unsigned long)sample_count++);
    
    // Send via USB Serial (fast, always)
    Serial.write(out_buf, len);
    
    // Send via Bluetooth Classic SPP (for Python on PC)
    SerialBT.write((uint8_t*)out_buf, len);
    
    // ── BLE: pack binary sample into notification buffer ──
    // NO clamping: i1/i2 go out as full int32 µV, same as the serial path.
    // (ESP32 is little-endian, so memcpy gives the int32_le the client expects.)
    if (ble_connected && pEcgChar) {
      int off = 2 + ble_idx * 9;
      memcpy(&ble_buf[off],     &i1, 4);
      memcpy(&ble_buf[off + 4], &i2, 4);
      ble_buf[off + 8] = (uint8_t)lod_status;
      ble_idx++;

      if (ble_idx >= BLE_SAMPLES_PER_PACKET) {
        ble_buf[0] = ble_seq++;
        ble_buf[1] = ble_idx;
        pEcgChar->setValue(ble_buf, 2 + ble_idx * 9);
        pEcgChar->notify();
        ble_idx = 0;
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