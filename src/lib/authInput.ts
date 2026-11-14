export const normalizeEmail = (email: string) => email.trim().toLowerCase();
export const normalizeUsername = (username: string) => username.trim();
export function signupErrorMessage(error: { message: string; code?: string }) {
  if (error.code === "weak_password" || /weak|pwned|leaked|password.*least/i.test(error.message)) return "Bu şifre güvenli bulunmadı. Daha uzun, benzersiz bir şifre kullan.";
  if (/already|registered|exists/i.test(error.message)) return "Bu e-posta zaten kayıtlı. Giriş yapmayı veya şifre sıfırlamayı dene.";
  if (/rate|too many/i.test(error.message)) return "Çok fazla deneme yapıldı. Biraz bekleyip tekrar dene.";
  if (/database|duplicate/i.test(error.message)) return "Kullanıcı adı kullanılıyor olabilir. Başka bir kullanıcı adıyla tekrar dene.";
  return "Kayıt tamamlanamadı. Bağlantını kontrol edip tekrar dene.";
}