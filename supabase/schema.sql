-- CleanFlow - Schema SQL Supabase
-- Exécuter dans l'ordre dans Supabase SQL Editor

-- ============================================================
-- TABLE: pressings (entité business)
-- ============================================================
CREATE TABLE IF NOT EXISTS pressings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  address TEXT,
  ice TEXT,
  logo_url TEXT,
  currency TEXT DEFAULT 'DH',
  tax_rate DECIMAL(5,2) DEFAULT 0.00,
  business_hours JSONB DEFAULT '{"mon":"09:00-19:00","tue":"09:00-19:00","wed":"09:00-19:00","thu":"09:00-19:00","fri":"09:00-19:00","sat":"09:00-13:00","sun":"closed"}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE pressings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their pressing"
  ON pressings FOR SELECT
  USING (id IN (SELECT pressing_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Admins can update their pressing"
  ON pressings FOR UPDATE
  USING (id IN (SELECT pressing_id FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Allow insert during signup"
  ON pressings FOR INSERT
  WITH CHECK (true);

-- ============================================================
-- TABLE: users (extends auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  pressing_id UUID REFERENCES pressings(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('admin', 'employee')) DEFAULT 'employee',
  full_name TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own data"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all users in their pressing"
  ON users FOR SELECT
  USING (pressing_id IN (SELECT pressing_id FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Allow insert during signup"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own data"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- ============================================================
-- TABLE: clients
-- ============================================================
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pressing_id UUID REFERENCES pressings(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  address TEXT,
  client_type TEXT CHECK (client_type IN ('individual', 'business')) DEFAULT 'individual',
  ice TEXT,
  notes TEXT,
  total_orders INTEGER DEFAULT 0,
  total_spent DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(pressing_id, phone)
);

CREATE INDEX IF NOT EXISTS idx_clients_pressing ON clients(pressing_id);
CREATE INDEX IF NOT EXISTS idx_clients_phone ON clients(phone);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view clients in their pressing"
  ON clients FOR SELECT
  USING (pressing_id IN (SELECT pressing_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can insert clients in their pressing"
  ON clients FOR INSERT
  WITH CHECK (pressing_id IN (SELECT pressing_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can update clients in their pressing"
  ON clients FOR UPDATE
  USING (pressing_id IN (SELECT pressing_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can delete clients in their pressing"
  ON clients FOR DELETE
  USING (pressing_id IN (SELECT pressing_id FROM users WHERE id = auth.uid()));

-- ============================================================
-- TABLE: services (catalogue)
-- ============================================================
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pressing_id UUID REFERENCES pressings(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Vêtements',
  price_individual DECIMAL(8,2) NOT NULL,
  price_business DECIMAL(8,2) NOT NULL,
  unit TEXT DEFAULT 'pièce',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_services_pressing ON services(pressing_id);

ALTER TABLE services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view services in their pressing"
  ON services FOR SELECT
  USING (pressing_id IN (SELECT pressing_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Admins can manage services"
  ON services FOR ALL
  USING (pressing_id IN (SELECT pressing_id FROM users WHERE id = auth.uid() AND role = 'admin'));

-- ============================================================
-- SEQUENCE + TABLE: orders
-- ============================================================
CREATE SEQUENCE IF NOT EXISTS order_number_seq;

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pressing_id UUID REFERENCES pressings(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  order_number TEXT NOT NULL UNIQUE,
  status TEXT CHECK (status IN ('pending', 'in_progress', 'ready', 'delivered', 'cancelled')) DEFAULT 'pending',
  subtotal DECIMAL(10,2) NOT NULL,
  tax DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  payment_method TEXT CHECK (payment_method IN ('cash', 'card', 'transfer')) DEFAULT 'cash',
  paid BOOLEAN DEFAULT false,
  deposit DECIMAL(10,2) DEFAULT 0,
  pickup_date DATE,
  delivered_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.order_number := 'CMD-' || TO_CHAR(NOW(), 'YYMM') || '-' || LPAD(nextval('order_number_seq')::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_order_number
  BEFORE INSERT ON orders
  FOR EACH ROW
  WHEN (NEW.order_number IS NULL OR NEW.order_number = '')
  EXECUTE FUNCTION generate_order_number();

CREATE INDEX IF NOT EXISTS idx_orders_pressing ON orders(pressing_id);
CREATE INDEX IF NOT EXISTS idx_orders_client ON orders(client_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view orders in their pressing"
  ON orders FOR SELECT
  USING (pressing_id IN (SELECT pressing_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can create orders in their pressing"
  ON orders FOR INSERT
  WITH CHECK (pressing_id IN (SELECT pressing_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can update orders in their pressing"
  ON orders FOR UPDATE
  USING (pressing_id IN (SELECT pressing_id FROM users WHERE id = auth.uid()));

-- ============================================================
-- TABLE: order_items
-- ============================================================
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  service_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(8,2) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view order items via orders"
  ON order_items FOR SELECT
  USING (order_id IN (
    SELECT id FROM orders WHERE pressing_id IN (
      SELECT pressing_id FROM users WHERE id = auth.uid()
    )
  ));

CREATE POLICY "Users can insert order items"
  ON order_items FOR INSERT
  WITH CHECK (order_id IN (
    SELECT id FROM orders WHERE pressing_id IN (
      SELECT pressing_id FROM users WHERE id = auth.uid()
    )
  ));

-- ============================================================
-- TABLE: settings
-- ============================================================
CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pressing_id UUID REFERENCES pressings(id) ON DELETE CASCADE NOT NULL UNIQUE,
  whatsapp_enabled BOOLEAN DEFAULT false,
  whatsapp_phone TEXT,
  auto_notify_ready BOOLEAN DEFAULT true,
  invoice_footer TEXT DEFAULT 'Merci de votre confiance !',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view settings in their pressing"
  ON settings FOR SELECT
  USING (pressing_id IN (SELECT pressing_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Admins can update settings"
  ON settings FOR UPDATE
  USING (pressing_id IN (SELECT pressing_id FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Allow insert settings during signup"
  ON settings FOR INSERT
  WITH CHECK (true);

-- ============================================================
-- FUNCTION: update updated_at automatiquement
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_pressings_updated_at BEFORE UPDATE ON pressings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON services FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- FUNCTION: mettre à jour les stats client après commande
-- ============================================================
CREATE OR REPLACE FUNCTION update_client_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.client_id IS NOT NULL THEN
    UPDATE clients SET
      total_orders = total_orders + 1,
      total_spent = total_spent + NEW.total
    WHERE id = NEW.client_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.status != 'delivered' AND NEW.status = 'delivered' THEN
    -- Rien de plus à faire, déjà compté à l'insertion
    NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_client_stats_on_order
  AFTER INSERT ON orders
  FOR EACH ROW EXECUTE FUNCTION update_client_stats();
