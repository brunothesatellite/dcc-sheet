# PLAN — Évolution « Niveau 0 » (branche `evol-level0`)

> Spec source : `plan0/lvl0-spec.txt` — Maquettes validées : `plan0/maquettes/`
> (sommaire `plan0/maquettes/index.html`, ignoré par git via `.gitignore` : `maquettes/`).
> Décisions prises le 06/10/2026.

---

## 1. Reformulation de la spec

Gérer des personnages **de niveau 0** (funnel DCC), du tirage aléatoire jusqu'à la
promotion en niveau 1.

1. **Onglet** « Niveau 0 » après *Voleur*. En mobile, pastille **« Lvl 0 »** à droite du
   titre de l'application (même principe que la pastille « Équipe »).
   *→ évolution : la pastille a été abandonnée au profit de l'onglet lui-même, visible en
   mobile sous la forme courte **« Niv 0 »** (voir Q2) ; seule la pastille « Équipe » subsiste.*
2. **Fiche simplifiée** = BLOC_COMMUN + NOTES, **sans le dé de vie** dans le bouclier PV.
3. **Liste** : boutons `+ Nouveau` et `Import`, cartes comme les autres onglets
   (expédition / auberge, suppression, édition).
4. **`+ Nouveau`** tire un personnage au sort puis ouvre sa fiche. En-tête :
   `Export` (existant) + **`Retire`** (relance le tirage, remplace le personnage ouvert)
   + **`Promouvoir`** (conversion en niveau 1).
