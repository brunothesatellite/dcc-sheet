---
name: release
description: Execute le processus de release complet : MAJ docs, tests, commit, build des artefacts (installeur Windows, portable, zip webapp, APK Android), tag et release GitHub avec artefacts attaches
---

## Processus de release

Execute les etapes suivantes dans l'ordre :

0. **Mettre a jour README.md** avec les modifications de fonctionnalite et d'architecture depuis la derniere release
1. **Mettre a jour MANUAL.md** si nécessaire avec les modifications de fonctionnalites
2. **Mettre a jour JOURNAL.md** avec un horodatage pour la nouvelle section, avec ce qui a ete effectue depuis le dernier enregistrement
2.5. **Lancer les tests de non-regression** : `node tests/run.js` (ou `npm test`, ou `test.bat` sous Windows)
   - echec = corriger AVANT commit/push
   - si PHP est disponible, definir `PHP_BIN` pour activer aussi `php -l` (sinon SKIP)
3. **Commit et push** sur GitHub (les artefacts de l'etape 6 sont construits **apres** le push : ils doivent refleter le code pousse)
4. **Build differentiel** — a executer **AVANT** de poser le tag : `deploy\build-diff.bat` (ou `powershell -NoProfile -ExecutionPolicy Bypass -File deploy\_build.ps1 -Diff`)
   - genere `deploy\dcc-sheet-diff\` (seuls les fichiers modifies/ajoutes depuis le dernier tag, exclusions du build appliquees) + `CHANGES.txt` (listes Modified/Added/Deleted ; les fichiers supprimes sont a retirer manuellement sur le serveur)
   - le tag source est detecte dynamiquement (`git describe --tags --abbrev=0`) : un lancement apres le tag produirait un dossier vide — d'ou l'ordre ici
   - le build complet reste `deploy\build.bat`
5. **Determiner la nouvelle version** : incrementer la version (0.1 par defaut), demander confirmation du nouveau tag a l'utilisateur. **Ne poser le tag qu'a l'etape 7** — le build differentiel (etape 4) doit encore voir l'ancien tag, et les artefacts (etape 6) doivent exister avant de creer la release. Notation : `<v>` = version **sans** le « v » (ex. `v3.1` → `3.1`).
6. **Build des artefacts de release** — 4 fichiers attaches au release GitHub + 1 APK interne (voir 6.3). Aucun de ces fichiers n'est versionne par git (`.gitignore`) ; **echec a cette etape = STOP : ne poser ni tag ni release** (sauf demande explicite de l'utilisateur de continuer sans artefacts).

   **6.1 — Installeur Windows + version portable** (une seule commande produit les 2) :
   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File installeur\windows\build.ps1 -Version <v>
   ```
   - sorties : `installeur\windows\dist\dcc-sheet-setup-<v>.exe` (Inno Setup, per-user) **et** `installeur\windows\dist\dcc-sheet-portable-<v>.zip` (payload commun : `installeur\windows\package\`)
   - prerequis : .NET SDK 10, Inno Setup 6 (`ISCC.exe`), source PHP `D:\VS Code\servers\php` (`-PhpSource` sinon), reseau (restauration NuGet + telechargement du bootstrapper WebView2)
   - **verifications bloquantes internes** (echec = code != 0) : aucun `icons\dcc-pc-tokens` ni `icons\funnel-tokens` dans le payload, fichiers requis (`DccSheet.exe`, `php\php.exe`, `php\license.txt`, `php\php.ini`, `public\dcc-sheet\index.html`, `api\maps.php`, `api\map-image.php`), extensions `php -m` (gd, zip, sqlite3, mbstring), `public\dcc-spells-reader\` vide, `data\` inscriptible
   - **ne PAS utiliser `-SkipSetup`** en release (il faudrait l'installateur)
   - recette optionnelle mais recommandee : `powershell -File installeur\windows\recette.ps1` (controles : serveur 200, **assets css/js/svg servis**, `dcc-spells-reader` servi, **aucun 404 asset dans `php.log`**, fermeture, php du port 8089 tue, port libre)

   **6.2 — Zip webapp deployable sur un serveur** (complete, **sans les tokens**) :
   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File deploy\_build.ps1 -Zip -Version <v>
   ```
   - sortie : `deploy\dcc-sheet-webapp-<v>.zip` — la webapp complete, racine `dcc-sheet/` a extraire dans le web root du serveur ; meme exclusions que `deploy\build.bat` **+ `installeur\` + `icons\dcc-pc-tokens` + `icons\funnel-tokens`** (redistribution interdite, TODO E9) ; `data\` non incluse (creee au premier lancement)
   - **assertion bloquante interne** : code != 0 si un token subsiste dans le dossier a zipper
   - les entrees du zip sont creees avec `/` (compatibilite `unzip`/`tar` sous Linux — ne pas remplacer par `Compress-Archive`, qui produit des `\` sous Windows)
   - attention : `deploy\build.bat` (dossier pour le NAS, usage prive) **reste inchange et contient les tokens** — le zip de release, lui, n'en contient pas

   **6.3 — APK Android (DCC Sheet + DCC Contenu)** :
   ```powershell
   # APK DCC Sheet (4e artefact attache a la release)
   powershell -NoProfile -ExecutionPolicy Bypass -File installeur\android\_build-android.ps1 -Version <v>
   # APK Conteneur de contenu (interne : JAMAIS attache, JAMAIS partage)
   powershell -NoProfile -ExecutionPolicy Bypass -File installeur\android-content\_build-content.ps1 -Version <vc>
   ```
   - sorties : `installeur\android\dist\dcc-sheet-<v>-android.apk` (**attache**, 4e artefact) et `installeur\android\dist\dcc-sheet-content-<vc>-android.apk` (**interne** : `<vc>` = version propre du conteneur, numerotation independante de la release, ex. `1.1`)
   - **l'APK Conteneur reste dans `installeur\android\dist\`** (dossier ignore par git) : il contient les tokens `dcc-pc-tokens` / `funnel-tokens` a **redistribution interdite** (E9) et n'est que pour l'appareil personnel de l'utilisateur — ne jamais l'attacher a la release GitHub ni le partager
   - prerequis : Android SDK (`ANDROID_HOME`), JDK d'Android Studio, keystore local `installeur\android\keystore\dcc-sheet.keystore` (alias `dcc-store`) — **A CONSERVER** : la meme cle signe les 2 APK (il faut pouvoir reinstaller le conteneur par-dessus)
   - chaque build resynchronise les assets avec **assertions bloquantes** (`_sync-assets.mjs` : aucun token `BANNED` dans l'APK DCC Sheet ; `_sync-content.mjs` : tokens + grimoire presents pour le conteneur), puis `assembleRelease` + signature `apksigner`
   - **ne JAMAIS lancer 2 builds gradle en parallele** : les deux projets partagent le meme cache Gradle (verrous) → echec ou timeout ; executer l'un apres l'autre
   - icone des 2 applications : `installeur\android\make-android-icons.ps1` (a relancer **seulement** si `favicon.svg` change ; meme dessin que l'app Windows, PNG plein cadre + calque adaptatif + `mipmap-anydpi-v26`)
   - l'APK DCC Sheet est utilisable **seul** : sans conteneur, tokens et grimoire replient proprement (403/404) — le test device n'est pas requis pour builder (seul `adb install -r` demande un appareil)

   **6.4 — Verifications avant attachement** :
   ```powershell
   # les 4 fichiers attaches existent et ont une taille non nulle
   foreach ($f in @('installeur\windows\dist\dcc-sheet-setup-<v>.exe',
                    'installeur\windows\dist\dcc-sheet-portable-<v>.zip',
                    'deploy\dcc-sheet-webapp-<v>.zip',
                    'installeur\android\dist\dcc-sheet-<v>-android.apk')) {
     if (-not (Test-Path $f) -or (Get-Item $f).Length -eq 0) { Write-Host "MANQUANT : $f" -ForegroundColor Red; exit 1 }
   }
   # l'APK Conteneur existe (interne, non attache)
   if (-not (Test-Path "installeur\android\dist\dcc-sheet-content-<vc>-android.apk")) { Write-Host "MANQUANT : APK conteneur" -ForegroundColor Red; exit 1 }
   # aucun token dans les 2 zip ET dans l'APK DCC Sheet (un APK est aussi un zip : entrees sous assets/)
   Add-Type -AssemblyName System.IO.Compression
   Add-Type -AssemblyName System.IO.Compression.FileSystem
   foreach ($z in @('installeur\windows\dist\dcc-sheet-portable-<v>.zip',
                    'deploy\dcc-sheet-webapp-<v>.zip',
                    'installeur\android\dist\dcc-sheet-<v>-android.apk')) {
     $a = [IO.Compression.ZipFile]::OpenRead((Resolve-Path $z))
     $leak = $a.Entries | Where-Object { $_.FullName -match 'dcc-pc-tokens|funnel-tokens' }
     $a.Dispose()
     if ($leak) { Write-Host "TOKENS INTERDITS dans $z" -ForegroundColor Red; exit 1 }
   }
   ```
   - l'installateur est couvert par les verifications internes de `build.ps1`
   - tout echec ici = STOP avant le tag

7. **Poser le tag et generer la release GitHub avec les 4 artefacts attaches**
   - poser le tag : `git tag -a v<v> -m "Release v<v>"` puis `git push origin v<v>`
   - le changelog (notes-file) doit inclure la **liste des fichiers modifies / ajoutes / supprimes** depuis l'ancien tag : `git diff --name-status <ancien-tag>` + un paragraphe sur les 4 artefacts (tailles, contenu)
   - **encodage des notes — PIEGE PowerShell 5.1** : ne JAMAIS ecrire `notes.md` avec une redirection `>` (la sortie UTF-8 de `gh` est alors decodee avec la console OEM — CP850 sur Windows FR — d'ou des accents mojibake publies : `ecrire` → `Ǹcrire`, `—` → `ÔÇö`). Toujours :
     1. lire le corps/existing via `Invoke-RestMethod` (.NET, pas de console) ;
     2. ecrire le fichier via `[IO.File]::WriteAllText($path, $texte, (New-Object System.Text.UTF8Encoding($false)))` ;
     3. **verifier les accents APRES publication** : relecture API + recherche d'U+251C / U+FFFD dans le corps publie.
     Correction si mojibake : encoder la chaine corrompue avec `Encoding.GetEncoding(850)` puis decoder en UTF-8, puis `gh release edit <tag> --notes-file <fichier>` (depuis la racine du repo).
   - creer la release **avec les pieces jointes** (chemins relatifs a la racine du repo, `gh` authentifie — verifier avec `gh auth status`) :
     ```powershell
     gh release create v<v> --title "v<v>" --notes-file <notes.md> `
       "installeur/windows/dist/dcc-sheet-setup-<v>.exe" `
       "installeur/windows/dist/dcc-sheet-portable-<v>.zip" `
       "deploy/dcc-sheet-webapp-<v>.zip" `
       "installeur/android/dist/dcc-sheet-<v>-android.apk"
     ```
   - **L'APK Conteneur (`dcc-sheet-content-…`) ne doit JAMAIS figurer parmi les assets** : tokens a redistribution interdite. Il reste en local dans `installeur\android\dist\`, sans publication.
   - **verifier** ensuite : `gh release view v<v> --json assets` → **4 assets**, tailles non nulles ; un asset manquant = release incomplete → le re-uploader : `gh release upload v<v> <fichier> --clobber`
   - en cas d'absence de `gh` : creer la release via l'API/web puis joindre les 4 fichiers manuellement, et le signaler a l'utilisateur

## Artefacts d'une release

| Fichier | Cible | Contenu |
|---|---|---|
| `dist/dcc-sheet-setup-<v>.exe` | PC Windows 10/11 | installateur per-user (app .NET + PHP + webapp) |
| `dist/dcc-sheet-portable-<v>.zip` | PC Windows 10/11 | idem, a dezipper dans un dossier inscriptible |
| `deploy/dcc-sheet-webapp-<v>.zip` | serveur web (Linux/NAS) | webapp complete, racine `dcc-sheet/`, **sans tokens DCC** |
| `installeur/android/dist/dcc-sheet-<v>-android.apk` | Android 8+ (API 26) | APK signe, webapp embarquee, **sans tokens DCC** |

Hors release (jamais attache) : `installeur/android/dist/dcc-sheet-content-<vc>-android.apk` — APK conteneur de contenu **strictement personnel** (tokens `dcc-pc-tokens` / `funnel-tokens` + grimoire, redistribution interdite E9).

Detail technique de l'application Windows : `installeur/windows/README.md`.
