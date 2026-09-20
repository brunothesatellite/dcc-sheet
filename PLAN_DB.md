# PLAN_DB - Persistance complete + indicateur de sauvegarde

## Contexte

Toutes les donnees des fiches de personnage sont stockees dans une colonne JSON `data` de la table `characters`. Le mechanisme actuel :

1. `collectSheetData()` (script.js:702) lit tous les `input[data-key]`, `textarea[data-key]`, `select[data-key]` du DOM
2. `scheduleSave()` (script.js:679) debounce a 400ms
3. `flushSave()` (script.js:689) appelle `saveCharacter()` qui POST vers `api/characters.php?action=save`
4. Le PHP encode le JSON et le stocke dans `data`

**Probleme** : pas d'indicateur visuel que la sauvegarde a eu lieu. Pas de verification que tous les champs sont bien capturees.

---

## Partie 1 : Indicateur de sauvegarde (toast)

### Pattern fabled-lands-sheet

```js
// Toast container (fixed, bottom-right)
// Animation : entre par le bas, reste 1.5s, sort
// Types : 'save' (icone disquette), 'error' (rouge), 'load'
function showToast(message, type) { ... }
function showToastSave() {
    clearTimeout(toastSaveTimer);
    toastSaveTimer = setTimeout(function(){ showToast('&#128190;', 'save'); }, 600);
}
```

```css
.toast-container { position:fixed; bottom:1rem; right:1rem; z-index:9999; }
.toast { animation:toast-in .2s ease forwards; }
.toast.toast-out { animation:toast-out .2s ease forwards; }
.toast-save { border-left:4px solid var(--red); }
```

### A implementer dans dcc-sheet

1. **Ajouter dans `script.js`** :
   - Variable `toastContainer` ( creee a la demande )
   - Variable `toastSaveTimer`
   - Fonction `showToast(message, type)` identique au pattern
   - Fonction `showToastSave()` avec debounce 600ms
   - Appeler `showToastSave()` dans `flushSave()` APRES le retour succes de `saveCharacter()`
   - En cas d'erreur : `showToast('Erreur sauvegarde', 'error')`

2. **Ajouter dans `style.css`** :
   - `.toast-container` ( fixed, bottom-right, flex column-reverse )
   - `.toast` ( padding, border, font, shadow, animation )
   - `.toast-save` ( border-left:4px solid var(--red) )
   - `.toast-error` ( border-left:4px solid var(--red) )
   - `@keyframes toast-in` ( opacity:0 -> 1, translateY(10px) -> 0 )
   - `@keyframes toast-out` ( opacity:1 -> 0 )

3. **Modifier `saveCharacter()`** pour retourner un boolean succes/echec

---

## Partie 2 : Verification de la persistance complete

### Methode

Pour chaque classe, comparer les champs presents dans le DOM (data-key) avec ceux sauvegardes par `collectSheetData()`.

`collectSheetData()` (script.js:702) utilise :
```js
var prefix = cls + '-' + charId + '-';
inputs.forEach(function (input) {
    var key = input.getAttribute('data-key');
    if (key && key.startsWith(prefix)) {
        var field = key.slice(prefix.length);
        data[field] = input.value;
    }
});
```

**Tout champ avec un `data-key` au bon format est automatiquement sauvegarde.** Le mecanisme est correct par design.

### Verification par classe

Pour chaque classe, lister les `data-key` utilises dans `bloc_commun.js` + le module specifique :

#### Champs BLOC_COMMUN (communs a toutes les classes)

