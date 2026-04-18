
-- Attach the existing function as trigger on subscriptions
DROP TRIGGER IF EXISTS subscriptions_count_trigger ON public.subscriptions;
CREATE TRIGGER subscriptions_count_trigger
AFTER INSERT OR DELETE ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_subscribers_count();

-- Backfill correct counts for all profiles
UPDATE public.profiles p
SET subscribers_count = COALESCE(s.cnt, 0)
FROM (
  SELECT channel_id, COUNT(*)::int AS cnt
  FROM public.subscriptions
  GROUP BY channel_id
) s
WHERE p.id = s.channel_id;

UPDATE public.profiles
SET subscribers_count = 0
WHERE id NOT IN (SELECT DISTINCT channel_id FROM public.subscriptions);
