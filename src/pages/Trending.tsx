import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import BottomNav from "@/components/BottomNav";
import VideoCard from "@/components/VideoCard";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/useLanguage";
import { useIsMobile } from "@/hooks/use-mobile";
import { Flame } from "lucide-react";

const Trending = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { language } = useLanguage();
  const isMobile = useIsMobile();

  const { data: videos, isLoading } = useQuery({
    queryKey: ["trending-videos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("videos")
        .select("*, profiles:user_id(username, display_name, avatar_url)")
        .eq("is_public", true)
        .gte("views_count", 10)
        .order("views_count", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)} />
      {!isMobile && <Sidebar collapsed={sidebarCollapsed} />}
      <main
        className={cn(
          "pt-14 transition-all duration-200 min-h-screen",
          isMobile ? "ml-0 pb-16" : sidebarCollapsed ? "ml-[72px]" : "ml-56"
        )}
      >
        <div className="p-4 md:p-6">
          <div className="flex items-center gap-3 mb-6">
            <Flame className="w-6 h-6 text-destructive" />
            <h1 className="text-2xl font-bold text-foreground">
              {language === "tr" ? "Trendler" : "Trending"}
            </h1>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-video bg-muted rounded-xl mb-3" />
                  <div className="flex gap-3">
                    <div className="w-9 h-9 rounded-full bg-muted flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded w-3/4" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : videos && videos.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {videos.map((video: any) => (
                <VideoCard
                  key={video.id}
                  videoId={video.id}
                  title={video.title}
                  thumbnail={video.thumbnail_url || "/placeholder.svg"}
                  author={video.profiles?.display_name || video.profiles?.username || "Unknown"}
                  authorAvatar={video.profiles?.avatar_url}
                  authorUsername={video.profiles?.username}
                  views={String(video.views_count || 0)}
                  createdAt={video.created_at || ""}
                  duration={video.duration || "0:00"}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Flame className="w-16 h-16 mb-4 opacity-30" />
              <p className="text-lg">
                {language === "tr"
                  ? "Henüz trend video yok"
                  : "No trending videos yet"}
              </p>
              <p className="text-sm mt-1">
                {language === "tr"
                  ? "10 ve üzeri izlenmeye ulaşan videolar burada görünecek"
                  : "Videos with 10 or more views will appear here"}
              </p>
            </div>
          )}
        </div>
      </main>
      {isMobile && <BottomNav />}
    </div>
  );
};

export default Trending;
