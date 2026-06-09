import { useEffect, useRef, useState } from "react";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import viravoAsset from "@/assets/viravo.mp3.asset.json";
import { cn } from "@/lib/utils";

const TRACK_NAME = "Viravo";
const ARTIST = "Scatydeo Easter Egg";

const formatTime = (t: number) => {
  if (!isFinite(t)) return "0:00";
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
};

const Viravo = () => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => setCurrent(a.currentTime);
    const onMeta = () => setDuration(a.duration);
    const onEnd = () => {
      a.currentTime = 0;
      a.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    };
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("ended", onEnd);
    a.volume = volume;
    a.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("ended", onEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); setPlaying(false); }
    else { a.play(); setPlaying(true); }
  };

  const seek = (v: number[]) => {
    const a = audioRef.current;
    if (!a || !duration) return;
    a.currentTime = (v[0] / 100) * duration;
    setCurrent(a.currentTime);
  };

  const changeVolume = (v: number[]) => {
    const a = audioRef.current;
    if (!a) return;
    const nv = v[0] / 100;
    a.volume = nv;
    setVolume(nv);
    setMuted(nv === 0);
  };

  const toggleMute = () => {
    const a = audioRef.current;
    if (!a) return;
    if (muted) { a.volume = volume || 0.8; setMuted(false); }
    else { a.volume = 0; setMuted(true); }
  };

  const progress = duration ? (current / duration) * 100 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-purple-950/40 to-background flex items-center justify-center p-4 overflow-hidden relative">
      {/* glowing bg */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="bg-card/60 backdrop-blur-2xl border border-primary/40 rounded-3xl p-8 shadow-2xl shadow-primary/30">
          {/* artwork */}
          <div className="relative mx-auto w-56 h-56 mb-6">
            <div
              className={cn(
                "w-full h-full rounded-full bg-gradient-to-br from-primary via-purple-500 to-purple-900 flex items-center justify-center shadow-glow",
                playing && "animate-spin"
              )}
              style={{ animationDuration: "8s" }}
            >
              <div className="w-20 h-20 rounded-full bg-background border-4 border-primary/50" />
            </div>
          </div>

          {/* title */}
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
              {TRACK_NAME}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">{ARTIST}</p>
            <p className="text-xs text-primary/70 mt-2">
              {playing ? `▶ Şu an çalıyor: ${TRACK_NAME}` : "Duraklatıldı"}
            </p>
          </div>

          {/* progress */}
          <div className="mb-2">
            <Slider value={[progress]} onValueChange={seek} max={100} step={0.1} />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mb-6 tabular-nums">
            <span>{formatTime(current)}</span>
            <span>{formatTime(duration)}</span>
          </div>

          {/* controls */}
          <div className="flex items-center justify-center gap-6 mb-6">
            <button
              onClick={toggle}
              className="w-16 h-16 rounded-full bg-primary hover:bg-primary/90 flex items-center justify-center shadow-glow transition-transform hover:scale-105"
              aria-label={playing ? "Duraklat" : "Oynat"}
            >
              {playing ? (
                <Pause className="w-8 h-8 text-primary-foreground" fill="currentColor" />
              ) : (
                <Play className="w-8 h-8 text-primary-foreground ml-1" fill="currentColor" />
              )}
            </button>
          </div>

          {/* volume */}
          <div className="flex items-center gap-3">
            <button onClick={toggleMute} className="text-muted-foreground hover:text-foreground transition-colors">
              {muted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
            <Slider value={[muted ? 0 : volume * 100]} onValueChange={changeVolume} max={100} step={1} className="flex-1" />
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground/60 mt-6">
          🥚 Scatydeo gizli paskalya yumurtası
        </p>
      </div>

      <audio ref={audioRef} src={viravoAsset.url} preload="auto" />
    </div>
  );
};

export default Viravo;