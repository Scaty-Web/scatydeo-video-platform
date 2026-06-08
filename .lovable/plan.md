## Yeni Moderasyon Sistemi

### 1. Roller (Default Mod & Duo Mod)
`app_role` enum'una yeni değerler eklenecek:
- **`default_mod`** (mor rozet "Default Mod") — Lattesiber'ın kendisi. Yalnızca admin (Lattesiber) verebilir. Tam moderasyon: ban, mesaj, mod yapma (Duo Mod), banı açma.
- **`duo_mod`** (yeşil rozet "Duo Mod") — Default Mod tarafından atanan kullanıcılar. Sadece **ban + mesaj atma** yapabilir. Mod yapma yetkisi YOK. Banı açabilir mi? Hayır — sadece atayan Default Mod açabilir.
- Normal kullanıcı: rozet yok.

Eski `moderator` rolü → `default_mod` olarak migrate edilecek (Lattesiber zaten admin, korunur).

### 2. Yeni Tablo: `mod_assignments`
Hangi Default Mod'un hangi Duo Mod'u atadığını tutar. Bu sayede Default Mod sadece kendi atadığı Duo Mod'ları yönetebilir.
- `duo_mod_id`, `assigned_by` (default_mod kullanıcı), `created_at`

### 3. Bildirim Sistemi (Default Mod'lara yardım)
Bir Duo Mod ban/mesaj attığında, atayan Default Mod'a bildirim:
> "Gariban_kedoş banane kullanıcısını banladı"

Bunun için `banned_users` tablosuna trigger eklenir; banlayan eğer duo_mod ise, ilgili default_mod'a notification atılır.

### 4. Profil Rozeti
`Channel.tsx` sayfasında kullanıcı adı yanında:
- Default Mod → mor "Default Mod" yazısı
- Duo Mod → yeşil "Duo Mod" yazısı
- Normal → yok

### 5. Akıllı Rapor Yönlendirme
`ReportVideoDialog`'a kural seçim alanı zaten var. Submit ettiğinde:
- Önce **Duo Mod** havuzundan biri varsa → ilk Duo Mod'a bildirim
- Yoksa → Default Mod'a bildirim
- (Rastgele DEĞİL — sıralı/deterministik)
- Bildirim: "Yeni rapor: [video başlığı] — Sebep: [kural]"

### 6. ModerationDialog Güncellemesi
- Default Mod: tüm aksiyonlar (ban, unban, message, Duo Mod yap/kaldır)
- Duo Mod: sadece ban + message (promote butonu gizli)

### 7. Haberler Sayfası Duyurusu
`news` tablosuna yeni haber eklenir: "Yeni Moderasyon Sistemi: Default Mod & Duo Mod"

### Teknik Detay
- Migration: enum genişletme, `mod_assignments` tablosu+RLS+GRANT, trigger
- `has_role` zaten çalışıyor; yeni roller için kullanılır
- Frontend: `Channel.tsx`, `ModerationDialog.tsx`, `Navbar.tsx` (MOD butonu her iki rol için), `ReportVideoDialog.tsx` submit handler, news insert

Onaylıyor musun?