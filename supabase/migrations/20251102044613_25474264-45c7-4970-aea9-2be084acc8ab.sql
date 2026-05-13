-- Add image_url column to crops table for photo uploads
ALTER TABLE public.crops 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add notification preferences to user_preferences
ALTER TABLE public.user_preferences 
ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notification_moisture BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notification_schedule BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notification_alerts BOOLEAN DEFAULT true;

-- Create storage bucket for crop images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('crop_images', 'crop_images', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for crop_images bucket
CREATE POLICY "Crop images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'crop_images');

CREATE POLICY "Users can upload their own crop images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'crop_images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own crop images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'crop_images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own crop images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'crop_images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);