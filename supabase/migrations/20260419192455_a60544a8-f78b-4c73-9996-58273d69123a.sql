-- Remove the overly permissive policy that exposed stream_key to everyone
DROP POLICY IF EXISTS "Anyone can view live streams" ON public.streams;

-- Grant SELECT on the safe view to anonymous and authenticated users
-- The streams_public view already excludes sensitive fields (stream_key, rtmp_url)
GRANT SELECT ON public.streams_public TO anon, authenticated;