# MARCHING_ORDER.md
 
## Objectif
 
Ajouter un système visuel d'ordre de marche pour les personnages en expédition.
 
Cette fonctionnalité doit être entièrement compatible :
 
- PC (souris)
- Mobile Android (tactile)
- Responsive
 
La solution doit fonctionner aussi bien sur desktop que sur smartphone.
 
---
 
# Emplacement
 
Ajouter une nouvelle section nommée :
 
"Ordre de marche"
 
Cette section doit être affichée au-dessus du tableau des personnages en expédition.
 
---
 
# Affichage
 
Afficher une grille 3 colonnes × 3 lignes centrée horizontalement.
 
Au-dessus de la colonne centrale, afficher une petite flèche orientée vers le haut afin d'indiquer la direction du groupe.
 
Exemple :
 
    ↑
[ ][ ][ ]
[ ][ ][ ]
[ ][ ][ ]
 
La grille représente les positions :
 
0 1 2
3 4 5
6 7 8
 
---
 
# Personnages affichés
 
Afficher dans la grille les personnages actuellement présents dans l'expédition.
 
Limite maximale :
 
9 personnages
 
Placement initial :
 
- de gauche à droite
- puis de haut en bas
 
Exemple :
 
0 = premier personnage
1 = deuxième personnage
2 = troisième personnage
etc.
 
---
 
# Contenu des cases
 
Chaque case affiche :
 
- le portrait du personnage
- son nom sous le portrait
 
Le nom doit :
 
- être centré
- rester sur une seule ligne
- utiliser text-overflow: ellipsis
- masquer le dépassement
 
Exemple :
 
Alovnek le Brave
 
devient
 
Alovnek le...
 
---
 
# Cases vides
 
Si moins de 9 personnages sont présents :
 
- les cases restantes restent vides
 
---
 
# Plus de 9 personnages
 
La grille reste limitée à 9 positions.
 
Les personnages au-delà des 9 premiers ne sont pas affichés dans l'ordre de marche.
 
---
 
# Réorganisation des positions
 
## Desktop
 
Prise en charge du drag & drop à la souris.
 
Comportement :
 
- clic maintenu
- déplacement
- relâchement
 
---
 
## Mobile Android
 
Prise en charge tactile par :
 
- appui long (~400 ms)
- activation du mode réorganisation
- glisser
- relâcher
 
Ne PAS démarrer un déplacement immédiat au touch.
 
L'utilisateur doit continuer à pouvoir faire défiler la page normalement tant que l'appui long n'est pas atteint.
 
---
 
# Mode réorganisation
 
Lorsqu'un personnage entre en mode déplacement :
 
- légère mise à l'échelle (agrandissement)
- ombre portée
- effet de carte soulevée
- fluidité des animations
 
Pendant le déplacement :
 
- la grille met visuellement en évidence les emplacements disponibles
- le portrait déplacé reste visible
 
IMPORTANT :
 
pendant le déplacement, afficher également le nom du personnage directement superposé au portrait.
 
Objectif :
 
sur smartphone, même si le doigt masque partiellement l'image, l'utilisateur doit savoir quel personnage il déplace.
 
---
 
# Règles de déplacement
 
## Déplacement vers une case vide
 
Le personnage est simplement déplacé.
 
L'ancienne case devient vide.
 
---
 
## Déplacement vers une case occupée
 
Les deux personnages échangent leurs positions.
 
Aucune confirmation utilisateur n'est requise.
 
Le comportement doit être instantané.
 
---
 
# Persistance
 
Chaque personnage possède une position d'ordre de marche.
 
Exemple logique :
 
```json
{
"marchingOrder": {
"character-id-1": 0,
"character-id-2": 4,
"character-id-3": 8
}
}
```
 
La position correspond à l'index de la grille :
 
```text
0 1 2
3 4 5
6 7 8
```
 
---
 
# Sauvegarde automatique
 
Après chaque déplacement :
 
1. mettre à jour l'affichage
2. sauvegarder immédiatement en base de données
 
Aucun bouton "Enregistrer" ne doit être nécessaire.
 
---
 
# Réinitialisation automatique
 
L'ordre de marche doit toujours refléter la liste actuelle des personnages en expédition.
 
## Ajout d'un personnage
 
Si un personnage est ajouté à l'expédition :
 
1. supprimer la disposition actuelle
2. recréer automatiquement l'ordre
3. replacer les personnages de gauche à droite puis de haut en bas
4. sauvegarder immédiatement
 
---
 
## Suppression d'un personnage
 
Si un personnage est retiré de l'expédition :
 
1. supprimer la disposition actuelle
2. recréer automatiquement l'ordre
3. replacer les personnages de gauche à droite puis de haut en bas
4. sauvegarder immédiatement
 
---
 
# Export JSON
 
L'export JSON doit inclure les positions d'ordre de marche.
 
Exemple :
 
```json
{
"expeditionCharacters": [],
"marchingOrder": {
"character-id-1": 0,
"character-id-2": 4,
"character-id-3": 8
}
}
```
 
---
 
# Import JSON
 
Lors d'un import JSON :
 
- restaurer les positions sauvegardées
- reconstruire la grille dans le même état
- sauvegarder l'état restauré si nécessaire
 
---
 
# Exigences techniques
 
- Compatible PC
- Compatible Android
- Compatible écrans tactiles
- Responsive
- Utiliser Pointer Events si possible pour unifier souris et tactile
- Éviter les librairies lourdes si la fonctionnalité peut être développée nativement
- Sauvegarde immédiate après chaque modification
- Interface fluide même sur smartphone
 
---
 
# Critères d'acceptation
 
- Grille 3×3 visible au-dessus des personnages en expédition
- Flèche de direction visible
- Portrait + nom affichés
- Ellipsis sur les noms trop longs
- Drag & drop souris fonctionnel
- Appui long (~400 ms) fonctionnel sur Android
- Mode réorganisation visuellement identifiable
- Nom affiché sur le portrait durant le déplacement
- Échange automatique des personnages lors d'un dépôt sur une case occupée
- Déplacement vers les cases vides
- Sauvegarde automatique après chaque changement
- Persistance en base de données
- Gestion export JSON
- Gestion import JSON
- Réinitialisation automatique lors d'un ajout ou d'une suppression de personnage dans l'expédition