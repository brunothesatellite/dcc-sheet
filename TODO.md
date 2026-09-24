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
* A l'usage, voir comment améliorer l'onglet équipe :
1. Avoir quand on clique sur la classe une popup ou une ligne qui se déploie et affiche l'atk CàC, dégats CàC, Atk distance et dégats distance du personnage
1b. changer largeur colonnes ennemis dans équipe
2. classement automatique dans l'ordre d'initiative des personnages ? Intéressant
3. Intégration des ennemis dans le premier tableau ? Pas favorable, cela risque de complexifier...

Je souhaite améliorer l'ergonomie de l'onglet "Équipe" sur mobile.

Contexte :
- Chaque personnage est actuellement affiché sur une ligne du tableau "Personnages en expédition".
- Je veux permettre de consulter rapidement les statistiques de combat :
  - Attaque CàC
  - Dégâts CàC
  - Attaque à distance
  - Dégâts à distance
- Ces informations existent déjà dans la fiche détaillée du personnage.

Objectif UX :
- Ne pas ajouter de nouvelles colonnes au tableau.
- Ne pas utiliser de popup/modale.
- Ne pas utiliser de navigation vers une autre page.
- Conserver un affichage compact par défaut.

Solution à implémenter :
- Rendre le portrait du personnage (ou toute la ligne) cliquable.
- Au clic :
  - Déplier une zone compacte directement sous la ligne du personnage.
  - Au second clic : replier cette zone.
- Un seul personnage peut être ouvert à la fois.
- Ajouter un indicateur visuel (chevron ▼ / ▲ ou équivalent).

Affichage souhaité dans la zone dépliée :

⚔️ CàC : +3 / 1d6+1
🏹 Dist. : +0 / 0

Ou sous forme de deux blocs :

┌───────────────┬───────────────┐
│ ⚔️ Att CàC    │ +3            │
│ ⚔️ Dég CàC    │ 1d6+1         │
│ 🏹 Att Dist.  │ 0             │
│ 🏹 Dég Dist.  │ 0             │
└───────────────┴───────────────┘

Contraintes :
- Mobile first.
- L'animation d'ouverture/fermeture doit être fluide (200-300 ms).
- Respecter la charte graphique existante de l'application.
- La hauteur des lignes du tableau ne doit pas augmenter tant que le détail n'est pas ouvert.
- Le contenu déplié doit utiliser les données actuelles du personnage et rester synchronisé en temps réel.

À réaliser :
1. Identifier le composant qui affiche les personnages de l'équipe.
2. Implémenter l'état "expandedCharacterId".
3. Ajouter l'ouverture/fermeture sur clic.
4. Ajouter le rendu compact des statistiques de combat.
5. Ajouter l'animation CSS.
6. Vérifier le comportement responsive sur smartphone.
7. Conserver l'accessibilité (focus clavier, aria-expanded si applicable).

Je privilégie une expérience de consultation rapide pendant un combat de JDR. La vitesse de lecture est plus importante que l'exhaustivité.

