# CleanFlow — Product Scope

SaaS de gestion de pressing (dry cleaner) pour le Maroc.  
Multi-tenant isolé par `pressing_id`. Stack : Next.js 16 App Router + Supabase + Tailwind/shadcn.

---

## FONCTIONNALITÉS ACTUELLEMENT IMPLÉMENTÉES

### AUTH & ONBOARDING
- [x] Inscription email/mot de passe (confirmation email désactivée)
- [x] Connexion Google OAuth
- [x] Callback OAuth (`/auth/callback`)
- [x] Onboarding 3 étapes : pressing → services → premier client
- [x] Server Actions pour les écritures onboarding (migration @supabase/ssr)

### DASHBOARD (`/dashboard`)
- [x] Stats du jour : CA, count commandes
- [x] CA du mois
- [x] Commandes en attente (count)
- [x] Total clients
- [x] 5 dernières commandes avec client, status, total
- [x] Actions rapides : + Commande, Gérer clients

### CLIENTS (`/clients`, `/clients/new`, `/clients/[id]`)
- [x] Liste avec search (nom / phone / email)
- [x] Badge type : Particulier / Professionnel
- [x] Colonne total commandes et CA total
- [x] Création client : nom*, phone*, email, adresse, type, ICE, notes
- [x] Fiche détail : stats + historique 10 commandes
- [x] Actions : appel tel, WhatsApp manuel, Google Maps
- [x] Modification inline

### COMMANDES (`/orders`, `/orders/new`, `/orders/[id]`)
- [x] Liste avec search (n° commande ou nom client) et filtre status
- [x] Création commande :
  - [x] Recherche client par nom/téléphone (dropdown)
  - [x] Sélection articles avec quantités +/-
  - [x] Prix auto selon type client (particulier / pro)
  - [x] Date retrait prévue
  - [x] Mode paiement (espèces / carte / virement)
  - [x] Acompte
  - [x] TVA optionnelle
  - [x] Notes
  - [x] Récapitulatif dynamique (sous-total, TVA, acompte, total, reste à payer)
- [x] Détail commande : articles, client, statuts, paiement
- [x] Flow status : pending → in_progress → ready → delivered + annulé
- [x] Toggle payé
- [x] Bon de commande imprimable PDF (`/orders/[id]/invoice`)
  - [x] En-tête pressing, données client, tableau articles, totaux
  - [x] Pied de page configurable
  - [x] CSS print

### CATALOGUE SERVICES (`/services`)
- [x] Liste services groupés par catégorie
- [x] Toggle actif/inactif
- [x] Create/Edit/Delete inline
- [x] Import services par défaut (7 services pré-configurés)

### PARAMÈTRES (`/settings`)
- [x] Infos pressing : nom, phone, email, ICE, adresse, TVA, devise
- [x] WhatsApp (UI prête, envoi non implémenté)
- [x] Pied de page tickets

### BASE DE DONNÉES
- [x] 7 tables : pressings, users, clients, services, orders, order_items, settings
- [x] RLS multi-tenant par pressing_id sur toutes les tables
- [x] Auto-génération n° commande CMD-YYMM-XXXX
- [x] Trigger stats clients (total_orders, total_spent)

---

## FONCTIONNALITÉS ABSENTES (à implémenter)

### MODULE COMMANDES — Priorité HAUTE
- [ ] **BUG** : dropdown client ne se ferme pas au clic extérieur
- [ ] **BUG** : aucune option "créer nouveau client" depuis commande
- [ ] Mode dépôt : sur place / collecte domicile
- [ ] Mode retrait : sur place / livraison à domicile
- [ ] Notes par article dans commande
- [ ] Photo ou QR code article
- [ ] Statut "collecte" (avant réception)
- [ ] Date dépôt explicite
- [ ] Annulation avec motif

### MODULE CAISSE / PAIEMENT — Priorité HAUTE
- [ ] Caisse virtuelle (solde du jour)
- [ ] Paiement partiel (enregistrer un paiement sans clore la commande)
- [ ] Historique encaissements par commande
- [ ] Reçu de paiement (distinct du bon de commande)
- [ ] Clôture journalière (rapport Z)
- [ ] Crédit client (mettre en compte)

### MODULE FACTURATION — Priorité HAUTE
- [ ] Facture officielle (distinct du bon de commande)
- [ ] Numérotation auto factures (FAC-YYMM-XXXX)
- [ ] Logo du pressing sur documents
- [ ] Mentions légales Maroc
- [ ] Avoir / annulation facture
- [ ] Export PDF direct (sans print dialog)
- [ ] Devis (avant commande)

### MODULE COMPTABILITÉ — Priorité MOYENNE
- [ ] Export CSV / Excel des ventes
- [ ] Ventes par période (date range)
- [ ] Rapport mensuel
- [ ] Dépenses fournisseurs
- [ ] Catégories de dépenses
- [ ] Marge approximative

### MODULE CLIENTS / CRM — Priorité MOYENNE
- [ ] Solde client (crédit/débit)
- [ ] Programme fidélité (points)
- [ ] Abonnements clients (forfait mensuel)
- [ ] Préférences client (ex. amidon léger, cintres exclus)
- [ ] Rappels automatiques retrait dépassé
- [ ] Import CSV clients

### MODULE NOTIFICATIONS — Priorité HAUTE
- [ ] Envoi WhatsApp manuel immédiat (wa.me link avec message pré-rempli) — déjà partiel
- [ ] Modèles messages configurables : commande créée, prête, rappel retrait, en livraison, livrée
- [ ] Préparation intégration WATI / Twilio
- [ ] Activation par pressing dans settings

### MODULE COLLECTE / LIVRAISON — Priorité MOYENNE
- [ ] Gestion ramassage (collecte domicile)
- [ ] Assignation chauffeur/livreur
- [ ] Tournées simples
- [ ] Bouton Google Maps depuis commande
- [ ] Statut livreur
- [ ] Frais livraison configurable par zone

### MODULE PARAMÈTRES — Priorité MOYENNE
- [ ] Upload logo pressing (Supabase Storage)
- [ ] Horaires d'ouverture (JSONB déjà en DB)
- [ ] Gestion employés (invite, rôles admin/employé/livreur)
- [ ] Modes de paiement activés/désactivés
- [ ] Zones de livraison + frais
- [ ] Personnalisation couleurs document

### MODULE SAAS — Priorité BASSE
- [ ] Plan gratuit (limite 50 commandes/mois)
- [ ] Plan Pro (commandes illimitées + WhatsApp)
- [ ] Plan Premium (multi-employés + livreurs + analytics)
- [ ] Stripe/PayPal intégration
- [ ] Limitation par plan
- [ ] Page compte / abonnement

### TECHNIQUE — Priorité BASSE
- [ ] Pagination sur toutes les listes (actuellement full-fetch)
- [ ] Analytics avancés avec graphiques (CA trend, top services)
- [ ] Dark mode
- [ ] PWA (installable mobile)
- [ ] Offline mode basique
- [ ] Tests e2e (Playwright)
- [ ] Error monitoring (Sentry)
