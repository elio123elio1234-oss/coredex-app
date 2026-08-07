# ==================================================================
#  ship.ps1 — put the current code on the iPhone, the right way for the
#  change that was actually made. One command; it picks the path.
#
#  Run it from anywhere:
#      powershell -ExecutionPolicy Bypass -File .\scripts\ship.ps1
#  or, if you already know which path you want:
#      .\scripts\ship.ps1 -Path ota
#      .\scripts\ship.ps1 -Path rebuild
#
#  ── WHY THIS EXISTS ──
#  There are two shipping paths (mobile CLAUDE.md §5A.1) and choosing the
#  wrong one fails SILENTLY, which is the whole problem:
#
#    • TS/JS/TSX only  → `eas update`  (~1 min)
#    • native touched  → `eas build` + submit (~30-40 min)
#
#  An `eas update` after a native change publishes successfully and the
#  new native code is simply not in the binary it lands on. And an update
#  published while `app.json`'s `version` has moved targets a runtimeVersion
#  no installed build has — it reaches NOBODY, with no error, and reads
#  exactly like "OTA doesn't work". Both traps are checked below rather
#  than remembered.
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

# ── Who are we shipping? ───────────────────────────────────────────
$appJson = Get-Content "$root\app.json" -Raw | ConvertFrom-Json
$nativeVersion = $appJson.expo.version
$badge = (Select-String -Path "$root\src\config\version.ts" -Pattern "APP_VERSION\s*=\s*'([^']+)'").Matches[0].Groups[1].Value

Say "CYPHIX Medical — badge v$badge  ·  native runtime v$nativeVersion"

# ── Which path? ────────────────────────────────────────────────────
# Native means: the Swift/Kotlin modules, the app config, or the
# dependency list (a new library with native code is the usual case).
if ($Path -eq 'auto') {
    $touched = git diff --name-only HEAD~1 HEAD -- . 2>$null
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

# ── The checks that are cheaper than a bad build ───────────────────
Say "Typechecking…"
npx tsc --noEmit
if (-not $?) { throw "tsc failed — fix it before shipping." }

Say "Bundling both platforms…"
npx expo export --platform ios --output-dir "$env:TEMP\cyphix-export-ios" | Out-Null
if (-not $?) { throw "iOS bundle failed." }
npx expo export --platform android --output-dir "$env:TEMP\cyphix-export-android" | Out-Null
if (-not $?) { throw "Android bundle failed." }

Say "Running expo-doctor…"
npx expo-doctor

# ── Ship ───────────────────────────────────────────────────────────
if ($Path -eq 'rebuild') {
    Say "REBUILD path: compiling on Expo's Macs, then submitting to TestFlight." 'Green'
    Write-Host "  This takes ~30-40 minutes. It is safe to walk away." -ForegroundColor DarkGray
    Write-Host "  Runtime for this binary will be $nativeVersion." -ForegroundColor DarkGray

    npx eas-cli build --platform ios --profile production --auto-submit --non-interactive
    if (-not $?) { throw "Build or submit failed — read the error above." }

    Say "Built and sent to App Store Connect." 'Green'
    Write-Host "  Processing in TestFlight takes another 5-15 minutes; you get an email." -ForegroundColor DarkGray
    Write-Host "  ⚠️  From here on, every OTA must be published while app.json still" -ForegroundColor Yellow
    Write-Host "     reads $nativeVersion, or it targets a runtime nothing is running." -ForegroundColor Yellow
}
else {
    Say "OTA path: publishing JS to channel 'production'." 'Green'

    # ★ Named branch, never --auto. --auto takes the branch name from GIT
    #   ('master' here), and a new branch auto-links to a channel of the
    #   same name — so the update publishes successfully to a channel
    #   nothing subscribes to. No error, no delivery.
    npx eas-cli update --branch production --message "v$badge — $badge"
    if (-not $?) { throw "Update failed." }

    Say "Confirming which branch channel 'production' is actually serving…"
    npx eas-cli channel:view production

    Say "Published." 'Green'
    Write-Host "  On the phone: FULLY CLOSE the app and reopen it TWICE." -ForegroundColor DarkGray
    Write-Host "  expo-updates fetches on launch and applies on the NEXT launch," -ForegroundColor DarkGray
    Write-Host "  so the first reopen may still show the old bundle." -ForegroundColor DarkGray
    Write-Host "  The badge should then read v$badge." -ForegroundColor DarkGray
}

# v1.0.0 — One command to ship; picks OTA vs rebuild from what the last commit
#          touched, and refuses to skip the checks that are cheaper than a
#          bad build.
