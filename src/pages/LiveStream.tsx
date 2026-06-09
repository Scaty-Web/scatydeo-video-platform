import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { rtdb } from "@/integrations/firebase/client";
import { ref as fbRef, set as fbSet, remove as fbRemove, onValue, push as fbPush, serverTimestamp } from "firebase/database";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Radio,
  Monitor,
  Video,
  Play,
  Pause,
  Square,
  MessageSquare,
  MessageSquareOff,
  AlertTriangle,
  Save,
  Trash2,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";

type SourceType = "none" | "video" | "screen";

const LiveStream = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [title, setTitle] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [sourceType, setSourceType] = useState<SourceType>("none");
  const [chatEnabled, setChatEnabled] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [streamId, setStreamId] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordedBlobRef = useRef<Blob | null>(null);
  const broadcastIntervalRef = useRef<number | null>(null);
  const broadcastCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopScreenShare();
      if (broadcastIntervalRef.current) {
        clearInterval(broadcastIntervalRef.current);
        broadcastIntervalRef.current = null;
      }
      if (streamId) {
        stopBroadcast(streamId);
        supabase.from("streams").update({ is_live: false, ended_at: new Date().toISOString() }).eq("id", streamId).then(() => {});
      }
    };
  }, [streamId]);

  const stopScreenShare = () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  };

  const handleSelectVideo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !videoRef.current) return;

    stopScreenShare();
    const url = URL.createObjectURL(file);
    videoRef.current.srcObject = null;
    videoRef.current.src = url;
    videoRef.current.load();
    try {
      await videoRef.current.play();
      setIsPlaying(true);
    } catch {
      setIsPlaying(false);
    }
    setSourceType("video");
  };

  const handleShareScreen = async () => {
    // First, stop any existing screen share
    stopScreenShare();

    let stream: MediaStream;
    try {
      // getDisplayMedia must be called directly in gesture handler
      stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: "always" } as any,
        audio: true,
      });
    } catch (err: any) {
      // User cancelled or browser denied
      if (err?.name === "NotAllowedError" || err?.name === "AbortError") {
        // User cancelled the picker — not an error
        return;
      }
      console.error("Screen share error:", err);
      toast({
        title: t.common.error,
        description: t.stream.screenShareError,
        variant: "destructive",
      });
      return;
    }

    screenStreamRef.current = stream;

    if (videoRef.current) {
      videoRef.current.src = "";
      videoRef.current.srcObject = stream;
      try {
        await videoRef.current.play();
      } catch {
        // autoplay may fail silently
      }
      setIsPlaying(true);
    }

    setSourceType("screen");

    // Start recording
    recordedChunksRef.current = [];
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : MediaRecorder.isTypeSupported("video/webm")
        ? "video/webm"
        : "";
    
    const recorderOptions: MediaRecorderOptions = mimeType ? { mimeType } : {};
    try {
      const recorder = new MediaRecorder(stream, recorderOptions);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: mimeType || "video/webm" });
        recordedBlobRef.current = blob;
      };
      recorder.start(1000);
      mediaRecorderRef.current = recorder;
    } catch (recErr) {
      console.error("MediaRecorder error:", recErr);
    }

    // Listen for user stopping share via browser UI
    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.onended = () => {
        handleStopSharing();
      };
    }
  };

  const handleStopSharing = () => {
    stopScreenShare();
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.src = "";
    }
    setSourceType("none");
    setIsPlaying(false);
  };

  const togglePlay = () => {
    if (!videoRef.current || sourceType !== "video") return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleStartStream = async () => {
    if (!user) return;
    if (sourceType === "none") {
      toast({
        title: t.stream.noSource,
        description: t.stream.noSourceDesc,
        variant: "destructive",
      });
      return;
    }
    if (!title.trim()) {
      toast({
        title: t.upload.titleRequired,
        description: t.upload.titleRequiredDesc,
        variant: "destructive",
      });
      return;
    }

    // Create stream record in DB
    const { data: streamData, error } = await supabase.from("streams").insert({
      title: title.trim(),
      user_id: user.id,
      is_live: true,
      chat_enabled: chatEnabled,
      started_at: new Date().toISOString(),
    }).select("id").single();

    if (error) {
      toast({ title: t.common.error, description: "İşlem başarısız oldu. Lütfen tekrar deneyin.", variant: "destructive" });
      return;
    }

    setStreamId(streamData.id);

    // If video source, start recording it too
    if (sourceType === "video" && videoRef.current) {
      const stream = (videoRef.current as any).captureStream?.() || (videoRef.current as any).mozCaptureStream?.();
      if (stream) {
        recordedChunksRef.current = [];
        const recorder = new MediaRecorder(stream, {
          mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
            ? "video/webm;codecs=vp9"
            : "video/webm",
        });
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) recordedChunksRef.current.push(e.data);
        };
        recorder.onstop = () => {
          const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
          recordedBlobRef.current = blob;
        };
        recorder.start(1000);
        mediaRecorderRef.current = recorder;
      }
    }

    setIsStreaming(true);
    startBroadcast(streamData.id);
  };

  // Broadcast video frames to Firebase RTDB at ~2fps
  const startBroadcast = (sid: string) => {
    if (!videoRef.current) return;
    const canvas = broadcastCanvasRef.current ?? document.createElement("canvas");
    broadcastCanvasRef.current = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const frameRef = fbRef(rtdb, `streams/${sid}/frame`);
    const metaRef = fbRef(rtdb, `streams/${sid}/meta`);
    fbSet(metaRef, { isLive: true, startedAt: serverTimestamp(), title: title.trim() });

    const tick = () => {
      const v = videoRef.current;
      if (!v || v.readyState < 2) return;
      const w = v.videoWidth || 640;
      const h = v.videoHeight || 360;
      const scale = Math.min(1, 640 / w);
      canvas.width = Math.floor(w * scale);
      canvas.height = Math.floor(h * scale);
      try {
        ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.6);
        fbSet(frameRef, { data: dataUrl, ts: Date.now() });
      } catch {
        // skip frame
      }
    };
    broadcastIntervalRef.current = window.setInterval(tick, 500);
  };

  const stopBroadcast = async (sid: string | null) => {
    if (broadcastIntervalRef.current) {
      clearInterval(broadcastIntervalRef.current);
      broadcastIntervalRef.current = null;
    }
    if (sid) {
      try {
        await fbRemove(fbRef(rtdb, `streams/${sid}/frame`));
        await fbSet(fbRef(rtdb, `streams/${sid}/meta`), { isLive: false, endedAt: Date.now() });
      } catch {
        // ignore
      }
    }
  };

  const handleEndStream = async () => {
    // Stop recorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }

    await stopBroadcast(streamId);

    // Update stream record
    if (streamId) {
      await supabase.from("streams").update({
        is_live: false,
        ended_at: new Date().toISOString(),
      }).eq("id", streamId);
    }

    setIsStreaming(false);
    setShowSaveDialog(true);
  };

  // Update chat_enabled in DB when toggled during stream
  const handleToggleChat = async () => {
    const newValue = !chatEnabled;
    setChatEnabled(newValue);
    if (streamId) {
      await supabase.from("streams").update({ chat_enabled: newValue }).eq("id", streamId);
    }
  };

  const handleSaveRecording = async () => {
    if (!user || !recordedBlobRef.current) {
      setShowSaveDialog(false);
      return;
    }

    setSaving(true);
    try {
      const videoPath = `${user.id}/${Date.now()}.webm`;
      const { error: uploadError } = await supabase.storage
        .from("videos")
        .upload(videoPath, recordedBlobRef.current);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("videos").getPublicUrl(videoPath);

      await supabase.from("videos").insert({
        title: title.trim() || "Live Stream Recording",
        description: `Live stream recording`,
        video_url: urlData.publicUrl,
        user_id: user.id,
        is_public: true,
      });

      toast({ title: t.stream.saved, description: t.stream.savedDesc });
    } catch (err: any) {
      toast({ title: t.common.error, description: "İşlem başarısız oldu. Lütfen tekrar deneyin.", variant: "destructive" });
    } finally {
      setSaving(false);
      cleanup();
      setShowSaveDialog(false);
    }
  };

  const handleDontSave = async () => {
    // Delete the stream record entirely
    if (streamId) {
      await supabase.from("streams").delete().eq("id", streamId);
    }
    toast({ title: t.stream.deleted, description: t.stream.deletedDesc });
    cleanup();
    setShowSaveDialog(false);
  };

  const cleanup = () => {
    stopScreenShare();
    recordedBlobRef.current = null;
    recordedChunksRef.current = [];
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.src = "";
    }
    setSourceType("none");
    setIsPlaying(false);
    setTitle("");
    setStreamId(null);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <AlertTriangle className="w-16 h-16 text-primary mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">{t.stream.signInRequired}</h1>
          <p className="text-muted-foreground mb-6">{t.stream.signInToStream}</p>
          <Button variant="hero" onClick={() => navigate("/auth")}>
            {t.common.signIn}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-4 shadow-glow">
              <Radio className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-bold">{t.stream.title}</h1>
          </div>

          {/* Title input */}
          {!isStreaming && (
            <div className="mb-6 max-w-md mx-auto">
              <Label>{t.stream.streamTitle}</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t.stream.streamTitlePlaceholder}
                className="bg-muted/30 border-primary/30 mt-1"
                maxLength={100}
              />
            </div>
          )}

          {/* Video preview */}
          <div className="relative bg-black rounded-xl overflow-hidden aspect-video mb-6">
            <video
              ref={videoRef}
              className="w-full h-full object-contain"
              playsInline
              autoPlay
              muted
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />

            {sourceType === "none" && (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-muted-foreground">{t.stream.noSourceDesc}</p>
              </div>
            )}

            {isStreaming && (
              <div className="absolute top-4 left-4 bg-destructive text-destructive-foreground px-3 py-1 rounded-md text-sm font-bold animate-pulse">
                🔴 {t.stream.live}
              </div>
            )}

            {/* Play/Pause overlay for video source */}
            {sourceType === "video" && isStreaming && (
              <button
                onClick={togglePlay}
                className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/20 transition-colors group"
              >
                {isPlaying ? (
                  <Pause className="w-16 h-16 text-white opacity-0 group-hover:opacity-80 transition-opacity" />
                ) : (
                  <Play className="w-16 h-16 text-white opacity-80" />
                )}
              </button>
            )}
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            {!isStreaming && (
              <>
                <div>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleSelectVideo}
                    className="hidden"
                    id="stream-video-input"
                  />
                  <label htmlFor="stream-video-input">
                    <Button variant={sourceType === "video" ? "default" : "outline"} asChild>
                      <span className="cursor-pointer">
                        <Video className="w-4 h-4 mr-2" />
                        {t.stream.selectVideo}
                      </span>
                    </Button>
                  </label>
                </div>

                {sourceType === "screen" ? (
                  <Button variant="destructive" onClick={handleStopSharing}>
                    <Square className="w-4 h-4 mr-2" />
                    {t.stream.stopSharing}
                  </Button>
                ) : (
                  <Button variant="outline" onClick={handleShareScreen}>
                    <Monitor className="w-4 h-4 mr-2" />
                    {t.stream.shareScreen}
                  </Button>
                )}
              </>
            )}

            {sourceType === "video" && !isStreaming && (
              <Button variant="outline" onClick={togglePlay}>
                {isPlaying ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                {isPlaying ? t.stream.paused : t.stream.playing}
              </Button>
            )}

            {isStreaming && (
              <Button
                variant={chatEnabled ? "default" : "outline"}
                onClick={handleToggleChat}
              >
                {chatEnabled ? (
                  <MessageSquare className="w-4 h-4 mr-2" />
                ) : (
                  <MessageSquareOff className="w-4 h-4 mr-2" />
                )}
                {chatEnabled ? t.stream.disableChat : t.stream.enableChat}
              </Button>
            )}

            {!isStreaming ? (
              <Button variant="hero" onClick={handleStartStream}>
                <Radio className="w-4 h-4 mr-2" />
                {t.stream.startStream}
              </Button>
            ) : (
              <Button variant="destructive" onClick={handleEndStream}>
                <Square className="w-4 h-4 mr-2" />
                {t.stream.endStream}
              </Button>
            )}
          </div>

          {/* Chat area */}
          {isStreaming && chatEnabled && (
            <div className="mt-6 border border-border rounded-xl p-4 max-w-md mx-auto">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                {t.stream.chat}
              </h3>
              <div className="h-48 bg-muted/20 rounded-lg flex items-center justify-center">
                <p className="text-sm text-muted-foreground">
                  {t.stream.chat} — {t.stream.live}
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Save dialog */}
      <AlertDialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.stream.streamEnded}</AlertDialogTitle>
            <AlertDialogDescription>{t.stream.saveRecording}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDontSave} disabled={saving}>
              <Trash2 className="w-4 h-4 mr-2" />
              {t.stream.dontSave}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleSaveRecording} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? t.common.loading : t.stream.saveBtn}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default LiveStream;
