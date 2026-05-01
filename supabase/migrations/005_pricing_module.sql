-- Migration 005: Module de tarification avancée
-- Run in Supabase SQL Editor

-- ── 1. Discount fields on orders ──────────────────────────────────────────
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS discount_type    TEXT DEFAULT 'none' CHECK (discount_type IN ('none', 'percentage', 'fixed')),
  ADD COLUMN IF NOT EXISTS discount_value   DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_amount  DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_label   TEXT;

-- ── 2. Price rules ────────────────────────────────────────────────────────
-- Règles tarifaires configurables par pressing (overrides service base price)
CREATE TABLE IF NOT EXISTS price_rules (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pressing_id   UUID NOT NULL REFERENCES pressings(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  service_id    UUID REFERENCES services(id) ON DELETE CASCADE, -- NULL = all services
  rule_type     TEXT NOT NULL CHECK (rule_type IN (
    'individual', 'business', 'express', 'delivery_included',
    'pickup_included', 'subscription', 'promo', 'kilo', 'lot'
  )),
  price_type    TEXT NOT NULL CHECK (price_type IN ('fixed', 'per_kilo', 'per_lot', 'surcharge_fixed', 'surcharge_percent')),
  price         DECIMAL(10,2) NOT NULL,
  min_quantity  INT DEFAULT 1,
  priority      INT DEFAULT 0,
  active        BOOLEAN DEFAULT true,
  valid_from    DATE,
  valid_until   DATE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_price_rules_pressing ON price_rules(pressing_id);
CREATE INDEX IF NOT EXISTS idx_price_rules_service  ON price_rules(service_id);

ALTER TABLE price_rules ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'price_rules_pressing_isolation' AND tablename = 'price_rules') THEN
    CREATE POLICY "price_rules_pressing_isolation" ON price_rules
      USING (pressing_id IN (SELECT pressing_id FROM users WHERE id = auth.uid()));
  END IF;
END $$;

-- ── 3. Subscriptions (plans) ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscriptions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pressing_id     UUID NOT NULL REFERENCES pressings(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  sub_type        TEXT NOT NULL CHECK (sub_type IN ('monthly', 'shirts', 'kilo', 'enterprise', 'prepaid')),
  price           DECIMAL(10,2) NOT NULL,
  credits         DECIMAL(10,2),      -- for prepaid: credit balance granted
  quota_quantity  INT,                -- shirts plan: max pieces included
  quota_kilo      DECIMAL(10,4),      -- kilo plan: max kg included
  duration_days   INT DEFAULT 30,
  active          BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_pressing ON subscriptions(pressing_id);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'subscriptions_pressing_isolation' AND tablename = 'subscriptions') THEN
    CREATE POLICY "subscriptions_pressing_isolation" ON subscriptions
      USING (pressing_id IN (SELECT pressing_id FROM users WHERE id = auth.uid()));
  END IF;
END $$;

-- ── 4. Customer subscriptions ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customer_subscriptions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pressing_id      UUID NOT NULL REFERENCES pressings(id) ON DELETE CASCADE,
  client_id        UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  subscription_id  UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  status           TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'expired', 'cancelled')),
  balance          DECIMAL(10,2) DEFAULT 0,   -- remaining DH credit (prepaid)
  quota_used       INT DEFAULT 0,              -- pieces consumed (shirts)
  kilo_used        DECIMAL(10,4) DEFAULT 0,    -- kg consumed
  started_at       DATE DEFAULT CURRENT_DATE,
  expires_at       DATE,
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_subs_pressing ON customer_subscriptions(pressing_id);
CREATE INDEX IF NOT EXISTS idx_customer_subs_client   ON customer_subscriptions(client_id);

ALTER TABLE customer_subscriptions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'customer_subs_pressing_isolation' AND tablename = 'customer_subscriptions') THEN
    CREATE POLICY "customer_subs_pressing_isolation" ON customer_subscriptions
      USING (pressing_id IN (SELECT pressing_id FROM users WHERE id = auth.uid()));
  END IF;
END $$;

-- ── 5. Discount rules ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS discount_rules (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pressing_id       UUID NOT NULL REFERENCES pressings(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  discount_type     TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount')),
  value             DECIMAL(10,2) NOT NULL,
  scope             TEXT NOT NULL CHECK (scope IN ('order', 'service', 'client')),
  client_id         UUID REFERENCES clients(id) ON DELETE SET NULL,
  service_id        UUID REFERENCES services(id) ON DELETE SET NULL,
  min_order_amount  DECIMAL(10,2),
  max_uses          INT,
  uses_count        INT DEFAULT 0,
  active            BOOLEAN DEFAULT true,
  valid_from        DATE,
  valid_until       DATE,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_discount_rules_pressing ON discount_rules(pressing_id);

ALTER TABLE discount_rules ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'discount_rules_pressing_isolation' AND tablename = 'discount_rules') THEN
    CREATE POLICY "discount_rules_pressing_isolation" ON discount_rules
      USING (pressing_id IN (SELECT pressing_id FROM users WHERE id = auth.uid()));
  END IF;
END $$;

-- ── 6. Updated_at triggers ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_price_rules_updated_at ON price_rules;
CREATE TRIGGER trg_price_rules_updated_at BEFORE UPDATE ON price_rules FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER trg_subscriptions_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_customer_subs_updated_at ON customer_subscriptions;
CREATE TRIGGER trg_customer_subs_updated_at BEFORE UPDATE ON customer_subscriptions FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_discount_rules_updated_at ON discount_rules;
CREATE TRIGGER trg_discount_rules_updated_at BEFORE UPDATE ON discount_rules FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
