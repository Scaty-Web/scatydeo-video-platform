import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { Switch } from "@/components/ui/switch";
import { checkMp4Support, encodeStudioMp4, narrationTimeline } from "@/lib/aiStudioMedia";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Sparkles, ImagePlus, Film, Loader2, Download, Upload as UploadIcon, X, Mic } from "lucide-react";
import { DEFAULT_STUDIO_VOICE, STUDIO_VOICES } from "../../supabase/functions/ai-video-studio/voices";

const W = 1280, H = 720;
const TTS_MODELS = [
  { id: "eleven_multilingual_v2", label: "ElevenLabs Multilingual v2" },
  { id: "eleven_turbo_v2_5", label: "ElevenLabs Turbo v2.5" },
];
const VOICES = Object.keys(STUDIO_VOICES);

type Plan = { title: string; thinking: string; duration: number; background: string; code: string; narration: { start: number; text: string }[] };

const fileToDataUrl = (f: File | Blob) => new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = rej; r.readAsDataURL(f); });

const shrink = async (src: CanvasImageSource, w: number, h: number) => {
  const s = Math.min(1, 768 / Math.max(w, h));
  const c = document.createElement("canvas"); c.width = Math.round(w * s); c.height = Math.round(h * s);
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("Görsel işlenemedi.");
  ctx.drawImage(src, 0, 0, c.width, c.height);
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

// Opaque-origin sandbox: only the parent supplies messages; generated code has no network access.
const sandboxDoc = `<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval'; img-src data: blob:; connect-src 'none'; style-src 'unsafe-inline'"></head><body style="margin:0"><canvas id="c" width="${W}" height="${H}"></canvas><script>
const c=document.getElementById('c'),ctx=c.getContext('2d');let draw=null,assets=[];
window.addEventListener('message',async e=>{if(e.source!==parent)return;const m=e.data||{};
try { if(m.type==='load'){assets=await Promise.all((m.images||[]).map(u=>new Promise((r,j)=>{const i=new Image();i.onload=()=>r(i);i.onerror=()=>j(new Error('Görsel yüklenemedi'));i.src=u})));
 draw=new Function(m.code+'\\n;return typeof draw==="function"?draw:null;')();if(!draw)throw new Error('draw() bulunamadı');parent.postMessage({type:'ready'},'*');}
 if(m.type==='frame'&&draw){ctx.save();try{ctx.fillStyle=m.bg;ctx.fillRect(0,0,${W},${H});draw(ctx,m.t,${W},${H},assets);}finally{ctx.restore();}
 const bmp=await createImageBitmap(c);parent.postMessage({type:'frame',bmp},'*',[bmp]);}
}catch(err){parent.postMessage({type:'error',error:String(err)},'*')}});</script></body></html>`;

async function invokeStudio(body: Record<string, unknown>) {
 const {data,error}=await supabase.functions.invoke("ai-video-studio",{body});
 if(error){
  if(error instanceof FunctionsHttpError){const detail=await error.context.json().catch(()=>null);throw new Error(detail?.error ? `${detail.error}${detail.details && typeof detail.details === "string" ? " " + detail.details : ""}` : error.message);}
  throw error;
 }
 if(data?.error)throw new Error(data.error);
 return data;
}

// Binary audio must be read as bytes; the functions client decodes audio/mpeg as text and corrupts it.
async function fetchNarration(body: { text: string; model: string; voice: string }, signal: AbortSignal) {
 const { data: { session } } = await supabase.auth.getSession();
 if (!session) throw new Error("Giriş yapmalısın.");
 const r = await fetch(`https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/ai-video-studio`, {
  method: "POST", signal,
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
  body: JSON.stringify({ action: "tts", ...body }),
 });
 if (!r.ok) {
  const detail = await r.json().catch(() => null);
  throw new Error(detail?.error ? `${detail.error}${detail.status ? ` (${detail.status})` : ""}` : `Seslendirme başarısız (${r.status}).`);
 }
 const buf = await r.arrayBuffer();
 if (!buf.byteLength) throw new Error("Seslendirme dosyası boş geldi.");
 return buf;
}

const AIStudio = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [ttsModel, setTtsModel] = useState(TTS_MODELS[0].id);
  const [voice, setVoice] = useState<string>(DEFAULT_STUDIO_VOICE);
  const [narrationEnabled, setNarrationEnabled] = useState(true);
  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => () => abortRef.current?.abort(), []);
  const [stage, setStage] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [result, setResult] = useState<{ url: string; blob: Blob; ext: string } | null>(null);
  useEffect(() => () => { if (result?.url) URL.revokeObjectURL(result.url); }, [result]);
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
    const controller = new AbortController(); abortRef.current = controller;
    setBusy(true); setResult(null); setPlan(null); setProgress(0);
    try {
      await checkMp4Support(narrationEnabled);
      setStage("1/4 · İstek ve dosyalar anlaşılıyor…");
      const images: string[] = [];
      for (const f of files) {
        if (f.type.startsWith("image/")) images.push(await imageFileToData(f));
        else images.push(...(await videoFrames(f)));
      }
      setStage("2/4 · Gemini düşünüyor ve HTML/CSS/JS ile sahneyi kodluyor…");
      const data = await invokeStudio({ action: "plan", prompt, images, narration: narrationEnabled });
      controller.signal.throwIfAborted();
      const p = data as Plan; setPlan(p); setTitle(p.title);

      setStage("3/4 · Seslendirme yapılıyor…");
      const clips: { start: number; buf: AudioBuffer }[] = [];
      for (const n of narrationEnabled ? p.narration : []) {
        const audio = await fetchNarration({ text: n.text, model: ttsModel, voice }, controller.signal);
        clips.push({ start: n.start, buf: await actx.decodeAudioData(audio) });
        controller.signal.throwIfAborted();
      }
      const timeline = narrationTimeline(clips.map(c => ({ start: c.start, duration: c.buf.duration })));
      const scheduled = clips.map((c, i) => ({ ...c, start: timeline[i].start }));
      const duration = Math.max(p.duration, ...scheduled.map(c => c.start + c.buf.duration + 0.3));

      setStage("4/4 · Video oluşturuluyor ve .mp4 olarak paketleniyor…");
      const out = await render(p, images, scheduled, duration, controller.signal);
      setResult(out);
      setStage("");
      toast({ title: "Video hazır!" });
    } catch (e: any) {
      toast({ title: "Video yapılamadı", description: e?.message || "Tekrar dene.", variant: "destructive" });
      setStage("");
    } finally {
      setBusy(false); abortRef.current = null;
      if (actx.state !== "closed") await actx.close();
    }
  };

  const render = async (p: Plan, images: string[], clips: { start: number; buf: AudioBuffer }[], duration: number, signal: AbortSignal) => {
    const iframe = frameRef.current, canvas = canvasRef.current;
    const target = iframe?.contentWindow, ctx = canvas?.getContext("2d");
    if (!target || !canvas || !ctx) throw new Error("Video alanı hazır değil.");
    const request = (message: Record<string, unknown>, expected: string) => new Promise<MessageEvent['data']>((resolve, reject) => {
      const cleanup = () => { clearTimeout(timer); window.removeEventListener("message", listener); signal.removeEventListener("abort", abort); };
      const abort = () => { cleanup(); reject(new Error("Video oluşturma iptal edildi.")); };
      const listener = (e: MessageEvent) => {
        if (e.source !== target) return;
        if (e.data?.type === "error") { cleanup(); reject(new Error("AI sahnesi çalışmadı: " + e.data.error)); }
        else if (e.data?.type === expected) { cleanup(); resolve(e.data); }
      };
      const timer = setTimeout(() => { cleanup(); reject(new Error("AI sahnesi yanıt vermedi.")); }, 15000);
      window.addEventListener("message", listener); signal.addEventListener("abort", abort, { once: true });
      if (signal.aborted) return abort();
      target.postMessage(message, "*");
    });
    await request({ type: "load", code: p.code, images }, "ready");
    const blob = await encodeStudioMp4(canvas, duration, clips, async t => {
      const frame = await request({ type: "frame", t, bg: p.background }, "frame");
      try { ctx.drawImage(frame.bmp, 0, 0, W, H); } finally { frame.bmp.close(); }
    }, setProgress, signal);
    return { blob, url: URL.createObjectURL(blob), ext: "mp4" };
  };

  const download = () => {
    if (!result) return;
    const a = document.createElement("a"); a.href = result.url; a.download = `${(title || "scatydeo-ai").replace(/[^\p{L}\p{N}_-]+/gu, "_")}.${result.ext}`; document.body.appendChild(a); a.click(); a.remove();
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
      if (error) { await supabase.storage.from("videos").remove([path]); throw error; }
      toast({ title: "Yayınlandı!" });
      navigate(`/watch/${data.id}`);
    } catch {
      toast({ title: "Yayınlanamadı", description: "Lütfen tekrar dene.", variant: "destructive" });
    } finally { setPublishing(false); }
  };

  return (
    <div className="md3-scope min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-32 pb-28 max-w-5xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/15 text-primary px-4 py-1 text-sm mb-3"><Sparkles className="w-4 h-4" /> Scatydeo AI Studio</div>
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
                    <Button type="button" size="icon" variant="ghost" disabled={busy} aria-label="Kaldır" onClick={() => setFiles((p) => p.filter((_, j) => j !== i))}><X className="w-3 h-3" /></Button>
                  </span>))}
                </div>
              )}
            </div>
            <div className="flex items-center justify-between"><Label htmlFor="narration">Seslendirme</Label><Switch id="narration" checked={narrationEnabled} onCheckedChange={setNarrationEnabled} disabled={busy} /></div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="flex items-center gap-1"><Mic className="w-4 h-4" /> Ses modeli</Label>
                <Select disabled={busy || !narrationEnabled} value={ttsModel} onValueChange={setTtsModel}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TTS_MODELS.map((m) => <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>)}</SelectContent></Select>
              </div>
              <div className="space-y-2">
                <Label>Ses</Label>
                <Select disabled={busy || !narrationEnabled} value={voice} onValueChange={setVoice}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{VOICES.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select>
              </div>
            </div>
            <Button variant="hero" size="lg" className="w-full" disabled={busy || !prompt.trim()} onClick={generate}>
              {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />} {user ? "Gönder" : "Giriş yap ve gönder"}
            </Button>
            {busy && <Button variant="outline" onClick={() => abortRef.current?.abort()}>İptal</Button>}
            {stage && <p className="text-sm text-primary">{stage}{progress > 0 && ` %${progress}`}</p>}
            {plan?.thinking && <div className="text-sm rounded-xl bg-muted/50 p-3"><b>AI'ın planı:</b> {plan.thinking}</div>}
          </div>

          <div className="space-y-4 rounded-2xl border border-primary/30 bg-card p-5">
            <div className="aspect-video w-full rounded-xl overflow-hidden bg-muted relative">
              {result ? <video src={result.url} controls playsInline preload="metadata" className="w-full h-full" onError={() => toast({ title: "Önizleme oynatılamadı", description: "MP4 dosyasını indirip tekrar dene.", variant: "destructive" })} /> : <canvas ref={canvasRef} width={W} height={H} className="w-full h-full" />}
              {!result && !busy && <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">Önizleme burada görünecek</div>}
            </div>
            {result && (
              <>
                <div className="space-y-2"><Label htmlFor="t">Başlık</Label><Input id="t" value={title} maxLength={150} onChange={(e) => setTitle(e.target.value)} /></div>
                <div className="flex gap-2 flex-wrap">
                  <Button variant="outline" onClick={download}><Download className="w-4 h-4 mr-2" /> İndir (.{result.ext})</Button>
                  <Button variant="hero" onClick={publish} disabled={publishing || !title.trim()}>{publishing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UploadIcon className="w-4 h-4 mr-2" />} Yayınla</Button>
                  <Button variant="ghost" onClick={() => { setResult(null); setProgress(0); }}>Yeni video</Button>
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
