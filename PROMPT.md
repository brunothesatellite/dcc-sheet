regarde DCC_Fiche_Clerc_v2_éditable.pdf 
C'est une feuille de personnage éditable pour le jeu de rôle dungeon crawl classics, pour la classe de Clerc. Il y en a d'autres dans le répertoire (7 au total).
J'aimerai faire un site web (html/css/js/php, webapp single app), responsive, particulièrement adapté à l'affichage sur smartphone.
Dans ce site je vais pouvoir créer un compte pour sauvegarder mes personnages. Le site proposera en HTML une fiche pour chaque classe de personnage (7 fiches donc), accessible sous forme d'onglet (1 onglet par classe). Pour une classe donnée, je veux reproduire exactement la fiche en PDF avec les champs éditables comme dans le PDF mais avec ces différences : pas besoin des dessins et images du PDF, et le PDF est trop large pour tenir sur une seule page, donc coupe la page PDF en deux pages A5 et empile les deux colonnes (comme les captures d'écran données dans le prompt, tu fais ce découpage pour chaque classe et tu empiles en vertical).
Il faudra aussi avoir un thème sombre et clair (par défaut le thème est celui de l'OS).
Toutes les modifications sur les champs éditables sont persistées dans la base de donnée.
Pour la gestion des utilisateurs et la sauvegarde en base de données, copie le mécanisme de D:\VS_Code_Workspaces\fabled-lands-sheet (ce dossier est en lecture seule, interdiction d'y écrire !) sur une base php/sqlite3.
Fais un plan pour la structure globale du site et sur toutes les activités que tu prévois, affiche le dans le prompt et écris le dans PLAN.md
Ensuite fais moi deux maquettes HTML 
1 : ce que donnerait l'onglet "Clerc" en te basant sur le PDF fourni et les 2 captures d'écrans (fait une maquette avec les champs éditables)
2 : une maquette sur site complet (laisse les onglets des classes vides).

on va affiner  le plan : en base il faudra persister tous les champs de toutes les fiches de personnages, 0 à plusieurs fiches par classe, donc x fiches à persister intégralement. Le login sera celui du joueur. N'invente rien pour les champs de chaque classe, tout est indiqué dans chaque PDF de classe, attention il y a des variantes entre les classes, donc la référence reste les PDF des classes. Cette application ne décrit pas un joueur, mais une équipe complète de plusieurs personnages (x personnages par classes, x pouvant être égale à 0). Certains seront actifs, d'autres inactifs (à l'auberge). Il faudra pouvoir indiquer facilement quelles personnages de chaque classe sont actifs et ajouter un interrupteur sur chaque fiche de personnage pour l'activer ou l'envoyer à l'auberge.
Ergonomiquement, si un seul personnage est actif, quand je clique sur l'onglet de sa classe, ça ouvre sa fiche dans l'onglet, mais je peux choisir un autre personnage pour l'activer et l'afficher. Il peut y avoir plusieurs personnages actifs par classe, ou aucun. 
Utilise une architecture modulaire, si je veux apporter une modification à un onglet de classe, cela ne doit pas impacter les autres onglets.
Met à jour PLAN.md et Crée une nouvelle maquette maquette_site.html

PHP est installé en local ici : D:\VS_Code_Workspaces\php
Pour les tests tu pourras déployer sur mon serveur dans W:\dcc-sheet
