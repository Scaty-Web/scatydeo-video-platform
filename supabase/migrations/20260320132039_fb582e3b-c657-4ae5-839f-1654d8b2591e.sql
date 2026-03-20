
-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Live streams viewable by everyone" ON public.streams;

-- Create two separate policies:
-- 1. Public viewers can see live streams but NOT stream_key/rtmp_url (handled via view)
-- 2. Owners can see all their own streams
CREATE POLICY "Owners can view own streams"
ON public.streams
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Create a security barrier view that hides sensitive columns
CREATE OR REPLACE VIEW public.streams_public
WITH (security_barrier = true)
AS
  SELECT id, user_id, title, description, thumbnail_url,
         playback_url, is_live, chat_enabled, viewer_count,
         started_at, ended_at, created_at, updated_at
  FROM public.streams
  WHERE is_live = true;

-- Grant access to the public view
GRANT SELECT ON public.streams_public TO anon, authenticated;
