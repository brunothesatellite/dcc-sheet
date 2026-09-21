**TODO**
* Bruno doit vérifier que les champs sont bien nommés pour chaque classe et qu'il n'y a aucun oubli
1. Clerc - OK
2. Elf - OK
3. Guerrier - OK
4. Halfelin - OK
5. Mage - OK
6. Nain - OK
7. Voleur - OK
* Refaire une passe sur les champs labels qui sont plutôt du pur texte au lieu de textarea readonly - OK
* Bruno doit proposer des améliorations d'IHM par rapport aux fiches de personnage (la liste des sorts par exemple) - OK

**BUGS**
*Critique*
* [DONE] BUG 1 : Les fiches de personnage doivent reprendre la mise en page des PDF, par exemple pour le Clerc, je veux que sa fiche corresponde à la maquette que tu avais réalisée. Retravaille la fiche du Clerc pour qu'elle soit comme sur la maquette présentée et conforme au PDF (maquette_clerc.html)
* [TOCHECK] BUG 5 : Aucun champ ne semble sauvegardé en base. PLAN_DB.md comme départ

*Majeur*
* [DONE] BUG 2 : Pour les parties communes à toutes les classes, le layout doit être identique entre les classes. Réutilise le layout validé de la classe Clerc pour la partie commune des autres classes.

*Mineur*
* BUG 3 : Quand je créé un nouveau personnage, il reste un résidu d'IHM au dessus de lui, je dois faire un refresh pour qu'il prenne tout l'espace de l'onglet de sa classe
* [DONE] BUG 4 : quand j'affiche une fiche de personnage : inconsistence entre les deux interrupteur, celui du haut affiche encore "à l'auberge" alors que celui du bas affiche 'en expédition"


**EVOLUTION**
*SECTION NOTE*
[DONE] Chaque fichee de personnage doit offrir une section "Notes" de type textarea en base de la fiche

*INFO SAUVEGARDE*
[DONE] Indiquer comme dans le projet fabled-lands-sheet quand un enregistrement est réalisé avec un icone d'enregistrement qui apparait à l'écran (inspire toi de l'autre projet)

*ONGLET EQUIPE*
A un moment, il faudra ajouter un onlget "Equipe" qui va récapituler les éléments principaux des personnages actifs dans un onglet = Liste des personnages sous forme de tableau :
colonnes : 
* Nom 
* Classe
* Initiative
* AC
* PV (modifiable et synchronisé avec la fiche de personnage)
* Initiative combat (champ numérique vide par défaut)
* compteur de tour (0 par défaut; clic droit / appui long sur mobile remise à zéro; clic gauche ou appui simple : incrément de 1)
Une ligne par feuille de personnage active

Sous ce tableau, un tableau avec les colonnes
* Ennemi (champ texte)
* Initiative (champ numérique)
* AC (champ numérique)
* ATT (champ texte)
* PV (champ numérique)
* compteur de tour (0 par défaut; clic droit / appui long sur mobile remise à zéro; clic gauche ou appui simple : incrément de 1)
Prévoit plusieurs lignes vides, 3 par défaut, et un bouton +/- pour en ajouter supprimer, et un bouton raz pour vider ce tableau





