/* ==================================================================
   CyphixBleModule — Android half of the native BLE bridge.

   FROZEN PROTOCOL (CYPHIX_SHARED/src/ble/protocol.ts is canonical):
     Service UUID : 4fafc201-1fb5-459e-8fcc-c5c9c331914b

     LEGACY char  : beb5483e-36e1-4688-b7f5-ea07361b26a8 (Notify) — every firmware
       Packet     : [seq:u8][count:u8][count × (5B int16 | 9B int32) sample]
       Sample     : LeadI µV, LeadII µV (little-endian) + u8 LOD

     3-CHANNEL    : beb5483f-36e1-4688-b7f5-ea07361b26a8 (Notify) — firmware v3+ only
       Packet     : [seq:u8][count:u8][flags:u8][rsv:u8][count × 13B sample]
       Sample     : int32 LeadI, int32 LeadII-a, int32 LeadII-b (µV, LE) + u8 LOD
       12 samples = 160 B, one notification per 37.5 ms.

   ONE OF THE TWO, NEVER BOTH. v3 firmware exposes both characteristics and
   keeps the legacy one byte-identical; this module subscribes to the
   3-channel one when the device has it and to the legacy one otherwise.
   Lead II-a IS the legacy Lead II (same electrode pair), so `leadII` in a
   batch means the same thing on either stream. `leadIIb` is ALWAYS in the
   batch and EMPTY on a legacy device — that is how JS tells them apart.

   The 3-channel parser is STRICT where the legacy one infers a stride: the
   length must be exactly 4 + count × 13 or the packet is dropped
   (mirrors parseEcgPacket3). The legacy parser is untouched.

   ⚠️ THE MTU IS REQUESTED HERE, AND HAD TO BE. Android opens every GATT
   link at the default ATT MTU of 23 — a 20-byte notification — and only
   the CLIENT may ask for more (the firmware's `BLEDevice::setMTU(185)` is
   the ceiling it will AGREE to, not a request). iOS asks on its own;
   Android does not. Until v0.2.0 this module never asked, so by the spec
   every 146 B legacy packet arrives cut to 20 bytes and is dropped by the
   stride check — silently, as "connected, no signal". (Reasoned from the
   ATT rules, never observed: this half has not been run against hardware.)
   The 160 B 3-channel packet needs it just the same. So: connect →
   requestMtu → (onMtuChanged or a timeout) → discoverServices. GATT
   operations must not overlap, which is why discovery waits for the MTU
   answer instead of racing it.

   Design (root CLAUDE.md §3.2): notifications are parsed on the Binder
   thread, batched, and flushed to JS at ≤ 10 Hz. The JS thread never
   sees per-sample traffic. Runtime permissions (BLUETOOTH_SCAN /
   BLUETOOTH_CONNECT) must already be granted by the UI before connect().
   ================================================================== */

package com.cyphix.ble

import android.annotation.SuppressLint
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothGatt
import android.bluetooth.BluetoothGattCallback
import android.bluetooth.BluetoothGattCharacteristic
import android.bluetooth.BluetoothManager
import android.bluetooth.BluetoothProfile
import android.bluetooth.le.ScanCallback
import android.bluetooth.le.ScanFilter
import android.bluetooth.le.ScanResult
import android.bluetooth.le.ScanSettings
import android.content.Context
import android.os.Handler
import android.os.Looper
import android.os.ParcelUuid
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.util.UUID
import kotlin.math.abs

@SuppressLint("MissingPermission")
class CyphixBleModule : Module() {

  companion object {
    // Frozen contract — mirrors @cyphix/shared/ble/protocol.ts. Never tune here.
    val SERVICE_UUID: UUID = UUID.fromString("4fafc201-1fb5-459e-8fcc-c5c9c331914b")
    val DATA_CHAR_UUID: UUID = UUID.fromString("beb5483e-36e1-4688-b7f5-ea07361b26a8")
    /** 3-channel stream (firmware v3+). Absent ⇒ legacy device, not an error. */
    val DATA3_CHAR_UUID: UUID = UUID.fromString("beb5483f-36e1-4688-b7f5-ea07361b26a8")
    val CCCD_UUID: UUID = UUID.fromString("00002902-0000-1000-8000-00805f9b34fb")
    const val ECG3_HEADER_BYTES = 4
    const val ECG3_SAMPLE_BYTES = 13
    const val RAIL_UV = 32767
    const val RAIL_MARGIN_UV = 8
    /** Flush batches to JS at 10 Hz — UI needs frames, not packets. */
    const val FLUSH_MS = 100L
    /**
     * 160 B of payload + 3 B of ATT header needs ≥ 163. 185 is what the
     * firmware agrees to and what iOS negotiates, so it is the one MTU this
     * link has actually been proven loss-free at (see the header).
     */
    const val REQUEST_MTU = 185
    /** If the stack never answers the MTU request, discover anyway. */
    const val MTU_TIMEOUT_MS = 2000L
  }

