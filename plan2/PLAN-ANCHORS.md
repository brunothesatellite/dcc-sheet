# PLAN-ANCHORS — Visionneuse « Référence complète » : pages au hasard & ancres incorrectes

> Statut : **analyse terminée, corrections à implémenter**
> Source : bug terrain rapporté le 15/10 (Pixel APK 3.4-test + webapp) :
> « clic sur l'entrée menu → page au hasard, **quasi uniquement au premier
> chargement / refresh** » + « ancres incorrectes aléatoirement » (ex. clic
> « Table 4-7 » → page précédente).
> Méthode : relecture complète `ref-reader.js` / `spell-reader.js` /
> `aide-classes.js` / CSS, simulation de la résolution d'ancres contre le
> **contenu réel** (57 entrées × toc.js + anchors-ref.js + HTML des pages),
> mesure des propriétés des polices et de la structure du sommaire.

---

## 1. Faits mesurés (base de l'analyse)

| Fait | Mesure |
|---|---|
| Sommaire | **62 boutons** (57 entrées + 5 sections), flex-wrap, `--font-heading` majuscules → **~3 000–4 000 px de haut sur téléphone**, sensible aux métriques de police |
| Polices | `font-display: swap` sur **toutes** les 11 faces (`fonts/fonts.css`) ; `--font-heading = Barlow Condensed`, `--font-body = Inter` |
| `document.fonts.ready` | promesse **one-shot** : résolue **avant** l'ouverture dans le cas courant → `.then(reAnchor)` s'exécute immédiatement (no-op, `anchorScroll === null`) et **ne se rejoue jamais** |
| Ancres (simulation exacte de `anchorIdFor` + `textTarget`) | 38 exact + 11 préfixe + 2 texte + **6 haut-de-page** (p.55-61 Table critique DR/DN/G/MV/M sans ids + « Coups précis » p.29) |
| Images dans contentref | **0** → pas de décalage par images |
| `pagePromises` | cache **module-level, persistant entre ouvertures** → 2e ouverture d'une même session = chargements **synchrônes depuis le cache** |
| `preloadAround` | lance **7 chargements concurrents** → ordre de résolution **aléatoire** (réseau) |

---

## 2. Causes racines (classées par probabilité)

### RC1 — `insert()` compense le scroll pour TOUT insertion par `refNode`, même sous le viewport ⚠️ BUG PROUVÉ

`ref-reader.js` `insert()` (et `spell-reader.js` `insert()`, identique) :

```js
if (refNode) {
  var before = body.scrollHeight;
  pages.insertBefore(node, refNode);      // insertion TOUJOURS compensée
  fixTableContinuationsFor(node);
  var delta = body.scrollHeight - before;
  body.scrollTop += delta;                 // ← même si le point d'insertion est SOUS l'écran
  if (anchorScroll !== null) anchorScroll += delta;
}
```

**Scénario** (premier chargement, réseau) : clic sommaire page 12 →
`preloadAround(12)` lance 10,11,13,14,15,16,17 en parallèle. La page **14**
arrive la première (append en fin), puis la **13** arrive « en retard » →
elle prend la branche `refNode` (insertBefore(14)) alors que 13/14 sont à
**~2 000 px SOUS le viewport** → `scrollTop += ~2 500` → **la vue saute d'environ
une page vers le bas = « une page au hasard »**.

**Pourquoi « quasi uniquement au premier chargement »** : à la 2e ouverture de
la session, `pagePromises` sert tout depuis le cache → les inserts se font
**dans l'ordre, en cascade synchrone** → aucun « retardataire » possible. Au
premier chargement/refresh, l'ordre réseau est aléatoire → le bug.

**Particularité ouverture** : juste après `openReference()`, `anchorScroll === null`
→ `reAnchor()` est un no-op → **rien ne corrige le saut** dans cette fenêtre.

### RC2 — Recalage polices mort en pratique : `fonts.ready` one-shot + sommaire géant ⚠️ CAUSE DES ANCRES « AU HASARD »

