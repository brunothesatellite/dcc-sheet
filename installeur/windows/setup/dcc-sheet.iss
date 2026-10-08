; ============================================================
;  dcc-sheet.iss — installateur Windows DCC Sheet (per-user)
;  Construit par build.ps1 :  ISCC /DMyAppVersion=3.0.0 /O..\dist dcc-sheet.iss
;  Même payload que le zip portable : ..\package\{DccSheet.exe, php\, public\}
; ============================================================

#ifndef MyAppVersion
  #define MyAppVersion "3.0.0"
#endif
#define MyAppName "DCC Sheet"
#define MyAppExeName "DccSheet.exe"
#define MyAppId "{{8C2E4B31-5F1A-4D6E-9B77-2A1F0C6D4E52}"

[Setup]
AppId={#MyAppId}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher=brunothesatellite
AppPublisherURL=https://github.com/brunothesatellite/dcc-sheet
DefaultDirName={localappdata}\Programs\dcc-sheet
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes
; Per-user : aucune élévation, dossier d'installation inscriptible (SQLite)
PrivilegesRequired=lowest
OutputDir=..\dist
OutputBaseFilename=dcc-sheet-setup-{#MyAppVersion}
SetupIconFile=..\DccSheet.Desktop\app.ico
UninstallDisplayIcon={app}\{#MyAppExeName}
UninstallDisplayName={#MyAppName}
LicenseFile=..\..\..\LICENSE
Compression=lzma2/max
SolidCompression=yes
WizardStyle=modern
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
CloseApplications=yes
ChangesAssociations=no

[Languages]
Name: "french"; MessagesFile: "compiler:Languages\French.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
; Application (.NET 10 auto-contenu + WebView2 embarqué)
Source: "..\package\DccSheet.exe"; DestDir: "{app}"; Flags: ignoreversion
; PHP 8.2 (licence PHP License 3.01 conservée : php\license.txt)
Source: "..\package\php\*"; DestDir: "{app}\php"; Flags: ignoreversion recursesubdirs createallsubdirs
; Application web — exclusions de sécurité : redistribution des tokens interdite
Source: "..\package\public\*"; DestDir: "{app}\public"; Flags: ignoreversion recursesubdirs createallsubdirs; \
  Excludes: "icons\dcc-pc-tokens\*,icons\funnel-tokens\*"
; Bootstrapper Evergreen WebView2 (téléchargé par build.ps1 ; absent = non fourni)
Source: "WebView2RuntimeBootstrapper.exe"; DestDir: "{tmp}"; Flags: deleteafterinstall skipifsourcedoesntexist

[Dirs]
; Dossier latéral pour dcc-spells-reader (http://127.0.0.1:8089/dcc-spells-reader)
Name: "{app}\public\dcc-spells-reader"
; Base SQLite : créée au premier lancement, conservée à la désinstallation
Name: "{app}\public\dcc-sheet\data"

[Icons]
Name: "{autoprograms}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Run]
; WebView2 Runtime si absent (Evergreen, ~2 Mo, connexion requise)
;   (pas de flag « file absent » sur [Run] : NeedsWebView2 verifie aussi le fichier)
Filename: "{tmp}\WebView2RuntimeBootstrapper.exe"; \
  Parameters: "/silent /install"; \
  StatusMsg: "Installation du composant Microsoft WebView2..."; \
  Flags: runascurrentuser waituntilterminated; \
  Check: NeedsWebView2
Filename: "{app}\{#MyAppExeName}"; \
  Description: "{cm:LaunchProgram,{#MyAppName}}"; \
  Flags: nowait postinstall skipifsilent

[Code]
{ Détection du WebView2 Runtime : clé EdgeUpdate (machine / utilisateur) ou dossier d'installation }
function WebView2Installed: Boolean;
var
  pv: String;
begin
  Result :=
    (RegQueryStringValue(HKLM,
      'SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}',
      'pv', pv) and (pv <> '') and (pv <> '0.0.0.0')) or
    (RegQueryStringValue(HKCU,
      'SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}',
      'pv', pv) and (pv <> '') and (pv <> '0.0.0.0')) or
    DirExists(ExpandConstant('{commonpf64}\Microsoft\EdgeWebView\Application')) or
    DirExists(ExpandConstant('{commonpf32}\Microsoft\EdgeWebView\Application'));
end;

function NeedsWebView2: Boolean;
begin
  { false si le bootstrapper n'a pas pu etre telecharge a la construction }
  Result := (not WebView2Installed) and
            FileExists(ExpandConstant('{tmp}\WebView2RuntimeBootstrapper.exe'));
end;
