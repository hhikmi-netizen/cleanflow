-- Migration 015: Tournée map fields
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS stop_order   INTEGER,
  ADD COLUMN IF NOT EXISTS access_notes TEXT;
