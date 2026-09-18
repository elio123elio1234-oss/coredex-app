/* ==================================================================
   CyphixBleModule — iOS half of the native BLE bridge (CoreBluetooth).

   FROZEN PROTOCOL (CYPHIX_SHARED/src/ble/protocol.ts is canonical):
     Service UUID : 4fafc201-1fb5-459e-8fcc-c5c9c331914b

     LEGACY char  : beb5483e-36e1-4688-b7f5-ea07361b26a8 (Notify) — every firmware
       Packet     : [seq:u8][count:u8][count × (5B int16 | 9B int32) sample]
       Sample     : LeadI µV, LeadII µV (little-endian) + u8 LOD

     3-CHANNEL    : beb5483f-36e1-4688-b7f5-ea07361b26a8 (Notify) — firmware v3+ only
       Packet     : [seq:u8][count:u8][flags:u8][rsv:u8][count × 13B sample]
       Sample     : int32 LeadI, int32 LeadII-a, int32 LeadII-b (µV, LE) + u8 LOD
       12 samples = 160 B, one notification per 37.5 ms. iOS negotiates the
       ATT MTU itself (185 on every iPhone this app supports ⇒ 182 B payload).

   ONE OF THE TWO, NEVER BOTH. v3 firmware exposes both characteristics and
   keeps the legacy one byte-identical; this module subscribes to the
   3-channel one when the device has it and to the legacy one otherwise.
   Lead II-a IS the legacy Lead II (same electrode pair), so `leadII` in a
   batch means the same thing on either stream. `leadIIb` is ALWAYS in the
   batch and EMPTY on a legacy device — that is how JS tells them apart.

   The 3-channel parser is STRICT where the legacy one infers a stride: the
   length must be exactly 4 + count × 13 or the packet is dropped
   (mirrors parseEcgPacket3). The legacy parser is untouched.

   Design (root CLAUDE.md §3.2): every notification is parsed HERE, on
   CoreBluetooth's queue — the JS thread never sees per-sample traffic.
   Samples accumulate in a batch buffer flushed to JS at ≤ 10 Hz.
   ================================================================== */

import CoreBluetooth
import ExpoModulesCore

public class CyphixBleModule: Module {
  private var central: CyphixBleCentral?

  public func definition() -> ModuleDefinition {
    Name("CyphixBle")

    Events("onStatusChange", "onEcgBatch", "onHeartRate", "onLeadOff", "onSignalRail", "onDeviceFlags")

    AsyncFunction("connect") { (promise: Promise) in
      if self.central == nil {
        self.central = CyphixBleCentral { [weak self] name, body in
          self?.sendEvent(name, body)
        }
      }
      self.central?.startConnectFlow()
      promise.resolve()
    }

    AsyncFunction("disconnect") { (promise: Promise) in
      self.central?.disconnect()
      promise.resolve()
    }

    OnDestroy {
      self.central?.disconnect()
      self.central = nil
    }
  }
}

/* ------------------------------------------------------------------ */

final class CyphixBleCentral: NSObject, CBCentralManagerDelegate, CBPeripheralDelegate {
  // Frozen contract — mirrors @cyphix/shared/ble/protocol.ts. Never tune here.
  private static let serviceUUID = CBUUID(string: "4fafc201-1fb5-459e-8fcc-c5c9c331914b")
  private static let dataCharUUID = CBUUID(string: "beb5483e-36e1-4688-b7f5-ea07361b26a8")
  /** 3-channel stream (firmware v3+). Absent ⇒ legacy device, not an error. */
  private static let data3CharUUID = CBUUID(string: "beb5483f-36e1-4688-b7f5-ea07361b26a8")
  private static let ecg3HeaderBytes = 4
  private static let ecg3SampleBytes = 13
  private static let railUV: Int32 = 32767
  private static let railMarginUV: Int32 = 8
  /** Flush batches to JS at 10 Hz — UI needs frames, not packets. */
  private static let flushInterval: TimeInterval = 0.1

  private let emit: (String, [String: Any]) -> Void
  private let queue = DispatchQueue(label: "com.cyphix.ble")

  private var manager: CBCentralManager?
  private var peripheral: CBPeripheral?
  private var wantsConnection = false

  private var batchLeadI: [Double] = []
  private var batchLeadII: [Double] = []
  /** Lead II-b. Grows in lockstep with the other two on the 3-channel stream;
      stays EMPTY on the legacy one. */
  private var batchLeadIIb: [Double] = []
  private var writeIdx: Int = 0
  private var lastSeq: Int32 = -1
  private var droppedPackets: Int = 0
  private var lastLod: UInt8 = 0
  /** -1 = nothing announced on this subscription yet. */
  private var lastFlags: Int = -1
  private var flushTimer: DispatchSourceTimer?

  init(emit: @escaping (String, [String: Any]) -> Void) {
    self.emit = emit
    super.init()
  }

