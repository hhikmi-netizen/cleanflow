# CleanFlow — Gestion de pressing pour le Maroc

SaaS multi-tenant de gestion opérationnelle pour les pressings (dry cleaners) au Maroc.

## Accès

| Environnement | URL |
|---|---|
| Production | https://cleanflow-nu.vercel.app |
| GitHub | https://github.com/hhikmi-netizen/cleanflow |
| Supabase | https://jxjeftdbuuyvfbdywswy.supabase.co |

## Stack technique

- **Frontend** : Next.js 16 (App Router, Turbopack), TypeScript, Tailwind CSS, shadcn/ui
- **Backend** : Supabase (PostgreSQL + Auth + RLS), Server Actions
- **Déploiement** : Vercel (auto-deploy sur push `master`)
- **Auth** : Email/mot de passe + Google OAuth (confirmation email désactivée)

## Démarrage local

```bash
# 1. Cloner le repo
git clone https://github.com/hhikmi-netizen/cleanflow.git
cd cleanflow

# 2. Variables d'environnement
cp .env.example .env.local
# Remplir NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY

# 3. Installer les dépendances
npm install

# 4. Lancer le dev server
npm run dev
```

## Structure du projet

```
app/
  (auth)/          # login, signup
  (dashboard)/     # toutes les pages protégées
    dashboard/     # accueil + stats du jour + menu visuel
    orders/        # commandes (liste, création, détail, facture, caisse rapide)
    clients/       # clients (liste, fiche, relevé, abonnement, facture groupée)
    services/      # catalogue articles
    pricing/       # règles de prix, abonnements, remises
    incidents/     # SAV / réclamations
    livraisons/    # board livraison/collecte
    caisse/        # clôture de caisse
    stats/         # statistiques et graphiques
    team/          # gestion des employés
    settings/      # paramètres pressing
    express/       # dépôt express comptoir
  onboarding/      # setup initial du pressing
  track/[token]/   # suivi commande public (sans auth)
components/        # composants React réutilisables
lib/               # utils, types, priceEngine, hooks
supabase/
  schema.sql       # schéma initial complet
  migrations/      # 013 migrations incrémentales
```

## Modules

| Module | Route | État |
|---|---|---|
| Dashboard | /dashboard | Fonctionnel |
| Commandes | /orders, /orders/new, /orders/[id] | Fonctionnel |
| Caisse rapide POS | /orders/quick | Fonctionnel |
| Clients | /clients, /clients/new, /clients/[id] | Fonctionnel |
| Relevé de compte | /clients/[id]/releve | Fonctionnel |
| Abonnements client | /clients/[id]/subscription/[subId] | Fonctionnel |
| Facture groupée | /clients/[id]/batch-invoice | Fonctionnel |
| Catalogue | /services | Fonctionnel |
| Tarification | /pricing | Fonctionnel |
| SAV | /incidents | Fonctionnel |
| Livraisons | /livraisons | Fonctionnel |
| Dépôt express | /express | Fonctionnel |
| Caisse | /caisse | Fonctionnel |
| Statistiques | /stats | Fonctionnel |
| Équipe | /team | Fonctionnel |
| Paramètres | /settings | Fonctionnel |
| Tracking public | /track/[token] | Fonctionnel |
| Facture imprimable | /orders/[id]/invoice | Fonctionnel |

## Commandes utiles

```bash
npm run build          # build production (inclut typecheck)
npx next lint          # lint ESLint
npx tsc --noEmit       # typecheck seul
npx supabase db push   # appliquer les migrations en production
```

## Règles de développement

Lire [DO_NOT_REGENERATE.md](./DO_NOT_REGENERATE.md) avant toute modification importante.
