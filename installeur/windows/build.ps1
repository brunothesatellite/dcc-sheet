<#
.SYNOPSIS
  Construit les deux livrables DCC Sheet :
    - dist\dcc-sheet-portable-<version>.zip   (dossier autonome, dézipper et lancer)
    - dist\dcc-sheet-setup-<version>.exe      (installateur Inno Setup, per-user)

.DESCRIPTION
  Ordre : payload (php + public) -> publish single-file -> VERIFICATIONS BLOQUANTES
          -> zip portable -> bootstrapper WebView2 -> Inno Setup.

  Verifications bloquantes :
    * aucun fichier/dossier dcc-pc-tokens ni funnel-tokens (redistribution interdite)
    * php.exe, index.html, api\maps.php, DccSheet.exe presents
    * php -m : extensions gd, zip, sqlite3, mbstring actives
    * data\ inscriptible, dcc-spells-reader\ cree (vide)

.EXAMPLE
  powershell -NoProfile -ExecutionPolicy Bypass -File build.ps1
  powershell -NoProfile -ExecutionPolicy Bypass -File build.ps1 -SkipSetup   # zip seulement
#>
param(
  [string]$Version = '3.0.0',
  [string]$PhpSource = 'D:\VS Code\servers\php',
  [switch]$SkipSetup
)

$ErrorActionPreference = 'Stop'
$here    = Split-Path -Parent $MyInvocation.MyCommand.Definition
$repo    = (Resolve-Path (Join-Path $here '..\..')).Path
$proj    = Join-Path $here 'DccSheet.Desktop'
$pkg     = Join-Path $here 'package'
$dist    = Join-Path $here 'dist'
$setup   = Join-Path $here 'setup'
$webRoot = Join-Path $pkg 'public\dcc-sheet'

function Fail([string]$msg) { Write-Host "`nERREUR : $msg`n" -ForegroundColor Red; exit 1 }
function Step([string]$msg) { Write-Host "`n=== $msg ===" -ForegroundColor Cyan }
function Ok([string]$msg)   { Write-Host "  OK  $msg" -ForegroundColor Green }

# ------------------------------------------------------------------ 1. nettoyage
Step '1/7 Nettoyage'
foreach ($d in @($pkg, $dist)) { if (Test-Path $d) { Remove-Item $d -Recurse -Force } }
New-Item -ItemType Directory -Force -Path $pkg, $dist | Out-Null
Ok "package\ et dist\ reinitialises"

# --------------------------------------------------- 2. application web (public\dcc-sheet)
Step '2/7 Copie de l application web'
# Exclusions reprises de deploy\_build.ps1, enrichies des dossiers interdits
$excludeDirs  = @('.git', 'maquettes', 'captures', 'tools', 'deploy', 'data', 'exemples',
                  'node_modules', 'tests', '.opencode', 'plan0', 'plan1', 'installeur')
$excludeFiles = @('*.log', '.gitignore', '.DS_Store', 'Thumbs.db', '*.md', 'TODO.md', 'BUGFIX.md',
                  'JOURNAL.md', 'PLAN.md', 'PLAN_DB.md', 'PROMPT.md', 'README.md',
                  'DCC_Fiche_*', 'maquette_*', 'package.json', 'package-lock.json', 'test.bat')
$banned = @('dcc-pc-tokens', 'funnel-tokens')   # droits de redistribution interdits (E9)

