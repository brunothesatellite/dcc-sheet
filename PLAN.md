# DCC Character Sheet Web App - Plan

## Objectif

Application web single-page (HTML/CSS/JS/PHP) responsive, optimisee pour smartphone, permettant de gerer une equipe complete de personnages pour DCC (Dungeon Crawl Classics). Chaque joueur a un login et gere 0 a plusieurs personnages par classe (7 classes). Toutes les fiches sont reproduites fidelement depuis les PDF officiels, sans dessins/images. Chaque personnage peut etre actif (en expedition) ou inactif (a l'auberge).

---

## Concept metier

- Un joueur cree un compte (login + mot de passe)
- Il peut creer 0 a plusieurs personnages pour chacune des 7 classes
- Chaque personnage a sa fiche complete avec tous les champs du PDF
- Un personnage est soit **actif** (visible dans l'onglet de sa classe), soit **inactif** (a l'auberge)
- Quand un seul personnage est actif pour une classe, cliquer sur l'onglet ouvre directement sa fiche
- Quand plusieurs sont actifs, on choisit lequel afficher
- On peut activer/desactiver un personnage depuis sa fiche (toggle auberge)
- Les modifications sont sauvegardees automatiquement en base

---

## Architecture Technique

### Stack
- **Frontend :** HTML5, CSS3, JavaScript vanilla (aucun framework)
- **Backend :** PHP 8+ (API REST)
- **Base de donnees :** SQLite3
- **Mode :** SPA sans routeur, double persistance (localStorage si deconnecte, SQLite si connecte)

### Patron inspire de fabled-lands-sheet
- Authentification (inscription, connexion, session)
- Abstraction de persistance (lirePreference/ecrirePreference)
- Auto-save sur evenements input/change
- Theme sombre/clair avec toggle

### Architecture modulaire
- Chaque classe = un module JS autonome (un fichier par classe)
- Les modules de classe n'interfèrent pas entre eux
- Ajouter/modifier une classe n'impacte pas les autres
- Un gestionnaire central coordonne les onglets et la navigation

---

## Structure des fichiers

```
dcc-sheet/
├── PLAN.md
├── maquette_clerc.html
├── maquette_site.html
├── index.html
├── script.js                  # Gestionnaire central (onglets, auth, navigation)
├── style.css                  # Styles principaux
├── style-auth.css             # Styles pages d'authentification
├── api/
│   ├── auth.php               # API auth (check, register, login, logout)
│   ├── characters.php         # API CRUD personnages
│   └── db.php                 # Couche SQLite3
├── classes/                   # Modules par classe (architecture modulaire)
│   ├── clerc.js
│   ├── elfe.js
│   ├── guerrier.js
│   ├── halfelin.js
│   ├── mage.js
│   ├── nain.js
│   └── voleur.js
├── login.php
├── register.php
├── change-password.php
├── deploy/
│   └── start.bat
└── data/
    └── dcc.db
```

---

## Base de Donnees

### Table users
```sql
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pseudo TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    last_activity_at TEXT DEFAULT NULL
);
```

### Table characters
```sql
CREATE TABLE IF NOT EXISTS characters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL DEFAULT 'Sans nom',
    class TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 0,
    data TEXT NOT NULL DEFAULT '{}',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

- `class` : clerc, elfe, guerrier, halfelin, mage, nain, voleur
- `is_active` : 1 = actif (en expedition), 0 = inactif (a l'auberge)
- `data` : JSON contenant TOUS les champs de la fiche (tous les champs de toutes les pages du PDF)
- Un utilisateur peut avoir plusieurs personnages par classe

---

## API Endpoints

### Auth (api/auth.php)
| Action | Methode | Auth | Description |
|--------|---------|------|-------------|
| check | GET | Non | Verifie session, retourne `{logged_in, pseudo}` |
| register | POST | Non | Cree compte (pseudo, password) |
| login | POST | Non | Authentifie |
| logout | POST | Oui | Detruit session |
| change_password | POST | Oui | Change MDP |

### Characters (api/characters.php)
| Action | Methode | Auth | Description |
|--------|---------|------|-------------|
| list | GET | Oui | Liste tous les personnages (filtre optionnel par class, is_active) |
| get | GET | Oui | Recupere 1 personnage par id |
| create | POST | Oui | Cree un personnage (class oblige) |
| save | POST | Oui | Met a jour un personnage (id + data JSON) |
| delete | POST | Oui | Supprime un personnage |
| set_active | POST | Oui | Active/desactive un personnage |

---

## Interface Utilisateur

### Structure de navigation

```
┌─────────────────────────────────────────────┐
│  DCC Fiches            [Theme] [User]       │  <- Top bar
├─────────────────────────────────────────────┤
│  Clerc | Elfe | Guerrier | Halfelin | ...   │  <- Onglets (scroll mobile)
├─────────────────────────────────────────────┤
│                                             │
│  [Liste des persos actifs de la classe]     │  <- Si >1 actif
│  OU                                         │
│  [Fiche du personnage actif]                │  <- Si 1 actif
│  OU                                         │
│  [Etat vide + bouton creer]                 │  <- Si 0 actif
│                                             │
└─────────────────────────────────────────────┘
```

### Comportement des onglets

1. **0 personnage actif pour la classe :** afficher etat vide + bouton "Creer un personnage"
2. **1 personnage actif :** afficher directement sa fiche
3. **Plusieurs personnages actifs :** afficher la liste des actifs, cliquer sur un ouvre sa fiche
4. **Depuis la fiche :** bouton retour a la liste, toggle "Auberge" pour activer/desactiver

### Toggle Auberge (sur chaque fiche)

- Interrupteur visible en haut de chaque fiche
- "En expedition" (actif) / "A l'auberge" (inactif)
- Quand on desactive un personnage, on retourne a la liste de la classe
- Quand on active un personnage, il devient l'actif affiche

### Creation de personnage

- Bouton "+ Nouveau" dans chaque onglet de classe
- Ouvre une fiche vide avec la structure de la classe
- Le personnage est cree en base avec is_active=1
- Apres creation, afficher la fiche

### Theme
- Clair par defaut (couleurs OS)
- Sombre via data-theme="dark"
- Toggle + persistance localStorage

### Responsive
- Desktop (>768px) : fiche en 2 colonnes si besoin
- Mobile (<=768px) : tout empile verticalement, onglets scroll horizontal

---

## Champs par classe (extrait des PDF)

### Champs COMMUNS a toutes les classes (Page 1)

#### Identite
- Nom
- Titre
- Metier (ou "Classe" pour le Nain)
- Alignement
- Mouvement
- Niveau
- PX

#### Defense
- Classe d'armure (bouclier)
- Points de vie
- Max PV

#### Combat
- Initiative
- Des(s) d'action
- Attaque
- Des critique
- Table critique

#### Caracteristiques (valeur + modificateur pour chacune)
- Force
- Agilite
- Endurance
- Presence
- Chance
- Intelligence

#### Jets de sauvegarde
- JS Reflexe
- JS Vigueur
- JS Volonte

#### Combat etendu
- Attaque CAC
- Degats CAC
- Att. a distance
- Degats distance

#### Divers
- Portrait ou symbole
- Jet chanceux
- Langues

### Champs COMMUNS a toutes les classes (Page 2)

- Armes (textarea)
- Equipement (textarea)
- Tresor (textarea)
- Armure (textarea)
- Sorts (3 colonnes de lignes)

### Champs SPECIFIQUES par classe (Page 2)

#### Clerc
- Dieu
- Test d'incant.
- Risque de defaire (valeur)
- Pouvoirs (texte : aide divine, repousser impies, imposition les mains)
- Table "Imposition des mains (decalage d'alignement)" : 3 lignes (identique, adjacent, oppose) x 4 colonnes (12, 14, 20, 22+)

#### Elfe
- Incantation
- Familier
- Patron
- Corruption
- Sorts elfiques (7 slots avec Niveau/Test/Effet)
- Traits elfiques (texte fixe)

#### Guerrier
- Crit sur
- Arme Chance
- HFA (Homme Fort Agile)
- Table de guerison (niveaux avec soins)
- Ajout niveau initiative

#### Halfelin
- Arbaletes
- Camouflage
- Coup chanceux
- Porte-bonheur
- Taille
- Infravision

#### Mage
- Incantation
- Familier
- Patron
- Corruption
- Grimoire (texte)
- Formules magiques (8 slots avec Niveau/Test/Effet)
- Risque de defaire
- Magie mercurielle mod.

#### Nain
- Classe (en plus de Metier)
- Infravision
- Competences souterraines
- Arme Chance
- HFA
- Coup de bouclier
- Detection
- Rage naine
- Souffle

#### Voleur
- De de chance
- Attaque sournoise
- Deplacement silencieux
- Se cacher dans l'ombre
- Vol a la tire
- Escal. parois abruptes
- Crocheter les serrures
- Detecter les pieges
- Desamorcer les pieges
- Falsifier documents
- Se deguiser
- Lire langues inconnues
- Utiliser des poisons
- Incant. parchemin
- Argot des voleurs (texte fixe)
- Notes

---

## Modules de classe (classes/*.js)

Chaque module expose :
- `init(container)` : initialise la fiche dans le conteneur
- `load(characterData)` : charge les donnees du personnage
- `save()` : retourne les donnees actuelles
- `reset()` : remet la fiche a zero

Chaque module est autonome et ne depend pas des autres.

---

## Activites prevues

1. **Maquettes HTML** : maquette_clerc.html, maquette_site.html
2. **Backend PHP** : db.php, auth.php, characters.php
3. **Pages auth** : login.php, register.php, change-password.php
4. **Gestionnaire central** : script.js (onglets, auth, navigation, toggle auberge)
5. **Modules de classe** : classes/*.js (7 modules)
6. **Styles** : style.css, style-auth.css
7. **Page principale** : index.html
8. **Tests et deploiement** : start.bat, tests fonctionnels
