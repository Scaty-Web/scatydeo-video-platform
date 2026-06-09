
-- Helper: check whether the calling (authenticated) user is banned
CREATE OR REPLACE FUNCTION public.is_calling_user_banned()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.banned_users WHERE user_id = auth.uid());
$$;

REVOKE EXECUTE ON FUNCTION public.is_calling_user_banned() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_calling_user_banned() TO authenticated;

-- Tighten is_user_banned: self or moderators/admins only
CREATE OR REPLACE FUNCTION public.is_user_banned(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.banned_users b
    WHERE b.user_id = _user_id
      AND (
        _user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = auth.uid()
            AND ur.role IN ('admin','moderator','default_mod','duo_mod')
        )
      )
  );
$$;
REVOKE EXECUTE ON FUNCTION public.is_user_banned(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_user_banned(uuid) TO authenticated;

-- Tighten get_ban_info: only the banned user themself
CREATE OR REPLACE FUNCTION public.get_ban_info(_user_id uuid)
RETURNS TABLE(reason text, banned_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT reason, created_at FROM public.banned_users
  WHERE user_id = _user_id AND _user_id = auth.uid();
$$;
REVOKE EXECUTE ON FUNCTION public.get_ban_info(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_ban_info(uuid) TO authenticated;

-- Tighten has_role: self lookup, or moderators/admins can look up others
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
      AND (
        _user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.user_roles ur2
          WHERE ur2.user_id = auth.uid()
            AND ur2.role IN ('admin','moderator','default_mod','duo_mod')
        )
      )
  );
$$;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;

-- Tighten get_ban_banner: caller's own record only
CREATE OR REPLACE FUNCTION public.get_ban_banner(_user_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT banned_by FROM public.banned_users
  WHERE user_id = _user_id AND _user_id = auth.uid() LIMIT 1;
$$;
REVOKE EXECUTE ON FUNCTION public.get_ban_banner(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_ban_banner(uuid) TO authenticated;

-- Revoke anon access from moderator-enumeration helpers
REVOKE EXECUTE ON FUNCTION public.get_report_recipient() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_default_mod_recipient() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_report_recipient() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_default_mod_recipient() TO authenticated;

-- Revoke anon access from email lookup
REVOKE EXECUTE ON FUNCTION public.get_profile_by_email(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_profile_by_email(text) TO authenticated;

-- Enforce ban at the DB layer for write policies
DROP POLICY IF EXISTS "Authenticated users can insert comments" ON public.comments;
CREATE POLICY "Non-banned users can insert comments"
ON public.comments FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND NOT public.is_calling_user_banned());

DROP POLICY IF EXISTS "Authenticated users can insert likes" ON public.video_likes;
CREATE POLICY "Non-banned users can insert likes"
ON public.video_likes FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND NOT public.is_calling_user_banned());

DROP POLICY IF EXISTS "Authenticated users can subscribe" ON public.subscriptions;
CREATE POLICY "Non-banned users can subscribe"
ON public.subscriptions FOR INSERT TO authenticated
WITH CHECK (auth.uid() = subscriber_id AND NOT public.is_calling_user_banned());

DROP POLICY IF EXISTS "Users can insert own videos" ON public.videos;
CREATE POLICY "Non-banned users can insert videos"
ON public.videos FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND NOT public.is_calling_user_banned());

-- Best-effort: apply to switches & stream chat if those tables exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='switches') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert own switches" ON public.switches';
    EXECUTE 'DROP POLICY IF EXISTS "Authenticated users can insert switches" ON public.switches';
    EXECUTE $p$CREATE POLICY "Non-banned users can insert switches" ON public.switches FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND NOT public.is_calling_user_banned())$p$;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='switch_comments') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Authenticated users can insert switch comments" ON public.switch_comments';
    EXECUTE $p$CREATE POLICY "Non-banned users can insert switch comments" ON public.switch_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND NOT public.is_calling_user_banned())$p$;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='switch_likes') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Authenticated users can insert switch likes" ON public.switch_likes';
    EXECUTE $p$CREATE POLICY "Non-banned users can insert switch likes" ON public.switch_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND NOT public.is_calling_user_banned())$p$;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='stream_chat_messages') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Authenticated users can post messages" ON public.stream_chat_messages';
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert chat messages" ON public.stream_chat_messages';
    EXECUTE $p$CREATE POLICY "Non-banned users can post chat messages" ON public.stream_chat_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND NOT public.is_calling_user_banned())$p$;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='news_comments') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Authenticated users can insert news comments" ON public.news_comments';
    EXECUTE $p$CREATE POLICY "Non-banned users can insert news comments" ON public.news_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND NOT public.is_calling_user_banned())$p$;
  END IF;
END $$;
