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
$Size = 1024
# The classic parametric heart, sampled as a polygon:
#   x = 16 sin^3 t ,  y = 13 cos t - 5 cos 2t - 2 cos 3t - cos 4t
# Sampled rather than drawn with beziers because GraphicsPath.GetBounds()
# bounds a bezier's CONTROL POINTS, not its curve - scaling off that made the
# first version narrow and undersized.
$poly = @()
for ($i = 0; $i -lt 240; $i++) {
    $t = 2 * [Math]::PI * $i / 240
    $x = 16 * [Math]::Pow([Math]::Sin($t), 3)
    $y = 13 * [Math]::Cos($t) - 5 * [Math]::Cos(2 * $t) - 2 * [Math]::Cos(3 * $t) - [Math]::Cos(4 * $t)
    $poly += New-Object System.Drawing.PointF ([float]$x, [float](-$y))   # screen y grows down
}
$heart = New-Object System.Drawing.Drawing2D.GraphicsPath
$heart.AddPolygon([System.Drawing.PointF[]]$poly)

# 58 % of the canvas: inside the 66.7 % safe zone with margin to spare.
$hbounds = $heart.GetBounds()
$scale = ($Size * 0.58) / [Math]::Max($hbounds.Width, $hbounds.Height)
$m = New-Object System.Drawing.Drawing2D.Matrix
$m.Translate(($Size / 2), ($Size / 2))
$m.Scale($scale, $scale)
$m.Translate(-($hbounds.X + $hbounds.Width / 2), -($hbounds.Y + $hbounds.Height / 2))
$heart.Transform($m)
$hb = $heart.GetBounds()

$mono = New-Canvas $Size $false
$gm = New-Gfx $mono
$gm.FillPath([System.Drawing.Brushes]::White, $heart)

# The trace: flat, a small dip and bump, the tall R, the deep S, a recovery,
# flat. Amplitudes are fractions of the HEART's box, never the canvas, so the
# rhythm holds its proportions at any scale.
# ** The R spike is capped at 0.18 h and the baseline sits BELOW centre. ** The
# heart's own notch dips about 0.18 h from the top; a taller spike reaches it,
# the two gaps merge, and the lobes read as two blobs. The bridge of flesh left
# between them is MEASURED at the end of this script, not eyeballed.
$cx = $hb.X + $hb.Width / 2
$cy = $hb.Y + $hb.Height * 0.56
$w = $hb.Width; $h = $hb.Height
$trace = @(
    @(-0.75, 0.00), @(-0.30, 0.00), @(-0.24, 0.06), @(-0.18, -0.045), @(-0.13, 0.00),
    @(-0.06, 0.00), @( 0.00, -0.18), @( 0.07, 0.18), @( 0.12, -0.03), @( 0.17, 0.00),
    @( 0.75, 0.00)
) | ForEach-Object { New-Object System.Drawing.PointF (($cx + $_[0] * $w), ($cy + $_[1] * $h)) }

# A transparent pen under SourceCopy writes its alpha instead of blending it,
# so it ERASES. Outside the heart the canvas is already transparent, so the
# trace needs no clipping - it can only show where it crosses the shape.
# Antialiasing is OFF for the cut: under SourceCopy a blended edge writes
# partial alpha and leaves a ghost rim. At 1024 px the aliased edge is far
# under one pixel by the time a launcher scales it to 108dp.
$pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::Transparent), ($w * 0.075)
$pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
$pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
$pen.EndCap   = [System.Drawing.Drawing2D.LineCap]::Round
$gm.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::None
$gm.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
$gm.DrawLines($pen, [System.Drawing.PointF[]]$trace)
$gm.Dispose()

# Down the centre column the shape must read: gap, FLESH, gap (the R spike),
# flesh. A missing or thin first run means the spike has severed the lobes.
$col = [int][Math]::Round($cx)
$runs = @(); $inRun = $false; $runStart = 0
for ($y = 0; $y -lt $Size; $y++) {
    $isOpaque = $mono.GetPixel($col, $y).A -gt 128
    if ($isOpaque -and -not $inRun) { $inRun = $true; $runStart = $y }
    elseif (-not $isOpaque -and $inRun) { $inRun = $false; $runs += , @($runStart, ($y - $runStart)) }
}
if ($inRun) { $runs += , @($runStart, ($Size - $runStart)) }
$bridge = if ($runs.Count -ge 2) { $runs[0][1] } else { 0 }
$mono.Save((Join-Path $OutDir 'android-icon-monochrome.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$mono.Dispose(); $heart.Dispose(); $pen.Dispose(); $art.Dispose()

if ($runs.Count -lt 2 -or $bridge -lt ($h * 0.09)) {
    Write-Host ("  android-icon-monochrome.png    1024 px  FAIL - the notch and the R spike merged (bridge {0:N0} px); lower the spike" -f $bridge) -ForegroundColor Red
    exit 1
}
Write-Host ("  android-icon-monochrome.png    1024 px  drawn; lobes joined by {0:N0} px ({1:P0} of heart height)" -f $bridge, ($bridge / $h))

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
