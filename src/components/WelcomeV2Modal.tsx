import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Video, Shield, Palette, Zap, Music } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";

const COOKIE_KEY = "scatydeo_v2_seen";

const features = [
  { icon: Palette, titleTr: "Yeni Arayüz", titleEn: "New Interface", descTr: "Tamamen yenilenmiş modern tasarım", descEn: "Completely redesigned modern look" },
  { icon: Video, titleTr: "AI Video Özeti", titleEn: "AI Video Summary", descTr: "Gemini AI ile video özetleme", descEn: "Summarize videos with Gemini AI" },
  { icon: Shield, titleTr: "Gelişmiş Güvenlik", titleEn: "Enhanced Security", descTr: "Daha güvenli veri koruma", descEn: "Better data protection" },
  { icon: Zap, titleTr: "Hızlı Performans", titleEn: "Fast Performance", descTr: "Daha hızlı yükleme süreleri", descEn: "Faster loading times" },
  { icon: Music, titleTr: "Canlı Yayın", titleEn: "Live Streaming", descTr: "Canlı yayın desteği", descEn: "Live streaming support" },
];

// Ambient 3-second pad using Web Audio API
const playWelcomeMusic = (audioCtxRef: React.MutableRefObject<AudioContext | null>) => {
  try {
    const ctx = new AudioContext();
    audioCtxRef.current = ctx;
    const master = ctx.createGain();
    master.gain.value = 0.18;
    master.connect(ctx.destination);

    const DUR = 3;
    const t = ctx.currentTime;

    // Warm ambient chord: C4, E4, G4, B4
    [261.63, 329.63, 392.00, 493.88].forEach((freq) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      // Slow fade in, slow fade out
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.25, t + 0.8);
      g.gain.linearRampToValueAtTime(0.2, t + 1.5);
      g.gain.linearRampToValueAtTime(0, t + DUR);
      osc.connect(g);
      g.connect(master);
      osc.start(t);
      osc.stop(t + DUR + 0.1);
    });

    // Soft shimmer layer
    const shimmer = ctx.createOscillator();
    const sg = ctx.createGain();
    shimmer.type = "triangle";
    shimmer.frequency.value = 784;
    sg.gain.setValueAtTime(0, t);
    sg.gain.linearRampToValueAtTime(0.08, t + 1);
    sg.gain.linearRampToValueAtTime(0, t + DUR);
    shimmer.connect(sg);
    sg.connect(master);
    shimmer.start(t);
    shimmer.stop(t + DUR + 0.1);
  } catch {
    // Audio not supported
  }
};

const WelcomeV2Modal = () => {
  const [open, setOpen] = useState(false);
  const { language } = useLanguage();
  const audioCtxRef = useRef<AudioContext | null>(null);
  const isTr = language === "tr";

  useEffect(() => {
    const seen = localStorage.getItem(COOKIE_KEY);
    if (!seen) {
      setOpen(true);
      playWelcomeMusic(audioCtxRef);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem(COOKIE_KEY, "true");
    setOpen(false);
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="sm:max-w-lg border-primary/30 bg-card/95 backdrop-blur-xl">
        <DialogHeader className="text-center items-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-2">
            <Sparkles className="w-8 h-8 text-primary animate-pulse" />
          </div>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
            Scatydeo v2 {isTr ? "Geldi!" : "is Here!"}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {isTr
              ? "Scatydeo tamamen yenilendi! İşte yeni özellikler:"
              : "Scatydeo has been completely redesigned! Here are the new features:"}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-4">
          {features.map((f, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted/80 transition-colors">
              <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                <f.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm">{isTr ? f.titleTr : f.titleEn}</p>
                <p className="text-xs text-muted-foreground">{isTr ? f.descTr : f.descEn}</p>
              </div>
            </div>
          ))}
        </div>

        <Button onClick={handleClose} className="w-full" size="lg">
          {isTr ? "Tamam, Anladım!" : "Got it!"}
        </Button>
        <p className="text-center text-xs text-muted-foreground">©2026 SWO</p>
      </DialogContent>
    </Dialog>
  );
};

export default WelcomeV2Modal;
