import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import BottomNav from "@/components/BottomNav";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Trash2, Eye, EyeOff, Loader2, SlidersHorizontal } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { getThumbnailUrl } from "@/lib/defaults";

interface MyVideo {
  id: string;
  title: string;
  thumbnail_url: string | null;
  views_count: number | null;
  is_public: boolean | null;
  created_at: string;
}

const ManageVideos = () => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const isTr = language === "tr";

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [videos, setVideos] = useState<MyVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!user) { navigate("/auth"); return; }
    (async () => {
      const { data } = await supabase
        .from("videos")
        .select("id, title, thumbnail_url, views_count, is_public, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setVideos((data ?? []) as MyVideo[]);
      setLoading(false);
    })();
  }, [user, navigate]);

  const toggleVisibility = async (v: MyVideo) => {
    setBusy((b) => ({ ...b, [v.id]: true }));
    const next = !v.is_public;
    const { error } = await supabase.from("videos").update({ is_public: next }).eq("id", v.id);
    setBusy((b) => ({ ...b, [v.id]: false }));
    if (error) {
      toast({ title: isTr ? "Hata" : "Error", description: "İşlem başarısız oldu. Lütfen tekrar deneyin.", variant: "destructive" });
      return;
    }
    setVideos((arr) => arr.map((x) => x.id === v.id ? { ...x, is_public: next } : x));
    toast({ title: next ? (isTr ? "Yayında" : "Public") : (isTr ? "Gizlendi" : "Hidden") });
  };

  const removeVideo = async (v: MyVideo) => {
    if (!confirm(isTr ? `"${v.title}" silinsin mi?` : `Delete "${v.title}"?`)) return;
    setBusy((b) => ({ ...b, [v.id]: true }));
    const { error } = await supabase.from("videos").delete().eq("id", v.id);
    setBusy((b) => ({ ...b, [v.id]: false }));
    if (error) {
      toast({ title: isTr ? "Hata" : "Error", description: "İşlem başarısız oldu. Lütfen tekrar deneyin.", variant: "destructive" });
      return;
    }
    setVideos((arr) => arr.filter((x) => x.id !== v.id));
    toast({ title: isTr ? "Silindi" : "Deleted" });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)} />
      {!isMobile && <Sidebar collapsed={sidebarCollapsed} />}
      <main className={cn(
        "pt-14 transition-all duration-200 min-h-screen",
        isMobile ? "ml-0 pb-16" : sidebarCollapsed ? "ml-[72px]" : "ml-56"
      )}>
        <div className="p-4 md:p-8 max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <SlidersHorizontal className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{isTr ? "Videolarımı Yönet" : "Manage My Videos"}</h1>
              <p className="text-sm text-muted-foreground">
                {isTr ? "Videolarını sil veya gizle." : "Delete or hide your videos."}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : videos.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground m3-surface p-10">
              {isTr ? "Henüz video yüklemedin." : "No videos uploaded yet."}
            </div>
          ) : (
            <div className="space-y-3">
              {videos.map((v) => (
                <div key={v.id} className="m3-surface p-3 flex items-center gap-4">
                  <Link to={`/watch/${v.id}`} className="w-32 aspect-video rounded-lg overflow-hidden bg-muted flex-shrink-0">
                    <img src={getThumbnailUrl(v.thumbnail_url)} alt={v.title} className="w-full h-full object-cover" />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link to={`/watch/${v.id}`} className="font-semibold hover:text-primary line-clamp-1">{v.title}</Link>
                    <p className="text-xs text-muted-foreground">
                      {(v.views_count || 0).toLocaleString()} {isTr ? "görüntüleme" : "views"}
                      {" · "}
                      <span className={v.is_public ? "text-green-400" : "text-yellow-400"}>
                        {v.is_public ? (isTr ? "Yayında" : "Public") : (isTr ? "Gizli" : "Hidden")}
                      </span>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => toggleVisibility(v)} disabled={busy[v.id]}>
                      {v.is_public ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => removeVideo(v)} disabled={busy[v.id]}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <Footer />
      </main>
      {isMobile && <BottomNav />}
    </div>
  );
};

export default ManageVideos;