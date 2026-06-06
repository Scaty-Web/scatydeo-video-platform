import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { Ban, AlertTriangle, Unlock, Sparkles } from "lucide-react";

const Banned = () => {
  const { user, signOut } = useAuth();
  const { t, language } = useLanguage();
  const [banInfo, setBanInfo] = useState<{ reason: string; banned_at: string } | null>(null);
  const [unbanned, setUnbanned] = useState<{ id: string; message: string } | null>(null);

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
    const isTr = language === "tr";
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

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-lg w-full text-center space-y-6">
        <div className="w-24 h-24 rounded-full bg-destructive/20 flex items-center justify-center mx-auto">
          <Ban className="w-12 h-12 text-destructive" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-destructive">
            {t.banned.title}
          </h1>
          <p className="text-xl text-muted-foreground">
            {t.banned.subtitle}
          </p>
        </div>

        <div className="bg-muted/30 border border-destructive/30 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 justify-center text-destructive">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-semibold">{t.banned.moderatorMessage}</span>
          </div>
          
          <div className="text-left space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">{t.banned.reason}</p>
              <p className="font-medium">{banInfo?.reason || t.banned.defaultReason}</p>
            </div>
            
            {banInfo?.banned_at && (
              <div>
                <p className="text-sm text-muted-foreground">{t.banned.date}</p>
                <p className="font-medium">{formatDate(banInfo.banned_at)}</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t.banned.appealText}
          </p>
          
          <button 
            onClick={() => signOut()}
            className="text-primary hover:underline"
          >
            {t.common.signOut}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Banned;
