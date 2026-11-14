#ifndef CYPHIX_ADS_STREAM_H
#define CYPHIX_ADS_STREAM_H

// The acquisition engine: DRDY interrupt -> SPI frame -> decimation -> ring.
// See ads_stream.cpp for why every DRDY edge is counted in hardware.

#include <Arduino.h>
#include "config.h"

// One decimated sample, produced inside the DRDY interrupt.
struct OutSample {
  int32_t sum[4];    // logical CH1..CH4: sum of `n` conversions in ADC counts, sign already applied
  uint8_t n;         // conversions in the sum; 0 = this block had no usable conversion
  uint8_t stat_p;    // LOFF_STATP from the newest good frame of the block
  uint8_t stat_n;    // LOFF_STATN
  uint8_t flags;     // OUT_FLAG_*
};

#define OUT_FLAG_DISCONTINUITY  0x01   // the interrupt was starved for longer than the catch-up limit

struct StreamStats {
  uint32_t ticks;          // DRDY edges counted by hardware since start()
  uint32_t serviced;       // frames clocked out
  uint32_t missed;         // conversions that came and went unread (interrupt was late)
  uint32_t overrun;        // frames thrown away: the next DRDY fell while this one was being read
  uint32_t bad_sync;       // frames thrown away: the status word did not start with 1100b
  uint32_t out_samples;    // decimated samples produced
  uint32_t ring_overflow;  // decimated samples dropped because loop() did not keep up
  uint32_t starved;        // times the catch-up limit was hit
  uint32_t rail[4];        // conversions at the ADC rail, per logical channel
  bool     hw_ticks;       // true = edges are counted by TIMER + PPI; false = software fallback
};

namespace stream {

// Once, after Bluefruit.begin(): attaches the DRDY interrupt and wires the
// hardware edge counter. Returns false if the hardware counter could not be set
// up (the stream still works, on a software count that can slip under load).
bool begin();

// Starts servicing DRDY. The ADS must already be configured, in RDATAC mode.
// `decimation` conversions become one OutSample (1 = no decimation).
void start(uint8_t frame_bytes, uint16_t decimation);
// Stops servicing DRDY and hands the SPI pads back for bit-bang access.
void stop();
bool running();

// loop() side.
bool pop(OutSample& s);
void stats(StreamStats& out);
// Total DRDY edges seen by the hardware counter, for rate measurement.
uint32_t tickNow();

}  // namespace stream

#endif
// v0.1.0 - acquisition engine interface: decimated samples, stream statistics, start/stop
