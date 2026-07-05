-- Restrict get_profile_by_email to authenticated only
REVOKE EXECUTE ON FUNCTION public.get_profile_by_email(text) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_profile_by_email(text) TO authenticated;

-- Restrict get_ban_banner strictly to caller
CREATE OR REPLACE FUNCTION public.get_ban_banner(_user_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT banned_by FROM public.banned_users
  WHERE user_id = _user_id AND _user_id = auth.uid()
  LIMIT 1;
$$;
REVOKE EXECUTE ON FUNCTION public.get_ban_banner(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_ban_banner(uuid) TO authenticated;

-- Restrict is_user_banned to caller only (or moderator viewing their targets)
CREATE OR REPLACE FUNCTION public.is_user_banned(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
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

-- Restrict get_ban_info to caller
CREATE OR REPLACE FUNCTION public.get_ban_info(_user_id uuid)
RETURNS TABLE(reason text, banned_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT reason, created_at FROM public.banned_users
  WHERE user_id = _user_id AND _user_id = auth.uid();
$$;
REVOKE EXECUTE ON FUNCTION public.get_ban_info(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_ban_info(uuid) TO authenticated;

-- Restrict has_role: allow caller for self, or mod/admin to inspect others
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
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

-- Restrict mod recipient RPCs to authenticated
REVOKE EXECUTE ON FUNCTION public.get_report_recipient() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_report_recipient() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_default_mod_recipient() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_default_mod_recipient() TO authenticated;

-- New RPC: return ALL moderator/admin user ids for broadcast notifications
CREATE OR REPLACE FUNCTION public.get_all_mod_recipients()
RETURNS TABLE(user_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT DISTINCT ur.user_id FROM public.user_roles ur
  WHERE ur.role IN ('admin','moderator','default_mod','duo_mod');
$$;
REVOKE EXECUTE ON FUNCTION public.get_all_mod_recipients() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_all_mod_recipients() TO authenticated;