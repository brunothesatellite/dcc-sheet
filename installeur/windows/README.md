# Installeur Windows — DCC Sheet

Livrables produits à partir de ce dossier :

| Livrable | Description |
|---|---|
| `dist\dcc-sheet-setup-<v>.exe` | Installateur Inno Setup, **per-user** (pas d'admin, `{localappdata}\Programs\dcc-sheet`) |
| `dist\dcc-sheet-portable-<v>.zip` | Version **portable** : dézipper dans un dossier inscriptible, lancer `DccSheet.exe`, données dans le dossier, dossier déplaçable |

## Prérequis de build

- .NET SDK 10 (LTS) — `dotnet --version` ≥ 10.0
- Inno Setup 6 (ISCC.exe) — détecté automatiquement (`Program Files (x86)` ou `%LOCALAPPDATA%\Programs\Inno Setup 6`)
- PHP source : `D:\VS Code\servers\php` (PHP 8.2.33 x64 VC19) — surchargeable avec `-PhpSource`
- Connexion internet au 1ᵉʳ build : restauration NuGet (WebView2) + téléchargement du bootstrapper WebView2

## Construction

```powershell
# Les deux livrables
powershell -NoProfile -ExecutionPolicy Bypass -File build.ps1

# Zip portable seulement (sans Inno Setup ni bootstrapper)
powershell -NoProfile -ExecutionPolicy Bypass -File build.ps1 -SkipSetup

# Autre version / autre source PHP
powershell -NoProfile -ExecutionPolicy Bypass -File build.ps1 -Version 3.1.0 -PhpSource "D:\autre\php"
```

Icône régénérée depuis les formes du `favicon.svg` :

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File make-icon.ps1
```

## Validation

```powershell
# Recette fonctionnelle (10 contrôles) : serveur 200, assets css/js/svg servis,
# dcc-spells-reader latéral, fermeture propre, PHP du port 8089 tué, port libre,
# puis analyse de php.log : la WebView2 a réellement chargé les assets sous
# /dcc-sheet/ et aucun 404 js/css/svg (recette sur package\ ou sur un zip extrait
# avec -Package)
powershell -NoProfile -ExecutionPolicy Bypass -File recette.ps1

# Recette visuelle : lance l'app, attend le rendu, capture la fenêtre en PNG et
# échoue si un « bandeau d'attente » résiduel (120 px de navy vide au-dessus de
# la page) est détecté. Capture : %TEMP%\dcc-capture.png
powershell -NoProfile -ExecutionPolicy Bypass -File capture.ps1
```

## Architecture

```
DccSheet.Desktop/          application .NET 10 WinForms (self-contained single-file)
  Program.cs               instance unique (mutex) + hooks d'arrêt de PHP
  MainForm.cs              écran d'attente → serveur → WebView2 → navigation
  PhpServer.cs             php.exe -S 127.0.0.1:8089 -t public (arrêt idempotent)
  app.manifest             asInvoker (per-user), DPI PerMonitorV2
package/                   payload commun des 2 livrables (jetable, .gitignore)
  DccSheet.exe             ~90 Mo, auto-contenu (WebView2 embarqué)
  php\                     PHP 8.2.33 x64 copié de D:\VS Code\servers\php
                           + php.ini (gd, zip, sqlite3, mbstring) + license.txt
  public\
    dcc-sheet\             application web (index.html, api\, js\, css\, icons\)
      data\                base SQLite (vide au ship)
    dcc-spells-reader\     dossier latéral vide → http://127.0.0.1:8089/dcc-spells-reader
setup\dcc-sheet.iss        script Inno Setup
```

## Cycle de vie de l'application

1. **Démarrage** : contrôle d'écriture de `data\`, détection WebView2, `php.exe -S 127.0.0.1:8089 -t public`
   (working directory = racine de l'app), attente de la réponse HTTP (poll 200 ms, 20 s max),
   puis WebView2 navigate sur `http://127.0.0.1:8089/dcc-sheet/`.

> **Slash final obligatoire** : `php -S` repond 200 (index) sur `/dcc-sheet` **sans** rediriger ; l'URL de base serait alors `/` et toutes les references relatives (`style.css`, `*.js`, `favicon.svg`) renverraient 404. `index.html` contient en plus un garde-fou qui redirige vers `…/dcc-sheet/` si la page est ouverte sans slash (test manuel dans un navigateur).
2. **Fermeture** : PHP est tué (arbre de processus), idempotent, via `FormClosing` +
   `Application.ApplicationExit` + `AppDomain.ProcessExit`.
3. **Port occupé** : si `/dcc-sheet` répond déjà → on l'utilise ; si le port est pris par un autre
   programme → message clair et sortie.

## Vérifications bloquantes au build

Le build **échoue** si :

- un fichier ou dossier `dcc-pc-tokens` ou `funnel-tokens` est présent dans le payload
  (~25 Mo de tokens **non redistribuables** — voir `TODO.md` E9) ;
- un fichier requis manque (`DccSheet.exe`, `php\php.exe`, `php\license.txt`, `php\php.ini`,
  `public\dcc-sheet\index.html`, `api\maps.php`, `api\map-image.php`) ;
- les extensions PHP `gd`, `zip`, `sqlite3`, `mbstring` ne sont pas chargées (`php -m`) ;
- `public\dcc-spells-reader\` n'est pas vide ;
- `data\` n'est pas inscriptible.

## Notes de licence

- .NET / WebView2 SDK : MIT — Inno Setup : licence permissive — PHP : PHP License 3.01
  (`php\license.txt` conservé) — VC++ Redistributable : redistribuable (audit `license-compliance`).
- PHP x64 VC19 réclame le **Visual C++ Redistributable** (contrôle `msvcp140.dll`,
  `vcruntime140.dll`, `vcruntime140_1.dll` au démarrage).
- Le bootstrapper WebView2 est téléchargé à la construction (licence Microsoft, Evergreen).

## Installation du WebView2 Runtime

L'installeur détecte le runtime (clé `EdgeUpdate\Clients\{F3017226-…}` machine/utilisateur ou
dossier `Microsoft\EdgeWebView\Application`). Si absent, il lance le bootstrapper Evergreen
(`/silent /install`, connexion internet requise). À défaut, l'application affiche un message avec
le lien de téléchargement.
