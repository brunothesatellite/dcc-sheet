---
name: release
description: Execute le processus de release complet : MAJ docs, tests, commit, build des artefacts (installeur Windows, portable, zip webapp), tag et release GitHub avec artefacts attaches
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
5. **Determiner la nouvelle version** : incrementer la version (0.1 par defaut), demander confirmation du nouveau tag a l'utilisateur. **Ne poser le tag qu'a l'etape 7** — le build differentiel (etape 4) doit encore voir l'ancien tag, et les artefacts (etape 6) doivent exister avant de creer la release.
6. **Build des 3 artefacts de release** — version = tag sans le « v » (ex. `3.1.0` pour `v3.1.0`). Aucun de ces fichiers n'est versionne par git (`.gitignore`) ; **echec a cette etape = STOP : ne poser ni tag ni release** (sauf demande explicite de l'utilisateur de continuer sans artefacts).

   **6.1 — Installeur Windows + version portable** (une seule commande produit les 2) :
   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File installeur\windows\build.ps1 -Version 3.1.0
   ```
   - sorties : `installeur\windows\dist\dcc-sheet-setup-3.1.0.exe` (Inno Setup, per-user) **et** `installeur\windows\dist\dcc-sheet-portable-3.1.0.zip` (payload commun : `installeur\windows\package\`)
   - prerequis : .NET SDK 10, Inno Setup 6 (`ISCC.exe`), source PHP `D:\VS Code\servers\php` (`-PhpSource` sinon), reseau (restauration NuGet + telechargement du bootstrapper WebView2)
   - **verifications bloquantes internes** (echec = code != 0) : aucun `icons\dcc-pc-tokens` ni `icons\funnel-tokens` dans le payload, fichiers requis (`DccSheet.exe`, `php\php.exe`, `php\license.txt`, `php\php.ini`, `public\dcc-sheet\index.html`, `api\maps.php`, `api\map-image.php`), extensions `php -m` (gd, zip, sqlite3, mbstring), `public\dcc-spells-reader\` vide, `data\` inscriptible
   - **ne PAS utiliser `-SkipSetup`** en release (il faudrait l'installateur)
   - recette optionnelle mais recommandee : `powershell -File installeur\windows\recette.ps1` (controles : serveur 200, **assets css/js/svg servis**, `dcc-spells-reader` servi, **aucun 404 asset dans `php.log`**, fermeture, php du port 8089 tue, port libre)

   **6.2 — Zip webapp deployable sur un serveur** (complete, **sans les tokens**) :
   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File deploy\_build.ps1 -Zip -Version 3.1.0
   ```
   - sortie : `deploy\dcc-sheet-webapp-3.1.0.zip` — la webapp complete, racine `dcc-sheet/` a extraire dans le web root du serveur ; meme exclusions que `deploy\build.bat` **+ `installeur\` + `icons\dcc-pc-tokens` + `icons\funnel-tokens`** (redistribution interdite, TODO E9) ; `data\` non incluse (creee au premier lancement)
   - **assertion bloquante interne** : code != 0 si un token subsiste dans le dossier a zipper
   - les entrees du zip sont creees avec `/` (compatibilite `unzip`/`tar` sous Linux — ne pas remplacer par `Compress-Archive`, qui produit des `\` sous Windows)
   - attention : `deploy\build.bat` (dossier pour le NAS, usage prive) **reste inchange et contient les tokens** — le zip de release, lui, n'en contient pas

   **6.3 — Verifications avant attachement** :
   ```powershell
   # les 3 fichiers existent et ont une taille non nulle
   foreach ($f in @('installeur\windows\dist\dcc-sheet-setup-3.1.0.exe',
                    'installeur\windows\dist\dcc-sheet-portable-3.1.0.zip',
                    'deploy\dcc-sheet-webapp-3.1.0.zip')) {
     if (-not (Test-Path $f) -or (Get-Item $f).Length -eq 0) { Write-Host "MANQUANT : $f" -ForegroundColor Red; exit 1 }
   }
   # aucun token dans les 2 zip (l'installateur est couvert par build.ps1)
   Add-Type -AssemblyName System.IO.Compression
   Add-Type -AssemblyName System.IO.Compression.FileSystem
   foreach ($z in @('installeur\windows\dist\dcc-sheet-portable-3.1.0.zip', 'deploy\dcc-sheet-webapp-3.1.0.zip')) {
     $a = [IO.Compression.ZipFile]::OpenRead((Resolve-Path $z))
     $leak = $a.Entries | Where-Object { $_.FullName -match 'dcc-pc-tokens|funnel-tokens' }
     $a.Dispose()
     if ($leak) { Write-Host "TOKENS INTERDITS dans $z" -ForegroundColor Red; exit 1 }
   }
   ```
   - tout echec ici = STOP avant le tag

7. **Poser le tag et generer la release GitHub avec les 3 artefacts attaches**
   - poser le tag : `git tag -a v3.1.0 -m "Release v3.1.0"` puis `git push origin v3.1.0`
   - le changelog (notes-file) doit inclure la **liste des fichiers modifies / ajoutes / supprimes** depuis l'ancien tag : `git diff --name-status <ancien-tag>` + un paragraphe sur les 3 artefacts (tailles, contenu)
   - creer la release **avec les pieces jointes** (chemins relatifs a la racine du repo, `gh` authentifie — verifier avec `gh auth status`) :
     ```powershell
     gh release create v3.1.0 --title "v3.1.0" --notes-file <notes.md> `
       "installeur/windows/dist/dcc-sheet-setup-3.1.0.exe" `
       "installeur/windows/dist/dcc-sheet-portable-3.1.0.zip" `
       "deploy/dcc-sheet-webapp-3.1.0.zip"
     ```
   - **verifier** ensuite : `gh release view v3.1.0 --json assets` → 3 assets, tailles non nulles ; un asset manquant = release incomplete → le re-uploader : `gh release upload v3.1.0 <fichier> --clobber`
   - en cas d'absence de `gh` : creer la release via l'API/web puis joindre les 3 fichiers manuellement, et le signaler a l'utilisateur

## Artefacts d'une release

| Fichier | Cible | Contenu |
|---|---|---|
| `dist/dcc-sheet-setup-<v>.exe` | PC Windows 10/11 | installateur per-user (app .NET + PHP + webapp) |
| `dist/dcc-sheet-portable-<v>.zip` | PC Windows 10/11 | idem, a dezipper dans un dossier inscriptible |
| `deploy/dcc-sheet-webapp-<v>.zip` | serveur web (Linux/NAS) | webapp complete, racine `dcc-sheet/`, **sans tokens DCC** |

Detail technique de l'application Windows : `installeur/windows/README.md`.
