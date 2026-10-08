<#
.SYNOPSIS
  Recette de l'application Windows (version portable) :

    1. lance package\DccSheet.exe
    2. attend que http://127.0.0.1:8089/dcc-sheet/ reponde (20 s max)
    3. verifie que dcc-spells-reader est egalement servi
    4. ferme la fenetre proprement (WM_CLOSE)
    5. verifie que php.exe est bien mort et que le port est libre

  Chaque controle est bloquant : en fin de script, code retour 0 = recette OK.

.EXAMPLE
  powershell -NoProfile -ExecutionPolicy Bypass -File recette.ps1
#>
param(
  [string]$Package = (Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Definition) 'package'),
  [int]$TimeoutSec = 30
)

$ErrorActionPreference = 'Stop'
$fails = @()
$passed = 0
function Ok([string]$m)   { $script:passed++; Write-Host "  OK  $m" -ForegroundColor Green }
function Bad([string]$m)  { Write-Host "  ECHEC  $m" -ForegroundColor Red; $script:fails += $m }

$exe = Join-Path $Package 'DccSheet.exe'
if (-not (Test-Path $exe)) { Write-Host "ECHEC : $exe introuvable (lancez d'abord build.ps1)" -ForegroundColor Red; exit 1 }

# php.exe du serveur DCC Sheet uniquement (port 8089) :
# un serveur de dev distant (ex. -S localhost:8000) n'a rien a faire dans la recette
function Get-DccPhp {
  @(Get-CimInstance Win32_Process -Filter "Name='php.exe'" |
    Where-Object { $_.CommandLine -match '8089' })
}

# 0. aucun php de session precedente sur le port 8089
if ((Get-DccPhp).Count -gt 0) {
  Bad "un php.exe DCC Sheet (port 8089) tourne deja avant le test (session precedente ?)"
}

Write-Host "`n1. Lancement de DccSheet.exe" -ForegroundColor Cyan
# Position de depart dans le journal PHP : l'etape 6 lit la suite (fetchs de la WebView2)
$logFile = Join-Path $env:LOCALAPPDATA 'DCCSheet\php.log'
$logStart = if (Test-Path $logFile) { (Get-Content $logFile).Count } else { 0 }
$proc = Start-Process -FilePath $exe -PassThru

Write-Host "2. Attente du serveur (http://127.0.0.1:8089/dcc-sheet/)" -ForegroundColor Cyan
$deadline = (Get-Date).AddSeconds($TimeoutSec)
$ok = $false
while ((Get-Date) -lt $deadline) {
  try {
    $r = Invoke-WebRequest 'http://127.0.0.1:8089/dcc-sheet/' -UseBasicParsing -TimeoutSec 2
    if ($r.StatusCode -eq 200 -and $r.Content -match 'DCC') { $ok = $true; break }
  } catch { Start-Sleep -Milliseconds 200 }
}
if ($ok) { Ok "serveur repond (200, contenu DCC) en moins de $TimeoutSec s" }
else { Bad "serveur ne repond pas dans les $TimeoutSec s" }

if ($ok) {
  # 2b. Assets statiques : regression du bug « URL sans slash » (index servi en
  #     200 sur /dcc-sheet -> base "/" -> tous les refs relatives en 404)
  Write-Host "2b. Assets statiques (css/js/svg)" -ForegroundColor Cyan
  foreach ($asset in @('style.css', 'script.js', 'dcc-icons.js', 'favicon.svg')) {
    try {
      $a = Invoke-WebRequest "http://127.0.0.1:8089/dcc-sheet/$asset" -UseBasicParsing -TimeoutSec 3
      if ($a.StatusCode -eq 200) { Ok "asset $asset (200)" } else { Bad "asset $asset : status $($a.StatusCode)" }
    } catch { Bad "asset $asset : $($_.Exception.Message)" }
  }
}

