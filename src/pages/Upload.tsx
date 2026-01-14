import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Upload as UploadIcon, Video, Image, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Upload = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500 * 1024 * 1024) {
        toast({
          title: "Dosya Çok Büyük",
          description: "Video dosyası 500MB'dan küçük olmalıdır.",
          variant: "destructive",
        });
        return;
      }
      setVideoFile(file);
    }
  };

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Dosya Çok Büyük",
          description: "Thumbnail 5MB'dan küçük olmalıdır.",
          variant: "destructive",
        });
        return;
      }
      setThumbnailFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Giriş Yapın",
        description: "Video yüklemek için giriş yapmalısınız.",
        variant: "destructive",
      });
      return;
    }

    if (!title.trim()) {
      toast({
        title: "Başlık Gerekli",
        description: "Lütfen video için bir başlık girin.",
        variant: "destructive",
      });
      return;
    }

    if (!videoFile) {
      toast({
        title: "Video Gerekli",
        description: "Lütfen bir video dosyası seçin.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    setUploadProgress(10);

    try {
      let videoUrl = "";
      let thumbnailUrl = "";

      // Upload video
      const videoExt = videoFile.name.split(".").pop();
      const videoPath = `${user.id}/${Date.now()}.${videoExt}`;
      
      setUploadProgress(20);
      
      const { error: videoError } = await supabase.storage
        .from("videos")
        .upload(videoPath, videoFile);

      if (videoError) throw videoError;

      const { data: videoUrlData } = supabase.storage
        .from("videos")
        .getPublicUrl(videoPath);
      
      videoUrl = videoUrlData.publicUrl;
      setUploadProgress(60);

      // Upload thumbnail if provided
      if (thumbnailFile) {
        const thumbExt = thumbnailFile.name.split(".").pop();
        const thumbPath = `${user.id}/${Date.now()}.${thumbExt}`;
        
        const { error: thumbError } = await supabase.storage
          .from("thumbnails")
          .upload(thumbPath, thumbnailFile);

        if (thumbError) throw thumbError;

        const { data: thumbUrlData } = supabase.storage
          .from("thumbnails")
          .getPublicUrl(thumbPath);
        
        thumbnailUrl = thumbUrlData.publicUrl;
      }
      
      setUploadProgress(80);

      // Create video record
      const { data: videoData, error: dbError } = await supabase
        .from("videos")
        .insert({
          title: title.trim(),
          description: description.trim(),
          video_url: videoUrl,
          thumbnail_url: thumbnailUrl,
          user_id: user.id,
          is_public: true,
        })
        .select()
        .single();

      if (dbError) throw dbError;

      setUploadProgress(100);

      toast({
        title: "Video Yüklendi",
        description: "Videonuz başarıyla yüklendi!",
      });

      navigate(`/watch/${videoData.id}`);
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        title: "Yükleme Hatası",
        description: error.message || "Video yüklenirken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <AlertTriangle className="w-16 h-16 text-primary mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Giriş Yapın</h1>
          <p className="text-muted-foreground mb-6">
            Video yüklemek için giriş yapmalısınız.
          </p>
          <Button variant="hero" onClick={() => navigate("/auth")}>
            Giriş Yap
          </Button>
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
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-4 shadow-glow">
              <UploadIcon className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-bold">Video Yükle</h1>
            <p className="text-muted-foreground mt-2">
              Videonuzu yükleyin ve dünyayla paylaşın
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Video Başlığı *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Videonuz için çekici bir başlık girin"
                className="bg-muted/30 border-primary/30"
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Açıklama</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Videonuz hakkında bilgi verin"
                className="bg-muted/30 border-primary/30 min-h-[120px]"
                maxLength={5000}
              />
            </div>

            <div className="space-y-2">
              <Label>Video Dosyası *</Label>
              <div className="border-2 border-dashed border-primary/30 rounded-xl p-8 text-center hover:border-primary/50 transition-colors">
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleVideoChange}
                  className="hidden"
                  id="video-upload"
                />
                <label htmlFor="video-upload" className="cursor-pointer">
                  {videoFile ? (
                    <div className="flex items-center justify-center gap-3">
                      <Video className="w-8 h-8 text-primary" />
                      <span className="text-foreground">{videoFile.name}</span>
                    </div>
                  ) : (
                    <div>
                      <Video className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground">
                        Video dosyası seçmek için tıklayın
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        MP4, WebM, MOV (Maks. 500MB)
                      </p>
                    </div>
                  )}
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Kapak Resmi (Thumbnail)</Label>
              <div className="border-2 border-dashed border-primary/30 rounded-xl p-8 text-center hover:border-primary/50 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleThumbnailChange}
                  className="hidden"
                  id="thumbnail-upload"
                />
                <label htmlFor="thumbnail-upload" className="cursor-pointer">
                  {thumbnailFile ? (
                    <div className="flex items-center justify-center gap-3">
                      <Image className="w-8 h-8 text-primary" />
                      <span className="text-foreground">{thumbnailFile.name}</span>
                    </div>
                  ) : (
                    <div>
                      <Image className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground">
                        Kapak resmi seçmek için tıklayın
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        JPG, PNG, WebP (Maks. 5MB)
                      </p>
                    </div>
                  )}
                </label>
              </div>
            </div>

            {uploading && (
              <div className="space-y-2">
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-sm text-center text-muted-foreground">
                  Yükleniyor... %{uploadProgress}
                </p>
              </div>
            )}

            <Button
              type="submit"
              variant="hero"
              size="lg"
              className="w-full"
              disabled={uploading || !title.trim() || !videoFile}
            >
              {uploading ? "Yükleniyor..." : "Video Yükle"}
            </Button>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Upload;
