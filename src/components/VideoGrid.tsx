import { AlertTriangle, Video, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/useLanguage";
import VideoCard from "./VideoCard";

const VideoGrid = () => {
  const { t } = useLanguage();
  
  const { data: videos, isLoading } = useQuery({
    queryKey: ['public-videos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('videos')
        .select(`
          id,
          title,
          thumbnail_url,
          duration,
          views_count,
          user_id,
          created_at,
          profiles:user_id (
            username,
            display_name
          )
        `)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(12);

      if (error) throw error;
      return data;
    }
  });

  const formatViews = (count: number | null) => {
    if (!count) return "0";
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  return (
    <section id="videos" className="py-20 relative">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-10">
          <h2 className="font-display text-3xl md:text-4xl font-bold">
            <span className="glow-text">{t.videoGrid.title}</span> {t.videoGrid.titleHighlight}
          </h2>
          <p className="text-muted-foreground mt-2">{t.videoGrid.subtitle}</p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {/* Videos Grid */}
        {!isLoading && videos && videos.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {videos.map((video, index) => (
              <VideoCard
                key={video.id}
                videoId={video.id}
                title={video.title}
                thumbnail={video.thumbnail_url || '/placeholder.svg'}
                duration={video.duration || '0:00'}
                views={formatViews(video.views_count)}
                author={video.profiles?.display_name || video.profiles?.username || t.videoGrid.anonymous}
                delay={index * 0.1}
              />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && (!videos || videos.length === 0) && (
          <>
            {/* Warning Banner */}
            <div className="max-w-2xl mx-auto mb-12 animate-fade-in">
              <div className="relative p-6 rounded-2xl border-2 border-primary/50 bg-primary/10 backdrop-blur-sm">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-accent/10 to-primary/20 rounded-2xl" />
                <div className="relative flex items-center gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-bold text-primary">
                      {t.videoGrid.warningTitle}
                    </h3>
                    <p className="text-muted-foreground text-sm mt-1">
                      {t.videoGrid.warningDesc}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-24 h-24 rounded-full bg-muted/50 flex items-center justify-center mb-6">
                <Video className="w-12 h-12 text-muted-foreground" />
              </div>
              <h3 className="font-display text-xl font-semibold text-muted-foreground mb-2">
                {t.videoGrid.emptyTitle}
              </h3>
              <p className="text-muted-foreground/70 max-w-md">
                {t.videoGrid.emptyDesc}
              </p>
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export default VideoGrid;
