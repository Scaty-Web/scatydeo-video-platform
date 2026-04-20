
-- ============= SWITCHES TABLE =============
CREATE TABLE public.switches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL,
  cover_url TEXT,
  duration_seconds NUMERIC,
  views_count INTEGER NOT NULL DEFAULT 0,
  likes_count INTEGER NOT NULL DEFAULT 0,
  comments_count INTEGER NOT NULL DEFAULT 0,
  is_public BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.switches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public switches viewable by everyone"
ON public.switches FOR SELECT
USING (is_public = true OR auth.uid() = user_id);

CREATE POLICY "Users can insert own switches"
ON public.switches FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own switches"
ON public.switches FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own switches"
ON public.switches FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Moderators can delete any switch"
ON public.switches FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'moderator'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_switches_created_at ON public.switches(created_at DESC);
CREATE INDEX idx_switches_user_id ON public.switches(user_id);

CREATE TRIGGER update_switches_updated_at
BEFORE UPDATE ON public.switches
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============= SWITCH LIKES =============
CREATE TABLE public.switch_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  switch_id UUID NOT NULL REFERENCES public.switches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(switch_id, user_id)
);

ALTER TABLE public.switch_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own likes or likes on own switches"
ON public.switch_likes FOR SELECT
USING (
  auth.uid() = user_id
  OR auth.uid() IN (SELECT user_id FROM public.switches WHERE id = switch_likes.switch_id)
);

CREATE POLICY "Authenticated users can like switches"
ON public.switch_likes FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike own likes"
ON public.switch_likes FOR DELETE
USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.update_switch_likes_count()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.switches SET likes_count = likes_count + 1 WHERE id = NEW.switch_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.switches SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.switch_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_switch_likes_count
AFTER INSERT OR DELETE ON public.switch_likes
FOR EACH ROW EXECUTE FUNCTION public.update_switch_likes_count();

-- ============= SWITCH COMMENTS =============
CREATE TABLE public.switch_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  switch_id UUID NOT NULL REFERENCES public.switches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.switch_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view comments on accessible switches"
ON public.switch_comments FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.switches s
    WHERE s.id = switch_comments.switch_id
    AND (s.is_public = true OR s.user_id = auth.uid())
  )
);

CREATE POLICY "Authenticated users can insert switch comments"
ON public.switch_comments FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own switch comments"
ON public.switch_comments FOR DELETE
USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.update_switch_comments_count()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.switches SET comments_count = comments_count + 1 WHERE id = NEW.switch_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.switches SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = OLD.switch_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_switch_comments_count
AFTER INSERT OR DELETE ON public.switch_comments
FOR EACH ROW EXECUTE FUNCTION public.update_switch_comments_count();

-- ============= SWITCH REPORTS =============
CREATE TABLE public.switch_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  switch_id UUID NOT NULL REFERENCES public.switches(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.switch_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can report switches"
ON public.switch_reports FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can view their own switch reports"
ON public.switch_reports FOR SELECT
USING (auth.uid() = reporter_id);

CREATE POLICY "Moderators can view all switch reports"
ON public.switch_reports FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'moderator'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Moderators can update switch reports"
ON public.switch_reports FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'moderator'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Moderators can delete switch reports"
ON public.switch_reports FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'moderator'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- ============= RPCs =============
CREATE OR REPLACE FUNCTION public.increment_switch_view_count(target_switch_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.switches SET views_count = views_count + 1 WHERE id = target_switch_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.has_user_liked_switch(target_switch_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.switch_likes
    WHERE switch_id = target_switch_id AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.get_switch_like_count(target_switch_id uuid)
RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COUNT(*)::integer FROM public.switch_likes WHERE switch_id = target_switch_id;
$$;

-- ============= STORAGE BUCKET =============
INSERT INTO storage.buckets (id, name, public)
VALUES ('switches', 'switches', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Switch files are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'switches');

CREATE POLICY "Users can upload own switch files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'switches'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update own switch files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'switches'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own switch files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'switches'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
