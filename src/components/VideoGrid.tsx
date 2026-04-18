import { Video, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/useLanguage";
import VideoCard from "./VideoCard";

const VideoGrid = () => {
  const { t } = useLanguage();

  const { data: videos, isLoading } = useQuery({
    queryKey: ["public-videos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("videos")
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
            display_name,
            avatar_url
          )
        `)
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(24);

      if (error) throw error;
      return data;
    },
  });

  const formatViews = (count: number | null) => {
    if (!count) return "0";
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!videos || videos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-4">
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
          <Video className="w-10 h-10 text-muted-foreground" />
        </div>
        <h3 className="font-medium text-lg text-muted-foreground mb-1">
          {t.videoGrid.emptyTitle}
        </h3>
        <p className="text-sm text-muted-foreground/70 max-w-sm">
          {t.videoGrid.emptyDesc}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-6">
      {videos.map((video, index) => (
        <VideoCard
          key={video.id}
          videoId={video.id}
          title={video.title}
          thumbnail={video.thumbnail_url || ""}
          duration={video.duration || "0:00"}
          views={formatViews(video.views_count)}
          author={video.profiles?.display_name || video.profiles?.username || t.videoGrid.anonymous}
          authorAvatar={video.profiles?.avatar_url || undefined}
          authorUsername={video.profiles?.username || undefined}
          createdAt={video.created_at || undefined}
          delay={index * 0.05}
        />
      ))}
    </div>
  );
};

export default VideoGrid;
