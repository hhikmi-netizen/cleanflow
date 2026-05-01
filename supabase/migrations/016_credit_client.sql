-- Migration 016 : Crédit client & impayés
-- Permet les paiements partiels par commande et les versements globaux client

-- Allow order_id to be nullable on payments (global client payments)
ALTER TABLE payments ALTER COLUMN order_id DROP NOT NULL;

-- Add client_id to payments for client-level payments (no specific order)
ALTER TABLE payments ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE SET NULL;

-- Add due_date for payment terms tracking (aging 30/60/90j)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS due_date DATE;

-- Ensure credit_balance exists on clients (positive = client has credit to use)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS credit_balance NUMERIC(10,2) DEFAULT 0 NOT NULL;

-- Index for fast impayés queries
CREATE INDEX IF NOT EXISTS idx_orders_paid_status ON orders(pressing_id, paid, status)
  WHERE paid = false AND status != 'cancelled';

CREATE INDEX IF NOT EXISTS idx_payments_client_id ON payments(client_id)
  WHERE client_id IS NOT NULL;

-- Helper: compute outstanding per order view (used by /credit page)
-- No materialised view needed; queries compute it at runtime.
