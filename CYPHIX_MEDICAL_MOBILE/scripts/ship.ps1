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
    # 'auto' asks EAS what is installed; 'ota' and 'rebuild' force a path.
    [ValidateSet('auto', 'ota', 'rebuild')]
    [string]$Path = 'auto',

    # Run everything EXCEPT the publish: the version gate, the git check,
    # tsc, both bundles, expo-doctor - then say which path it would take
    # and stop. Exists because this script's own bugs have twice only been
    # reachable by running it for real, and "for real" otherwise means a
    # 40-minute build or an update published to nobody.
    [switch]$DryRun
)

# ---------------------------------------------------------------
#  ** DO NOT SET $ErrorActionPreference = 'Stop' IN THIS SCRIPT **
# ---------------------------------------------------------------
#  v1.2.0 did, and it killed the script on a version notice.
#
#  In Windows PowerShell 5.1, ANY line a native .exe writes to stderr is
#  wrapped in an ErrorRecord (NativeCommandError) - and under 'Stop' that
#  is a TERMINATING error, whether or not the program actually failed.
#  eas-cli writes "eas-cli@X is now available" to stderr. expo-doctor
#  writes "env: load .env". Neither is a failure, and both would stop the
#  run dead with a wall of red that names node.exe rather than the real
#  cause.
#
#  Redirecting (2>$null) is NOT the fix - 5.1 still raises the record
#  before the redirection discards it. The fix is to stop treating a
#  program's chatter as an exception. Every external call here is checked
#  by its real exit code (Assert-Ok), which is the only honest signal a
#  native command gives, so nothing is lost by this.
#
#  Cmdlet failures are guarded explicitly instead - see Read-Or-Die.
$ErrorActionPreference = 'Continue'
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

# Without a global 'Stop', a missing file would otherwise return $null and
# fail later as something confusing. Fail where the problem actually is.
function Read-Or-Die([string]$file) {
    if (-not (Test-Path $file)) { throw "Cannot find $file - is this being run from the mobile project?" }
    return Get-Content $file -Raw
}

# ---- Who are we shipping? ----------------------------------------
$appJson = Read-Or-Die "$root\app.json" | ConvertFrom-Json
$nativeVersion = $appJson.expo.version
$versionTs = Read-Or-Die "$root\src\config\version.ts"
$badgeMatch = [regex]::Match($versionTs, "APP_VERSION\s*=\s*'([^']+)'")
if (-not $badgeMatch.Success) { throw "Could not read APP_VERSION out of src/config/version.ts." }
$badge = $badgeMatch.Groups[1].Value

Say "CYPHIX Medical - badge v$badge  |  native runtime v$nativeVersion"

# ---- What is actually INSTALLED? ---------------------------------
# Ask EAS what the newest finished production build is. This is the only
# authoritative answer, and both decisions below hang off it.
Say "Asking EAS what the newest finished production build is..."
# stderr is deliberately NOT redirected: 2>$null does not prevent 5.1 from
# raising the record, and eas-cli's notices are worth seeing anyway. Only
# stdout lands in $raw, which is where the JSON is.
$raw = npx eas-cli build:list --platform ios --profile production --status finished --limit 1 --json --non-interactive
Assert-Ok "eas build:list"

# eas-cli prints upgrade notices around its JSON, so start at the first
# line that actually opens an array rather than trusting the whole stream.
$lines = @($raw)
$start = ($lines | Select-String -Pattern '^\s*\[' | Select-Object -First 1).LineNumber
if (-not $start) { throw "Could not read a build list from EAS. Run 'npx eas-cli build:list' by hand." }
$builds = ($lines[($start - 1)..($lines.Count - 1)] -join "`n") | ConvertFrom-Json

if ($builds.Count -eq 0) {
    Write-Host "  No finished production build exists yet - nothing can receive an OTA." -ForegroundColor Yellow
    $installedRuntime = $null
}
else {
    $installedRuntime = $builds[0].runtimeVersion
    $builtFrom = $builds[0].gitCommitHash
    Write-Host "  Newest build: runtime $installedRuntime (built from $($builtFrom.Substring(0,7)))" -ForegroundColor DarkGray
}

# ---- Which path? -------------------------------------------------
#
# ** THE RULE, AND WHY IT IS NOT A GUESS FROM GIT **
#
# v1.1.0 decided this from `git diff HEAD~1 HEAD`, and that shipped the
# exact failure this script exists to prevent. The native change
# (expo-video + the app.json version bump) was TWO commits back; the last
# commit was a fix to this script itself, touching only scripts/. So it
# concluded "JS only" and published an OTA for runtime 0.30.0 to a fleet
# running runtime 0.27.0 - which reached nobody, silently.
#
# "The last commit" was never the right question. It is not the same as
# "what has not shipped yet", and it never was. The right question is the
# invariant itself (CLAUDE.md 5A.2):
#
#   An OTA is deliverable ONLY IF app.json's version equals the runtime
#   version of the build people are actually running.
#
# That is checked against EAS, not inferred - so no commit boundary, no
# rebase and no branch can fool it. The git check is kept underneath as a
# SECOND trigger (native files changed since the installed build's own
# commit), because the two catch different mistakes: the version gate
# catches a bumped app.json, the diff catches native code added without
# one.
if ($Path -eq 'auto') {
    $Path = 'ota'

    if ($installedRuntime -ne $nativeVersion) {
        Write-Host "  REBUILD REQUIRED: app.json says $nativeVersion, the installed build runs $installedRuntime." -ForegroundColor Yellow
        Write-Host "  An OTA published now would target a runtime nothing is running." -ForegroundColor Yellow
        $Path = 'rebuild'
    }
    elseif ($builtFrom) {
        $touched = git diff --name-only $builtFrom HEAD
        $native = $touched | Where-Object {
            $_ -match 'CYPHIX_MEDICAL_MOBILE/(modules/|app\.json|package\.json|eas\.json)'
        }
        if ($native) {
            Write-Host "  REBUILD REQUIRED: native surface changed since the installed build:" -ForegroundColor Yellow
            $native | ForEach-Object { Write-Host "    $_" -ForegroundColor Yellow }
            $Path = 'rebuild'
        }
    }
}

