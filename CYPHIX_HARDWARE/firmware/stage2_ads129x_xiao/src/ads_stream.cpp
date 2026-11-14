#include "ads_stream.h"
#include "ads129x.h"
#include <SPI.h>
#include "nrf_gpio.h"
#include "nrf_sdm.h"
#include "nrf_soc.h"
#include "nrf_error.h"

// ============================================================
// Acquisition: one interrupt per conversion, the radio is not involved.
//
// THE TIME BASE IS COUNTED IN HARDWARE, NOT BY THE INTERRUPT. The production
// ESP32 firmware once streamed "320 Hz" at 306-309 Hz because conversions that
// were overwritten before anybody read them also disappeared from its sample
// count (firmware_production_v3, v3.0.1). Here every DRDY falling edge clocks a
// TIMER in counter mode through a PPI channel - no CPU involved - and the
// interrupt asks that counter how many edges have passed. A late interrupt
// therefore costs one of the 25 conversions that are averaged into a sample,
// never a slice of time: 25 edges always make exactly one output sample.
//
// What the interrupt does: read the counter, clock one frame out (receive-only
// SPIM transfer, DIN held low), read the counter again (a change means the next
// conversion arrived mid-read and this frame cannot be trusted), check the
// 1100b marker of the status word, add the four logical channels to the block.
// ============================================================

namespace {

// CPOL = 0, CPHA = 1 (SBAS459K section 7.7 note).
const SPISettings STREAM_SPI(ADS_STREAM_SPI_HZ, MSBFIRST, SPI_MODE1);

const uint16_t RING_LEN  = 128;               // 0.4 s of 320 Hz samples; must be a power of two
const uint16_t RING_MASK = RING_LEN - 1;
// If the interrupt is starved for longer than this many output samples, the
// gap is declared a discontinuity instead of being filled from inside an ISR.
const uint32_t MAX_CATCHUP_BLOCKS = 32;

OutSample         g_ring[RING_LEN];
volatile uint16_t g_head = 0;                 // written by the interrupt only
volatile uint16_t g_tail = 0;                 // written by loop() only

uint8_t  g_frame[3 + 8 * 3];                  // status + up to 8 channels (EasyDMA needs RAM)
uint8_t  g_frameBytes = 15;
uint32_t g_decim = 1;
uint8_t  g_off[4]  = {3, 6, 9, 12};           // byte offset of each logical channel in the frame
int8_t   g_sign[4] = {1, 1, 1, 1};

volatile bool g_running = false;
int      g_gpioteCh = -1;
bool     g_hwTicks = false;
uint32_t g_pinCs = 0;

volatile uint32_t g_lastTick = 0;             // counter value of the last serviced edge
uint32_t g_startTick = 0;
uint32_t g_swTicks = 0;                       // fallback when the hardware counter is unavailable
uint32_t g_pos = 0;                           // conversions elapsed in the current block

// the block being built
int32_t  g_sum[4] = {0, 0, 0, 0};
uint8_t  g_n = 0;
uint8_t  g_statP = 0, g_statN = 0;
uint8_t  g_blkFlags = 0;

volatile StreamStats g_stats;

inline uint32_t captureIsr()
{
  TICK_TIMER->TASKS_CAPTURE[0] = 1;
  return TICK_TIMER->CC[0];
}

// 24-bit two's complement, MSB first (section 9.4.1.3.3).
inline int32_t be24(const uint8_t* p)
{
  return ((int32_t)(((uint32_t)p[0] << 24) | ((uint32_t)p[1] << 16) | ((uint32_t)p[2] << 8))) >> 8;
}

inline void closeBlock()
{
  const uint16_t head = g_head;
  const uint16_t next = (uint16_t)((head + 1) & RING_MASK);
  if (next == g_tail) {
    g_stats.ring_overflow = g_stats.ring_overflow + 1;   // loop() stalled: this sample is lost, and counted
  } else {
    OutSample& o = g_ring[head];
    o.sum[0] = g_sum[0]; o.sum[1] = g_sum[1]; o.sum[2] = g_sum[2]; o.sum[3] = g_sum[3];
    o.n      = g_n;
    o.stat_p = g_statP;
    o.stat_n = g_statN;
    o.flags  = g_blkFlags;
    g_head = next;
    g_stats.out_samples = g_stats.out_samples + 1;
  }
  g_sum[0] = g_sum[1] = g_sum[2] = g_sum[3] = 0;
  g_n = 0;
  g_blkFlags = 0;
  // g_statP / g_statN keep their last value: an empty block reports the last known lead-off state
}

void drdyISR()
{
  if (!g_running) return;

  const uint32_t c1 = g_hwTicks ? captureIsr() : ++g_swTicks;
  const uint32_t delta = c1 - g_lastTick;
  if (delta == 0) return;                     // this edge was already accounted for
  g_lastTick = c1;

  nrf_gpio_pin_clear(g_pinCs);
  SPI.transfer(nullptr, g_frame, g_frameBytes);   // receive-only: DIN carries the over-read byte, 0x00
  delayMicroseconds(3);                       // tSCCS: >= 4 tCLK (2.06 us worst case) before CS rises
  nrf_gpio_pin_set(g_pinCs);

  const uint32_t c2 = g_hwTicks ? captureIsr() : c1;

  bool ok = true;
  if (c2 != c1) {
    // A new conversion was latched while this one was on the wire. The data may
    // be a mix of two conversions, so it is not used.
    ok = false;
    g_stats.overrun = g_stats.overrun + 1;
  } else if ((g_frame[0] & 0xF0) != 0xC0) {
    // The status word always starts with 1100b (Figure 59 / section 9.4.1.3.1).
    ok = false;
    g_stats.bad_sync = g_stats.bad_sync + 1;
  }
  g_stats.serviced = g_stats.serviced + 1;
  if (delta > 1) g_stats.missed = g_stats.missed + (delta - 1);

  // This conversion is number `pos` of the current block, counted in DRDY edges.
  uint32_t pos = g_pos + delta;
  if (pos > g_decim * MAX_CATCHUP_BLOCKS) {
    g_stats.starved = g_stats.starved + 1;
    g_blkFlags |= OUT_FLAG_DISCONTINUITY;
    pos = ((pos - 1) % g_decim) + 1;          // keep the phase, drop the whole blocks
  }
  while (pos > g_decim) {                     // it belongs to a later block: close what was open
    closeBlock();
    pos -= g_decim;
  }

  if (ok) {
    // Status word: 1100 | LOFF_STATP[7:0] | LOFF_STATN[7:0] | GPIO[7:4]
    g_statP = (uint8_t)((g_frame[0] << 4) | (g_frame[1] >> 4));
    g_statN = (uint8_t)((g_frame[1] << 4) | (g_frame[2] >> 4));
    for (uint8_t i = 0; i < 4; i++) {
      int32_t v = be24(&g_frame[g_off[i]]);
      if (v >= 8388607 || v <= -8388608) g_stats.rail[i] = g_stats.rail[i] + 1;   // 7FFFFFh / 800000h: clipped
      g_sum[i] += (g_sign[i] < 0) ? -v : v;
    }
    g_n++;
  }

  if (pos == g_decim) {
    closeBlock();
    pos = 0;
  }
  g_pos = pos;
}

}  // namespace

