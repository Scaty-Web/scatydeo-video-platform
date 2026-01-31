-- Mevcut politikayı kaldır
DROP POLICY IF EXISTS "Comments viewable for accessible videos" ON public.comments;

-- Yeni politika: Yorumlar sadece kimliği doğrulanmış kullanıcılar tarafından görüntülenebilir
-- ve yalnızca erişilebilir videolar için (public veya kendi videoları)
CREATE POLICY "Comments viewable for authenticated users on accessible videos"
ON public.comments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.videos v
    WHERE v.id = comments.video_id
    AND (v.is_public = true OR v.user_id = auth.uid())
  )
);