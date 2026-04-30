-- Migration SAV : incidents et journal des modifications
-- À exécuter dans Supabase > SQL Editor

CREATE TABLE IF NOT EXISTS incidents (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pressing_id       UUID REFERENCES pressings(id) ON DELETE CASCADE NOT NULL,
  order_id          UUID REFERENCES orders(id)    ON DELETE SET NULL,
  client_id         UUID REFERENCES clients(id)   ON DELETE SET NULL,
  type              TEXT NOT NULL CHECK (type IN (
                      'damage','loss','delay','quality','wrong_item','other'
                    )),
  description       TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'open' CHECK (status IN (
                      'open','in_progress','waiting_client','resolved','rejected'
                    )),
  resolution_action TEXT CHECK (resolution_action IN (
                      'partial_refund','full_refund','gesture','redo_service','none'
                    )),
  resolution_notes  TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS incident_history (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id  UUID REFERENCES incidents(id) ON DELETE CASCADE NOT NULL,
  user_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action       TEXT NOT NULL,
  note         TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_incidents_pressing ON incidents(pressing_id);
CREATE INDEX IF NOT EXISTS idx_incidents_order    ON incidents(order_id);
CREATE INDEX IF NOT EXISTS idx_incidents_client   ON incidents(client_id);
CREATE INDEX IF NOT EXISTS idx_incidents_status   ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incident_history   ON incident_history(incident_id);

ALTER TABLE incidents         ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_history  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view incidents in their pressing"
  ON incidents FOR SELECT
  USING (pressing_id IN (SELECT pressing_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can insert incidents in their pressing"
  ON incidents FOR INSERT
  WITH CHECK (pressing_id IN (SELECT pressing_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can update incidents in their pressing"
  ON incidents FOR UPDATE
  USING (pressing_id IN (SELECT pressing_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can view incident history in their pressing"
  ON incident_history FOR SELECT
  USING (incident_id IN (
    SELECT id FROM incidents
    WHERE pressing_id IN (SELECT pressing_id FROM users WHERE id = auth.uid())
  ));

CREATE POLICY "Users can insert incident history in their pressing"
  ON incident_history FOR INSERT
  WITH CHECK (incident_id IN (
    SELECT id FROM incidents
    WHERE pressing_id IN (SELECT pressing_id FROM users WHERE id = auth.uid())
  ));

CREATE OR REPLACE FUNCTION update_incidents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_incidents_updated_at
  BEFORE UPDATE ON incidents
  FOR EACH ROW EXECUTE FUNCTION update_incidents_updated_at();
