$deployDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$src = Split-Path -Parent $deployDir
$outDir = Join-Path $deployDir 'dcc-sheet'

if (Test-Path $outDir) { Remove-Item $outDir -Recurse -Force }
New-Item -ItemType Directory -Path $outDir | Out-Null

$excludeDirs = @('.git','captures','deploy','data')
$excludeFiles = @('*.log','.gitignore', '.DS_Store','Thumbs.db','*.md','TODO.md','BUGFIX.md','JOURNAL.md','PLAN.md','PLAN_DB.md','PROMPT.md','README.md','LICENSE','DCC_Fiche_*','maquette_*')

$allFiles = Get-ChildItem -Path $src -Recurse -File | Where-Object {
  $full = $_.FullName
  $afterSrc = $full.Substring($src.Length + 1)
  $parts = $afterSrc.Split('\')
  $skip = $false
  foreach ($d in $excludeDirs) {
    if ($parts -contains $d) { $skip = $true; break }
  }
  if ($skip) { return $false }
  foreach ($p in $excludeFiles) {
    if ($_.Name -like $p) { return $false }
  }
  return $true
}

$count = 0
foreach ($file in $allFiles) {
  $rel = $file.FullName.Substring($src.Length + 1)
  $dest = Join-Path $outDir $rel
  $destDir = Split-Path -Parent $dest
  if (!(Test-Path $destDir)) { New-Item -ItemType Directory -Path $destDir -Force | Out-Null }
  Copy-Item $file.FullName $dest
  Write-Host ('  + ' + $rel)
  $count++
}
Write-Host ''
Write-Host ('Dossier cree : ' + $outDir)
Write-Host ('Fichiers copies : ' + $count)
