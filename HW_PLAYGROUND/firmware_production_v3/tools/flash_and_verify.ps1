# ==================================================================
#  flash_and_verify.ps1 - put firmware v3 on the ESP32, and prove it.
#
#      powershell -ExecutionPolicy Bypass -File tools\flash_and_verify.ps1
#      ... -SkipV2Check     (the board is known NOT to run v2, e.g. the spare ESP)
#      ... -NoFlash         (only run the checks against whatever is on the board)
#
#  PURE ASCII ON PURPOSE: Windows PowerShell 5.1 reads a BOM-less .ps1 as the
#  ANSI codepage, and one em dash inside a string once stopped a script in this
#  repo from even parsing (see CYPHIX_MEDICAL_MOBILE/scripts/ship.ps1).
#
#  Order matters, and step 2 is the one that cannot be redone later:
#    1. find the board by USB VID and REFUSE a port Windows has not started
#    2. verify_flash against the backed-up v2 image  (read-only)
#       - the restore point was taken with the board unplugged, so "this .bin is
#         what is on the chip" was an inference from timestamps. This turns it
#         into a measurement, and it has to happen BEFORE v3 overwrites it.
#    3. build + upload v3
#    4. read the boot banner: every register is read back from the chip
#    5. tools\ble_check.py over the air (needs python + bleak)
# ==================================================================

param(
    [switch]$SkipV2Check,
    [switch]$NoFlash,
    [string]$Python = ''
)

$fw      = Split-Path -Parent $PSScriptRoot
$backup  = Join-Path (Split-Path -Parent $fw) 'firmware_current\flashed_bin_v2_int32'
$pioPy   = Join-Path $env:USERPROFILE '.platformio\penv\Scripts\python.exe'
$pio     = Join-Path $env:USERPROFILE '.platformio\penv\Scripts\platformio.exe'
$esptool = Join-Path $env:USERPROFILE '.platformio\packages\tool-esptoolpy\esptool.py'
$failed  = 0

function Say($text)  { Write-Host "" ; Write-Host "== $text" }
function Pass($text) { Write-Host "  PASS  $text" }
function Fail($text) { Write-Host "  FAIL  $text" ; $script:failed++ }

# ---- 1. the board, by VID - never by COM number ------------------------------
Say "1. Looking for an ESP32 DevKit (CP2102 = VID_10C4, CH340 = VID_1A86)"
$all = @(Get-CimInstance Win32_PnPEntity | Where-Object { $_.DeviceID -match 'VID_(10C4|1A86)' })
foreach ($d in $all) { Write-Host ("  {0}   status={1} code={2}" -f $d.Name, $d.Status, $d.ConfigManagerErrorCode) }
$ok = @($all | Where-Object { $_.Status -eq 'OK' -and $_.Name -match 'COM\d+' })
if ($ok.Count -ne 1) {
    Write-Host ""
    Write-Host "  Found $($ok.Count) usable board(s); exactly one is needed."
    if ($all.Count -gt $ok.Count) {
        Write-Host "  A board that is listed but not 'OK' (code 31) usually means its COM number is"
        Write-Host "  already owned by something else - on this PC, an old 'Standard Serial over"
        Write-Host "  Bluetooth link'. Move the USB cable to a different socket and run this again."
    }
    exit 2
}
$port = [regex]::Match($ok[0].Name, 'COM\d+').Value
$owner = (Get-ItemProperty 'HKLM:\HARDWARE\DEVICEMAP\SERIALCOMM').PSObject.Properties |
         Where-Object { $_.Value -eq $port } | Select-Object -First 1
if ($owner -and $owner.Name -match 'BthModem') {
    Write-Host "  $port is routed to a BLUETOOTH serial link ($($owner.Name)), not to the USB board. Move the cable."
    exit 2
}
Pass "board on $port"

