import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";
import { Play, ArrowRight, Sparkles, Video, Palette, Radio, Camera, Newspaper } from "lucide-react";

const COOKIE_KEY = "scatydeo_v3_seen";

// Endless ambient pad via Web Audio API
const startAmbient = (ctxRef: React.MutableRefObject<AudioContext | null>) => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    ctxRef.current = ctx;
    const master = ctx.createGain();
    master.gain.value = 0.12;
    master.connect(ctx.destination);

    // LFO filter for movement
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 900;
    filter.Q.value = 4;
    filter.connect(master);

    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.08;
    lfoGain.gain.value = 400;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start();

    // Chord: A minor pad
    [220, 261.63, 329.63, 415.3].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = i % 2 === 0 ? "sine" : "triangle";
      osc.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.value = 0.25;
      // slow detune drift
      const drift = ctx.createOscillator();
      const driftGain = ctx.createGain();
      drift.frequency.value = 0.05 + i * 0.02;
      driftGain.gain.value = 4;
      drift.connect(driftGain);
      driftGain.connect(osc.detune);
      drift.start();
      osc.connect(g);
      g.connect(filter);
      osc.start();
    });
  } catch {
    /* noop */
  }
};

const V3Welcome = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const isTr = language === "tr";
  const audioCtxRef = useRef<AudioContext | null>(null);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const onFirstClick = () => {
      if (!audioCtxRef.current) startAmbient(audioCtxRef);
      window.removeEventListener("pointerdown", onFirstClick);
    };
    window.addEventListener("pointerdown", onFirstClick);
    return () => {
      window.removeEventListener("pointerdown", onFirstClick);
      if (audioCtxRef.current) {
        try { audioCtxRef.current.close(); } catch { /* noop */ }
      }
    };
  }, []);

  const steps: Array<{ icon: any; title: string; desc: string }> = [
    {
      icon: Sparkles,
      title: isTr ? "Yepyeni Arayüz" : "Brand new UI",
      desc: isTr
        ? "Material 3 + YouTube kaynaşımı, akıcı ve modern."
        : "Material 3 + YouTube fusion, smooth and modern.",
    },
    {
      icon: Video,
      title: isTr ? "Videoyu İzleyen AI Özet" : "AI Summary that watches",
      desc: isTr
        ? "AI özet artık videonun kendisini de analiz ediyor."
        : "AI summary now analyzes the video itself too.",
    },
    {
      icon: Camera,
      title: "Scatydeo FoCAM",
      desc: isTr
        ? "Tarayıcıdan ekran + mikrofon + sistem sesi kaydı."
        : "Screen + mic + system audio recording from your browser.",
    },
    {
      icon: Palette,
      title: isTr ? "Tema Paketleri" : "Theme Packs",
      desc: isTr
        ? "Kendi rengini seç, Scatydeo sana göre parlasın."
        : "Pick your color and watch Scatydeo shine your way.",
    },
    {
      icon: Radio,
      title: isTr ? "Canlı Yayın & Switch" : "Live & Switch",
      desc: isTr
        ? "Canlı yayınlar ve kısa videolar hep bir tık uzakta."
        : "Live streams and short-form videos always one tap away.",
    },
    {
      icon: Newspaper,
      title: isTr ? "Haberler" : "News",
      desc: isTr
        ? "Scatydeo hakkındaki tüm duyurular tek yerde."
        : "All announcements about Scatydeo in one place.",
    },
  ];

  const isLast = step >= steps.length;

  const finish = () => {
    localStorage.setItem(COOKIE_KEY, "true");
    if (audioCtxRef.current) {
      try { audioCtxRef.current.close(); } catch { /* noop */ }
    }
    navigate("/", { replace: true });
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0a0014] text-foreground flex items-center justify-center p-4">
      {/* Animated purple background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 -left-32 w-[520px] h-[520px] rounded-full bg-primary/40 blur-3xl animate-[pulse_6s_ease-in-out_infinite]" />
        <div className="absolute top-1/3 -right-40 w-[560px] h-[560px] rounded-full bg-purple-600/40 blur-3xl animate-[pulse_8s_ease-in-out_infinite]" />
        <div className="absolute bottom-[-160px] left-1/4 w-[600px] h-[600px] rounded-full bg-fuchsia-500/30 blur-3xl animate-[pulse_10s_ease-in-out_infinite]" />
        {/* Floating shapes */}
        <div className="absolute top-20 left-1/2 w-24 h-24 rounded-2xl bg-primary/20 backdrop-blur-md rotate-12 animate-[float_9s_ease-in-out_infinite]" />
        <div className="absolute bottom-32 right-1/3 w-16 h-16 rounded-full bg-purple-400/30 animate-[float_11s_ease-in-out_infinite_reverse]" />
        <div className="absolute top-1/2 left-10 w-20 h-20 rounded-full border-2 border-primary/40 animate-[float_13s_ease-in-out_infinite]" />
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-30px) rotate(15deg); }
        }
      `}</style>

      <div className="relative w-full max-w-xl rounded-3xl border border-primary/30 bg-black/50 backdrop-blur-2xl p-8 md:p-10 shadow-[0_20px_80px_-20px_rgba(168,85,247,0.6)]">
        {step === 0 && (
          <div className="text-center animate-fade-in">
            <div className="mx-auto mb-6 w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center shadow-lg">
              <Play className="w-8 h-8 text-white fill-current" />
            </div>
            <h1 className="font-display text-6xl md:text-7xl font-black tracking-tight text-white">
              Scatydeo<span className="italic bg-gradient-to-r from-primary to-fuchsia-400 bg-clip-text text-transparent">3</span>
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              {isTr ? "seni düşündüren scatydeo sürümü" : "the scatydeo release that thinks about you"}
            </p>
            <h2 className="mt-8 text-2xl md:text-3xl font-bold text-white leading-tight">
              {isTr ? "Yeni scatydeo sürümüne hoşgeldin!" : "Welcome to the new scatydeo!"}
            </h2>
            <Button
              onClick={() => setStep(1)}
              size="lg"
              className="mt-8 w-full gap-2 rounded-full bg-gradient-to-r from-primary to-purple-500 hover:opacity-90"
            >
              {isTr ? "İleri" : "Next"} <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        )}

        {step > 0 && !isLast && (() => {
          const s = steps[step - 1];
          const Icon = s.icon;
          return (
            <div className="animate-fade-in text-center">
              <div className="mx-auto mb-5 w-14 h-14 rounded-2xl bg-primary/20 border border-primary/40 flex items-center justify-center">
                <Icon className="w-7 h-7 text-primary" />
              </div>
              <div className="text-xs uppercase tracking-widest text-primary/80 mb-2">
                {step} / {steps.length}
              </div>
              <h3 className="text-2xl md:text-3xl font-bold text-white">{s.title}</h3>
              <p className="mt-3 text-muted-foreground">{s.desc}</p>
              <div className="mt-8 flex gap-3">
                {step > 1 && (
                  <Button
                    onClick={() => setStep(step - 1)}
                    variant="outline"
                    size="lg"
                    className="flex-1 rounded-full"
                  >
                    {isTr ? "Geri" : "Back"}
                  </Button>
                )}
                <Button
                  onClick={() => setStep(step + 1)}
                  size="lg"
                  className="flex-1 rounded-full gap-2 bg-gradient-to-r from-primary to-purple-500 hover:opacity-90"
                >
                  {step === steps.length
                    ? isTr ? "Bitir" : "Finish"
                    : isTr ? "İleri" : "Next"}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          );
        })()}

        {isLast && (
          <div className="animate-fade-in text-center">
            <h2 className="font-display text-5xl md:text-6xl font-black text-white leading-tight">
              {isTr ? "Başlayalım mı?" : "Shall we begin?"}
            </h2>
            <p className="mt-4 text-muted-foreground">
              {isTr
                ? "Scatydeo 3 seni bekliyor."
                : "Scatydeo 3 is waiting for you."}
            </p>
            <Button
              onClick={finish}
              size="lg"
              className="mt-8 w-full rounded-full text-lg py-6 bg-gradient-to-r from-primary to-fuchsia-500 hover:opacity-90 shadow-[0_0_40px_-5px_rgba(168,85,247,0.7)]"
            >
              {isTr ? "Başlayalım" : "Let's go"}
            </Button>
          </div>
        )}

        <p className="mt-8 text-center text-[10px] text-muted-foreground/70">
          ©2026 SWO · Scatydeo v3
        </p>
      </div>
    </div>
  );
};

export default V3Welcome;