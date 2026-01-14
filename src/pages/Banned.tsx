import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Ban, AlertTriangle } from "lucide-react";

const Banned = () => {
  const { user, signOut } = useAuth();
  const [banInfo, setBanInfo] = useState<{ reason: string; banned_at: string } | null>(null);

  useEffect(() => {
    if (user) {
      fetchBanInfo();
    }
  }, [user]);

  const fetchBanInfo = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .rpc('get_ban_info', { _user_id: user.id });
    
    if (data && data.length > 0) {
      setBanInfo(data[0]);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("tr-TR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-lg w-full text-center space-y-6">
        <div className="w-24 h-24 rounded-full bg-destructive/20 flex items-center justify-center mx-auto">
          <Ban className="w-12 h-12 text-destructive" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-destructive">
            HESAP ASKIYA ALINDI
          </h1>
          <p className="text-xl text-muted-foreground">
            Scatydeo platformuna erişiminiz kısıtlanmıştır.
          </p>
        </div>

        <div className="bg-muted/30 border border-destructive/30 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 justify-center text-destructive">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-semibold">Moderatör Mesajı</span>
          </div>
          
          <div className="text-left space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Neden:</p>
              <p className="font-medium">{banInfo?.reason || "Topluluk kurallarına aykırı davranış"}</p>
            </div>
            
            {banInfo?.banned_at && (
              <div>
                <p className="text-sm text-muted-foreground">Tarih:</p>
                <p className="font-medium">{formatDate(banInfo.banned_at)}</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Bu kararın hatalı olduğunu düşünüyorsanız, lütfen iletişim sayfasından 
            bizimle iletişime geçin.
          </p>
          
          <button 
            onClick={() => signOut()}
            className="text-primary hover:underline"
          >
            Çıkış Yap
          </button>
        </div>
      </div>
    </div>
  );
};

export default Banned;
