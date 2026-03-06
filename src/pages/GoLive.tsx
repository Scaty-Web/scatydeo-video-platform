import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Copy, Radio, Eye, EyeOff, Video, StopCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const GoLive = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [rtmpUrl, setRtmpUrl] = useState("rtmp://your-server.com/live");
  const [playbackUrl, setPlaybackUrl] = useState("");
  const [chatEnabled, setChatEnabled] = useState(true);
  const [showStreamKey, setShowStreamKey] = useState(false);
  const [streamKey, setStreamKey] = useState("");
  const [streamId, setStreamId] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [existingStream, setExistingStream] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchExistingStream();
  }, [user]);

  const fetchExistingStream = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("streams")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      setStreamId(data.id);
      setTitle(data.title);
      setDescription(data.description || "");
      setThumbnailUrl(data.thumbnail_url || "");
      setRtmpUrl(data.rtmp_url);
      setStreamKey(data.stream_key);
      setPlaybackUrl(data.playback_url || "");
      setChatEnabled(data.chat_enabled);
      setIsLive(data.is_live);
      setExistingStream(true);
    }
  };

  const handleCreateStream = async () => {
    if (!user || !title.trim()) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("streams")
      .insert({
        user_id: user.id,
        title: title.trim(),
        description: description.trim() || null,
        thumbnail_url: thumbnailUrl.trim() || null,
        rtmp_url: rtmpUrl.trim(),
        playback_url: playbackUrl.trim() || null,
        chat_enabled: chatEnabled,
      })
      .select()
      .single();

    if (error) {
      toast({ title: t.common.error, description: error.message, variant: "destructive" });
    } else if (data) {
      setStreamId(data.id);
      setStreamKey(data.stream_key);
      setExistingStream(true);
      toast({ title: t.common.success, description: t.stream.streamCreated });
    }
    setLoading(false);
  };

  const handleUpdateStream = async () => {
    if (!streamId) return;
    setLoading(true);

    const { error } = await supabase
      .from("streams")
      .update({
        title: title.trim(),
        description: description.trim() || null,
        thumbnail_url: thumbnailUrl.trim() || null,
        rtmp_url: rtmpUrl.trim(),
        playback_url: playbackUrl.trim() || null,
        chat_enabled: chatEnabled,
      })
      .eq("id", streamId);

    if (error) {
      toast({ title: t.common.error, description: error.message, variant: "destructive" });
    } else {
      toast({ title: t.common.success, description: t.stream.streamUpdated });
    }
    setLoading(false);
  };

  const handleGoLive = async () => {
    if (!streamId) return;
    setLoading(true);

    const { error } = await supabase
      .from("streams")
      .update({ is_live: true, started_at: new Date().toISOString() })
      .eq("id", streamId);

    if (error) {
      toast({ title: t.common.error, description: error.message, variant: "destructive" });
    } else {
      setIsLive(true);
      toast({ title: t.common.success, description: t.stream.nowLive });
    }
    setLoading(false);
  };

  const handleStopStream = async () => {
    if (!streamId) return;
    setLoading(true);

    const { error } = await supabase
      .from("streams")
      .update({ is_live: false, ended_at: new Date().toISOString() })
      .eq("id", streamId);

    if (error) {
      toast({ title: t.common.error, description: error.message, variant: "destructive" });
    } else {
      setIsLive(false);
      toast({ title: t.common.success, description: t.stream.streamEnded });
    }
    setLoading(false);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: t.common.success, description: `${label} ${t.stream.copied}` });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8 pt-24">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold mb-8 flex items-center gap-3">
            <Radio className="w-8 h-8 text-red-500" />
            {t.stream.goLive}
            {isLive && (
              <span className="px-3 py-1 bg-red-500 text-white text-sm rounded-full animate-pulse">
                {t.stream.live}
              </span>
            )}
          </h1>

          <div className="space-y-6">
            {/* Stream Info */}
            <div className="glass-card p-6 rounded-xl space-y-4">
              <h2 className="text-xl font-semibold">{t.stream.streamInfo}</h2>

              <div className="space-y-2">
                <Label>{t.stream.streamTitle}</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t.stream.streamTitlePlaceholder}
                  className="bg-background/50 border-primary/30"
                />
              </div>

              <div className="space-y-2">
                <Label>{t.stream.streamDescription}</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t.stream.streamDescriptionPlaceholder}
                  className="bg-background/50 border-primary/30 min-h-[80px]"
                />
              </div>

              <div className="space-y-2">
                <Label>{t.stream.thumbnailUrl}</Label>
                <Input
                  value={thumbnailUrl}
                  onChange={(e) => setThumbnailUrl(e.target.value)}
                  placeholder="https://example.com/thumbnail.jpg"
                  className="bg-background/50 border-primary/30"
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>{t.stream.enableChat}</Label>
                <Switch checked={chatEnabled} onCheckedChange={setChatEnabled} />
              </div>
            </div>

            {/* RTMP Settings */}
            <div className="glass-card p-6 rounded-xl space-y-4">
              <h2 className="text-xl font-semibold">{t.stream.rtmpSettings}</h2>

              <div className="space-y-2">
                <Label>{t.stream.rtmpUrl}</Label>
                <div className="flex gap-2">
                  <Input
                    value={rtmpUrl}
                    onChange={(e) => setRtmpUrl(e.target.value)}
                    placeholder="rtmp://your-server.com/live"
                    className="bg-background/50 border-primary/30"
                  />
                  <Button variant="outline" size="icon" onClick={() => copyToClipboard(rtmpUrl, "RTMP URL")}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t.stream.playbackUrl}</Label>
                <Input
                  value={playbackUrl}
                  onChange={(e) => setPlaybackUrl(e.target.value)}
                  placeholder="https://your-server.com/live/stream.m3u8"
                  className="bg-background/50 border-primary/30"
                />
                <p className="text-xs text-muted-foreground">{t.stream.playbackUrlHint}</p>
              </div>

              {existingStream && (
                <div className="space-y-2">
                  <Label>{t.stream.streamKey}</Label>
                  <div className="flex gap-2">
                    <Input
                      value={showStreamKey ? streamKey : "••••••••••••••••"}
                      readOnly
                      className="bg-background/50 border-primary/30 font-mono"
                    />
                    <Button variant="outline" size="icon" onClick={() => setShowStreamKey(!showStreamKey)}>
                      {showStreamKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => copyToClipboard(streamKey, t.stream.streamKey)}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">{t.stream.streamKeyHint}</p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3">
              {!existingStream ? (
                <Button variant="hero" onClick={handleCreateStream} disabled={loading || !title.trim()}>
                  <Video className="w-4 h-4 mr-2" />
                  {t.stream.createStream}
                </Button>
              ) : (
                <>
                  <Button variant="outline" onClick={handleUpdateStream} disabled={loading}>
                    {t.stream.updateStream}
                  </Button>
                  {!isLive ? (
                    <Button variant="hero" onClick={handleGoLive} disabled={loading}>
                      <Radio className="w-4 h-4 mr-2" />
                      {t.stream.startStream}
                    </Button>
                  ) : (
                    <>
                      <Button variant="destructive" onClick={handleStopStream} disabled={loading}>
                        <StopCircle className="w-4 h-4 mr-2" />
                        {t.stream.stopStream}
                      </Button>
                      <Button variant="outline" onClick={() => navigate(`/live/${streamId}`)}>
                        {t.stream.viewStream}
                      </Button>
                    </>
                  )}
                </>
              )}
            </div>

            {/* OBS Instructions */}
            {existingStream && (
              <div className="glass-card p-6 rounded-xl space-y-3">
                <h2 className="text-xl font-semibold">{t.stream.obsInstructions}</h2>
                <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                  <li>{t.stream.obsStep1}</li>
                  <li>{t.stream.obsStep2}</li>
                  <li>{t.stream.obsStep3}</li>
                  <li>{t.stream.obsStep4}</li>
                  <li>{t.stream.obsStep5}</li>
                </ol>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default GoLive;
