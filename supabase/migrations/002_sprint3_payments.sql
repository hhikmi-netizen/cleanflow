-- Migration Sprint 3 : historique paiements partiels par commande
-- À exécuter dans Supabase > SQL Editor

CREATE TABLE IF NOT EXISTS payments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pressing_id  UUID REFERENCES pressings(id) ON DELETE CASCADE NOT NULL,
  order_id     UUID REFERENCES orders(id)    ON DELETE CASCADE NOT NULL,
  amount       DECIMAL(10,2) NOT NULL,
  method       TEXT CHECK (method IN ('cash','card','transfer','credit')) DEFAULT 'cash',
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_order    ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_pressing ON payments(pressing_id);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view payments in their pressing"
  ON payments FOR SELECT
  USING (pressing_id IN (SELECT pressing_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can insert payments in their pressing"
  ON payments FOR INSERT
  WITH CHECK (pressing_id IN (SELECT pressing_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Admins can delete payments"
  ON payments FOR DELETE
  USING (pressing_id IN (SELECT pressing_id FROM users WHERE id = auth.uid() AND role = 'admin'));
