-- Migration 014: Google Maps geo columns
-- clients: structured address + coordinates
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS city          TEXT,
  ADD COLUMN IF NOT EXISTS district      TEXT,
  ADD COLUMN IF NOT EXISTS latitude      DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude     DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS google_place_id TEXT;

-- orders: coordinates for pickup and delivery addresses
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS pickup_latitude   DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS pickup_longitude  DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS delivery_latitude  DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS delivery_longitude DOUBLE PRECISION;
