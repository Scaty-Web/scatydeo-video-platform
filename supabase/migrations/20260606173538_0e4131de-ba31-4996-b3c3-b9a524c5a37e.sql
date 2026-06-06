
-- RPC: lookup a profile by email (so the auth login can greet the user)
CREATE OR REPLACE FUNCTION public.get_profile_by_email(_email text)
RETURNS TABLE(id uuid, username text, display_name text, avatar_url text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.username, p.display_name, p.avatar_url
  FROM auth.users u
  JOIN public.profiles p ON p.id = u.id
  WHERE lower(u.email) = lower(_email)
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.get_profile_by_email(text) TO anon, authenticated;

-- RPC: return who banned a user (so the banned user can appeal)
CREATE OR REPLACE FUNCTION public.get_ban_banner(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT banned_by FROM public.banned_users WHERE user_id = _user_id LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.get_ban_banner(uuid) TO authenticated;

-- News entry for this release
INSERT INTO public.news (title, content)
VALUES (
  'Yeni giriş ekranı, ban itirazı ve moderatör kaldırma',
  'Giriş sayfası Material 3 ile yeniden tasarlandı: önce e-posta gir, seni karşılayalım; sonra şifreyi gir. Şifreni unuttuysan kod göndeririz, kodla şifresiz girebilir veya yeni şifre belirleyebilirsin. Ban yiyen kullanıcılar artık ban sebebine tıklayıp itiraz mesajı gönderebiliyor; mesaj banlayan moderatöre bildirim olarak iletiliyor. Banlı kullanıcılar "Yeniden keşfet" diyerek konuk modunda videoları izleyebiliyor, ancak profil değişikliği yapamaz. Moderatörlerden moderatörlüğü kaldırma özelliği de eklendi.'
);
