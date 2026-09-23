**TODO**
* N/A

**BUGS**
*Critique*
* N/A

*Majeur*
* N/A

*Mineur*
* Quand je modifie un texte, sauvegarder après une petite tempo (voir D:\VS Code\fabled-lands-sheet EN READONLY pour mécanisme de temporisation à la sauvgarde) pour ne pas matraquer la base de sauvegarde à chaque touche

**EVOLUTIONS**
* afficher le portrait sur la tuile dans la liste des personnages
* je veux rendre plus générique le mécanisme des portraits pour les personnages :
- cree un portrait-icons.js qui va référencer dcc-icons.js, dd-red-box-icons.js et shadow-icons.js => ce fichier sera évolutif, si je veux ajouter un nouveau set de portraits, je créérai un nouveau fichier js que j'inclurai dans portrait-icons.js
- dcc-icons.js, dd-red-box-icons.js et shadow-icons.js => ajoute dans chaque fichier un label qui servira pour la sauvegarde / restauration des portraits, pour connaire la source de portrait_index; pour la compatibilité dcc-icons = "dcc",  dd-red-box-icons = "redbox" et shadow-icons = "shadow", comme ça cette source sera utilisée dans "portrait_source" et on ne casse pas la compatibilité avec la DB et les json. Ajoute aussi dans chaque js un label pour l'affichage : dcc-icons  = "Dungeon Crawl Classics", red-box-icons = "D&D Red Box 1983", shadow = "Leremy Gan"
- maintenant pour l'affichage du portrait, par défaut quand je crée un personnage ou édite un personnage sans portrait, on fait comme actuellement : on prend l'index 0 des portraits dcc. Mais je ne veux plus d'interrupteur pour choisir entre dcc et redbox, et supprime le cycle des portraits quand on clique dessus. à la place, quand je clique sur un portrait, je veux que ça ouvre une fenêtre popup de sélection des portraits disponibles pour la classes, organisés par section. Utilise le label du js pour le titre de chaque section et affiche sur 2 colonnes toutes les images disponibles pour la classe dans chaque section. Si je clique sur un portrait, ça le sélection pour la fiche de personnage et ferme la popup. Quand j'ouvre la popup, cela centre la liste des portraits sur celui sélectionné dans la fiche et sélectionne ce portrait dans la liste visuellement.
Préserve le mécanisme de sauvegarde en dB et export / import json lors de ces modificartions.
Reformule et fait un plan, ne code rien.