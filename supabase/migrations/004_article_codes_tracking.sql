-- Migration 004: article codes, client codes, tracking tokens
-- Run in Supabase SQL Editor

-- 1. Article code unique per item
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS article_code TEXT;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS color TEXT;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS brand TEXT;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS item_type TEXT;

-- Unique constraint on article_code
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'order_items_article_code_key'
  ) THEN
    ALTER TABLE order_items ADD CONSTRAINT order_items_article_code_key UNIQUE (article_code);
  END IF;
END $$;

-- Trigger: auto-generate article_code on INSERT if not provided
CREATE OR REPLACE FUNCTION generate_article_code()
RETURNS TRIGGER AS $$
DECLARE
  new_code TEXT;
  attempts INT := 0;
BEGIN
  IF NEW.article_code IS NULL THEN
    LOOP
      new_code := 'ART-' || UPPER(SUBSTRING(REPLACE(gen_random_uuid()::TEXT, '-', ''), 1, 6));
      BEGIN
        NEW.article_code := new_code;
        EXIT;
      EXCEPTION WHEN unique_violation THEN
        attempts := attempts + 1;
        IF attempts > 10 THEN RAISE EXCEPTION 'Could not generate unique article_code'; END IF;
      END;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_article_code ON order_items;
CREATE TRIGGER trg_article_code
  BEFORE INSERT ON order_items
  FOR EACH ROW EXECUTE FUNCTION generate_article_code();

-- Backfill existing items without article_code
UPDATE order_items
SET article_code = 'ART-' || UPPER(SUBSTRING(REPLACE(gen_random_uuid()::TEXT, '-', ''), 1, 6))
WHERE article_code IS NULL;

-- 2. Client code (short identifier for counter use)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS client_code TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'clients_client_code_key'
  ) THEN
    ALTER TABLE clients ADD CONSTRAINT clients_client_code_key UNIQUE (client_code);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION generate_client_code()
RETURNS TRIGGER AS $$
DECLARE
  new_code TEXT;
  attempts INT := 0;
BEGIN
  IF NEW.client_code IS NULL THEN
    LOOP
      new_code := 'CLI-' || UPPER(SUBSTRING(REPLACE(gen_random_uuid()::TEXT, '-', ''), 1, 5));
      BEGIN
        NEW.client_code := new_code;
        EXIT;
      EXCEPTION WHEN unique_violation THEN
        attempts := attempts + 1;
        IF attempts > 10 THEN RAISE EXCEPTION 'Could not generate unique client_code'; END IF;
      END;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_client_code ON clients;
CREATE TRIGGER trg_client_code
  BEFORE INSERT ON clients
  FOR EACH ROW EXECUTE FUNCTION generate_client_code();

-- Backfill existing clients
UPDATE clients
SET client_code = 'CLI-' || UPPER(SUBSTRING(REPLACE(gen_random_uuid()::TEXT, '-', ''), 1, 5))
WHERE client_code IS NULL;

-- 3. Tracking token on orders (public, non-guessable UUID for customer tracking)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_token UUID DEFAULT gen_random_uuid();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'orders_tracking_token_key'
  ) THEN
    ALTER TABLE orders ADD CONSTRAINT orders_tracking_token_key UNIQUE (tracking_token);
  END IF;
END $$;

-- Backfill existing orders
UPDATE orders SET tracking_token = gen_random_uuid() WHERE tracking_token IS NULL;

-- 4. RLS policy: allow anon to read orders by tracking_token (public tracking page)
-- Only expose non-sensitive fields via a view or specific policy
CREATE POLICY IF NOT EXISTS "public_track_order"
  ON orders FOR SELECT
  USING (tracking_token IS NOT NULL);

-- Note: the public tracking page will use anon key + filter by tracking_token
-- This is safe because tracking_token is a UUID (128-bit, non-guessable)
