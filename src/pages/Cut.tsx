import { useState, useRef, useEffect, useCallback } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useLanguage } from "@/hooks/useLanguage";
import { useToast } from "@/hooks/use-toast";
import {
  Play, Pause, Download, Music, LayoutTemplate, Type, Wand2, Upload,
  Trash2, Plus, Volume2, VolumeX, Film, RotateCcw, Scissors, Gauge,
} from "lucide-react";
import { cn } from "@/lib/utils";
import cutLogo from "@/assets/cut-logo.svg";

interface Filters {
  brightness: number; contrast: number; saturate: number;
  grayscale: number; sepia: number; hue: number; blur: number;
}

const DEFAULT_FILTERS: Filters = { brightness: 100, contrast: 100, saturate: 100, grayscale: 0, sepia: 0, hue: 0, blur: 0 };

const FILTER_PRESETS: { id: string; tr: string; en: string; f: Partial<Filters> }[] = [
  { id: "normal", tr: "Normal", en: "Normal", f: {} },
  { id: "cinema", tr: "Sinema", en: "Cinema", f: { contrast: 130, saturate: 120, brightness: 95 } },
  { id: "bw", tr: "Siyah-Beyaz", en: "B&W", f: { grayscale: 100 } },
  { id: "neon", tr: "Neon", en: "Neon", f: { saturate: 200, contrast: 140, hue: 20 } },
  { id: "vintage", tr: "Vintage", en: "Vintage", f: { sepia: 60, contrast: 110, brightness: 105 } },
  { id: "cold", tr: "Soğuk", en: "Cold", f: { hue: 180, saturate: 130 } },
];

interface Template {
  id: string; tr: string; en: string; gradient: string;
  filters: Partial<Filters>; text?: string; speed?: number;
}

const TEMPLATES: Template[] = [
  { id: "vlog", tr: "Vlog", en: "Vlog", gradient: "linear-gradient(135deg,#f59e0b,#ef4444)", filters: { saturate: 115, contrast: 105 }, text: "VLOG" },
  { id: "gaming", tr: "Oyun", en: "Gaming", gradient: "linear-gradient(135deg,#8b5cf6,#ec4899)", filters: { saturate: 160, contrast: 130 }, text: "GG!" },
  { id: "music", tr: "Müzik Klibi", en: "Music Video", gradient: "linear-gradient(135deg,#06b6d4,#8b5cf6)", filters: { saturate: 140, hue: 10 } },
  { id: "neon-night", tr: "Neon Gece", en: "Neon Night", gradient: "linear-gradient(135deg,#0f172a,#a500ff)", filters: { saturate: 200, contrast: 150, brightness: 90 }, text: "NEON" },
  { id: "retro", tr: "Retro 80s", en: "Retro 80s", gradient: "linear-gradient(135deg,#f472b6,#facc15)", filters: { sepia: 30, saturate: 160, hue: -20 }, text: "RETRO" },
  { id: "doc", tr: "Belgesel", en: "Documentary", gradient: "linear-gradient(135deg,#334155,#0ea5e9)", filters: { contrast: 115, saturate: 90 } },
  { id: "horror", tr: "Korku", en: "Horror", gradient: "linear-gradient(135deg,#111111,#7f1d1d)", filters: { brightness: 80, contrast: 140, saturate: 60 } },
  { id: "wedding", tr: "Düğün", en: "Wedding", gradient: "linear-gradient(135deg,#fdf2f8,#f9a8d4)", filters: { brightness: 108, saturate: 110, sepia: 15 } },
  { id: "sport", tr: "Spor", en: "Sports", gradient: "linear-gradient(135deg,#16a34a,#84cc16)", filters: { contrast: 125, saturate: 125 }, speed: 1.25 },
  { id: "slowmo", tr: "Ağır Çekim", en: "Slow Motion", gradient: "linear-gradient(135deg,#1e3a8a,#60a5fa)", filters: { contrast: 110 }, speed: 0.5 },
  { id: "noir", tr: "Film Noir", en: "Film Noir", gradient: "linear-gradient(135deg,#000000,#525252)", filters: { grayscale: 100, contrast: 150 } },
  { id: "summer", tr: "Yaz", en: "Summer", gradient: "linear-gradient(135deg,#fde047,#fb923c)", filters: { brightness: 110, saturate: 140, hue: 10 } },
];

