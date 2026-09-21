$deployDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$src = Split-Path -Parent $deployDir
$out = Join-Path $deployDir 'dcc-sheet.zip'

if (Test-Path $out) { Remove-Item $out -Force }

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

Add-Type -Assembly 'System.IO.Compression.FileSystem'
$zip = [System.IO.Compression.ZipFile]::Open($out, 'Create')
$count = 0
foreach ($file in $allFiles) {
  $rel = $file.FullName.Substring($src.Length + 1)
  [void][System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $file.FullName, $rel)
  Write-Host ('  + ' + $rel)
  $count++
}
$zip.Dispose()
Write-Host ''
Write-Host ('Archive creee : ' + $out)
Write-Host ('Fichiers inclus : ' + $count)
