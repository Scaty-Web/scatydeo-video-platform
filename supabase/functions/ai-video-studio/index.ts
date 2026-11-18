import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { generateChatCompletion, GatewayError } from "npm:@lovable.dev/ai-gateway@0.1.11";
import { z } from "npm:zod@3.25.76";
import { STUDIO_VOICES } from "./voices.ts";

const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const requestSchema = z.discriminatedUnion("action", [
 z.object({ action: z.literal("plan"), prompt: z.string().trim().min(1).max(3000), images: z.array(z.string().max(1500000).regex(/^data:image\/(jpeg|png|webp);base64,/)).max(12).default([]), narration: z.boolean().default(true) }),
 z.object({ action: z.literal("tts"), text: z.string().trim().min(1).max(5000), model: z.enum(["eleven_multilingual_v2", "eleven_turbo_v2_5"]), voice: z.enum(["Jessica", "Roger", "Sarah", "George", "Laura"]) }),
]);
const planSchema = z.object({ title: z.string().min(1).max(150), thinking: z.string(), duration: z.number().min(3).max(40), background: z.string(), code: z.string().min(1), narration: z.array(z.object({ start: z.number().min(0).max(40), text: z.string().min(1).max(400) })).max(12) });
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
- narration: konuşulması gereken yerler; boş dizi olabilir. Cümleler kısa olsun ve sahne zamanlarıyla uyumlu olsun. Kullanıcının sesli konuşma veya videoyu oynatma talimatını açıklama olarak OKUMA; yalnızca videonun gerçek repliklerini narration içine koy. Sessiz video isteniyorsa narration boş olsun. Kullanıcının dilinde yaz.`;

Deno.serve(async (req) => {
 if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
 try {
  const url = Deno.env.get("SUPABASE_URL"), anon = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !anon) return json({ error: "Servis yapılandırılamadı." }, 503);
  const auth = req.headers.get("Authorization") || "";
  const sb = createClient(url, anon, { global: { headers: { Authorization: auth } } });
  const { data: claims, error } = await sb.auth.getClaims(auth.replace("Bearer ", ""));
  if (error || !claims?.claims?.sub) return json({ error: "Giriş yapmalısın." }, 401);
  const { data: banned, error: banError } = await sb.rpc("is_calling_user_banned");
  if (banError) return json({ error: "Hesap durumu doğrulanamadı." }, 503);
  if (banned) return json({ error: "Askıya alınmış hesaplar video oluşturamaz." }, 403);
  const parsed = requestSchema.safeParse(await req.json());
  if (!parsed.success) return json({ error: "Geçersiz istek.", details: parsed.error.flatten() }, 400);
  const body = parsed.data;
  if (body.action === "tts") {
   const key = Deno.env.get("ELEVENLABS_API_KEY");
   if (!key) return json({ error: "ElevenLabs bağlantısı gerekli." }, 503);
   const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${STUDIO_VOICES[body.voice]}?output_format=mp3_44100_128`, {
    method: "POST", headers: { "xi-api-key": key, "Content-Type": "application/json" },
    body: JSON.stringify({ text: body.text, model_id: body.model, voice_settings: { stability: 0.5, similarity_boost: 0.75 } }),
   });
   if (!r.ok) { const details = await r.text(); console.error("ElevenLabs", r.status, details); return json({ error: "ElevenLabs seslendirmesi başarısız.", status: r.status, details }, r.status); }
   return new Response(await r.arrayBuffer(), { headers: { ...corsHeaders, "Content-Type": "audio/mpeg" } });
  }
  const content = [
   { type: "text", text: `İstek: ${body.prompt}\nSeslendirme: ${body.narration ? "Açık; yalnızca istenen replikleri seslendir." : "Kapalı. narration boş dizi olmalı."}\nGörsel sayısı: ${body.images.length}; assets dizisi bu sıradadır.` },
   ...body.images.map(url => ({ type: "image_url" as const, image_url: { url } })),
  ];
  const d = await generateChatCompletion({ model: "google/gemini-3.8-flash", response_format: { type: "json_object" }, messages: [{ role: "system", content: SYSTEM }, { role: "user", content }] });
  const text = d.choices?.[0]?.message?.content;
  if (typeof text !== "string") return json({ error: "Gemini geçerli bir video planı döndürmedi." }, 502);
  const p = planSchema.safeParse(JSON.parse(text.replace(/^```(json)?/i, "").replace(/```$/, "").trim()));
  if (!p.success) return json({ error: "Video planı geçersiz; isteği tekrar düzenle." }, 502);
  return json({ ...p.data, narration: body.narration ? p.data.narration : [] });
 } catch (e) {
  console.error(e);
  if (e instanceof GatewayError) return json({ error: e.httpStatus === 402 ? "AI kredisi yetersiz." : e.httpStatus === 429 ? "Çok fazla istek. Biraz bekle." : "Gemini isteği tamamlanamadı.", details: e.message }, e.httpStatus || 502);
  return json({ error: "İstek tamamlanamadı." }, 500);
 }
});
