# ==================================================================
#  ship.ps1 - put the current code on the iPhone, the right way for the
#  change that was actually made. One command; it picks the path.
#
#  Run it:
#      npm run ship            (auto: reads the last commit)
#      npm run ship:ota        (force the JS-only path)
#      npm run ship:rebuild    (force the native path)
#
#  ---------------------------------------------------------------
#  ** THIS FILE IS PURE ASCII ON PURPOSE - DO NOT ADD AN EM DASH **
#  ---------------------------------------------------------------
#  Windows PowerShell 5.1 reads a .ps1 as the system ANSI codepage
#  unless the file carries a UTF-8 BOM. v1.0.0 of this script was
#  written UTF-8-no-BOM with em dashes in its error strings; 5.1 read
#  each one as three ANSI characters, one of which closed the string
#  early, and the whole file failed to PARSE - before a single line
#  ran. Every character here stays in the ASCII range so the encoding
#  cannot matter. If a future edit needs a dash, write "-".
#
#  ---- WHY THE SCRIPT EXISTS AT ALL ----
#  There are two shipping paths (mobile CLAUDE.md 5A.1) and choosing
#  the wrong one fails SILENTLY, which is the whole problem:
#
#    * TS/JS/TSX only  -> eas update          (~1 min)
#    * native touched  -> eas build + submit  (~30-40 min)
#
#  An `eas update` after a native change publishes successfully and the
#  new native code is simply not in the binary it lands on. And an
#  update published while app.json's `version` has moved targets a
#  runtimeVersion no installed build has - it reaches NOBODY, with no
#  error, and reads exactly like "OTA doesn't work". Both traps are
#  checked below rather than remembered.
# ==================================================================

param(
    # 'auto' inspects git; 'ota' and 'rebuild' force a path.
    [ValidateSet('auto', 'ota', 'rebuild')]
    [string]$Path = 'auto'
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

function Say([string]$msg, [string]$colour = 'Cyan') {
    Write-Host ""
    Write-Host "  $msg" -ForegroundColor $colour
    Write-Host ""
}

# Native commands do not throw, and $? is unreliable across a pipeline,
# so every external call is checked by its real exit code.
function Assert-Ok([string]$what) {
    if ($LASTEXITCODE -ne 0) { throw "$what failed (exit $LASTEXITCODE). Read the output above." }
}

# ---- Who are we shipping? ----------------------------------------
$appJson = Get-Content "$root\app.json" -Raw | ConvertFrom-Json
$nativeVersion = $appJson.expo.version
$badge = (Select-String -Path "$root\src\config\version.ts" -Pattern "APP_VERSION\s*=\s*'([^']+)'").Matches[0].Groups[1].Value

Say "CYPHIX Medical - badge v$badge  |  native runtime v$nativeVersion"

# ---- Which path? -------------------------------------------------
# Native means: the Swift/Kotlin modules, the app config, or the
# dependency list (a new library with native code is the usual case).
if ($Path -eq 'auto') {
    $touched = git diff --name-only HEAD~1 HEAD 2>$null
    $native = $touched | Where-Object {
        $_ -match 'CYPHIX_MEDICAL_MOBILE/(modules/|app\.json|package\.json|eas\.json)'
    }
    if ($native) {
        Write-Host "  Native surface changed in the last commit:" -ForegroundColor Yellow
        $native | ForEach-Object { Write-Host "    $_" -ForegroundColor Yellow }
        $Path = 'rebuild'
    }
    else {
        $Path = 'ota'
    }
}

# ---- The checks that are cheaper than a bad build ----------------
Say "Typechecking..."
npx tsc --noEmit
Assert-Ok "tsc"

Say "Bundling both platforms..."
npx expo export --platform ios --output-dir "$env:TEMP\cyphix-export-ios" | Out-Null
Assert-Ok "iOS bundle"
npx expo export --platform android --output-dir "$env:TEMP\cyphix-export-android" | Out-Null
Assert-Ok "Android bundle"

Say "Running expo-doctor..."
npx expo-doctor
Assert-Ok "expo-doctor"

# ---- Ship --------------------------------------------------------
if ($Path -eq 'rebuild') {
    Say "REBUILD path: compiling on Expo's Macs, then submitting to TestFlight." 'Green'
    Write-Host "  This takes ~30-40 minutes. It is safe to walk away." -ForegroundColor DarkGray
    Write-Host "  Runtime for this binary will be $nativeVersion." -ForegroundColor DarkGray

    npx eas-cli build --platform ios --profile production --auto-submit --non-interactive
    Assert-Ok "eas build"

    Say "Built and sent to App Store Connect." 'Green'
    Write-Host "  TestFlight processing takes another 5-15 minutes; you get an email." -ForegroundColor DarkGray
    Write-Host "  WARNING: from here on, every OTA must be published while app.json" -ForegroundColor Yellow
    Write-Host "  still reads $nativeVersion, or it targets a runtime nothing is running." -ForegroundColor Yellow
}
else {
    Say "OTA path: publishing JS to channel 'production'." 'Green'

    # ** Named branch, never --auto. ** --auto takes the branch name from
    # GIT ('master' here), and a new branch auto-links to a channel of the
    # same name - so the update publishes successfully to a channel that
    # nothing subscribes to. No error, no delivery.
    npx eas-cli update --branch production --message "v$badge"
    Assert-Ok "eas update"

    Say "Confirming which branch channel 'production' is actually serving..."
    npx eas-cli channel:view production

    Say "Published." 'Green'
    Write-Host "  On the phone: FULLY CLOSE the app and reopen it TWICE." -ForegroundColor DarkGray
    Write-Host "  expo-updates fetches on launch and applies on the NEXT launch," -ForegroundColor DarkGray
    Write-Host "  so the first reopen may still show the old bundle." -ForegroundColor DarkGray
    Write-Host "  The badge should then read v$badge." -ForegroundColor DarkGray
}

# v1.1.0 - Rewritten PURE ASCII. v1.0.0 could not be parsed at all on Windows
#          PowerShell 5.1: a .ps1 with no BOM is read as the ANSI codepage, so
#          the em dashes in its error strings became three characters each, one
#          of which closed the string early. Also switched every external-command
#          check from $? to $LASTEXITCODE, which is what actually survives a pipe.
# v1.0.0 - One command to ship; picks OTA vs rebuild from what the last commit
#          touched, and refuses to skip the checks that are cheaper than a
#          bad build.
