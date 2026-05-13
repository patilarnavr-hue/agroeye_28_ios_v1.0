
ALTER TABLE public.sensors ADD COLUMN IF NOT EXISTS latitude NUMERIC;
ALTER TABLE public.sensors ADD COLUMN IF NOT EXISTS longitude NUMERIC;
ALTER TABLE public.sensors ADD COLUMN IF NOT EXISTS sensor_type TEXT DEFAULT 'moisture';
