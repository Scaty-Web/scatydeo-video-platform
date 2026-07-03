-- Seed a welcome news entry so /news page is not empty after v3 launch
INSERT INTO public.news (title, content, is_published)
SELECT
  'Scatydeo v3 yayında! 🎉',
  E'Scatydeo v3 geldi!\n\nYenilikler:\n• Yepyeni arayüz (Material 3 + YouTube kaynaşımı)\n• Videoyu izleyip analiz eden AI özet\n• Scatydeo FoCAM ekran kaydedici (beta)\n• Tema paketleri — kendi renginizi seçin\n• Üst menüyü aç/kapat oku\n\nKeyifli izlemeler!\n— SWO ekibi',
  true
WHERE NOT EXISTS (SELECT 1 FROM public.news WHERE title = 'Scatydeo v3 yayında! 🎉');
