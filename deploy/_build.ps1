param([switch]$Diff)

$deployDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$src = Split-Path -Parent $deployDir

$excludeDirs = @('.git','maquettes', 'captures','deploy','data','exemples','node_modules','tests','.opencode')
$excludeFiles = @('*.log','.gitignore','.DS_Store','Thumbs.db','*.md','TODO.md','BUGFIX.md','JOURNAL.md','PLAN.md','PLAN_DB.md','PROMPT.md','README.md','LICENSE','DCC_Fiche_*','maquette_*','package.json','package-lock.json','test.bat')

function Test-Excluded($rel) {
  $parts = $rel.Replace('/', '\').Split('\')
  foreach ($d in $excludeDirs) { if ($parts -contains $d) { return $true } }
  $name = Split-Path -Leaf $rel
  foreach ($p in $excludeFiles) { if ($name -like $p) { return $true } }
  return $false
}

if ($Diff) {
  # --- Build differentiel : fichiers modifies/ajoutes depuis le dernier tag ---
  $lastTag = (git -C $src describe --tags --abbrev=0 2>$null)
  if (-not $lastTag) {
    Write-Host 'ERREUR : aucun tag git trouve (derniere release).' -ForegroundColor Red
    exit 1
  }

  # tag vs working tree : inclut commits, staged et WIP non commites
  $lines = git -C $src diff --name-status --no-renames $lastTag 2>$null
  $untracked = git -C $src ls-files --others --exclude-standard 2>$null

  $status = @{}
  foreach ($l in @($lines)) {
    if (-not $l) { continue }
    $parts = $l -split "`t"
    if ($parts.Count -ge 2) { $status[$parts[1]] = $parts[0] }
  }
  foreach ($f in @($untracked)) {
    if ($f -and -not $status.ContainsKey($f)) { $status[$f] = 'A' }
  }

  $outDir = Join-Path $deployDir 'dcc-sheet-diff'
  if (Test-Path $outDir) { Remove-Item $outDir -Recurse -Force }
  New-Item -ItemType Directory -Path $outDir | Out-Null

  $modified = @(); $added = @(); $deleted = @(); $copied = 0
  foreach ($rel in ($status.Keys | Sort-Object)) {
    $st = $status[$rel]
    $posix = $rel.Replace('\', '/')
    if ($st -eq 'D') {
      $deleted += $posix
      continue
    }
    $excluded = Test-Excluded $posix
    if ($st -eq 'M') { $modified += $posix } else { $added += $posix }
    if ($excluded) { continue }
    $full = Join-Path $src $rel
    if (-not (Test-Path $full)) { continue }
    $dest = Join-Path $outDir $rel
    $destDir = Split-Path -Parent $dest
    if (!(Test-Path $destDir)) { New-Item -ItemType Directory -Path $destDir -Force | Out-Null }
    Copy-Item $full $dest
    Write-Host ('  + [' + $st + '] ' + $posix)
    $copied++
  }

  $report = @()
  $report += 'Build differentiel DCC Sheet'
  $report += ('Date        : ' + (Get-Date -Format 'yyyy-MM-dd HH:mm'))
  $report += ('Depuis tag  : ' + $lastTag)
  $report += ('Ref actuelle: ' + (git -C $src rev-parse --short HEAD 2>$null))
  $report += ''
  $report += ('--- MODIFIED (' + $modified.Count + ') ---')
  $report += $modified
  $report += ''
  $report += ('--- ADDED (' + $added.Count + ') ---')
  $report += $added
  $report += ''
  $report += ('--- DELETED (' + $deleted.Count + ') --- a supprimer manuellement sur le serveur')
  $report += $deleted
  $report += ''
  $report += ('Fichiers copies : ' + $copied)
  Set-Content -Path (Join-Path $outDir 'CHANGES.txt') -Value $report -Encoding UTF8

  Write-Host ''
  Write-Host ('Dossier differentiel cree : ' + $outDir)
  $excludedCount = ($modified.Count + $added.Count) - $copied
  Write-Host ('Modified: ' + $modified.Count + ' | Added: ' + $added.Count + ' | Deleted: ' + $deleted.Count + ' | Copies: ' + $copied + ' (hors exclusions: ' + $excludedCount + ')')
  if ($deleted.Count -gt 0) {
    Write-Host 'Fichiers supprimes : a supprimer manuellement sur le serveur (voir CHANGES.txt)'
  }
  exit 0
}

# --- Build complet (mode historique) ---
$outDir = Join-Path $deployDir 'dcc-sheet'
if (Test-Path $outDir) { Remove-Item $outDir -Recurse -Force }
New-Item -ItemType Directory -Path $outDir | Out-Null

$allFiles = Get-ChildItem -Path $src -Recurse -File | Where-Object {
  $full = $_.FullName
  $afterSrc = $full.Substring($src.Length + 1)
  -not (Test-Excluded $afterSrc)
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
