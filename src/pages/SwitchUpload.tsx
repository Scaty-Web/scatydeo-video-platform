import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Video, Image as ImageIcon, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import SwitchLogo from "@/components/SwitchLogo";
import defaultCover from "@/assets/switch-default-cover.png";

const MAX_VIDEO_BYTES = 1024 * 1024 * 1024; // 1 GB
const MAX_DURATION = 60;
const MAX_COVER_BYTES = 5 * 1024 * 1024;

const SwitchUpload = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [duration, setDuration] = useState<number>(0);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const validateVideo = (
    file: File
  ): Promise<{ duration: number; vertical: boolean; unknown: boolean }> => {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const video = document.createElement("video");
      video.preload = "metadata";
      video.src = url;
      const cleanup = () => URL.revokeObjectURL(url);
      const timeout = setTimeout(() => {
        // Browser couldn't read metadata (e.g. some .MOV/HEVC). Allow upload.
        cleanup();
        resolve({ duration: 0, vertical: true, unknown: true });
      }, 4000);
      video.onloadedmetadata = () => {
        clearTimeout(timeout);
        const w = video.videoWidth || 0;
        const h = video.videoHeight || 0;
        const vertical = h >= w; // also accept square
        const dur = isFinite(video.duration) ? video.duration : 0;
        cleanup();
        resolve({ duration: dur, vertical, unknown: w === 0 || h === 0 });
      };
      video.onerror = () => {
        clearTimeout(timeout);
        cleanup();
        // Don't block upload on metadata-read failure
        resolve({ duration: 0, vertical: true, unknown: true });
      };
    });
  };

  const handleVideoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_VIDEO_BYTES) {
      toast({ title: t.switch.tooLargeFile, variant: "destructive" });
      return;
    }
    const { duration: dur, vertical, unknown } = await validateVideo(file);
    if (!unknown && !vertical) {
      toast({ title: t.switch.notVertical, variant: "destructive" });
      return;
    }
    if (!unknown && dur > MAX_DURATION + 0.5) {
      toast({ title: t.switch.tooLong, variant: "destructive" });
      return;
    }
    setDuration(dur);
    setVideoFile(file);
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_COVER_BYTES) {
      toast({ title: t.switch.coverTooLarge, variant: "destructive" });
      return;
    }
    setCoverFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !videoFile || !title.trim()) return;

    setUploading(true);
    setProgress(10);

    try {
      const ext = videoFile.name.split(".").pop() || "mp4";
      const path = `${user.id}/${Date.now()}.${ext}`;

      const { error: vErr } = await supabase.storage.from("switches").upload(path, videoFile);
      if (vErr) throw vErr;
      setProgress(60);

      const { data: vUrl } = supabase.storage.from("switches").getPublicUrl(path);

      let coverUrl: string | null = null;
      if (coverFile) {
        const cExt = coverFile.name.split(".").pop() || "jpg";
        const cPath = `${user.id}/cover-${Date.now()}.${cExt}`;
        const { error: cErr } = await supabase.storage.from("switches").upload(cPath, coverFile);
        if (cErr) throw cErr;
        const { data: cUrl } = supabase.storage.from("switches").getPublicUrl(cPath);
        coverUrl = cUrl.publicUrl;
      }
      setProgress(85);

      const { data, error } = await supabase
        .from("switches")
        .insert({
          user_id: user.id,
          title: title.trim(),
          description: description.trim() || null,
          video_url: vUrl.publicUrl,
          cover_url: coverUrl,
          duration_seconds: duration,
          is_public: true,
        })
        .select()
        .single();

      if (error) throw error;
      setProgress(100);

      toast({ title: t.switch.uploadOk });
      navigate(`/switch/${data.id}`);
    } catch (err: any) {
      console.error(err);
      toast({ title: t.switch.uploadErr, description: "İşlem başarısız oldu. Lütfen tekrar deneyin.", variant: "destructive" });
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <AlertTriangle className="w-16 h-16 text-primary mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">{t.switch.mustSignIn}</h1>
          <Button variant="hero" onClick={() => navigate("/auth")}>{t.common.signIn}</Button>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-24">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <div className="mx-auto mb-3 flex justify-center">
              <SwitchLogo size={56} />
            </div>
            <h1 className="text-3xl font-bold">{t.switch.uploadTitle}</h1>
            <p className="text-muted-foreground mt-2">{t.switch.uploadSubtitle}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">{t.switch.titleLabel} *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t.switch.titlePh}
                className="bg-muted/30 border-primary/30"
                maxLength={150}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="desc">{t.switch.descLabel}</Label>
              <Textarea
                id="desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t.switch.descPh}
                className="bg-muted/30 border-primary/30 min-h-[100px]"
                maxLength={2000}
              />
            </div>

            <div className="space-y-2">
              <Label>{t.switch.videoLabel} *</Label>
              <div className="border-2 border-dashed border-primary/30 rounded-xl p-8 text-center hover:border-primary/50 transition-colors">
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleVideoChange}
                  className="hidden"
                  id="switch-video"
                />
                <label htmlFor="switch-video" className="cursor-pointer">
                  {videoFile ? (
                    <div className="flex items-center justify-center gap-3">
                      <Video className="w-8 h-8 text-primary" />
                      <span>{videoFile.name} · {Math.round(duration)}s</span>
                    </div>
                  ) : (
                    <div>
                      <Video className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground">{t.switch.selectVideo}</p>
                    </div>
                  )}
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t.switch.coverLabel}</Label>
              <div className="border-2 border-dashed border-primary/30 rounded-xl p-6 text-center hover:border-primary/50 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleCoverChange}
                  className="hidden"
                  id="switch-cover"
                />
                <label htmlFor="switch-cover" className="cursor-pointer flex items-center justify-center gap-4">
                  <img
                    src={coverFile ? URL.createObjectURL(coverFile) : defaultCover}
                    alt="cover preview"
                    className="w-16 h-24 object-cover rounded-md"
                  />
                  <div className="text-left">
                    <p className="text-sm">{coverFile ? coverFile.name : t.switch.selectCover}</p>
                    <p className="text-xs text-muted-foreground">{t.switch.coverHint}</p>
                  </div>
                </label>
              </div>
            </div>

            {uploading && (
              <div className="space-y-2">
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-sm text-center text-muted-foreground">{t.switch.uploading} %{progress}</p>
              </div>
            )}

            <Button
              type="submit"
              variant="hero"
              size="lg"
              className="w-full"
              disabled={uploading || !title.trim() || !videoFile}
            >
              {uploading ? t.switch.uploading : t.switch.uploadBtn}
            </Button>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default SwitchUpload;
