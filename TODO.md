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

1- dans l'onglet Equipe, section "Personnages en expédition", à gauche du bouton RAZ ajouter un bouton "INIT" permettant de tirer l'intiative de tous les personnages. pour chaque personnage cela remet à 0 le compteur de tour et remplit le champ "Init." avec une valeur d'initiative tirée aléatoirement selon la règle d'initiative de chaque personnage : celle ci est indiqué dans sa fiche de personnage, BLOC_COMMUN, section COMBAT, champ "initiative". Elle peut être exprimée sous la forme de +x, -x, 1d20+x, 1dY+x : si le dé n'est pas indiqué alors on tire un d20, sinon on tire le dé indiqué. On ajoute (ou soustrait) ensuite le modificateur indiqué dans le champ. Par exemple 1d20+2 = on tire un d20 et on ajoute 2. +3 : on tire un d20 et ajoute 30. 1d16-1 : on tire un d16 et on soustrait 1. Reformule.
  * **Codée le 03/11/2026 — NON COMMITTÉE** : plan `plan3/PLAN-INIT.md` (arbitrages validés : jet écrit dans **Init. combat** et non dans la colonne « Init. » = formule de la fiche, qui est resynchronisée à chaque retour sur l'onglet ; confirmation **seulement si** un jet ou un tour existe déjà). Codée dans `classes/equipe.js` (`parseInitiative` / `rollInitiative`, rng injectable) + `style.css` (`.btn-init`, `.table-actions` — les deux boutons sont **hors du tableau**, sur **une même ligne sous celui-ci justifiée à droite** : dans un pied de tableau, leur largeur minimale imposait celle de la table entière et le tableau débordait vers la droite en mobile) ; docs MANUAL § 8.1 et glossaire, README ; tests `25-init-expedition` (**80 contrôles**) inscrite dans `tests/run.js` — **3493/3493 OK, 13 skip**. Coquille « ajoute 30 » de la spec reformulée en **+3**.

2- dans l'onglet Equipe, section "ENNEMIS", ajout un bouton "d20" sur la même ligne que + AJOUTER - SUPPRIMER et RAZ, mais légèrement décalé pour ne pas cliquer par mégarde sur ces 3 boutons. Quand on clique sur "d20", cela affiche une bulle pendant quelques secondes avec un nombre aléatoire tiré entre 1 et 20 (valeurs incluses)

3- Dans l'onglet Niveau 0 : le bouton "+ NOUVEAU" doit demander combien de personnages doivent être tirés. Par défaut 1, maximum 20. Si on choisit 1 : comportement actuel (personnage tiré, immédiatement affiché, bouton "autre tirage", etc.). Si >1 : alors on tire automatiquement le nombre de personnages demandé, ils sont tous "à l'auberge". Reformule.

4- Fait un plan et une maquette HTML pour ajouter la possibilité de regrouper les personnages niveau 0 par escouade. L'objectif est de grouper des personnages de niveau 0 par groupes (escouades). Je veux pouvoir donner un nom à chaque escouade. Ce regoupement doit être aussi implémenté dans l'onglet Equipe pour les sections "personnages en expédition" et "statistiques". Cette notion d'escouade doit être persistée en DB (et import / export json). Propose une maquette indiquant le rendu mais aussi le mécanisme (workflow utilisateur) pour créer / modifier une escouade.
