-- Allow everyone (including anonymous) to read live streams via streams_public view
-- Sensitive fields (stream_key, rtmp_url) are excluded by the view definition
CREATE POLICY "Anyone can view live streams"
ON public.streams
FOR SELECT
TO anon, authenticated
USING (is_live = true);