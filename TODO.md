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
* Ajouter Shadow aux choix de portraits ? Refaire une capture et mise à jour MANUAL / README
## Portrait Style Selector
 
Position the selector directly below the main character portrait.
 
### Layout
 
The currently selected portrait is displayed in large format.
 
Under the portrait, display three visual style options as thumbnail cards.
 
Example:
 
+--------------------------------------------------+
| |
| MAIN PORTRAIT |
| |
+--------------------------------------------------+
 
Portrait style
 
+-----------+ +-----------+ +-----------+
| | | | | |
| Thumbnail | | Thumbnail | | Thumbnail |
| DCC | | D&D Red Box | | Shadow |
| | | | | |
+-----------+ +-----------+ +-----------+
✓
 
### Interactions
 
- Each option is represented by a small preview image of the actual portrait style.
- Tapping a thumbnail immediately applies the style.
- No validation button is required.
- The selected card has:
- a 2-3px accent-colored border
- a subtle elevation/shadow
- a slight scale-up effect (102%-105%)
- a checkmark badge in the top-right corner
- keep the existing behavior when the user tap on the portrait for DCC and D&D Red Box. For the new style Shadow, use shadow-icons.js as image source (1 single portrait per class) and use the same behavior on click a D&D Red Box (no effect on clic)
 
### Visual Design
 
- Use Material 3 principles.
- Cards should have rounded corners (12-16px radius).
- Maintain equal spacing between cards.
- Thumbnails should be large enough to identify the visual differences.
- Labels appear below each thumbnail.
 
### Mobile Behavior
 
- All 3 options are visible simultaneously.
- No dropdown menu.
- No carousel.
- No switch/toggle.
- No modal.
 
### UX Goal
 
The user should be able to compare all available portrait styles at a glance and switch between them with a single tap.
 
The selector should feel similar to:
- avatar selection in modern mobile apps
- theme selection in Android settings
- skin/style selection in modern games
 
The emphasis is on visual comparison rather than text labels.