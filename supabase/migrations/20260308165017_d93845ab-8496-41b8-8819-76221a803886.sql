
ALTER TABLE public.sensors ADD COLUMN IF NOT EXISTS protocol text DEFAULT 'wifi';
ALTER TABLE public.sensors ADD COLUMN IF NOT EXISTS gateway_id text;
ALTER TABLE public.sensors ADD COLUMN IF NOT EXISTS mqtt_topic text;
