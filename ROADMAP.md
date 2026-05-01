# CleanFlow — Roadmap

## V1 — MVP (livré — 2026-05-01)

### Core
- [x] Auth email + Google OAuth, onboarding multi-étapes
- [x] Gestion commandes complète (création, statuts, paiements partiels)
- [x] Mode dépôt / retrait (sur place, collecte, livraison)
- [x] Catalogue services avec prix particulier/professionnel
- [x] Facture imprimable
- [x] Ticket de suivi public avec QR code
- [x] Contrôle qualité par article
- [x] Numérotation automatique des factures (FACT-YYYYMM-NNNNN)
- [x] Codes article (ART-XXXXXX)

### Clients
- [x] Fiche client avec historique complet et KPIs
- [x] Relevé de compte avec filtre date
- [x] Facture groupée B2B
- [x] Fidélité (points + échange)
- [x] Abonnements (chemises, kilo, prépayé, entreprise)
- [x] Recherche globale (nom, téléphone, code)

### Tarification
- [x] Moteur de règles de prix (express, kilo, lot, zone, horaire, promo)
- [x] Remises configurables
- [x] Termes de paiement B2B (net15 / net30 / net45 / net60)

### Opérationnel
- [x] Board livraison / collecte avec assignation chauffeur
- [x] SAV / incidents avec journal
- [x] Dépôt express comptoir
- [x] Clôture de caisse
- [x] Caisse rapide POS avec catalogue visuel et pictogrammes

### UX
- [x] Menu visuel avec tuiles et pictogrammes métier pressing
- [x] Mode Complet / Mode Rapide (localStorage)
- [x] Interface optimisée comptoir (iPad, PC)
- [x] Alertes dashboard (retards, impayés, quotas faibles, B2B échus)

### Notifications
- [x] WhatsApp via wa.me (aucune API tierce)
- [x] Toggles par événement dans les paramètres

### Équipe & Stats
- [x] Invitation par code, rôles admin/employé
- [x] Statistiques (graphiques CA, statuts, top services)

---

## V1.1 — Stabilisation et polish

- [ ] Tests E2E Playwright (onboarding, commande, paiement)
- [ ] Impression directe depuis la caisse rapide (Bluetooth thermal printer)
- [ ] Calcul rendu monnaie en caisse rapide
- [ ] Export CSV commandes et clients
- [ ] Relevé B2B avec signature électronique
- [ ] Notifications WhatsApp groupées (résumé fin de journée)
- [ ] Mode hors-ligne (PWA, sync au retour réseau)

## V2 — Croissance

- [ ] Application mobile (React Native ou PWA installable)
- [ ] Intégration paiement en ligne (CMI, PayZone)
- [ ] Devis + bon de livraison signable
- [ ] Gestion des stocks produits (teintures, détachants)
- [ ] Multi-caisse / multi-point de collecte
- [ ] Rapport comptable mensuel (PDF)
- [ ] API publique documentée

## V3 — Plateforme

- [ ] Mode franchise (multi-pressing sous une marque)
- [ ] Marketplace (clients trouvent un pressing via l'app)
- [ ] Notation et avis clients
- [ ] Programme de fidélité inter-pressings
