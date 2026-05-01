-- Sprint 7: invoice numbers (FACT-YYYYMM-NNNNN) auto-generated on order INSERT

ALTER TABLE orders ADD COLUMN IF NOT EXISTS invoice_number TEXT;

-- Unique per pressing
CREATE UNIQUE INDEX IF NOT EXISTS orders_invoice_number_idx
  ON orders (pressing_id, invoice_number)
  WHERE invoice_number IS NOT NULL;

CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
DECLARE
  ym       TEXT;
  next_num INT;
BEGIN
  ym := to_char(NOW(), 'YYYYMM');
  SELECT COUNT(*) + 1 INTO next_num
  FROM orders
  WHERE pressing_id = NEW.pressing_id
    AND invoice_number LIKE 'FACT-' || ym || '-%';
  NEW.invoice_number := 'FACT-' || ym || '-' || LPAD(next_num::TEXT, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_invoice_number ON orders;
CREATE TRIGGER trg_invoice_number
  BEFORE INSERT ON orders
  FOR EACH ROW EXECUTE FUNCTION generate_invoice_number();

-- Back-fill existing orders that have no invoice_number yet
DO $$
DECLARE
  r RECORD;
  ym TEXT;
  n INT;
BEGIN
  FOR r IN
    SELECT id, pressing_id, created_at
    FROM orders
    WHERE invoice_number IS NULL
    ORDER BY pressing_id, created_at
  LOOP
    ym := to_char(r.created_at, 'YYYYMM');
    SELECT COUNT(*) + 1 INTO n
    FROM orders
    WHERE pressing_id = r.pressing_id
      AND invoice_number LIKE 'FACT-' || ym || '-%';
    UPDATE orders
    SET invoice_number = 'FACT-' || ym || '-' || LPAD(n::TEXT, 5, '0')
    WHERE id = r.id;
  END LOOP;
END;
$$;
