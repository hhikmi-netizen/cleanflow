-- Migration 009: Zone géographique + créneaux horaires sur price_rules
-- Run in Supabase SQL Editor

ALTER TABLE price_rules
  ADD COLUMN IF NOT EXISTS zone_name    TEXT,
  ADD COLUMN IF NOT EXISTS days_of_week SMALLINT[],   -- [1,2,3,4,5] = Lun-Ven (1=Lun, 7=Dim)
  ADD COLUMN IF NOT EXISTS time_from    TIME,          -- ex: '08:00'
  ADD COLUMN IF NOT EXISTS time_until   TIME;          -- ex: '18:00'

COMMENT ON COLUMN price_rules.zone_name    IS 'Zone géographique optionnelle (ex: Casablanca centre, Banlieue)';
COMMENT ON COLUMN price_rules.days_of_week IS 'Jours applicables : 1=Lun, 2=Mar, ..., 7=Dim. NULL = tous les jours';
COMMENT ON COLUMN price_rules.time_from    IS 'Heure de début du créneau (ex: 08:00). NULL = toute la journée';
COMMENT ON COLUMN price_rules.time_until   IS 'Heure de fin du créneau (ex: 18:00). NULL = toute la journée';