if ($ok) {
  Write-Host "3. Dossier cote dcc-spells-reader" -ForegroundColor Cyan
  try {
    $s = (Invoke-WebRequest 'http://127.0.0.1:8089/dcc-spells-reader' -UseBasicParsing -TimeoutSec 2).StatusCode
    Ok "dcc-spells-reader servi (status $s)"
  } catch {
    # 404 = dossier vide sans index : le dossier existe bien sur le serveur, autre serveur ferait connexion refusee
    if ($_.Exception.Response.StatusCode.value__ -eq 404) { Ok "dcc-spells-reader servi (404, dossier vide)" }
    else { Bad "dcc-spells-reader : $($_.Exception.Message)" }
  }
  # Laisser la WebView2 reellement charger la page et ses ressources
  # (le controle 6 analyse les fetchs qu'elle a faits dans php.log)
  Start-Sleep -Seconds 4
}

Write-Host "4. Fermeture de la fenetre (WM_CLOSE)" -ForegroundColor Cyan
$proc.Refresh()
if ($proc.MainWindowHandle -ne 0) {
  Add-Type -Namespace Win32 -Name Native -MemberDefinition @'
[DllImport("user32.dll")] public static extern bool PostMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);
'@
  [Win32.Native]::PostMessage($proc.MainWindowHandle, 0x0010, [IntPtr]::Zero, [IntPtr]::Zero) | Out-Null
} else {
  Bad "aucune fenetre trouvee (le demarrage a probablement echoue)"
}

if (-not $proc.WaitForExit(10000)) {
  Bad "l'application ne s'est pas fermee en 10 s (bug de fermeture)"
  $proc.Kill()
}

Write-Host "5. Arret de PHP et liberation du port" -ForegroundColor Cyan
$deadline = (Get-Date).AddSeconds(5)
$phpAlive = $true
while ((Get-Date) -lt $deadline -and $phpAlive) {
  $phpAlive = ((Get-DccPhp).Count -gt 0)
  if ($phpAlive) { Start-Sleep -Milliseconds 300 }
}
if ($phpAlive) { Bad "notre php.exe (port 8089) tourne encore apres fermeture !" }
else { Ok "php.exe (port 8089) arrete" }

$portFree = $true
try {
  $c = New-Object Net.Sockets.TcpClient
  $c.Connect('127.0.0.1', 8089); $c.Close(); $portFree = $false
} catch { $portFree = $true }
if ($portFree) { Ok "port 8089 libre" } else { Bad "port 8089 toujours occupe" }

Write-Host "6. Journal serveur : chargement reel des assets par la WebView2" -ForegroundColor Cyan
if (Test-Path $logFile) {
  $tail = @(Get-Content $logFile -Encoding UTF8 | Select-Object -Skip $logStart)
  # les 404 de /dcc-spells-reader (dossier lateral vide) sont attendus
  $bad404 = @($tail | Where-Object { $_ -match '\[404\].*\.(js|css|svg)' -and $_ -notmatch 'dcc-spells-reader' })
  if ($bad404.Count -gt 0) {
    Bad "$($bad404.Count) reponse(s) 404 sur des assets js/css/svg dans php.log"
    $bad404 | Select-Object -First 5 | ForEach-Object { Write-Host "    $_" -ForegroundColor Red }
  } else { Ok "aucun 404 asset dans php.log" }
  # controle positif : la WebView2 a bien charge des assets SOUS /dcc-sheet/
  $loaded = @($tail | Where-Object { $_ -match '\[200\]: GET /dcc-sheet/.*\.(js|css)' })
  if ($loaded.Count -gt 0) { Ok "WebView2 : $($loaded.Count) asset(s) charge(s) sous /dcc-sheet/" }
  else { Bad "la WebView2 n'a charge aucun asset sous /dcc-sheet/ (page non rendue ?)" }
} else { Bad "journal introuvable : $logFile" }

Write-Host ""
if ($fails.Count -eq 0) {
  Write-Host "RECETTE OK ($($script:passed) controles)" -ForegroundColor Green
  exit 0
} else {
  Write-Host "RECETTE EN ECHEC : $($fails.Count) controle(s) en echec ($($script:passed) OK)" -ForegroundColor Red
  $fails | ForEach-Object { Write-Host " - $_" -ForegroundColor Red }
  exit 1
}