interface SynthTrack {
  id: string; tr: string; en: string; bpm: number; wave: OscillatorType; pattern: (number | null)[];
}

const SYNTH_TRACKS: SynthTrack[] = [
  { id: "neon-beat", tr: "Neon Beat", en: "Neon Beat", bpm: 128, wave: "square", pattern: [45, null, 45, null, 48, null, 45, null, 43, null, 43, null, 50, null, 48, null] },
  { id: "chill", tr: "Chill Wave", en: "Chill Wave", bpm: 90, wave: "sine", pattern: [57, null, null, 60, null, null, 62, null, 60, null, 57, null, 55, null, null, null] },
  { id: "chiptune", tr: "8-Bit Macera", en: "8-Bit Adventure", bpm: 140, wave: "square", pattern: [69, 72, 76, 72, 69, 72, 76, 79, 77, 76, 74, 72, 74, 76, 72, null] },
  { id: "bass", tr: "Derin Bas", en: "Deep Bass", bpm: 110, wave: "sawtooth", pattern: [33, null, 33, 33, null, 36, null, 33, 31, null, 31, null, 38, null, 36, null] },
];

interface TextOverlay {
  id: number; text: string; x: number; y: number; size: number; color: string;
}

const midiToFreq = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

type Tab = "music" | "templates" | "text" | "filter" | "export";

