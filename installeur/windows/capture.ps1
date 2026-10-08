<#
.SYNOPSIS
  Recette visuelle de l'application Windows : lance l'app, attend le rendu reel
  dans la WebView2, capture la fenetre en PNG et detecte le « bandeau d'attente »
  residuel (bug de l'ecran de demarrage docke qui restait affiche : 120 px de
  navy vide au-dessus de la page).

  Controles :
   1. serveur + assets accessibles
   2. capture PNG du pixel sous la barre de titre
   3. pixels clairs (texte/boutons du topbar) presents dans les 100 premiers px
      -> non = bandeau residuel = ECHEC

.EXAMPLE
  powershell -NoProfile -ExecutionPolicy Bypass -File capture.ps1
  powershell -NoProfile -ExecutionPolicy Bypass -File capture.ps1 -Package "C:\...\dcc-sheet-portable"
#>
param(
  [string]$Package = (Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Definition) 'package'),
  [string]$Out = (Join-Path $env:TEMP 'dcc-capture.png'),
  [int]$WaitSec = 9
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
Add-Type -TypeDefinition @'
using System; using System.Runtime.InteropServices;
public static class Win32Cap {
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left; public int Top; public int Right; public int Bottom; }
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr hWnd, IntPtr after, int x, int y, int cx, int cy, uint flags);
  [DllImport("user32.dll")] public static extern bool PostMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);
}
'@

$proc = Start-Process (Join-Path $Package 'DccSheet.exe') -PassThru
$failed = $false
try {
  # 1. attendre serveur + assets
  $deadline = (Get-Date).AddSeconds(40); $loaded = $false
  while ((Get-Date) -lt $deadline) {
    try {
      $r = Invoke-WebRequest 'http://127.0.0.1:8089/dcc-sheet/script.js' -UseBasicParsing -TimeoutSec 2
      if ($r.StatusCode -eq 200) { $loaded = $true; break }
    } catch { Start-Sleep -Milliseconds 300 }
  }
  if (-not $loaded) { throw 'assets indisponibles' }
  Write-Host '  OK  serveur + script.js (200)'

  # 2. laisser la page se rendre reellement
  Start-Sleep -Seconds $WaitSec
  $proc.Refresh()
  $h = $proc.MainWindowHandle
  if ($h -eq [IntPtr]::Zero) { throw 'fenetre introuvable' }
  [Win32Cap]::SetForegroundWindow($h) | Out-Null
  # Topmost + position (0,0) : rien ne doit masquer la fenetre, et la zone
  # analysee est deterministe (l'app fait au minimum 900 px de large).
  # 0x0001 = SWP_NOSIZE : on deplace en (0,0) sans changer les dimensions
  [Win32Cap]::SetWindowPos($h, [IntPtr](-1), 0, 0, 0, 0, 0x0001) | Out-Null
  Start-Sleep -Milliseconds 500

  # 3. capture
  $rct = New-Object Win32Cap+RECT
  [Win32Cap]::GetWindowRect($h, [ref]$rct) | Out-Null
  $w = $rct.Right - $rct.Left; $ht = $rct.Bottom - $rct.Top
  $bmp = New-Object System.Drawing.Bitmap $w, $ht
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.CopyFromScreen($rct.Left, $rct.Top, 0, 0, (New-Object System.Drawing.Size $w, $ht))
  $g.Dispose()
  $bmp.Save($Out, [System.Drawing.Imaging.ImageFormat]::Png)

  # 4. analyse : sous la barre de titre (~30 px), les 100 px suivants doivent
  #    contenir le contenu du topbar (texte clair / boutons). Un bandeau d'attente
  #    residuel = 120 px de navy uniforme -> zero pixel clair.
  #    Echantillonnage limite a x<600 (zone garantie de la fenetre d'app) pour
  #    ne pas compter un eventuel programme qui passait devant a droite.
  $bright = 0
  for ($y = 35; $y -lt 115 -and $y -lt $ht; $y += 2) {
    for ($x = 5; $x -lt [Math]::Min(600, $w); $x += 2) {
      $c = $bmp.GetPixel($x, $y)
      if (($c.R + $c.G + $c.B) / 3 -gt 95) { $bright++ }
    }
  }
  $bmp.Dispose()
  Write-Host "  capture : $Out ($w x $ht)"
  Write-Host "  pixels clairs dans la bande x<600, y=35..115 : $bright"

  if ($bright -lt 100) {
    Write-Host "  ECHEC  bandeau d'attente residuel probable (zone vide au-dessus de la page)" -ForegroundColor Red
    $failed = $true
  } else {
    Write-Host "  OK  topbar rendue en haut de fenetre (pas de bandeau residuel)" -ForegroundColor Green
  }
} finally {
  if ($proc -and -not $proc.HasExited) {
    $proc.Refresh()
    if ($proc.MainWindowHandle -ne [IntPtr]::Zero) {
      [Win32Cap]::PostMessage($proc.MainWindowHandle, 0x0010, [IntPtr]::Zero, [IntPtr]::Zero) | Out-Null
    }
    if (-not $proc.WaitForExit(8000)) { $proc.Kill() }
  }
}
if ($failed) { exit 1 } else { exit 0 }
