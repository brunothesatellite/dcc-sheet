**TODO**
* N/A

**BUGS**
*Critique*
* N/A


*Majeur*
**Mage & Elfe — supprimer un sort peut le faire réapparaître (auto-save comprise)**
  * **Symptôme** : supprimer le **dernier** sort de la fiche ne change rien à l'affichage — la ligne « vierge » recréée contient le sort qu'on vient de supprimer (loupe comprise) ; supprimer un sort puis cliquer sur **+ Ajouter un sort** fait réapparaître le sort supprimé. Comme la sauvegarde lit le DOM, **les clés repartent en base** : la suppression pourtant confirmée par la popup est annulée silencieusement.
  * **Cause** : `_spellRowHTML(charId, n, k, v)` préremplit la ligne créée avec `v(...)`, or `v` lit `data` = snapshot des données **au chargement** (les saisies vont dans le DOM, jamais dans `data`). L'index vient de `getNextIndex()` = `max(lignes) + 1` : vide tant qu'il est inconnu de `data`, mais il **réutilise l'index de la ligne supprimée** (dernière ligne supprimée → `rows.length === 0` → index 1, ou 3 côté Elfe ; ou suppression puis ajout aussitôt).
  * **Emplacements** : `classes/mage.js` — `deleteSpell` L215, `addSpell` L225, `_spellRowHTML` L245 ; `classes/elfe.js` — `deleteSpell` L228, `addSpell` L238, `_spellRowHTML` L258. Les lignes fixes de l'Elfe (1-2) ne sont pas concernées (pas de `data-spell`). Portée : `sort_nom_N`, `sort_niveau_N`, `sort_test_N` **et** `sort_effet_N`.
  * **Non détecté jusqu'ici** : un ajout **sans** suppression préalable vaut `max+1` = index inconnu de `data` → `''` → comportement normal ; il faut supprimer le dernier sort, ou supprimer + ajouter aussitôt.
  * **Correctif prévu (non appliqué)** : ne plus passer `v` à `_spellRowHTML` — une ligne créée à la demande doit être vide (`value=""` + `spellLookup('spell', true)`), variante `() => ''` ; le rendu initial, lui, garde bien `v`. Déjà corrigé côté **Clerc** en passant à `_spellRowHTML(charId, n, k)` sans `v` (refonte table, `tests/14-clerc-sorts.test.js` : « suppression annulée / ligne recréée vierge »).
  * **Tests à ajouter** : supprimer le dernier sort → ligne vierge réellement vide ; supprimer puis ré-ajouter → aucun contenu fantôme (mage, elfe).

*Mineur*
* N/A


**EVOLUTIONS**
* évolution pour afficher du contenu optionnel :
- ~~si le dossier dcc-spells-reader\contentref est disponible à côté de l'application déployée (webapp, windows) ou inclus dans dcc-content.apk, alors :~~ — **codé le 15/10** (`evol-reference`, **non committé** en attente de validation) :
* ~~ajouter une nouvelle entrée "Référence" dans le menu utilisateur et un bouton "Référence complète" avec icone dédiée uniquement en mode PC (non mobile) à gauche du bouton "Référence des classes".~~ Fait : entrée « Référence » (icône livre + lignes) au-dessus de « Classes », bouton `#btn-ref-full` (icône A validée) avant `#btn-aide`, masqué ≤ 600 px
* ~~Lorsque je clique sur ce nouveau bouton ou sur l'entrée du menu, cela affiche en plein écran (comme pour l'affichage de résumé des classes" les pages de dcc-spells-reader\contentref avec le sommaire en premier, cliquable pour accéder plus rapidement aux pages, et toutes les pages affichées en mode parchemin infini (même mécanisme et cache que pour l'affichage de la totalité des sorts)~~ Fait : `ref-reader.js` réutilise `openViewer` exposé par `aide-classes.js` (R5) + sommaire `DCC_REF_TOC` (sections cliquables, repli « Page n ») + parchemin infini 4..61 (seuil 800 px, batch 3, préchargement p-2..p+5)
* ~~tout le contenu contentref ne doit pas être poussé dans les artefacts…, par contre met à jour gen-spell-content.bat et dcc-content.apk…~~ Fait : zip minimal 274 fichiers (+60 contentref) et sync `_sync-content.mjs` (assertions anchors-ref/toc/60) ; aucun changement Java (allowlist déjà en place)
- **Compatibilité ajoutée** : `contentref` absent (ancien contenu avec seulement `content/`) → bouton + entrée invisibles, **aucune erreur console ni toast**, les sorts continuent seuls (détection indépendante, classe `html.has-ref-reader`)
- Tests : suite `24-ref-reader` (55 contrôles) ; **3354/3354, 1 skip**
- **Correctifs post-essai terrain (15/10)** : page 4 (sommaire imprimé du livre) **plus jamais affichée** — redondante avec le sommaire cliquable (plage 5…61) ; clic sur une entrée du sommaire **déjà chargée** : défilement vers le noeud existant (avant : rien ne se passait, aléatoire selon le préchargement) ; libellés du sommaire en **numéro de page scan** (celui de l'en-tête « Page N ») au lieu du numéro imprimé du livre (décalage d'unité par endroits → fausse impression de « mauvaise page ») ; garde anti-course : deux clics rapprochés → seul le dernier fait défiler
- Bruno : bug des anchors encore présent parfois et random behavior sur ouverture de la référence, ça affiche une page au hasard.