#include "compat_ble.h"
#include <bluefruit.h>

// ============================================================
// The production v3 BLE identity on a XIAO nRF52840.
//
// Matched against HW_PLAYGROUND/firmware_production_v3/src/main.cpp:
//   device name   "BeatAlign ECG"                              (line 254)
//   service       4fafc201-1fb5-459e-8fcc-c5c9c331914b         (line 47)
//   legacy char   beb5483e-36e1-4688-b7f5-ea07361b26a8         (line 48)  notify + read
//   3-ch char     beb5483f-36e1-4688-b7f5-ea07361b26a8         (line 49)  notify + read
//   legacy packet [seq][count=16] + 16 x { i32 I, i32 II, u8 lod & 0x07 }          (lines 56-62, 419-432)
//   3-ch packet   [seq][count=12][flags][0] + 12 x { i32 I, i32 II-a, i32 II-b, u8 lod }  (lines 64-74, 436-454)
// and against CYPHIX_SHARED/src/ble/protocol.ts (the app-side parser, lines 44-74, 194-213).
//
// A client subscribes to ONE of the two characteristics; the other packer keeps
// running and its notify is simply skipped.
// ============================================================

// Bluefruit takes a 128-bit UUID least-significant byte first: the printed
// string reversed byte by byte. uuidMatches() below re-checks these arrays
// against the strings at boot, so a typo here cannot ship silently.
static const char* const STR_SVC  = "4fafc201-1fb5-459e-8fcc-c5c9c331914b";
static const char* const STR_ECG  = "beb5483e-36e1-4688-b7f5-ea07361b26a8";
static const char* const STR_ECG3 = "beb5483f-36e1-4688-b7f5-ea07361b26a8";
static const uint8_t UUID_SVC[16]  = {0x4b,0x91,0x31,0xc3,0xc9,0xc5,0xcc,0x8f,0x9e,0x45,0xb5,0x1f,0x01,0xc2,0xaf,0x4f};
static const uint8_t UUID_ECG[16]  = {0xa8,0x26,0x1b,0x36,0x07,0xea,0xf5,0xb7,0x88,0x46,0xe1,0x36,0x3e,0x48,0xb5,0xbe};
static const uint8_t UUID_ECG3[16] = {0xa8,0x26,0x1b,0x36,0x07,0xea,0xf5,0xb7,0x88,0x46,0xe1,0x36,0x3f,0x48,0xb5,0xbe};

static BLEService        ecgService(UUID_SVC);
static BLECharacteristic ecgChar(UUID_ECG);
static BLECharacteristic ecg3Char(UUID_ECG3);

static volatile uint16_t g_conn = BLE_CONN_HANDLE_INVALID;
static volatile bool     g_reset_request = false;   // set by the BLE callbacks, honoured in push()

static uint8_t  g_buf3[ECG3_HEADER_BYTES + ECG3_SAMPLES_PER_PACKET * ECG3_SAMPLE_BYTES];
static uint8_t  g_idx3 = 0;
static uint8_t  g_seq3 = 0;
static uint8_t  g_sticky3 = 0;

static uint8_t  g_buf[ECG_HEADER_BYTES + ECG_SAMPLES_PER_PACKET * ECG_SAMPLE_BYTES];
static uint8_t  g_idx = 0;
static uint8_t  g_seq = 0;

static uint32_t g_packets3 = 0, g_packets = 0, g_notify_fails = 0;
static bool     g_identity_ok = false;

static int hexNibble(char c)
{
  if (c >= '0' && c <= '9') return c - '0';
  if (c >= 'a' && c <= 'f') return c - 'a' + 10;
  if (c >= 'A' && c <= 'F') return c - 'A' + 10;
  return -1;
}

// True when `le` (least-significant byte first) is the UUID printed as `str`.
static bool uuidMatches(const uint8_t le[16], const char* str)
{
  uint8_t be[16];
  uint8_t n = 0;
  int hi = -1;
  for (const char* p = str; *p; p++) {
    const int v = hexNibble(*p);
    if (v < 0) continue;                       // the dashes
    if (hi < 0) { hi = v; continue; }
    if (n >= 16) return false;
    be[n++] = (uint8_t)((hi << 4) | v);
    hi = -1;
  }
  if (n != 16 || hi >= 0) return false;
  for (uint8_t i = 0; i < 16; i++) if (le[i] != be[15 - i]) return false;
  return true;
}

static void connect_cb(uint16_t conn_handle)
{
  g_conn = conn_handle;
  g_reset_request = true;                      // per-connection sequence numbers, half-built packets dropped
}

static void disconnect_cb(uint16_t conn_handle, uint8_t reason)
{
  (void)conn_handle; (void)reason;
  g_conn = BLE_CONN_HANDLE_INVALID;
  g_reset_request = true;
}