  func startConnectFlow() {
    queue.async {
      self.wantsConnection = true
      if self.manager == nil {
        self.manager = CBCentralManager(delegate: self, queue: self.queue)
      } else {
        self.scanIfReady()
      }
      self.status("connecting")
    }
  }

  func disconnect() {
    queue.async {
      self.wantsConnection = false
      self.stopFlushTimer()
      if let p = self.peripheral { self.manager?.cancelPeripheralConnection(p) }
      self.peripheral = nil
      self.manager?.stopScan()
      self.status("disconnected")
    }
  }

  // MARK: CBCentralManagerDelegate

  func centralManagerDidUpdateState(_ central: CBCentralManager) {
    scanIfReady()
  }

  private func scanIfReady() {
    guard wantsConnection, let manager, manager.state == .poweredOn else { return }
    manager.scanForPeripherals(withServices: [Self.serviceUUID], options: nil)
  }

  func centralManager(_ central: CBCentralManager, didDiscover peripheral: CBPeripheral,
                      advertisementData: [String: Any], rssi RSSI: NSNumber) {
    central.stopScan()
    self.peripheral = peripheral
    peripheral.delegate = self
    central.connect(peripheral, options: nil)
  }

  func centralManager(_ central: CBCentralManager, didConnect peripheral: CBPeripheral) {
    status("connected", deviceName: peripheral.name)
    peripheral.discoverServices([Self.serviceUUID])
  }

  func centralManager(_ central: CBCentralManager, didDisconnectPeripheral peripheral: CBPeripheral,
                      error: Error?) {
    stopFlushTimer()
    self.peripheral = nil
    if wantsConnection {
      status("connecting", detail: "link lost — rescanning")
      scanIfReady()
    } else {
      status("disconnected")
    }
  }

  // MARK: CBPeripheralDelegate

  func peripheral(_ peripheral: CBPeripheral, didDiscoverServices error: Error?) {
    guard let service = peripheral.services?.first(where: { $0.uuid == Self.serviceUUID }) else { return }
    peripheral.discoverCharacteristics([Self.dataCharUUID, Self.data3CharUUID], for: service)
  }

  func peripheral(_ peripheral: CBPeripheral,
                  didDiscoverCharacteristicsFor service: CBService, error: Error?) {
    // ONE of the two, never both: the 3-channel stream when the device has
    // it (firmware v3+), otherwise the legacy one exactly as before.
    let chars = service.characteristics ?? []
    guard let char = chars.first(where: { $0.uuid == Self.data3CharUUID })
      ?? chars.first(where: { $0.uuid == Self.dataCharUUID }) else { return }
    resetStreamState()
    peripheral.setNotifyValue(true, for: char)
    startFlushTimer()
    status("streaming", deviceName: peripheral.name)
  }

  func peripheral(_ peripheral: CBPeripheral,
                  didUpdateValueFor characteristic: CBCharacteristic, error: Error?) {
    guard let data = characteristic.value else { return }
    if characteristic.uuid == Self.data3CharUUID {
      parsePacket3(data)
    } else {
      parsePacket(data)
    }
  }

  /**
   * A new subscription starts from a clean slate.
   *
   * The three batch arrays must stay the same length on the 3-channel stream,
   * and the ≤ 100 ms a dropped link left behind would break that the moment a
   * legacy connection is followed by a 3-channel one. And JS mirrors the LOD /
   * flags state from CHANGE events, so each subscription has to announce its
   * own: LOD restarts from "nothing off" and says so, flags restart from
   * "unknown" so the first 3-channel packet always reports them.
   */
  private func resetStreamState() {
    batchLeadI.removeAll(keepingCapacity: true)
    batchLeadII.removeAll(keepingCapacity: true)
    batchLeadIIb.removeAll(keepingCapacity: true)
    lastLod = 0
    lastFlags = -1
    emit("onLeadOff", ["lodBits": 0])
  }

  // MARK: packet parsing — mirrors parseEcgPacket() 1:1