function Test-Excluded([string]$rel) {
  $parts = $rel.Replace('/', '\').Split('\')
  foreach ($d in $excludeDirs) { if ($parts -contains $d) { return $true } }
  foreach ($b in $banned)      { if ($parts -contains $b) { return $true } }   # meme nom, n'importe ou
  $name = Split-Path -Leaf $rel
  foreach ($p in $excludeFiles) { if ($name -like $p) { return $true } }
  return $false
}

$copied = 0
foreach ($file in (Get-ChildItem -Path $repo -Recurse -File -Force)) {
  $rel = $file.FullName.Substring($repo.Length + 1)
  if (Test-Excluded $rel) { continue }
  $dest = Join-Path $webRoot $rel
  $destDir = Split-Path -Parent $dest
  if (!(Test-Path $destDir)) { New-Item -ItemType Directory -Path $destDir -Force | Out-Null }
  Copy-Item $file.FullName $dest
  $copied++
}
New-Item -ItemType Directory -Force -Path (Join-Path $webRoot 'data') | Out-Null          # base SQLite (vide)
New-Item -ItemType Directory -Force -Path (Join-Path $pkg 'public\dcc-spells-reader') | Out-Null  # dossier lateral (vide)
Ok "$copied fichiers copiés -> package\public\dcc-sheet (data\ et dcc-spells-reader\ crees)"

# -------------------------------------------------------------------- 3. PHP
Step '3/7 Copie de PHP'
if (-not (Test-Path (Join-Path $PhpSource 'php.exe'))) { Fail "php.exe introuvable dans $PhpSource" }
$phpDir = Join-Path $pkg 'php'
New-Item -ItemType Directory -Force -Path $phpDir | Out-Null
Copy-Item (Join-Path $PhpSource '*') $phpDir -Recurse -Force

# Allègement : outils et fichiers inutiles a l execution (licences conservees)
$remove = @('phpdbg.exe', 'php8phpdbg.dll', 'php8embed.lib', 'php-cgi.exe', 'php-win.exe',
            'php.ini-development', 'php.ini-production', 'news.txt', 'snapshot.txt',
            'snapshot.dat', 'readme-redist-bins.txt.bak')
foreach ($f in $remove) { $p = Join-Path $phpDir $f; if (Test-Path $p) { Remove-Item $p -Force } }
Get-ChildItem $phpDir -Filter '*.lib' -File -ErrorAction SilentlyContinue | Remove-Item -Force
foreach ($d in @('lib', 'extras\sbom', 'snapshots')) {
  $p = Join-Path $phpDir $d
  if (Test-Path $p) { Remove-Item $p -Recurse -Force }
}

# php.ini : copie de la config source + extensions requises par l'application
#   sqlite3  -> api/db.php (SQLite3)
#   gd       -> api/map-image.php (conversion image/webp)
#   zip      -> api/maps.php (ZipArchive)
#   mbstring -> noms multibytes (repli substr garde dans le code)
$iniPath = Join-Path $phpDir 'php.ini'
Copy-Item (Join-Path $PhpSource 'php.ini') $iniPath -Force
$needed = @('gd', 'zip', 'sqlite3', 'mbstring')
$lines  = [System.Collections.Generic.List[string]](Get-Content $iniPath)
for ($i = 0; $i -lt $lines.Count; $i++) {
  foreach ($m in $needed) {
    if ($lines[$i] -match ('^\s*;\s*extension\s*=\s*' + $m + '\s*$')) { $lines[$i] = "extension=$m" }
  }
}
foreach ($m in $needed) {
  if (-not ($lines -contains "extension=$m")) { $lines.Add("extension=$m") }
}
[System.IO.File]::WriteAllLines($iniPath, $lines, (New-Object System.Text.UTF8Encoding($false)))
Ok "php.ini configure (extensions : $($needed -join ', '))"

# ------------------------------------------------------------------ 4. publish
Step "4/7 Publication single-file (.NET 10, version $Version)"
dotnet publish $proj -c Release -o $pkg -p:Version=$Version -p:DebugType=None -p:DebugSymbols=false
if ($LASTEXITCODE -ne 0) { Fail "dotnet publish (code $LASTEXITCODE)" }
if (-not (Test-Path (Join-Path $pkg 'DccSheet.exe'))) { Fail 'DccSheet.exe absent du package' }
$exeSize = (Get-Item (Join-Path $pkg 'DccSheet.exe')).Length / 1MB
Ok ("DccSheet.exe : {0:N1} Mo" -f $exeSize)

# ------------------------------------------------------------ 5. verifications
Step '5/7 Verifications bloquantes'
$errors = @()

# 5.1 tokens interdits
$hits = Get-ChildItem $pkg -Recurse -Force -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -in $banned -or $_.FullName -match 'dcc-pc-tokens|funnel-tokens' }
if ($hits) { $errors += "Fichiers interdits trouves : " + (($hits | Select-Object -First 5 | ForEach-Object FullName) -join ', ') }
else { Ok 'aucun dcc-pc-tokens / funnel-tokens dans le package' }