const Cut = () => {
  const { language } = useLanguage();
  const tr = language === "tr";
  const L = (a: string, b: string) => (tr ? a : b);
  const { toast } = useToast();

  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoName, setVideoName] = useState("");
  const [musicUrl, setMusicUrl] = useState<string | null>(null);
  const [musicName, setMusicName] = useState("");
  const [synthId, setSynthId] = useState<string | null>(null);

  const [duration, setDuration] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [activePreset, setActivePreset] = useState("normal");
  const [texts, setTexts] = useState<TextOverlay[]>([]);
  const [activeTextId, setActiveTextId] = useState<number | null>(null);
  const [newText, setNewText] = useState("");

  const [musicVol, setMusicVol] = useState(70);
  const [videoVol, setVideoVol] = useState(100);
  const [musicMuted, setMusicMuted] = useState(false);

  const [tab, setTab] = useState<Tab>("music");
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const musicRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const actxRef = useRef<AudioContext | null>(null);
  const videoGainRef = useRef<GainNode | null>(null);
  const musicGainRef = useRef<GainNode | null>(null);
  const srcCreatedRef = useRef(false);
  const synthRef = useRef<{ timer: number; gain: GainNode } | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recDestRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const exportingRef = useRef(false);

  // ---- Audio graph ----
  const ensureGraph = useCallback(() => {
    if (!actxRef.current) {
      actxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = actxRef.current;
    if (!srcCreatedRef.current && videoRef.current && musicRef.current) {
      try {
        const vSrc = ctx.createMediaElementSource(videoRef.current);
        const vGain = ctx.createGain();
        vSrc.connect(vGain); vGain.connect(ctx.destination);
        videoGainRef.current = vGain;

        const mSrc = ctx.createMediaElementSource(musicRef.current);
        const mGain = ctx.createGain();
        mSrc.connect(mGain); mGain.connect(ctx.destination);
        musicGainRef.current = mGain;

        srcCreatedRef.current = true;
      } catch { /* already created */ }
    }
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
  }, []);

  // Volume effects
  useEffect(() => {
    if (videoGainRef.current) videoGainRef.current.gain.value = videoVol / 100;
  }, [videoVol]);
  useEffect(() => {
    if (musicGainRef.current) musicGainRef.current.gain.value = musicMuted ? 0 : musicVol / 100;
  }, [musicVol, musicMuted]);

  // Speed effect
  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = speed;
    if (musicRef.current) musicRef.current.playbackRate = speed;
  }, [speed]);

  // ---- Synth music ----
  const stopSynth = useCallback(() => {
    if (synthRef.current) {
      window.clearInterval(synthRef.current.timer);
      try { synthRef.current.gain.disconnect(); } catch {}
      synthRef.current = null;
    }
  }, []);

  const startSynth = useCallback((track: SynthTrack) => {
    stopSynth();
    const ctx = actxRef.current;
    const out = musicGainRef.current;
    if (!ctx || !out) return;
    const g = ctx.createGain();
    g.gain.value = 0.4;
    g.connect(out);
    const stepDur = 60 / track.bpm / 2;
    let step = 0;
    let nextTime = ctx.currentTime + 0.05;
    const timer = window.setInterval(() => {
      while (nextTime < ctx.currentTime + 0.2) {
        const note = track.pattern[step % track.pattern.length];
        if (note != null) {
          const o = ctx.createOscillator();
          o.type = track.wave;
          o.frequency.value = midiToFreq(note);
          const env = ctx.createGain();
          env.gain.setValueAtTime(0.0001, nextTime);
          env.gain.exponentialRampToValueAtTime(0.7, nextTime + 0.01);
          env.gain.exponentialRampToValueAtTime(0.0001, nextTime + stepDur * 0.95);
          o.connect(env); env.connect(g);
          o.start(nextTime); o.stop(nextTime + stepDur);
        }
        step++;
        nextTime += stepDur;
      }
    }, 60);
    synthRef.current = { timer, gain: g };
  }, [stopSynth]);

  // ---- Playback ----
  const playAll = useCallback(() => {
    const v = videoRef.current;
    if (!v || !videoUrl) return;
    ensureGraph();
    if (v.currentTime < trimStart || v.currentTime >= trimEnd - 0.05) v.currentTime = trimStart;
    v.play().catch(() => {});
    if (musicRef.current && musicUrl) musicRef.current.play().catch(() => {});
    if (synthId) {
      const track = SYNTH_TRACKS.find((t) => t.id === synthId);
      if (track) startSynth(track);
    }
    setPlaying(true);
  }, [videoUrl, musicUrl, trimStart, trimEnd, synthId, ensureGraph, startSynth]);

  const pauseAll = useCallback(() => {
    videoRef.current?.pause();
    musicRef.current?.pause();
    stopSynth();
    setPlaying(false);
  }, [stopSynth]);

  const handleTimeUpdate = () => {
    const v = videoRef.current;
    if (!v) return;
    setCurrentTime(v.currentTime);
    if (exportingRef.current) {
      const total = Math.max(0.1, trimEnd - trimStart);
      setExportProgress(Math.min(99, Math.round(((v.currentTime - trimStart) / total) * 100)));
    }
    if (v.currentTime >= trimEnd - 0.03) {
      if (exportingRef.current) {
        finishExport();
      } else {
        pauseAll();
        v.currentTime = trimStart;
        setCurrentTime(trimStart);
      }
    }
  };

  // ---- Canvas render loop ----
  useEffect(() => {
    if (!videoUrl) return;
    let raf = 0;
    const draw = () => {
      const v = videoRef.current;
      const c = canvasRef.current;
      if (v && c && v.readyState >= 2) {
        const ctx2d = c.getContext("2d");
        if (ctx2d) {
          const f = filters;
          ctx2d.filter = `brightness(${f.brightness}%) contrast(${f.contrast}%) saturate(${f.saturate}%) grayscale(${f.grayscale}%) sepia(${f.sepia}%) hue-rotate(${f.hue}deg) blur(${f.blur}px)`;
          ctx2d.drawImage(v, 0, 0, c.width, c.height);
          ctx2d.filter = "none";
          for (const t of texts) {
            ctx2d.font = `bold ${t.size}px sans-serif`;
            ctx2d.textAlign = "center";
            ctx2d.textBaseline = "middle";
            ctx2d.shadowColor = "rgba(0,0,0,0.8)";
            ctx2d.shadowBlur = 10;
            ctx2d.fillStyle = t.color;
            ctx2d.fillText(t.text, (t.x / 100) * c.width, (t.y / 100) * c.height);
            ctx2d.shadowBlur = 0;
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [videoUrl, filters, texts]);

  // ---- File handlers ----
  const handleVideoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    setVideoName(file.name);
    setTexts([]);
    setFilters(DEFAULT_FILTERS);
    setActivePreset("normal");
    setSpeed(1);
    setCurrentTime(0);
    setPlaying(false);
  };

  const handleMusicFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (musicUrl) URL.revokeObjectURL(musicUrl);
    setMusicUrl(URL.createObjectURL(file));
    setMusicName(file.name);
    setSynthId(null);
    stopSynth();
  };

  const onLoadedMetadata = () => {
    const v = videoRef.current;
    const c = canvasRef.current;
    if (!v || !c) return;
    const scale = Math.min(1, 1280 / (v.videoWidth || 1280));
    c.width = Math.round((v.videoWidth || 1280) * scale);
    c.height = Math.round((v.videoHeight || 720) * scale);
    const d = isFinite(v.duration) ? v.duration : 0;
    setDuration(d);
    setTrimStart(0);
    setTrimEnd(d);
  };

  const resetProject = () => {
    pauseAll();
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    if (musicUrl) URL.revokeObjectURL(musicUrl);
    setVideoUrl(null); setVideoName("");
    setMusicUrl(null); setMusicName("");
    setSynthId(null);
    setTexts([]); setFilters(DEFAULT_FILTERS); setActivePreset("normal");
    setSpeed(1); setDuration(0); setTrimStart(0); setTrimEnd(0); setCurrentTime(0);
  };

  // ---- Export ----
  const startExport = async () => {
    const v = videoRef.current;
    const c = canvasRef.current;
    if (!v || !c || !videoUrl) return;
    ensureGraph();
    const ctx = actxRef.current;
    if (!ctx || !videoGainRef.current || !musicGainRef.current) {
      toast({ title: L("Ses motoru hazır değil", "Audio engine not ready"), variant: "destructive" });
      return;
    }
    pauseAll();

    const dest = ctx.createMediaStreamDestination();
    recDestRef.current = dest;
    videoGainRef.current.connect(dest);
    musicGainRef.current.connect(dest);

    const canvasStream = c.captureStream(30);
    const combined = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...dest.stream.getAudioTracks(),
    ]);

    let mime = "video/webm;codecs=vp9,opus";
    if (!MediaRecorder.isTypeSupported(mime)) mime = "video/webm";
    const rec = new MediaRecorder(combined, { mimeType: mime, videoBitsPerSecond: 6_000_000 });
    recorderRef.current = rec;
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
    rec.onstop = () => {
      const blob = new Blob(chunks, { type: "video/webm" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `scatydeo-cut-${Date.now()}.webm`;
      a.click();
      toast({ title: L("Video indirildi! 🎬", "Video downloaded! 🎬") });
    };

    v.currentTime = trimStart;
    if (musicRef.current && musicUrl) musicRef.current.currentTime = 0;
    exportingRef.current = true;
    setExporting(true);
    setExportProgress(0);
    rec.start(250);
    v.play().catch(() => {});
    if (musicRef.current && musicUrl) musicRef.current.play().catch(() => {});
    if (synthId) {
      const track = SYNTH_TRACKS.find((t) => t.id === synthId);
      if (track) startSynth(track);
    }
    setPlaying(true);
  };

  const finishExport = () => {
    exportingRef.current = false;
    pauseAll();
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") rec.stop();
    recorderRef.current = null;
    try {
      if (recDestRef.current) {
        videoGainRef.current?.disconnect(recDestRef.current);
        musicGainRef.current?.disconnect(recDestRef.current);
      }
    } catch {}
    recDestRef.current = null;
    if (videoRef.current) videoRef.current.currentTime = trimStart;
    setExporting(false);
    setExportProgress(100);
  };

  // ---- Text overlays ----
  const addText = () => {
    if (!newText.trim()) return;
    const id = Date.now();
    setTexts((p) => [...p, { id, text: newText.trim(), x: 50, y: 50, size: 48, color: "#ffffff" }]);
    setActiveTextId(id);
    setNewText("");
  };
  const updateText = (id: number, patch: Partial<TextOverlay>) =>
    setTexts((p) => p.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  const activeText = texts.find((t) => t.id === activeTextId) || null;

  const applyTemplate = (t: Template) => {
    setFilters({ ...DEFAULT_FILTERS, ...t.filters });
    setActivePreset("");
    if (t.speed) setSpeed(t.speed);
    if (t.text && !texts.some((x) => x.text === t.text)) {
      const id = Date.now();
      setTexts((p) => [...p, { id, text: t.text!, x: 50, y: 20, size: 56, color: "#ffffff" }]);
      setActiveTextId(id);
    }
    toast({ title: L(`"${t.tr}" şablonu uygulandı`, `"${t.en}" template applied`) });
  };

  const fmt = (s: number) => {
    if (!isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const tabs: { id: Tab; icon: any; label: string }[] = [
    { id: "music", icon: Music, label: L("Müzik", "Music") },
    { id: "templates", icon: LayoutTemplate, label: L("Şablonlar", "Templates") },
    { id: "text", icon: Type, label: L("Metin", "Text") },
    { id: "filter", icon: Wand2, label: L("Filtreler", "Filters") },
    { id: "export", icon: Download, label: L("Dışa Aktar", "Export") },
  ];

  return (
    <div className="md3-scope min-h-screen bg-background">
      <Navbar />
      {/* Hidden media elements */}
      <video
        ref={videoRef}
        src={videoUrl || undefined}
        className="hidden"
        playsInline
        onLoadedMetadata={onLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
      />
      <audio ref={musicRef} src={musicUrl || undefined} className="hidden" loop />

      <main className="container mx-auto px-4 pt-20 pb-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <img src={cutLogo} alt="Scatydeo Cut logo" className="w-9 h-12 object-contain" />
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                Scatydeo Cut
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-primary font-semibold uppercase tracking-wide">Beta</span>
              </h1>
              <p className="text-sm text-muted-foreground">
                {L("Tarayıcıda çalışan video editörü — kes, müzik ekle, filtrele, indir", "In-browser video editor — trim, add music, filter, download")}
              </p>
            </div>
          </div>
          {videoUrl && (
            <Button variant="outline" size="sm" onClick={resetProject}>
              <RotateCcw className="w-4 h-4 mr-2" />
              {L("Yeni Proje", "New Project")}
            </Button>
          )}
        </div>

        {!videoUrl ? (
          /* Dropzone */
          <div className="max-w-2xl mx-auto">
            <label
              htmlFor="cut-video-input"
              className="block border-2 border-dashed border-primary/40 rounded-2xl p-14 text-center cursor-pointer hover:border-primary/70 hover:bg-primary/5 transition-all"
            >
              <Film className="w-16 h-16 text-primary mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">{L("Video yükleyerek başla", "Start by uploading a video")}</h2>
              <p className="text-muted-foreground text-sm mb-4">
                {L("MP4, WebM, MOV — videon cihazından çıkmaz, her şey tarayıcıda işlenir", "MP4, WebM, MOV — your video never leaves your device, everything is processed in the browser")}
              </p>
              <Button variant="hero" type="button">
                <Upload className="w-4 h-4 mr-2" />
                {L("Video Seç", "Choose Video")}
              </Button>
            </label>
            <input id="cut-video-input" type="file" accept="video/*" className="hidden" onChange={handleVideoFile} />

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8">
              {[
                { icon: Scissors, t: L("Kesme", "Trim") },
                { icon: Music, t: L("Müzik", "Music") },
                { icon: Wand2, t: L("Filtreler", "Filters") },
                { icon: Type, t: L("Metin", "Text") },
              ].map((f, i) => (
                <div key={i} className="rounded-xl border border-border bg-card p-4 text-center">
                  <f.icon className="w-6 h-6 text-primary mx-auto mb-2" />
                  <p className="text-sm font-medium">{f.t}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Preview + transport */}
            <div className="lg:col-span-2 space-y-4">
              <div
                className="relative rounded-2xl overflow-hidden bg-black border border-border cursor-pointer"
                onClick={() => (playing ? pauseAll() : playAll())}
              >
                <canvas ref={canvasRef} className="w-full h-auto block" />
                {!playing && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <div className="w-16 h-16 rounded-full bg-primary/90 flex items-center justify-center">
                      <Play className="w-8 h-8 text-primary-foreground ml-1" />
                    </div>
                  </div>
                )}
                {exporting && (
                  <div className="absolute top-3 right-3 px-3 py-1.5 rounded-full bg-red-600 text-white text-xs font-bold animate-pulse">
                    REC %{exportProgress}
                  </div>
                )}
              </div>

              {/* Transport */}
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Button size="icon" variant="hero" onClick={() => (playing ? pauseAll() : playAll())} disabled={exporting}>
                    {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                  </Button>
                  <span className="text-sm font-mono text-muted-foreground whitespace-nowrap">
                    {fmt(currentTime)} / {fmt(trimEnd)}
                  </span>
                  <input
                    type="range"
                    min={trimStart}
                    max={trimEnd || 1}
                    step={0.01}
                    value={Math.min(Math.max(currentTime, trimStart), trimEnd)}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      if (videoRef.current) videoRef.current.currentTime = v;
                      setCurrentTime(v);
                    }}
                    className="flex-1 accent-primary"
                    disabled={exporting}
                  />
                </div>

                {/* Trim */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs flex items-center gap-1"><Scissors className="w-3 h-3" /> {L("Başlangıç", "Start")}: {fmt(trimStart)}</Label>
                    <input
                      type="range" min={0} max={duration || 1} step={0.1} value={trimStart}
                      onChange={(e) => {
                        const v = Math.min(parseFloat(e.target.value), trimEnd - 0.5);
                        setTrimStart(Math.max(0, v));
                      }}
                      className="w-full accent-primary" disabled={exporting}
                    />
                  </div>
                  <div>
                    <Label className="text-xs flex items-center gap-1"><Scissors className="w-3 h-3" /> {L("Bitiş", "End")}: {fmt(trimEnd)}</Label>
                    <input
                      type="range" min={0} max={duration || 1} step={0.1} value={trimEnd}
                      onChange={(e) => {
                        const v = Math.max(parseFloat(e.target.value), trimStart + 0.5);
                        setTrimEnd(Math.min(duration, v));
                      }}
                      className="w-full accent-primary" disabled={exporting}
                    />
                  </div>
                </div>

                {/* Speed */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Gauge className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{L("Hız", "Speed")}:</span>
                  {[0.5, 0.75, 1, 1.25, 1.5, 2].map((s) => (
                    <button
                      key={s}
                      onClick={() => setSpeed(s)}
                      disabled={exporting}
                      className={cn(
                        "px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                        speed === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"
                      )}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              </div>

              <p className="text-xs text-muted-foreground truncate px-1">
                🎬 {videoName} · {fmt(trimEnd - trimStart)} {L("seçili", "selected")}
                {musicName && ` · 🎵 ${musicName}`}
                {synthId && ` · 🎵 ${tr ? SYNTH_TRACKS.find((t) => t.id === synthId)?.tr : SYNTH_TRACKS.find((t) => t.id === synthId)?.en}`}
              </p>
            </div>

            {/* Side panel */}
            <div className="rounded-xl border border-border bg-card overflow-hidden flex flex-col">
              <div className="flex border-b border-border overflow-x-auto">
                {tabs.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={cn(
                      "flex-1 min-w-[64px] flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                      tab === t.id ? "text-primary border-b-2 border-primary bg-primary/5" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <t.icon className="w-4 h-4" />
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="p-4 flex-1 overflow-y-auto max-h-[520px]">
                {/* MUSIC TAB */}
                {tab === "music" && (
                  <div className="space-y-5">
                    <div>
                      <Label className="mb-2 block">{L("Müzik yükle", "Upload music")}</Label>
                      <label htmlFor="cut-music-input" className="block border-2 border-dashed border-primary/30 rounded-xl p-4 text-center cursor-pointer hover:border-primary/60 transition-colors">
                        <Music className="w-6 h-6 text-primary mx-auto mb-1" />
                        <p className="text-xs text-muted-foreground">{musicName || L("MP3, WAV, OGG seç", "Choose MP3, WAV, OGG")}</p>
                      </label>
                      <input id="cut-music-input" type="file" accept="audio/*" className="hidden" onChange={handleMusicFile} />
                      {musicUrl && (
                        <Button variant="ghost" size="sm" className="mt-2 text-destructive" onClick={() => { setMusicUrl(null); setMusicName(""); }}>
                          <Trash2 className="w-3.5 h-3.5 mr-1" /> {L("Müziği kaldır", "Remove music")}
                        </Button>
                      )}
                    </div>

                    <div>
                      <Label className="mb-2 block">{L("Hazır müzikler (synth)", "Built-in music (synth)")}</Label>
                      <div className="space-y-2">
                        {SYNTH_TRACKS.map((t) => (
                          <button
                            key={t.id}
                            onClick={() => {
                              if (synthId === t.id) { setSynthId(null); stopSynth(); }
                              else { setSynthId(t.id); setMusicUrl(null); setMusicName(""); if (playing) startSynth(t); }
                            }}
                            className={cn(
                              "w-full text-left px-3 py-2.5 rounded-lg border text-sm transition-colors flex items-center justify-between",
                              synthId === t.id ? "border-primary bg-primary/10 text-foreground" : "border-border hover:bg-muted/50 text-muted-foreground"
                            )}
                          >
                            <span>{tr ? t.tr : t.en}</span>
                            <span className="text-[10px] opacity-70">{t.bpm} BPM</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs flex items-center gap-1 mb-1">
                          <button onClick={() => setMusicMuted(!musicMuted)} className="text-primary">
                            {musicMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                          </button>
                          {L("Müzik sesi", "Music volume")}: %{musicVol}
                        </Label>
                        <Slider value={[musicVol]} onValueChange={([v]) => setMusicVol(v)} max={100} step={1} />
                      </div>
                      <div>
                        <Label className="text-xs mb-1 block">{L("Video sesi", "Video volume")}: %{videoVol}</Label>
                        <Slider value={[videoVol]} onValueChange={([v]) => setVideoVol(v)} max={100} step={1} />
                      </div>
                    </div>
                  </div>
                )}

                {/* TEMPLATES TAB */}
                {tab === "templates" && (
                  <div className="grid grid-cols-2 gap-2.5">
                    {TEMPLATES.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => applyTemplate(t)}
                        className="rounded-xl overflow-hidden border border-border hover:border-primary transition-colors text-left group"
                      >
                        <div className="h-16 flex items-end p-2" style={{ background: t.gradient }}>
                          <span className="text-white text-xs font-bold drop-shadow">{tr ? t.tr : t.en}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* TEXT TAB */}
                {tab === "text" && (
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <Input
                        value={newText}
                        onChange={(e) => setNewText(e.target.value)}
                        placeholder={L("Metin yaz...", "Type text...")}
                        maxLength={60}
                        onKeyDown={(e) => e.key === "Enter" && addText()}
                      />
                      <Button size="icon" variant="hero" onClick={addText}>
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>

                    {texts.length > 0 && (
                      <div className="space-y-1.5">
                        {texts.map((t) => (
                          <div
                            key={t.id}
                            className={cn(
                              "flex items-center justify-between px-3 py-2 rounded-lg border cursor-pointer text-sm",
                              activeTextId === t.id ? "border-primary bg-primary/10" : "border-border hover:bg-muted/50"
                            )}
                            onClick={() => setActiveTextId(t.id)}
                          >
                            <span className="truncate">{t.text}</span>
                            <button onClick={(e) => { e.stopPropagation(); setTexts((p) => p.filter((x) => x.id !== t.id)); if (activeTextId === t.id) setActiveTextId(null); }} className="text-destructive ml-2">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {activeText && (
                      <div className="space-y-3 pt-2 border-t border-border">
                        <div>
                          <Label className="text-xs mb-1 block">{L("Boyut", "Size")}: {activeText.size}px</Label>
                          <Slider value={[activeText.size]} onValueChange={([v]) => updateText(activeText.id, { size: v })} min={16} max={140} step={1} />
                        </div>
                        <div>
                          <Label className="text-xs mb-1 block">{L("Yatay konum", "Horizontal")}: %{activeText.x}</Label>
                          <Slider value={[activeText.x]} onValueChange={([v]) => updateText(activeText.id, { x: v })} max={100} step={1} />
                        </div>
                        <div>
                          <Label className="text-xs mb-1 block">{L("Dikey konum", "Vertical")}: %{activeText.y}</Label>
                          <Slider value={[activeText.y]} onValueChange={([v]) => updateText(activeText.id, { y: v })} max={100} step={1} />
                        </div>
                        <div className="flex items-center gap-2">
                          <Label className="text-xs">{L("Renk", "Color")}:</Label>
                          <input
                            type="color"
                            value={activeText.color}
                            onChange={(e) => updateText(activeText.id, { color: e.target.value })}
                            className="w-10 h-8 rounded cursor-pointer bg-transparent"
                          />
                        </div>
                      </div>
                    )}

                    {texts.length === 0 && (
                      <p className="text-xs text-muted-foreground">{L("Videonun üstüne yazı eklemek için yukarıya yaz ve +'ya bas.", "Type above and press + to add text over your video.")}</p>
                    )}
                  </div>
                )}

                {/* FILTER TAB */}
                {tab === "filter" && (
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {FILTER_PRESETS.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => { setFilters({ ...DEFAULT_FILTERS, ...p.f }); setActivePreset(p.id); }}
                          className={cn(
                            "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                            activePreset === p.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted/50"
                          )}
                        >
                          {tr ? p.tr : p.en}
                        </button>
                      ))}
                    </div>
                    {([
                      ["brightness", L("Parlaklık", "Brightness"), 0, 200, "%"],
                      ["contrast", L("Kontrast", "Contrast"), 0, 200, "%"],
                      ["saturate", L("Doygunluk", "Saturation"), 0, 300, "%"],
                      ["grayscale", L("Gri tonlama", "Grayscale"), 0, 100, "%"],
                      ["sepia", L("Sepya", "Sepia"), 0, 100, "%"],
                      ["hue", L("Renk tonu", "Hue"), 0, 360, "°"],
                      ["blur", L("Bulanıklık", "Blur"), 0, 10, "px"],
                    ] as [keyof Filters, string, number, number, string][]).map(([key, label, min, max, unit]) => (
                      <div key={key}>
                        <Label className="text-xs mb-1 block">{label}: {filters[key]}{unit}</Label>
                        <Slider
                          value={[filters[key]]}
                          onValueChange={([v]) => { setFilters((p) => ({ ...p, [key]: v })); setActivePreset(""); }}
                          min={min} max={max} step={1}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* EXPORT TAB */}
                {tab === "export" && (
                  <div className="space-y-4">
                    <div className="rounded-lg bg-muted/50 p-3 space-y-1 text-sm">
                      <p><span className="text-muted-foreground">{L("Süre", "Duration")}:</span> {fmt(trimEnd - trimStart)}</p>
                      <p><span className="text-muted-foreground">{L("Hız", "Speed")}:</span> {speed}x</p>
                      <p><span className="text-muted-foreground">{L("Müzik", "Music")}:</span> {musicName || (synthId ? (tr ? SYNTH_TRACKS.find((t) => t.id === synthId)?.tr : SYNTH_TRACKS.find((t) => t.id === synthId)?.en) : L("Yok", "None"))}</p>
                      <p><span className="text-muted-foreground">{L("Metin", "Text")}:</span> {texts.length}</p>
                      <p><span className="text-muted-foreground">{L("Format", "Format")}:</span> WebM</p>
                    </div>
                    {exporting ? (
                      <div className="space-y-2">
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-primary to-accent transition-all" style={{ width: `${exportProgress}%` }} />
                        </div>
                        <p className="text-xs text-center text-muted-foreground">
                          {L("İşleniyor... Video sonuna kadar oynatılıyor", "Processing... Playing through to the end")} %{exportProgress}
                        </p>
                      </div>
                    ) : (
                      <Button variant="hero" size="lg" className="w-full" onClick={startExport}>
                        <Download className="w-5 h-5 mr-2" />
                        {L("Videoyu İndir", "Download Video")}
                      </Button>
                    )}
                    <p className="text-[11px] text-muted-foreground">
                      {L(
                        "Dışa aktarma, videoyu baştan sona gerçek zamanlı işler — filtreler, metinler ve müzik karışımıyla birlikte .webm olarak iner.",
                        "Export renders the video in real time — filters, texts and mixed music included, downloaded as .webm."
                      )}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Cut;
