import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Plus, Play, Globe, Lock, ListVideo } from "lucide-react";

interface PlaylistItem {
  id: string;
  title: string;
  is_public: boolean;
  created_at: string;
  video_count: number;
  first_thumbnail: string | null;
}

const Playlists = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [playlists, setPlaylists] = useState<PlaylistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newIsPublic, setNewIsPublic] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (user) fetchPlaylists();
    else setLoading(false);
  }, [user]);

  const fetchPlaylists = async () => {
    if (!user) return;

    const { data } = await supabase
      .from("playlists")
      .select("id, title, is_public, created_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (data) {
      // Get video counts and thumbnails
      const enriched = await Promise.all(
        data.map(async (pl) => {
          const { count } = await supabase
            .from("playlist_videos")
            .select("id", { count: "exact", head: true })
            .eq("playlist_id", pl.id);

          const { data: firstVid } = await supabase
            .from("playlist_videos")
            .select("videos:video_id (thumbnail_url)")
            .eq("playlist_id", pl.id)
            .order("position", { ascending: true })
            .limit(1)
            .maybeSingle();

          return {
            ...pl,
            video_count: count || 0,
            first_thumbnail: (firstVid as any)?.videos?.thumbnail_url || null,
          };
        })
      );
      setPlaylists(enriched);
    }
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!user || !newTitle.trim()) return;
    setCreating(true);

    const { error } = await supabase
      .from("playlists")
      .insert({ user_id: user.id, title: newTitle.trim(), is_public: newIsPublic });

    if (!error) {
      toast({ title: t.playlist.created, description: t.playlist.createdDesc });
      setNewTitle("");
      setCreateOpen(false);
      fetchPlaylists();
    }
    setCreating(false);
  };

  if (!user) {
    return (
      <div className="md2-scope min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-bold mb-4">{t.playlist.myPlaylists}</h1>
          <p className="text-muted-foreground mb-6">{t.playlist.signInRequired}</p>
          <Link to="/auth">
            <Button>{t.common.signIn}</Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="md2-scope min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-8 pt-20">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">{t.playlist.myPlaylists}</h1>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                {t.playlist.createNew}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t.playlist.createPlaylist}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder={t.playlist.titlePlaceholder}
                  maxLength={100}
                />
                <div className="flex items-center justify-between">
                  <span className="text-sm">{t.playlist.publicLabel}</span>
                  <Switch checked={newIsPublic} onCheckedChange={setNewIsPublic} />
                </div>
                <Button
                  onClick={handleCreate}
                  disabled={!newTitle.trim() || creating}
                  className="w-full"
                >
                  {t.playlist.createBtn}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : playlists.length === 0 ? (
          <div className="text-center py-16">
            <ListVideo className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">{t.playlist.noPlaylists}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {playlists.map((pl) => (
              <Link
                key={pl.id}
                to={`/playlist/${pl.id}`}
                className="group rounded-xl overflow-hidden bg-muted/20 hover:bg-muted/40 transition-colors"
              >
                <div className="aspect-video relative bg-muted">
                  {pl.first_thumbnail ? (
                    <img
                      src={pl.first_thumbnail}
                      alt={pl.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ListVideo className="w-10 h-10 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute inset-y-0 right-0 w-1/3 bg-black/60 flex flex-col items-center justify-center text-white">
                    <span className="text-lg font-bold">{pl.video_count}</span>
                    <Play className="w-5 h-5 fill-white" />
                  </div>
                </div>
                <div className="p-3">
                  <h3 className="font-medium text-sm line-clamp-2">{pl.title}</h3>
                  <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                    {pl.is_public ? (
                      <Globe className="w-3 h-3" />
                    ) : (
                      <Lock className="w-3 h-3" />
                    )}
                    <span>
                      {pl.is_public ? t.playlist.publicLabel : t.playlist.privateLabel}
                    </span>
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

export default Playlists;
