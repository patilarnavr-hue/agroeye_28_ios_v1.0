-- Create user profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create moisture readings table
CREATE TABLE public.moisture_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  moisture_level NUMERIC(5,2) NOT NULL CHECK (moisture_level >= 0 AND moisture_level <= 100),
  status TEXT CHECK (status IN ('low', 'optimal', 'high')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create fertility readings table
CREATE TABLE public.fertility_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  nitrogen_level NUMERIC(5,2) CHECK (nitrogen_level >= 0 AND nitrogen_level <= 100),
  phosphorus_level NUMERIC(5,2) CHECK (phosphorus_level >= 0 AND phosphorus_level <= 100),
  potassium_level NUMERIC(5,2) CHECK (potassium_level >= 0 AND potassium_level <= 100),
  overall_fertility NUMERIC(5,2) CHECK (overall_fertility >= 0 AND overall_fertility <= 100),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create watering schedules table
CREATE TABLE public.watering_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  days_of_week TEXT[] NOT NULL CHECK (array_length(days_of_week, 1) > 0),
  time_of_day TIME NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moisture_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fertility_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watering_schedules ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Moisture readings policies
CREATE POLICY "Users can view their own moisture readings"
  ON public.moisture_readings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own moisture readings"
  ON public.moisture_readings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own moisture readings"
  ON public.moisture_readings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own moisture readings"
  ON public.moisture_readings FOR DELETE
  USING (auth.uid() = user_id);

-- Fertility readings policies
CREATE POLICY "Users can view their own fertility readings"
  ON public.fertility_readings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own fertility readings"
  ON public.fertility_readings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own fertility readings"
  ON public.fertility_readings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own fertility readings"
  ON public.fertility_readings FOR DELETE
  USING (auth.uid() = user_id);

-- Watering schedules policies
CREATE POLICY "Users can view their own schedules"
  ON public.watering_schedules FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own schedules"
  ON public.watering_schedules FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own schedules"
  ON public.watering_schedules FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own schedules"
  ON public.watering_schedules FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Create triggers for updated_at
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER schedules_updated_at
  BEFORE UPDATE ON public.watering_schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Enable realtime for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.moisture_readings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.fertility_readings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.watering_schedules;

-- Set replica identity for realtime updates
ALTER TABLE public.moisture_readings REPLICA IDENTITY FULL;
ALTER TABLE public.fertility_readings REPLICA IDENTITY FULL;
ALTER TABLE public.watering_schedules REPLICA IDENTITY FULL;