  private val handler = Handler(Looper.getMainLooper())
  private var adapter: BluetoothAdapter? = null
  private var gatt: BluetoothGatt? = null
  private var wantsConnection = false
  private var discoveryStarted = false

  private val batchLeadI = ArrayList<Double>(64)
  private val batchLeadII = ArrayList<Double>(64)
  /** Lead II-b. Grows in lockstep with the other two on the 3-channel stream;
      stays EMPTY on the legacy one. Guarded by the same lock (batchLeadI). */
  private val batchLeadIIb = ArrayList<Double>(64)
  private var writeIdx = 0
  private var lastSeq = -1
  private var droppedPackets = 0
  private var lastLod = -1
  /** -1 = nothing announced on this subscription yet. */
  private var lastFlags = -1

  override fun definition() = ModuleDefinition {
    Name("CyphixBle")

    Events("onStatusChange", "onEcgBatch", "onHeartRate", "onLeadOff", "onSignalRail", "onDeviceFlags")

    AsyncFunction("connect") {
      wantsConnection = true
      val manager = appContext.reactContext?.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
      adapter = manager?.adapter
      val scanner = adapter?.bluetoothLeScanner
      // if/else, not an early `return@AsyncFunction`: the DSL's lambda is typed
      // `-> Any?`, and a bare labelled return is `Unit` — which Kotlin 2 rejects
      // ("expected 'Any?', actual 'Unit'"). That line shipped in v0.1.0 and meant
      // this module had never once compiled; nobody knew, because there had never
      // been an Android build to find out.
      if (scanner == null) {
        status("error", "Bluetooth unavailable or off")
      } else {
        status("connecting")
        val filter = ScanFilter.Builder().setServiceUuid(ParcelUuid(SERVICE_UUID)).build()
        val settings = ScanSettings.Builder().setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY).build()
        scanner.startScan(listOf(filter), settings, scanCallback)
      }
    }

    AsyncFunction("disconnect") {
      wantsConnection = false
      stopFlush()
      handler.removeCallbacks(mtuTimeout)
      adapter?.bluetoothLeScanner?.stopScan(scanCallback)
      gatt?.close()
      gatt = null
      status("disconnected")
    }

