-- Add pricing rule tracking columns to order_items
ALTER TABLE public.order_items
ADD COLUMN IF NOT EXISTS "appliedRule" text,
ADD COLUMN IF NOT EXISTS "appliedRuleType" text;

NOTIFY pgrst, 'reload schema';
