import { useState, useRef, useEffect, useCallback } from "react";
import Navbar from "@/components/Navbar";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { useLanguage } from "@/hooks/useLanguage";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Play, Pause, Download, Music, LayoutTemplate, Type, Upload,
  Trash2, Volume2, VolumeX, Film, RotateCcw, Scissors, Gauge, Image as ImageIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import viateLogo from "@/assets/cut-logo.svg";

interface Filters {
  brightness: number; contrast: number; saturate: number;
  grayscale: number; sepia: number; hue: number; blur: number;
}
const DEFAULT_FILTERS: Filters = {
  brightness: 100, contrast: 100, saturate: 100, grayscale: 0, sepia: 0, hue: 0, blur: 0,
};

const FILTER_PRESETS = [
  { id: "normal", tr: "Normal", en: "Normal", f: {} as Partial<Filters> },
  { id: "cinema", tr: "Sinema", en: "Cinema", f: { contrast: 130, saturate: 120, brightness: 95 } },
  { id: "neon", tr: "Neon", en: "Neon", f: { saturate: 200, contrast: 140, hue: 20 } },
  { id: "bw", tr: "Siyah-Beyaz", en: "B&W", f: { grayscale: 100, contrast: 120 } },
  { id: "vintage", tr: "Vintage", en: "Vintage", f: { sepia: 60, contrast: 110, brightness: 105 } },
  { id: "cold", tr: "Soğuk", en: "Cold", f: { hue: 180, saturate: 130 } },
];

/* 2 image templates (generated gradients) */
const IMAGE_TEMPLATES = [
  { id: "neon-poster", tr: "Neon Poster", en: "Neon Poster", css: "linear-gradient(135deg,#a500ff,#ff00c8 55%,#111 100%)" },
  { id: "sunset", tr: "Gün Batımı", en: "Sunset", css: "linear-gradient(160deg,#fb923c,#f43f5e 60%,#1e1b4b 100%)" },
];

/* 2 video templates (style + speed) */
const VIDEO_TEMPLATES = [
  { id: "vlog", tr: "Vlog", en: "Vlog", filters: { saturate: 118, contrast: 106 } as Partial<Filters>, speed: 1, text: "VLOG" },
  { id: "slowmo", tr: "Ağır Çekim", en: "Slow Motion", filters: { contrast: 115, saturate: 105 } as Partial<Filters>, speed: 0.5, text: "" },
];

/* 2 built-in sound tracks (synth generated, no asset weight) */
interface SynthTrack { id: string; tr: string; en: string; bpm: number; wave: OscillatorType; pattern: (number | null)[] }
const SOUND_TEMPLATES: SynthTrack[] = [
  { id: "neon-beat", tr: "Neon Beat", en: "Neon Beat", bpm: 128, wave: "square", pattern: [45, null, 45, null, 48, null, 45, null, 43, null, 43, null, 50, null, 48, null] },
  { id: "chill", tr: "Chill Wave", en: "Chill Wave", bpm: 90, wave: "sine", pattern: [57, null, null, 60, null, null, 62, null, 60, null, 57, null, 55, null, null, null] },
];

const midiToFreq = (n: number) => 440 * Math.pow(2, (n - 69) / 12);
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

type TabId = "media" | "filters" | "music" | "text" | "templates";

