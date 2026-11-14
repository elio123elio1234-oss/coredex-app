#ifndef CYPHIX_COMPAT_BLE_H
#define CYPHIX_COMPAT_BLE_H

// COMPAT output: the production v3 BLE identity and both of its packets, byte
// for byte, so every existing web and phone build works against this board
// with no change. The contract is CYPHIX_SHARED/src/ble/protocol.ts; the
// reference implementation is HW_PLAYGROUND/firmware_production_v3/src/main.cpp.

#include <Arduino.h>
#include "config.h"

// ---- 3-channel characteristic (firmware v3+): [seq][count][flags][rsv] + count x 13 B ----
// sample = int32 LeadI | int32 LeadII-a | int32 LeadII-b | uint8 LOD   (microvolts, little-endian)
#define ECG3_SAMPLES_PER_PACKET   12     // 4 + 12 x 13 = 160 B, one notification every 37.5 ms
#define ECG3_SAMPLE_BYTES         13
#define ECG3_HEADER_BYTES          4
// ---- legacy characteristic: [seq][count] + count x 9 B ----
// sample = int32 LeadI | int32 LeadII | uint8 LOD
#define ECG_SAMPLES_PER_PACKET    16     // 2 + 16 x 9 = 146 B, one notification every 50 ms
#define ECG_SAMPLE_BYTES           9
#define ECG_HEADER_BYTES           2

// flags byte of the 3-channel packet (protocol.ts ECG3_FLAG_*). Other bits stay 0.
#define ECG3_FLAG_ADS_OK          0x01
#define ECG3_FLAG_SAMPLES_MISSED  0x02
#define ECG3_FLAG_RLD_FAULT       0x08

// LOD byte, one bit per measuring electrode (protocol.ts LOD_*).
#define LOD_RA                    0x01
#define LOD_LA                    0x02
#define LOD_LL                    0x04
#define LOD_LL2                   0x08   // 3-channel stream only; the legacy stream masks it off

struct CompatStats {
  bool     connected;
  bool     sub3;            // a client is subscribed to the 3-channel characteristic
  bool     sub_legacy;      // ... to the legacy characteristic
  uint16_t mtu;
  uint32_t packets3;
  uint32_t packets_legacy;
  uint32_t notify_fails;    // notifications the stack refused (back-pressure)
};

namespace compat {

// Bluefruit, GATT table and advertising. Call once, before stream::begin().
void begin();

// One 320 Hz sample. `flags` carries ECG3_FLAG_* for this sample; missed and
// RLD-fault are held until the packet that contains the sample has gone out.
void push(int32_t lead_i_uv, int32_t lead_ii_a_uv, int32_t lead_ii_b_uv, uint8_t lod, uint8_t flags);

// Drops half-built packets (mode change, stream restart).
void resetPackers();

void stats(CompatStats& out);

// False if the UUID byte arrays in compat_ble.cpp do not spell the production
// UUID strings. Checked once in begin(); the boot banner reports it.
bool identityOk();

}  // namespace compat

#endif
// v0.1.0 - compat BLE interface: production v3 packet constants (legacy 16 x 9 B and 3-channel 12 x 13 B), flags and LOD bits
