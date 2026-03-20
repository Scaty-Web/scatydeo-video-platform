
-- Fix security definer view by using security_invoker
ALTER VIEW public.streams_public SET (security_invoker = true);
