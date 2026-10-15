# Optimisation affichage des tableaux — Référence complète (mobile)

> Statut : **implémenté le 16/10/2026** (commit en attente) — `table-fit.js`
> + câblage `insert()` sorts/référence + CSS + tests (86/86 rejoués sur le
> contenu réel, suites 09 +6 et 24 +12 → 3381/3381).
> Contexte : en mobile (≤ 599 px), TOUS les `table.stackable` sont éclatés en
> tuiles (1 ligne = 1 carte « label : valeur »). Trop lourd pour les tableaux
> de valeurs qui tiendraient en largeur.

## Mesures (pages 5…61, 70 tableaux)

Méthode : `C:\Users\Bruno\AppData\Local\Temp\opencode\analyse-tables-ref2.cjs`
(scripts jetables, hors repo) — colonnes, lignes, longueur max des cellules
corps vs en-têtes ; largeur estimée à 12 px et 11 px, en-têtes sur 2 lignes,
largeur utile ~344 px (écran 360 px). Famille D = paragraphes 200-800 car.

### A. Tient en tableau à ~12 px (11 tableaux)

p.5 t2 (Table 1-4 PX), p.5 t3 (DD), p.9 t2 + t3 (Imposition),
p.15 (Armes), p.16 t1 (Munitions), p.16 t2 (Armures — limite),
p.16 t3 (Équivalences), p.17 (Équipement), p.18 (Montures),
p.19 t1 (Activités — colonne à retour auto).

### B. Tient en tableau à ~11 px (6 tableaux)

p.5 t1 (Table 1-1), p.6 (Augures — **à valider visuellement**, 30 lignes),
p.12 t2 (Nain), p.13 t2 (Voleur), p.19 t2 (Table 4-1),
p.54 (Table 9-10 — cas vitrine, ~360 px, quasi sans scroll).

### C. Matrices larges → scroll horizontal (15 tableaux)

`.table-wrap` a déjà `overflow-x: auto` : exempter de l'empilement suffit.
p.9 t1 (Clerc 12 col.), p.10 (Repousser), p.11 t1 (Guerrier), p.11 t2 (Mage),
p.12 t1 (Elfe), p.13 t1 (Halfelin), p.14 t1-t3 (Voleur-skills 11 col.),
p.30 t2 (Deux armes — note 124 car. en scroll), p.31 (Comparatif 18 col. —
pire cas actuel : **306 tuiles**), p.49/50/51 (listes de sorts),
p.52 (Patrons).

### D. À éclater comme aujourd'hui (38 tableaux, texte long)

p.7, p.8 (Métiers — 47+33 lignes ; discutable, revoir si demandé),
p.20-25 (Maladresses + Critiques I-V), p.26-29 (HFA : aveuglantes,
désarmement, repousser, mises à terre, coup précis, ralliement),
p.30 t1 (défensives), p.32-35 (contresort, phlogiston ×2, brûlesort),
p.37-42 (mercurielle ×6), p.43-45 (corruptions), p.46 (revers),
p.47-48 (défaveur ×2), p.55-61 (critiques monstres DR/DN/G/MV×2/M).
(p.36 et p.53 : sans tableau. Total 11+6+15+38 = 70.)

## Proposition validée

1. **A+B en tableau** : fonte 12 px / 11 px, en-têtes multi-lignes, colonnes
   texte en retour auto.
2. **C en scroll horizontal** (pas d'empilement).
3. **D éclaté** + **tuiles allégées** (marges/paddings réduits, n° de jet
   en ligne plutôt qu'en bandeau).
4. **Mécanisme** : score automatique à l'affichage dans `ref-reader.js`
   (nb colonnes + longueur max cellules → classes `keep-table` /
   `scroll-table`) — pas de liste en dur car `contentref` évolue encore.
   CSS : le défaut « empilé » ne change qu'en présence de ces classes.

## Garde-fous anti-régression

- **15 sorts** (content/ p.127-128, 144-146, 208-209, 212-216, 255-257)
  utilisent aussi `stackable` : **inchangés** (défaut CSS intact,
  `ref-reader.js` ne tourne que dans la Référence).
- Résumés des classes : zéro `stackable` → intacts.
- Desktop (> 599 px) : tableaux normaux, inchangé.
- Tests : étendre la suite 24 (cas A/B/C/D + sorts `stackable` intacts).