bool stream::begin()
{
  g_pinCs = g_ADigitalPinMap[PIN_ADS_CS];
  const uint32_t pinDrdy = g_ADigitalPinMap[PIN_ADS_DRDY];

  // The core picks a GPIOTE channel for the pin and installs the interrupt at
  // priority 3: above the SoftDevice's low-priority work and every task, below
  // only the radio's timing-critical interrupts.
  attachInterrupt(digitalPinToInterrupt(PIN_ADS_DRDY), drdyISR, FALLING);

  for (int ch = 0; ch < 8; ch++) {
    const uint32_t cfg = NRF_GPIOTE->CONFIG[ch];
    if (((cfg & GPIOTE_CONFIG_MODE_Msk) >> GPIOTE_CONFIG_MODE_Pos) != GPIOTE_CONFIG_MODE_Event) continue;
    const uint32_t pin = (cfg & (GPIOTE_CONFIG_PSEL_Msk | GPIOTE_CONFIG_PORT_Msk)) >> GPIOTE_CONFIG_PSEL_Pos;
    if (pin == pinDrdy) { g_gpioteCh = ch; break; }
  }
  if (g_gpioteCh < 0) return false;           // no GPIOTE channel was free
  NRF_GPIOTE->INTENCLR = (1UL << g_gpioteCh); // quiet until start(); the EVENT keeps firing for the counter

  // TIMER in counter mode: +1 on every COUNT task, no clock needed.
  TICK_TIMER->TASKS_STOP  = 1;
  TICK_TIMER->MODE        = TIMER_MODE_MODE_LowPowerCounter << TIMER_MODE_MODE_Pos;
  TICK_TIMER->BITMODE     = TIMER_BITMODE_BITMODE_32Bit << TIMER_BITMODE_BITMODE_Pos;
  TICK_TIMER->TASKS_CLEAR = 1;
  TICK_TIMER->TASKS_START = 1;

  // PPI is a SoftDevice-restricted peripheral: go through its API when it is on.
  const volatile void* evt = &NRF_GPIOTE->EVENTS_IN[g_gpioteCh];
  const volatile void* tsk = &TICK_TIMER->TASKS_COUNT;
  uint8_t  sd_on = 0;
  uint32_t err = NRF_SUCCESS;
  (void)sd_softdevice_is_enabled(&sd_on);
  if (sd_on) {
    err = sd_ppi_channel_assign(TICK_PPI_CHANNEL, evt, tsk);
    if (err == NRF_SUCCESS) err = sd_ppi_channel_enable_set(1UL << TICK_PPI_CHANNEL);
  } else {
    NRF_PPI->CH[TICK_PPI_CHANNEL].EEP = (uint32_t)evt;
    NRF_PPI->CH[TICK_PPI_CHANNEL].TEP = (uint32_t)tsk;
    NRF_PPI->CHENSET = (1UL << TICK_PPI_CHANNEL);
  }
  g_hwTicks = (err == NRF_SUCCESS);
  return g_hwTicks;
}