    OnDestroy {
      stopFlush()
      handler.removeCallbacks(mtuTimeout)
      adapter?.bluetoothLeScanner?.stopScan(scanCallback)
      gatt?.close()
      gatt = null
    }
  }

  // Explicit types on the four members below: they refer to one another
  // (scan -> gatt -> mtuTimeout -> startDiscovery -> mtuTimeout), and inferring
  // an anonymous object's type through that cycle is a compile error.
  private val scanCallback: ScanCallback = object : ScanCallback() {
    override fun onScanResult(callbackType: Int, result: ScanResult) {
      adapter?.bluetoothLeScanner?.stopScan(this)
      status("connecting", deviceName = result.device.name)
      gatt = result.device.connectGatt(appContext.reactContext, false, gattCallback)
    }

    override fun onScanFailed(errorCode: Int) {
      status("error", "BLE scan failed ($errorCode)")
    }
  }

  private val gattCallback: BluetoothGattCallback = object : BluetoothGattCallback() {
    override fun onConnectionStateChange(g: BluetoothGatt, statusCode: Int, newState: Int) {
      if (newState == BluetoothProfile.STATE_CONNECTED) {
        status("connected", deviceName = g.device.name)
        // MTU first, discovery after — see the header. If the request cannot
        // even be queued, carry on exactly as before it existed.
        discoveryStarted = false
        if (g.requestMtu(REQUEST_MTU)) {
          handler.postDelayed(mtuTimeout, MTU_TIMEOUT_MS)
        } else {
          startDiscovery(g)
        }
      } else if (newState == BluetoothProfile.STATE_DISCONNECTED) {
        stopFlush()
        handler.removeCallbacks(mtuTimeout)
        if (wantsConnection) {
          status("connecting", "link lost — rescanning")
          val filter = ScanFilter.Builder().setServiceUuid(ParcelUuid(SERVICE_UUID)).build()
          val settings = ScanSettings.Builder().setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY).build()
          adapter?.bluetoothLeScanner?.startScan(listOf(filter), settings, scanCallback)
        } else {
          status("disconnected")
        }
      }
    }

    override fun onMtuChanged(g: BluetoothGatt, mtu: Int, statusCode: Int) {
      // Granted or refused, discovery goes ahead: a refused request leaves the
      // link where it was before this module ever asked.
      startDiscovery(g)
    }

    override fun onServicesDiscovered(g: BluetoothGatt, statusCode: Int) {
      // ONE of the two, never both: the 3-channel stream when the device has
      // it (firmware v3+), otherwise the legacy one exactly as before.
      val service = g.getService(SERVICE_UUID) ?: return
      val char = service.getCharacteristic(DATA3_CHAR_UUID)
        ?: service.getCharacteristic(DATA_CHAR_UUID)
        ?: return
      resetStreamState()
      g.setCharacteristicNotification(char, true)
      val cccd = char.getDescriptor(CCCD_UUID)
      @Suppress("DEPRECATION")
      cccd?.let {
        it.value = android.bluetooth.BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE
        g.writeDescriptor(it)
      }
      startFlush()
      status("streaming", deviceName = g.device.name)
    }

    @Deprecated("Pre-API-33 callback kept for device coverage")
    override fun onCharacteristicChanged(g: BluetoothGatt, characteristic: BluetoothGattCharacteristic) {
      @Suppress("DEPRECATION")
      characteristic.value?.let { route(characteristic.uuid, it) }
    }

    override fun onCharacteristicChanged(
      g: BluetoothGatt,
      characteristic: BluetoothGattCharacteristic,
      value: ByteArray,
    ) {
      route(characteristic.uuid, value)
    }
  }

  private val mtuTimeout: Runnable = Runnable { gatt?.let { startDiscovery(it) } }

  /** Once per connection, whichever of onMtuChanged / the timeout gets here first. */
  @Synchronized
  private fun startDiscovery(g: BluetoothGatt) {
    if (discoveryStarted) return
    discoveryStarted = true
    handler.removeCallbacks(mtuTimeout)
    g.discoverServices()
  }

  private fun route(uuid: UUID, bytes: ByteArray) {
    if (uuid == DATA3_CHAR_UUID) parsePacket3(bytes) else parsePacket(bytes)
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
  private fun resetStreamState() {
    synchronized(batchLeadI) {
      batchLeadI.clear()
      batchLeadII.clear()
      batchLeadIIb.clear()
    }
    lastLod = 0
    lastFlags = -1
    sendEvent("onLeadOff", mapOf("lodBits" to 0))
  }

  /** Mirrors parseEcgPacket() 1:1 — malformed packets are dropped, never thrown. */
  private fun parsePacket(bytes: ByteArray) {
    if (bytes.size < 2) return
    val seq = bytes[0].toInt() and 0xFF
    val count = bytes[1].toInt() and 0xFF
    if (count == 0) return
    val payload = bytes.size - 2
    if (payload % count != 0) return
    val stride = payload / count
    if (stride != 5 && stride != 9) return

    if (lastSeq >= 0) droppedPackets += (seq - lastSeq - 1 + 256) % 256
    lastSeq = seq

    var railedI = false
    var railedII = false
    val buf = ByteBuffer.wrap(bytes).order(ByteOrder.LITTLE_ENDIAN)

    synchronized(batchLeadI) {
      for (i in 0 until count) {
        val off = 2 + i * stride
        val uvI: Int
        val uvII: Int
        if (stride == 5) {
          uvI = buf.getShort(off).toInt()
          uvII = buf.getShort(off + 2).toInt()
          if (abs(uvI) >= RAIL_UV - RAIL_MARGIN_UV) railedI = true
          if (abs(uvII) >= RAIL_UV - RAIL_MARGIN_UV) railedII = true
        } else {
          uvI = buf.getInt(off)
          uvII = buf.getInt(off + 4)
        }
        val lod = buf.get(off + if (stride == 5) 4 else 8).toInt() and 0xFF

        batchLeadI.add(uvI / 1000.0) // µV → mV
        batchLeadII.add(uvII / 1000.0)
        writeIdx++

        if (lod != lastLod) {
          lastLod = lod
          sendEvent("onLeadOff", mapOf("lodBits" to lod))
        }
      }
    }

    if (railedI || railedII) {
      sendEvent("onSignalRail", mapOf("I" to railedI, "II" to railedII))
    }
  }

  /**
   * Mirrors parseEcgPacket3() 1:1. STRICT: header 4 B, stride 13 B, and the
   * length must match exactly — a parser that guesses a stride is how a format
   * change becomes a plausible-looking wrong trace. No rail check: int32 µV
   * does not clamp.
   */
  private fun parsePacket3(bytes: ByteArray) {
    if (bytes.size < ECG3_HEADER_BYTES) return
    val seq = bytes[0].toInt() and 0xFF
    val count = bytes[1].toInt() and 0xFF
    if (count == 0) return
    if (bytes.size != ECG3_HEADER_BYTES + count * ECG3_SAMPLE_BYTES) return
    val flags = bytes[2].toInt() and 0xFF

    if (lastSeq >= 0) droppedPackets += (seq - lastSeq - 1 + 256) % 256
    lastSeq = seq

    if (flags != lastFlags) {
      lastFlags = flags
      sendEvent("onDeviceFlags", mapOf("flags" to flags))
    }

    val buf = ByteBuffer.wrap(bytes).order(ByteOrder.LITTLE_ENDIAN)

    synchronized(batchLeadI) {
      for (i in 0 until count) {
        val off = ECG3_HEADER_BYTES + i * ECG3_SAMPLE_BYTES
        val uvI = buf.getInt(off)
        val uvIIa = buf.getInt(off + 4)
        val uvIIb = buf.getInt(off + 8)
        val lod = buf.get(off + 12).toInt() and 0xFF

        batchLeadI.add(uvI / 1000.0) // µV → mV
        batchLeadII.add(uvIIa / 1000.0)
        batchLeadIIb.add(uvIIb / 1000.0)
        writeIdx++

        // Same event as the legacy stream; bit 3 (LL#2) can only be set here.
        if (lod != lastLod) {
          lastLod = lod
          sendEvent("onLeadOff", mapOf("lodBits" to lod))
        }
      }
    }
  }

  private val flushRunnable: Runnable = object : Runnable {
    override fun run() {
      flush()
      handler.postDelayed(this, FLUSH_MS)
    }
  }

  private fun startFlush() {
    handler.removeCallbacks(flushRunnable)
    handler.postDelayed(flushRunnable, FLUSH_MS)
  }

  private fun stopFlush() {
    handler.removeCallbacks(flushRunnable)
  }

  private fun flush() {
    val i: List<Double>
    val ii: List<Double>
    val iib: List<Double>
    synchronized(batchLeadI) {
      if (batchLeadI.isEmpty()) return
      i = ArrayList(batchLeadI)
      ii = ArrayList(batchLeadII)
      iib = ArrayList(batchLeadIIb)
      batchLeadI.clear()
      batchLeadII.clear()
      batchLeadIIb.clear()
    }
    sendEvent(
      "onEcgBatch",
      mapOf(
        "leadI" to i,
        "leadII" to ii,
        // ALWAYS present; EMPTY on a legacy device — that is the signal.
        "leadIIb" to iib,
        "writeIdx" to writeIdx,
        "droppedPackets" to droppedPackets,
      ),
    )
  }

  private fun status(status: String, detail: String? = null, deviceName: String? = null) {
    val body = HashMap<String, Any>()
    body["status"] = status
    detail?.let { body["detail"] = it }
    deviceName?.let { body["deviceName"] = it }
    sendEvent("onStatusChange", body)
  }
}

// v0.65.1 — COMPILES, for the first time: `:cyphix-ble:compileDebugKotlin` run locally found
//           a `return@AsyncFunction` (Unit where the DSL wants Any?) that has been here since
//           v0.1.0, and an inferred-type cycle from today's mtuTimeout. Both fixed; no behaviour change.
// v0.2.0 — Dual Lead II (firmware v3): subscribes to the 3-channel
//          characteristic when present, else legacy as before; strict 13-byte
//          parser mirroring parseEcgPacket3; `leadIIb` in every batch (empty on
//          legacy); new `onDeviceFlags` on change of the flags byte; stream
//          state reset per subscription. Legacy parser untouched.
//          ALSO: requests MTU 185 before service discovery. It was never
//          requested, and at Android's default MTU of 23 not even the legacy
//          146 B packet fits in a notification.
//          ⚠️ Never compiled or run — no Android build was made for this change.
// v0.1.0 — GATT central: frozen contract, Binder-thread parsing, 10 Hz batches.
