export const normalizeEmail = (email: string) => email.trim().toLowerCase();
export const normalizeUsername = (username: string) => username.trim();
export function signupErrorMessage(error: { message: string; code?: string }) {
  if (error.code === "over_email_send_rate_limit" || /email rate limit/i.test(error.message)) return "Doğrulama e-postası gönderim sınırına ulaşıldı. Bir süre sonra tekrar dene; hesabını e-postanı doğrulamadan kullanamazsın.";
  if (/email address.*not allowed|domain.*no mail server|can't receive email/i.test(error.message)) return "Bu adres e-posta alamıyor. Adresi kontrol et veya doğrulama bağlantısı alabileceğin başka bir e-posta kullan.";
  if (error.code === "weak_password" || /weak|pwned|leaked|password.*least/i.test(error.message)) return "Bu şifre güvenli bulunmadı. Daha uzun, benzersiz bir şifre kullan.";
  if (/already|registered|exists/i.test(error.message)) return "Bu e-posta zaten kayıtlı. Giriş yapmayı veya şifre sıfırlamayı dene.";
  if (/rate|too many/i.test(error.message)) return "Çok fazla deneme yapıldı. Biraz bekleyip tekrar dene.";
  if (/database|duplicate/i.test(error.message)) return "Kullanıcı adı kullanılıyor olabilir. Başka bir kullanıcı adıyla tekrar dene.";
  return "Kayıt tamamlanamadı. Bağlantını kontrol edip tekrar dene.";
}
// Usernames appear in @mentions and channel links, so only letters, digits, "_" and "." are allowed.
export function usernameProblem(username: string): string | null {
  const u = normalizeUsername(username);
  if (u.length < 3) return "Kullanıcı adı en az 3 karakter olmalı.";
  if (u.length > 20) return "Kullanıcı adı en fazla 20 karakter olabilir.";
  if (!/^[\p{L}\p{N}_.]+$/u.test(u)) return "Kullanıcı adında boşluk veya özel karakter olamaz; harf, rakam, _ ve . kullan.";
  return null;
}
export function signinErrorMessage(error: { message: string; code?: string }) {
  if (error.code === "email_not_confirmed" || /not confirmed/i.test(error.message)) return "E-postan henüz doğrulanmadı. Gelen kutundaki bağlantıya tıkla veya yeni bağlantı iste.";
  if (/rate|too many/i.test(error.message)) return "Çok fazla deneme yapıldı. Biraz bekleyip tekrar dene.";
  return null;
}
