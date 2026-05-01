-- Migration 010: Collecte/Livraison (Module A) + Suivi abonnements (Module B)
-- Run: supabase db push

-- ── MODULE A : champs livraison sur orders ────────────────────────────────

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS pickup_address   TEXT,
  ADD COLUMN IF NOT EXISTS delivery_address TEXT,
  ADD COLUMN IF NOT EXISTS pickup_slot      TEXT,   -- ex: "2026-05-03 09:00-11:00"
  ADD COLUMN IF NOT EXISTS delivery_slot    TEXT,
  ADD COLUMN IF NOT EXISTS assigned_to      UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS delivery_status  TEXT CHECK (delivery_status IN (
    'pending', 'scheduled', 'en_route', 'delivered', 'failed'
  ));

CREATE INDEX IF NOT EXISTS idx_orders_delivery_status ON orders(delivery_status) WHERE delivery_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_assigned_to     ON orders(assigned_to)     WHERE assigned_to IS NOT NULL;

-- ── MODULE B : lien abonnement client sur orders ──────────────────────────

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS customer_sub_id UUID REFERENCES customer_subscriptions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orders_customer_sub ON orders(customer_sub_id) WHERE customer_sub_id IS NOT NULL;
