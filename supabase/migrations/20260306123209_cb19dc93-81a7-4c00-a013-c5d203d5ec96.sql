
CREATE TABLE public.storage_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  crop_type TEXT NOT NULL,
  quantity_kg NUMERIC NOT NULL,
  harvest_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  suitability_score NUMERIC,
  suitability_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.storage_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own storage requests" ON public.storage_requests FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create own storage requests" ON public.storage_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own storage requests" ON public.storage_requests FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own storage requests" ON public.storage_requests FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.irrigation_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  sensor_id UUID REFERENCES public.sensors(id),
  crop_id UUID REFERENCES public.crops(id),
  trigger_type TEXT NOT NULL DEFAULT 'manual',
  duration_minutes NUMERIC NOT NULL,
  moisture_before NUMERIC,
  moisture_after NUMERIC,
  status TEXT NOT NULL DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.irrigation_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own irrigation events" ON public.irrigation_events FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create own irrigation events" ON public.irrigation_events FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own irrigation events" ON public.irrigation_events FOR DELETE TO authenticated USING (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.irrigation_events;
