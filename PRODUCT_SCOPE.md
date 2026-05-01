# CleanFlow — Périmètre produit

## Vision

Outil de gestion opérationnelle pour pressing marocain : enregistrement des dépôts, suivi des articles, encaissement, livraison, et fidélisation client — accessible à des opérateurs peu technophiles depuis un iPad ou un PC comptoir.

## Contexte métier

- Marché cible : pressings (laveries + nettoyage à sec) au Maroc
- Monnaie : Dirham (MAD)
- Langue : Français
- Types de clients : particuliers + B2B (hôtels, restaurants, institutions)
- Modes de dépôt : sur place ou collecte à domicile
- Modes de retrait : sur place ou livraison

## Modules inclus dans le MVP

### 1. Gestion des commandes
- Création commande avec sélection articles du catalogue
- Mode caisse rapide POS (pictogrammes métier, tuiles visuelles)
- Statuts : en_attente → en_cours → prête → livrée / annulée
- Contrôle qualité par article (état textile, tache, retouche)
- Acompte + paiements partiels
- Bon de commande imprimable
- Numérotation automatique (FACT-YYYYMM-NNNNN)
- Ticket de suivi public (QR code, page /track/[token])
- Codes article (ART-XXXXXX) pour identification

### 2. Gestion des clients
- Fiche client (particulier / professionnel / ICE)
- Historique complet des commandes et KPIs
- Relevé de compte avec filtre date
- Facture groupée (multi-commandes B2B)
- Fidélité : points cumulés, seuils, échange
- Abonnements : forfait chemises, kilo, prépayé, entreprise
- Recherche par nom, téléphone, code client

### 3. Catalogue et tarification
- Articles avec prix particulier et professionnel
- Moteur de règles de prix : express, kilo, lot, livraison, zone géographique, horaire, promo
- Remises : pourcentage ou montant fixe, par scope (commande / service / client)
- Abonnements produits avec quota/solde par client
- Termes de paiement B2B : net15 / net30 / net45 / net60

### 4. SAV / Incidents
- Types : dommage, perte, retard, qualité
- Journal d'historique
- Résolution avec note

### 5. Livraisons
- Board kanban : en attente → en route → livré
- Assignation à un membre de l'équipe (chauffeur)
- Notification WhatsApp proposée à chaque avancement

### 6. Caisse
- Clôture quotidienne (espèces / carte / virement)
- Comparaison attendu vs réel avec écart
- Historique des clôtures

### 7. Statistiques
- CA du jour, du mois, tendance mensuelle
- Graphique de répartition des statuts
- Top services par fréquence, top clients

### 8. Notifications WhatsApp
- Templates pré-remplis : création, prête, en route, livrée
- Toggles par événement dans les paramètres
- Via lien wa.me (aucune API tierce, zéro coût)

### 9. Équipe
- Invitation par code pressing (UUID)
- Rôles : admin / employé
- Accès restreint selon le rôle

### 10. UX opérateur
- Menu visuel avec grandes tuiles et pictogrammes métier
- Mode Complet / Mode Rapide persisté en localStorage
- Interface optimisée comptoir (iPad, PC)
- Alertes dashboard (retards, impayés, quotas faibles, B2B échus)

### 11. Onboarding
- Création du pressing (nom, téléphone, ICE, TVA)
- Sélection des services de départ
- Ajout du premier client

## Hors périmètre MVP

- Application mobile native
- Intégration paiement en ligne
- Comptabilité avancée / export FEC
- Gestion des stocks produits
- Devis formel
- Multi-pressing / franchise
- API publique
- Notifications push

## Multi-tenant

Chaque pressing est isolé par `pressing_id`. Le RLS PostgreSQL garantit qu'aucun utilisateur ne voit les données d'un autre pressing.
