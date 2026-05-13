-- AgroEye Complete Database Setup
-- Run this in your Supabase SQL Editor to set up all tables, RLS policies, and functions.

-- ============================================
-- FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ============================================
-- TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY,
  email text,
  full_name text,
  avatar_url text,
  bio text,
  location text,
  phone_number text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.crops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  crop_type text NOT NULL,
  location text,
  planting_date date,
  expected_harvest_date date,
  image_url text,
  notes text,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.moisture_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  crop_id uuid REFERENCES public.crops(id),
  sensor_id uuid,
  moisture_level numeric NOT NULL,
  status text,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fertility_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  crop_id uuid REFERENCES public.crops(id),
  nitrogen_level numeric,
  phosphorus_level numeric,
  potassium_level numeric,
  overall_fertility numeric,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.health_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  crop_id uuid REFERENCES public.crops(id),
  overall_score numeric NOT NULL,
  moisture_score numeric NOT NULL,
  fertility_score numeric NOT NULL,
  weather_score numeric,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.watering_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  title text NOT NULL,
  time_of_day time NOT NULL,
  days_of_week text[] NOT NULL,
  is_enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.weather_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  location text NOT NULL,
  temperature numeric,
  humidity numeric,
  precipitation numeric,
  wind_speed numeric,
  weather_condition text,
  forecast_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  crop_id uuid REFERENCES public.crops(id),
  title text NOT NULL,
  message text NOT NULL,
  severity text NOT NULL,
  alert_type text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sensors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  sensor_name text NOT NULL,
  sensor_code text NOT NULL,
  sensor_type text DEFAULT 'moisture',
  protocol text DEFAULT 'wifi',
  gateway_id text,
  mqtt_topic text,
  latitude numeric,
  longitude numeric,
  is_active boolean DEFAULT true,
  last_reading numeric,
  last_reading_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add foreign key for moisture_readings -> sensors
ALTER TABLE public.moisture_readings
  ADD CONSTRAINT moisture_readings_sensor_id_fkey
  FOREIGN KEY (sensor_id) REFERENCES public.sensors(id);

CREATE TABLE IF NOT EXISTS public.farmland_plots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  coordinates jsonb NOT NULL,
  area_sqm numeric,
  color text DEFAULT '#2D5A27',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.map_markers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plot_id uuid REFERENCES public.farmland_plots(id),
  label text NOT NULL,
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  marker_type text NOT NULL DEFAULT 'sensor',
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.farmer_xp (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  total_xp integer NOT NULL DEFAULT 0,
  level integer NOT NULL DEFAULT 1,
  streak_days integer NOT NULL DEFAULT 0,
  last_activity_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  achievement_key text NOT NULL,
  achievement_name text NOT NULL,
  description text,
  icon text,
  xp_reward integer NOT NULL DEFAULT 10,
  earned_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  theme text DEFAULT 'system',
  notifications_enabled boolean DEFAULT true,
  notification_moisture boolean DEFAULT true,
  notification_schedule boolean DEFAULT true,
  notification_alerts boolean DEFAULT true,
  onboarding_completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.irrigation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  crop_id uuid REFERENCES public.crops(id),
  sensor_id uuid REFERENCES public.sensors(id),
  duration_minutes numeric NOT NULL,
  trigger_type text NOT NULL DEFAULT 'manual',
  status text NOT NULL DEFAULT 'completed',
  moisture_before numeric,
  moisture_after numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.storage_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  crop_type text NOT NULL,
  harvest_date date NOT NULL,
  quantity_kg numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  suitability_score numeric,
  suitability_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================
-- TRIGGERS
-- ============================================

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moisture_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fertility_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watering_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weather_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sensors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farmland_plots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.map_markers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farmer_xp ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.irrigation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storage_requests ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================

-- profiles
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can create their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- crops
CREATE POLICY "Users can view their own crops" ON public.crops FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own crops" ON public.crops FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own crops" ON public.crops FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own crops" ON public.crops FOR DELETE USING (auth.uid() = user_id);

-- moisture_readings
CREATE POLICY "Users can view their own moisture readings" ON public.moisture_readings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own moisture readings" ON public.moisture_readings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own moisture readings" ON public.moisture_readings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own moisture readings" ON public.moisture_readings FOR DELETE USING (auth.uid() = user_id);

-- fertility_readings
CREATE POLICY "Users can view their own fertility readings" ON public.fertility_readings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own fertility readings" ON public.fertility_readings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own fertility readings" ON public.fertility_readings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own fertility readings" ON public.fertility_readings FOR DELETE USING (auth.uid() = user_id);

-- health_scores
CREATE POLICY "Users can view their own health scores" ON public.health_scores FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own health scores" ON public.health_scores FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own health scores" ON public.health_scores FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own health scores" ON public.health_scores FOR DELETE USING (auth.uid() = user_id);

-- watering_schedules
CREATE POLICY "Users can view their own schedules" ON public.watering_schedules FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own schedules" ON public.watering_schedules FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own schedules" ON public.watering_schedules FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own schedules" ON public.watering_schedules FOR DELETE USING (auth.uid() = user_id);

-- weather_data
CREATE POLICY "Users can view their own weather data" ON public.weather_data FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own weather data" ON public.weather_data FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own weather data" ON public.weather_data FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own weather data" ON public.weather_data FOR DELETE USING (auth.uid() = user_id);

-- alerts
CREATE POLICY "Users can view their own alerts" ON public.alerts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own alerts" ON public.alerts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own alerts" ON public.alerts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own alerts" ON public.alerts FOR DELETE USING (auth.uid() = user_id);

-- sensors
CREATE POLICY "Users can view their own sensors" ON public.sensors FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own sensors" ON public.sensors FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own sensors" ON public.sensors FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own sensors" ON public.sensors FOR DELETE USING (auth.uid() = user_id);

-- farmland_plots
CREATE POLICY "Users can view their own plots" ON public.farmland_plots FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own plots" ON public.farmland_plots FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own plots" ON public.farmland_plots FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own plots" ON public.farmland_plots FOR DELETE USING (auth.uid() = user_id);

-- map_markers
CREATE POLICY "Users can view their own markers" ON public.map_markers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own markers" ON public.map_markers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own markers" ON public.map_markers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own markers" ON public.map_markers FOR DELETE USING (auth.uid() = user_id);

-- farmer_xp
CREATE POLICY "Anyone authenticated can view leaderboard" ON public.farmer_xp FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can create their own XP" ON public.farmer_xp FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own XP" ON public.farmer_xp FOR UPDATE USING (auth.uid() = user_id);

-- achievements
CREATE POLICY "Anyone authenticated can view achievements" ON public.achievements FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can create their own achievements" ON public.achievements FOR INSERT WITH CHECK (auth.uid() = user_id);

-- user_preferences
CREATE POLICY "Users can view their own preferences" ON public.user_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own preferences" ON public.user_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own preferences" ON public.user_preferences FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own preferences" ON public.user_preferences FOR DELETE USING (auth.uid() = user_id);

-- irrigation_events
CREATE POLICY "Users can view own irrigation events" ON public.irrigation_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own irrigation events" ON public.irrigation_events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own irrigation events" ON public.irrigation_events FOR DELETE USING (auth.uid() = user_id);

-- storage_requests
CREATE POLICY "Users can view own storage requests" ON public.storage_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own storage requests" ON public.storage_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own storage requests" ON public.storage_requests FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own storage requests" ON public.storage_requests FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- STORAGE BUCKETS
-- ============================================
-- Create these manually in Supabase Dashboard → Storage:
-- 1. Bucket: "avatars" (Public)
-- 2. Bucket: "crop_images" (Public)
