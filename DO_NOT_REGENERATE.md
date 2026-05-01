# DO NOT REGENERATE — Règles de préservation du code

## Principe fondamental

**Ne jamais repartir de zéro.**

Ce projet représente plusieurs semaines de développement incrémental avec des dizaines de modules interdépendants, des migrations de base de données irréversibles en production, et un schéma de données multi-tenant stable.

Toute régénération complète détruirait :
- Les 13 migrations Supabase (non reversibles sans intervention manuelle)
- Les 28 routes fonctionnelles et leur logique métier
- Le moteur de tarification (`lib/priceEngine.ts`)
- Les politiques RLS qui garantissent l'isolation des données par pressing
- Les données de production des utilisateurs réels

---

## Règles absolues

### 1. Jamais supprimer un module existant

Les modules suivants sont **en production et utilisés** :
- `app/(dashboard)/orders/` — commandes, factures, caisse rapide
- `app/(dashboard)/clients/` — clients, relevés, abonnements
- `app/(dashboard)/pricing/` — moteur de tarification
- `app/(dashboard)/livraisons/` — board livraison
- `app/(dashboard)/caisse/` — clôture de caisse
- `app/(dashboard)/incidents/` — SAV
- `app/(dashboard)/stats/` — statistiques
- `app/(dashboard)/express/` — dépôt express
- `app/track/[token]/` — suivi public commande
- `app/onboarding/` — setup pressing
- `supabase/schema.sql` + `supabase/migrations/` — base de données

### 2. Toute modification est incrémentale

- Modifier un composant existant : **éditer le fichier**, ne pas le recréer
- Ajouter une colonne de DB : créer une **nouvelle migration** (ex: `014_...sql`), ne pas toucher aux migrations précédentes
- Ajouter une route : créer un nouveau fichier dans le dossier approprié
- Modifier le schéma : utiliser `IF NOT EXISTS`, `IF EXISTS`, `ADD COLUMN IF NOT EXISTS`

### 3. Build avant tout commit

```bash
npm run build
```

Si le build échoue, **corriger avant de commiter**. Ne jamais pousser du code cassé en production.

### 4. Préserver le périmètre métier pressing Maroc

Ce projet est spécifique au contexte pressing marocain :
- Monnaie : Dirham (MAD, DH)
- Langue : Français
- Contexte réglementaire : ICE, TVA marocaine
- Articles : chemise, djellaba, caftan, burnous, tapis, etc.
- WhatsApp : canal principal de communication client

Ne pas "internationaliser" ou "généraliser" sans demande explicite.

### 5. Architecture multi-tenant à préserver

Chaque requête Supabase **doit** filtrer par `pressing_id` :
```typescript
.eq('pressing_id', pressingId)
```

Ne jamais supprimer ces filtres. Ne jamais désactiver le RLS.

### 6. Composants partagés à ne pas casser

Ces composants sont utilisés dans de nombreux endroits :
- `lib/utils.ts` — `formatCurrency`, `formatDate`, `getStatusLabel`, etc.
- `lib/types.ts` — toutes les interfaces TypeScript du domaine
- `lib/priceEngine.ts` — moteur de résolution des prix
- `components/ui/` — tous les composants shadcn/ui
- `supabase/migrations/` — toutes les migrations

---

## En cas de doute

Avant toute modification importante :
1. Lire les fichiers concernés avec les outils disponibles
2. Comprendre les dépendances
3. Faire un `git status` pour voir l'état actuel
4. Faire un `git log --oneline -10` pour voir l'historique récent
5. Proposer la modification plutôt que de l'exécuter directement

---

*Document créé le 2026-05-01 lors de la stabilisation MVP.*
*Mettre à jour si le périmètre évolue significativement.*