  private func parsePacket(_ data: Data) {
    guard data.count >= 2 else { return }
    let seq = Int32(data[0])
    let count = Int(data[1])
    guard count > 0 else { return }
    let payload = data.count - 2
    guard payload % count == 0 else { return }
    let stride = payload / count
    guard stride == 5 || stride == 9 else { return }

    if lastSeq >= 0 {
      droppedPackets += Int((seq - lastSeq - 1 + 256) % 256)
    }
    lastSeq = seq

    var railedI = false
    var railedII = false

    data.withUnsafeBytes { (raw: UnsafeRawBufferPointer) in
      for i in 0..<count {
        let off = 2 + i * stride
        let uvI: Int32
        let uvII: Int32
        if stride == 5 {
          uvI = Int32(raw.loadUnaligned(fromByteOffset: off, as: Int16.self).littleEndian)
          uvII = Int32(raw.loadUnaligned(fromByteOffset: off + 2, as: Int16.self).littleEndian)
          if abs(uvI) >= Self.railUV - Self.railMarginUV { railedI = true }
          if abs(uvII) >= Self.railUV - Self.railMarginUV { railedII = true }
        } else {
          uvI = raw.loadUnaligned(fromByteOffset: off, as: Int32.self).littleEndian
          uvII = raw.loadUnaligned(fromByteOffset: off + 4, as: Int32.self).littleEndian
        }
        let lod = raw.load(fromByteOffset: off + (stride == 5 ? 4 : 8), as: UInt8.self)

        batchLeadI.append(Double(uvI) / 1000.0) // µV → mV
        batchLeadII.append(Double(uvII) / 1000.0)
        writeIdx += 1

        if lod != lastLod {
          lastLod = lod
          emit("onLeadOff", ["lodBits": Int(lod)])
        }
      }
    }

    if railedI || railedII {
      emit("onSignalRail", ["I": railedI, "II": railedII])
    }
  }

  // MARK: 3-channel packet parsing — mirrors parseEcgPacket3() 1:1

  /// STRICT: header 4 B, stride 13 B, and the length must match exactly. A
  /// parser that guesses a stride is how a format change becomes a
  /// plausible-looking wrong trace. No rail check — int32 µV does not clamp.
  private func parsePacket3(_ data: Data) {
    guard data.count >= Self.ecg3HeaderBytes else { return }
    let seq = Int32(data[0])
    let count = Int(data[1])
    guard count > 0 else { return }
    guard data.count == Self.ecg3HeaderBytes + count * Self.ecg3SampleBytes else { return }
    let flags = Int(data[2])

    if lastSeq >= 0 {
      droppedPackets += Int((seq - lastSeq - 1 + 256) % 256)
    }
    lastSeq = seq

    if flags != lastFlags {
      lastFlags = flags
      emit("onDeviceFlags", ["flags": flags])
    }

    data.withUnsafeBytes { (raw: UnsafeRawBufferPointer) in
      for i in 0..<count {
        let off = Self.ecg3HeaderBytes + i * Self.ecg3SampleBytes
        let uvI = raw.loadUnaligned(fromByteOffset: off, as: Int32.self).littleEndian
        let uvIIa = raw.loadUnaligned(fromByteOffset: off + 4, as: Int32.self).littleEndian
        let uvIIb = raw.loadUnaligned(fromByteOffset: off + 8, as: Int32.self).littleEndian
        let lod = raw.load(fromByteOffset: off + 12, as: UInt8.self)

        batchLeadI.append(Double(uvI) / 1000.0) // µV → mV
        batchLeadII.append(Double(uvIIa) / 1000.0)
        batchLeadIIb.append(Double(uvIIb) / 1000.0)
        writeIdx += 1

        // Same event as the legacy stream; bit 3 (LL#2) can only be set here.
        if lod != lastLod {
          lastLod = lod
          emit("onLeadOff", ["lodBits": Int(lod)])
        }
      }
    }
  }

  // MARK: batching

  private func startFlushTimer() {
    stopFlushTimer()
    let timer = DispatchSource.makeTimerSource(queue: queue)
    timer.schedule(deadline: .now() + Self.flushInterval, repeating: Self.flushInterval)
    timer.setEventHandler { [weak self] in self?.flush() }
    timer.resume()
    flushTimer = timer
  }

  private func stopFlushTimer() {
    flushTimer?.cancel()
    flushTimer = nil
  }

  private func flush() {
    guard !batchLeadI.isEmpty else { return }
    emit("onEcgBatch", [
      "leadI": batchLeadI,
      "leadII": batchLeadII,
      // ALWAYS present; EMPTY on a legacy device — that is the signal.
      "leadIIb": batchLeadIIb,
      "writeIdx": writeIdx,
      "droppedPackets": droppedPackets,
    ])
    batchLeadI.removeAll(keepingCapacity: true)
    batchLeadII.removeAll(keepingCapacity: true)
    batchLeadIIb.removeAll(keepingCapacity: true)
  }

  private func status(_ status: String, detail: String? = nil, deviceName: String? = nil) {
    var body: [String: Any] = ["status": status]
    if let detail { body["detail"] = detail }
    if let deviceName { body["deviceName"] = deviceName }
    emit("onStatusChange", body)
  }
}

// v0.2.0 — Dual Lead II (firmware v3): discovers both characteristics and
//          subscribes to the 3-channel one when present, else legacy as before;
//          strict 13-byte parser mirroring parseEcgPacket3; `leadIIb` in every
//          batch (empty on legacy); new `onDeviceFlags` on change of the flags
//          byte; stream state reset per subscription. Legacy parser untouched.
//          ⚠️ Never compiled on this (Windows) machine — needs an EAS build.
// v0.1.0 — CoreBluetooth central: frozen GATT contract, off-JS parsing, 10 Hz batches.
