# DCC Fiches de Personnage

Application web SPA pour gerer une equipe complete de personnages pour Dungeon Crawl Classics (DCC). Responsive, optimisee pour smartphone.
Manuel d'utilisation consultable dans **[MANUAL.md](./MANUAL.md)**

## Fonctionnalites

### Authentification
- Connexion / Inscription / Deconnexion
- Changement de mot de passe (verification de l'ancien mot de passe)
- Suppression de compte (avec confirmation, supprime les personnages et la session)
- Sessions securisees (bcrypt, regeneration de session)
- Heartbeat automatique (ping toutes les 5 min)
- Redirection automatique selon l'etat de connexion
- Menu utilisateur (avatar + dropdown)

### Gestion des personnages
- 7 classes : Clerc, Elfe, Guerrier, Halfelin, Mage, Nain, Voleur
- 0 a plusieurs personnages par classe
- Creation rapide (bouton "+ Nouveau")
- Import / Export individuel au format JSON
- Import / Export global (tous les personnages + notes d equipe d un coup)
- Suppression avec confirmation custom (modal)
- Toggle "En expedition" / "A l'auberge" (statut actif/inactif)
- Cartes de personnages avec nom, niveau, et toggle

### Fiches de personnage
- **Commun** : Identite (Nom, Titre, Metier, Alignement, Mouvement, Niveau, PX), Defense (CA, PV/Max avec **Des de vie**), Combat (Initiative, Des d'action, Attaque, Critique), 6 carac. avec modif. et jets de sauvegarde, Combat etendu (CAC/Distance), **Portrait de classe** (DCC ou D&D Red Box), Equipement (Armes, Equipement, Tresor, Armure)
- **Clerc** : Dieu, Incantation, Defaveur, Imposition des mains, Grille de sorts
- **Elfe** : Incantation, Familier, Patron, Corruption, Traits elfiques, Grille de sorts
- **Guerrier** : Coup critique, Arme Chance, Hauts faits d'armes
- **Halfelin** : Infravision, Discretion, Porte-bonheur, Combat a deux armes
- **Mage** : Incantation, Familier, Patron, Corruption, **Liste de sorts dynamique** (ajout/suppression de lignes avec confirmation, nom en gras, style editable)
- **Nain** : Infravision, Competences souterraines, Coup de bouclier, Arme Chance
- **Voleur** : 14 competences voleur en grille (De de chance, Escalade, Crocheter, Pieges, etc.)

### Portrait de classe
- 2 sources d'icones : **DCC** (tokens officiels, 20 images au total) et **D&D Red Box** (7 illustrations)
- Interrupteur DCC/Red Box dans chaque fiche de personnage
- En mode DCC : clic sur l'image pour cycle sur l'image suivante
- En mode Red Box : image unique, pas de clic
- Choix et image sauvegardes avec le personnage en base
- Propages dans les imports/exports JSON individuels et globaux

### Onglet Equipe
- Tableau des personnages en expedition avec **icone de portrait** dans la colonne Classe (100% hauteur de ligne)
- Nom cliquable, Init, AC, PV editables, Init combat, **Compteur de tour visuel** (remplissage circulaire par 20%)
- Synchronisation des PV vers la fiche du personnage
- Tableau des ennemis (ajout/suppression/RAZ)
- Compteurs de tour (clic = +1, clic droit / appui long = reset, cycle modulo 5)
- Notes d'equipe (sauvegardees en base via l'API, inclues dans l'export/import global JSON)

### Sauvegarde automatique
- Debounce 600ms sur tous les champs modifiables
- Toast de confirmation (icone disquette) a chaque sauvegarde
- Toast "Donnees restaurees" au chargement
- Toast sur modification des PV et notes d'equipe

### Navigation
- Onglets avec persistence de l'onglet actif (localStorage)
- Auto-ouverture de la fiche si 1 seul personnage actif
- Bouton retour (fleche) pour revenir a la liste
- Bouton Equipe mobile dans le topbar (< 600px)

### UI / UX
- Theme sombre / clair (localStorage)
- Popups custom (alert / confirm) au lieu de alert() natifs
- Spinner de chargement (affiche apres 500ms si chargement lent)
- Design responsive (breakpoint 600px)
- Favicon SVG (epees croisees + de)
- Formes CSS (bouclier pour CA, casque pour PV, cercles pour jets)

## Structure

```
dcc-sheet/
├── index.html                  # SPA principale
├── script.js                   # Gestionnaire central (tabs, auth, CRUD, auto-save, nav, portraits)
├── style.css                   # Styles principaux (themes, layout, responsive, portraits)
├── style-auth.css              # Styles des pages d'authentification
├── favicon.svg                 # Favicon SVG
├── dcc-icons.js                # Catalogue d'icones DCC (20 tokens, 7 classes)
├── dd-red-box-icons.js         # Catalogue d'icones D&D Red Box (7 images, 7 classes)
├── api/
│   ├── db.php                  # SQLite3 + helpers (users, characters, session)
│   ├── auth.php                # Authentification (login, register, logout, change_password, delete_account)
│   └── characters.php          # CRUD personnages (list, get, create, save, set_active, delete)
├── classes/
│   ├── bloc_commun.js          # Bloc commun + portrait (identite, combat, stats, portrait, equipement)
│   ├── clerc.js                # Fiche Clerc
│   ├── elfe.js                 # Fiche Elfe
│   ├── guerrier.js             # Fiche Guerrier
│   ├── halfelin.js             # Fiche Halfelin
│   ├── mage.js                 # Fiche Mage (sorts dynamiques)
│   ├── nain.js                 # Fiche Nain
│   ├── voleur.js               # Fiche Voleur
│   └── equipe.js               # Onglet Equipe (tableau persos + portraits + ennemis)
├── icons/
│   ├── dcc-pc-tokens/          # 20 PNG tokens officiels DCC
│   └── dd-red-box/             # 7 webp illustrations D&D Red Box
├── login.php                   # Page de connexion
├── register.php                # Page d'inscription
├── change-password.php         # Page de changement de mot de passe
├── data/                       # Base SQLite3 (auto-creee)
│   └── dcc.db
└── deploy/
    ├── build.bat               # Script de build
    ├── _build.ps1              # Script PowerShell de build
    ├── start.bat               # Lanceur PHP dev server
    └── dcc-sheet/              # Dossier de deploiement (genere par build.bat)
```

## API

### Authentification (`api/auth.php`)

| Action | Methode | Parametres | Description |
|--------|---------|------------|-------------|
| `check` | GET | — | Verifie la session, retourne `{logged_in, pseudo, id}` |
| `register` | POST | `pseudo`, `password` | Inscription (pseudo 3-20 car., password 6+ car.) |
| `login` | POST | `pseudo`, `password` | Connexion |
| `logout` | POST | — | Deconnexion |
| `change_password` | POST | `old_password`, `new_password` | Changement de mot de passe (verifie l'ancien) |
| `delete_account` | POST | — | Supprime le compte, les personnages et la session |
| `get_team_notes` | GET | — | Retrouve les notes d'equipe `{ok, notes}` |
| `save_team_notes` | POST | `notes` | Sauvegarde les notes d'equipe (100 Ko max) |

### Personnages (`api/characters.php`)

| Action | Methode | Parametres | Description |
|--------|---------|------------|-------------|
| `list` | GET | `class` (optionnel), `is_active` (optionnel) | Liste les personnages (inclut les donnees JSON) |
| `get` | GET | `id` | Recupere un personnage par son ID |
| `create` | POST | `class`, `name` | Cree un personnage (data initialise a `{}`) |
| `save` | POST | `id`, `data` (optionnel), `name` (optionnel) | Sauvegarde les donnees JSON et/ou le nom |
| `set_active` | POST | `id`, `is_active` | Active/desactive un personnage (0/1) |
| `delete` | POST | `id` | Supprime un personnage |

### Requetes / Reponses

Toutes les reponses sont au format JSON :
```json
{ "ok": true, ... }
{ "ok": false, "error": "Message d'erreur" }
```

Les requetes POST utilisent `Content-Type: application/json` avec le body JSON.
Les requetes GET utilisent les query parameters.

## Installation

### Depuis le depot git

```bash
git clone https://github.com/brunothesatellite/dcc-sheet.git
cd dcc-sheet
```

### Lancement local

```bash
php -S localhost:8000 -t .
```

Ou via le script de deploiement :

```bash
cd deploy
start.bat
```

Ouvrir `http://localhost:8000` dans un navigateur.

### Deploiement Synology NAS

1. Copier les fichiers dans `/volume1/web/dcc-sheet/`
2. Creer le dossier `data/` a la racine du projet
3. Corriger les permissions (voir Troubleshooting)
4. Le serveur Web Station de Synology gere le PHP nativement

### Build de deploiement

```bash
cd deploy
build.bat
```

Cree un dossier `deploy/dcc-sheet/` avec tous les fichiers necessaires (exclut .git, captures, data, docs, PDFs, maquettes).

## Dependances

- **Backend** : PHP 7.4+ avec SQLite3
- **Frontend** : Aucune dependance externe (vanilla JS)
- **Fonts** : Google Fonts (Barlow Condensed + Inter)
- **Base de donnees** : SQLite3 (auto-creee dans `data/dcc.db`)

## Troubleshooting

### Erreur "readonly database" sur Synology NAS

Le dossier `data/` n'a pas les permissions d'ecriture pour le serveur web.

**Solution en SSH :**

```bash
ssh admin@IP_DE_VOTRE_NAS

cd /volume1/web/dcc-sheet
mkdir -p data
chmod -R 777 data
chown -R http:http data
```

Si `http` n'est pas le bon utilisateur, essayez `www-data` ou `nobody`.

**Solution via File Station :**

1. Ouvrir File Station
2. Naviguer vers `/volume1/web/dcc-sheet/data/`
3. Clic droit → Proprietes → Permissions
4. Ajouter l'utilisateur `http` avec tous les droits

### Les formulaires ne sauvegardent pas

1. Verifiez la console du navigateur (F12) pour des erreurs
2. Assurez-vous que PHP est correctement configure (SQLite3 active)
3. Verifiez que `data/` existe et est accessible en ecriture

### Theme sombre ne s'applique pas

Le theme est sauvegarde dans le localStorage du navigateur. Essayez :
1. Vider le cache du navigateur
2. Recharger la page

## Licence

MIT