# A forced -Path ota is still not allowed to publish into a void. Refusing
# is the whole point: the failure it prevents is invisible on the phone.
if ($Path -eq 'ota' -and $installedRuntime -ne $nativeVersion) {
    throw "Refusing to publish an OTA: app.json is $nativeVersion but the installed build runs $installedRuntime. It would reach nobody. Run 'npm run ship:rebuild'."
}

# ---- Can the submit step run unattended? -------------------------
# Checked HERE, before a 40-minute build, not after one. `--auto-submit
# --non-interactive` needs `ascAppId` in eas.json's submit profile; without
# it eas-cli has no way to ask which App Store Connect app this is and
# gives up - which is a miserable thing to discover once the build is done.
$easJson = Read-Or-Die "$root\eas.json" | ConvertFrom-Json
$ascAppId = $easJson.submit.production.ascAppId
if ($Path -eq 'rebuild' -and -not $ascAppId) {
    Write-Host "  NOTE: eas.json has no submit.production.ascAppId." -ForegroundColor Yellow
    Write-Host "  The submit step will therefore ask you ONCE which App Store Connect" -ForegroundColor Yellow
    Write-Host "  app this is. Put the id in eas.json afterwards and it never asks again." -ForegroundColor Yellow
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
if ($DryRun) {
    Say "DRY RUN - everything above passed. Path would be: $($Path.ToUpper())" 'Green'
    Write-Host "  Nothing was published. Run without -DryRun to ship." -ForegroundColor DarkGray
    exit 0
}

if ($Path -eq 'rebuild') {
    Say "REBUILD path: compiling on Expo's Macs, then submitting to TestFlight." 'Green'
    Write-Host "  This takes ~30-40 minutes. It is safe to walk away." -ForegroundColor DarkGray
    Write-Host "  Runtime for this binary will be $nativeVersion." -ForegroundColor DarkGray

    # ** Build and submit are two commands, not `--auto-submit`. **
    # With --auto-submit the submission config is resolved by the same
    # invocation, so a missing ascAppId fails the WHOLE command - after the
    # build has been queued, reporting "build command failed" for something
    # that is not a build problem at all. Split, the build stands on its own
    # and the submit can be retried, or answered by hand, without rebuilding.
    npx eas-cli build --platform ios --profile production --non-interactive
    Assert-Ok "eas build"

    # Deliberately NOT --non-interactive: if eas.json carries an ascAppId this
    # runs unattended anyway, and if it does not, one question beats a failure.
    Say "Submitting to App Store Connect..."
    npx eas-cli submit --platform ios --latest
    Assert-Ok "eas submit"

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

# v1.4.0 - Build and submit are two commands instead of --auto-submit, and the
#          submit profile is checked BEFORE the build rather than after it.
#          `--auto-submit --non-interactive` needs eas.json to carry an
#          ascAppId; without one eas-cli cannot ask which App Store Connect app
#          this is, so it failed the whole invocation and reported "build
#          command failed" - for something that was not a build problem, after
#          the build had already been queued and was compiling fine. Split, the
#          build stands on its own and the submit is retryable without a
#          rebuild.
# v1.3.0 - Dropped $ErrorActionPreference = 'Stop', which killed the run on a
#          version notice. In 5.1 ANY stderr line from a native .exe becomes a
#          TERMINATING error under 'Stop' - so eas-cli's "a new version is
#          available" and expo-doctor's "env: load .env" both stopped the
#          script dead, blaming node.exe. 2>$null does not help; 5.1 raises the
#          record before the redirection discards it. Exit codes were already
#          being checked properly (Assert-Ok), so nothing is lost. ** This was
#          missed because it was verified by running the eas command ALONE,
#          where the preference is the default 'Continue' - the logic was
#          tested, the environment it runs in was not.
# v1.2.0 - The OTA/rebuild decision is CHECKED against EAS, not guessed from
#          git. v1.1.0 read `git diff HEAD~1 HEAD` and so shipped the exact
#          failure this script exists to prevent: the native change was two
#          commits back, the last commit touched only scripts/, and it
#          published an OTA for runtime 0.30.0 to a fleet running 0.27.0 -
#          delivered to nobody, with no error. "The last commit" is not "what
#          has not shipped yet". It now compares app.json's version with the
#          runtime of the newest finished production build, and REFUSES to
#          publish an OTA into a void even when the path is forced.
# v1.1.0 - Rewritten PURE ASCII. v1.0.0 could not be parsed at all on Windows
#          PowerShell 5.1: a .ps1 with no BOM is read as the ANSI codepage, so
#          the em dashes in its error strings became three characters each, one
#          of which closed the string early. Also switched every external-command
#          check from $? to $LASTEXITCODE, which is what actually survives a pipe.
# v1.0.0 - One command to ship; picks OTA vs rebuild from what the last commit
#          touched, and refuses to skip the checks that are cheaper than a
#          bad build.
