
-- 1) Extend app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'default_mod';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'duo_mod';

COMMIT;
BEGIN;

-- 2) Migrate existing 'moderator' -> 'default_mod' (keep both rows for back-compat)
INSERT INTO public.user_roles (user_id, role)
SELECT user_id, 'default_mod'::public.app_role
FROM public.user_roles
WHERE role = 'moderator'
ON CONFLICT (user_id, role) DO NOTHING;

-- 3) mod_assignments table
CREATE TABLE IF NOT EXISTS public.mod_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  duo_mod_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (duo_mod_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mod_assignments TO authenticated;
GRANT ALL ON public.mod_assignments TO service_role;

ALTER TABLE public.mod_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Default mods and admins manage assignments"
ON public.mod_assignments
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'default_mod')
  OR auth.uid() = duo_mod_id
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'default_mod')
);

-- 4) Trigger: notify default mod when their duo mod bans someone
CREATE OR REPLACE FUNCTION public.notify_default_mod_on_duo_ban()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_assigner uuid;
  v_duo_username text;
  v_banned_username text;
BEGIN
  -- Only if banned_by is a duo_mod
  IF NOT public.has_role(NEW.banned_by, 'duo_mod') THEN
    RETURN NEW;
  END IF;

  SELECT assigned_by INTO v_assigner FROM public.mod_assignments WHERE duo_mod_id = NEW.banned_by LIMIT 1;
  IF v_assigner IS NULL THEN RETURN NEW; END IF;

  SELECT COALESCE(username, display_name, 'Bir Duo Mod') INTO v_duo_username FROM public.profiles WHERE id = NEW.banned_by;
  SELECT COALESCE(username, display_name, 'bir kullanıcıyı') INTO v_banned_username FROM public.profiles WHERE id = NEW.user_id;

  INSERT INTO public.notifications (user_id, title, message, type, link)
  VALUES (
    v_assigner,
    'Duo Mod İşlemi',
    v_duo_username || ' ' || v_banned_username || ' kullanıcısını banladı. Sebep: ' || COALESCE(NEW.reason, '-'),
    'moderation',
    NULL
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_default_mod_on_duo_ban ON public.banned_users;
CREATE TRIGGER trg_notify_default_mod_on_duo_ban
AFTER INSERT ON public.banned_users
FOR EACH ROW EXECUTE FUNCTION public.notify_default_mod_on_duo_ban();

-- 5) Helper RPC: list mod recipients (duo first, else default)
CREATE OR REPLACE FUNCTION public.get_report_recipient()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ur.user_id
  FROM public.user_roles ur
  WHERE ur.role = 'duo_mod'
  ORDER BY ur.user_id
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.get_default_mod_recipient()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ur.user_id
  FROM public.user_roles ur
  WHERE ur.role = 'default_mod' OR ur.role = 'admin'
  ORDER BY (ur.role = 'admin') DESC, ur.user_id
  LIMIT 1
$$;

COMMIT;