# 5.2 fichiers requis
foreach ($req in @('DccSheet.exe', 'php\php.exe', 'php\license.txt', 'php\php.ini',
                   'public\dcc-sheet\index.html', 'public\dcc-sheet\api\maps.php',
                   'public\dcc-sheet\api\map-image.php', 'public\dcc-spells-reader')) {
  if (-not (Test-Path (Join-Path $pkg $req))) { $errors += "manquant : $req" }
}
if (-not $errors) { Ok 'fichiers requis presents (dont licence PHP et php.ini)' }

# 5.3 dossier latéral vide
$side = Get-ChildItem (Join-Path $pkg 'public\dcc-spells-reader') -Force -ErrorAction SilentlyContinue
if ($side) { $errors += 'dcc-spells-reader doit rester vide' } else { Ok 'dcc-spells-reader\ cree (vide)' }

# 5.4 data inscriptible
try {
  $probe = Join-Path $webRoot 'data\.write-probe'
  [IO.File]::WriteAllText($probe, 'ok'); Remove-Item $probe -Force
  Ok 'data\ inscriptible'
} catch { $errors += "data non inscriptible : $($_.Exception.Message)" }

# 5.5 extensions PHP
$oldPhprc = $env:PHPRC
try {
  $env:PHPRC = $phpDir
  Push-Location $pkg
  $mods = @(& (Join-Path $phpDir 'php.exe') -m 2>&1)
} finally { Pop-Location; $env:PHPRC = $oldPhprc }
foreach ($need in $needed) {
  if ($mods -contains $need) { Ok "extension php : $need" }
  else { $errors += "extension php absente : $need`n" + ($mods -join "`n") }
}

if ($errors) { Fail ("verifications en echec :`n - " + ($errors -join "`n - ")) }

# ------------------------------------------------------------- 6. zip portable
Step '6/7 Zip portable'
$stageName = 'dcc-sheet-portable'
$stage = Join-Path $env:TEMP $stageName
if (Test-Path $stage) { Remove-Item $stage -Recurse -Force }
New-Item -ItemType Directory -Path $stage | Out-Null
Copy-Item (Join-Path $pkg '*') $stage -Recurse
$zip = Join-Path $dist "dcc-sheet-portable-$Version.zip"
Compress-Archive -Path $stage -DestinationPath $zip -CompressionLevel Optimal -Force
Remove-Item $stage -Recurse -Force
Ok ("{0} ({1:N1} Mo)" -f (Split-Path -Leaf $zip), ((Get-Item $zip).Length / 1MB))

# --------------------------------------------------------- 7. installateur
if ($SkipSetup) { Step '7/7 Installeur : ignore (-SkipSetup)'; exit 0 }

Step '7/7 Installateur Inno Setup'
# Bootstrapper Evergreen WebView2 (~2 Mo, redistribuable) pour le postes sans runtime
$boot = Join-Path $setup 'WebView2RuntimeBootstrapper.exe'
if (-not (Test-Path $boot)) {
  try {
    Invoke-WebRequest -Uri 'https://go.microsoft.com/fwlink/p/?LinkId=2124703' -OutFile $boot -UseBasicParsing
    Ok 'bootstrapper WebView2 telecharge'
  } catch {
    Write-Warning "bootstrapper non telecharge ($($_.Exception.Message)) - l installateur sera sans detection WebView2"
  }
}

$isccCandidates = @("${env:ProgramFiles(x86)}\Inno Setup 6\ISCC.exe",
                    "$env:ProgramFiles\Inno Setup 6\ISCC.exe",
                    "$env:LOCALAPPDATA\Programs\Inno Setup 6\ISCC.exe")
$iscc = $isccCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $iscc) { Fail 'ISCC.exe introuvable (Inno Setup 6 installe ?)' }

& $iscc "/DMyAppVersion=$Version" "/O$dist" (Join-Path $setup 'dcc-sheet.iss')
if ($LASTEXITCODE -ne 0) { Fail "ISCC (code $LASTEXITCODE)" }

Get-ChildItem $dist | ForEach-Object { Write-Host ("  {0,10:N1} Mo  {1}" -f ($_.Length / 1MB), $_.Name) -ForegroundColor Green }
Write-Host "`nTermine." -ForegroundColor Cyan
