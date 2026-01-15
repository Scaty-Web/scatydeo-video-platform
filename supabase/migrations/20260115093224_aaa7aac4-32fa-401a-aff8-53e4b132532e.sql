-- Fix videos SELECT policy to be PERMISSIVE so anonymous users can see public videos
DROP POLICY IF EXISTS "Public videos are viewable by everyone" ON public.videos;

CREATE POLICY "Public videos are viewable by everyone" 
ON public.videos 
FOR SELECT 
TO public
USING ((is_public = true) OR (auth.uid() = user_id));

-- Fix profiles SELECT policy to be PERMISSIVE
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

CREATE POLICY "Profiles are viewable by everyone" 
ON public.profiles 
FOR SELECT 
TO public
USING (true);

-- Fix video_likes SELECT policy to be PERMISSIVE
DROP POLICY IF EXISTS "Likes are viewable by everyone" ON public.video_likes;

CREATE POLICY "Likes are viewable by everyone" 
ON public.video_likes 
FOR SELECT 
TO public
USING (true);

-- Fix comments SELECT policy to be PERMISSIVE
DROP POLICY IF EXISTS "Comments are viewable by everyone" ON public.comments;

CREATE POLICY "Comments are viewable by everyone" 
ON public.comments 
FOR SELECT 
TO public
USING (true);