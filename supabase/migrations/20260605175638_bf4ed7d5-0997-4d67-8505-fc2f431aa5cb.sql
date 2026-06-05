
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.comments(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS comments_parent_id_idx ON public.comments(parent_id);

ALTER TABLE public.news_comments ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.news_comments(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS news_comments_parent_id_idx ON public.news_comments(parent_id);

INSERT INTO public.user_roles (user_id, role)
VALUES ('31b2ae42-7fa8-48d3-b814-2aca6feed933', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

CREATE POLICY "Admins and moderators can send notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator')
);

INSERT INTO public.news (title, content, is_published, created_by)
VALUES (
  'Yeni UI ve yepyeni özellikler',
  E'Bu güncellemeyle Scatydeo''ya büyük yenilikler geldi:\n\n• Yorum yanıtlama: Artık hem video hem haber yorumlarına yanıt verebilirsiniz.\n• Yepyeni Material 3 arayüzü: Daha modern renkler, yumuşak gölgeler ve daha temiz bir düzen.\n• Moderasyon paneli: Moderatörler MOD butonuyla kullanıcıları yönetip mesaj gönderebiliyor.\n• Video yönetme: Kendi videolarınızı tek yerden silebilir veya gizleyebilirsiniz.',
  true,
  '31b2ae42-7fa8-48d3-b814-2aca6feed933'
);
