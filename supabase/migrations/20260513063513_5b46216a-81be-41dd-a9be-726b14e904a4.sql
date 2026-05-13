
-- 1. Restrict achievements SELECT to owner
DROP POLICY IF EXISTS "Anyone authenticated can view achievements" ON public.achievements;
CREATE POLICY "Users can view their own achievements"
  ON public.achievements FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 2. Restrict farmer_xp SELECT to owner
DROP POLICY IF EXISTS "Anyone authenticated can view leaderboard" ON public.farmer_xp;
CREATE POLICY "Users can view their own XP"
  ON public.farmer_xp FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 3. Provide safe leaderboard via SECURITY DEFINER function (only non-sensitive aggregated fields)
CREATE OR REPLACE FUNCTION public.get_leaderboard(_limit integer DEFAULT 50)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  total_xp integer,
  level integer,
  streak_days integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    fx.user_id,
    COALESCE(p.full_name, 'Anonymous Farmer') AS display_name,
    fx.total_xp,
    fx.level,
    fx.streak_days
  FROM public.farmer_xp fx
  LEFT JOIN public.profiles p ON p.id = fx.user_id
  ORDER BY fx.total_xp DESC
  LIMIT GREATEST(1, LEAST(_limit, 100));
$$;

REVOKE ALL ON FUNCTION public.get_leaderboard(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_leaderboard(integer) TO authenticated;

-- 4. Harden internal trigger functions: pin search_path and revoke API access
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.handle_updated_at() SET search_path = public;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_updated_at() FROM PUBLIC, anon, authenticated;

-- 5. Prevent public listing of storage buckets (files remain accessible via public URL)
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Crop images are publicly accessible" ON storage.objects;
