-- Sprint 9: Carte fidélité

-- Points balance on clients
ALTER TABLE clients ADD COLUMN IF NOT EXISTS loyalty_points INT NOT NULL DEFAULT 0;

-- Loyalty transaction log
CREATE TABLE IF NOT EXISTS loyalty_transactions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pressing_id  UUID NOT NULL REFERENCES pressings(id) ON DELETE CASCADE,
  client_id    UUID NOT NULL REFERENCES clients(id)   ON DELETE CASCADE,
  order_id     UUID             REFERENCES orders(id)  ON DELETE SET NULL,
  type         TEXT NOT NULL CHECK (type IN ('earned', 'redeemed', 'adjustment')),
  points       INT  NOT NULL,
  note         TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE loyalty_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "loyalty_pressing_isolation" ON loyalty_transactions
  USING (pressing_id = (
    SELECT pressing_id FROM users WHERE id = auth.uid()
  ));

-- Loyalty config in settings
ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS loyalty_enabled      BOOLEAN       NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS points_per_dh        NUMERIC(10,2) NOT NULL DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS points_value_dh      NUMERIC(10,2) NOT NULL DEFAULT 0.10,
  ADD COLUMN IF NOT EXISTS points_redemption_min INT          NOT NULL DEFAULT 50;
-- points_per_dh       : points earned per DH of order total (default 1 pt / DH)
-- points_value_dh     : DH value of 1 point when redeeming (default 0.10 DH, so 100 pts = 10 DH)
-- points_redemption_min: minimum points needed to redeem

-- Atomic increment / decrement for loyalty_points on clients
CREATE OR REPLACE FUNCTION increment_loyalty_points(p_client_id UUID, p_points INT)
RETURNS VOID AS $$
BEGIN
  UPDATE clients
  SET loyalty_points = GREATEST(0, loyalty_points + p_points)
  WHERE id = p_client_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
