# Espace Client Bluewaive

Ce MVP expose un portail client autonome pour un seul client signé.

## Démarrage local

1. Vérifier que le fichier [.env](.env) contient bien les variables Airtable/Retell.
2. Démarrer le serveur avec : `node server.js`
3. Ouvrir : `http://localhost:3000/client/rec_demoAgency`

## Configuration attendue

Le backend essaie d’abord d’utiliser Airtable et Retell si les variables sont présentes. Si elles ne sont pas encore renseignées, il fonctionne automatiquement avec des données de démonstration.

## Notes de sécurité

Cet MVP ne met pas en place d’authentification robuste. Avant un envoi réel à un client, il faudra sécuriser l’accès avec un lien à usage unique ou un token court.

## À prévoir côté Airtable

- Ajouter le champ `Retell Phone Number` sur la table Agences.
- Valider l’usage de ce champ avant de brancher complètement l’API Retell.
