**TODO**
* N/A

**BUGS**
*Critique*
* N/A


*Majeur*
* **Mage & Elfe — supprimer un sort peut le faire réapparaître (auto-save comprise)**
  * **Symptôme** : supprimer le **dernier** sort de la fiche ne change rien à l'affichage — la ligne « vierge » recréée contient le sort qu'on vient de supprimer (loupe comprise) ; supprimer un sort puis cliquer sur **+ Ajouter un sort** fait réapparaître le sort supprimé. Comme la sauvegarde lit le DOM, **les clés repartent en base** : la suppression pourtant confirmée par la popup est annulée silencieusement.
  * **Cause** : `_spellRowHTML(charId, n, k, v)` préremplit la ligne créée avec `v(...)`, or `v` lit `data` = snapshot des données **au chargement** (les saisies vont dans le DOM, jamais dans `data`). L'index vient de `getNextIndex()` = `max(lignes) + 1` : vide tant qu'il est inconnu de `data`, mais il **réutilise l'index de la ligne supprimée** (dernière ligne supprimée → `rows.length === 0` → index 1, ou 3 côté Elfe ; ou suppression puis ajout aussitôt).
  * **Emplacements** : `classes/mage.js` — `deleteSpell` L215, `addSpell` L225, `_spellRowHTML` L245 ; `classes/elfe.js` — `deleteSpell` L228, `addSpell` L238, `_spellRowHTML` L258. Les lignes fixes de l'Elfe (1-2) ne sont pas concernées (pas de `data-spell`). Portée : `sort_nom_N`, `sort_niveau_N`, `sort_test_N` **et** `sort_effet_N`.
  * **Non détecté jusqu'ici** : un ajout **sans** suppression préalable vaut `max+1` = index inconnu de `data` → `''` → comportement normal ; il faut supprimer le dernier sort, ou supprimer + ajouter aussitôt.
  * **Correctif prévu (non appliqué)** : ne plus passer `v` à `_spellRowHTML` — une ligne créée à la demande doit être vide (`value=""` + `spellLookup('spell', true)`), variante `() => ''` ; le rendu initial, lui, garde bien `v`. Déjà corrigé côté **Clerc** en passant à `_spellRowHTML(charId, n, k)` sans `v` (refonte table, `tests/14-clerc-sorts.test.js` : « suppression annulée / ligne recréée vierge »).
  * **Tests à ajouter** : supprimer le dernier sort → ligne vierge réellement vide ; supprimer puis ré-ajouter → aucun contenu fantôme (mage, elfe).

*Mineur*
* N/A


**EVOLUTIONS**
* Evolution Carte : **implémentée le 07/10/2026** (branche `evol-draw-map`) — module de dessin plein écran (icône « carte » de la topbar), images de fond webp en `data/maps/[UID].webp`, sauvegarde auto + toast 💾, reprise outil/couleur/zoom/position, export/import JSON ou ZIP (par calque et global), limite de 10 cartes, grille infinie, réglette de zoom PC. Voir `plan1/PLAN-CARTE.md` (plan + décisions D1-D18), `plan1/maquettes/` (maquettes validées) et `JOURNAL.md` (7 octobre 2026).
  * Reste à faire : **2 captures d'écran sur 11** (liste complète : `plan1/PLAN-CARTE.md` § 18) :
    * `captures/carte-limite-10.png` — message « Limite de 10 cartes atteinte… » (D12) ;
    * `captures/carte-import-erreur-uid.png` — toast « Image de fond introuvable (UID …) » (R11) ;
    * les deux `<img>` correspondants sont **retirés de `MANUAL.md`** (§ 9) et sont à réintégrer au moment de les ajouter dans `captures/`.
  * Vérification visuelle sur PC + mobile.


dis moi quelles captures d'écran je dois faire pour cette nouvelle fonctionnalité de cartes ?
