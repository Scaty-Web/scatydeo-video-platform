import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Mail, Lock, User, Play, ArrowRight, ArrowLeft, KeyRound, ShieldCheck, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAvatarUrl } from "@/lib/defaults";
import { z } from "zod";
import viravoAsset from "@/assets/viravo.mp3.asset.json";


type Step = "email" | "password" | "signup" | "otp_sent" | "otp_verify" | "post_otp" | "reset_password";

const Auth = () => {
  const { t } = useLanguage();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; username?: string; code?: string }>({});
  const [foundProfile, setFoundProfile] = useState<{ username: string | null; display_name: string | null; avatar_url: string | null } | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const audioRef = useRef<HTMLAudioElement>(null);

  // Viravo background music — auto-play & loop
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    a.loop = true;
    a.volume = 0.4;
    a.play().catch(() => {});
  }, []);

  const emailSchema = z.string().email(t.auth.validEmail);
  const passwordSchema = z.string().min(6, t.auth.minPassword);
  const usernameSchema = z.string().min(3, t.auth.minUsername).max(20, t.auth.maxUsername);

  // Detect magic-link landing: if URL hash contains access_token, Supabase set a session.
  // Don't auto-redirect; show post-link choice (passwordless vs reset password).
  const [linkRecovery, setLinkRecovery] = useState(false);

  useEffect(() => {
    const hash = window.location.hash || "";
    const isRecovery = hash.includes("access_token") || hash.includes("type=recovery") || hash.includes("type=magiclink");
    if (isRecovery) {
      setLinkRecovery(true);
      setStep("post_otp");
      // clean the hash from the URL bar
      window.history.replaceState(null, "", window.location.pathname);
      return;
    }
    if (user && !linkRecovery) {
      navigate("/");
    }
  }, [user, navigate, linkRecovery]);

  const handleEmailNext = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = emailSchema.safeParse(email);
    if (!r.success) { setErrors({ email: r.error.errors[0].message }); return; }
    setErrors({});
    // Not: e-posta ile profil sorgusu güvenlik nedeniyle anonim kullanıcılara kapalı
    // (hesap sızdırma / email enumeration). Bu yüzden doğrudan şifre adımına geçiyoruz.
    setFoundProfile(null);
    setStep("password");
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = passwordSchema.safeParse(password);
    if (!r.success) { setErrors({ password: r.error.errors[0].message }); return; }
    setIsLoading(true);
    const { error } = await signIn(email, password);
    setIsLoading(false);
    if (error) {
      toast({ title: t.auth.loginFailed, description: t.auth.invalidCredentials, variant: "destructive" });
    } else {
      toast({ title: t.auth.welcome, description: t.auth.loginSuccess });
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: typeof errors = {};
    const pr = passwordSchema.safeParse(password);
    if (!pr.success) newErrors.password = pr.error.errors[0].message;
    const ur = usernameSchema.safeParse(username);
    if (!ur.success) newErrors.username = ur.error.errors[0].message;
    if (Object.keys(newErrors).length) { setErrors(newErrors); return; }
    setErrors({});
    setIsLoading(true);
    const { error } = await signUp(email, password, username);
    setIsLoading(false);
    if (error) {
      toast({ title: t.auth.signupFailed, description: "İşlem başarısız oldu. Lütfen tekrar deneyin.", variant: "destructive" });
    } else {
      toast({ title: t.auth.signupSuccess, description: t.auth.accountCreated });
    }
  };

  const sendOtp = async () => {
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: `${window.location.origin}/auth`,
      },
    });
    setIsLoading(false);
    if (error) {
      toast({ title: t.common.error, description: "İşlem başarısız oldu. Lütfen tekrar deneyin.", variant: "destructive" });
      return;
    }
    setStep("otp_sent");
    toast({
      title: "Bağlantı gönderildi",
      description: `${email} adresine tek kullanımlık bir bağlantı gönderdik. Linke tıkla, Scatydeo'ya geri dön.`,
    });
  };

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim()) { setErrors({ code: "Kod gerekli" }); return; }
    setIsLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otpCode.trim(),
      type: "email",
    });
    setIsLoading(false);
    if (error) {
      setErrors({ code: error.message });
      return;
    }
    setErrors({});
    setStep("post_otp");
  };

  const resetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = passwordSchema.safeParse(newPassword);
    if (!r.success) { setErrors({ password: r.error.errors[0].message }); return; }
    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setIsLoading(false);
    if (error) {
      toast({ title: t.common.error, description: "İşlem başarısız oldu. Lütfen tekrar deneyin.", variant: "destructive" });
      return;
    }
    toast({ title: "Şifre güncellendi", description: "Yeni şifrenle giriş yaptın." });
    navigate("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[hsl(270_50%_8%)]">
      {/* M3 expressive background shapes */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-32 -left-32 w-[28rem] h-[28rem] rounded-full bg-purple-600/30 blur-3xl" />
        <div className="absolute top-1/3 -right-32 w-[24rem] h-[24rem] rounded-[40%_60%_70%_30%/40%_50%_60%_50%] bg-fuchsia-500/25 blur-3xl" />
        <div className="absolute -bottom-40 left-1/4 w-[30rem] h-[30rem] rounded-[60%_40%_30%_70%/60%_40%_60%_40%] bg-violet-700/30 blur-3xl" />
        <div className="absolute top-10 right-20 w-24 h-24 rounded-3xl bg-purple-500/20 backdrop-blur-sm rotate-12" />
        <div className="absolute bottom-16 left-10 w-32 h-32 rounded-full border-2 border-purple-400/20" />
      </div>

      <div className="relative w-full max-w-md m3-surface-high p-8 space-y-6">
        {/* Logo header */}
        <div className="flex flex-col items-center gap-2">
          <a href="/" className="flex flex-col items-center gap-2">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-[0_8px_24px_-8px_hsl(270_100%_60%/0.6)]">
              <Play className="w-7 h-7 text-primary-foreground fill-current" />
            </div>
            <span className="font-display text-2xl font-bold">Scatydeo</span>
          </a>
          {foundProfile && (step === "password") && (
            <div className="flex flex-col items-center gap-2 mt-2">
              <Avatar className="w-16 h-16 border-2 border-primary/40">
                <AvatarImage src={getAvatarUrl(foundProfile.avatar_url)} />
                <AvatarFallback>{(foundProfile.username || "?").charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <p className="text-lg font-semibold">
                Merhaba, {foundProfile.display_name || foundProfile.username} 👋
              </p>
            </div>
          )}
        </div>

        {/* STEP: email */}
        {step === "email" && (
          <form onSubmit={handleEmailNext} className="space-y-4">
            <div className="space-y-2">
              <Label>{t.auth.email}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="email"
                  autoFocus
                  placeholder={t.auth.emailPlaceholder}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-12 rounded-xl bg-background/40 border-primary/30 focus:border-primary"
                />
              </div>
              {errors.email && <p className="text-sm text-red-400">{errors.email}</p>}
            </div>
            <Button type="submit" className="w-full h-12 rounded-full m3-fab !h-12 !px-6" disabled={isLoading}>
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (<>İleri <ArrowRight className="w-4 h-4" /></>)}
            </Button>
          </form>
        )}

        {/* STEP: password */}
        {step === "password" && (
          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-2">
              <Label>{t.auth.password}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type={showPassword ? "text" : "password"}
                  autoFocus
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 h-12 rounded-xl bg-background/40 border-primary/30 focus:border-primary"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && <p className="text-sm text-red-400">{errors.password}</p>}
            </div>
            <div className="flex justify-between text-sm">
              <button type="button" onClick={() => { setStep("email"); setPassword(""); setFoundProfile(null); }} className="text-muted-foreground hover:underline flex items-center gap-1">
                <ArrowLeft className="w-3 h-3" /> Geri
              </button>
              <button type="button" onClick={sendOtp} className="text-primary hover:underline">
                Şifremi unuttum
              </button>
            </div>
            <Button type="submit" className="w-full h-12 rounded-full m3-fab !h-12 !px-6" disabled={isLoading}>
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : t.auth.loginBtn}
            </Button>
          </form>
        )}

        {/* STEP: link sent — waiting for user to click magic link in email */}
        {step === "otp_sent" && (
          <div className="space-y-4 text-center">
            <div className="mx-auto w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center">
              <Mail className="w-7 h-7 text-primary" />
            </div>
            <h2 className="text-xl font-semibold">E-postanı kontrol et</h2>
            <p className="text-sm text-muted-foreground">
              <span className="text-foreground font-medium">{email}</span> adresine
              <br />tek kullanımlık bir bağlantı gönderdik.
            </p>
            <p className="text-xs text-muted-foreground">
              Linke tıkla, Scatydeo'ya geri dön. Bağlantı yalnızca bir kez kullanılabilir.
            </p>
            <div className="flex justify-between text-sm pt-2">
              <button type="button" onClick={() => setStep("password")} className="text-muted-foreground hover:underline flex items-center gap-1">
                <ArrowLeft className="w-3 h-3" /> Geri
              </button>
              <button type="button" onClick={sendOtp} className="text-primary hover:underline">
                Yeniden gönder
              </button>
            </div>
          </div>
        )}

        {/* STEP: signup (no account found) — render block */}
        {step === "signup" && (
          <form onSubmit={handleSignUp} className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Bu e-posta ile hesap bulunamadı. Yeni hesap oluştur.
            </p>
            <div className="space-y-2">
              <Label>{t.auth.username}</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder={t.auth.usernamePlaceholder} className="pl-10 h-12 rounded-xl bg-background/40 border-primary/30" />
              </div>
              {errors.username && <p className="text-sm text-red-400">{errors.username}</p>}
            </div>
            <div className="space-y-2">
              <Label>{t.auth.password}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="pl-10 h-12 rounded-xl bg-background/40 border-primary/30" />
              </div>
              {errors.password && <p className="text-sm text-red-400">{errors.password}</p>}
            </div>
            <div className="flex justify-between text-sm">
              <button type="button" onClick={() => setStep("email")} className="text-muted-foreground hover:underline flex items-center gap-1">
                <ArrowLeft className="w-3 h-3" /> Geri
              </button>
            </div>
            <Button type="submit" className="w-full h-12 rounded-full m3-fab !h-12 !px-6" disabled={isLoading}>
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : t.auth.signupBtn}
            </Button>
          </form>
        )}

        {/* STEP: otp verify */}
        {step === "otp_verify" && (
          <form onSubmit={verifyOtp} className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              {email} adresine 6 haneli kod gönderdik. Kodu gir.
            </p>
            <div className="space-y-2">
              <Label>Doğrulama kodu</Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input value={otpCode} onChange={(e) => setOtpCode(e.target.value)} placeholder="123456" autoFocus className="pl-10 h-12 rounded-xl bg-background/40 border-primary/30 text-center tracking-[0.4em] text-lg" />
              </div>
              {errors.code && <p className="text-sm text-red-400">{errors.code}</p>}
            </div>
            <div className="flex justify-between text-sm">
              <button type="button" onClick={() => setStep("password")} className="text-muted-foreground hover:underline flex items-center gap-1">
                <ArrowLeft className="w-3 h-3" /> Geri
              </button>
              <button type="button" onClick={sendOtp} className="text-primary hover:underline">
                Yeniden gönder
              </button>
            </div>
            <Button type="submit" className="w-full h-12 rounded-full m3-fab !h-12 !px-6" disabled={isLoading}>
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Doğrula"}
            </Button>
          </form>
        )}

        {/* STEP: choose after OTP */}
        {step === "post_otp" && (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-2 text-green-400">
              <ShieldCheck className="w-5 h-5" />
              <span className="font-semibold">Doğrulandı</span>
            </div>
            <p className="text-sm text-muted-foreground text-center">Nasıl devam edelim?</p>
            <button
              onClick={() => navigate("/")}
              className="w-full m3-state-layer p-4 rounded-xl border border-primary/30 bg-background/30 text-left hover:bg-primary/10"
            >
              <p className="font-semibold">Şifresiz giriş yap</p>
              <p className="text-xs text-muted-foreground">Mevcut şifre değişmez, şimdi içeri gir.</p>
            </button>
            <button
              onClick={() => setStep("reset_password")}
              className="w-full m3-state-layer p-4 rounded-xl border border-primary/30 bg-background/30 text-left hover:bg-primary/10"
            >
              <p className="font-semibold">Şifreyi sıfırla</p>
              <p className="text-xs text-muted-foreground">Yeni şifre belirle ve onunla devam et.</p>
            </button>
          </div>
        )}

        {/* STEP: reset password */}
        {step === "reset_password" && (
          <form onSubmit={resetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label>Yeni şifre</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input type={showPassword ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" autoFocus className="pl-10 h-12 rounded-xl bg-background/40 border-primary/30" />
              </div>
              {errors.password && <p className="text-sm text-red-400">{errors.password}</p>}
            </div>
            <Button type="submit" className="w-full h-12 rounded-full m3-fab !h-12 !px-6" disabled={isLoading}>
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Tamam"}
            </Button>
          </form>
        )}

        <p className="text-center text-xs text-muted-foreground">
          {t.auth.termsText} <a href="/rules" className="text-primary hover:underline">{t.auth.termsLink}</a> {t.auth.termsAccept}
        </p>
      </div>

      {/* Viravo background music */}
      <audio ref={audioRef} src={viravoAsset.url} preload="auto" />
    </div>
  );
};

export default Auth;
