-- MODULE C: Facturation & Gestion B2B

-- payment_terms on orders: 'immediate' | 'net15' | 'net30' | 'net45' | 'net60'
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS payment_terms TEXT DEFAULT 'immediate';

-- credit_limit on clients (max outstanding balance allowed for business clients)
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS credit_limit DECIMAL(10,2);
