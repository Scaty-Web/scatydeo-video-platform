import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const GW = "https://ai.gateway.lovable.dev/v1";
const PLAN_MODELS = ["google/gemini-3.8-flash"];
const TTS_MODELS = ["google/gemini-3.1-flash-tts-preview", "google/gemini-2.5-flash-tts", "google/gemini-2.5-pro-tts"];
const VOICES = ["Kore", "Puck", "Charon", "Fenrir", "Aoede", "Zephyr", "Leda", "Orus"];

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const SYSTEM = `Sen Scatydeo AI Studio'sun: HTML/CSS/JS ile kodla video üreten bir yönetmen-programcısın.
Kullanıcının isteğini (ve varsa resim/video karelerini) anla, nasıl yapacağını düşün, sonra animasyonu kodla.
SADECE geçerli JSON döndür:
{
 "title": "kısa başlık",
 "thinking": "2-4 cümle: isteği nasıl anladın ve nasıl yapacaksın",
 "duration": 6-40 arası saniye (sayı),
 "background": "#hex",
 "code": "JS kodu",
 "narration": [{"start": saniye, "text": "seslendirilecek cümle"}]
}
KOD KURALLARI:
- Kod 1280x720 bir <canvas> için "function draw(ctx, t, W, H, assets)" fonksiyonunu tanımlamalı. t = saniye (0..duration).
- Her karede tüm sahneyi baştan çiz (önce arka planı doldur). Deterministik ol (Math.random yerine t'ye bağlı sinüs vb.).
- Sahneler, geçişler (fade/slide/zoom), easing, gradyanlar, şekiller, parçacıklar, büyük okunaklı yazılar kullan. Etkileyici ve profesyonel olsun.
- assets: kullanıcının verdiği görseller (HTMLImageElement/ImageBitmap dizisi, boş olabilir). Varsa ctx.drawImage ile sahnelerde kullan.
- Dış kütüphane, fetch, DOM erişimi, alert YOK. Sadece canvas 2D API.
- Yazı fontu: "bold 64px system-ui" gibi.
- narration: konuşulması gereken yerler; boş dizi olabilir. Cümleler kısa olsun ve sahne zamanlarıyla uyumlu olsun. Kullanıcının dilinde yaz.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") || "";
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: claims, error: cErr } = await sb.auth.getClaims(auth.replace("Bearer ", ""));
    if (cErr || !claims?.claims?.sub) return json({ error: "Giriş yapmalısın." }, 401);

    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) return json({ error: "AI yapılandırılmamış." }, 500);
    const body = await req.json();

    if (body.action === "tts") {
      const text = String(body.text || "").slice(0, 600);
      const model = TTS_MODELS.includes(body.model) ? body.model : TTS_MODELS[0];
      const voice = VOICES.includes(body.voice) ? body.voice : "Kore";
      if (!text.trim()) return json({ error: "Metin yok" }, 400);
      const r = await fetch(`${GW}/audio/speech`, {
        method: "POST",
        headers: { "Lovable-API-Key": key, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          contents: [{ role: "user", parts: [{ text }] }],
          generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } } },
        }),
      });
      if (!r.ok) {
        console.error("tts", r.status, await r.text());
        return json({ error: r.status === 402 ? "AI kredisi bitti." : r.status === 429 ? "Çok fazla istek, biraz bekle." : "Seslendirme başarısız." }, r.status === 402 || r.status === 429 ? r.status : 500);
      }
      const buf = new Uint8Array(await r.arrayBuffer());
      let bin = "";
      for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
      return json({ audio: btoa(bin), mime: r.headers.get("content-type") || "audio/wav" });
    }

    // plan
    const prompt = String(body.prompt || "").slice(0, 3000);
    if (!prompt.trim()) return json({ error: "Prompt gerekli" }, 400);
    const images: string[] = Array.isArray(body.images)
      ? body.images.filter((x: unknown) => typeof x === "string" && /^data:image\//.test(x as string)).slice(0, 6)
      : [];
    const content: unknown[] = [
      { type: "text", text: `İstek: ${prompt}\nEklenen görsel/video karesi sayısı: ${images.length} (kodda assets[0..${Math.max(images.length - 1, 0)}] olarak kullanılabilir; video kareleri de dahil).` },
      ...images.map((url) => ({ type: "image_url", image_url: { url } })),
    ];
    let lastStatus = 500;
    for (const model of PLAN_MODELS) {
      const r = await fetch(`${GW}/chat/completions`, {
        method: "POST",
        headers: { "Lovable-API-Key": key, "Content-Type": "application/json" },
        body: JSON.stringify({ model, response_format: { type: "json_object" }, messages: [{ role: "system", content: SYSTEM }, { role: "user", content }] }),
      });
      if (!r.ok) {
        lastStatus = r.status;
        console.error("plan", model, r.status, await r.text());
        if (r.status === 402 || r.status === 429) break;
        continue;
      }
      const d = await r.json();
      let txt: string = d.choices?.[0]?.message?.content || "";
      txt = txt.replace(/^```(json)?/i, "").replace(/```$/, "").trim();
      try {
        const p = JSON.parse(txt);
        if (typeof p.code !== "string" || !p.code.includes("draw")) throw new Error("no code");
        return json({
          title: String(p.title || "AI Video").slice(0, 150),
          thinking: String(p.thinking || ""),
          duration: Math.min(40, Math.max(3, Number(p.duration) || 10)),
          background: typeof p.background === "string" ? p.background : "#000",
          code: p.code,
          narration: Array.isArray(p.narration) ? p.narration.slice(0, 12).map((n: any) => ({ start: Number(n.start) || 0, text: String(n.text || "").slice(0, 400) })).filter((n: any) => n.text) : [],
        });
      } catch (e) {
        console.error("parse", model, e);
      }
    }
    return json({ error: lastStatus === 402 ? "AI kredisi bitti." : lastStatus === 429 ? "Çok fazla istek, biraz bekle." : "AI video planı oluşturamadı, tekrar dene." }, lastStatus === 402 || lastStatus === 429 ? lastStatus : 500);
  } catch (e) {
    console.error(e);
    return json({ error: "Beklenmeyen hata" }, 500);
  }
});
