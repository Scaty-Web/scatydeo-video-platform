import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Sparkles, ImagePlus, Film, Loader2, Download, Upload as UploadIcon, X, Mic } from "lucide-react";

const W = 1280, H = 720;
const TTS_MODELS = [
  { id: "google/gemini-3.1-flash-tts-preview", label: "Gemini 3.1 Flash TTS" },
  { id: "google/gemini-2.5-flash-tts", label: "Gemini 2.5 Flash TTS" },
  { id: "google/gemini-2.5-pro-tts", label: "Gemini 2.5 Pro TTS" },
];
const VOICES = ["Kore", "Puck", "Charon", "Fenrir", "Aoede", "Zephyr", "Leda", "Orus"];

type Plan = { title: string; thinking: string; duration: number; background: string; code: string; narration: { start: number; text: string }[] };

const fileToDataUrl = (f: File | Blob) => new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = rej; r.readAsDataURL(f); });

const shrink = async (src: CanvasImageSource, w: number, h: number) => {
  const s = Math.min(1, 768 / Math.max(w, h));
  const c = document.createElement("canvas"); c.width = Math.round(w * s); c.height = Math.round(h * s);
  c.getContext("2d")!.drawImage(src, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.82);
};

const imageFileToData = async (f: File) => {
  const img = new Image(); img.src = await fileToDataUrl(f); await img.decode();
  return shrink(img, img.naturalWidth, img.naturalHeight);
};

const videoFrames = (f: File, n = 3) => new Promise<string[]>((resolve) => {
  const url = URL.createObjectURL(f); const v = document.createElement("video");
  v.muted = true; v.preload = "auto"; v.src = url; const out: string[] = [];
  const done = () => { URL.revokeObjectURL(url); resolve(out); };
  v.onerror = done;
  v.onloadedmetadata = async () => {
    const d = isFinite(v.duration) ? v.duration : 1;
    for (let i = 0; i < n; i++) {
      await new Promise<void>((r) => { v.onseeked = () => r(); v.currentTime = (d * (i + 0.5)) / n; setTimeout(r, 3000); });
      try { out.push(await shrink(v, v.videoWidth, v.videoHeight)); } catch { /* skip */ }
    }
    done();
  };
});

// Sandboxed iframe runs the AI-written JS safely (no access to the app) and streams frames back.
const sandboxDoc = `<!doctype html><html><body style="margin:0;background:#000"><canvas id="c" width="${W}" height="${H}"></canvas><script>
const c=document.getElementById('c'),ctx=c.getContext('2d');let draw=null,assets=[];
window.addEventListener('message',async e=>{const m=e.data||{};
 if(m.type==='load'){try{assets=await Promise.all((m.images||[]).map(async u=>{const b=await (await fetch(u)).blob();return createImageBitmap(b)}));
  draw=new Function(m.code+'\\n;return typeof draw==="function"?draw:null;')();
  parent.postMessage({type:draw?'ready':'error',error:draw?null:'draw() bulunamadı'},'*');}catch(err){parent.postMessage({type:'error',error:String(err)},'*')}}
 if(m.type==='frame'&&draw){try{ctx.save();ctx.fillStyle=m.bg||'#000';ctx.fillRect(0,0,${W},${H});draw(ctx,m.t,${W},${H},assets);ctx.restore();}catch(err){}
  const bmp=await createImageBitmap(c);parent.postMessage({type:'frame',bmp},'*',[bmp]);}
});</script></body></html>`;

const pickMime = () => {
  const list = ["video/mp4;codecs=avc1.42E01E,mp4a.40.2", "video/mp4", "video/webm;codecs=vp9,opus", "video/webm"];
  return list.find((m) => (window as any).MediaRecorder?.isTypeSupported?.(m)) || "video/webm";
};

