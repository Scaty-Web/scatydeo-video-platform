import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ListPlus, Plus, Lock, Globe } from "lucide-react";

interface Playlist {
  id: string;
  title: string;
  is_public: boolean;
}

interface AddToPlaylistDialogProps {
  videoId: string;
  trigger?: React.ReactNode;
}

const AddToPlaylistDialog = ({ videoId, trigger }: AddToPlaylistDialogProps) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [videoInPlaylists, setVideoInPlaylists] = useState<Set<string>>(new Set());
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newIsPublic, setNewIsPublic] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && user) {
      fetchPlaylists();
    }
  }, [open, user]);

  const fetchPlaylists = async () => {
    if (!user) return;

    const { data: playlistData } = await supabase
      .from("playlists")
      .select("id, title, is_public")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (playlistData) {
      setPlaylists(playlistData);

      const { data: pvData } = await supabase
        .from("playlist_videos")
        .select("playlist_id")
        .eq("video_id", videoId)
        .in("playlist_id", playlistData.map((p) => p.id));

      if (pvData) {
        setVideoInPlaylists(new Set(pvData.map((pv) => pv.playlist_id)));
      }
    }
  };

  const togglePlaylist = async (playlistId: string) => {
    if (!user) return;

    if (videoInPlaylists.has(playlistId)) {
      await supabase
        .from("playlist_videos")
        .delete()
        .eq("playlist_id", playlistId)
        .eq("video_id", videoId);

      setVideoInPlaylists((prev) => {
        const next = new Set(prev);
        next.delete(playlistId);
        return next;
      });
    } else {
      const { data: maxPos } = await supabase
        .from("playlist_videos")
        .select("position")
        .eq("playlist_id", playlistId)
        .order("position", { ascending: false })
        .limit(1)
        .maybeSingle();

      const nextPosition = (maxPos?.position ?? -1) + 1;

      await supabase
        .from("playlist_videos")
        .insert({ playlist_id: playlistId, video_id: videoId, position: nextPosition });

      setVideoInPlaylists((prev) => new Set(prev).add(playlistId));
    }
  };

  const createPlaylist = async () => {
    if (!user || !newTitle.trim()) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("playlists")
      .insert({
        user_id: user.id,
        title: newTitle.trim(),
        is_public: newIsPublic,
      })
      .select("id, title, is_public")
      .single();

    if (!error && data) {
      // Add the video to the new playlist
      await supabase
        .from("playlist_videos")
        .insert({ playlist_id: data.id, video_id: videoId, position: 0 });

      setPlaylists((prev) => [data, ...prev]);
      setVideoInPlaylists((prev) => new Set(prev).add(data.id));
      setNewTitle("");
      setShowCreate(false);
      toast({ title: t.playlist.created, description: t.playlist.createdDesc });
    }
    setLoading(false);
  };

  if (!user) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={() =>
          toast({
            title: t.common.signIn,
            description: t.playlist.signInRequired,
            variant: "destructive",
          })
        }
      >
        {trigger || (
          <>
            <ListPlus className="w-4 h-4" />
            {t.playlist.save}
          </>
        )}
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ? (
          <Button variant="outline" size="sm" className="gap-2">
            {trigger}
          </Button>
        ) : (
          <Button variant="outline" size="sm" className="gap-2">
            <ListPlus className="w-4 h-4" />
            {t.playlist.save}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t.playlist.saveToPlaylist}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 max-h-60 overflow-y-auto">
          {playlists.length === 0 && !showCreate && (
            <p className="text-sm text-muted-foreground text-center py-4">
              {t.playlist.noPlaylists}
            </p>
          )}
          {playlists.map((playlist) => (
            <label
              key={playlist.id}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer"
            >
              <Checkbox
                checked={videoInPlaylists.has(playlist.id)}
                onCheckedChange={() => togglePlaylist(playlist.id)}
              />
              <span className="flex-1 text-sm truncate">{playlist.title}</span>
              {playlist.is_public ? (
                <Globe className="w-3.5 h-3.5 text-muted-foreground" />
              ) : (
                <Lock className="w-3.5 h-3.5 text-muted-foreground" />
              )}
            </label>
          ))}
        </div>

        {showCreate ? (
          <div className="space-y-3 border-t pt-3">
            <Input
              placeholder={t.playlist.titlePlaceholder}
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              maxLength={100}
            />
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox
                checked={!newIsPublic}
                onCheckedChange={(checked) => setNewIsPublic(!checked)}
              />
              <Lock className="w-3.5 h-3.5" />
              {t.playlist.private}
            </label>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setShowCreate(false)}>
                {t.common.cancel}
              </Button>
              <Button
                size="sm"
                onClick={createPlaylist}
                disabled={!newTitle.trim() || loading}
              >
                {t.playlist.createBtn}
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 w-full"
            onClick={() => setShowCreate(true)}
          >
            <Plus className="w-4 h-4" />
            {t.playlist.createNew}
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AddToPlaylistDialog;
