# PLAN-MARCHING.md — Ordre de marche (implémentation réelle)

> Décisions validées : stockage `users.marching_order` (pattern `team_notes`) ; **livraison code réel uniquement** (la maquette `maquettes/marching-order.html` n'est pas alignée) ; **aucun commit** sans demande explicite.
> Le schéma JSON/DB proposé dans `MARCHING-ORDER.md` est **ignoré** (diverge du schéma réel) — voir §3.

## 1. Invariant client (source unique de vérité)

**Valide ⟺** `k = min(n, 9)` entrées, ids ⊆ expédition (`is_active = 1`), positions **bijectives sur {0..k‑1}`** (aucun trou, aucun doublon, valeurs entières 0..8).

- `normalize(order, expeditionChars)` : purge des ids stalles (perso supprimé / auberge) ; **toute anomalie → reconstruction totale** (gauche→droite, haut→bas, positions >8 non persistées) + `changed: true` ; idempotente.
- Appelée à **chaque** `loadEquipe` → tout changement de composition (création, suppression, `set_active`, import) est détecté au rechargement et déclenche reinit + save automatiques. Aucun trigger spécial à câbler.

## 2. DB + API

### `api/db.php`
```sql
users.marching_order TEXT NOT NULL DEFAULT '{}'   -- {"<id perso>": 0..8}
```
- Ajout au CREATE TABLE `users` (après `team_notes`) + `ALTER TABLE ... ADD COLUMN` protégé try/catch (copie du motif team_notes, l.30-36).

### `api/auth.php` (après `save_team_notes`, l.45)
| Action | Méthode | Payload | Réponse |
|---|---|---|---|
| `get_marching_order` | GET | — | `{ok, order}` (TEXT brut, défaut `{}`) |
| `save_marching_order` | POST | `{order}` | `{ok}` |

- `requireLogin`, plafond 2 Ko.
- Validation serveur stricte : objet (pas array), clés entières, valeurs **entières 0..8**, **unicité des positions** → sinon `jsonError('Positions invalides', 400)` (défense en profondeur). Re-encode canonique avant UPDATE.

## 3. Export / import JSON (extension enveloppe existante, **pas de bump `version`**)

```json
{ "version": 1, "exported_at": "...", "team_notes": "...",
  "marching_order": { "0": 4, "1": 0, "2": 8 },
  "characters": [ ... ] }
```

- Clé = **index dans `characters[]`** : l'import supprime tout et recrée les persos avec de **nouveaux ids DB** (script.js l.402-415) — les ids ne survivent pas, les index si (la boucle de création conserve l'ordre du tableau).
- Export : positions des persos `is_active = 1` uniquement.
- Import (`hasOwnProperty`, rétrocompat comme `team_notes` l.418-424) :
  1. remap `index → nouvel id` ;
  2. validation invariant sur la nouvelle expédition ;
  3. **≥ 2 persos sur la même case → discard + réinitialisation complète** (règle explicite) ; idem trou / id hors expédition / valeur hors 0..8 ;
  4. champ absent → reconstruction normale (ids neufs ⇒ ancien ordre obsolète) ;
  5. `invalidateEquipePanel()` existant (l.427) gère le rechargement.

## 4. Étapes d'implémentation

1. **`marching-order.js` (nouveau, racine)** — `window.DCCMarching` : `normalize`, `buildExportMap(characters, orderMap)` → `{"<index>":pos}` (is_active only), `remapImport(exportMap, idByIndex)`, `validateImported(order, expeditionIds)` (doublons/invalides → false), `rebuild(expeditionChars)` (0..n‑1).
2. **`index.html`** : `<script src="marching-order.js">` avant `script.js` (entre l.77 et l.78).
3. **`api/db.php`** : colonne + ALTER protégé.
4. **`api/auth.php`** : les 2 actions + sanitization/unicité.
5. **`script.js`** :
   - helpers `getMarchingOrder` / `saveMarchingOrder` (miroir notes, l.269-276) ;
   - `loadEquipe` (l.653-673) : fetch → `normalize` → save si `changed` → passe `(order, onSaveMarching)` à `equipe.render` ; callback = save + `showToastSave()` ; erreur → `showToast('Erreur sauvegarde', 'error')` ;
   - export (l.342) : fetch ordre avant la boucle ; `exportObj.marching_order` construit pendant la boucle (ids dispo via `detail.character.id`) ;
   - import : collecte `createdIds[i]` (boucle l.407-416) → logique §3 après la gestion `team_notes`.
6. **`classes/equipe.js`** :
   - signature `render(container, characters, onSavePV, initialNotes, onSaveNotes, marchingOrder, onSaveMarching)` (params 6-7 **optionnels** → tests 04 intacts) ;
   - avant `sectionChars` (l.402), si `characters.length > 0` : section **repliable** « Ordre de marche » — `button.section-bar.collapse-toggle[aria-expanded="true"][aria-controls]` + chevron SVG animé + `.collapsible > .collapsible-inner > .marching-panel` (flèche ↑, `.marching-grid` 3×3, méta « n/9 affichés ») ;
   - portraits réels : `window.getPortraitSrc(data.portrait_source || 'dcc', charData.class, data.portrait_index).src` en `<img class="marching-portrait">` + `.marching-name` (1 ligne, `text-overflow: ellipsis`, `title` = nom complet) ;
   - drag & drop porté de la maquette : Pointer Events unifiés — souris dès >4 px, tactile **appui long 400 ms** (`touch-action: pan-y` + annulation si mouvement avant le timer, `touchmove` non-passif bloqué pendant le drag), ghost fixe centré sur le pointeur avec **nom superposé au portrait**, `scale(1.06)` + ombre, cibles disponibles surlignées (swap ⇄ sur occupée), échange instantané sans confirmation ;
   - drop → map locale `{id:pos}` → `onSaveMarching(newOrder)` ; re-rendu de la **seule grille** (conserve les états dépliés).
7. **`style.css`** :
   - près `.section-bar` (l.854) : `.collapse-toggle` (reset button, hover, `focus-visible`), `.chev` rotation (`aria-expanded`), `.collapsible` transition `grid-template-rows: 1fr→0fr`, `.section-bar.collapsed` (radius complet) ;
   - près des styles team (~l.1970) : `.marching-arrow`, `.marching-grid`, `.marching-slot(+ .occupied)`, `.marching-portrait`, `.marching-name`, `.dragging-src`, `.marching-dragging` (outlines), `.drop-target`, `.marching-ghost`, `.marching-name-overlay` ;
   - tokens globaux → light/dark automatiques ; ajustements dans le media 600px (gap, font-size) ;
   - contraintes 02-css : **accolades équilibrées**, aucun selector existant supprimé.
8. **Tests** :
   - nouveau `tests/06-marching-order.test.js` + registration dans `tests/run.js` : normalize (valide inchangé, **doublon→rebuild**, trou, id stale, hors 0..8, n=0, n=12→9 entrées {0..8}, idempotence), `buildExportMap` (is_active only, index keys), `remapImport` (bornes), `validateImported` (doublons→false) — chargement via `env.load('marching-order.js')` ;
   - extension `tests/04-equipe.test.js` : section présente, 9 slots, toggle `aria-expanded` ;
   - jsdom sans `PointerEvent` → tests structure + logique pure uniquement (pas de drag simulé).
9. **Docs** : `MANUAL.md` (section Ordre de marche : PC/Android + champ `marching_order` export/import + règle réinit doublons), `README.md` (bullets feature + endpoints), `JOURNAL.md` (entrée de session).
10. **Validation** : `PHP_BIN=D:\VS_Code_Workspaces\php\php.exe npm test` + `node --check` sur les JS touchés + `git status` (fichiers prévus uniquement, **aucun commit**).

## 5. Risques

- Tests 04 existants : signature rétrocompatible atténué ; sélectionneurs de compteurs (`tr.team-detail`, `.char-class[aria-expanded]`) non impactés par la nouvelle section.
- 01-syntax auto-couvre le nouveau fichier root + lint PHP ; 02-css vérifie l'équilibrage CSS.
- Export mono-perso (script.js l.1393) : hors périmètre, inchangé.
- Drag en jsdom : non simulé (fallback `PointerEvent` absent) → couverture via logique pure.
