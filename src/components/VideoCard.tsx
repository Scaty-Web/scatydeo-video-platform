import { Clock, Eye, User } from "lucide-react";
import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useLanguage } from "@/hooks/useLanguage";

interface VideoCardProps {
  title: string;
  thumbnail: string;
  duration: string;
  views: string;
  author: string;
  authorAvatar?: string;
  authorUsername?: string;
  createdAt?: string;
  delay?: number;
  videoId?: string;
}

const VideoCard = ({
  title,
  thumbnail,
  duration,
  views,
  author,
  authorAvatar,
  authorUsername,
  createdAt,
  delay = 0,
  videoId,
}: VideoCardProps) => {
  const { language } = useLanguage();

  const timeAgo = (dateStr?: string) => {
    if (!dateStr) return "";
    const now = new Date();
    const date = new Date(dateStr);
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diff < 60) return language === "tr" ? "Az önce" : "Just now";
    if (diff < 3600) {
      const m = Math.floor(diff / 60);
      return language === "tr" ? `${m} dakika önce` : `${m} minutes ago`;
    }
    if (diff < 86400) {
      const h = Math.floor(diff / 3600);
      return language === "tr" ? `${h} saat önce` : `${h} hours ago`;
    }
    if (diff < 2592000) {
      const d = Math.floor(diff / 86400);
      return language === "tr" ? `${d} gün önce` : `${d} days ago`;
    }
    if (diff < 31536000) {
      const mo = Math.floor(diff / 2592000);
      return language === "tr" ? `${mo} ay önce` : `${mo} months ago`;
    }
    const y = Math.floor(diff / 31536000);
    return language === "tr" ? `${y} yıl önce` : `${y} years ago`;
  };

  const content = (
    <div className="group cursor-pointer animate-fade-in" style={{ animationDelay: `${delay}s` }}>
      {/* Thumbnail */}
      <div className="relative aspect-video rounded-xl overflow-hidden bg-muted mb-3">
        <img
          src={thumbnail}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 bg-background/90 rounded text-xs font-medium">
          {duration}
        </div>
      </div>

      {/* Info row */}
      <div className="flex gap-3">
        {/* Channel avatar */}
        {authorUsername ? (
          <Link to={`/channel/${authorUsername}`} onClick={(e) => e.stopPropagation()}>
            <Avatar className="w-9 h-9 flex-shrink-0 mt-0.5">
              <AvatarImage src={authorAvatar || undefined} />
              <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                <User className="w-4 h-4" />
              </AvatarFallback>
            </Avatar>
          </Link>
        ) : (
          <Avatar className="w-9 h-9 flex-shrink-0 mt-0.5">
            <AvatarFallback className="bg-muted text-muted-foreground text-xs">
              <User className="w-4 h-4" />
            </AvatarFallback>
          </Avatar>
        )}

        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm text-foreground line-clamp-2 leading-5 group-hover:text-foreground">
            {title}
          </h3>
          <p className="text-xs text-muted-foreground mt-1 hover:text-foreground transition-colors">
            {author}
          </p>
          <p className="text-xs text-muted-foreground">
            {views} {language === "tr" ? "görüntülenme" : "views"}
            {createdAt && ` • ${timeAgo(createdAt)}`}
          </p>
        </div>
      </div>
    </div>
  );

  return videoId ? <Link to={`/watch/${videoId}`}>{content}</Link> : content;
};

export default VideoCard;
