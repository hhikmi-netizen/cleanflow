-- Migration Sprint 2 : champs mode dépôt/retrait, date dépôt, motif annulation, notes article
-- À exécuter dans Supabase > SQL Editor

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS deposit_mode  TEXT DEFAULT 'on_site'
    CHECK (deposit_mode  IN ('on_site', 'pickup')),
  ADD COLUMN IF NOT EXISTS delivery_mode TEXT DEFAULT 'on_site'
    CHECK (delivery_mode IN ('on_site', 'delivery')),
  ADD COLUMN IF NOT EXISTS deposit_date      DATE,
  ADD COLUMN IF NOT EXISTS cancelled_reason  TEXT;

ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS notes TEXT;
