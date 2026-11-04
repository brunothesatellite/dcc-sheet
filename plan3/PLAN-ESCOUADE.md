# PLAN — Évolution #4 « Escouades » (Niveau 0 + onglet Équipe)

> **Spec source** : `TODO.md` § EVOLUTIONS — **4** (regrouper les personnages niveau 0 par
> escouade **nommée**, étendu à l'onglet Équipe sections **Personnages en expédition** et
> **Statistiques**, **persisté en DB et dans l'export/import JSON**, avec **plan + maquette
> HTML** proposant le rendu **et le workflow utilisateur**).
> **Restriction validée par Bruno le 03/11/2026** : **l'escouade ne concerne QUE les
> personnages de niveau 0** — jamais un niv.1+ ; à la **promotion**, le perso **sort** de son
> escouade.
> **Arbitrages validés le 03/11/2026** (§ 2) : **S1** stockage dans le JSON du perso,
> **S2** modale de gestion + sélecteur sur les cartes, **S3** groupes avec en-tête et
> « Sans escouade » en dernier, **S4** en-têtes de groupe entre les lignes des deux tableaux
> Équipe, **S5** niv.1+ **d'abord** dans les tableaux Équipe, **S6** bandeaux Équipe
> **conditionnels** (≥ 1 escouade représentée), **S7** libellé **« Hors escouade »**.
> **Statut** : **implémentée le 04/11/2026** — code + tests (`27-squads`, 137 contrôles) +
> docs (MANUAL § 4.9 / 8.1 / 8.3b / glossaire, README, JOURNAL) sur la branche `evol-escouade`.
> Historique : **plan + maquette livrés, aucun code** — l'implémentation n'est engagée qu'après
> validation du rendu (maquette) par Bruno.

**Livrables de cette évolution** : le présent plan + `plan3/maquette-escouade.html`
(ouvrable directement dans un navigateur, sans serveur).

---

## 1. Reformulation de la spec

