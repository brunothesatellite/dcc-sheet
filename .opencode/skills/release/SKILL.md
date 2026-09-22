---
name: release
description: Execute le processus de release complet : MAJ docs, commit, push, tag et release GitHub
---

## Processus de release

Execute les etapes suivantes dans l'ordre :

1. **Mettre a jour README.md** avec les modifications de fonctionnalite et d'architecture depuis la derniere release
2. **Mettre a jour JOURNAL.md** avec un horodatage pour la nouvelle section, avec ce qui a ete effectue depuis le dernier enregistrement
3. **Commit et push** sur GitHub
4. **Incrementer la version** (de 0.1 par defaut), demander confirmation du nouveau tag a l'utilisateur, puis poser le tag et generer une nouvelle release GitHub avec un changelog des evolutions et bugfix depuis la derniere release
