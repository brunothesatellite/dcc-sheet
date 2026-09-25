---
name: release
description: Execute le processus de release complet : MAJ docs, commit, push, tag et release GitHub
---

## Processus de release

Execute les etapes suivantes dans l'ordre :

0. **Mettre a jour README.md** avec les modifications de fonctionnalite et d'architecture depuis la derniere release
1. **Mettre a jour MANUAL.md** si nécessaire avec les modifications de fonctionnalites
2. **Mettre a jour JOURNAL.md** avec un horodatage pour la nouvelle section, avec ce qui a ete effectue depuis le dernier enregistrement
2.5. **Lancer les tests de non-regression** : `node tests/run.js` (ou `npm test`, ou `test.bat` sous Windows)
   - echec = corriger AVANT commit/push
   - si PHP est disponible, definir `PHP_BIN` pour activer aussi `php -l` (sinon SKIP)
3. **Commit et push** sur GitHub
4. **Build differentiel** — a executer **AVANT** de poser le tag : `deploy\build-diff.bat` (ou `powershell -NoProfile -ExecutionPolicy Bypass -File deploy\_build.ps1 -Diff`)
   - genere `deploy\dcc-sheet-diff\` (seuls les fichiers modifies/ajoutes depuis le dernier tag, exclusions du build appliquees) + `CHANGES.txt` (listes Modified/Added/Deleted ; les fichiers supprimes sont a retirer manuellement sur le serveur)
   - le tag source est detecte dynamiquement (`git describe --tags --abbrev=0`) : un lancement apres le tag produirait un dossier vide — d'ou l'ordre ici
   - le build complet reste `deploy\build.bat`
5. **Incrementer la version** (de 0.1 par defaut), demander confirmation du nouveau tag a l'utilisateur, puis poser le tag et generer une nouvelle release GitHub avec un changelog des evolutions et bugfix depuis la derniere release
   - le changelog (notes-file) doit inclure la **liste des fichiers modifies / ajoutes / supprimes** depuis l'ancien tag : `git diff --name-status <ancien-tag>`
