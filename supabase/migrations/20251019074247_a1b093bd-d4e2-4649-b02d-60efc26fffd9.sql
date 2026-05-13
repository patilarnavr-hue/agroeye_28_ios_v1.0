-- Create crops table for multi-crop management
CREATE TABLE public.crops (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  crop_type TEXT NOT NULL,
  location TEXT,
  planting_date DATE,
  expected_harvest_date DATE,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.crops ENABLE ROW LEVEL SECURITY;

-- Create policies for crops
CREATE POLICY "Users can view their own crops" 
ON public.crops 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own crops" 
ON public.crops 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own crops" 
ON public.crops 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own crops" 
ON public.crops 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create health scores table
CREATE TABLE public.health_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  crop_id UUID REFERENCES public.crops(id) ON DELETE CASCADE,
  overall_score NUMERIC NOT NULL,
  moisture_score NUMERIC NOT NULL,
  fertility_score NUMERIC NOT NULL,
  weather_score NUMERIC,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.health_scores ENABLE ROW LEVEL SECURITY;

-- Create policies for health scores
CREATE POLICY "Users can view their own health scores" 
ON public.health_scores 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own health scores" 
ON public.health_scores 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create alerts table
CREATE TABLE public.alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  crop_id UUID REFERENCES public.crops(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- Create policies for alerts
CREATE POLICY "Users can view their own alerts" 
ON public.alerts 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own alerts" 
ON public.alerts 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own alerts" 
ON public.alerts 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own alerts" 
ON public.alerts 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create weather data cache table
CREATE TABLE public.weather_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  location TEXT NOT NULL,
  temperature NUMERIC,
  humidity NUMERIC,
  weather_condition TEXT,
  precipitation NUMERIC,
  wind_speed NUMERIC,
  forecast_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.weather_data ENABLE ROW LEVEL SECURITY;

-- Create policies for weather data
CREATE POLICY "Users can view their own weather data" 
ON public.weather_data 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own weather data" 
ON public.weather_data 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Add crop_id to existing tables for multi-crop support
ALTER TABLE public.moisture_readings ADD COLUMN crop_id UUID REFERENCES public.crops(id) ON DELETE SET NULL;
ALTER TABLE public.fertility_readings ADD COLUMN crop_id UUID REFERENCES public.crops(id) ON DELETE SET NULL;

-- Add trigger for crops updated_at
CREATE TRIGGER update_crops_updated_at
BEFORE UPDATE ON public.crops
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();