uint32_t stream::tickNow()
{
  if (!g_hwTicks) return g_swTicks;
  TICK_TIMER->TASKS_CAPTURE[1] = 1;           // CC[1]: CC[0] belongs to the interrupt
  return TICK_TIMER->CC[1];
}

void stream::start(uint8_t frame_bytes, uint16_t decimation)
{
  if (g_gpioteCh < 0) return;
  NRF_GPIOTE->INTENCLR = (1UL << g_gpioteCh);
  g_running = false;

  uint8_t need = 0;
  for (uint8_t i = 0; i < 4; i++) {
    g_off[i]  = (uint8_t)(3 + 3 * (CHANNEL_MAP[i].ads_channel - 1));
    g_sign[i] = CHANNEL_MAP[i].sign;
    if ((uint8_t)(g_off[i] + 3) > need) need = (uint8_t)(g_off[i] + 3);
  }
  if (frame_bytes < need) frame_bytes = need;                 // never index past what was clocked out
  if (frame_bytes > sizeof(g_frame)) frame_bytes = sizeof(g_frame);
  g_frameBytes = frame_bytes;
  g_decim = decimation ? decimation : 1;

  g_sum[0] = g_sum[1] = g_sum[2] = g_sum[3] = 0;
  g_n = 0;
  g_statP = g_statN = 0;
  g_blkFlags = 0;
  g_pos = 0;
  g_head = 0;
  g_tail = 0;

  g_stats.ticks = 0;        g_stats.serviced = 0;      g_stats.missed = 0;
  g_stats.overrun = 0;      g_stats.bad_sync = 0;      g_stats.out_samples = 0;
  g_stats.ring_overflow = 0; g_stats.starved = 0;
  g_stats.rail[0] = g_stats.rail[1] = g_stats.rail[2] = g_stats.rail[3] = 0;
  g_stats.hw_ticks = g_hwTicks;

  g_swTicks = 0;
  g_startTick = tickNow();
  g_lastTick = g_startTick;

  SPI.beginTransaction(STREAM_SPI);           // SPIM on, mode 1. Receive-only from here on.
  g_running = true;
  NRF_GPIOTE->EVENTS_IN[g_gpioteCh] = 0;
  NRF_GPIOTE->INTENSET = (1UL << g_gpioteCh);
}

void stream::stop()
{
  if (g_gpioteCh >= 0) NRF_GPIOTE->INTENCLR = (1UL << g_gpioteCh);
  // The interrupt runs to completion before this thread continues, and the
  // core's handler skips a channel whose INTEN bit is clear - so from here on
  // nobody else touches the SPIM.
  if (g_running) {
    g_running = false;
    SPI.endTransaction();                     // SPIM off: the pads are GPIO again for bit-bang
  }
}

bool stream::running() { return g_running; }

bool stream::pop(OutSample& s)
{
  const uint16_t tail = g_tail;
  if (tail == g_head) return false;
  s = g_ring[tail];
  g_tail = (uint16_t)((tail + 1) & RING_MASK);
  return true;
}

void stream::stats(StreamStats& out)
{
  out.ticks         = g_lastTick - g_startTick;
  out.serviced      = g_stats.serviced;
  out.missed        = g_stats.missed;
  out.overrun       = g_stats.overrun;
  out.bad_sync      = g_stats.bad_sync;
  out.out_samples   = g_stats.out_samples;
  out.ring_overflow = g_stats.ring_overflow;
  out.starved       = g_stats.starved;
  for (uint8_t i = 0; i < 4; i++) out.rail[i] = g_stats.rail[i];
  out.hw_ticks      = g_hwTicks;
}

// v0.1.0 - acquisition engine: hardware-counted DRDY edges (PPI + TIMER), receive-only SPIM frame read in the interrupt, tick-exact decimation, SPSC ring
