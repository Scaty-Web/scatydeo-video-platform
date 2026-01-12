import { Play, Clock, Eye } from "lucide-react";

interface VideoCardProps {
  title: string;
  thumbnail: string;
  duration: string;
  views: string;
  author: string;
  delay?: number;
}

const VideoCard = ({ title, thumbnail, duration, views, author, delay = 0 }: VideoCardProps) => {
  return (
    <div 
      className="group cursor-pointer animate-fade-in"
      style={{ animationDelay: `${delay}s` }}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video rounded-xl overflow-hidden bg-card mb-3">
        <img 
          src={thumbnail} 
          alt={title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Play Button */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
          <div className="w-14 h-14 rounded-full bg-primary/90 flex items-center justify-center shadow-glow transform scale-75 group-hover:scale-100 transition-transform duration-300">
            <Play className="w-6 h-6 text-primary-foreground fill-current ml-1" />
          </div>
        </div>
        
        {/* Duration Badge */}
        <div className="absolute bottom-2 right-2 px-2 py-1 bg-background/90 backdrop-blur-sm rounded-md text-xs font-medium flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {duration}
        </div>
        
        {/* Glow Border on Hover */}
        <div className="absolute inset-0 rounded-xl border-2 border-transparent group-hover:border-primary/50 group-hover:shadow-glow transition-all duration-300" />
      </div>

      {/* Info */}
      <div>
        <h3 className="font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors">
          {title}
        </h3>
        <p className="text-sm text-muted-foreground mt-1">{author}</p>
        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
          <Eye className="w-3 h-3" />
          <span>{views} görüntülenme</span>
        </div>
      </div>
    </div>
  );
};

export default VideoCard;