5. **Tirage** : nom (`noms.txt`), titre vide, métier (`metiers.csv` = métier / arme /
   équipement), alignement vide, mouvement 30 (20 si nain/halfelin), niveau 0, PX 0,
   CA = 10 + mod AGI, PV max = 1d4 + mod END, PV courant = PV max, initiative `1d20` +
   mod AGI, dés d'action `1d20`, dés critique `d4`, table critique `I`, 6 caracs en 3d6,
   modifs selon le barème (3 → −3 … 18 → +3), jet chanceux (`chance.txt`), langues
   (`commun` + race), armes (colonne 2 du métier), équipement (colonne 3 du métier +
   tirage `equipement.txt`), trésor 5d12 pièces de cuivre, armure vide.
   Combat : Attaque CàC = mod FOR, dégâts CàC = dé de l'arme + mod FOR, attaque distance =
   mod AGI, dégâts distance = dé de l'arme + mod AGI ; **arme de distance** si la
   description contient une plage `x/y/z`, sinon arme de CàC (l'autre dé de dégâts reste vide).
   Portrait tiré selon le métier (`icons/funnel-tokens/funnel-tokens.json`), puis
   choisi librement dans **tous** les tokens du dossier.
   Notes : `Infravision` (nain/halfelin), `Sens très développés et sensibles au fer` (elfe).
6. **Promouvoir** : modale de choix de classe — classe raciale imposée si le métier
   commence par `elfe` / `nain` / `halfelin`, sinon choix parmi `clerc`, `guerrier`,
   `mage`, `voleur` ; case « supprimer le niveau 0 après conversion » (faux par défaut) ;
   création du niveau 1 en recopiant la fiche (**portrait retiré** au profit d'un tirage
   de la classe), puis ouverture directe de la nouvelle fiche.

### Champs de BLOC_COMMUN non traités par la spec (réponse à la question de la spec)

| Champ | Traitement |
|-------|-----------|
| `notes` | **absent de BLOC_COMMUN** (chaque classe l'ajoute) → `classes/lvl0.js` l'ajoute |
| `.hit-die` | n'est pas un `data-key` mais un rendu calculé (`d8` pour `lvl0`) → **retiré** par `classes/lvl0.js` |
| `attaque` (bonus global) | pas prévu par la spec → rempli avec **`+0`** (décision) |
| `js_reflexe` / `js_vigueur` / `js_volonte` | pas prévus par la spec → renseignés au tirage = **mod AGI / mod END / mod PRE** (décision), éditables |
| `titre`, `alignement`, `px`, `armure` | existants, laissés vides (spec) |
| `portrait_source` | existant → nouvelle valeur **`funnel`** |
| tout le reste | couvert : métier, jet chanceux, langues, 4 champs CàC/distance, armes/équipement/trésor |

---

## 2. Décisions validées

| # | Sujet | Décision |
|---|-------|----------|
| Q1 | Stockage | pseudo-classe **`lvl0`** dans `characters.class` (8ᵉ classe technique : CRUD, listes, export/import réutilisés) |
| Q2 | Onglet mobile | ~~pastille « Lvl 0 »~~ → **onglet visible** : libellé court **« Niv 0 »** (span `.tab-lbl-short`, le texte complet reste dans le DOM), onglets à **largeur maximale** (`flex: 1 1 0`, `min-width: 0`, ellipsis) et barre **sans défilement horizontal** (`overflow-x: hidden`) ; pastille supprimée |
| Q3 | Champ « Attaque » | rempli avec **`+0`** |
| Q3 bis | Jets de sauvegarde | **JS Ref = mod AGI**, **JS Vig = mod END**, **JS Vol = mod PRE** |
| Q5 | Arme de distance | plage chiffrée de **3 nombres** (`3/6/9`, `15/30/45`, `6/12/18`) ; `1d4/1d10` = notation de dégâts → CàC |
| Q6 | Promotion | bouton **inactif** tant qu'aucune classe n'est choisie ; classe raciale **pré-sélectionnée**, autres **grisées** |
| Q7 | Promotion — recopie | **fiche intégrale sauf portrait** : identité (titre/alignement compris), caracs + mods, **JS Ref/Vig/Vol**, attaque, dés/table de critique, jet chanceux, langues, armes/équipement/trésor/notes/armure, PV/CA, initiative, dés d'action — **aucun champ n'est vidé** (évolution de la décision initiale, 6 octobre) ; seuls `niveau` → `1` et le portrait sont réécrits |
| Q8 | Race | détection par **« commence par »** `elfe` / `nain` / `halfelin` (insensible à la casse) → mouvement 20, langues, notes, contrainte de promotion |
| Q9 | Équipe | un niveau 0 en expédition apparaît **dans l'onglet Équipe** (PV, initiative, tour, ordre de marche) |
| — | PV max | barème littéral 1d4 + mod END, **plancher à 1** (un personnage ne peut pas naître mort — règle d'implémentation, cf. §7) |

---

## 3. Architecture & fichiers

### Nouveaux fichiers

| Fichier | Rôle |
|---------|------|
| `lvl0-data.js` | données sources converties en JS : `window.DCCLvl0Data = { noms[], metiers[], chance[], equipement[] }` (généré depuis `plan0/*.txt|csv`, UTF-8) |
| `lvl0-roll.js` | **moteur pur** : `window.DCCLvl0Roll = { statMod, formatMod, formatBonus, raceOf, movementOf, languesOf, notesOf, weaponInfo, powerOf, allowedClasses, roll, promote }` — RNG injectable → testable |
| `funnel-icons.js` | `window.FunnelIcons` : catalogue `meta.key = 'funnel'`, `lvl0[]` = les 75 tokens, `byMetier{}` = métier → index (généré depuis `icons/funnel-tokens/funnel-tokens.json`) |
| `tools/build-lvl0-data.js` | régénère `lvl0-data.js` + `funnel-icons.js` depuis `plan0/` et `icons/funnel-tokens/` |
| `classes/lvl0.js` | module de fiche : `blocCommun.render(..., 'lvl0', ...)` **sans `.hit-die`** + section `Notes` |
| `tests/12-lvl0.test.js` | suite dédiée (tirage, mods, arme, race, promotion, fiche, API) |

### Fichiers modifiés

| Fichier | Changement |
|---------|-----------|
| `index.html` | onglet `<button class="tab tab-lvl0" data-class="lvl0"><span class="tab-lbl-full">Niveau 0</span><span class="tab-lbl-short">Niv 0</span></button>` après *Voleur* (libellé responsive, **pas de pastille**) ; scripts `lvl0-data.js`, `lvl0-roll.js`, `funnel-icons.js` (avant `portrait-icons.js`) |
| `style.css` | libellé `.tab-lbl-full/-short`, barre d'onglets en **largeur maximale sans défilement** en mobile, `.btn-reroll`, `.btn-promote`, `.promo-class-list/-row/-why`, `.promo-delete-row`, `.lvl0-power` (badge de puissance) |
| `script.js` | `CLASSES` + `CLASS_LABELS` += `lvl0` ; `createCharacter` tire au sort ; `createCharCard` affiche le métier ; `createSheetHeader` ajoute **Autre tirage** (session `rollSessionId`) / **Promouvoir** + badge `buildLvl0Power` (lvl0 uniquement) ; `rerollLvl0`, `promoteLvl0`, `showPromoteModal`, `randomPortraitFor` |
| `classes/equipe.js` | `CLASS_LABELS.lvl0 = 'Niv.0'` |
| `api/characters.php` | `validClasses` += `'lvl0'` |
| `tests/helpers/env.js` | `CLASSES` += `'lvl0'` (couvre 01-syntax, 03-modules, 05-export) |
| `tests/run.js` | enregistre `12-lvl0` |
| `README.md`, `MANUAL.md`, `JOURNAL.md`, `TODO.md` | documentation |

### Flux

```
+ Nouveau (lvl0) ──► DCCLvl0Roll.roll() ──► create {class:'lvl0', name:nom}
                   └─► save(data) ──► openSheet('lvl0')
Retire ─────────────► cancelPendingSaves ──► roll() ──► save ──► openSheet
Promouvoir ─────────► showPromoteModal(allowedClasses) ──► promote(data, cls)
                   └─► portrait aléatoire de la classe ──► create {class:cls}
                   └─► save(newData) ──► [delete lvl0?] ──► switchTab + openSheet
```

Le reste (auto-save, export/import individuel et global, ordre de marche, état de
combat, Équipe) fonctionne **sans changement** grâce à la pseudo-classe `lvl0`.

---

## 4. Étapes

1. ✅ Spec reformulée, questions posées, maquettes validées.
2. **Données** : `tools/build-lvl0-data.js` → `lvl0-data.js`, `funnel-icons.js`.
3. **Moteur** : `lvl0-roll.js` (pur, RNG injectable).
4. **Fiche** : `classes/lvl0.js` + styles.
5. **Onglet / pastille** : `index.html`, `style.css`, `script.js` (création, cartes, header).
6. **Retire / Promouvoir** : reroll + modale de promotion + conversion.
7. **API** : `validClasses` += `lvl0`.
8. **Tests** : `tests/12-lvl0.test.js` + `helpers/env.js` + `run.js` → `node tests\run.js` vert.
9. **Docs** : README / MANUAL / JOURNAL / TODO.
10. **Release** : commit, push, `deploy\_build.ps1 -Diff`, tag, release GitHub.

---

## 5. Tests (`tests/12-lvl0.test.js`)

- données chargées et non vides (`noms`, `metiers` sur 3 colonnes, `chance`, `equipement`)
- `statMod` : barème complet 3→−3 … 18→+3
- `roll` avec RNG déterministe : CA = 10 + mod AGI, PV = max(1, 1d4 + mod END),
  initiative `1d20±x`, `attaque = +0`, `niveau = 0`, `px = 0`, JS = mods,
  trésor `5d12 pc = N pc`, `portrait_source = 'funnel'`
- `weaponInfo` : `1d4` → CàC ; `Hachette 1d6 3/6/9` → distance ; `Dague 1d4/1d10 3/6/9`
  → distance avec dégâts `1d4` ; `Bâton 1d4` → CàC `1d4`
- `raceOf` / `allowedClasses` : `Elfe …` → `['elfe']`, `Nain …` → `['nain']`,
  `Halfelin …` → `['halfelin']`, `Bûcheron` → les 4 classes ; « commence par »
  (un métier contenant « nain » ailleurs n'est pas racial)
- `promote` : recopie (identité, caracs, notes, équipement), `niveau = 1`,
  recopie intégrale (identité, caracs, JS, attaque, critique, notes, armure, équipement), `niveau = 1`, portrait réinitialisé, aucune clé perdue
- fiche : `DCCModules.lvl0.render` → aucun `.hit-die`, clés `lvl0-1-*`, section Notes,
  roundtrip `collectSheetData`
- `index.html` : onglet après Voleur, pastille mobile, scripts référencés (01-syntax)
- `api/characters.php` contient `'lvl0'` dans `validClasses`

---

## 6. Livrables hors code

- `icons/funnel-tokens/` (75 PNG + `funnel-tokens.json`, ~11 Mo) : **à versionner** —
  indispensable au fonctionnement des portraits de niveau 0.
- `plan0/` : sources (`noms.txt`, `metiers.csv`, `chance.txt`, `equipement.txt`),
  spec et ce plan — à versionner pour garder la source de vérité des données générées
  (les maquettes restent ignorées par `.gitignore`).

---

## 7. Points de vigilance / écarts assumés

1. **PV max plancher à 1** : le barème littéral (1d4 + mod END) peut donner 0 ou moins
   (END 3 + dé 1) et ferait naître un personnage mort (crâne immédiat dans Équipe).
   → plancher à 1, écart documenté ici.
2. **Poids des métiers** : `metiers.csv` contient des doublons (`Bûcheron`…) — le fichier
   est une table d100 pondérée, les doublons sont **conservés** (tirage fidèle).
3. **Portrait de niveau 1 après promotion** : tirage aléatoire dans **toutes** les
   sources de portraits disponibles pour la classe (pas seulement `dcc`).
4. **Régénération des données** : `node tools/build-lvl0-data.js` à relancer si
   `plan0/` ou `icons/funnel-tokens/` changent.
5. **Pas de schéma BDD** : `class` est une simple `TEXT` — aucun `ALTER TABLE`.
