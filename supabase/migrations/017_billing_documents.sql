-- ═══════════════════════════════════════════════════════════════════════════
-- MODULE: Facturation périodique / relevés clients professionnels
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Séquences de numérotation ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS document_number_sequences (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  pressing_id UUID    NOT NULL REFERENCES pressings(id) ON DELETE CASCADE,
  doc_type    TEXT    NOT NULL,   -- 'FAC' | 'REL'
  year_month  TEXT    NOT NULL,   -- 'YYYYMM'
  last_seq    INTEGER NOT NULL DEFAULT 0,
  UNIQUE(pressing_id, doc_type, year_month)
);

-- ── Documents de facturation périodique ──────────────────────────────────
CREATE TABLE IF NOT EXISTS billing_documents (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  pressing_id     UUID          NOT NULL REFERENCES pressings(id)  ON DELETE CASCADE,
  client_id       UUID          NOT NULL REFERENCES clients(id)    ON DELETE CASCADE,
  document_number TEXT          NOT NULL,
  doc_type        TEXT          NOT NULL DEFAULT 'REL',  -- 'FAC' | 'REL'
  period_start    DATE          NOT NULL,
  period_end      DATE          NOT NULL,
  subtotal        NUMERIC(10,2) NOT NULL DEFAULT 0,
  tax             NUMERIC(10,2) NOT NULL DEFAULT 0,
  total           NUMERIC(10,2) NOT NULL DEFAULT 0,
  amount_paid     NUMERIC(10,2) NOT NULL DEFAULT 0,
  balance_due     NUMERIC(10,2) NOT NULL DEFAULT 0,
  status          TEXT          NOT NULL DEFAULT 'draft',  -- draft|sent|paid|partial|unpaid
  payment_terms   TEXT          NOT NULL DEFAULT 'immediate',
  notes           TEXT,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  UNIQUE(pressing_id, document_number)
);

-- ── Lignes du document (1 ligne = 1 commande de la période) ──────────────
CREATE TABLE IF NOT EXISTS billing_document_items (
  id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id  UUID          NOT NULL REFERENCES billing_documents(id) ON DELETE CASCADE,
  order_id     UUID          REFERENCES orders(id) ON DELETE SET NULL,
  order_number TEXT          NOT NULL,
  order_date   DATE          NOT NULL,
  description  TEXT,
  subtotal     NUMERIC(10,2) NOT NULL DEFAULT 0,
  amount_paid  NUMERIC(10,2) NOT NULL DEFAULT 0,
  balance      NUMERIC(10,2) NOT NULL DEFAULT 0
);

-- ── Index ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_billing_docs_pressing  ON billing_documents(pressing_id);
CREATE INDEX IF NOT EXISTS idx_billing_docs_client    ON billing_documents(client_id);
CREATE INDEX IF NOT EXISTS idx_billing_docs_status    ON billing_documents(pressing_id, status);
CREATE INDEX IF NOT EXISTS idx_billing_items_document ON billing_document_items(document_id);

-- ── RLS ──────────────────────────────────────────────────────────────────
ALTER TABLE document_number_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_documents          ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_document_items     ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pressing_rls_sequences"
  ON document_number_sequences FOR ALL
  USING (pressing_id = (SELECT pressing_id FROM users WHERE id = auth.uid() LIMIT 1));

CREATE POLICY "pressing_rls_billing_docs"
  ON billing_documents FOR ALL
  USING (pressing_id = (SELECT pressing_id FROM users WHERE id = auth.uid() LIMIT 1));

CREATE POLICY "pressing_rls_billing_items"
  ON billing_document_items FOR ALL
  USING (
    document_id IN (
      SELECT id FROM billing_documents
      WHERE pressing_id = (SELECT pressing_id FROM users WHERE id = auth.uid() LIMIT 1)
    )
  );

-- ── Fonction atomique de numérotation ────────────────────────────────────
-- Incrémente la séquence de façon atomique et retourne le numéro formaté.
-- Exemple : next_billing_number(pid, 'FAC', '202501') → 'FAC-202501-0001'
CREATE OR REPLACE FUNCTION next_billing_number(
  p_pressing_id UUID,
  p_doc_type    TEXT,
  p_year_month  TEXT    -- format 'YYYYMM'
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_seq INTEGER;
BEGIN
  INSERT INTO document_number_sequences (pressing_id, doc_type, year_month, last_seq)
  VALUES (p_pressing_id, p_doc_type, p_year_month, 1)
  ON CONFLICT (pressing_id, doc_type, year_month)
  DO UPDATE SET last_seq = document_number_sequences.last_seq + 1
  RETURNING last_seq INTO v_seq;

  RETURN p_doc_type || '-' || p_year_month || '-' || LPAD(v_seq::TEXT, 4, '0');
END;
$$;
