import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { Ban, AlertTriangle, Unlock, Sparkles, Play, Compass, Send, Loader2, ArrowLeft } from "lucide-react";

const Banned = () => {
  const { user, signOut } = useAuth();
  const { t, language } = useLanguage();
  const [banInfo, setBanInfo] = useState<{ reason: string; banned_at: string } | null>(null);
  const [unbanned, setUnbanned] = useState<{ id: string; message: string } | null>(null);
  const [showAppeal, setShowAppeal] = useState(false);
  const [appealMsg, setAppealMsg] = useState("");
  const [sendingAppeal, setSendingAppeal] = useState(false);
  const [appealSent, setAppealSent] = useState(false);
  const isTr = language === "tr";

  useEffect(() => {
    if (user) {
      fetchBanInfo();
    }
  }, [user]);

  // Poll for unban every 6s
  useEffect(() => {
    if (!user || unbanned) return;
    const check = async () => {
      const { data: stillBanned } = await supabase.rpc("is_user_banned", { _user_id: user.id });
      if (!stillBanned) {
        const { data: notif } = await supabase
          .from("notifications")
          .select("id, message")
          .eq("user_id", user.id)
          .eq("type", "unban")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (notif) {
          setUnbanned({ id: notif.id, message: notif.message });
        } else {
          // Ban removed but no message — just reload to enter app
          window.location.href = "/";
        }
      }
    };
    const i = setInterval(check, 6000);
    check();
    return () => clearInterval(i);
  }, [user, unbanned]);

  const fetchBanInfo = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .rpc('get_ban_info', { _user_id: user.id });
    
    if (data && data.length > 0) {
      setBanInfo(data[0]);
    }
  };

  const handleOk = async () => {
    if (unbanned) {
      await supabase.from("notifications").update({ is_read: true }).eq("id", unbanned.id);
    }
    window.location.href = "/";
  };

  const enterGuestMode = () => {
    sessionStorage.setItem("scatydeo_guest", "1");
    window.location.href = "/";
  };

  const sendAppeal = async () => {
    if (!user || !appealMsg.trim()) return;
    setSendingAppeal(true);
    const { data: bannerId } = await supabase.rpc("get_ban_banner", { _user_id: user.id });
    if (bannerId) {
      const { data: me } = await supabase
        .from("profiles")
        .select("username, display_name")
        .eq("id", user.id)
        .maybeSingle();
      const name = me?.display_name || me?.username || "Kullanıcı";
      await supabase.from("notifications").insert({
        user_id: bannerId,
        type: "moderation",
        title: isTr ? `Ban itirazı: ${name}` : `Ban appeal: ${name}`,
        message: appealMsg.trim(),
      });
    }
    setSendingAppeal(false);
    setAppealSent(true);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString(language === 'tr' ? "tr-TR" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  if (unbanned) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-lg w-full text-center space-y-6">
          <div className="w-24 h-24 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
            <Unlock className="w-12 h-12 text-green-500" />
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl font-bold text-green-500">
              {isTr ? "Ban Açıldı" : "Ban Lifted"}
            </h1>
            <p className="text-xl text-muted-foreground">
              {isTr ? "Tekrar hoş geldin!" : "Welcome back!"}
            </p>
          </div>
          <div className="m3-surface-high border border-green-500/30 rounded-xl p-6 space-y-3 text-left">
            <div className="flex items-center gap-2 text-green-500">
              <Sparkles className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">
                {isTr ? "Moderasyon Mesajı (AI)" : "Moderation Message (AI)"}
              </span>
            </div>
            <p className="text-foreground whitespace-pre-wrap">{unbanned.message}</p>
          </div>
          <button
            onClick={handleOk}
            className="w-full m3-state-layer bg-primary text-primary-foreground rounded-full py-3 font-semibold hover:opacity-90"
          >
            {isTr ? "Tamam" : "OK"}
          </button>
        </div>
      </div>
    );
  }

  if (showAppeal) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[hsl(0_60%_8%)]">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-red-600/30 blur-3xl" />
          <div className="absolute -bottom-40 -right-32 w-[28rem] h-[28rem] rounded-full bg-red-900/40 blur-3xl" />
        </div>
        <div className="relative w-full max-w-md m3-surface-high border-red-500/30 p-8 space-y-6">
          <div className="flex flex-col items-center gap-2">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center shadow-lg">
              <Play className="w-7 h-7 text-white fill-current" />
            </div>
            <span className="font-display text-2xl font-bold">Scatydeo</span>
          </div>
          {appealSent ? (
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold text-green-500">
                {isTr ? "Mesaj gönderildi" : "Message sent"}
              </h2>
              <p className="text-muted-foreground">
                {isTr
                  ? "Moderatör bildirimini aldı. Cevap için bekle."
                  : "The moderator was notified. Please wait for a reply."}
              </p>
              <button
                onClick={() => { setShowAppeal(false); setAppealSent(false); setAppealMsg(""); }}
                className="w-full bg-red-600 hover:bg-red-700 text-white rounded-full py-3 font-semibold"
              >
                {isTr ? "Geri dön" : "Go back"}
              </button>
            </div>
          ) : (
            <>
              <div>
                <h2 className="text-xl font-bold">
                  {isTr ? "Yine başka kişiyi mi banladık?" : "Did we ban the wrong person?"}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {isTr ? "Mesajını seni banlayan moderatöre gönderelim." : "We'll send your message to the moderator."}
                </p>
              </div>
              <textarea
                value={appealMsg}
                onChange={(e) => setAppealMsg(e.target.value)}
                placeholder={isTr ? "Mesajını yaz..." : "Write your message..."}
                rows={5}
                className="w-full bg-background/40 border border-red-500/30 rounded-xl p-3 text-sm focus:border-red-400 focus:outline-none resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAppeal(false)}
                  className="flex-1 border border-red-500/40 rounded-full py-3 font-semibold hover:bg-red-500/10"
                >
                  <ArrowLeft className="w-4 h-4 inline mr-1" />
                  {isTr ? "İptal" : "Cancel"}
                </button>
                <button
                  onClick={sendAppeal}
                  disabled={sendingAppeal || !appealMsg.trim()}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-full py-3 font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {sendingAppeal ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {isTr ? "Gönder" : "Send"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[hsl(0_60%_8%)]">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-red-600/30 blur-3xl" />
        <div className="absolute top-1/2 -right-32 w-[26rem] h-[26rem] rounded-full bg-red-700/30 blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 w-[28rem] h-[28rem] rounded-full bg-red-900/40 blur-3xl" />
      </div>
      <div className="relative w-full max-w-md m3-surface-high !border-red-500/40 p-8 space-y-6 text-center">
        <div className="flex flex-col items-center gap-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center shadow-lg">
            <Play className="w-7 h-7 text-white fill-current" />
          </div>
          <span className="font-display text-2xl font-bold">Scatydeo</span>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-red-400">
            {isTr ? "Hesap askıya alındı" : "Account suspended"}
          </h1>
        </div>

        <button
          onClick={() => setShowAppeal(true)}
          className="w-full text-left bg-red-950/40 border border-red-500/30 rounded-xl p-5 space-y-2 hover:bg-red-950/60 transition-colors group"
        >
          <div className="flex items-center gap-2 text-red-400">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">
              {isTr ? "Neden:" : "Reason:"}
            </span>
          </div>
          <p className="text-foreground font-medium">{banInfo?.reason || (isTr ? "Belirtilmedi" : "Not specified")}</p>
          {banInfo?.banned_at && (
            <p className="text-xs text-muted-foreground">{formatDate(banInfo.banned_at)}</p>
          )}
          <p className="text-xs text-red-300/80 pt-2 group-hover:underline">
            {isTr ? "Yanlış kişiyi mi banladık? Tıkla, mesaj gönder." : "Wrong person? Tap to appeal."}
          </p>
        </button>

        <div className="space-y-2">
          <button
            onClick={enterGuestMode}
            className="w-full bg-red-600 hover:bg-red-700 text-white rounded-full py-3 font-semibold flex items-center justify-center gap-2"
          >
            <Compass className="w-4 h-4" />
            {isTr ? "Yeniden keşfet" : "Explore again"}
          </button>
          <p className="text-xs text-muted-foreground">
            {isTr
              ? "Konuk modunda videoları izleyebilirsin ama profil ve içerik değiştiremezsin."
              : "In guest mode you can watch videos but cannot update your profile or post content."}
          </p>
          <button
            onClick={() => signOut()}
            className="text-sm text-red-300 hover:underline"
          >
            {t.common.signOut}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Banned;