void compat::begin()
{
  g_identity_ok = uuidMatches(UUID_SVC, STR_SVC) && uuidMatches(UUID_ECG, STR_ECG) && uuidMatches(UUID_ECG3, STR_ECG3);

  // MTU up to 247 and a deeper notification queue. MUST precede begin(). The
  // 160 B packet needs an ATT MTU of at least 163; the apps ask for 185.
  Bluefruit.configPrphBandwidth(BANDWIDTH_MAX);
  Bluefruit.begin();
  Bluefruit.autoConnLed(BLE_CONN_LED != 0);
  Bluefruit.setTxPower(BLE_TX_POWER_DBM);
  Bluefruit.setName(BLE_DEVICE_NAME);
  Bluefruit.Periph.setConnectCallback(connect_cb);
  Bluefruit.Periph.setDisconnectCallback(disconnect_cb);
  Bluefruit.Periph.setConnInterval(6, 12);     // 7.5-15 ms, as the XIAO playground build ran loss-free

  ecgService.begin();                          // the service first, then its characteristics

  ecgChar.setProperties(CHR_PROPS_NOTIFY | CHR_PROPS_READ);
  ecgChar.setPermission(SECMODE_OPEN, SECMODE_NO_ACCESS);
  ecgChar.setMaxLen(sizeof(g_buf));
  ecgChar.begin();

  ecg3Char.setProperties(CHR_PROPS_NOTIFY | CHR_PROPS_READ);
  ecg3Char.setPermission(SECMODE_OPEN, SECMODE_NO_ACCESS);
  ecg3Char.setMaxLen(sizeof(g_buf3));
  ecg3Char.begin();

  // Same split as production: the 128-bit service UUID in the advertising
  // packet (the phone apps scan for it), the name in the scan response (the web
  // app filters on its "BeatAlign" prefix).
  Bluefruit.Advertising.addFlags(BLE_GAP_ADV_FLAGS_LE_ONLY_GENERAL_DISC_MODE);
  Bluefruit.Advertising.addTxPower();
  Bluefruit.Advertising.addService(ecgService);
  Bluefruit.ScanResponse.addName();
  Bluefruit.Advertising.restartOnDisconnect(true);
  Bluefruit.Advertising.setInterval(32, 244);
  Bluefruit.Advertising.setFastTimeout(30);
  Bluefruit.Advertising.start(0);
}

void compat::resetPackers()
{
  g_idx3 = 0;
  g_idx = 0;
  g_sticky3 = 0;
}

void compat::push(int32_t lead_i_uv, int32_t lead_ii_a_uv, int32_t lead_ii_b_uv, uint8_t lod, uint8_t flags)
{
  if (g_reset_request) {
    g_reset_request = false;
    resetPackers();
    g_seq3 = 0;
    g_seq = 0;
  }
  const uint16_t conn = g_conn;
  if (conn == BLE_CONN_HANDLE_INVALID) return;

  // ---- 3-channel characteristic ----
  // (The nRF52 is little-endian, so memcpy gives the int32_le the parser reads.)
  {
    uint8_t* p = &g_buf3[ECG3_HEADER_BYTES + g_idx3 * ECG3_SAMPLE_BYTES];
    memcpy(p,     &lead_i_uv,    4);
    memcpy(p + 4, &lead_ii_a_uv, 4);
    memcpy(p + 8, &lead_ii_b_uv, 4);
    p[12] = lod;
    g_idx3++;
    g_sticky3 |= (uint8_t)(flags & (ECG3_FLAG_SAMPLES_MISSED | ECG3_FLAG_RLD_FAULT));

    if (g_idx3 >= ECG3_SAMPLES_PER_PACKET) {
      // Only once the central has really subscribed: notifying into the window
      // between "connected" and "CCCD written" burns sequence numbers the
      // receiver never sees (measured on the XIAO playground build).
      if (ecg3Char.notifyEnabled(conn)) {
        g_buf3[0] = g_seq3++;
        g_buf3[1] = g_idx3;
        g_buf3[2] = (uint8_t)(g_sticky3 | (flags & ECG3_FLAG_ADS_OK));
        g_buf3[3] = 0;
        if (ecg3Char.notify(conn, g_buf3, (uint16_t)(ECG3_HEADER_BYTES + g_idx3 * ECG3_SAMPLE_BYTES))) g_packets3++;
        else g_notify_fails++;
      }
      g_idx3 = 0;
      g_sticky3 = 0;
    }
  }

  // ---- legacy characteristic: Lead I + Lead II-a, and it never knew about LL#2 ----
  {
    uint8_t* p = &g_buf[ECG_HEADER_BYTES + g_idx * ECG_SAMPLE_BYTES];
    memcpy(p,     &lead_i_uv,    4);
    memcpy(p + 4, &lead_ii_a_uv, 4);
    p[8] = (uint8_t)(lod & (LOD_RA | LOD_LA | LOD_LL));
    g_idx++;

    if (g_idx >= ECG_SAMPLES_PER_PACKET) {
      if (ecgChar.notifyEnabled(conn)) {
        g_buf[0] = g_seq++;
        g_buf[1] = g_idx;
        if (ecgChar.notify(conn, g_buf, (uint16_t)(ECG_HEADER_BYTES + g_idx * ECG_SAMPLE_BYTES))) g_packets++;
        else g_notify_fails++;
      }
      g_idx = 0;
    }
  }
}

void compat::stats(CompatStats& out)
{
  const uint16_t conn = g_conn;
  out.connected = (conn != BLE_CONN_HANDLE_INVALID);
  out.sub3 = out.connected && ecg3Char.notifyEnabled(conn);
  out.sub_legacy = out.connected && ecgChar.notifyEnabled(conn);
  out.mtu = 0;
  if (out.connected) {
    BLEConnection* c = Bluefruit.Connection(conn);
    if (c) out.mtu = c->getMtu();
  }
  out.packets3 = g_packets3;
  out.packets_legacy = g_packets;
  out.notify_fails = g_notify_fails;
}

bool compat::identityOk() { return g_identity_ok; }

// v0.1.0 - compat BLE: production v3 identity (name, service, both characteristics) and both packers, notify gated on a real subscription
