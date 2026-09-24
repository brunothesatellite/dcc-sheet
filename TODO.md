**TODO**
* N/A

**BUGS**
*Critique*
* N/A (24/09 : portraits/noms de la grille ordre de marche non mis à jour → corrigé dans `resync()`)
* réduit un peu la taille des case du marching order (24/09 : grille passée de 360 à 300 px)
* le marching order semble bien sauvé en base et exporté en json mais il n'est pas restauré quand je recharge la page, et vérifie aussi le cas de l'import json (24/09 : corrigé — les trous de position = cases vides déposées par le drag sont désormais acceptés par l'invariant ; plus d'écrasement silencieux au rechargement ; import JSON vérifié de bout en bout par la nouvelle suite `07-restore`)
* les personnages non actifs sont bien sauvés en base et en export json, mais si je fais un export / import json, ils sont de nouveau actifs (24/09 : corrigé — `create` accepte désormais `is_active` 0/1 validé, l'import le transmet ; validation/reconstruction de l'ordre de marche limitées aux persos actifs — suite `07-restore`, 35 assertions)

*Majeur*
* N/A

*Mineur*
* Quand je modifie un texte, sauvegarder après une petite tempo (voir D:\VS Code\fabled-lands-sheet EN READONLY pour mécanisme de temporisation à la sauvgarde) pour ne pas matraquer la base de sauvegarde à chaque touche

**EVOLUTIONS**
* A l'usage, voir comment améliorer l'onglet équipe :
marching order → **livré le 24/09** (voir MANUAL § 8.1c)
classement automatique dans l'ordre d'initiative des personnages ? Intéressant
Intégration des ennemis dans le premier tableau ? Pas favorable, cela risque de complexifier...

