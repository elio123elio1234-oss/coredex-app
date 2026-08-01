/* ==================================================================
   CyphixBleModule — iOS half of the native BLE bridge (CoreBluetooth).

   FROZEN PROTOCOL (CYPHIX_SHARED/src/ble/protocol.ts is canonical):
     Service UUID : 4fafc201-1fb5-459e-8fcc-c5c9c331914b
     Char UUID    : beb5483e-36e1-4688-b7f5-ea07361b26a8 (Notify)
     Packet       : [seq:u8][count:u8][count × (5B int16 | 9B int32) sample]
     Sample       : LeadI µV, LeadII µV (little-endian) + u8 LOD

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

    Events("onStatusChange", "onEcgBatch", "onHeartRate", "onLeadOff", "onSignalRail")

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
  private var writeIdx: Int = 0
  private var lastSeq: Int32 = -1
  private var droppedPackets: Int = 0
  private var lastLod: UInt8 = 0
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
    peripheral.discoverCharacteristics([Self.dataCharUUID], for: service)
  }

  func peripheral(_ peripheral: CBPeripheral,
                  didDiscoverCharacteristicsFor service: CBService, error: Error?) {
    guard let char = service.characteristics?.first(where: { $0.uuid == Self.dataCharUUID }) else { return }
    peripheral.setNotifyValue(true, for: char)
    startFlushTimer()
    status("streaming", deviceName: peripheral.name)
  }

  func peripheral(_ peripheral: CBPeripheral,
                  didUpdateValueFor characteristic: CBCharacteristic, error: Error?) {
    guard let data = characteristic.value else { return }
    parsePacket(data)
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
      "writeIdx": writeIdx,
      "droppedPackets": droppedPackets,
    ])
    batchLeadI.removeAll(keepingCapacity: true)
    batchLeadII.removeAll(keepingCapacity: true)
  }

  private func status(_ status: String, detail: String? = nil, deviceName: String? = nil) {
    var body: [String: Any] = ["status": status]
    if let detail { body["detail"] = detail }
    if let deviceName { body["deviceName"] = deviceName }
    emit("onStatusChange", body)
  }
}

// v0.1.0 — CoreBluetooth central: frozen GATT contract, off-JS parsing, 10 Hz batches.