| data-key | Champ |
|----------|-------|
| `{cls}-{id}-nom` | Nom |
| `{cls}-{id}-titre` | Titre |
| `{cls}-{id}-metier` | Metier |
| `{cls}-{id}-alignement` | Alignement |
| `{cls}-{id}-mouvement` | Mouvement |
| `{cls}-{id}-niveau` | Niveau |
| `{cls}-{id}-px` | PX |
| `{cls}-{id}-classe_armure` | Classe d'armure |
| `{cls}-{id}-points_de_vie` | Points de vie |
| `{cls}-{id}-max_pv` | Max PV |
| `{cls}-{id}-initiative` | Initiative |
| `{cls}-{id}-des_action` | Des d'action |
| `{cls}-{id}-attaque` | Attaque |
| `{cls}-{id}-des_critique` | Des critique |
| `{cls}-{id}-table_critique` | Table critique |
| `{cls}-{id}-force` | Force |
| `{cls}-{id}-force_mod` | Force Modif |
| `{cls}-{id}-agilite` | Agilite |
| `{cls}-{id}-agilite_mod` | Agilite Modif |
| `{cls}-{id}-js_reflexe` | JS Reflexe |
| `{cls}-{id}-endurance` | Endurance |
| `{cls}-{id}-endurance_mod` | Endurance Modif |
| `{cls}-{id}-js_vigueur` | JS Vigueur |
| `{cls}-{id}-presence` | Presence |
| `{cls}-{id}-presence_mod` | Presence Modif |
| `{cls}-{id}-js_volonte` | JS Volonte |
| `{cls}-{id}-chance` | Chance |
| `{cls}-{id}-chance_mod` | Chance Modif |
| `{cls}-{id}-jet_chanceux` | Jet chanceux |
| `{cls}-{id}-intelligence` | Intelligence |
| `{cls}-{id}-intelligence_mod` | Intelligence Modif |
| `{cls}-{id}-langues` | Langues |
| `{cls}-{id}-attaque_cac` | Attaque CAC |
| `{cls}-{id}-degats_cac` | Degats CAC |
| `{cls}-{id}-att_distance` | Att. a distance |
| `{cls}-{id}-degats_distance` | Degats distance |
| `{cls}-{id}-armes` | Armes (textarea) |
| `{cls}-{id}-equipement` | Equipement (textarea) |
| `{cls}-{id}-tresor` | Tresor (textarea) |
| `{cls}-{id}-armure` | Armure (textarea) |

**= 37 champs BLOC_COMMUN sauvegardes automatiquement**

#### Champs specifiques par classe

Chaque module specifique a ses propres `data-key` avec le bon prefixe. Ils sont aussi sauvegardes automatiquement tant qu'ils ont un attribut `data-key`.

### Points de vigilance

1. **halfelin.js et nain.js** : utilisent un format de key different (`halfelin-{id}-{field}`) mais `collectSheetData()` le gere correctement via `key.slice(prefix.length)`

2. **voleur.js** : utilise un IIFE avec `collectData` interne — verifier que le `data-key` au bon format est bien present dans le DOM

3. **Textareas** : sont bien couverts par `collectSheetData()` ( selectionne `textarea[data-key]` )

4. **Selects** : sont bien couverts ( selectionne `select[data-key]` )

5. **Valeur initiale** : quand un personnage est cree, le JSON est `{}`. Les champs vides ne sont pas dans le JSON tant que l'utilisateur n'a rien saisi. C'est normal — `collectSheetData()` ne sauvegarde que les champs avec valeur non-vide (ou tous les champs si on le souhaite).

---

## Partie 3 : Actions concretes

### Etape 1 : Toast save indicator (script.js + style.css)

- [ ] Ajouter `toastContainer`, `toastSaveTimer` en variables globales
- [ ] Creer `showToast(message, type)` dans script.js
- [ ] Creer `showToastSave()` avec debounce 600ms
- [ ] Modifier `saveCharacter()` pour retourner `{ ok: true/false }`
- [ ] Appeler `showToastSave()` dans `flushSave()` apres succes
- [ ] Afficher toast d'erreur en cas d'echec
- [ ] Ajouter CSS toast dans style.css (container, animation, variants)

### Etape 2 : Audit des champs par classe

Pour chaque classe, creer un test/verification :
- [ ] Clerc : lister tous les data-key du DOM vs attendus
- [ ] Elfe : idem
- [ ] Guerrier : idem
- [ ] Halfelin : idem
- [ ] Mage : idem
- [ ] Nain : idem
- [ ] Voleur : idem

### Etape 3 : Corrections si necessaire

Si des champs manquent dans le DOM ou ne sont pas au bon format de prefixe :
- [ ] Corriger les `data-key` dans les modules de classe
- [ ] Corriger `bloc_commun.js` si necessaire

### Etape 4 : Test end-to-end

- [ ] Creer un personnage par classe
- [ ] Remplir TOUS les champs
- [ ] Verifier en base que le JSON contient bien toutes les cles
- [ ] Recharger la page, verifier que les valeurs sont restaurees
- [ ] Verifier que le toast s'affiche a chaque sauvegarde

---

## Fichiers a modifier

| Fichier | Modification |
|---------|-------------|
| `script.js` | Ajout toast, modification `saveCharacter()` et `flushSave()` |
| `style.css` | Ajout styles toast |
| `classes/bloc_commun.js` | Verification/aucun changement sauf erreur |
| `classes/*.js` | Verification/aucun changement sauf erreur |