const Viate = () => {
  const { language } = useLanguage();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const t = (tr: string, en: string) => (language === "tr" ? tr : en);

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileVideoRef = useRef<HTMLInputElement>(null);
  const fileAudioRef = useRef<HTMLInputElement>(null);

  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoName, setVideoName] = useState("");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioName, setAudioName] = useState("");
  const [bgTemplate, setBgTemplate] = useState<string | null>(null);

  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);
  const [trim, setTrim] = useState<[number, number]>([0, 0]);
  const [speed, setSpeed] = useState(1);
  const [muted, setMuted] = useState(false);
  const [musicVol, setMusicVol] = useState(70);

  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [preset, setPreset] = useState("normal");
  const [overlayText, setOverlayText] = useState("");
  const [textSize, setTextSize] = useState(36);
  const [textY, setTextY] = useState(80);

  const [synthId, setSynthId] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>("media");
  const [exporting, setExporting] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const synthStopRef = useRef<(() => void) | null>(null);

  const filterCss = `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturate}%) grayscale(${filters.grayscale}%) sepia(${filters.sepia}%) hue-rotate(${filters.hue}deg) blur(${filters.blur}px)`;

  /* ---------- media loading ---------- */
  const onVideoPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setVideoUrl(URL.createObjectURL(f));
    setVideoName(f.name);
    setBgTemplate(null);
    setPlaying(false);
  };

  const onAudioPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(URL.createObjectURL(f));
    setAudioName(f.name);
    stopSynth();
    setSynthId(null);
  };

  useEffect(() => () => {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
  }, [videoUrl, audioUrl]);

  /* ---------- synth ---------- */
  const stopSynth = useCallback(() => {
    synthStopRef.current?.();
    synthStopRef.current = null;
  }, []);

  const startSynth = useCallback((track: SynthTrack) => {
    stopSynth();
    const ctx = audioCtxRef.current ?? new AudioContext();
    audioCtxRef.current = ctx;
    void ctx.resume();
    const gain = ctx.createGain();
    gain.gain.value = (musicVol / 100) * 0.15;
    gain.connect(ctx.destination);
    const step = 60 / track.bpm / 2;
    let i = 0;
    const id = window.setInterval(() => {
      const note = track.pattern[i % track.pattern.length];
      i++;
      if (note == null) return;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = track.wave;
      osc.frequency.value = midiToFreq(note);
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(1, ctx.currentTime + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + step * 0.9);
      osc.connect(g); g.connect(gain);
      osc.start(); osc.stop(ctx.currentTime + step);
    }, step * 1000);
    synthStopRef.current = () => { window.clearInterval(id); gain.disconnect(); };
  }, [musicVol, stopSynth]);

  useEffect(() => () => stopSynth(), [stopSynth]);

  /* ---------- playback ---------- */
  const togglePlay = () => {
    const v = videoRef.current;
    if (!v || !videoUrl) return;
    if (playing) {
      v.pause();
      audioRef.current?.pause();
      stopSynth();
      setPlaying(false);
    } else {
      if (v.currentTime < trim[0] || v.currentTime > trim[1]) v.currentTime = trim[0];
      void v.play();
      if (audioRef.current) { audioRef.current.volume = musicVol / 100; void audioRef.current.play(); }
      const track = SOUND_TEMPLATES.find((s) => s.id === synthId);
      if (track) startSynth(track);
      setPlaying(true);
    }
  };

  useEffect(() => {
    const v = videoRef.current;
    if (v) { v.playbackRate = speed; v.muted = muted; }
  }, [speed, muted, videoUrl]);

  const onTimeUpdate = () => {
    const v = videoRef.current;
    if (!v) return;
    setCurrent(v.currentTime);
    if (trim[1] && v.currentTime >= trim[1]) {
      v.currentTime = trim[0];
      if (audioRef.current) audioRef.current.currentTime = 0;
    }
  };

  const onLoaded = () => {
    const v = videoRef.current;
    if (!v) return;
    setDuration(v.duration || 0);
    setTrim([0, v.duration || 0]);
  };

  /* ---------- templates ---------- */
  const applyVideoTemplate = (id: string) => {
    const tpl = VIDEO_TEMPLATES.find((x) => x.id === id);
    if (!tpl) return;
    setFilters({ ...DEFAULT_FILTERS, ...tpl.filters });
    setSpeed(tpl.speed);
    if (tpl.text) setOverlayText(tpl.text);
    setPreset("normal");
    toast({ title: t("Şablon uygulandı", "Template applied"), description: t(tpl.tr, tpl.en) });
  };

  const applyPreset = (id: string) => {
    const p = FILTER_PRESETS.find((x) => x.id === id);
    if (!p) return;
    setPreset(id);
    setFilters({ ...DEFAULT_FILTERS, ...p.f });
  };

  /* ---------- export ---------- */
  const exportVideo = async () => {
    const v = videoRef.current;
    if (!v || !videoUrl) {
      toast({ title: t("Önce video yükle", "Upload a video first"), variant: "destructive" });
      return;
    }
    setExporting(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = v.videoWidth || 1280;
      canvas.height = v.videoHeight || 720;
      const ctx2d = canvas.getContext("2d")!;
      const stream = canvas.captureStream(30);

      const actx = new AudioContext();
      const dest = actx.createMediaStreamDestination();
      try {
        if (!muted) {
          const src = actx.createMediaElementSource(v);
          src.connect(dest); src.connect(actx.destination);
        }
      } catch { /* already connected */ }
      dest.stream.getAudioTracks().forEach((tr) => stream.addTrack(tr));

      const rec = new MediaRecorder(stream, { mimeType: "video/webm" });
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      const done = new Promise<Blob>((res) => { rec.onstop = () => res(new Blob(chunks, { type: "video/webm" })); });

      v.currentTime = trim[0];
      v.playbackRate = speed;
      await v.play();
      rec.start();

      let raf = 0;
      const draw = () => {
        ctx2d.filter = filterCss;
        ctx2d.drawImage(v, 0, 0, canvas.width, canvas.height);
        ctx2d.filter = "none";
        if (overlayText) {
          ctx2d.font = `bold ${textSize * (canvas.width / 640)}px Space Grotesk, sans-serif`;
          ctx2d.textAlign = "center";
          ctx2d.fillStyle = "#fff";
          ctx2d.shadowColor = "rgba(165,0,255,0.9)";
          ctx2d.shadowBlur = 18;
          ctx2d.fillText(overlayText, canvas.width / 2, (canvas.height * textY) / 100);
          ctx2d.shadowBlur = 0;
        }
        if (v.currentTime < trim[1] && !v.paused) raf = requestAnimationFrame(draw);
        else { cancelAnimationFrame(raf); v.pause(); rec.state !== "inactive" && rec.stop(); }
      };
      draw();

      const blob = await done;
      await actx.close();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `viate-${Date.now()}.webm`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      toast({ title: t("Dışa aktarıldı", "Exported") });
    } catch {
      toast({ title: t("Dışa aktarma başarısız", "Export failed"), variant: "destructive" });
    } finally {
      setExporting(false);
      setPlaying(false);
    }
  };

  const TABS: { id: TabId; icon: typeof Film; tr: string; en: string }[] = [
    { id: "media", icon: Film, tr: "Medya", en: "Media" },
    { id: "templates", icon: LayoutTemplate, tr: "Şablon", en: "Templates" },
    { id: "filters", icon: Gauge, tr: "Efekt", en: "Effects" },
    { id: "music", icon: Music, tr: "Müzik", en: "Music" },
    { id: "text", icon: Type, tr: "Metin", en: "Text" },
  ];

  return (
    <div className="md3-scope min-h-screen bg-background">
      <Navbar />
      <main className="pt-[var(--nav-h,3.5rem)] pb-20 md:pb-8">
        {/* header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <img src={viateLogo} alt="Viate" className="h-7 w-auto" />
          <div className="min-w-0">
            <h1 className="text-lg font-bold leading-none">Viate</h1>
            <p className="text-[11px] text-muted-foreground truncate">
              {t("Scatydeo video düzenleyici", "Scatydeo video editor")}
            </p>
          </div>
          <Button
            size="sm"
            className="ml-auto shrink-0"
            onClick={exportVideo}
            disabled={exporting || !videoUrl}
          >
            <Download className="w-4 h-4 md:mr-2" />
            <span className="hidden md:inline">{exporting ? t("Aktarılıyor…", "Exporting…") : t("Dışa Aktar", "Export")}</span>
          </Button>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 p-3 md:p-4">
          {/* preview */}
          <section className="flex-1 min-w-0">
            <div
              className="relative w-full aspect-video rounded-xl overflow-hidden bg-black border border-border"
              style={bgTemplate ? { background: bgTemplate } : undefined}
            >
              {videoUrl ? (
                <video
                  ref={videoRef}
                  src={videoUrl}
                  className="w-full h-full object-contain"
                  style={{ filter: filterCss }}
                  onTimeUpdate={onTimeUpdate}
                  onLoadedMetadata={onLoaded}
                  playsInline
                />
              ) : (
                <button
                  onClick={() => fileVideoRef.current?.click()}
                  className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground"
                >
                  <Upload className="w-8 h-8" />
                  <span className="text-sm">{t("Video yükle", "Upload video")}</span>
                </button>
              )}
              {overlayText && (
                <span
                  className="absolute left-1/2 -translate-x-1/2 font-bold text-white pointer-events-none text-center px-2"
                  style={{ top: `${textY}%`, fontSize: textSize, textShadow: "0 0 18px hsl(270 100% 60%)" }}
                >
                  {overlayText}
                </span>
              )}
            </div>

            {/* transport */}
            <div className="flex items-center gap-2 mt-3">
              <Button size="icon" variant="secondary" onClick={togglePlay} disabled={!videoUrl}>
                {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </Button>
              <Button size="icon" variant="ghost" onClick={() => setMuted((m) => !m)} disabled={!videoUrl}>
                {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </Button>
              <div className="flex-1">
                <Slider
                  value={[current]}
                  max={duration || 1}
                  step={0.01}
                  onValueChange={([v]) => { if (videoRef.current) videoRef.current.currentTime = v; setCurrent(v); }}
                  disabled={!videoUrl}
                />
              </div>
              <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                {fmt(current)}/{fmt(duration)}
              </span>
            </div>
          </section>

          {/* editor panel */}
          <aside className="w-full lg:w-[360px] shrink-0 space-y-3">
            <div className="flex gap-1 overflow-x-auto no-scrollbar">
              {TABS.map((tb) => (
                <button
                  key={tb.id}
                  onClick={() => setTab(tb.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-colors border",
                    tab === tb.id
                      ? "bg-primary text-primary-foreground border-transparent"
                      : "bg-card text-muted-foreground border-border"
                  )}
                >
                  <tb.icon className="w-3.5 h-3.5" />
                  {t(tb.tr, tb.en)}
                </button>
              ))}
            </div>

            <div className="rounded-xl border border-border bg-card p-3 space-y-4">
              {tab === "media" && (
                <>
                  <input ref={fileVideoRef} type="file" accept="video/*" hidden onChange={onVideoPick} />
                  <input ref={fileAudioRef} type="file" accept="audio/*" hidden onChange={onAudioPick} />
                  <Button variant="secondary" className="w-full" onClick={() => fileVideoRef.current?.click()}>
                    <Film className="w-4 h-4 mr-2" />{t("Video Yükle", "Upload Video")}
                  </Button>
                  {videoName && (
                    <p className="text-xs text-muted-foreground truncate flex items-center gap-2">
                      {videoName}
                      <Trash2
                        className="w-3.5 h-3.5 cursor-pointer shrink-0"
                        onClick={() => { setVideoUrl(null); setVideoName(""); setPlaying(false); }}
                      />
                    </p>
                  )}
                  <Button variant="secondary" className="w-full" onClick={() => fileAudioRef.current?.click()}>
                    <Music className="w-4 h-4 mr-2" />{t("Müzik Yükle", "Upload Music")}
                  </Button>
                  {audioName && <p className="text-xs text-muted-foreground truncate">{audioName}</p>}

                  <div className="space-y-2">
                    <p className="text-xs font-medium flex items-center gap-1.5">
                      <Scissors className="w-3.5 h-3.5" />{t("Kırp", "Trim")} — {fmt(trim[0])} → {fmt(trim[1])}
                    </p>
                    <Slider
                      value={trim}
                      max={duration || 1}
                      step={0.1}
                      minStepsBetweenThumbs={1}
                      onValueChange={(v) => setTrim([v[0], v[1]] as [number, number])}
                      disabled={!videoUrl}
                    />
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-medium flex items-center gap-1.5">
                      <Gauge className="w-3.5 h-3.5" />{t("Hız", "Speed")} — {speed.toFixed(2)}x
                    </p>
                    <Slider value={[speed]} min={0.5} max={2} step={0.05} onValueChange={([v]) => setSpeed(v)} />
                  </div>
                </>
              )}

              {tab === "templates" && (
                <>
                  <p className="text-xs font-medium flex items-center gap-1.5">
                    <Film className="w-3.5 h-3.5" />{t("Video Şablonları", "Video Templates")}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {VIDEO_TEMPLATES.map((tpl) => (
                      <button
                        key={tpl.id}
                        onClick={() => applyVideoTemplate(tpl.id)}
                        className="rounded-lg border border-border p-3 text-xs font-medium hover:border-primary transition-colors"
                      >
                        {t(tpl.tr, tpl.en)}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs font-medium flex items-center gap-1.5 pt-1">
                    <ImageIcon className="w-3.5 h-3.5" />{t("Görsel Şablonları", "Image Templates")}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {IMAGE_TEMPLATES.map((im) => (
                      <button
                        key={im.id}
                        onClick={() => setBgTemplate(im.css)}
                        className="h-16 rounded-lg border border-border text-[11px] font-semibold text-white"
                        style={{ background: im.css }}
                      >
                        {t(im.tr, im.en)}
                      </button>
                    ))}
                  </div>
                  <Button variant="ghost" size="sm" className="w-full" onClick={() => setBgTemplate(null)}>
                    <RotateCcw className="w-3.5 h-3.5 mr-2" />{t("Arka planı temizle", "Clear background")}
                  </Button>
                </>
              )}

              {tab === "filters" && (
                <>
                  <div className="grid grid-cols-3 gap-2">
                    {FILTER_PRESETS.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => applyPreset(p.id)}
                        className={cn(
                          "rounded-lg border p-2 text-[11px] font-medium transition-colors",
                          preset === p.id ? "border-primary text-primary" : "border-border text-muted-foreground"
                        )}
                      >
                        {t(p.tr, p.en)}
                      </button>
                    ))}
                  </div>
                  {([
                    ["brightness", t("Parlaklık", "Brightness"), 0, 200],
                    ["contrast", t("Kontrast", "Contrast"), 0, 200],
                    ["saturate", t("Doygunluk", "Saturation"), 0, 250],
                    ["grayscale", t("Gri", "Grayscale"), 0, 100],
                    ["sepia", "Sepia", 0, 100],
                    ["hue", t("Renk Tonu", "Hue"), -180, 180],
                    ["blur", t("Bulanıklık", "Blur"), 0, 10],
                  ] as [keyof Filters, string, number, number][]).map(([key, label, min, max]) => (
                    <div key={key} className="space-y-1">
                      <p className="text-[11px] text-muted-foreground flex justify-between">
                        <span>{label}</span><span>{filters[key]}</span>
                      </p>
                      <Slider
                        value={[filters[key]]}
                        min={min}
                        max={max}
                        step={1}
                        onValueChange={([v]) => setFilters((f) => ({ ...f, [key]: v }))}
                      />
                    </div>
                  ))}
                  <Button variant="ghost" size="sm" className="w-full" onClick={() => { setFilters(DEFAULT_FILTERS); setPreset("normal"); }}>
                    <RotateCcw className="w-3.5 h-3.5 mr-2" />{t("Sıfırla", "Reset")}
                  </Button>
                </>
              )}

              {tab === "music" && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    {SOUND_TEMPLATES.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => {
                          if (synthId === s.id) { setSynthId(null); stopSynth(); }
                          else { setSynthId(s.id); startSynth(s); }
                        }}
                        className={cn(
                          "rounded-lg border p-3 text-xs font-medium transition-colors",
                          synthId === s.id ? "border-primary text-primary" : "border-border text-muted-foreground"
                        )}
                      >
                        {t(s.tr, s.en)}
                      </button>
                    ))}
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] text-muted-foreground">{t("Müzik sesi", "Music volume")} — {musicVol}%</p>
                    <Slider
                      value={[musicVol]}
                      max={100}
                      step={1}
                      onValueChange={([v]) => {
                        setMusicVol(v);
                        if (audioRef.current) audioRef.current.volume = v / 100;
                      }}
                    />
                  </div>
                  {audioUrl && <audio ref={audioRef} src={audioUrl} loop />}
                </>
              )}

              {tab === "text" && (
                <>
                  <Input
                    value={overlayText}
                    onChange={(e) => setOverlayText(e.target.value)}
                    placeholder={t("Metin yaz…", "Type text…")}
                  />
                  <div className="space-y-1">
                    <p className="text-[11px] text-muted-foreground">{t("Boyut", "Size")} — {textSize}px</p>
                    <Slider value={[textSize]} min={12} max={96} step={1} onValueChange={([v]) => setTextSize(v)} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] text-muted-foreground">{t("Dikey konum", "Vertical position")} — {textY}%</p>
                    <Slider value={[textY]} min={5} max={95} step={1} onValueChange={([v]) => setTextY(v)} />
                  </div>
                  <Button variant="ghost" size="sm" className="w-full" onClick={() => setOverlayText("")}>
                    <Trash2 className="w-3.5 h-3.5 mr-2" />{t("Metni sil", "Clear text")}
                  </Button>
                </>
              )}
            </div>
          </aside>
        </div>
      </main>
      {isMobile && <BottomNav />}
    </div>
  );
};

export default Viate;
