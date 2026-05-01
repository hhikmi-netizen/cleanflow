-- MODULE D: Clôture de caisse

CREATE TABLE IF NOT EXISTS day_closings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pressing_id   UUID NOT NULL REFERENCES pressings(id) ON DELETE CASCADE,
  closed_by     UUID REFERENCES users(id) ON DELETE SET NULL,
  closing_date  DATE NOT NULL,
  cash          DECIMAL(10,2) NOT NULL DEFAULT 0,
  card          DECIMAL(10,2) NOT NULL DEFAULT 0,
  transfer      DECIMAL(10,2) NOT NULL DEFAULT 0,
  total         DECIMAL(10,2) NOT NULL DEFAULT 0,
  orders_count  INT NOT NULL DEFAULT 0,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE day_closings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tenant_day_closings' AND tablename = 'day_closings') THEN
    CREATE POLICY "tenant_day_closings" ON day_closings
      USING (pressing_id IN (SELECT pressing_id FROM users WHERE id = auth.uid()));
  END IF;
END $$;

-- Unique closing per day per pressing
CREATE UNIQUE INDEX IF NOT EXISTS day_closings_pressing_date ON day_closings (pressing_id, closing_date);
