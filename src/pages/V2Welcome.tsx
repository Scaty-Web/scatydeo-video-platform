import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, Video, Shield, Palette, Zap, Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";

const COOKIE_KEY = "scatydeo_v2_seen";

const features = [
  { icon: Palette, titleTr: "Yeni Arayüz", titleEn: "New Interface", descTr: "Tamamen yenilenmiş modern tasarım", descEn: "Completely redesigned modern look" },
  { icon: Video, titleTr: "AI Video Özeti", titleEn: "AI Video Summary", descTr: "Gemini AI ile video özetleme", descEn: "Summarize videos with Gemini AI" },
  { icon: Shield, titleTr: "Gelişmiş Güvenlik", titleEn: "Enhanced Security", descTr: "Daha güvenli veri koruma", descEn: "Better data protection" },
  { icon: Zap, titleTr: "Hızlı Performans", titleEn: "Fast Performance", descTr: "Daha hızlı yükleme süreleri", descEn: "Faster loading times" },
  { icon: Music, titleTr: "Canlı Yayın", titleEn: "Live Streaming", descTr: "Canlı yayın desteği", descEn: "Live streaming support" },
];

const playAmbientSound = (ctxRef: React.MutableRefObject<AudioContext | null>) => {
  try {
    const ctx = new AudioContext();
    ctxRef.current = ctx;
    const master = ctx.createGain();
    master.gain.value = 0.18;
    master.connect(ctx.destination);
    const t = ctx.currentTime;
    [261.63, 329.63, 392.00, 493.88].forEach((freq) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.25, t + 0.8);
      g.gain.linearRampToValueAtTime(0.2, t + 1.5);
      g.gain.linearRampToValueAtTime(0, t + 3);
      osc.connect(g);
      g.connect(master);
      osc.start(t);
      osc.stop(t + 3.1);
    });
    const shimmer = ctx.createOscillator();
    const sg = ctx.createGain();
    shimmer.type = "triangle";
    shimmer.frequency.value = 784;
    sg.gain.setValueAtTime(0, t);
    sg.gain.linearRampToValueAtTime(0.08, t + 1);
    sg.gain.linearRampToValueAtTime(0, t + 3);
    shimmer.connect(sg);
    sg.connect(master);
    shimmer.start(t);
    shimmer.stop(t + 3.1);
  } catch { /* */ }
};

const V2Welcome = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const audioCtxRef = useRef<AudioContext | null>(null);
  const isTr = language === "tr";

  useEffect(() => {
    // Already seen → go home
    if (localStorage.getItem(COOKIE_KEY)) {
      navigate("/", { replace: true });
      return;
    }
    playAmbientSound(audioCtxRef);
  }, [navigate]);

  const handleContinue = () => {
    localStorage.setItem(COOKIE_KEY, "true");
    if (audioCtxRef.current) audioCtxRef.current.close();
    navigate("/", { replace: true });
  };

  // Don't render if already seen (will redirect)
  if (localStorage.getItem(COOKIE_KEY)) return null;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-2xl border border-primary/30 bg-card/95 backdrop-blur-xl p-8 shadow-xl animate-fade-in">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-4">
            <Sparkles className="w-8 h-8 text-primary animate-pulse" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
            Scatydeo v2 {isTr ? "Geldi!" : "is Here!"}
          </h1>
          <p className="text-muted-foreground mt-2">
            {isTr
              ? "Scatydeo tamamen yenilendi! İşte yeni özellikler:"
              : "Scatydeo has been completely redesigned! Here are the new features:"}
          </p>
        </div>

        <div className="grid gap-3 mb-6">
          {features.map((f, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted/80 transition-colors">
              <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                <f.icon className="w-5 h-5 text-primary" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-foreground text-sm">{isTr ? f.titleTr : f.titleEn}</p>
                <p className="text-xs text-muted-foreground">{isTr ? f.descTr : f.descEn}</p>
              </div>
            </div>
          ))}
        </div>

        <Button onClick={handleContinue} className="w-full" size="lg">
          {isTr ? "Tamam, Keşfetmeye Başla!" : "Got it, Let's Explore!"}
        </Button>
        <p className="text-center text-xs text-muted-foreground mt-3">©2026 SWO</p>
      </div>
    </div>
  );
};

export default V2Welcome;
