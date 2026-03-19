import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
  Play,
  Trash2,
  Edit2,
  Globe,
  Lock,
  User,
  GripVertical,
  Eye,
  AlertTriangle,
} from "lucide-react";

interface PlaylistData {
  id: string;
  title: string;
  description: string | null;
  is_public: boolean;
  user_id: string;
  created_at: string;
  updated_at: string;
  profiles: {
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
}

interface PlaylistVideo {
  id: string;
  position: number;
  video_id: string;
  videos: {
    id: string;
    title: string;
    thumbnail_url: string | null;
    views_count: number;
    duration: string | null;
    created_at: string;
    user_id: string;
    profiles: {
      username: string;
      display_name: string;
    };
  };
}

const Playlist = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [playlist, setPlaylist] = useState<PlaylistData | null>(null);
  const [videos, setVideos] = useState<PlaylistVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editIsPublic, setEditIsPublic] = useState(true);

  const isOwner = user?.id === playlist?.user_id;

  useEffect(() => {
    if (id) {
      fetchPlaylist();
      fetchVideos();
    }
  }, [id]);

  const fetchPlaylist = async () => {
    const { data, error } = await supabase
      .from("playlists")
      .select(`
        *,
        profiles:user_id (username, display_name, avatar_url)
      `)
      .eq("id", id)
      .maybeSingle();

    if (!error && data) {
      setPlaylist(data as unknown as PlaylistData);
      setEditTitle(data.title);
      setEditDescription(data.description || "");
      setEditIsPublic(data.is_public);
    }
    setLoading(false);
  };

  const fetchVideos = async () => {
    const { data } = await supabase
      .from("playlist_videos")
      .select(`
        id, position, video_id,
        videos:video_id (
          id, title, thumbnail_url, views_count, duration, created_at, user_id,
          profiles:user_id (username, display_name)
        )
      `)
      .eq("playlist_id", id)
      .order("position", { ascending: true });

    if (data) {
      setVideos(data as unknown as PlaylistVideo[]);
    }
  };

  const handleUpdate = async () => {
    if (!editTitle.trim()) return;
    const { error } = await supabase
      .from("playlists")
      .update({
        title: editTitle.trim(),
        description: editDescription.trim() || null,
        is_public: editIsPublic,
      })
      .eq("id", id);

    if (!error) {
      setPlaylist((prev) =>
        prev
          ? { ...prev, title: editTitle.trim(), description: editDescription.trim() || null, is_public: editIsPublic }
          : null
      );
      setEditOpen(false);
      toast({ title: t.playlist.updated });
    }
  };

  const handleDelete = async () => {
    if (!confirm(t.playlist.deleteConfirm)) return;
    await supabase.from("playlists").delete().eq("id", id);
    toast({ title: t.playlist.deleted });
    navigate("/playlists");
  };

  const removeVideo = async (pvId: string) => {
    await supabase.from("playlist_videos").delete().eq("id", pvId);
    setVideos((prev) => prev.filter((v) => v.id !== pvId));
    toast({ title: t.playlist.videoRemoved });
  };

  const formatViews = (n: number) =>
    n >= 1000000
      ? `${(n / 1000000).toFixed(1)}M`
      : n >= 1000
      ? `${(n / 1000).toFixed(1)}K`
      : n.toString();

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <AlertTriangle className="w-16 h-16 text-primary mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">{t.playlist.notFound}</h1>
          <Link to="/">
            <Button>{t.common.goHome}</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Playlist Info Panel */}
          <div className="lg:col-span-1">
            <div className="bg-muted/30 rounded-xl p-6 sticky top-20 space-y-4">
              {/* Thumbnail */}
              {videos.length > 0 && videos[0].videos.thumbnail_url && (
                <div className="aspect-video rounded-lg overflow-hidden relative">
                  <img
                    src={videos[0].videos.thumbnail_url}
                    alt={playlist.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <Play className="w-12 h-12 text-white fill-white" />
                  </div>
                </div>
              )}

              <h1 className="text-xl font-bold">{playlist.title}</h1>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {playlist.is_public ? (
                  <Globe className="w-4 h-4" />
                ) : (
                  <Lock className="w-4 h-4" />
                )}
                <span>
                  {playlist.is_public ? t.playlist.publicLabel : t.playlist.privateLabel}
                </span>
                <span>·</span>
                <span>
                  {videos.length} {t.playlist.videosCount}
                </span>
              </div>

              {playlist.description && (
                <p className="text-sm text-muted-foreground">{playlist.description}</p>
              )}

              {/* Owner info */}
              <Link
                to={`/channel/${playlist.profiles.username}`}
                className="flex items-center gap-2 hover:opacity-80"
              >
                <Avatar className="w-8 h-8">
                  <AvatarImage src={playlist.profiles.avatar_url || undefined} />
                  <AvatarFallback>
                    <User className="w-4 h-4" />
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">
                  {playlist.profiles.display_name}
                </span>
              </Link>

              {/* Actions */}
              {isOwner && (
                <div className="flex gap-2">
                  <Dialog open={editOpen} onOpenChange={setEditOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2 flex-1">
                        <Edit2 className="w-4 h-4" />
                        {t.common.edit}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{t.playlist.editPlaylist}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <Input
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          placeholder={t.playlist.titlePlaceholder}
                          maxLength={100}
                        />
                        <Textarea
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          placeholder={t.playlist.descriptionPlaceholder}
                          maxLength={500}
                        />
                        <div className="flex items-center justify-between">
                          <span className="text-sm">{t.playlist.publicLabel}</span>
                          <Switch
                            checked={editIsPublic}
                            onCheckedChange={setEditIsPublic}
                          />
                        </div>
                        <Button onClick={handleUpdate} className="w-full">
                          {t.common.save}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="gap-2"
                    onClick={handleDelete}
                  >
                    <Trash2 className="w-4 h-4" />
                    {t.common.delete}
                  </Button>
                </div>
              )}

              {/* Play all */}
              {videos.length > 0 && (
                <Link to={`/watch/${videos[0].videos.id}?list=${playlist.id}`}>
                  <Button className="w-full gap-2">
                    <Play className="w-4 h-4 fill-current" />
                    {t.playlist.playAll}
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* Video List */}
          <div className="lg:col-span-2 space-y-2">
            {videos.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <p>{t.playlist.empty}</p>
              </div>
            ) : (
              videos.map((pv, index) => (
                <div
                  key={pv.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 group"
                >
                  <span className="text-sm text-muted-foreground w-6 text-center">
                    {index + 1}
                  </span>

                  <Link
                    to={`/watch/${pv.videos.id}?list=${playlist.id}`}
                    className="flex items-center gap-3 flex-1 min-w-0"
                  >
                    <div className="relative w-40 aspect-video rounded-lg overflow-hidden flex-shrink-0 bg-muted">
                      {pv.videos.thumbnail_url ? (
                        <img
                          src={pv.videos.thumbnail_url}
                          alt={pv.videos.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Play className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                      {pv.videos.duration && (
                        <span className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 rounded">
                          {pv.videos.duration}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm line-clamp-2">
                        {pv.videos.title}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        {pv.videos.profiles.display_name}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {formatViews(pv.videos.views_count || 0)} {t.common.views}
                      </p>
                    </div>
                  </Link>

                  {isOwner && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeVideo(pv.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Playlist;
