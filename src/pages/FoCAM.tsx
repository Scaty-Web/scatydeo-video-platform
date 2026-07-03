import { useRef, useState } from "react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { Video, Square, Download, Loader2, Disc } from "lucide-react";
import outroAsset from "@/assets/focam-outro.mp4.asset.json";

type Phase = "idle" | "recording" | "processing" | "ready";

const FoCAM = () => {
  const [systemAudio, setSystemAudio] = useState(true);
  const [micAudio, setMicAudio] = useState(true);
  const [phase, setPhase] = useState<Phase>("idle");
  const [finalUrl, setFinalUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState<string>("");

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const displayStreamRef = useRef<MediaStream | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const combinedStreamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const cleanupStreams = () => {
    [displayStreamRef, micStreamRef, combinedStreamRef].forEach((r) => {
      r.current?.getTracks().forEach((t) => t.stop());
      r.current = null;
    });
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
  };

  const startRecording = async () => {
    setFinalUrl(null);
    chunksRef.current = [];
    try {
      // Request mic FIRST (while user gesture is fresh) so permission prompt works reliably
      let mic: MediaStream | null = null;
      if (micAudio) {
        try {
          mic = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
            video: false,
          });
          micStreamRef.current = mic;
        } catch (err) {
          toast({ title: "Mikrofon", description: "Mikrofon erişimi reddedildi, sessiz devam ediliyor." });
        }
      }

      const display = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30 } as any,
        audio: systemAudio
          ? ({
              echoCancellation: false,
              noiseSuppression: false,
              autoGainControl: false,
              suppressLocalAudioPlayback: false,
            } as any)
          : false,
      });
      displayStreamRef.current = display;

      if (systemAudio && display.getAudioTracks().length === 0) {
        toast({
          title: "Sistem sesi",
          description: "Chrome/Edge'de 'Sekmeyi paylaş' veya 'Tüm ekran' seçip 'Sesi paylaş' kutusunu işaretleyin. Firefox/Safari sistem sesini desteklemez.",
        });
      }

      // Combine audio tracks. If only one source, pass through directly (more reliable).
      const audioTracks: MediaStreamTrack[] = [];
      const sysTracks = display.getAudioTracks();
      const micTracks = mic?.getAudioTracks() ?? [];
      if (sysTracks.length && micTracks.length) {
        const ctx = new AudioContext();
        audioCtxRef.current = ctx;
        if (ctx.state === "suspended") { try { await ctx.resume(); } catch {} }
        const dest = ctx.createMediaStreamDestination();
        ctx.createMediaStreamSource(new MediaStream([sysTracks[0]])).connect(dest);
        ctx.createMediaStreamSource(new MediaStream([micTracks[0]])).connect(dest);
        audioTracks.push(...dest.stream.getAudioTracks());
      } else if (sysTracks.length) {
        audioTracks.push(sysTracks[0]);
      } else if (micTracks.length) {
        audioTracks.push(micTracks[0]);
      }

      const combined = new MediaStream([...display.getVideoTracks(), ...audioTracks]);
      combinedStreamRef.current = combined;

      const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
        ? "video/webm;codecs=vp9,opus"
        : "video/webm";
      const rec = new MediaRecorder(combined, { mimeType: mime });
      rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      rec.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        cleanupStreams();
        await mergeWithOutro(blob);
      };
      // User stops the share -> stop recording
      display.getVideoTracks()[0].addEventListener("ended", () => {
        if (rec.state !== "inactive") rec.stop();
      });
      rec.start(1000);
      recorderRef.current = rec;
      setPhase("recording");
    } catch (e) {
      cleanupStreams();
      toast({ title: "Hata", description: "Ekran kaydı başlatılamadı." });
    }
  };

  const stopRecording = () => {
    recorderRef.current?.state === "recording" && recorderRef.current.stop();
  };

  const loadVideo = (src: string): Promise<HTMLVideoElement> =>
    new Promise((resolve, reject) => {
      const v = document.createElement("video");
      v.src = src;
      v.crossOrigin = "anonymous";
      v.muted = false;
      v.playsInline = true;
      v.preload = "auto";
      v.onloadedmetadata = () => resolve(v);
      v.onerror = () => reject(new Error("video load failed"));
    });

  const mergeWithOutro = async (recordedBlob: Blob) => {
    setPhase("processing");
    setProgress("Videolar hazırlanıyor...");
    try {
      const recordedUrl = URL.createObjectURL(recordedBlob);
      const v1 = await loadVideo(recordedUrl);
      const v2 = await loadVideo(outroAsset.url);

      const W = Math.max(v1.videoWidth || 1280, v2.videoWidth || 1280);
      const H = Math.max(v1.videoHeight || 720, v2.videoHeight || 720);
      const canvas = document.createElement("canvas");
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext("2d")!;

      const audioCtx = new AudioContext();
      const dest = audioCtx.createMediaStreamDestination();
      const connectAudio = (el: HTMLVideoElement) => {
        try {
          const src = audioCtx.createMediaElementSource(el);
          src.connect(dest);
          src.connect(audioCtx.destination);
        } catch {}
      };
      connectAudio(v1); connectAudio(v2);

      const canvasStream = (canvas as any).captureStream(30) as MediaStream;
      const outStream = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...dest.stream.getAudioTracks(),
      ]);

      const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
        ? "video/webm;codecs=vp9,opus" : "video/webm";
      const rec = new MediaRecorder(outStream, { mimeType: mime, videoBitsPerSecond: 5_000_000 });
      const outChunks: Blob[] = [];
      rec.ondataavailable = (e) => e.data.size && outChunks.push(e.data);

      const playSegment = (v: HTMLVideoElement, label: string) =>
        new Promise<void>((resolve) => {
          setProgress(label);
          const draw = () => {
            if (v.paused || v.ended) return;
            // contain fit
            const ratio = Math.min(W / v.videoWidth, H / v.videoHeight);
            const dw = v.videoWidth * ratio, dh = v.videoHeight * ratio;
            const dx = (W - dw) / 2, dy = (H - dh) / 2;
            ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
            ctx.drawImage(v, dx, dy, dw, dh);
            requestAnimationFrame(draw);
          };
          v.onended = () => resolve();
          v.play().then(() => draw());
        });

      const done = new Promise<Blob>((resolve) => {
        rec.onstop = () => resolve(new Blob(outChunks, { type: "video/webm" }));
      });

      rec.start();
      await playSegment(v1, "Kayıt işleniyor...");
      await playSegment(v2, "Scatydeo intro ekleniyor...");
      rec.stop();
      const finalBlob = await done;

      URL.revokeObjectURL(recordedUrl);
      const url = URL.createObjectURL(finalBlob);
      setFinalUrl(url);
      setPhase("ready");
      setProgress("");
    } catch (e) {
      setPhase("idle");
      toast({ title: "İşleme hatası", description: "Video birleştirilemedi." });
    }
  };

  const download = () => {
    if (!finalUrl) return;
    const a = document.createElement("a");
    a.href = finalUrl;
    a.download = `scatydeo-focam-${Date.now()}.webm`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20 pb-16 px-4 max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight inline-flex items-baseline gap-3 flex-wrap justify-center">
            <span className="font-sans">Scatydeo </span>
            <span className="font-sans">fo</span>
            <span className="italic font-serif bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">CAM</span>
            <span className="text-xs md:text-sm font-semibold uppercase tracking-widest px-2 py-1 rounded-full bg-primary/20 text-primary border border-primary/40 align-middle">Beta</span>
          </h1>
          <p className="text-muted-foreground mt-2">Tarayıcıdan ekran kaydı — hızlı, basit, indirilebilir.</p>
          <p className="text-xs text-muted-foreground/80 mt-1">
            Sistem sesi için Chrome/Edge kullanın ve paylaşım penceresinde <b>“Sesi paylaş”</b> kutusunu işaretleyin.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 space-y-6">
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <Checkbox checked={systemAudio} onCheckedChange={(v) => setSystemAudio(!!v)} disabled={phase !== "idle"} />
              <span>Sistem sesini kaydet</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <Checkbox checked={micAudio} onCheckedChange={(v) => setMicAudio(!!v)} disabled={phase !== "idle"} />
              <span>Mikrofon sesini kaydet</span>
            </label>
          </div>

          <div className="flex justify-center">
            {phase === "idle" && (
              <Button size="lg" onClick={startRecording} className="rounded-full gap-2">
                <Video className="w-5 h-5" /> Kaydı başlat
              </Button>
            )}
            {phase === "recording" && (
              <Button size="lg" variant="destructive" onClick={stopRecording} className="rounded-full gap-2 animate-pulse">
                <Square className="w-5 h-5 fill-current" /> Kaydı durdur
              </Button>
            )}
            {phase === "processing" && (
              <div className="flex items-center gap-3 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>{progress || "İşleniyor..."}</span>
              </div>
            )}
            {phase === "ready" && finalUrl && (
              <div className="w-full space-y-4">
                <video src={finalUrl} controls className="w-full rounded-xl bg-black" />
                <div className="flex gap-3 justify-center">
                  <Button onClick={download} className="rounded-full gap-2">
                    <Download className="w-4 h-4" /> İndir
                  </Button>
                  <Button variant="outline" onClick={() => { setFinalUrl(null); setPhase("idle"); }} className="rounded-full gap-2">
                    <Disc className="w-4 h-4" /> Yeni kayıt
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default FoCAM;