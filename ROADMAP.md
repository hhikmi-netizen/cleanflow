# CleanFlow — Roadmap

---

## V1 — MVP Stabilisé (En cours)

**Objectif :** Corriger les bugs métier critiques et compléter le flux commande de base.

### Sprint 1 — Bugs critiques (ACTUEL)
- [x] Fix auth OAuth (cookie session)
- [x] Fix onboarding (création pressing si manquant)
- [ ] **Fix dropdown client dans /orders/new** (clic extérieur ne ferme pas, pas d'option "créer")
- [ ] **Création rapide client depuis /orders/new** (modal ou inline)

### Sprint 2 — Flux commande complet
- [ ] Mode dépôt (sur place / collecte) + mode retrait (sur place / livraison)
- [ ] Notes par article
- [ ] Date dépôt explicite
- [ ] Annulation commande avec motif
- [ ] Amélioration bon de commande : logo pressing, format professionnel

### Sprint 3 — Caisse & paiements
- [ ] Paiement partiel (enregistrer encaissement)
- [ ] Reçu de paiement (PDF séparé du bon de commande)
- [ ] Historique paiements par commande
- [ ] Clôture journalière (rapport Z)

### Sprint 4 — Facturation
- [ ] Facture officielle avec numérotation auto
- [ ] Logo pressing sur documents
- [ ] Mentions légales Maroc (IF, Patente, RC)
- [ ] Export PDF direct (jsPDF déjà installé)

---

## V1.1 — Notifications & CRM

**Objectif :** Activer les outils de communication client et enrichir les fiches.

### Sprint 5 — WhatsApp
- [ ] Modèles messages configurables (settings)
- [ ] Envoi WhatsApp contextuel depuis commande (lien wa.me pré-rempli avec template)
- [ ] Modèles : créée / prête / rappel retrait / en livraison / livrée
- [ ] Préparation API WATI (structure en place)

### Sprint 6 — CRM clients
- [ ] Solde client (crédit)
- [ ] Programme fidélité simple (points)
- [ ] Préférences client (champ libre + tags)
- [ ] Rappels automatiques retrait dépassé (cron Supabase)
- [ ] Import CSV clients

### Sprint 7 — Livraison
- [ ] Mode collecte / livraison sur commande
- [ ] Assignation employé/livreur
- [ ] Vue livreur (liste tournée du jour)
- [ ] Bouton Google Maps depuis détail commande
- [ ] Frais livraison par zone (configurable dans settings)

---

## V2 — SaaS Complet

**Objectif :** Monétisation, analytics, multi-utilisateurs, et scalabilité.

### Sprint 8 — Gestion équipe
- [ ] Page gestion employés (admin : inviter, rôles, désactiver)
- [ ] Rôles : admin / employé / livreur
- [ ] Permissions par rôle (lecture seule pour employé)
- [ ] Audit log actions (qui a fait quoi)

### Sprint 9 — Analytics & Comptabilité
- [ ] Dashboard analytics : CA trend (graphique), top services, top clients
- [ ] Export CSV/Excel ventes par période
- [ ] Rapport mensuel PDF
- [ ] Dépenses fournisseurs (module simple)
- [ ] Marge approximative

### Sprint 10 — SaaS & Monétisation
- [ ] Plans tarifaires (Free / Pro / Premium)
- [ ] Intégration Stripe paiement abonnement
- [ ] Limitation par plan (commandes, utilisateurs, fonctionnalités)
- [ ] Page compte / upgrade
- [ ] Dashboard super-admin (Anthropic / fondateur)

### Sprint 11 — Performance & Mobile
- [ ] Pagination sur toutes les listes (offset/limit)
- [ ] PWA installable (manifest + service worker)
- [ ] Mode offline basique (cache list commandes)
- [ ] Dark mode
- [ ] Tests e2e Playwright

---

## Principes de développement

1. **Travailler par modules incrémentaux** — chaque sprint = 1 commit clair par feature
2. **Tester après chaque modification** — `npm run build` obligatoire
3. **Préserver l'existant** — ne pas écraser les composants fonctionnels
4. **Mobile-first** — toute feature doit être testée sur mobile
5. **Données réelles Maroc** — prix DH, TVA configurable, ICE, mentions légales
