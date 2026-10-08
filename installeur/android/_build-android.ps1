<#
  _build-android.ps1 - fabrique l'APK signe dcc-sheet
  ----------------------------------------------------
  Etapes :
    1. env (JAVA_HOME = JBR d'Android Studio, ANDROID_HOME = SDK)
    2. node _sync-assets.mjs  (assets/ + ASSERTION BLOQUANTE tokens)
    3. gradlew assembleRelease (-PappVersionName)
    4. creation du keystore si absent (gitignore - A CONSERVER)
    5. apksigner -> dist/dcc-sheet-<version>-android.apk

  Exemples :
    .\_build-android.ps1 -Version 3.0
    .\_build-android.ps1 -Version 3.1.1 -SkipSync
    .\_build-android.ps1 -Debug   (assembleDebug, signe avec la cle debug)
#>
param(
    [string]$Version = '3.0',
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
"JAVA_HOME  = $JAVA_HOME"
"ANDROID_HOME = $ANDROID_HOME"

# local.properties (gitignore) pour AGP
"sdk.dir=" + ($sdk -replace '\\', '/') | Set-Content -Path 'local.properties' -Encoding ascii

# --- 2. Assets (avec assertions tokens) --------------------------------
if (-not $SkipSync) {
    if (-not (Test-Path (Join-Path 'poc' 'node_modules'))) {
        throw "node_modules du POC absent : cd installeur\android\poc && npm install"
    }
    node (Join-Path $here '_sync-assets.mjs')
    if ($LASTEXITCODE -ne 0) { throw "sync assets en echec (assertions)" }
}

# --- 3. Build Gradle ---------------------------------------------------
$gradleArgs = @(':app:assembleRelease', "-PappVersionName=$Version")
if ($Debug) { $gradleArgs = @(':app:assembleDebug', "-PappVersionName=$Version") }
$gradlew = Join-Path $here 'gradlew.bat'
if (-not (Test-Path $gradlew)) { throw "gradlew.bat absent (wrapper Gradle non installe)" }
& $gradlew @gradleArgs
if ($LASTEXITCODE -ne 0) { throw "gradle build en echec ($LASTEXITCODE)" }

# --- 4. Keystore de signature (sideload) -------------------------------
$ksDir = Join-Path $here 'keystore'
$ks = Join-Path $ksDir 'dcc-sheet.keystore'
$aliasName = 'dcc-store'
$storePass = 'dcc-android-store'
$keyPass = $storePass   # PKCS12 : mot de passe cle = magasin (sinon apksigner echoue)
$dname = 'CN=DCC Sheet, OU=Local, O=Local, C=FR'

if (-not (Test-Path $ks)) {
    New-Item -ItemType Directory -Force -Path $ksDir | Out-Null
    $keytool = Join-Path $javaHome 'bin\keytool.exe'
    & $keytool -genkeypair -v -keystore $ks -alias $aliasName `
        -keyalg RSA -keysize 2048 -validity 10000 `
        -storepass $storePass -keypass $keyPass -dname $dname
    if ($LASTEXITCODE -ne 0) { throw 'keytool : creation du keystore echouee' }
    Write-Host "Keystore cree : $ks  (A CONSERVER - perte = re-signature + mise a jour impossible)" -ForegroundColor Yellow
} else {
    Write-Host "Keystore existant : $ks"
}

# --- 5. Signature ------------------------------------------------------
$bt = Join-Path $sdk 'build-tools'
$btVersion = (Get-ChildItem $bt -Directory | Sort-Object Name -Descending | Select-Object -First 1).Name
$apksigner = Join-Path $bt "$btVersion\apksigner.bat"

$dist = Join-Path $here 'dist'
New-Item -ItemType Directory -Force -Path $dist | Out-Null

if ($Debug) {
    $built = Join-Path $here 'app\build\outputs\apk\debug\app-debug.apk'
    $out = Join-Path $dist "dcc-sheet-$Version-android-debug.apk"
} else {
    $built = Join-Path $here 'app\build\outputs\apk\release\app-release-unsigned.apk'
    if (-not (Test-Path $built)) {
        # AGP peut deja avoir signe si un signingConfig est configure
        $alt = Join-Path $here 'app\build\outputs\apk\release\app-release.apk'
        if (Test-Path $alt) { $built = $alt }
    }
    $out = Join-Path $dist "dcc-sheet-$Version-android.apk"
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
Write-Host "Installation device : adb install -r `"$out`""
exit 0
