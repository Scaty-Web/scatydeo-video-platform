import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/useLanguage";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Radio, Users, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface LiveStreamItem {
  id: string;
  title: string;
  thumbnail_url: string | null;
  viewer_count: number;
  user_id: string;
  started_at: string | null;
  profile?: { username: string | null; display_name: string | null; avatar_url: string | null };
}

const LiveStreams = () => {
  const { t } = useLanguage();
  const [streams, setStreams] = useState<LiveStreamItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLiveStreams();
  }, []);

  const fetchLiveStreams = async () => {
    const { data } = await supabase
      .from("streams")
      .select("*")
      .eq("is_live", true)
      .order("viewer_count", { ascending: false });

    if (data && data.length > 0) {
      const userIds = [...new Set(data.map(s => s.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .in("id", userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      setStreams(data.map(s => ({ ...s, profile: profileMap.get(s.user_id) || undefined })));
    } else {
      setStreams([]);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8 pt-24">
        <h1 className="text-3xl font-bold mb-8 flex items-center gap-3">
          <Radio className="w-8 h-8 text-red-500" />
          {t.stream.liveStreams}
        </h1>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : streams.length === 0 ? (
          <div className="text-center py-16">
            <Radio className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">{t.stream.noLiveStreams}</h2>
            <p className="text-muted-foreground">{t.stream.noLiveStreamsDesc}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {streams.map((stream) => (
              <Link key={stream.id} to={`/live/${stream.id}`} className="group">
                <div className="glass-card rounded-xl overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-glow">
                  <div className="relative aspect-video bg-muted">
                    {stream.thumbnail_url ? (
                      <img src={stream.thumbnail_url} alt={stream.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-red-500/20 to-primary/20">
                        <Radio className="w-12 h-12 text-red-500" />
                      </div>
                    )}
                    <div className="absolute top-2 left-2 flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-red-600 text-white text-xs font-semibold rounded-full flex items-center gap-1 animate-pulse">
                        <Radio className="w-3 h-3" />
                        {t.stream.live}
                      </span>
                    </div>
                    <div className="absolute bottom-2 right-2">
                      <span className="px-2 py-0.5 bg-black/70 text-white text-xs rounded-full flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {stream.viewer_count}
                      </span>
                    </div>
                  </div>
                  <div className="p-3">
                    <div className="flex items-start gap-3">
                      <Avatar className="w-8 h-8 flex-shrink-0">
                        <AvatarImage src={stream.profile?.avatar_url || undefined} />
                        <AvatarFallback><User className="w-4 h-4" /></AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-sm line-clamp-2">{stream.title}</h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          {stream.profile?.display_name || stream.profile?.username || t.videoGrid.anonymous}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default LiveStreams;
