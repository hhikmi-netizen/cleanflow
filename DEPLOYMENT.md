# CleanFlow — Guide de déploiement

## Architecture

```
GitHub (master) ──push──▶ Vercel (auto-deploy) ──▶ https://cleanflow-nu.vercel.app
                                                         │
                                                  Supabase (PostgreSQL)
                                          https://jxjeftdbuuyvfbdywswy.supabase.co
```

## Variables d'environnement

Configurées dans Vercel → Settings → Environment Variables :

| Variable | Requis | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | URL du projet Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Clé publique Supabase (anon) |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Optionnel | Active la carte interactive dans Carte tournée |
| `GOOGLE_MAPS_SERVER_API_KEY` | Optionnel | Usage futur (Geocoding server-side) |

Les deux variables Supabase sont obligatoires. Le RLS gère la sécurité côté base de données.
Sans `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, la Carte tournée fonctionne en mode liste (toutes les actions restent disponibles).

## Configurer Google Maps (optionnel)

Pour activer la carte interactive dans la page **Carte tournée** :

1. Aller sur [console.cloud.google.com](https://console.cloud.google.com)
2. Créer un projet (ou sélectionner un existant)
3. Activer les APIs : **Maps JavaScript API** + **Places API** (pour l'autocomplétion d'adresse)
4. Dans **APIs & Services → Credentials**, créer une clé API
5. Restreindre la clé (recommandé) : Referrers HTTP → `https://cleanflow-nu.vercel.app/*` + `http://localhost:3000/*`
6. Dans Vercel → Project Settings → Environment Variables, ajouter :
   - `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` = la clé créée
7. Redéployer (ou attendre le prochain push)

⚠️ Ne jamais commiter la clé dans le code. Elle doit rester dans Vercel (ou `.env.local` en local).

## Déployer une nouvelle version

```bash
# 1. Vérifier que le build passe
npm run build

# 2. Vérifier les types
npx tsc --noEmit

# 3. Commiter
git add <fichiers>
git commit -m "description du changement"

# 4. Pousser → Vercel déploie automatiquement
git push origin master
```

Le déploiement Vercel prend environ 3–5 minutes.

## Appliquer une migration Supabase

```bash
# Vérifier le projet lié
npx supabase projects list

# Appliquer toutes les migrations en attente
npx supabase db push

# Vérifier les logs
npx supabase db diff
```

**Important :** toujours tester la migration en local avant de pousser en production.

## Ordre des migrations

Les migrations sont numérotées et doivent être appliquées dans l'ordre :

```
001_sprint2_order_fields.sql
002_sprint3_payments.sql
003_sav_incidents.sql
004_article_codes_tracking.sql
005_pricing_module.sql
006_article_quality.sql
007_invoice_numbers.sql
008_loyalty.sql
009_pricing_zones_timeslots.sql
010_delivery_and_subscriptions.sql
011_b2b_fields.sql
012_day_closings.sql
013_wa_notifications.sql
```

## Créer un nouvel environnement (from scratch)

1. Créer un projet Supabase
2. Exécuter `supabase/schema.sql` dans l'éditeur SQL Supabase
3. Appliquer toutes les migrations dans l'ordre
4. Configurer Google OAuth dans Supabase Auth (optionnel)
5. Désactiver la confirmation email dans Supabase Auth
6. Créer un projet Vercel, connecter le repo GitHub
7. Ajouter les variables d'environnement dans Vercel
8. Déployer

## Rollback

En cas de problème, rollback via Vercel UI :
- Vercel → Deployments → sélectionner le dernier déploiement stable → "Promote to Production"

Pour rollback base de données : ne pas rollback automatiquement — analyser l'impact et créer une migration corrective.

## Vérification post-déploiement

```bash
# Vérifier les logs d'erreur runtime
# Via Vercel MCP ou Vercel Dashboard → Logs

# Routes à tester manuellement
GET  /dashboard     → 200 (avec session)
GET  /login         → 200
GET  /orders        → 200 (avec session)
GET  /clients       → 200 (avec session)
GET  /settings      → 200 (avec session)
```

## Contacts

- Repo GitHub : https://github.com/hhikmi-netizen/cleanflow
- Vercel project : https://vercel.com/hhikmi-9113s-projects/cleanflow
- Supabase project : https://supabase.com/dashboard/project/jxjeftdbuuyvfbdywswy
