# CLAUDE.md

Ce fichier fournit des instructions à Claude Code (claude.ai/code) pour travailler dans ce dépôt.

## Objectif du projet

Ce dépôt est un projet de démonstration pour les **IAPreneurs** — membres qui apprennent à utiliser Claude Code pour initier et structurer des projets web. Le but final est de créer une page web (ou site complet) personnalisée, en partant d'un dossier bien organisé.

## Stack technique

- HTML / CSS / JavaScript vanilla (pas de framework requis pour commencer)
- Aucun bundler — les fichiers sont servis directement depuis le navigateur
- Pas de dépendances npm à installer

## Commandes utiles

Ouvrir la page dans le navigateur (Windows) :
```
start index.html
```

Lancer un serveur local (si Python est installé) :
```
python -m http.server 8080
```
Puis ouvrir `http://localhost:8080` dans le navigateur.

## Architecture du projet

```
exemples-iap/
├── CLAUDE.md           # Ce fichier — lu par Claude Code
├── index.html          # Page d'accueil principale
├── css/
│   └── style.css       # Styles globaux
├── js/
│   └── main.js         # Scripts JS
├── assets/             # Images, icônes, polices
└── .claude/
    ├── settings.json   # Permissions et comportements Claude Code
    ├── commands/       # Commandes slash personnalisées (/creer-page, /apercu)
    └── rules/          # Règles appliquées automatiquement par Claude
        ├── code-style.md
        ├── contexte-pedagogique.md
        └── securite.md
```

## Conventions

- Tout le contenu visible est dans `index.html` et `css/style.css`
- Les fichiers JS restent dans `js/` et sont importés en bas du `<body>`
- Les assets (images, logo) vont dans `assets/`
- Ne pas committer de fichiers sensibles (.env, clés API)

## Contexte pédagogique

Ce projet sert d'exemple concret pour montrer :
1. Comment structurer un dossier pour Claude Code
2. Comment utiliser `.claude/settings.json` pour configurer les permissions
3. Comment créer des commandes slash dans `.claude/commands/` (équivalent des "skills" personnalisés)
4. Comment définir des règles de projet dans `.claude/rules/` (appliquées automatiquement à chaque session)
5. Comment passer de zéro à une page web fonctionnelle avec l'aide de Claude

## Règles actives

Les fichiers dans `.claude/rules/` s'appliquent à toutes les interactions dans ce projet :
- [`code-style.md`](.claude/rules/code-style.md) — conventions HTML/CSS/JS
- [`contexte-pedagogique.md`](.claude/rules/contexte-pedagogique.md) — comment adapter les réponses au public IAPreneurs
- [`securite.md`](.claude/rules/securite.md) — ce qu'il ne faut jamais faire (clés API, données perso)
