-- Remove the streams table from Realtime publication
-- "IF EXISTS" not supported, so we use DO block
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.streams;
  EXCEPTION WHEN undefined_object THEN
    -- Table not in publication, nothing to do
    NULL;
  END;
END;
$$;
