-- Restore anon access to get_profile_by_email so the email-first login flow
-- can look up the avatar/display name BEFORE the user is signed in.
-- This function returns only public profile fields (username, display_name, avatar_url)
-- and is safe for anonymous callers.
GRANT EXECUTE ON FUNCTION public.get_profile_by_email(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_profile_by_email(text) TO authenticated;