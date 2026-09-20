# ==================================================================
#  make-icons.ps1 - build the whole app icon set from ONE square artwork.
#
#      npm run icons -- .\assets\brand\app-icon-source.png
#      powershell -ExecutionPolicy Bypass -File scripts\make-icons.ps1 <art.png>
#
#  ** PURE ASCII ON PURPOSE ** - same reason as ship.ps1: Windows PowerShell
#  5.1 reads a BOM-less .ps1 as the ANSI codepage, and one em dash inside a
#  string once stopped a script in this repo from even PARSING.
#
#  ---- WHY THIS EXISTS ----
#  Four of the five files are scaled copies and could be made by hand. The
#  MONOCHROME one cannot: Android 13+ throws that layer's colour away and
#  tints it flat, so it has to be a drawn silhouette, and a threshold of the
#  artwork gives a ragged blob. Without this script nobody can regenerate or
#  nudge the themed icon - so it lives in the repo, not in a scratch folder.
#
#  Outputs (all into assets/):
#    icon.png                     1024, NO ALPHA - the App Store rejects an
#                                 alpha channel on the app icon
#    android-icon-foreground.png  1024, the adaptive foreground (full bleed)
#    android-icon-background.png  1024, the same colour field with the subject
#                                 averaged out of it
#    android-icon-monochrome.png  1024, drawn silhouette on transparent
#    favicon.png                    96
#
#  ---- THE ADAPTIVE ICON GEOMETRY, ONCE ----
#  An Android adaptive layer is 108dp and a launcher may crop anything outside
#  the middle 72dp - so 66.7 % of the frame is all that is guaranteed to
#  survive, and a circular mask is the tightest of them. The artwork's heart
#  sits inside ~54 % of the frame, so it survives every mask; only the
#  horizontal pulse line runs off the edge, which it does in the artwork too.
#  Check any new artwork against that number before trusting this script.
# ==================================================================
param(
    # NOT $Src/$Out: PowerShell variable names are case-INSENSITIVE, so a later
    # `$src = [Bitmap]...` would assign to a [string] parameter of the same name
    # and silently coerce the bitmap to the text "System.Drawing.Bitmap".
    [Parameter(Mandatory = $true)][string]$SourcePath,
    [string]$OutDir = '',
    # Skip the lossless re-encode (it needs pngjs, a transitive dependency).
    [switch]$NoRecompress
)

Add-Type -AssemblyName System.Drawing
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
if (-not $OutDir) { $OutDir = Join-Path $root 'assets' }

$art = [System.Drawing.Bitmap]::FromFile((Resolve-Path $SourcePath).Path)
if ($art.Width -ne $art.Height) { throw "The artwork must be square; this is $($art.Width) x $($art.Height)." }
Write-Host ("source {0} x {1}" -f $art.Width, $art.Height)

function New-Canvas([int]$size, [bool]$opaque) {
    $fmt = if ($opaque) { [System.Drawing.Imaging.PixelFormat]::Format24bppRgb }
           else { [System.Drawing.Imaging.PixelFormat]::Format32bppArgb }
    New-Object System.Drawing.Bitmap $size, $size, $fmt
}

function New-Gfx($bmp) {
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode  = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode      = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.PixelOffsetMode    = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    return $g
}

# Bicubic resampling reads past the frame edge unless the source is told to
# mirror there; without this every scaled copy picks up a faint light rim.
function Draw-Scaled($g, $img, [int]$size) {
    $attr = New-Object System.Drawing.Imaging.ImageAttributes
    $attr.SetWrapMode([System.Drawing.Drawing2D.WrapMode]::TileFlipXY)
    $rect = New-Object System.Drawing.Rectangle 0, 0, $size, $size
    $g.DrawImage($img, $rect, 0, 0, $img.Width, $img.Height, [System.Drawing.GraphicsUnit]::Pixel, $attr)
    $attr.Dispose()
}

