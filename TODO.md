**TODO**
* N/A

**BUGS**
*Critique*
* N/A — État combat de l'onglet Équipe (Init. combat, tours, ennemis) désormais en base (`users.team_state`) + export/import JSON `team_state` (livré le 6 octobre 2026)


*Majeur*
* N/A

*Mineur*
* N/A


**EVOLUTIONS**
* ✅ Ajouter un onglet Level 0 — **livré le 6 octobre 2026** (branche `evol-level0` ; spec `plan0/lvl0-spec.txt`, plan `plan0/PLAN-LVL0.md`) :
- Génération automatique d'un niveau 0 : tirage complet (nom, métier + arme + équipement, 6 caracs en 3d6, CA/PV/initiative, jet chanceux, langues, notes raciales, équipement, trésor 5d12 pc, portrait selon le métier) + bouton **Autre tirage** pour rejouer le tirage à volonté (présent seulement pendant la session de tirage)
- Edition d'un niveau 0 comme un perso normal (fiche simplifiée : bloc commun **sans dé de vie** + Notes, auto-save, export/import, expédition/auberge, présence dans l'onglet Équipe)
- Conversion d'un niveau 0 en niveau 1 dans une vraie classe (bouton **Promouvoir** : contrainte raciale, case « supprimer le niveau 0 », recopie de la fiche sauf portrait, ouverture directe)