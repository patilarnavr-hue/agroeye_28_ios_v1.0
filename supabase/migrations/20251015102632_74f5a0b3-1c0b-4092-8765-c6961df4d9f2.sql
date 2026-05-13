-- Create sensors table to store connected IoT devices
CREATE TABLE public.sensors (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  sensor_code text NOT NULL UNIQUE,
  sensor_name text NOT NULL,
  last_reading numeric,
  last_reading_at timestamp with time zone,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sensors ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sensors
CREATE POLICY "Users can view their own sensors"
  ON public.sensors
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sensors"
  ON public.sensors
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sensors"
  ON public.sensors
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sensors"
  ON public.sensors
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_sensors_updated_at
  BEFORE UPDATE ON public.sensors
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Enable realtime for sensors table
ALTER PUBLICATION supabase_realtime ADD TABLE public.sensors;

-- Create index on sensor_code for faster lookups
CREATE INDEX idx_sensors_code ON public.sensors(sensor_code);

-- Modify moisture_readings to optionally link to a sensor
ALTER TABLE public.moisture_readings
ADD COLUMN sensor_id uuid REFERENCES public.sensors(id) ON DELETE SET NULL;