# ---- 2. is the backed-up v2 image really what is on the chip? -----------------
if (-not $SkipV2Check -and -not $NoFlash) {
    Say "2. verify_flash against the v2 restore image (read-only)"
    & $pioPy $esptool --chip esp32 --port $port --baud 460800 verify_flash `
        0x1000 "$backup\bootloader.bin" 0x8000 "$backup\partitions.bin" 0x10000 "$backup\firmware.bin"
    if ($LASTEXITCODE -eq 0) {
        Pass "the chip holds exactly the backed-up v2 image - the restore point is now MEASURED, not inferred"
    } else {
        Fail "the chip does NOT match the v2 backup (or the read failed)."
        Write-Host "        Not flashing: if this board really is the prototype, its firmware is not the"
        Write-Host "        one that was backed up, and v3 would overwrite the only copy. Save it first:"
        Write-Host "          python esptool.py --chip esp32 --port $port read_flash 0 0x400000 prototype_dump.bin"
        Write-Host "        If this is the spare board (playground firmware), re-run with -SkipV2Check."
        exit 3
    }
}

# ---- 3. build + upload -------------------------------------------------------
if (-not $NoFlash) {
    Say "3. Build + upload v3 to $port"
    Push-Location $fw
    & $pio run --target upload --upload-port $port
    $code = $LASTEXITCODE
    Pop-Location
    if ($code -ne 0) { Fail "upload failed (exit $code)"; exit 4 }
    Pass "uploaded"
}

# ---- 4. the boot banner: registers read back from the chip --------------------
Say "4. Boot banner (256000 baud) - what the ADS1293 says it was told"
$expect = [ordered]@{
    'REVID'       = '0x1'
    'FLEX_CH1_CN' = '0x11'   # Lead I     IN2-IN1
    'FLEX_CH2_CN' = '0x19'   # Lead II-a  IN3-IN1
    'FLEX_CH3_CN' = '0x21'   # Lead II-b  IN4-IN1
    'RLD_CN'      = '0x6'    # RLD -> IN6
    'CMDET_EN'    = '0xF'
    'LOD_EN'      = '0xF'
    'AFE_SHDN_CN' = '0x0'
    'CH_CNFG'     = '0x70'
}
$text = ''
try {
    $sp = New-Object System.IO.Ports.SerialPort $port, 256000
    $sp.ReadTimeout = 500
    $sp.DtrEnable = $false
    $sp.Open()
    $sp.RtsEnable = $true ; Start-Sleep -Milliseconds 120 ; $sp.RtsEnable = $false   # pulse EN: reboot
    $until = (Get-Date).AddSeconds(7)
    while ((Get-Date) -lt $until) { $text += $sp.ReadExisting() ; Start-Sleep -Milliseconds 100 }
    $sp.Close()
} catch { Fail "could not read the serial port: $($_.Exception.Message)" }

if ($text -match '\[FW\] CYPHIX v([\d.]+)') { Pass "firmware announces v$($Matches[1])" } else { Fail "no '[FW] CYPHIX v...' line - is this v3?" }
foreach ($k in $expect.Keys) {
    if ($text -match "$k=(0x[0-9A-Fa-f]+)") {
        if ($Matches[1].ToUpper() -eq $expect[$k].ToUpper()) { Pass "$k = $($Matches[1])" }
        else { Fail "$k = $($Matches[1]), expected $($expect[$k])  (the register did not take: SPI wiring, not the code)" }
    } else { Fail "$k not printed" }
}
$status = [regex]::Matches($text, '# v3 IIa=(-?\d+) IIb=(-?\d+) diff=(-?\d+) uV lod=(0x[0-9A-Fa-f]+) misc=(0x[0-9A-Fa-f]+) rld_fault=(\d)')
if ($status.Count -gt 0) {
    $m = $status[$status.Count - 1]
    Write-Host ("  info  last status line: II-a {0} uV, II-b {1} uV, diff {2} uV, lod {3}, misc {4}, rld_fault {5}" -f `
        $m.Groups[1].Value, $m.Groups[2].Value, $m.Groups[3].Value, $m.Groups[4].Value, $m.Groups[5].Value, $m.Groups[6].Value)
    Write-Host "        (with no electrodes on a body, lod=0x0F and rld_fault=1 are the CORRECT answers)"
} else { Fail "no '# v3 IIa=...' status line within 7 s" }
$csv = [regex]::Matches($text, '(?m)^-?\d+,-?\d+,-?\d+,-?\d+,-?\d+,-?\d+,\d+,\d+\r?$')
if ($csv.Count -gt 100) { Pass "v2-format CSV still streaming ($($csv.Count) lines, 8 columns)" } else { Fail "v2-format CSV lines: $($csv.Count)" }

# ---- 5. over the air ---------------------------------------------------------
Say "5. BLE: legacy stream unchanged, 3-channel stream well-formed"
$py = $Python
if (-not $py) { foreach ($c in @('python', 'py')) { if (Get-Command $c -ErrorAction SilentlyContinue) { $py = $c; break } } }
$haveBleak = $false
if ($py) { & $py -c "import bleak" 2>$null ; $haveBleak = ($LASTEXITCODE -eq 0) }
if ($haveBleak) {
    $env:PYTHONIOENCODING = 'utf-8'
    & $py (Join-Path $PSScriptRoot 'ble_check.py') 6
    if ($LASTEXITCODE -ne 0) { Fail "ble_check.py reported failures" } else { Pass "ble_check.py" }
} else {
    Write-Host "  SKIPPED: no python with 'bleak' found. Install it (pip install bleak) or pass -Python <path>."
}

Write-Host ""
if ($failed -eq 0) { Write-Host "ALL CHECKS PASSED" ; exit 0 } else { Write-Host "$failed CHECK(S) FAILED" ; exit 1 }

# v3.0.1 - one command: VID-based port discovery (refuses the Bluetooth-link COM clash), read-only
#          verify of the v2 restore image BEFORE overwriting it, upload, register read-back, BLE check.
