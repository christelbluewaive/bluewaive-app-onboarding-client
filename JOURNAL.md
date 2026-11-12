# Journal de suivi - app-onboarding-client

> Document vivant : à mettre à jour à chaque modification significative de ce projet.
> Dernière mise à jour : 2026-11-12

## 1. Rôle du projet

Portail client actif en production pour Bluewaive (SaaS agent vocal IA pour agences immobilières). Chaque agence signée obtient un accès personnalisé (`/client/{agencyId}`) pour suivre devis, factures, contrat, statistiques d'appels Retell et ressources de formation. C'est le vrai produit livré aux agences signées - à ne pas confondre avec `wireframes-onbording-client/`, qui est un prototype figé distinct.

## 2. Stack technique observée

- Backend : Node.js vanilla (`http` natif), aucun framework (pas d'Express), aucune dépendance npm
- Frontend : HTML / CSS / JS vanilla, aucun bundler
- Données : Airtable (base "CRM Bluewaive - Immo", `appGBLLoeqkREDBh2`) en source de vérité, + base distincte Bluewaive Voice OS (`appcktXI17JInN9s1`) pour les KPI leads/RDV
- Stats d'appels : API Retell (`fetchRetellStats`)
- Auth : cookie de session signé maison (HMAC-SHA256) + mot de passe hashé PBKDF2, sans librairie externe
- Déploiement : Vercel (serverless, `api/index.js` comme point d'entrée unique vers `lib/app.js`)
- Architecture : `server.js` (local) / `api/index.js` (Vercel) → `lib/app.js` (routing + logique) + `lib/auth.js` (auth), pages HTML dans `pages/`, JS client dans `scripts/`, styles dans `styles.css`, contenu hors-sujet isolé dans `_archive/`

## 3. Historique Git

Dépôt Git actif. 47 commits au total.
- Premier commit : 2026-08-04 - "Initial commit: Bluewaive client onboarding portal"
- Dernier commit enregistré : 2026-09-05 - "feat(portail): integre le widget Elia (assistant de support)"

Derniers commits (15 plus récents) :

| Commit | Message |
|---|---|
| d5a6f33 | feat(portail): integre le widget Elia (assistant de support) |
| da4d696 | fix(portail): afficher la mascotte d'accueil sur mobile |
| a7fee40 | feat(portail): integre les mascottes illustratives + corrige le doublon BLUEWAIVE |
| 667fafb | feat: add admin dashboard kpis |
| bf99b4d | feat: enrich admin profile settings |
| 128869f | feat: adapt dashboard for admin console |
| 2c970cb | feat: add admin clients page |
| 721d85b | feat: persist admin client context |
| 0eda937 | feat: add secure admin agency context |
| 65a4587 | feat: add admin client list endpoint |
| d7cd02f | feat: add password visibility toggle |
| f8e5b36 | fix: restrict read routes to GET |
| 7062f34 | fix: remove public client page aliases |
| 7279b07 | fix: hide internal Voice OS agency id |
| 15f88af | fix: secure Airtable email lookup |

Point à vérifier avec Christel : le dossier du projet a été modifié le 2026-10-21 (plus récent que le dernier commit du 2026-09-05) - il est probable qu'il existe des changements non commités à ce jour ; à confirmer via `git status` avant toute action.

## 4. Sessions Claude Code locales

Aucun dossier de transcripts trouvé sous `C:\Users\christel\.claude\projects\` correspondant à ce projet (recherche du motif `app-onboarding-client` sans résultat). Soit aucune session Claude Code n'a encore été ouverte directement sur ce dossier sous son chemin actuel, soit d'anciens transcripts ont déjà été purgés automatiquement (rétention limitée dans le temps, non garantie sur la durée - voir le guide "Maîtriser Claude Code", section 07).

## 5. État des lieux au 2026-10-21

Vérifié aujourd'hui : lecture complète du `CLAUDE.md` existant du projet, historique Git (`git log`, nombre de commits, dates), recherche d'un dossier de transcripts locaux. Reste à confirmer avec Christel : l'état exact des modifications non commitées depuis le 2026-09-05, et si des sessions Claude Code ont eu lieu sur ce projet avant la purge des transcripts.

## 6. Journal des modifications

| Date | Qui | Ce qui a été fait | Outils utilisés |
|---|---|---|---|
| 2026-10-21 | Christel / Claude Code | Création de ce journal de suivi à partir de l'état du projet observé ce jour-là | Claude Code |
| 2026-10-21 | Christel / Claude Code (autre session) | Mise en place des tests Playwright (`tests/e2e/auth.spec.js`) + régénération, avec autorisation explicite de Christel, du mot de passe de la fiche fictive "La Plage — DEMO" (`recM9JYlcAWJNMMI3`, base CRM Immo `appGBLLoeqkREDBh2`) pour permettre ces tests. Création du skill `valider-portail-onboarding`. Confirmé par Christel le même jour, dans une session Claude Code distincte de celle ayant créé ce journal. | Claude Code, MCP Airtable |
| 2026-10-21 | Christel / Claude Code | Création des skills `provisionnement-agence-cliente` et `checklist-pre-deploiement-vercel` | Claude Code |
| 2026-10-25 | Christel / Claude Code | Repositionnement hygiène/entretien (Phases 1-8 de la mission) : retrait des parcours client Retell/Voice OS (tuile "Agent vocal", cartes ressources `guideAgentVocal`/`sopAgentVocal`, étape "Configuration Retell" dans `buildProjectSteps`), passage de `offreSouscrite` au programme pilote, renommage `miseEnProduction` → `miseEnService`. Ajout de la config par module (3 modules, 6 statuts, seul "Mis en service" active réellement) via les nouvelles tables Airtable `Modules Entreprise` et `Ressources Assistant Commercial`. Nouveaux KPI admin "modules mis en service" / "ressources à valider" (`fetchAdminModuleKpis`), restriction d'accès admin-only étendue à `clients`/`retell`/`prospect`. Correction du bug "Mise en service" (champ Airtable renommé côté migration parallèle). | Claude Code, MCP Airtable |
| 2026-10-25 | Christel / Claude Code | Remplacement de la fiche démo supprimée "La Plage — DEMO" par "Hygiène Atlantique — DEMO" (`recuGc9xOQpKq3Pyy`) pour les tests E2E, mise à jour `.env.test.local`. Suite Playwright validée (3/3). | Claude Code, MCP Airtable, Playwright |
| 2026-10-25 | Christel / Claude Code | Création du projet `app-espace-commercial/` (Application B, Phase 5), indépendant du système n8n/Telegram existant (décision explicite de Christel). Rédaction du récap complet (Claude Docs) distinguant conçu/implémenté/vérifié/en service. | Claude Code, MCP Airtable, Claude Docs |
| 2026-10-25 | Christel | Constat en test manuel (compte admin réel) : aucune carte cliquable sur la page Ressources. Cause identifiée : comportement volontaire du code (`renderResourceCard`, jamais de lien cassé) - la fiche agence réelle n'a pas de ligne liée dans la table Airtable `Ressources`, ou cette ligne est vide pour les 6 colonnes (`Guide de prise en main`, `tutoriels`, `FAQ`, `Documentation d'utilisation`, `Procédures simples`, `Supports de formation`). Pas un bug de code - à résoudre en remplissant Airtable, pas en modifiant `lib/app.js`/`scripts/client-portal.js`. | Claude Code |
| 2026-11-12 | Christel / Claude Code | Suite du repositionnement hygiène/entretien, volet "Assistant vocal" restant visible côté client : masquage de l'onglet de nav "Assistant vocal" (`APP_NAV_ITEMS`, `scripts/client-portal.js`) et de la section "Votre assistante vocale" de l'accueil pour les clients standards (gardée visible en vue Admin uniquement, en vue d'un upsell futur) - aucune route ni donnée Retell/Voice OS supprimée. Mise à jour de la section Identité du `CLAUDE.md` du projet pour refléter le positionnement actuel et documenter ce masquage. Vérification visuelle réelle dans Chrome (connexion compte de test `Hygiène Atlantique — DEMO`, `recuGc9xOQpKq3Pyy`) : onglet et section bien absents pour un client standard. Point de vigilance signalé mais non traité : `assets/FAQ_Bluewaive.html` et `Guide_Demarrage_Bluewaive.html` contiennent encore du contenu 100% ancien positionnement (immobilier, prix "149€/mois" affiché - contraire à la règle "jamais de prix communiqué au client"), utilisés uniquement par le mode démo (`buildMockData()`, Airtable non configuré) donc risque faible mais non nul. | Claude Code, Claude in Chrome |
| 2026-11-12 | Christel / Claude Code | Push du commit précédent en production (`git push origin HEAD:main`, exécuté par Christel après blocage du classificateur auto mode) - déploiement Vercel confirmé `READY` sur le commit poussé. Vérification du JS servi en production (sans connexion, lecture directe de `scripts/client-portal.js`) : conforme au code poussé. Repéré à cette occasion un risque distinct sur la page "Votre compte" : sections "Abonnement" et "Facturation et abonnement" avec texte "votre agent vocal Bluewaive", prix Airtable (`offre.prixMensuel`) et **lien de paiement Stripe actif** (`buy.stripe.com/...`), visibles par tout client standard - contraire à la fois au repositionnement et à la règle "aucun prix communiqué / aucun passage automatique à une offre payante" du CLAUDE.md racine. Retiré dans un premier temps (commenté dans `scripts/client-portal.js`), puis **restauré sur demande explicite de Christel** ("je veux quand même que mon client puisse faire ses paiements par stripe") : le bouton de paiement Stripe reste actif (même lien `buy.stripe.com/aFaFzHidW98B4XVbtn60007`, confirmé par Christel comme le bon lien pour le pilote), mais le texte "votre agent vocal Bluewaive" est remplacé par une formulation neutre et l'affichage automatique du prix Airtable (`offre.prixMensuel`) est retiré (tarif présenté comme "défini avec Christel"). `CLAUDE.md` du projet mis à jour en conséquence. Revérifié en local à deux reprises (compte de test, page `/compte`) : d'abord sections absentes, puis bouton Stripe de retour avec le texte corrigé, prix automatique absent. | Claude Code, Claude in Chrome, MCP Vercel |

## 7. Points de vigilance

- Ne pas confondre avec `wireframes-onbording-client/` (prototype figé, projet distinct, voir CLAUDE.md racine de l'écosystème)
- Ne jamais committer `.env` ou une clé API en dur
- Ne jamais court-circuiter la vérification de session dans `lib/app.js` (`session.agencyId === agencyId`)
- Ne pas ajouter de framework/bundler sans discussion - le projet est volontairement vanilla
- Ne pas remettre du contenu de `_archive/` à la racine du projet
- `La Plage — DEMO` reste une configuration de démonstration interne, jamais un client commercial réel
- Reste à faire (prochaine session, 2026-10-25) : (1) câbler une vraie IA sur l'Assistant commercial de `app-espace-commercial` - non testable tant que ce n'est pas fait ; (2) Christel doit remplir les URLs de ressources dans Airtable (table `Ressources`, fiche liée à son agence) pour que les cartes de la page Ressources deviennent cliquables ; (3) Christel doit saisir ses propres identifiants Retell (page Agent vocal) sur sa fiche Airtable.
