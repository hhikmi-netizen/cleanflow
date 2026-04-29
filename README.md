# CleanFlow — Gestion de pressing au Maroc

Application SaaS pour la gestion de pressings : commandes, clients, catalogue, facturation.

## Stack

- **Next.js 16** (App Router, Turbopack)
- **TypeScript**
- **Tailwind CSS + shadcn/ui**
- **Supabase** (Auth + PostgreSQL + RLS)
- **Vercel** (déploiement)

---

## Démarrage rapide

### 1. Installer

```bash
git clone https://github.com/votre-user/cleanflow.git
cd cleanflow
npm install
```

### 2. Configurer Supabase

1. Créer un projet sur [supabase.com](https://supabase.com/dashboard)
2. Aller dans **SQL Editor** et exécuter `supabase/schema.sql`
3. Copier les credentials :

```bash
cp .env.example .env.local
# Éditer .env.local avec vos vraies clés
```

### 3. Lancer en développement

```bash
npm run dev
```

---

## Routes

| Route | Description | Auth |
|-------|-------------|------|
| `/login` | Connexion | Public |
| `/signup` | Création compte | Public |
| `/onboarding` | Wizard 3 étapes | Connecté |
| `/dashboard` | Tableau de bord | Connecté |
| `/orders` | Liste commandes | Connecté |
| `/orders/new` | Créer commande | Connecté |
| `/clients` | Liste clients | Connecté |
| `/services` | Catalogue | Admin |
| `/settings` | Paramètres | Admin |

---

## Déploiement Vercel

```bash
git add .
git commit -m "feat: CleanFlow MVP"
git remote add origin https://github.com/votre-user/cleanflow.git
git push -u origin main
```

Puis sur [vercel.com/new](https://vercel.com/new) :
1. Importer le repo
2. Ajouter les variables env :
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Deploy

Dans Supabase → Authentication → URL Configuration :
- Site URL : `https://votre-app.vercel.app`
- Redirect URLs : `https://votre-app.vercel.app/**`

---

## Checklist test MVP

- [ ] Signup → pressing + user créés
- [ ] Onboarding 3 étapes fonctionnel
- [ ] Créer commande (client + articles + total)
- [ ] Changer statut commande (pending → delivered)
- [ ] Marquer commande comme payée
- [ ] WhatsApp + téléphone + Google Maps client
- [ ] Ajouter/modifier client
- [ ] Créer/modifier services avec prix
- [ ] Modifier paramètres pressing
- [ ] Interface mobile (hamburger menu, touch targets)
- [ ] Un utilisateur ne voit que son pressing (RLS)

---

## Sécurité

- RLS activé sur toutes les tables
- Isolation totale par `pressing_id`
- `.env.local` jamais commité
