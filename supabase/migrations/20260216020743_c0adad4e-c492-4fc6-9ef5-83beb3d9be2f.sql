
-- Fix security: Add missing RLS policies

-- Profiles: allow INSERT for new users
CREATE POLICY "Users can create their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- User preferences: allow DELETE
CREATE POLICY "Users can delete their own preferences"
ON public.user_preferences FOR DELETE
USING (auth.uid() = user_id);

-- Health scores: allow UPDATE and DELETE
CREATE POLICY "Users can update their own health scores"
ON public.health_scores FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own health scores"
ON public.health_scores FOR DELETE
USING (auth.uid() = user_id);

-- Weather data: allow UPDATE and DELETE
CREATE POLICY "Users can update their own weather data"
ON public.weather_data FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own weather data"
ON public.weather_data FOR DELETE
USING (auth.uid() = user_id);

-- ========== FARMLAND MAP TABLES ==========

CREATE TABLE public.farmland_plots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  coordinates JSONB NOT NULL, -- Array of [lat, lng] polygon points
  area_sqm NUMERIC, -- calculated area in square meters
  color TEXT DEFAULT '#2D5A27',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.farmland_plots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own plots" ON public.farmland_plots FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own plots" ON public.farmland_plots FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own plots" ON public.farmland_plots FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own plots" ON public.farmland_plots FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE public.map_markers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  plot_id UUID REFERENCES public.farmland_plots(id) ON DELETE CASCADE,
  marker_type TEXT NOT NULL DEFAULT 'sensor', -- sensor, crop, zone, custom
  label TEXT NOT NULL,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.map_markers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own markers" ON public.map_markers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own markers" ON public.map_markers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own markers" ON public.map_markers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own markers" ON public.map_markers FOR DELETE USING (auth.uid() = user_id);

-- ========== LEADERBOARD & ACHIEVEMENTS ==========

CREATE TABLE public.farmer_xp (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  total_xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  streak_days INTEGER NOT NULL DEFAULT 0,
  last_activity_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.farmer_xp ENABLE ROW LEVEL SECURITY;

-- Everyone can see leaderboard (SELECT), but only own data for write
CREATE POLICY "Anyone authenticated can view leaderboard" ON public.farmer_xp FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can create their own XP" ON public.farmer_xp FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own XP" ON public.farmer_xp FOR UPDATE USING (auth.uid() = user_id);

CREATE TABLE public.achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  achievement_key TEXT NOT NULL,
  achievement_name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  xp_reward INTEGER NOT NULL DEFAULT 10,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, achievement_key)
);

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view achievements" ON public.achievements FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can create their own achievements" ON public.achievements FOR INSERT WITH CHECK (auth.uid() = user_id);
