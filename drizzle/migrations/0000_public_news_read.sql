DROP POLICY IF EXISTS "Published news viewable by everyone" ON public.news;
CREATE POLICY "Published news public" ON public.news FOR SELECT TO anon, authenticated USING (is_published = true);
CREATE POLICY "Mods view all news" ON public.news FOR SELECT TO authenticated USING (has_role(auth.uid(),'moderator') OR has_role(auth.uid(),'admin'));
GRANT SELECT ON public.news TO anon;