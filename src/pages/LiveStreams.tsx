import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/useLanguage";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import { Radio, Eye, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface LiveStreamItem {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  user_id: string;
  viewer_count: number;
  started_at: string | null;
  chat_enabled: boolean;
}

const LiveStreams = () => {
  const { t, language } = useLanguage();
  const [streams, setStreams] = useState<LiveStreamItem[]>([]);
  const [profiles, setProfiles] = useState<Record<string, { username: string | null; avatar_url: string | null }>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLiveStreams();
  }, []);

  const fetchLiveStreams = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("streams_public")
      .select("*")
      .eq("is_live", true)
      .order("viewer_count", { ascending: false });

    if (!error && data) {
      setStreams(data as unknown as LiveStreamItem[]);
      // Fetch profiles
      const userIds = [...new Set(data.map((s: any) => s.user_id).filter(Boolean))];
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, username, avatar_url")
          .in("id", userIds);
        if (profilesData) {
          const map: Record<string, { username: string | null; avatar_url: string | null }> = {};
          profilesData.forEach((p) => { map[p.id] = { username: p.username, avatar_url: p.avatar_url }; });
          setProfiles(map);
        }
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Sidebar />
      <main className="ml-56 pt-14 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-destructive to-primary flex items-center justify-center">
              <Radio className="w-5 h-5 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold">
              {language === "tr" ? "Canlı Yayınlar" : "Live Streams"}
            </h1>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : streams.length === 0 ? (
            <div className="text-center py-20">
              <Radio className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">
                {language === "tr" ? "Şu anda canlı yayın yok" : "No live streams right now"}
              </h2>
              <p className="text-muted-foreground">
                {language === "tr" ? "Daha sonra tekrar kontrol edin." : "Check back later."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {streams.map((stream) => {
                const profile = profiles[stream.user_id];
                return (
                  <Link
                    key={stream.id}
                    to={`/live/${stream.id}`}
                    className="group rounded-xl border border-border bg-card hover:bg-accent/50 transition-colors overflow-hidden"
                  >
                    <div className="aspect-video bg-muted relative flex items-center justify-center">
                      {stream.thumbnail_url ? (
                        <img src={stream.thumbnail_url} alt={stream.title} className="w-full h-full object-cover" />
                      ) : (
                        <Radio className="w-12 h-12 text-muted-foreground" />
                      )}
                      <Badge variant="destructive" className="absolute top-2 left-2 animate-pulse">
                        🔴 {t.stream.live}
                      </Badge>
                      <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {stream.viewer_count} {t.stream.viewers}
                      </div>
                    </div>
                    <div className="p-3">
                      <h3 className="font-semibold text-sm line-clamp-2 group-hover:text-primary transition-colors">
                        {stream.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <User className="w-3 h-3" />
                        {profile?.username || (language === "tr" ? "Anonim" : "Anonymous")}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default LiveStreams;