function Save-Square([int]$size, [bool]$opaque, [string]$name) {
    $bmp = New-Canvas $size $opaque
    $g = New-Gfx $bmp
    Draw-Scaled $g $art $size
    $g.Dispose()
    $bmp.Save((Join-Path $OutDir $name), [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host ("  {0,-30} {1} px  {2}" -f $name, $size, $(if ($opaque) { 'opaque (no alpha)' } else { 'RGBA' }))
}

# ---- 1. the scaled copies ----------------------------------------------------
Save-Square 1024 $true  'icon.png'
Save-Square 1024 $false 'android-icon-foreground.png'
Save-Square 96   $false 'favicon.png'

# ---- 2. adaptive background: the colour field, subject removed ----------------
# Downscale to 6x6 - which averages the subject away entirely - then bicubic
# back up. It sits behind an opaque foreground and only ever shows as launcher
# parallax, but the default there is WHITE, and white is not in this palette.
$tiny = New-Object System.Drawing.Bitmap 6, 6
$gt = New-Gfx $tiny
Draw-Scaled $gt $art 6
$gt.Dispose()
$bg = New-Canvas 1024 $false
$gb = New-Gfx $bg
Draw-Scaled $gb $tiny 1024
$gb.Dispose()
$bg.Save((Join-Path $OutDir 'android-icon-background.png'), [System.Drawing.Imaging.ImageFormat]::Png)
Write-Host "  android-icon-background.png    1024 px  (subject averaged out)"

# The single colour any fallback path would use - sampled, never guessed. Put
# this in app.json as android.adaptiveIcon.backgroundColor.
$r = 0; $g2 = 0; $b2 = 0; $n = 0
for ($y = 8; $y -lt 1024; $y += 32) { for ($x = 8; $x -lt 1024; $x += 32) {
    $p = $bg.GetPixel($x, $y); $r += $p.R; $g2 += $p.G; $b2 += $p.B; $n++ } }
Write-Host ("  -> mean colour #{0:X2}{1:X2}{2:X2}  (app.json adaptiveIcon.backgroundColor)" -f [int]($r / $n), [int]($g2 / $n), [int]($b2 / $n))
$bg.Dispose(); $tiny.Dispose()

# ---- 3. monochrome: a DRAWN silhouette ---------------------------------------
#
#  ** v2.0.0 - THIS USED TO BE A HEART, AND IT CANNOT STAY ONE. **
#  The v0.67.0 artwork was a heart with a pulse trace through it, so the
#  themed layer was that shape with the trace punched out. The artwork is
#  now a six-lead ECG, and leaving the heart here would put a DIFFERENT
#  MARK on an Android 13+ themed home screen than the one in the app
#  drawer - a brand that disagrees with itself depending on a display
#  setting. Nobody would have caught it from Windows.
#
#  ** AND IT IS THREE TRACES, NOT SIX. **
#  Android tints this layer flat and throws its colour away, so the only
#  thing carrying meaning is stroke WIDTH. Six rows inside the 66.7 % safe
#  circle leaves ~114 px of pitch at 1024, which is ~12 dp on the 108 dp
#  layer and roughly 5 dp once a launcher draws it at 48 dp - hairlines
#  that grey out into a smudge, which is exactly the failure the full
#  artwork has at 60 px and the reason it must not be repeated in the one
#  layer we actually draw ourselves. Three rows at 40 px of stroke survive
#  the same reduction and still say "more than one lead".
#
#  The beat is the artwork's own rhythm - P, a small Q, the tall R, a deep
#  S, a T bump - stated as fractions of the ROW PITCH so the proportions
#  hold at any size.
$Size = 1024
# ** THE SAFE ZONE IS A CIRCLE, NOT A SQUARE. ** This script's own header
# says "the middle 72dp", which reads as a square - and fitting the traces
# to that square then rendering them under Pixel's circular mask clipped
# both ends of the top and bottom rows. A box only survives every mask if
# its DIAGONAL fits: w^2 + h^2 <= (Size * 0.667)^2. Same correction as
# make-adaptive-foreground.js v1.1.0, for the same reason.
$safeD = $Size * 0.667                     # the safe DIAMETER
$rows = 3
$beats = 2
$ratio = 1.25                              # wider than tall: an ECG is horizontal
$stroke = $Size * 0.033                    # ~34 px

# ** THE BLOCK IS SOLVED FOR, NOT CHOSEN. **
# A first pass picked a block that fitted the safe circle and the CHECK
# below still failed at 406 px against a 342 px radius - because what has
# to fit is not the block, it is the DRAWN EXTENT: the block plus the R
# spike standing out of the top row, plus half a stroke all round. Fitting
# the block and hoping is how the square-vs-circle mistake gets made twice.
# So the extent is written down and the height falls out of it:
#   halfW = ratio*h/2 + stroke/2
#   halfH = h/2 + (h/rows)*spike + stroke/2
#   halfW^2 + halfH^2 = (safeD/2)^2
$spike = 0.42                              # R amplitude, in pitches (see $beat)
$ea = $ratio / 2
$eb = 0.5 + $spike / $rows
$qa = $ea * $ea + $eb * $eb
$qb = $stroke * ($ea + $eb)
$qc = $stroke * $stroke / 2 - ($safeD / 2) * ($safeD / 2)
$blockH = (-$qb + [Math]::Sqrt($qb * $qb - 4 * $qa * $qc)) / (2 * $qa)
$blockW = $blockH * $ratio
$safeX = ($Size - $blockW) / 2
$pitch = $blockH / $rows                   # vertical distance between traces
$beatW = $blockW / $beats

# x fraction of a beat, y fraction of the ROW PITCH (screen y grows down).
$beat = @(
    @(0.00,  0.00), @(0.16,  0.00), @(0.22, -0.10), @(0.28, 0.00),
    @(0.40,  0.00), @(0.44,  0.06), @(0.50, -0.42), @(0.56, 0.18),
    @(0.60,  0.00), @(0.72,  0.00), @(0.78, -0.14), @(0.86, 0.00),
    @(1.00,  0.00)
)

$mono = New-Canvas $Size $false
$gm = New-Gfx $mono
$pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::White), $stroke
$pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
$pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
$pen.EndCap   = [System.Drawing.Drawing2D.LineCap]::Round

$baselines = @()
for ($r = 0; $r -lt $rows; $r++) {
    # Centre of each band, so the outer two keep half a pitch of margin
    # inside the safe zone rather than sitting on its edge.
    $by = ($Size - $blockH) / 2 + $pitch * ($r + 0.5)
    $baselines += $by
    $pts = @()
    for ($b = 0; $b -lt $beats; $b++) {
        foreach ($p in $beat) {
            # The first point of a later beat repeats the last of the one
            # before it; harmless on a polyline and keeps the loop simple.
            $x = $safeX + $beatW * ($b + $p[0])
            $y = $by + $pitch * $p[1]
            $pts += New-Object System.Drawing.PointF ([float]$x, [float]$y)
        }
    }
    $gm.DrawLines($pen, [System.Drawing.PointF[]]$pts)
}
$gm.Dispose()

# ---- the check that makes this more than an opinion ----
# Down a column that crosses every trace on its FLAT baseline (5 % into the
# first beat, before the P wave), the shape must read as exactly $rows runs
# of opaque pixels, each about one stroke thick. Fewer runs means two traces
# have merged; a thin run means the stroke has been scaled away. Both are
# invisible at 1024 px and fatal at 48 dp, which is the whole reason this is
# measured rather than eyeballed.
$col = [int][Math]::Round($safeX + $beatW * 0.05)
$runs = @(); $inRun = $false; $runStart = 0
for ($y = 0; $y -lt $Size; $y++) {
    $isOpaque = $mono.GetPixel($col, $y).A -gt 128
    if ($isOpaque -and -not $inRun) { $inRun = $true; $runStart = $y }
    elseif (-not $isOpaque -and $inRun) { $inRun = $false; $runs += , @($runStart, ($y - $runStart)) }
}
if ($inRun) { $runs += , @($runStart, ($Size - $runStart)) }
$thinnest = if ($runs.Count -gt 0) { ($runs | ForEach-Object { $_[1] } | Measure-Object -Minimum).Minimum } else { 0 }

# And the SHAPE has to fit the safe circle, not just the safe square - the
# thing that was got wrong the first time. Measured from the drawn extent,
# including the stroke's own width and the R spike's reach.
$halfW = $blockW / 2 + $stroke / 2
$halfH = $blockH / 2 + $pitch * $spike + $stroke / 2
$corner = [Math]::Sqrt($halfW * $halfW + $halfH * $halfH)

$mono.Save((Join-Path $OutDir 'android-icon-monochrome.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$mono.Dispose(); $pen.Dispose(); $art.Dispose()

if ($runs.Count -ne $rows -or $thinnest -lt ($stroke * 0.8)) {
    Write-Host ("  android-icon-monochrome.png    1024 px  FAIL - expected $rows runs of ~{0:N0} px, got {1} runs, thinnest {2:N0} px" -f $stroke, $runs.Count, $thinnest) -ForegroundColor Red
    exit 1
}
if ($corner -gt ($safeD / 2)) {
    Write-Host ("  android-icon-monochrome.png    1024 px  FAIL - corner {0:N0} px from centre, past the {1:N0} px safe radius; a circular mask would clip it" -f $corner, ($safeD / 2)) -ForegroundColor Red
    exit 1
}
Write-Host ("  android-icon-monochrome.png    1024 px  drawn; $rows traces, thinnest run {0:N0} px, corner {1:N0} px vs a {2:N0} px safe radius" -f $thinnest, $corner, ($safeD / 2))


# ---- 4. lossless re-encode ---------------------------------------------------
# System.Drawing's PNG encoder takes no compression settings and picks a poor
# filter - a 1024 px gradient came out LARGER than the 1254 px source it was
# scaled down from. This only rewrites the container; pixels are untouched.
if (-not $NoRecompress) {
    $js = Join-Path $PSScriptRoot 'recompress-png.js'
    if (Test-Path $js) {
        Push-Location $root
        node $js (Join-Path $OutDir 'icon.png') (Join-Path $OutDir 'android-icon-foreground.png') `
                 (Join-Path $OutDir 'android-icon-background.png') (Join-Path $OutDir 'favicon.png')
        Pop-Location
    }
}
Write-Host "done"

# v1.0.0 - Builds the icon set from one square artwork, including the Android 13
#          themed icon, which is DRAWN (the launcher discards its colour) and so
#          cannot be recovered from the artwork if this script is lost.
