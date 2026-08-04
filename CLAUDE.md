# Bluewaive - Espace Client (Portail Onboarding)

## Identité

Portail client autonome pour Bluewaive (SaaS agent vocal IA pour agences immobilières). Chaque agence signée obtient un accès personnalisé (`/client/{agencyId}`) pour suivre l'avancement de son projet : devis, factures, contrat, statistiques d'appels Retell, ressources de formation.

MVP conçu pour un client à la fois au départ, pensé pour scaler à plusieurs agences via Airtable.

## Langue

Toujours répondre et rédiger en français (discussions, commentaires, contenu des pages). Les termes techniques (noms de variables, champs Airtable, clés d'environnement) restent tels quels.

## Méthode de travail : Agentic Coding (Planifier → Exécuter → Valider)

Toute tâche sur ce projet suit ces 3 étapes, dans l'ordre, sans en sauter aucune :

1. **Planifier** - avant de toucher à `lib/app.js` ou `lib/auth.js`, identifier toutes les routes/pages impactées par le changement (le routing est centralisé, une modif peut avoir des effets de bord ailleurs). Vérifier les noms de champs Airtable réels (via schema ou lecture directe) plutôt que de supposer.
2. **Exécuter** - faire le changement minimal nécessaire, en gardant les conventions vanilla JS/HTML/CSS. Ne jamais toucher à `_archive/`.
3. **Valider** - après tout changement serveur : relancer `node server.js` et confirmer qu'il démarre sans erreur. Après tout changement touchant l'auth/session : tester le flux complet (login, cookie posé, accès protégé refusé sans session). Ne jamais déclarer une tâche terminée sur la seule base que le code "a l'air correct" - un test réel (navigateur ou requête) est obligatoire avant de conclure.

## Stack technique

- Backend : Node.js **vanilla** (`http` natif), aucun framework (pas d'Express)
- Frontend : HTML / CSS / JS vanilla, aucun bundler, aucune dépendance npm
- Données : Airtable (base "CRM Bluewaive - Immo") en source de vérité
- Stats d'appels : API Retell
- Déploiement : Vercel (serverless, `api/index.js` comme point d'entrée unique)
- Auth : cookie de session signé maison (HMAC-SHA256) + mot de passe hashé PBKDF2 (pas de librairie externe, tout est dans `lib/auth.js`)

## Architecture du projet

```
App-onboarding-client/
├── server.js              # Entrée locale (node server.js) - http.createServer
├── api/index.js           # Entrée Vercel (serverless) - même handler que server.js
├── lib/
│   ├── app.js             # Cœur : routing, fichiers statiques, appels Airtable/Retell, cookies
│   └── auth.js            # Hash mot de passe (PBKDF2), signature/vérif session (HMAC)
├── pages/                 # Toutes les pages HTML servies par lib/app.js
│   ├── login.html
│   ├── client-home.html
│   ├── client-devis.html
│   ├── client-factures.html
│   ├── client-contrat.html
│   ├── client-projet.html
│   ├── client-retell.html
│   ├── client-ressources.html
│   ├── client-compte.html
│   └── client-not-found.html
├── scripts/                # JS client, servis explicitement par lib/app.js
│   ├── auth.js             # Login form → POST /api/login
│   ├── client-portal.js    # Fetch des données /client/:id/api/* et rendu des pages
│   └── donut.js            # Petit renderer SVG donut réutilisable (avancement projet)
├── styles.css              # Styles partagés de tout le portail (racine, pas dans css/)
├── public/                 # Logos servis tels quels (logo-dark-bg.png, logo-light-bg.png)
├── assets/                 # Pages ressources liées depuis client-ressources.html
│   ├── FAQ_Bluewaive.html
│   ├── Guide_Demarrage_Bluewaive.html
│   └── Video_Formation_Retell.html
├── .env / .env.example     # Variables d'environnement (jamais commit .env)
├── package.json            # "start": "node server.js", aucune dépendance
├── vercel.json             # Toutes les routes → api/index.js
└── _archive/               # Contenu HORS-SUJET rangé ici (voir section dédiée plus bas)
```

## Routing (dans `lib/app.js` → `handleRequest`)

- `/` et `/index.html` → redirect 302 vers `/login`
- `/login` → sert `pages/login.html`, ou redirige vers `/client/{agencyId}` si déjà connecté
- `POST /api/login` → cherche l'agence par email dans Airtable, vérifie le hash du mot de passe, pose le cookie de session
- `POST /api/logout` → efface le cookie
- `/client/:agencyId` et `/client/:agencyId/{devis|factures|contrat|projet|compte|retell|ressources}` → pages protégées (session requise, `session.agencyId === agencyId`)
- `/client/:agencyId/api/{devis|factures|contrat|retell-stats|overview}` → JSON consommé par `scripts/client-portal.js`
- `/api/client/:agencyId/{...}` → route API alternative, avec fallback automatique sur `buildMockData()` si Airtable/Retell échouent
- Sinon → fichier statique cherché dans `public/` puis `assets/` ; 404 → `client-not-found.html` si dans `/client/*`, sinon texte brut

## Authentification & sessions

- Mot de passe stocké dans Airtable, champ **"Portail Mot de passe (hash)"**, format `pbkdf2$10000$<salt-hex>$<hash-hex>`
- Session : cookie `bw_session`, `HttpOnly`, `SameSite=Lax`, `Secure` uniquement hors localhost, durée 14 jours
- Le token de session est un payload JSON base64url + signature HMAC-SHA256 (`SESSION_SECRET`), pas de JWT externe

## Données (Airtable / Retell) + fallback démo

- Base Airtable : `appGBLLoeqkREDBh2` ("CRM Bluewaive - Immo"), tables Agences / Devis / Factures / Contrats / Offres (noms configurables via `.env`)
- Si `AIRTABLE_API_KEY` absent ou l'appel échoue → **`buildMockData()`** fournit automatiquement des données de démo (agence "Immo"/Joyce) - permet de développer/tester sans credentials
- Stats Retell : nécessite `RETELL_API_KEY` + `Retell Phone Number` sur la fiche Airtable de l'agence ; sinon fallback silencieux

## Variables d'environnement (`.env`)

```
PORT=3000
SESSION_SECRET=
AIRTABLE_BASE_ID=appGBLLoeqkREDBh2
AIRTABLE_API_KEY=
AIRTABLE_TABLE_AGENCES=Agences
AIRTABLE_TABLE_DEVIS=Devis
AIRTABLE_TABLE_FACTURES=Factures
AIRTABLE_TABLE_CONTRATS=Contrats
AIRTABLE_TABLE_OFFRES=Offres
RETELL_API_KEY=
```

## Design (tokens dans `styles.css`)

- Fond général : `#ece3d0` (beige chaud) - panneaux blancs `#ffffff`
- Couleur de marque : `#4682B4` / accent titres `#2682B4`, variante foncée `#2f5d82`
- Or/accent secondaire : `#c9a227`
- États : succès `#1e8e57`, alerte `#c27a00`, danger `#c94242`
- Police : Inter (fallback Arial, sans-serif)
- Composant réutilisable : donut SVG (`scripts/donut.js`) pour visualiser l'avancement du projet (audit → config → formation → prod → suivi)

## Conventions

- Vanilla JS/HTML/CSS uniquement, pas de build step, pas de dépendances npm
- Une page = un fichier HTML dans `pages/`, jamais de logique serveur dans le HTML
- `lib/app.js` reste la seule source de vérité du routing (ne pas dupliquer la logique dans `api/index.js`, qui n'est qu'un wrapper)
- Toujours passer par `.env` pour les secrets, jamais en dur dans le code

## Déploiement

- Vercel : `vercel.json` route tout le trafic vers `api/index.js` (qui `require('../lib/app')`)
- Variables d'env à configurer côté Vercel : `AIRTABLE_BASE_ID`, `AIRTABLE_API_KEY`, `RETELL_API_KEY`, `SESSION_SECRET`

## Historique récent (contexte utile)

- Auth par cookie de session + hash Airtable mis en place (remplace un ancien flow non sécurisé)
- Pages client protégées côté serveur (plus de simple protection côté client)
- Le projet partageait son dossier avec du contenu totalement hors-sujet (landing page marketing bluewaive.fr, docs CRM, scripts vidéo, template pédagogique "IAPreneurs") → tout déplacé dans `_archive/`, structure actuelle nettoyée

## `_archive/` - ne pas confondre avec le projet

Ce dossier contient d'anciens fichiers **hors-sujet** retrouvés dans le repo (page marketing bluewaive.fr, documentation CRM, scripts vidéo, scripts de test Vapi (ancien fournisseur, migré vers Retell), template pédagogique erroné). Rien de ce dossier n'est utilisé par `server.js`/`lib/app.js`. Ne pas s'en servir comme référence pour ce projet, ne pas le réintégrer à la racine.

## Interdits (jamais)

- Ne jamais committer `.env` ou une clé API en dur
- Ne jamais court-circuiter la vérification de session dans `lib/app.js` (`session.agencyId === agencyId`)
- Ne pas ajouter de framework/bundler sans discussion - le projet est volontairement vanilla
- Ne pas remettre du contenu de `_archive/` à la racine du projet
