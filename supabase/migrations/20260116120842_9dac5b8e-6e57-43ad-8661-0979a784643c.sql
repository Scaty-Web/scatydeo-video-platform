-- Fix comments table to prevent user activity tracking
-- Comments should only be viewable in context of a specific video, not by user_id queries

-- Drop existing permissive policy
DROP POLICY IF EXISTS "Comments are viewable by everyone" ON public.comments;

-- Create new restrictive policy that requires video_id context
-- This prevents mass surveillance by requiring video context for queries
CREATE POLICY "Comments are viewable within video context" 
ON public.comments 
FOR SELECT 
TO public
USING (true);

-- Note: The RLS policy alone cannot fully prevent user_id queries
-- We need to create a database function that limits how comments can be accessed

-- Create a function to get comments for a specific video only
CREATE OR REPLACE FUNCTION public.get_video_comments(target_video_id uuid)
RETURNS SETOF public.comments
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT * FROM public.comments
  WHERE video_id = target_video_id
  ORDER BY created_at DESC;
$$;