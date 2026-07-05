DROP POLICY IF EXISTS "Moderators can view all reports" ON public.video_reports;
DROP POLICY IF EXISTS "Moderators can update reports" ON public.video_reports;
DROP POLICY IF EXISTS "Moderators can delete reports" ON public.video_reports;

CREATE POLICY "Default mods can view all reports"
ON public.video_reports
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'default_mod'::public.app_role));

CREATE POLICY "Default mods can update reports"
ON public.video_reports
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'default_mod'::public.app_role));

CREATE POLICY "Default mods can delete reports"
ON public.video_reports
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'default_mod'::public.app_role));

DROP POLICY IF EXISTS "Moderators can view all bans" ON public.banned_users;
DROP POLICY IF EXISTS "Moderators can ban users" ON public.banned_users;
DROP POLICY IF EXISTS "Moderators can unban users" ON public.banned_users;

CREATE POLICY "Default mods can view all bans"
ON public.banned_users
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'default_mod'::public.app_role));

CREATE POLICY "Default mods can ban users"
ON public.banned_users
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'default_mod'::public.app_role));

CREATE POLICY "Default mods can unban users"
ON public.banned_users
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'default_mod'::public.app_role));

DROP POLICY IF EXISTS "Moderators can delete any video" ON public.videos;

CREATE POLICY "Default mods can delete any video"
ON public.videos
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'default_mod'::public.app_role));