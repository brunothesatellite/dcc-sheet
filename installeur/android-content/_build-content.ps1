<#
  _build-content.ps1 - fabrique l'APK signe dcc-sheet-content
  ----------------------------------------------------------
  Etapes :
    1. env (JAVA_HOME = JBR d'Android Studio, ANDROID_HOME = SDK)
    2. node _sync-content.mjs  (assets/ + ASSERTIONS BLOQUANTES)
    3. gradlew assembleRelease (-PcontentVersionName)
    4. signature avec le KEYSHARE de installeur/android (meme cle)
    5. apksigner -> ../android/dist/dcc-sheet-content-<version>-android.apk

  ATTENTION : cet APK contient des contenus a redistribution
  interdite (tokens dcc-pc-tokens / funnel-tokens + dcc-spells-reader).
  Usage STRICTEMENT personnel : ne jamais le partager ni le publier.

  Exemples :
    .\_build-content.ps1 -Version 1.0
    .\_build-content.ps1 -Version 1.0 -SkipSync
    .\_build-content.ps1 -Debug   (assembleDebug, cle debug)
#>
param(
    [string]$Version = '1.0',
    [switch]$SkipSync,
    [switch]$Debug   # pas de CmdletBinding : -Debug serait reserve au parametre commun
)

$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $here

# --- 1. Environnement -------------------------------------------------
$androidStudio = 'C:\Program Files\Android\Android Studio'
$javaHome = Join-Path $androidStudio 'jbr'
$sdk = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
if (-not (Test-Path (Join-Path $javaHome 'bin\java.exe'))) { throw "JBR introuvable : $javaHome" }
if (-not (Test-Path (Join-Path $sdk 'platform-tools\adb.exe'))) { throw "SDK introuvable : $sdk" }
$env:JAVA_HOME = $javaHome
$env:ANDROID_HOME = $sdk
$env:PATH = (Join-Path $javaHome 'bin') + ';' + (Join-Path $sdk 'platform-tools') + ';' + $env:PATH
"JAVA_HOME  = $env:JAVA_HOME"
"ANDROID_HOME = $env:ANDROID_HOME"

# local.properties (gitignore) pour AGP
"sdk.dir=" + ($sdk -replace '\\', '/') | Set-Content -Path 'local.properties' -Encoding ascii

# --- 2. Assets (avec assertions contenu) ------------------------------
if (-not $SkipSync) {
    node (Join-Path $here '_sync-content.mjs')
    if ($LASTEXITCODE -ne 0) { throw "sync contenu en echec (assertions)" }
}

# --- 3. Build Gradle ---------------------------------------------------
$gradleArgs = @(':app:assembleRelease', "-PcontentVersionName=$Version")
if ($Debug) { $gradleArgs = @(':app:assembleDebug', "-PcontentVersionName=$Version") }
$gradlew = Join-Path $here 'gradlew.bat'
if (-not (Test-Path $gradlew)) { throw "gradlew.bat absent (wrapper Gradle non installe)" }
& $gradlew @gradleArgs
if ($LASTEXITCODE -ne 0) { throw "gradle build en echec ($LASTEXITCODE)" }

# --- 4. Keystore : celui de dcc-sheet (meme cle, A CONSERVER) ----------
$ks = Join-Path $here '..\android\keystore\dcc-sheet.keystore'
$aliasName = 'dcc-store'
$storePass = 'dcc-android-store'
$keyPass = $storePass   # PKCS12 : mot de passe cle = magasin
if (-not (Test-Path $ks)) {
    throw "keystore introuvable : $ks (le build dcc-sheet l'a cree - meme cle pour les deux APK)"
}
Write-Host "Keystore : $ks"

# --- 5. Signature ------------------------------------------------------
$bt = Join-Path $sdk 'build-tools'
$btVersion = (Get-ChildItem $bt -Directory | Sort-Object Name -Descending | Select-Object -First 1).Name
$apksigner = Join-Path $bt "$btVersion\apksigner.bat"

$dist = Join-Path $here '..\android\dist'
New-Item -ItemType Directory -Force -Path $dist | Out-Null

if ($Debug) {
    $built = Join-Path $here 'app\build\outputs\apk\debug\app-debug.apk'
    $out = Join-Path $dist "dcc-sheet-content-$Version-android-debug.apk"
} else {
    $built = Join-Path $here 'app\build\outputs\apk\release\app-release-unsigned.apk'
    if (-not (Test-Path $built)) {
        $alt = Join-Path $here 'app\build\outputs\apk\release\app-release.apk'
        if (Test-Path $alt) { $built = $alt }
    }
    $out = Join-Path $dist "dcc-sheet-content-$Version-android.apk"
}
if (-not (Test-Path $built)) { throw "APK construit introuvable : $built" }

Copy-Item $built $out -Force
& $apksigner sign --ks $ks --ks-key-alias $aliasName `
    --ks-pass "pass:$storePass" --key-pass "pass:$keyPass" $out
if ($LASTEXITCODE -ne 0) { throw 'apksigner en echec' }
& $apksigner verify --print-certs $out | Out-Null

$size = [math]::Round((Get-Item $out).Length / 1MB, 1)
Write-Host ''
Write-Host "APK signe : $out  ($size Mo)" -ForegroundColor Green
Write-Host "ATTENTION : APK STRICTEMENT PERSONNEL - ne pas partager ni publier." -ForegroundColor Yellow
Write-Host "Installation device : adb install -r `"$out`""
exit 0
