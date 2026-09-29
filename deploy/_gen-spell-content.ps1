# Genere le zip du package minimal de dcc-spells-reader utilise par dcc-sheet
# (spell-reader.js : content/anchors.js, content/127..303 + 322..356, spell-translation.js).
# Sortie : deploy\dcc-spells-reader-minimal.zip (ignore par git, voir .gitignore).
# Le zip contient un dossier dcc-spells-reader/ a sa racine : le decompresser a cote
# de dcc-sheet recree le voisinage ../dcc-spells-reader attendu par spell-reader.js.

$ErrorActionPreference = 'Stop'

$deployDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$sheetDir = Split-Path -Parent $deployDir
# dcc-spells-reader est un dossier frere de dcc-sheet (un niveau au-dessus de deploy/).
$src = Join-Path (Split-Path -Parent $sheetDir) 'dcc-spells-reader'
$out = Join-Path $deployDir 'dcc-spells-reader-minimal.zip'

if (-not (Test-Path -LiteralPath $src)) {
  Write-Host ('ERREUR : dossier source introuvable : ' + $src) -ForegroundColor Red
  exit 1
}

# --- Liste explicite (aucun glob) : le trou 304-321 est saute, comme dans
# --- les RANGES de dcc-sheet/spell-reader.js.
$pages = @(127..303) + @(322..356)
$files = New-Object System.Collections.Generic.List[string]
$files.Add((Join-Path $src 'spell-translation.js'))
$files.Add((Join-Path $src 'content\anchors.js'))

$missing = @()
foreach ($n in $pages) {
  $p = Join-Path $src ('content\{0}.js' -f $n)
  if (Test-Path -LiteralPath $p) { $files.Add($p) } else { $missing += $n }
}

$expected = 2 + $pages.Count
if ($missing.Count) {
  Write-Host ('ATTENTION : {0} page(s) absente(s) dans content/ :' -f $missing.Count) -ForegroundColor Yellow
  Write-Host ('  ' + ($missing -join ', '))
}
if ($files.Count -ne $expected) {
  Write-Host ('ERREUR : {0} fichier(s) au lieu de {1}.' -f $files.Count, $expected) -ForegroundColor Red
  exit 1
}

# --- Ecriture du zip (API .NET : entrées en '/', compatible PowerShell 5.1 ;
# --- Compress-Archive produit des '\' sous 5.1).
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
if (Test-Path -LiteralPath $out) { Remove-Item -LiteralPath $out -Force }

$zip = [System.IO.Compression.ZipFile]::Open($out, [System.IO.Compression.ZipArchiveMode]::Create)
try {
  foreach ($f in $files) {
    $rel = $f.Substring($src.Length + 1).Replace('\', '/')
    [void][System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $f, 'dcc-spells-reader/' + $rel)
  }
} finally {
  $zip.Dispose()
}

$size = (Get-Item -LiteralPath $out).Length
Write-Host ''
Write-Host ('Zip cree : ' + $out)
Write-Host ('Fichiers : ' + $files.Count + ' (' + $pages.Count + ' pages + anchors.js + spell-translation.js)')
Write-Host ('Poids    : {0:N2} Mo' -f ($size / 1MB))
exit 0
