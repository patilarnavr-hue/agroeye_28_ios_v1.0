
-- Disease detection history table
CREATE TABLE public.pest_detections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  crop_id UUID REFERENCES public.crops(id) ON DELETE SET NULL,
  image_url TEXT,
  is_plant BOOLEAN DEFAULT true,
  disease_name TEXT NOT NULL,
  confidence TEXT,
  severity TEXT,
  description TEXT,
  treatment TEXT[],
  prevention TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pest_detections ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own pest detections"
  ON public.pest_detections FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own pest detections"
  ON public.pest_detections FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own pest detections"
  ON public.pest_detections FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
