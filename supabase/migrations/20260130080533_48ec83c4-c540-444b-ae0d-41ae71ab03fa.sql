-- Drop the existing permissive policy
DROP POLICY IF EXISTS "Comments are viewable within video context" ON public.comments;

-- Create a security definer function to check video access
CREATE OR REPLACE FUNCTION public.can_view_video_comments(target_video_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.videos 
    WHERE id = target_video_id 
    AND (is_public = true OR user_id = auth.uid())
  );
$$;

-- Create new policy: Comments viewable only for accessible videos
-- This prevents scraping all user_ids across all comments
CREATE POLICY "Comments viewable for accessible videos"
ON public.comments
FOR SELECT
USING (
  public.can_view_video_comments(video_id)
);