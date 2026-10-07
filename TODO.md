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
* Evolution Carte : travaille dans D:\VS Code\dcc-sheet
crée une branche "evol-draw-map"
je veux ajouter une nouvelle fonction pour dessiner une carte, éventuellement sur un fond d'image au format webp
Pour cela ajoute une icone "carte" à gauche de l'icone pour le choix du thème
quand je clique sur cet icone cela ouvre sur la totalité de l'écran une page permettant de dessiner une carte : je veux les mêmes fonctions que l'application D:\VS Code\draw-on-map
je peux pouvoir fermer cette fenêtre de dessin avec un clic sur une croix
cela doit absolument fonctionner sur PC et sur mobile.
par rapport à D:\VS Code\draw-on-map, voici les changements à appliquer :
- lorsque j'importe une image de fond, elle est stockée dans le dossier data/ avec un nom [UID].webp, UID étant un id unique généré automatiquement.
- le dessin est automatiquement sauvé en BD quand je le réalise, avec l'uid et le nom utilisateur de l'image de fond si elle est définie.
- le toast de sauvegarde doit être utilisé lors du dessin pour signifier qu'une sauvegarde a été réalisée
- le dessin peut être exporté / importé en JSON soit manuellement depuis l'application pour un calque de carte donné, soit pour l'intégralité des calques via l'export "exporter tout en json" / "importer tout en json". Les images de fond sont pas exportées si elles existent, dans ce cas là, on exporte un zip avec le json et les images de fond utilisées. "importer tout en json" permet d'importer soit un json complet, soit un zip au format de l'export (json + images)
- l'UID de chaque image doit être stocké en base et dans les exports / imports json
- lors d'un import, si l'image n'est pas retrouvée par son uid, on affiche un toast d'erreur et on n'affiche pas d'image de fond (on garde la grille par défaut)
- lorsque je supprime une carte, l'image de fond associée doit aussi être supprimée de data/
- si je ferme le module de dessin de carte et que je l'ouvre à nouveau, je feux retrouver les derniers outils / couleur sélectionnées, le niveau de zoom, la position dans la carte. Tout cela doit aussi être stocké en DB.
Fait une plan détaillé, une ou plusieurs maquette html, n'implémente pas encore dans l'application.


dis moi quelles captures d'écran je dois faire pour cette nouvelle fonctionnalité de cartes ?