- Au premier chargement, le sommaire et les pages se rendent avec les **polices
  de repli** (plus larges) → quand Barlow Condensed arrive (`swap`), le sommaire
  **se ré-enroule et raccourcit** (jusqu'à ~une hauteur de page) → **tout le
  contenu en dessous remonte** → on atterrit sur la page précédente ou sur un
  autre intertitre (« Table 4-7 → page précédente »).
- Le garde-fou `document.fonts.ready.then(reAnchor)` est **du code mort dans le
  cas courant** : la promesse est déjà résolue (l'UI principale utilise les
  mêmes familles) → le `.then` s'exécute en microtâche immédiate avec
  `anchorScroll === null` → no-op, et **ne se rejoue jamais** quand les polices
  du viewer finissent d'arriver. `fonts.ready` ne se repend pas.
- **Pourquoi les sorts ne buguent pas** : leur viewer n'a **pas de sommaire
  géant** au-dessus du contenu (drift ~0) et l'ouverture vient après la
  stabilisation des polices.

### RC3 — Ouverture possible avant le chargement de `toc.js` (fenêtre silencieuse premier chargement)

`ensureReady()` appelle `enable()` (**bouton/entrée menu visibles**) **avant**
que `toc.js` ne résolve. Un clic dans cette fenêtre construit le sommaire de
**repli** « Page 5 … Page 61 » (57 boutons génériques) **sans message** — état
dégradé non signalé, propre au premier chargement.

### RC4 — Un échec de chargement de page est mis en cache **définitivement**

`pagePromises[n]` conserve un `null` (404/erreur) jusqu'au refresh. Sur APK
(serveur php-cgi-wasm au démarrage à froid) ou webapp froide, une page
indisponible le reste **toute la session**.

### RC5 — Couverture d'ancres (déterministe, contenu)

6 entrées n'ont **aucun id** dans le contenu et retombent en haut de page ou
sur un rapprochement texte flou : « Table critique DR/DN/G/MV/M » (p.55-61) et
« Coups précis » (p.29). 11 autres entrées passent par la règle **préfixe**
(sensible aux divergences de titres sommaire/page).

### RC6 — `scrollIntoView` : surface de risque (durcissement)

`scrollIntoView({block:'start'})` défile **tous les conteneurs ancêtres** et
hériterait de `html { scroll-behavior: smooth }` (style.css:69) pour tout
scroller documentaire de l'app. Le repli géométrique existant
(`body.scrollTop += gap`) est déterministe et mesurable : il doit devenir la
**méthode principale**.

---

## 3. Plan de correction

### Lot 1 — Viewer (corrections cœur, `ref-reader.js` + miroir `spell-reader.js`)

| # | Correctif | Détail | Test |
|---|---|---|---|
| **1.1** | **RC1 : compensation conditionnelle** | Dans `insert()` des deux lecteurs : mesurer `refNode.getBoundingClientRect().top` **avant** l'insertion ; compenser `scrollTop`/`anchorScroll` **que si le point d'insertion est au-dessus (ou visible au) du bas du viewport** (`refRect.top <= scRect.bottom`). En jsdom (rects à 0) la condition reste vraie → tests actuels inchangés. | 24 + 09 : insert d'un « retardataire » sous le viewport → `scrollTop` **inchangé** ; insert au-dessus → compensé (tests existants conservés) |
| **1.2** | **RC2 : recalage polices fiable** | Remplacer l'armage one-shot par `document.fonts.addEventListener('loadingdone', reAnchor)` (se déclenche à **chaque** fin de chargement de polices) + conserver `fonts.ready` en repli. + `ResizeObserver` sur `.help-toc` (et `.spell-viewer-column` pour les sorts) : toute mutation de hauteur au-dessus de l'ancre → `reAnchor()`. | 24 : stub `document.fonts.dispatchEvent({type:'loadingdone'})` → re-scroll vers l'élément ancre |
| **1.3** | **RC6 : scroll géométrique** | `scrollToTarget(el)` : `body.scrollTop += el.getBoundingClientRect().top - body.getBoundingClientRect().top` en **primaire**, `scrollIntoView` en repli si géométrie absente. Plus d'effet de bord sur les conteneurs ancêtres. | 24 : le stub d'enregistrement voit un seul scroll, déterministe |
| **1.4** | **RC3 : sommaire reconstruit** | Extraire `renderToc()` ; l'appeler à l'ouverture **et** après `loadToc()` si `toc` était null (le sommaire de repli est remplacé par le vrai dès qu'il arrive, sans réouverture). | 24 : ouverture avec `toc` absent puis arrivée tardive → les 62 vrais boutons remplacent les génériques |
| **1.5** | **RC4 : cache d'échec évitable** | `loadPage` : si le résultat est `null`, `delete pagePromises[n]` → la tentative suivante (re-clic, scroll) recharge au lieu de rester bloqué. | 24 : 1er chargement en échec → 2e tentative réussie (stub alterné) |

### Lot 2 — Contenu (`dcc-spells-reader/contentref`, hors ce dépôt)

| # | Correctif | Détail |
|---|---|---|
| **2.1** | **RC5 : ids manquants** | Ajouter les `id` sur les intertitres de p.55-61 (Tables critiques DR/DN/G/MV/M) et « Coups précis » p.29 → les 6 entrées en haut-de-page deviennent des ancres directes (audit : 49/57 → **57/57**). |
| **2.2** | **Audit verrouillé en CI** | Promouvoir la simulation (`anchorIdFor` + `textTarget` rejoués contre toc/anchors/HTML réels) en script de tests (`tests/26-anchors-audit` ou `tools/audit-anchors.cjs` appelé par la suite) : verrouille la résolution et **signale toute régression** quand le contenu bouge. |

### Lot 3 — Instrumentation & recette device

| # | Action | Détail |
|---|---|---|
| **3.1** | **Trace debug** | Drapeau `?debug=anchors` (ou `localStorage`), strippé en release : chaque étape de `scrollToPage`/`insert` logue `{page, branche insert, refRect.top vs scRect.bottom, delta, scrollTop avant/après, anchorEl, fonts state}` dans un tampon consultable en console/panneau masqué. |
| **3.2** | **Protocole Pixel** | (a) force-stop → ouverture Référence **immédiatement** + clics rapides × 10 ; (b) session chaude (polices en cache) × 10 ; (c) clics sur les 6 entrées à ancres manquantes. Comparer les traces avant/après correctifs. |
| **3.3** | **Non-régression sorts/résumés** | 1.1/1.3 touchent `spell-reader.js` : suites 09 (149) + 19 (109) + 21 (103) doivent rester au vert ; résumés (`aide-classes`) non impactés (pas d'`insert`). |

---

## 4. Ordre d'implémentation proposé

1. **1.1 + 1.3** (cœur, ~1 h) → tests 24/09, suite complète.
2. **1.2 + 1.4 + 1.5** (~1 h) → tests 24.
3. **3.1** instrumentation (flag) → build `3.5-test` + recette 3.2 sur Pixel.
4. **2.1** (contenu, côté dcc-spells-reader) → **2.2** audit verrouillé → rebuild dcc-content.
5. Release `3.5` une fois la recette terrain validée.

## 5. Critères de succès

- Premier clic menu + clics sommaire répétés (session froide) : **aucun saut**,
  atterrissage exact sur l'intertitre visé ; traces à l'appui.
- Les 6 entrées actuellement en haut-de-page atterrissent sur leur table.
- 3 389+ tests au vert ; sorts et résumés inchangés à l'œil.
