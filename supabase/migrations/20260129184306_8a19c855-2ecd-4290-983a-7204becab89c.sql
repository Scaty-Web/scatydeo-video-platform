-- Drop the current permissive policy
DROP POLICY IF EXISTS "Likes are viewable by everyone" ON public.video_likes;

-- Create a more restrictive policy that only allows:
-- 1. Users to see their own likes
-- 2. Video owners to see likes on their videos
CREATE POLICY "Users can view own likes or likes on own videos"
ON public.video_likes
FOR SELECT
USING (
  auth.uid() = user_id OR 
  auth.uid() IN (SELECT user_id FROM public.videos WHERE id = video_id)
);

-- Create a security definer function to get like count for a video
-- This allows displaying like counts without exposing individual user data
CREATE OR REPLACE FUNCTION public.get_video_like_count(target_video_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer FROM public.video_likes WHERE video_id = target_video_id;
$$;

-- Create a function to check if current user liked a video
CREATE OR REPLACE FUNCTION public.has_user_liked_video(target_video_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.video_likes 
    WHERE video_id = target_video_id AND user_id = auth.uid()
  );
$$;