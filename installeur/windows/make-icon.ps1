# make-icon.ps1 — fabrique DccSheet.Desktop\app.ico a partir des formes du favicon.svg
# (rect arrondi #1a1a2e, deux epees #c0392b, des #f2bd3d, texte DCC).
# Usage : powershell -NoProfile -ExecutionPolicy Bypass -File make-icon.ps1
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$here = Split-Path -Parent $MyInvocation.MyCommand.Definition
$out  = Join-Path $here 'DccSheet.Desktop\app.ico'

function New-IconsBitmap([int]$size) {
  $s   = $size / 32.0
  $bmp = New-Object -TypeName System.Drawing.Bitmap -ArgumentList @($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g   = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode     = 'AntiAlias'
  $g.TextRenderingHint = 'AntiAlias'

  $bg    = [System.Drawing.Color]::FromArgb(255, 26, 26, 46)      # #1a1a2e
  $red   = [System.Drawing.Color]::FromArgb(255, 192, 57, 43)     # #c0392b
  $gold  = [System.Drawing.Color]::FromArgb(255, 242, 189, 61)    # #f2bd3d
  $gold9 = [System.Drawing.Color]::FromArgb(230, 242, 189, 61)    # opacite 0.9

  # --- fond arrondi (rx=6) ---
  $w = $size - 1
  $r = 6 * $s
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $path.AddArc(0, 0, 2 * $r, 2 * $r, 180, 90)
  $path.AddArc($w - 2 * $r, 0, 2 * $r, 2 * $r, 270, 90)
  $path.AddArc($w - 2 * $r, $w - 2 * $r, 2 * $r, 2 * $r, 0, 90)
  $path.AddArc(0, $w - 2 * $r, 2 * $r, 2 * $r, 90, 90)
  $path.CloseFigure()
  $g.FillPath((New-Object System.Drawing.SolidBrush $bg), $path)

  $cx = 16 * $s   # translate(16,14)
  $cy = 14 * $s

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
                (New-Object System.Drawing.RectangleF 0, (23.5 * $s), $size, (7 * $s)), $fmt)

  $g.Dispose()
  return $bmp
}

# --- rendu des tailles + PNG ---
$sizes = @(16, 24, 32, 48, 64, 256)
$pngs  = @()
foreach ($sz in $sizes) {
  $bmp = New-IconsBitmap $sz
  $ms  = New-Object System.IO.MemoryStream
  $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  $pngs += , $ms.ToArray()
  $ms.Dispose()
}

# --- assemblage ICO (entrees PNG, valables Windows 10/11) ---
$ms = New-Object System.IO.MemoryStream
$bw = New-Object System.IO.BinaryWriter $ms
$bw.Write([uint16]0); $bw.Write([uint16]1); $bw.Write([uint16]$sizes.Count)
$offset = 6 + 16 * $sizes.Count
for ($i = 0; $i -lt $sizes.Count; $i++) {
  $sz = $sizes[$i]
  $bw.Write([byte]($(if ($sz -ge 256) { 0 } else { $sz })))
  $bw.Write([byte]($(if ($sz -ge 256) { 0 } else { $sz })))
  $bw.Write([byte]0); $bw.Write([byte]0)
  $bw.Write([uint16]1); $bw.Write([uint16]32)
  $bw.Write([uint32]$pngs[$i].Length)
  $bw.Write([uint32]$offset)
  $offset += $pngs[$i].Length
}
foreach ($p in $pngs) { $bw.Write($p) }
[System.IO.File]::WriteAllBytes($out, $ms.ToArray())
$bw.Dispose()

Write-Host ("Icone generee : {0} ({1:N1} Ko)" -f $out, ((Get-Item $out).Length / 1KB))
