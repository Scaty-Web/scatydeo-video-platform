create or replace function public.lookup_login_profile(_email text)
returns table(found boolean, username text, display_name text, avatar_url text)
language sql
stable
security definer
set search_path = public
as $$
  select true, p.username, p.display_name, p.avatar_url
  from auth.users u
  join public.profiles p on p.id = u.id
  where lower(u.email) = lower(trim(_email))
  limit 1;
$$;

revoke all on function public.lookup_login_profile(text) from public;
grant execute on function public.lookup_login_profile(text) to anon, authenticated;