# make-android-icons.ps1 - genere les icones launcher des 2 APK Android
# ---------------------------------------------------------------------
# Meme dessin que favicon.svg / DccSheet.Desktop/app.ico (make-icon.ps1) :
#   fond #1a1a2e, deux epees #c0392b, des #f2bd3d, texte DCC.
#
# Produit, pour installeur/android ET installeur/android-content :
#   app/src/main/res/mipmap-{mdpi,hdpi,xhdpi,xxhdpi,xxxhdpi}/ic_launcher.png
#       -> repli legacy (48/72/96/144/192 px, plein cadre)
#   app/src/main/res/mipmap-{...}/ic_launcher_foreground.png
#       -> calque avant de l'icone adaptative (art seul, zone sure 66dp)
#   app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml
#       -> icone adaptative (API 26+ : minSdk de tous nos APK)
#   app/src/main/res/values/ic_launcher_colors.xml
#       -> fond plein #1a1a2e (pleine etendue, exigence maskable)
#
# Usage : powershell -NoProfile -ExecutionPolicy Bypass -File make-android-icons.ps1
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Definition))

# Dessin du favicon (echelle $s, origine ($ox,$oy), coordonnees en unites 32).
#   $withBg    : fond arrondi inclus (PNG legacy) ou transparent (calque avant)
#   $fullBleed : fond carre plein cadre (mieux sous masque launcher)
function Draw-DccIcon([int]$canvas, [double]$s, [double]$ox, [double]$oy,
                      [bool]$withBg, [bool]$fullBleed) {
  $bmp = New-Object -TypeName System.Drawing.Bitmap -ArgumentList @($canvas, $canvas, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g   = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode     = 'AntiAlias'
  $g.TextRenderingHint = 'AntiAlias'

  $bg    = [System.Drawing.Color]::FromArgb(255, 26, 26, 46)      # #1a1a2e
  $red   = [System.Drawing.Color]::FromArgb(255, 192, 57, 43)     # #c0392b
  $gold  = [System.Drawing.Color]::FromArgb(255, 242, 189, 61)    # #f2bd3d
  $gold9 = [System.Drawing.Color]::FromArgb(230, 242, 189, 61)    # opacite 0.9

  if ($withBg) {
    if ($fullBleed) {
      $g.FillRectangle((New-Object System.Drawing.SolidBrush $bg), 0, 0, $canvas, $canvas)
    } else {
      # fond arrondi (rx=6 en unites 32), comme app.ico
      $w = $canvas - 1
      $r = 6 * $s
      $path = New-Object System.Drawing.Drawing2D.GraphicsPath
      $path.AddArc(0, 0, 2 * $r, 2 * $r, 180, 90)
      $path.AddArc($w - 2 * $r, 0, 2 * $r, 2 * $r, 270, 90)
      $path.AddArc($w - 2 * $r, $w - 2 * $r, 2 * $r, 2 * $r, 0, 90)
      $path.AddArc(0, $w - 2 * $r, 2 * $r, 2 * $r, 90, 90)
      $path.CloseFigure()
      $g.FillPath((New-Object System.Drawing.SolidBrush $bg), $path)
    }
  }

  $cx = $ox + 16 * $s   # translate(16,14)
  $cy = $oy + 14 * $s

  # --- epees (round cap) ---
  $pRed = New-Object -TypeName System.Drawing.Pen -ArgumentList @($red, (2.5 * $s))
  $pRed.StartCap = $pRed.EndCap = 'Round'
  $pGold = New-Object -TypeName System.Drawing.Pen -ArgumentList @($gold, (1.5 * $s))
  $pGold.StartCap = $pGold.EndCap = 'Round'

  $g.DrawLine($pRed,  ($cx - 8 * $s), ($cy - 8 * $s), ($cx + 8 * $s), ($cy + 8 * $s))  # epee 1
  $g.DrawLine($pGold, ($cx - 6 * $s), ($cy - 6 * $s), ($cx - 4 * $s), ($cy - 4 * $s))  # pommeau 1
  $g.DrawLine($pRed,  ($cx + 8 * $s), ($cy - 8 * $s), ($cx - 8 * $s), ($cy + 8 * $s))  # epee 2
  $g.DrawLine($pGold, ($cx + 6 * $s), ($cy - 6 * $s), ($cx + 4 * $s), ($cy - 4 * $s))  # pommeau 2

  # --- des (rect rx=1.5, opacite 0.9) ---
  $d  = 4 * $s
  $dr = 1.5 * $s
  $dp = New-Object System.Drawing.Drawing2D.GraphicsPath
  $dp.AddArc($cx - $d, $cy - $d, 2 * $dr, 2 * $dr, 180, 90)
  $dp.AddArc($cx + $d - 2 * $dr, $cy - $d, 2 * $dr, 2 * $dr, 270, 90)
  $dp.AddArc($cx + $d - 2 * $dr, $cy + $d - 2 * $dr, 2 * $dr, 2 * $dr, 0, 90)
  $dp.AddArc($cx - $d, $cy + $d - 2 * $dr, 2 * $dr, 2 * $dr, 90, 90)
  $dp.CloseFigure()
  $g.FillPath((New-Object System.Drawing.SolidBrush $gold9), $dp)

  # --- 5 pions ---
  $pip = New-Object System.Drawing.SolidBrush $bg
  $pr  = 1.0 * $s
  foreach ($pt in @(@(-1.5, -1.5), @(1.5, 1.5), @(-1.5, 1.5), @(1.5, -1.5), @(0, 0))) {
    $x = $cx + $pt[0] * $s - $pr
    $y = $cy + $pt[1] * $s - $pr
    $g.FillEllipse($pip, $x, $y, 2 * $pr, 2 * $pr)
  }

  # --- texte DCC (y=30, taille 6, bold, ancre centree) ---
  $font = New-Object System.Drawing.Font 'Arial', (6 * $s), 'Bold', 'Pixel'
  $fmt  = New-Object System.Drawing.StringFormat
  $fmt.Alignment = $fmt.LineAlignment = 'Center'
  $g.DrawString('DCC', $font, (New-Object System.Drawing.SolidBrush $gold),
                (New-Object System.Drawing.RectangleF $ox, ($oy + 23.5 * $s), (32 * $s), (7 * $s)), $fmt)

  $g.Dispose()
  return $bmp
}

function Save-Png([System.Drawing.Bitmap]$bmp, [string]$path) {
  $dir = Split-Path -Parent $path
  if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
}

# densite -> multiplicateur (dp -> px)
$densities = [ordered]@{ 'mdpi' = 1.0; 'hdpi' = 1.5; 'xhdpi' = 2.0; 'xxhdpi' = 3.0; 'xxxhdpi' = 4.0 }
$projects  = @('android', 'android-content')
$nb = 0

foreach ($proj in $projects) {
  $res = Join-Path $root ("installeur\" + $proj + "\app\src\main\res")

  foreach ($d in $densities.Keys) {
    $m = $densities[$d]
    # legacy plein cadre (app.ico sans les coins arrondis : mieux sous masque)
    $legacy = [int][math]::Round(48 * $m)
    $s = $legacy / 32.0
    Save-Png (Draw-DccIcon $legacy $s 0 0 $true $true) (Join-Path $res "mipmap-$d\ic_launcher.png")
    $nb++

    # calque avant adaptatif : art seul, boite de 66dp centree sur 108dp
    $fg = [int][math]::Round(108 * $m)
    $box = 66.0 / 108.0
    $s2 = ($fg * $box) / 32.0
    $off = ($fg - 66.0 * $m) / 2.0
    Save-Png (Draw-DccIcon $fg $s2 $off $off $false $false) (Join-Path $res "mipmap-$d\ic_launcher_foreground.png")
    $nb++
  }

  # icone adaptative (API 26+)
  $xml = @"
<?xml version="1.0" encoding="utf-8"?>
<!-- Icone adaptative : meme art que favicon.svg / app.ico (make-android-icons.ps1) -->
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background" />
    <foreground android:drawable="@mipmap/ic_launcher_foreground" />
</adaptive-icon>
"@
  $anydpi = Join-Path $res 'mipmap-anydpi-v26'
  if (-not (Test-Path $anydpi)) { New-Item -ItemType Directory -Force -Path $anydpi | Out-Null }
  [System.IO.File]::WriteAllText((Join-Path $anydpi 'ic_launcher.xml'), $xml)
  $nb++

  $colors = @"
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <!-- Fond de l'icone adaptative (couleur du favicon) -->
    <color name="ic_launcher_background">#1a1a2e</color>
</resources>
"@
  $values = Join-Path $res 'values'
  if (-not (Test-Path $values)) { New-Item -ItemType Directory -Force -Path $values | Out-Null }
  [System.IO.File]::WriteAllText((Join-Path $values 'ic_launcher_colors.xml'), $colors)
  $nb++

  Write-Host ("{0} : res genere ({1} mipmap-{2}/...)" -f $proj, $densities.Count, 'mdpi')
}

Write-Host ("{0} fichiers d'icone ecrits sur les 2 projets" -f $nb)
