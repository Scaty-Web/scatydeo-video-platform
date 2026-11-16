CREATE OR REPLACE FUNCTION public.is_username_available(_username text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (SELECT 1 FROM public.profiles WHERE lower(username) = lower(trim(_username)));
$$;
REVOKE ALL ON FUNCTION public.is_username_available(text) FROM public;
GRANT EXECUTE ON FUNCTION public.is_username_available(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  base text := left(COALESCE(NULLIF(trim(NEW.raw_user_meta_data ->> 'username'), ''), SPLIT_PART(NEW.email, '@', 1)), 20);
  candidate text := base;
  n int := 0;
BEGIN
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE lower(username) = lower(candidate)) LOOP
    n := n + 1;
    candidate := left(base, 20 - length(n::text) - 1) || '_' || n::text;
  END LOOP;
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (
    NEW.id,
    candidate,
    COALESCE(NULLIF(trim(NEW.raw_user_meta_data ->> 'display_name'), ''), candidate)
  );
  RETURN NEW;
END;
$function$;