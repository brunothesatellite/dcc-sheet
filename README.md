# DCC Fiches de Personnage

Application web pour gerer une equipe complete de personnages pour Dungeon Crawl Classics (DCC). Responsive, optimisee pour smartphone.

## Fonctionnalites

- 7 classes : Clerc, Elfe, Guerrier, Halfelin, Mage, Nain, Voleur
- 0 a plusieurs personnages par classe
- Toggle auberge (actif / inactif)
- Sauvegarde automatique en base SQLite3
- Theme sombre /clair
- Authentification par pseudo + mot de passe

## Installation

### Depuis le depôt git

```bash
git clone https://github.com/brunothesatellite/dcc-sheet.git
cd dcc-sheet
```

### Lancement local

```bash
cd deploy
start.bat
```

Ou manuellement :

```bash
php -S localhost:8000 -t .
```

Ouvrir `http://localhost:8000` dans un navigateur.

### Deploiement Synology NAS

1. Copier les fichiers dans `/volume1/web/dcc-sheet/`
2. Creer le dossier `data/` a la racine du projet
3. Corriger les permissions (voir Troubleshooting)
4. Le serveur Web Station de Synology gere le PHP nativement

## Structure

```
dcc-sheet/
├── index.html              # SPA principale
├── script.js               # Gestionnaire central
├── style.css               # Styles
├── api/
│   ├── db.php              # SQLite3 (users + characters)
│   ├── auth.php            # Authentification
│   └── characters.php      # CRUD personnages
├── classes/
│   ├── clerc.js            # Fiche Clerc
│   ├── elfe.js             # Fiche Elfe
│   ├── guerrier.js         # Fiche Guerrier
│   ├── halfelin.js         # Fiche Halfelin
│   ├── mage.js             # Fiche Mage
│   ├── nain.js             # Fiche Nain
│   └── voleur.js           # Fiche Voleur
├── login.php
├── register.php
├── change-password.php
└── deploy/start.bat
```

## API

| Endpoint | Methode | Description |
|----------|---------|-------------|
| `api/auth.php?action=check` | GET | Verifie la session |
| `api/auth.php?action=register` | POST | Inscription |
| `api/auth.php?action=login` | POST | Connexion |
| `api/auth.php?action=logout` | POST | Deconnexion |
| `api/characters.php?action=list` | GET | Liste les personnages |
| `api/characters.php?action=create` | POST | Cree un personnage |
| `api/characters.php?action=save` | POST | Sauvegarde les donnees |
| `api/characters.php?action=set_active` | POST | Active/desactive |
| `api/characters.php?action=delete` | POST | Supprime |

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

### Erreur "SQLite3::exec(): attempt to write a readonly database"

Meme cause que ci-dessus. Verifiez que `data/` est accessible en ecriture.

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
