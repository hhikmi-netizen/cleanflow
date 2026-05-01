# CleanFlow — Checklist de tests fonctionnels

À exécuter avant chaque déploiement majeur.

## 1. Auth

- [ ] **Inscription** : créer un compte via email → onboarding s'affiche
- [ ] **Inscription Google** : OAuth Google → onboarding s'affiche
- [ ] **Connexion email** : email + mot de passe → dashboard
- [ ] **Déconnexion** : clic Déconnexion → retour /login
- [ ] **Session expirée** : accéder à /dashboard sans session → redirection /login
- [ ] **Isolation tenant** : deux comptes différents ne voient pas les mêmes données

## 2. Onboarding

- [ ] Étape 1 : remplir nom pressing, téléphone → continuer
- [ ] Étape 2 : sélectionner 3 services → continuer
- [ ] Étape 3 : ajouter un premier client (optionnel) → accéder au dashboard
- [ ] Rejoindre un pressing existant via code équipe

## 3. Clients

- [ ] **Créer particulier** : nom, téléphone, type = particulier → sauvegardé
- [ ] **Créer professionnel** : nom, ICE, téléphone, type = professionnel → sauvegardé
- [ ] **Recherche** : taper 3 lettres → résultats filtrés
- [ ] **Fiche client** : clic → historique + KPIs + abonnements
- [ ] **Modifier** : changer adresse → sauvegardé
- [ ] **Relevé de compte** : filtrer par date → uniquement les commandes de la période

## 4. Commandes

- [ ] **Créer commande** : sélectionner client + 2 articles + quantités → total calculé
- [ ] **Remise** : appliquer 10% → total réduit
- [ ] **Acompte** : saisir 50 DH → reste à payer = total - 50
- [ ] **Paiement** : mode espèces → commande créée
- [ ] **Statut** : passer en_cours → prête → livrée
- [ ] **Annuler** : bouton annuler + motif → statut = annulée
- [ ] **Paiement partiel** : ajouter un versement → solde mis à jour
- [ ] **Facture** : clic "Bon" → page imprimable avec QR code
- [ ] **Ticket suivi** : accéder /track/[token] sans auth → statut visible

## 5. Caisse rapide (POS)

- [ ] Accéder /orders/quick → catalogue visuel s'affiche avec prix
- [ ] Rechercher client par téléphone → sélectionner
- [ ] Ajouter 3 articles via tuiles → panier mis à jour
- [ ] Appliquer remise → total recalculé
- [ ] Encaisser → commande créée, écran de confirmation
- [ ] Lien WhatsApp disponible sur l'écran de confirmation

## 6. Articles et qualité

- [ ] Ouvrir une commande en_cours → onglet Articles → changer statut par article
- [ ] Marquer un article avec tache → note enregistrée
- [ ] Étiquettes : générer les étiquettes articles → QR codes affichés

## 7. WhatsApp

- [ ] Commande prête → clic "Notifier" → lien wa.me s'ouvre avec message prérempli
- [ ] Livraison en route → banner notification → lien wa.me correct
- [ ] Vérifier que les toggles dans Paramètres activent/désactivent les notifications

## 8. Livraisons

- [ ] Board livraison s'affiche avec commandes à collecter
- [ ] Assigner un chauffeur → sauvegardé
- [ ] Passer en_route → notification WhatsApp proposée
- [ ] Passer livré → statut mis à jour

## 9. Tarification

- [ ] Créer règle express (surcharge +50%) → vérifier dans commande express
- [ ] Créer abonnement chemises (10 pièces) → attribuer à un client
- [ ] Vérifier quota décrémenté à chaque commande

## 10. SAV

- [ ] Créer incident de type "dommage" sur une commande existante
- [ ] Ajouter une note de résolution
- [ ] Changer le statut → journal mis à jour

## 11. Caisse

- [ ] Clôturer la journée avec saisie espèces réels → écart calculé
- [ ] Historique des clôtures affiche la dernière

## 12. Statistiques

- [ ] /stats s'affiche avec graphiques
- [ ] CA du mois visible
- [ ] Top services affiché

## 13. Paramètres

- [ ] Modifier nom du pressing → sauvegardé
- [ ] Activer notification WhatsApp "Commande créée" → toggle sauvegardé
- [ ] Configurer taux TVA → visible sur les factures

## 14. Build et déploiement

```bash
npm run build        # doit passer sans erreur
npx next lint        # zéro warning critique
npx tsc --noEmit     # zéro erreur TypeScript
```

## Résultats lors de la validation MVP (2026-05-01)

| Vérification | Résultat |
|---|---|
| `npm run build` | ✅ Succès |
| `npx tsc --noEmit` | ✅ 0 erreur |
| `npx next lint` | ✅ 0 erreur |
| Dernier déploiement Vercel | ✅ READY (`dpl_CFtKjqmiWaNEeoWnVocXdaYN27kW`) |
| Erreurs 500 sur le déploiement courant | ✅ Aucune |
| Routes cassées (404) | ✅ Aucune |
| TODO / placeholders dans le code | ✅ Aucun |
