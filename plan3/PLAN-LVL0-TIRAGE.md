# PLAN — Évolution #3 « + Nouveau : combien tirer ? » (onglet Niveau 0)

> **Spec source** : `TODO.md` § EVOLUTIONS — **3** (le bouton **+ Nouveau** demande combien de
> personnages tirer ; 1 = comportement actuel, > 1 = tirage automatique, tous à l'auberge).
> **Arbitrages validés par Bruno le 03/11/2026** (§ 2) : **C1** modale dédiée à champ numérique,
> **C2** on reste sur la liste + toast, **C3** overlay de progression « x/20 » pendant le tirage.
> **Statut** : implémenté — **aucun commit** (demande explicite).

---

## 1. Reformulation de la spec

| # | Exigence (formulation retenue) |
|---|-------------------------------|
| **R1** | Onglet **Niveau 0**, bouton **« + Nouveau »** (dans l'en-tête de la liste **et** dans l'état vide) : le clic **demande d'abord combien** de personnages tirer — champ numérique, **défaut 1**, **minimum 1**, **maximum 20**. |
| **R2** | **1** → **comportement actuel strictement conservé** : tirage complet (`DCCLvl0Roll.roll()`), création en base, **fiche ouverte immédiatement**, bouton **« Autre tirage »** disponible (session de tirage), personnage **en expédition** (`is_active: 1`). |
| **R3** | **> 1** → tirage **automatique et enchaîné** des N personnages, **tous à l'auberge** (`is_active: 0`, passé **dès la création** : 1 requête `create` + 1 requête `save` par perso, **pas** de `set_active` supplémentaire). **Aucune fiche ouverte**, **pas** de « Autre tirage » (la session de tirage concerne 1 seul perso). |
| **R4** | **Annulation** (Échap, clic hors modale, bouton Annuler) → **rien ne se passe**, aucune requête. |
| **R5** | **Bornage** : champ `min=1` / `max=20` / `step=1`, puis **clamp à la validation** (`NaN → 1`, `< 1 → 1`, `> 20 → 20`) — saisie « 0 », « 99 » ou vide ne peut jamais sortir de `[1, 20]`. |
| **R6** | Les **autres classes** (clerc, elfe, guerrier, halfelin, mage, nain, voleur) ne sont **pas concernées** : « + Nouveau » continue de créer directement (`createCharacter(cls)`). |
| **R7** | Retour utilisateur : **overlay de progression** réutilisant la barre d'import (« Tirage en cours… (x/N) »), puis **rafraîchissement de la liste** et **toast** final « N personnages tirés, tous à l'auberge ». |

---

## 2. Arbitrages (validés le 03/11/2026)

| # | Sujet | Décision |
|---|-------|----------|
| **C1** | Interface de la demande | **Modale dédiée** maison (même squelette que `showPromoteModal` : `.modal-overlay` > `.modal-box` + `.modal-title` + `.modal-message` + `.modal-actions`) avec un **champ numérique** (`type=number`, `min=1`, `max=20`, `value=1`) et les boutons **Annuler** / **Tirer**. *Rejeté* : étendre `showModal()` partagé (ne supporte que du texte et sert toutes les confirmations RAZ/suppression) ; boutons-raccourcis 1/5/10/20 (trop peu flexible). |
| **C2** | Après un lot | **Rester sur la liste Niveau 0** : rafraîchissement via `loadClassCharacters('lvl0', false)` (les N cartes apparaissent avec l'interrupteur **A L'AUBERGE** rouge) + **toast** final. *Rejeté* : ouvrir la fiche du 1er tiré (contradiction avec « session de tirage = 1 perso »), bandeau persistant. |
| **C3** | Pendant le lot | **Overlay de progression** réutilisé de l'import (`showImportProgress` / `setImportProgress` / `hideImportProgress`), titre paramétré **« Tirage en cours… (x/20) »**. *Rejeté* : toast final seul (20 persos = 40 requêtes sans retour), aucun blocage (double lancement possible). |
| **C4** | Session de tirage | Sur un lot, `rollSessionId` reste **null** → **pas de bouton « Autre tirage »** (il n'y a pas de fiche ouverte). Sur `1`, inchangé. |
| **C5** | Propre à Niveau 0 | Le branchement se fait dans `createNewButton(cls)` (`cls === 'lvl0' ? … : createCharacter(cls)`) : **seul** le Niveau 0 passe par la modale. |

---

## 3. Architecture cible

```
dcc-sheet/
├── script.js                 + showLvl0CountModal()   modale « combien tirer ? » (promise : nombre 1..20 | null)
│                             + startLvl0Roll()        garde lvl0Rolling → modale → 1 = createCharacter / >1 = rollLvl0Batch
│                             + rollLvl0Batch(count)   boucle create(is_active:0) + save + progression + liste + toast
│                             ~ createNewButton(cls)   onClick : lvl0 → startLvl0Roll(), autres classes → createCharacter(cls)
│                             ~ showImportProgress(t)  titre paramétré (défaut « Import en cours… » — inchangé pour l'import)
├── style.css                 + .lvl0-count-row / .lvl0-count-input / .lvl0-count-hint  (modale, centré, gros chiffre)
├── tests/12-lvl0.test.js     + section « tirage multiple » (assertions source, convention câblage existante)
├── MANUAL.md                 § Niveau 0 : + Nouveau demande le nombre (1 = actuel, >1 = lot à l'auberge)
├── README.md                 puce Niveau 0
├── TODO.md                   évolution #3 → « codée »
└── JOURNAL.md                entrée datée (arbitrages C1–C5, compteurs)
```

**Inchangés** : `api/characters.php` (l'action `create` accepte **déjà** `is_active`, L41-42),
`lvl0-roll.js` (moteur pur déjà `roll()`), `classes/lvl0.js`, `index.html`, les autres classes.

---

## 4. Détail d'implémentation

### 4.1 Modale (`showLvl0CountModal()` → `Promise<number|null>`)

Squelette repris de `showPromoteModal` (script.js L1646-1734) : overlay maison, Échap + clic
extérieur = annulation (`null`), pied `.modal-actions` (classes standard `modal-btn-cancel` /
`modal-btn-ok` — exigence du test « pied de modale standard »).

```js
var input = el('input', {
  type: 'number', min: '1', max: '20', step: '1', value: '1',
  className: 'lvl0-count-input',
  'aria-label': 'Nombre de personnages à tirer (1 à 20)',
});
/* Validation : clamp dans [1, 20] — R5 */
function readCount() {
  var n = parseInt(input.value, 10);
  if (isNaN(n)) n = 1;
  return Math.max(1, Math.min(20, n));
}
```
Retour : `readCount()` sur **Tirer** (et sur **Entrée**), `null` sur Annuler / Échap / clic extérieur.

### 4.2 Point d'entrée (`startLvl0Roll()`)

```js
var lvl0Rolling = false;                 /* anti double-lancement */
async function startLvl0Roll() {
  if (lvl0Rolling || !currentUser) return;
  var count = await showLvl0CountModal();
  if (!count) return;                    /* R4 : annulation */
  if (count === 1) { await createCharacter('lvl0'); return; }   /* R2 : comportement actuel */
  lvl0Rolling = true;
  try { await rollLvl0Batch(count); } finally { lvl0Rolling = false; }
}
```

### 4.3 Lot (`rollLvl0Batch(count)`)

```js
async function rollLvl0Batch(count) {
  var created = 0;
  showImportProgress('Tirage en cours…');           /* C3 (titre paramétré) */
  setImportProgress(0, 'Tirage en cours… (0/' + count + ')');
  try {
    for (var i = 0; i < count; i++) {
      var rolled = window.DCCLvl0Roll.roll();
      var res = await api('characters.php', {
        method: 'POST',
        body: { action: 'create', class: 'lvl0',
                name: (rolled && rolled.nom) ? rolled.nom : 'Sans nom',
                is_active: 0 },                      /* R3 : à l'auberge dès la création */
      });
      if (res.character) {
        await saveCharacter(res.character.id, rolled, rolled.nom);
        created += 1;
      }
      setImportProgress((i + 1) / count, 'Tirage en cours… (' + (i + 1) + '/' + count + ')');
    }
  } catch (err) { console.error('Erreur tirage multiple niveau 0:', err); }
  hideImportProgress();
  rollSessionId = null;                              /* C4 : pas d'« Autre tirage » sur un lot */
  invalidateEquipePanel();                           /* le panel Équipe doit revoir la composition */
  await loadClassCharacters('lvl0', false);          /* C2 : rafraîchit la liste, aucune fiche ouverte */
  showToast(created > 0
    ? created + ' personnage tiré, à l\'auberge'      /* ou « N personnages tirés, tous à l'auberge » */
    : 'Erreur lors du tirage', created > 0 ? 'success' : 'error');
  return created;
}
```
Séquentiel **au await** : 1 create + 1 save à la fois (jamais de 40 requêtes en parallèle).

### 4.4 `showImportProgress(title)`

Paramètre optionnel : `title || 'Import en cours…'` — l'appel existant `showImportProgress()`
(L643) conserve son libellé ; le test `20-import-limits` (`indexOf('showImportProgress()')`,
`hideCount >= 5`) reste valide.

### 4.5 CSS (`style.css`, zone modales)

```css
.lvl0-count-row    { display: flex; justify-content: center; margin: 10px 0 2px; }
.lvl0-count-input  { width: 92px; padding: 8px 10px; text-align: center;
                     font-family: var(--font-heading); font-size: 24px; font-weight: 700;
                     color: var(--ink); background: var(--field-bg);
                     border: 1px solid var(--input-border); border-radius: var(--radius-sm); }
.lvl0-count-hint   { text-align: center; color: var(--muted); font-size: 11px; }
```

---

## 5. Tests (`tests/12-lvl0.test.js`, section 10 « Câblage » + nouvelle section)

Conventions du fichier : **assertions source** sur `script.js` / `style.css` (le script n'est pas
exécuté par le harnais). Prévu (~30 contrôles) :

1. **Point d'entrée** : `startLvl0Roll` défini **une seule fois** ; `createNewButton` bifurque
   `cls === 'lvl0'` → `startLvl0Roll()` sinon `createCharacter(cls)` ; les **2** emplacements
   (liste + état vide) passent par `createNewButton`.
2. **Modale** : `showLvl0CountModal` présent ; `type: 'number'`, `min: '1'`, `max: '20'`,
   `value: '1'` (défaut 1) ; clamp `Math.max(1, Math.min(20` ; annulation → `null` ; pied
   `.modal-actions` standard ; `modal-btn-cancel` + `modal-btn-ok`.
3. **Lot** : `rollLvl0Batch` présent ; `is_active: 0` **dans le corps du create** ; boucle
   `for (… i < count …)` ; `setImportProgress((i + 1) / count` ; **aucun `openSheet(`** dans le
   corps de `rollLvl0Batch` ; `rollSessionId = null` ; toast contenant `auberge` ;
   `loadClassCharacters('lvl0'` ; `hideImportProgress()` ; garde `lvl0Rolling`.
4. **Non-régression** : `rollSessionId = res.character.id` **toujours présent** (chemin 1),
   `DCCLvl0Roll.roll()` toujours appelé à la création, `createCharacter` toujours référencé pour
   les autres classes, `is_active` bien accepté par `api/characters.php` (`$input['is_active']`),
   `showImportProgress()` (sans argument) toujours présent pour l'import.
5. **CSS** : `.lvl0-count-row` / `.lvl0-count-input` / `.lvl0-count-hint` présents, champ centré
   (`text-align: center`), gros chiffre (`font-size: 24px`).

**Batterie complète** `node tests\run.js` → **0 échec** (référence : **3533/3533, 13 skip**).

---

## 6. Documentation

| Fichier | Changement |
|---|---|
| `MANUAL.md` (§ Niveau 0) | Paragraphe **« + Nouveau »** : demande du nombre (1–20, défaut 1), 1 = fiche ouverte + « Autre tirage », > 1 = lot à l'auberge + toast, annulation possible. |
| `README.md` | Puce Niveau 0 (tirage multiple). |
| `TODO.md` | Évolution #3 → **« codée »** (sans commit, comme demandé). |
| `JOURNAL.md` | Entrée datée : reformulation, arbitrages C1–C5, compteurs. |

---

## 7. Étapes d'exécution

1. `script.js` : `showLvl0CountModal` + `startLvl0Roll` + `rollLvl0Batch` + branchement
   `createNewButton` + `showImportProgress(title)`.
2. `style.css` : bloc `.lvl0-count-*`.
3. `node --check script.js` puis **validation du rendu par l'utilisateur** (modale + lot) avant
   les tests et les docs.
4. Tests (section 12) + `node tests\run.js` → 0 échec.
5. Docs (MANUAL, README, TODO, JOURNAL).
6. **Aucun `git add` / `git commit`** — le changement reste non committé (demande explicite).

---

## 8. Risques, points de vigilance, hors périmètre

- **Charge serveur** : 20 persos = **40 requêtes séquentielles** — sur un NAS lent, compter
  quelques dizaines de secondes ; c'est exactement pourquoi l'overlay de progression existe
  (même justification que l'import global, § import). Séquentiel = pas de saturation.
- **Annulation pendant le lot** : l'overlay d'import ne propose **pas** d'annulation (cas
  existant) — on ne l'ajoute pas ici : le tirage est court et les persos créés restent
  supprimables depuis la liste.
- **`showImportProgress` partagé** : le titre devient paramétrable — l'import garde son libellé
  par défaut (test `20-import-limits` vérifie la présence de l'appel sans argument).
- **Échec à mi-parcours** (réseau) : les persos déjà créés **restent** (ils sont en base, à
  l'auberge) ; le toast passe en `error` si `created === 0`, sinon il annonce le compte réel
  (`created`) — jamais un compte théorique.
- **Hors périmètre** : tirage multiple pour les **autres classes** (R6), choix de la répartition
  expédition/auberge (toujours 100 % auberge), suppression de masse, import de lot,
  « Autre tirage » sur un lot.
