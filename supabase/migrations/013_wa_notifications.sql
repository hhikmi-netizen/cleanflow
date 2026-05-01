-- MODULE H: Per-event WhatsApp notification toggles

ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS wa_notif_created   BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS wa_notif_delivery  BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS wa_notif_delivered BOOLEAN DEFAULT TRUE;
