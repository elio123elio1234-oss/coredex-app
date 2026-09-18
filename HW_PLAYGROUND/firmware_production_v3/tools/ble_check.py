"""ble_check.py — does a flashed v3 board keep BOTH of its promises?

  1. the LEGACY characteristic is what v2 sent: 16 x 9 B packets, ~20/s, no seq gaps
  2. the 3-CHANNEL characteristic is what CYPHIX_SHARED/src/ble/protocol.ts parses:
     4 + 12 x 13 B packets, ~26.7/s, no seq gaps, ADS_OK set

and, with electrodes on a body, what the two copies of Lead II look like next to
each other (they should move together; a constant mV-scale offset between them is
normal — each electrode has its own half-cell potential).

Needs `bleak` (pip install bleak). Subscribes to one characteristic at a time,
exactly as an app does.

    python ble_check.py            # 6 s per characteristic
    python ble_check.py 15         # longer
"""

import asyncio
import statistics
import struct
import sys
import time

from bleak import BleakClient, BleakScanner

SERVICE = "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
LEGACY = "beb5483e-36e1-4688-b7f5-ea07361b26a8"
DATA3 = "beb5483f-36e1-4688-b7f5-ea07361b26a8"

FLAG_ADS_OK, FLAG_MISSED, FLAG_RLD_FAULT = 0x01, 0x02, 0x08


class Tally:
    def __init__(self):
        self.packets = 0
        self.samples = 0
        self.gaps = 0
        self.bad = 0
        self.last_seq = None
        self.sizes = set()
        self.flags_or = 0
        self.lod_or = 0
        self.ii_a, self.ii_b, self.lead_i = [], [], []
        self.t0 = self.t1 = None

    def seq(self, s):
        if self.last_seq is not None:
            self.gaps += (s - self.last_seq - 1) % 256
        self.last_seq = s
        now = time.monotonic()
        self.t0 = self.t0 or now
        self.t1 = now


def on_legacy(t: Tally):
    def cb(_, data: bytearray):
        if len(data) < 2 or data[1] == 0 or (len(data) - 2) % data[1] or (len(data) - 2) // data[1] != 9:
            t.bad += 1
            return
        t.seq(data[0])
        t.packets += 1
        t.sizes.add(len(data))
        for i in range(data[1]):
            li, lii, lod = struct.unpack_from("<iiB", data, 2 + i * 9)
            t.lead_i.append(li)
            t.ii_a.append(lii)
            t.lod_or |= lod
            t.samples += 1
    return cb


def on_data3(t: Tally):
    def cb(_, data: bytearray):
        if len(data) < 4 or data[1] == 0 or len(data) != 4 + data[1] * 13:  # strict, like parseEcgPacket3
            t.bad += 1
            return
        t.seq(data[0])
        t.packets += 1
        t.sizes.add(len(data))
        t.flags_or |= data[2]
        for i in range(data[1]):
            li, a, b, lod = struct.unpack_from("<iiiB", data, 4 + i * 13)
            t.lead_i.append(li)
            t.ii_a.append(a)
            t.ii_b.append(b)
            t.lod_or |= lod
            t.samples += 1
    return cb


def verdict(ok, text):
    print(f"  {'PASS' if ok else 'FAIL'}  {text}")
    return ok


async def main(seconds: float) -> int:
    print("scanning for the ECG service …")
    dev = await BleakScanner.find_device_by_filter(
        lambda d, ad: SERVICE in [u.lower() for u in (ad.service_uuids or [])], timeout=15
    )
    if not dev:
        print("FAIL  no device advertising the CYPHIX ECG service")
        return 1
    print(f"found {dev.name!r}  {dev.address}")

    ok = True
    async with BleakClient(dev) as client:
        chars = {c.uuid.lower() for s in client.services for c in s.characteristics}
        ok &= verdict(LEGACY in chars, "legacy characteristic present")
        has3 = DATA3 in chars
        ok &= verdict(has3, "3-channel characteristic present (absent = this board runs v2)")
        print(f"  MTU {client.mtu_size}")

        for uuid, make, name in ((LEGACY, on_legacy, "legacy"), (DATA3, on_data3, "3-channel")):
            if uuid not in chars:
                continue
            t = Tally()
            await client.start_notify(uuid, make(t))
            await asyncio.sleep(seconds)
            await client.stop_notify(uuid)
            span = (t.t1 - t.t0) if t.t0 and t.t1 and t.t1 > t.t0 else seconds
            print(f"\n[{name}] {t.packets} packets, {t.samples} samples in {span:.1f} s  sizes={sorted(t.sizes)}")
            # N packets span N-1 intervals: the first packet's samples were produced
            # BEFORE t0, so they do not belong to the span being timed.
            per_packet = t.samples / t.packets if t.packets else 0
            rate = (t.samples - per_packet) / span if t.packets > 1 else 0.0
            ok &= verdict(t.packets > 0, "notifications arrive")
            ok &= verdict(t.bad == 0, f"every packet well-formed ({t.bad} rejected)")
            ok &= verdict(t.gaps == 0, f"no sequence gaps ({t.gaps} lost)")
            # 300..340 used to pass here, and v3.0.0 sailed through at 308 Hz - a 4 %
            # time-base error with a perfect seq. BLE arrival jitter over a few seconds
            # is about 1 %, so 2 % is the tightest gate this measurement can carry; the
            # exact number comes from the CSV sample counter on USB serial.
            ok &= verdict(313.6 < rate < 326.4, f"sample rate {rate:.1f} Hz (320 +/- 2 %)")
            if name == "legacy":
                ok &= verdict(t.sizes <= {146}, "packet size is v2's 146 B (16 x 9 + 2)")
                ok &= verdict((t.lod_or & ~0x07) == 0, f"LOD byte stays within v2's three bits (0x{t.lod_or:02X})")
            else:
                ok &= verdict(t.sizes <= {160}, "packet size is 160 B (12 x 13 + 4)")
                ok &= verdict(bool(t.flags_or & FLAG_ADS_OK), f"ADS_OK flag set (flags seen 0x{t.flags_or:02X})")
                ok &= verdict(not (t.flags_or & FLAG_MISSED), "firmware never reported a missed ADC conversion")
                print(f"  info  samples-missed flag {'SEEN' if t.flags_or & FLAG_MISSED else 'never set'} · "
                      f"RLD fault {'REPORTED' if t.flags_or & FLAG_RLD_FAULT else 'not reported'} · LOD bits seen 0x{t.lod_or:02X}")
                if t.ii_b:
                    diff = [a - b for a, b in zip(t.ii_a, t.ii_b)]
                    print(f"  info  Lead II-a median {statistics.median(t.ii_a):.0f} uV · II-b median {statistics.median(t.ii_b):.0f} uV · "
                          f"(a-b) median {statistics.median(diff):.0f} uV, spread (p5..p95) "
                          f"{sorted(diff)[len(diff)//20]:.0f}..{sorted(diff)[-len(diff)//20]:.0f} uV")

    print("\nALL CHECKS PASSED" if ok else "\nSOME CHECKS FAILED")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main(float(sys.argv[1]) if len(sys.argv) > 1 else 6.0)))

# v3.0.1 — the rate gate is 320 +/- 2 % (was 300..340, which passed a 4 % time-base error) and counts
#          N-1 intervals; a SAMPLES_MISSED flag is now a FAIL, not an info line
# v3.0.0 — post-flash check: legacy stream byte-shape unchanged, 3-channel stream well-formed and gap-free
