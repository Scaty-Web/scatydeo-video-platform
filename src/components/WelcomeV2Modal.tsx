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

// Simple melody generator using Web Audio API
const playWelcomeMusic = (audioCtxRef: React.MutableRefObject<AudioContext | null>) => {
  try {
    const ctx = new AudioContext();
    audioCtxRef.current = ctx;
    const gainNode = ctx.createGain();
    gainNode.gain.value = 0.15;
    gainNode.connect(ctx.destination);

    // A pleasant welcome melody
    const notes = [
      { freq: 523.25, start: 0, dur: 0.3 },    // C5
      { freq: 659.25, start: 0.3, dur: 0.3 },   // E5
      { freq: 783.99, start: 0.6, dur: 0.3 },   // G5
      { freq: 1046.50, start: 0.9, dur: 0.6 },  // C6
      { freq: 783.99, start: 1.5, dur: 0.3 },   // G5
      { freq: 880.00, start: 1.8, dur: 0.3 },   // A5
      { freq: 1046.50, start: 2.1, dur: 0.9 },  // C6
      { freq: 987.77, start: 3.0, dur: 0.3 },   // B5
      { freq: 880.00, start: 3.3, dur: 0.3 },   // A5
      { freq: 783.99, start: 3.6, dur: 0.6 },   // G5
      { freq: 659.25, start: 4.2, dur: 0.3 },   // E5
      { freq: 783.99, start: 4.5, dur: 0.3 },   // G5
      { freq: 1046.50, start: 4.8, dur: 1.2 },  // C6 (long)
    ];

    notes.forEach(({ freq, start, dur }) => {
      const osc = ctx.createOscillator();
      const noteGain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      noteGain.gain.setValueAtTime(0, ctx.currentTime + start);
      noteGain.gain.linearRampToValueAtTime(1, ctx.currentTime + start + 0.05);
      noteGain.gain.linearRampToValueAtTime(0, ctx.currentTime + start + dur);
      osc.connect(noteGain);
      noteGain.connect(gainNode);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + dur + 0.1);
    });
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