const AIStudio = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [ttsModel, setTtsModel] = useState(TTS_MODELS[0].id);
  const [voice, setVoice] = useState("Kore");
  const [stage, setStage] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [result, setResult] = useState<{ url: string; blob: Blob; ext: string } | null>(null);
  const [progress, setProgress] = useState(0);
  const [title, setTitle] = useState("");
  const [publishing, setPublishing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const ok = Array.from(list).filter((f) => (f.type.startsWith("image/") || f.type.startsWith("video/")) && f.size < 200 * 1024 * 1024);
    setFiles((p) => [...p, ...ok].slice(0, 4));
  };

  const generate = async () => {
    if (!user) return navigate("/auth");
    if (!prompt.trim()) return;
    // Create audio context during the click so the browser allows sound.
    const actx = new AudioContext();
    setBusy(true); setResult(null); setPlan(null); setProgress(0);
    try {
      setStage("1/4 · İstek ve dosyalar anlaşılıyor…");
      const images: string[] = [];
      for (const f of files) {
        if (f.type.startsWith("image/")) images.push(await imageFileToData(f));
        else images.push(...(await videoFrames(f)));
      }
      setStage("2/4 · Gemini düşünüyor ve HTML/CSS/JS ile sahneyi kodluyor…");
      const { data, error } = await supabase.functions.invoke("ai-video-studio", { body: { action: "plan", prompt, images } });
      if (error || data?.error) throw new Error(data?.error || "AI planı alınamadı");
      const p = data as Plan; setPlan(p); setTitle(p.title);

      setStage("3/4 · Seslendirme yapılıyor…");
      const clips: { start: number; buf: AudioBuffer }[] = [];
      for (const n of p.narration) {
        const { data: a, error: e } = await supabase.functions.invoke("ai-video-studio", { body: { action: "tts", text: n.text, model: ttsModel, voice } });
        if (e || a?.error) { toast({ title: "Bir seslendirme atlandı", description: a?.error }); continue; }
        const bytes = Uint8Array.from(atob(a.audio), (c) => c.charCodeAt(0));
        clips.push({ start: n.start, buf: await actx.decodeAudioData(bytes.buffer) });
      }
      const duration = Math.max(p.duration, ...clips.map((c) => c.start + c.buf.duration + 0.3));

      setStage("4/4 · Video oluşturuluyor ve .mp4 olarak paketleniyor…");
      const out = await render(p, images, clips, duration, actx);
      setResult(out);
      setStage("");
      toast({ title: "Video hazır!" });
    } catch (e: any) {
      toast({ title: "Video yapılamadı", description: e?.message || "Tekrar dene.", variant: "destructive" });
      setStage("");
    } finally {
      setBusy(false); actx.state !== "closed" && setTimeout(() => actx.close(), 500);
    }
  };

  const render = (p: Plan, images: string[], clips: { start: number; buf: AudioBuffer }[], duration: number, actx: AudioContext) =>
    new Promise<{ url: string; blob: Blob; ext: string }>((resolve, reject) => {
      const iframe = frameRef.current!, canvas = canvasRef.current!, ctx = canvas.getContext("2d")!;
      let started = false, t0 = 0, recorder: MediaRecorder | null = null; const chunks: Blob[] = [];
      const onMsg = async (e: MessageEvent) => {
        if (e.source !== iframe.contentWindow) return;
        const m = e.data;
        if (m.type === "error") { cleanup(); reject(new Error("AI kodu çalışmadı: " + m.error)); }
        if (m.type === "ready" && !started) {
          started = true;
          await actx.resume();
          const dest = actx.createMediaStreamDestination();
          const now = actx.currentTime + 0.1;
          clips.forEach((c) => { const s = actx.createBufferSource(); s.buffer = c.buf; s.connect(dest); s.connect(actx.destination); s.start(now + c.start); });
          const stream = new MediaStream([...canvas.captureStream(30).getVideoTracks(), ...dest.stream.getAudioTracks()]);
          const mime = pickMime();
          recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 6_000_000 });
          recorder.ondataavailable = (ev) => ev.data.size && chunks.push(ev.data);
          recorder.onstop = () => { const blob = new Blob(chunks, { type: mime.split(";")[0] }); cleanup(); resolve({ blob, url: URL.createObjectURL(blob), ext: mime.includes("mp4") ? "mp4" : "webm" }); };
          recorder.start(500); t0 = performance.now() + 100;
          iframe.contentWindow!.postMessage({ type: "frame", t: 0, bg: p.background }, "*");
        }
        if (m.type === "frame") {
          ctx.drawImage(m.bmp, 0, 0, W, H); m.bmp.close?.();
          const t = Math.max(0, (performance.now() - t0) / 1000);
          setProgress(Math.min(100, Math.round((t / duration) * 100)));
          if (t >= duration) { recorder?.state === "recording" && recorder.stop(); return; }
          requestAnimationFrame(() => iframe.contentWindow!.postMessage({ type: "frame", t, bg: p.background }, "*"));
        }
      };
      const cleanup = () => window.removeEventListener("message", onMsg);
      window.addEventListener("message", onMsg);
      iframe.contentWindow!.postMessage({ type: "load", code: p.code, images }, "*");
    });

  const download = () => {
    if (!result) return;
    const a = document.createElement("a"); a.href = result.url; a.download = `${(title || "scatydeo-ai").replace(/[^\p{L}\p{N}_-]+/gu, "_")}.${result.ext}`; a.click();
  };

  const publish = async () => {
    if (!user || !result || !title.trim()) return;
    setPublishing(true);
    try {
      const path = `${user.id}/ai-${Date.now()}.${result.ext}`;
      const { error: upErr } = await supabase.storage.from("videos").upload(path, result.blob, { contentType: result.blob.type });
      if (upErr) throw upErr;
      const { data: u } = supabase.storage.from("videos").getPublicUrl(path);
      const { data, error } = await supabase.from("videos").insert({ title: title.trim().slice(0, 150), description: `Scatydeo AI Studio ile oluşturuldu.\nPrompt: ${prompt.slice(0, 800)}`, video_url: u.publicUrl, user_id: user.id, is_public: true }).select().single();
      if (error) throw error;
      toast({ title: "Yayınlandı!" });
      navigate(`/watch/${data.id}`);
    } catch {
      toast({ title: "Yayınlanamadı", description: "Lütfen tekrar dene.", variant: "destructive" });
    } finally { setPublishing(false); }
  };

  return (
    <div className="md3-scope min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-28 max-w-5xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/15 text-primary px-4 py-1 text-sm mb-3"><Sparkles className="w-4 h-4" /> Scatydeo AI Studio · Beta</div>
          <h1 className="text-3xl md:text-4xl font-bold">Yapay zekâ ile kodla video yap</h1>
          <p className="text-muted-foreground mt-2">Gemini isteğini anlar, HTML/CSS/JS ile animasyonu yazar, seslendirir ve .mp4 olarak paketler.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4 rounded-2xl border border-primary/30 bg-card p-5">
            <div className="space-y-2">
              <Label htmlFor="prompt">Prompt</Label>
              <Textarea id="prompt" value={prompt} onChange={(e) => setPrompt(e.target.value)} maxLength={3000} className="min-h-[140px]" placeholder="Örn: Kedimin fotoğrafıyla 15 saniyelik doğum günü videosu, konfeti ve 'İyi ki doğdun' seslendirmesi" />
            </div>
            <div className="space-y-2">
              <Label>Resim / video (isteğe bağlı, en fazla 4)</Label>
              <label className="flex items-center justify-center gap-2 border-2 border-dashed border-primary/30 rounded-xl p-4 cursor-pointer hover:border-primary/60 text-muted-foreground">
                <ImagePlus className="w-5 h-5" /> <Film className="w-5 h-5" /> Dosya ekle
                <input type="file" accept="image/*,video/*" multiple className="hidden" onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
              </label>
              {files.length > 0 && (
                <div className="flex flex-wrap gap-2">{files.map((f, i) => (
                  <span key={i} className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs max-w-full">
                    <span className="truncate max-w-[160px]">{f.name}</span>
                    <button aria-label="Kaldır" onClick={() => setFiles((p) => p.filter((_, j) => j !== i))}><X className="w-3 h-3" /></button>
                  </span>))}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="flex items-center gap-1"><Mic className="w-4 h-4" /> Ses modeli</Label>
                <Select value={ttsModel} onValueChange={setTtsModel}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TTS_MODELS.map((m) => <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>)}</SelectContent></Select>
              </div>
              <div className="space-y-2">
                <Label>Ses</Label>
                <Select value={voice} onValueChange={setVoice}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{VOICES.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select>
              </div>
            </div>
            <Button variant="hero" size="lg" className="w-full" disabled={busy || !prompt.trim()} onClick={generate}>
              {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />} {user ? "Gönder" : "Giriş yap ve gönder"}
            </Button>
            {stage && <p className="text-sm text-primary">{stage}{progress > 0 && ` %${progress}`}</p>}
            {plan?.thinking && <div className="text-sm rounded-xl bg-muted/50 p-3"><b>AI'ın planı:</b> {plan.thinking}</div>}
          </div>

          <div className="space-y-4 rounded-2xl border border-primary/30 bg-card p-5">
            <div className="aspect-video w-full rounded-xl overflow-hidden bg-muted relative">
              {result ? <video src={result.url} controls className="w-full h-full" /> : <canvas ref={canvasRef} width={W} height={H} className="w-full h-full" />}
              {!result && !busy && <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">Önizleme burada görünecek</div>}
            </div>
            {result && (
              <>
                <div className="space-y-2"><Label htmlFor="t">Başlık</Label><Input id="t" value={title} maxLength={150} onChange={(e) => setTitle(e.target.value)} /></div>
                <div className="flex gap-2 flex-wrap">
                  <Button variant="outline" onClick={download}><Download className="w-4 h-4 mr-2" /> İndir (.{result.ext})</Button>
                  <Button variant="hero" onClick={publish} disabled={publishing || !title.trim()}>{publishing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UploadIcon className="w-4 h-4 mr-2" />} Yayınla</Button>
                  <Button variant="ghost" onClick={() => setResult(null)}>Yeni video</Button>
                </div>
              </>
            )}
          </div>
        </div>
        <iframe ref={frameRef} title="ai-sandbox" sandbox="allow-scripts" srcDoc={sandboxDoc} className="hidden" />
      </main>
    </div>
  );
};

export default AIStudio;