| # | Exigence (formulation retenue) |
|---|-------------------------------|
| **R1** | **Onglet Niveau 0 uniquement** : les personnages de niveau 0 se regroupent par **escouade nommée** (nom libre, unique après trim, comparaison **insensible à la casse**). **Aucun personnage de niveau 1 ou plus n'est éligible.** |
| **R2** | **Créer / modifier une escouade** doit être possible : **workflow explicite** documenté dans la maquette (nommer, affecter/désaffecter, renommer, supprimer). |
| **R3** | **Onglet Équipe** : les **mêmes bandeaux** segmentent les sections **« Personnages en expédition »** et **« Statistiques »** — mais **uniquement autour des lignes lvl0** (les niv.1+ ne peuvent pas avoir d'escouade). |
| **R4** | **Persistance** : l'escouade vit en base **et** voyage dans l'**export / import JSON** (aller-retour sans perte). |
| **R5** | **Tous les persos restent visibles** : les lvl0 sans escouade sont réunis dans un groupe **« Sans escouade »** (liste : en **dernier** ; Équipe : après les groupes). |
| **R6** | **Aucune régression** : tri actifs/inactifs puis `updated_at`, interrupteur expédition/auberge, clic carte = fiche, dépli détail (Équipe), min/max des stats, promotion lvl0, tirage multiple, **ordre actuel des tableaux Équipe**. |
| **R7** | **Mobile (≤ 600 px)** : bandeaux et sélecteur restent utilisables (pas de débordement horizontal). |
| **R8** | **Livrable** = plan + maquette HTML montrant le **rendu** et le **mécanisme (workflow utilisateur)** — pas d'implémentation dans ce jalon. |
| **R9** | Le nom d'escouade est de la **donnée utilisateur** : jamais interprété (ni HTML, ni requête SQL concaténée). |
| **R10** | **Promotion lvl0 → niv.1** : le perso **sort définitivement de son escouade** (`escouade` supprimée du `data` promu). |
| **R11** | **Impossible d'ajouter un niv.1+** à une escouade : ni depuis une carte (le sélecteur n'existe que sur les cartes lvl0), ni depuis la modale (elle ne liste que des lvl0), ni par donnée importée (un `data.escouade` porté par un niv.1+ est **ignoré à l'affichage**, jamais migré). |

---

## 2. Arbitrages (validés le 03/11/2026)

| # | Sujet | Décision retenue | Alternatives rejetées |
|---|-------|------------------|----------------------|
| **S0** | **Périmètre** | **Escouade = notion lvl0 exclusive** (R1, R10, R11). | *Escouade toutes classes* (spec initiale) — **restreinte par Bruno** : un perso promu sort de son escouade, les niv.1+ ne sont pas éligibles. |
| **S1** | **Persistance** | **Champ `escouade` dans le JSON du perso** (`characters.data.escouade`, nom de l'escouade ; `''` ou absent = sans escouade). | *Colonne SQL* : renommage en 1 `UPDATE`, mais export, import et promotion sont à câbler partout. *Table `escouades` + `escouade_id`* : entité complète, mais nouvel endpoint, clé étrangère, export dédié. |
| **S2** | **Workflow** | **Deux entrées** : (a) bouton **« Escouades »** dans l'en-tête de la liste Niveau 0 → **modale de gestion** (créer avec ses membres, renommer, supprimer, effectif) ; (b) **sélecteur** sur **chaque carte lvl0** (« Escouade : — / Alpha / … / + Nouvelle… »). | *Modale seule* : attribution lente dès 20+ persos. *Drag & drop* : lourd et fragile en mobile. |
| **S3** | **Rendu liste Niveau 0** | **Un bandeau par escouade** suivi de ses cartes, **ordre alphabétique**, **« Sans escouade » en dernier** ; tri interne **inchangé** (actifs d'abord, puis `updated_at` décroissant). | *Ordre manuel des groupes* : ordre persisté en plus — reporté. *Liste plate + filtre* : pas d'vue d'ensemble. |
| **S4** | **Équipe : habillage** | **Bandeau de séparation (ligne `colspan`) par groupe** dans les **deux** tableaux, lignes de données **strictement inchangées**. | *Sous-total par escouade dans Statistiques* : alourdit le tableau, pose la question du périmètre du min/max. |
| **S5** | **Équipe : ordre** | **Niv.1+ d'abord** (bloc unique), **puis les groupes lvl0** (alpha), **puis lvl0 « Sans escouade »**. | *Groupes lvl0 d'abord* : le gros de l'équipe passe derrière. *Ordre actuel préservé + bandeaux locaux* : un groupe peut être **coupé au milieu** du tableau. **Note** : `CLASSES` finit par `'lvl0'` et les listes sont concaténées dans cet ordre → **S5 reproduit exactement l'ordre actuel** quand aucun bandeau ne s'affiche. |
| **S6** | **Équipe : déclenchement** | Les bandeaux **ne s'affichent que s'il existe au moins une escouade représentée** (≥ 1 lvl0 en expédition porteur d'une escouade). Sinon : **tableaux strictement identiques à aujourd'hui**. | *Toujours* : une ligne « Hors escouade » pour rien chez qui n'utilise pas la fonction. *Aucun bandeau côté Équipe* : abandon du regroupement Équipe (spec). |
| **S7** | **Libellé niv.1+** | **« Hors escouade »** — dit explicitement que ces persos ne sont **pas éligibles**. | *« Niveau 1 et + »* : sonne comme une catégorie de perso. *« Sans escouade »* : trompeur (un guerrier niv.5 n'a jamais été « sans escouade »). |

**Conséquence directe de S1** : une escouade **n'existe que par ses membres lvl0** — elle est
**dérivée** de ces derniers. Une escouade vidée de son dernier membre **cesse d'exister** (la
modale le signale). Aucune table, aucun endpoint.

---

## 3. Architecture cible

```
dcc-sheet/
├── script.js              ~ renderCharList        découpage par escouade + bandeaux (helper squadsOf)
│                          ~ createCharCard        + sélecteur .char-card-squad — SI cls === 'lvl0' (stopPropagation)
│                          ~ createNewButton       + bouton « Escouades » — SI cls === 'lvl0'
│                          + showSquadsModal       modale de gestion (créer / renommer / supprimer) — membres lvl0 uniquement
│                          + setCharacterSquad     écriture data.escouade (1 save, garde lvl0) + rafraîchissements
├── lvl0-roll.js           ~ promote()              + delete out.escouade   (R10 : le promu sort de l'escouade)
├── classes/equipe.js      ~ render / buildStatsSection  découpage en <tbody> : niv.1+ d'abord, puis groupes lvl0,
│                                                      bandeaux SI ≥ 1 escouade représentée (S5-S7)
│                          ~ resync                signature de composition enrichie (ids + escouades lvl0)
├── style.css              + .squad-bar-list / .is-void / .char-card-squad / .team-table .squad-head
├── plan3/
│   ├── PLAN-ESCOUADE.md   ce document
│   └── maquette-escouade.html   MAQUETTE (rendu + workflow), hors périmètre applicatif
├── tests/                 + 02-css, 04-equipe (audit des compteurs), 11-team-state,
│                              12-lvl0 (promotion), 05-export, 07-restore (§ 5)
└── MANUAL / README / TODO / JOURNAL   docs après implémentation validée
```

**Aucun changement API** : `characters.php` ni `db.php` ne sont touchés — `data` est déjà
lu/écrit/exporté en JSON. **Aucune migration** : la règle « lvl0 seulement » est une règle
d'affichage/d'écriture côté client.

---

## 4. Détail d'implémentation

### 4.1 Modèle de données (S1 + S0)

```js
/* Convention : characters.data.escouade = "Nom" | absent/'' = sans escouade.
   Règle S0 : SEULEMENT pour class === 'lvl0' — un niv.1+ n'est jamais éligible. */
function squadOf(charData) {
  if (charData.class !== 'lvl0') return '';          /* garde R11 : niv.1+ = jamais */
  try {
    var d = JSON.parse(charData.data || '{}');
    return typeof d.escouade === 'string' ? d.escouade.trim() : '';
  } catch (e) { return ''; }
}
```

- **Écriture** : un **seul** point (`setCharacterSquad(id, name)`) qui **rejette d'abord** tout
  `id` de perso non-lvl0 (R11), puis `action=get` → injection de la clé → `action=save`.
  *Jamais* d'écriture depuis le snapshot de la carte (règle du projet).
- **Renommage** : boucle séquentielle `save` sur les membres lvl0 (même motif que le tirage
  multiple, évol. #3), puis rafraîchissement des listes.
- **Unicité / regroupement** : insensibles à la casse (`'Alpha'` = `'alpha'` ; le libellé
  affiché est celui du **premier membre rencontré**).

### 4.2 Collecte et groupement (helper commun)

```js
function groupBySquad(chars) {
  /* → [{ label, members[] }] trié alpha, « Sans escouade » en dernier.
     chars = SEULEMENT les lvl0 ; le tri interne de members est celui de l'appelant. */
}
```
Côté Équipe, le découpage est **blocs** : `others` (class ≠ lvl0) → `lvl0Groupés` →
`lvl0SansEscouade` (voir § 4.6).

### 4.3 Liste Niveau 0 (`renderCharList`, script.js L1361)

```js
var groups = groupBySquad(sorted);            /* sorted = tri existant, inchangé */
groups.forEach(function (g) {
  listContent.appendChild(squadBanner(g));     /* bandeau */
  var grid = el('div', { className: 'char-grid' });
  g.members.forEach(function (c) { grid.appendChild(createCharCard(cls, c)); });
  listContent.appendChild(grid);
});
```
- Bandeau `.squad-bar-list` (+ `.is-void` pour « Sans escouade », rendu muet) : **nom en
  majuscules + effectif** + **pastille d'identité** (couleur hachée du nom, identique sur les
  3 écrans).
- **Une seule `.char-grid` par groupe** : `grid-template-columns: auto-fill` reste naturel,
  un groupe vide n'est jamais rendu.
- **Aucun perso** → état vide existant, aucun bandeau.

### 4.4 Carte : sélecteur d'escouade (S2b) — **lvl0 uniquement**

```js
if (cls === 'lvl0') { /* construit .char-card-squad dans .char-card-actions */
  sel.addEventListener('click',  function (e) { e.stopPropagation(); });
  sel.addEventListener('change', function (e) {
    e.stopPropagation();
    if (e.target.value === '__new__') { /* mini-saisie → setCharacterSquad */ }
    else { setCharacterSquad(charData.id, e.target.value); }
  });
}
```
- **R11** : les 7 classes n'affichent **aucun** sélecteur (le code n'est même pas construit).
- **`stopPropagation` sur `click` ET `change`** : la carte a un `click` global → `openSheet`
  (même motif que `.toggle-inn`, L1434).
- Option courante pré-sélectionnée depuis `charData` (valeur affichée = valeur de la base).
- Après écriture : rafraîchir **la liste** + **`invalidateEquipePanel()`**.

### 4.5 Modale « Escouades » (S2a) — `showSquadsModal()`, **lvl0 uniquement**

Squelette maison type `showLvl0CountModal` (pied standard `.modal-actions`). Contenu :

1. **Liste des escouades** (alpha, « Sans escouade » non listé, non renommable) :
   **pastille + nom + effectif + membres en cases à cocher** (affecter depuis la modale),
   **Renommer** (trim, unicité insensible à la casse, **max 40 caractères**), **Supprimer**
   (confirmation ; les membres repassent en « Sans escouade »).
   **La liste des membres ne contient QUE des personnages niveau 0** (R11).
2. **« + Nouvelle escouade »** : nom + **au moins un membre lvl0** pour que le nom existe
   (règle dérivée de S1 — message explicite).
3. **Aide muette** : *« Réservé aux personnages de niveau 0 : à la promotion, le personnage
   sort de son escouade. »*

Fermeture : Échap / clic extérieur / **Fermer** — pas de « valider » global (les écritures
sont faites au fil de l'eau, philosophie de l'app).

### 4.6 Onglet Équipe (S4-S7) — `classes/equipe.js`

**Découpage en `<tbody>` par bloc**, dans les DEUX tableaux (expédition L1037+ et
`buildStatsSection` L480+) :

```js
var lvl0 = rows.filter(isLvl0);                 /* class === 'lvl0' */
var others = rows.filter(notLvl0);              /* niv.1+ : jamais d'éligibilité */
var showBands = lvl0.some(hasSquad);            /* S6 : ≥ 1 escouade représentée */

if (!showBands) { renderToday(rows); return; }   /* S6 : strictement l'affichage actuel */

/* S5 : niv.1+ d'abord (« Hors escouade »), puis groupes lvl0 alpha,
   puis lvl0 « Sans escouade » */
appendBlock('Hors escouade', others);            /* bandeau is-void si others.length */
groupBySquad(lvl0).forEach(g => appendBlock(g.label, g.members));
```

- `appendBlock(label, members)` crée un **`<tbody>`** : `<tr class="squad-head"><td colspan="N">`
  (texte injecté en **`textContent`**) + les lignes de données **recyclées à l'identique**.
- **Pourquoi un `<tbody>` par bloc** : `tr:nth-child(even)` (striping) s'applique **par
  parent** → zébrage propre dans chaque bloc ; `toggleDetail`/`toggleStatsDetail` insèrent la
  ligne de détail **après** sa ligne mère → elle reste dans le bon bloc ; les bandeaux n'ont
  **ni `data-char-id` ni `data-id`** → invisibles pour `resync`, les compteurs de lignes et le
  **min/max** des stats (recalculés sur les seules lignes de persos, **inchangé**).
- **S6 respecté à la lettre** : sans aucune escouade représentée, le rendu est **strictement
  celui d'aujourd'hui** (y compris l'ordre : `CLASSES` finit par `'lvl0'` → les lvl0 sont déjà
  en fin de tableau — S5 ne bouge donc rien tant qu'il n'y a pas de bandeau).

### 4.7 Point de vigilance : `resync` (composition vs groupement)

`loadEquipe` (L1194) arbitre « re-render ou resync » d'après `data-expedition-ids` = **la
liste des ids** (L1140) — or **changer l'escouade ne change pas les ids** ⇒ groupement
**péréime** jusqu'au rechargement.

**Correctif prévu** : signature enrichie en `ids + '|' + escouades-lvl0`
(`expeditionCompositionAttr(chars)` = ids **et** `squadOf` des lvl0). Composition différente →
re-render. **Test dédié** : changer une escouade depuis la liste Niveau 0 puis rouvrir
l'Équipe → bandeau à jour **sans** rechargement de page.

### 4.8 Promotion, tirage, export / import (R4, R10)

| Flux | Comportement |
|---|---|
| **Promotion lvl0 → niv.1** | `DCCLvl0Roll.promote()` copie toutes les clés de `data` (lvl0-roll.js L308) → **ajout d'une ligne : `delete out.escouade;`** (R10 — le perso **sort** de son escouade). Portée : le code qui recrée le perso ne reçoit plus la clé. **1 test** dans `12-lvl0` (`testPromote`). |
| **Tirage multiple (évol. #3)** | Le lot crée des persos **sans escouade** (inchangé). |
| **Import JSON** | Le champ voyage dans `data` → aller-retour **gratuit**. Un ancien JSON contenant `escouade` sur un **niv.1+** : **aucune migration**, la garde `squadOf()` l'ignore à l'affichage (R11). |
| **Export** | `data.escouade` sort avec le perso lvl0 — `version: 2` **inchangée**. |
| **Suppression d'un perso** | L'escouade se dérive : dernier membre parti ⇒ elle disparaît de la liste et de la modale. |

### 4.9 CSS (`style.css`)

```css
.squad-bar-list        { /* clone du vocabulaire .section-bar : font-heading 13 px,
                            uppercase, --field-bg, bordure --input-border */ }
.squad-bar-list.is-void { /* « Sans escouade » / « Hors escouade » : pointillé, --muted */ }
.squad-dot             { /* pastille 10 px, couleur hachée du nom (6 teintes) */ }
.char-card-squad       { /* 11 px, --field-bg, max-width ~140px — cartes lvl0 seulement */ }
.team-table .squad-head td { /* --field-bg, font-heading 11 px uppercase, gauche */ }
```
**Mobile (≤ 600 px)** : bandeau en `flex-wrap`, sélecteur en `flex: 1` — aucun débordement
horizontal (leçon évol. #1).

---

## 5. Tests (à l'implémentation)

**Audit préalable obligatoire** : `04-equipe`, `11-team-state`, `25-init-expedition`
**comptent des lignes** (`tbody tr`) — les bandeaux augmentent ces compteurs ⇒ passer chaque
sélecteur de comptage en **`tr:not(.squad-head)`** **avant** d'ajouter les contrôles.

| Suite | Contrôles prévus |
|---|---|
| **Nouvelle `27-squads`** (numéro libre, inscrite dans `run.js`) | `squadOf` (**`class !== 'lvl0'` → `''`**, vide/absent/JSON cassé/trim), `groupBySquad` (alpha, casse, « Sans escouade » dernier, ordre interne), `setCharacterSquad` (refus d'un id non-lvl0, une seule écriture, relit la base, `invalidateEquipePanel`), renommage (boucle + unicité), suppression, **promotion = suppression de `escouade`**, aller-retour export/import, **S6** (0 escouade → aucun bandeau ; ≥ 1 → bandeaux), **S5** (niv.1+ avant les groupes lvl0). |
| `02-css` | `.squad-bar-list`, `.is-void`, `.squad-dot`, `.char-card-squad`, `.team-table .squad-head` (critères) + media mobile. |
| `04-equipe` / `11-team-state` | Bandeaux dans les **deux** tableaux, `colspan` = nb de colonnes, **aucun sélecteur/escouade sur une ligne niv.1+**, lignes persos inchangées, détail dans le bon bloc, **audit des compteurs**. |
| `12-lvl0` | Liste segmentée, sélecteur **présent sur les cartes lvl0 et absent des 7 classes**, bandeau « Sans escouade » en dernier, **`promote()` supprime `escouade`**. |
| `05-export` / `07-restore` | `data.escouade` présent à l'export, restitué à l'import, et **ignoré** sur un perso niv.1+. |

**Batterie complète** `node tests\run.js` → **0 échec** (référence actuelle : **3579/3579, 13 skip**).

---

## 6. Documentation (après implémentation validée)

| Fichier | Changement |
|---|---|
| `MANUAL.md` | § Niveau 0 : paragraphe **Escouades** (workflow 4 temps + **« réservé aux niveau 0 »**) + mention **« à la promotion, le personnage sort de son escouade »** ; § Équipe : bandeaux conditionnels des deux tableaux ; glossaire (`escouade`). |
| `README.md` | Puce Niveau 0 + puce onglet Équipe. |
| `TODO.md` | Évolution #4 marquée « codée ». |
| `JOURNAL.md` | Entrée datée (restriction lvl0, arbitrages S0–S7, audit des compteurs, compteurs). |

---

## 7. Étapes d'exécution

1. ~~**Plan** + **maquette**~~ ✅ livrés (puis révisés : **restriction au niveau 0**, S5–S7).
2. **Validation du rendu** par Bruno sur la maquette révisée (4 écrans + workflow).
3. `lvl0-roll.js` : `delete out.escouade` dans `promote()` (R10).
4. `script.js` : `squadOf` (garde lvl0) / `groupBySquad` / `setCharacterSquad` → liste
   segmentée → sélecteur carte (lvl0) → modale (membres lvl0) → bouton « Escouades » (lvl0).
5. `classes/equipe.js` : découpage **S5/S6/S7** des deux tableaux + signature `resync`.
6. `style.css` : blocs `.squad-*` + adaptation mobile.
7. `node --check` + **validation du rendu dans l'app** avant tests.
8. Tests (§ 5, **audit des compteurs d'abord**) + `node tests\run.js` → 0 échec.
9. Docs (§ 6) + encodages CRLF/UTF-8.
10. Commit / push **sur demande** de Bruno.

---

## 8. Risques, points de vigilance, hors périmètre

- **🔴 Compteurs de lignes des suites Équipe** : les bandeaux sont des `<tr>` en plus —
  **toute assertion « N lignes » fausse**. Audit systématique (`04-equipe`, `11-team-state`,
  `25-init-expedition`) **avant** les nouveaux contrôles ; convention : **`tr:not(.squad-head)`**.
- **🔴 `resync` sans re-render** : signature de composition ne porte que les **ids** →
  changement d'escouade invisible dans l'Équipe (§ 4.7). Enrichissement + test dédié.
- **🔴 Règle lvl0 en un seul endroit** : la garde vit dans **`squadOf()`** (lecture) et
  **`setCharacterSquad()`** (écriture) — les deux sont appelés partout ; toute nouvelle
  passerelle devra les réutiliser (test : `class !== 'lvl0'` → toujours `''`).
- **🟡 Données héritées** : un `data.escouade` sur un niv.1+ (import d'avant la restriction)
  **reste en base mais n'est jamais affiché** — pas de migration, pas de purge (règle : les
  données de l'utilisateur ne sont pas réécrites sans besoin).
- **🟡 Ordre des requêtes** : renommer = N `save` séquentielles — échec réseau à mi-parcours =
  noms **mixtes** (jamais de casse, chaque écriture est indépendante), relance possible.
- **🟡 Écritures en base** : toujours `action=get` puis `save` (jamais le snapshot de la carte).
- **🟡 Sécurité** : nom d'escouade en **`textContent`** (jamais `innerHTML`), trim + **max 40**,
  unicité insensible à la casse ; aucune nouvelle requête SQL.
- **🟡 Mobile** : bandeaux `flex-wrap`, sélecteur `flex: 1` — pas de débordement.
- **🟡 Cohérence des 3 écrans** : la pastille (hash du nom) est le seul lien visuel entre la
  liste Niveau 0, l'expédition et les statistiques — même fonction de hash partout (test).
- **Hors périmètre assumé** : ordre **manuel** des groupes, sous-totaux de stats, escouade des
  **ennemis**, escouade dans l'**ordre de marche**, escouade sur une **classe** (niv.1+),
  pré-remplissage du **tirage multiple**, escouade **vide persistée**, glisser-déposer.
