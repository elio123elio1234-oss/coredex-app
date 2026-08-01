/* ==================================================================
   CyphixBleModule — Android half of the native BLE bridge.

   FROZEN PROTOCOL (CYPHIX_SHARED/src/ble/protocol.ts is canonical):
     Service UUID : 4fafc201-1fb5-459e-8fcc-c5c9c331914b
     Char UUID    : beb5483e-36e1-4688-b7f5-ea07361b26a8 (Notify)
     Packet       : [seq:u8][count:u8][count × (5B int16 | 9B int32) sample]
     Sample       : LeadI µV, LeadII µV (little-endian) + u8 LOD

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
    val CCCD_UUID: UUID = UUID.fromString("00002902-0000-1000-8000-00805f9b34fb")
    const val RAIL_UV = 32767
    const val RAIL_MARGIN_UV = 8
    /** Flush batches to JS at 10 Hz — UI needs frames, not packets. */
    const val FLUSH_MS = 100L
  }

  private val handler = Handler(Looper.getMainLooper())
  private var adapter: BluetoothAdapter? = null
  private var gatt: BluetoothGatt? = null
  private var wantsConnection = false

  private val batchLeadI = ArrayList<Double>(64)
  private val batchLeadII = ArrayList<Double>(64)
  private var writeIdx = 0
  private var lastSeq = -1
  private var droppedPackets = 0
  private var lastLod = -1

  override fun definition() = ModuleDefinition {
    Name("CyphixBle")

    Events("onStatusChange", "onEcgBatch", "onHeartRate", "onLeadOff", "onSignalRail")

    AsyncFunction("connect") {
      wantsConnection = true
      val manager = appContext.reactContext?.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
      adapter = manager?.adapter
      val scanner = adapter?.bluetoothLeScanner
      if (scanner == null) {
        status("error", "Bluetooth unavailable or off")
        return@AsyncFunction
      }
      status("connecting")
      val filter = ScanFilter.Builder().setServiceUuid(ParcelUuid(SERVICE_UUID)).build()
      val settings = ScanSettings.Builder().setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY).build()
      scanner.startScan(listOf(filter), settings, scanCallback)
    }

    AsyncFunction("disconnect") {
      wantsConnection = false
      stopFlush()
      adapter?.bluetoothLeScanner?.stopScan(scanCallback)
      gatt?.close()
      gatt = null
      status("disconnected")
    }

    OnDestroy {
      stopFlush()
      adapter?.bluetoothLeScanner?.stopScan(scanCallback)
      gatt?.close()
      gatt = null
    }
  }

  private val scanCallback = object : ScanCallback() {
    override fun onScanResult(callbackType: Int, result: ScanResult) {
      adapter?.bluetoothLeScanner?.stopScan(this)
      status("connecting", deviceName = result.device.name)
      gatt = result.device.connectGatt(appContext.reactContext, false, gattCallback)
    }

    override fun onScanFailed(errorCode: Int) {
      status("error", "BLE scan failed ($errorCode)")
    }
  }

  private val gattCallback = object : BluetoothGattCallback() {
    override fun onConnectionStateChange(g: BluetoothGatt, statusCode: Int, newState: Int) {
      if (newState == BluetoothProfile.STATE_CONNECTED) {
        status("connected", deviceName = g.device.name)
        g.discoverServices()
      } else if (newState == BluetoothProfile.STATE_DISCONNECTED) {
        stopFlush()
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

    override fun onServicesDiscovered(g: BluetoothGatt, statusCode: Int) {
      val char = g.getService(SERVICE_UUID)?.getCharacteristic(DATA_CHAR_UUID) ?: return
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
      characteristic.value?.let { parsePacket(it) }
    }

    override fun onCharacteristicChanged(
      g: BluetoothGatt,
      characteristic: BluetoothGattCharacteristic,
      value: ByteArray,
    ) {
      parsePacket(value)
    }
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

  private val flushRunnable = object : Runnable {
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
    synchronized(batchLeadI) {
      if (batchLeadI.isEmpty()) return
      i = ArrayList(batchLeadI)
      ii = ArrayList(batchLeadII)
      batchLeadI.clear()
      batchLeadII.clear()
    }
    sendEvent(
      "onEcgBatch",
      mapOf("leadI" to i, "leadII" to ii, "writeIdx" to writeIdx, "droppedPackets" to droppedPackets),
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

// v0.1.0 — GATT central: frozen contract, Binder-thread parsing, 10 Hz batches.
