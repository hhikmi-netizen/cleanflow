-- Migration 006: Statut article individuel + contrôle qualité textile
-- Run in Supabase SQL Editor

-- ── 1. Individual article status + textile fields ──────────────────────
ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS item_status    TEXT DEFAULT 'received'
    CHECK (item_status IN ('received', 'in_cleaning', 'done', 'ready', 'issue')),
  ADD COLUMN IF NOT EXISTS textile_type   TEXT,  -- chemise, pantalon, costume, robe, veste, linge, autre
  ADD COLUMN IF NOT EXISTS stain_noted    BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS stain_desc     TEXT,
  ADD COLUMN IF NOT EXISTS alteration_needed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS alteration_desc   TEXT;

-- ── 2. Quality checks table ────────────────────────────────────────────
-- Diagnostic par article (inspection avant traitement)
CREATE TABLE IF NOT EXISTS quality_checks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pressing_id     UUID NOT NULL REFERENCES pressings(id) ON DELETE CASCADE,
  order_item_id   UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  checked_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  textile_type    TEXT,
  condition       TEXT CHECK (condition IN ('good', 'fragile', 'damaged', 'stained')),
  stains          TEXT[],       -- array: 'coffee', 'grease', 'ink', 'blood', etc.
  alteration      TEXT,         -- 'hem', 'button', 'zipper', 'other' or null
  notes           TEXT,
  photo_url       TEXT,
  checked_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quality_checks_order_item ON quality_checks(order_item_id);
CREATE INDEX IF NOT EXISTS idx_quality_checks_pressing   ON quality_checks(pressing_id);

ALTER TABLE quality_checks ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'quality_checks_pressing' AND tablename = 'quality_checks') THEN
    CREATE POLICY "quality_checks_pressing" ON quality_checks
      USING (pressing_id IN (SELECT pressing_id FROM users WHERE id = auth.uid()));
  END IF;
END $$;

-- ── 3. Express deposit flag on orders ─────────────────────────────────
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS is_express     BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS express_notes  TEXT;
