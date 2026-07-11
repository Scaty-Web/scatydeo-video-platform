import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3.1-pro-preview";
const FALLBACK_MODEL = "google/gemini-2.5-pro";
const FINAL_FALLBACK_MODEL = "google/gemini-2.5-flash";
const MAX_REMOTE_VIDEO_BYTES = 50 * 1024 * 1024;

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const inferMimeType = (url: string, fallback = "application/octet-stream") => {
  const cleanUrl = url.split("?")[0].toLowerCase();
  if (cleanUrl.endsWith(".mp4") || cleanUrl.endsWith(".m4v")) return "video/mp4";
  if (cleanUrl.endsWith(".webm")) return "video/webm";
  if (cleanUrl.endsWith(".mov")) return "video/quicktime";
  if (cleanUrl.endsWith(".png")) return "image/png";
  if (cleanUrl.endsWith(".jpg") || cleanUrl.endsWith(".jpeg")) return "image/jpeg";
  if (cleanUrl.endsWith(".webp")) return "image/webp";
  if (cleanUrl.endsWith(".gif")) return "image/gif";
  return fallback;
};

const createMediaBlock = async (url: string): Promise<{ block: Record<string, unknown> | null; skippedReason?: string }> => {
  if (!url) return { block: null, skippedReason: "missing_url" };

  try {
    const head = await fetch(url, { method: "HEAD" });
    if (!head.ok) return { block: null, skippedReason: "head_failed" };

    const contentLength = Number(head.headers.get("content-length") || "0");
    const contentType = (head.headers.get("content-type") || "").split(";")[0].toLowerCase();
    const mimeType = inferMimeType(url, contentType || undefined);

    if (["image/png", "image/jpeg", "image/webp", "image/gif"].includes(mimeType)) {
      return { block: { type: "image_url", image_url: { url } } };
    }

    if (!mimeType.startsWith("video/")) {
      return { block: null, skippedReason: "unsupported_mime" };
    }

    if (contentLength && contentLength > MAX_REMOTE_VIDEO_BYTES) {
      return { block: null, skippedReason: "video_too_large" };
    }

    // OpenRouter/Gemini expects actual videos as `video_url`, not `image_url`.
    // Passing the public storage URL directly lets the model inspect frames/audio
    // instead of forcing fragile base64 downloads inside the edge function.
    return {
      block: {
        type: "video_url",
        video_url: { url },
      },
    };
  } catch (error) {
    console.warn("Skipping media attachment:", error);
    return { block: null, skippedReason: "fetch_failed" };
  }
};

const buildFallbackSummary = (title: string, description: string, comments: string[], language: string) => {
  const shortDescription = description.replace(/\s+/g, " ").trim().slice(0, 220);
  const commentHint = comments.length > 0 ? comments.join(", ").replace(/\s+/g, " ").slice(0, 160) : "";

  if (language === "en") {
    return `This video titled “${title}” is summarized from its available title, description, and comments because video analysis is temporarily unavailable.${shortDescription ? ` Description highlights: ${shortDescription}` : ""}${commentHint ? ` Viewer comments mention: ${commentHint}` : ""}`;
  }

  return `“${title}” başlıklı video, video analizi geçici olarak kullanılamadığı için başlık, açıklama ve yorumlardan özetlendi.${shortDescription ? ` Açıklamada öne çıkanlar: ${shortDescription}` : ""}${commentHint ? ` Yorumlarda bahsedilenler: ${commentHint}` : ""}`;
};

const callAiGateway = async (apiKey: string, prompt: string, mediaBlock: Record<string, unknown> | null, model: string = MODEL) => {
  const response = await fetch(AI_GATEWAY_URL, {
    method: "POST",
    headers: {
      "Lovable-API-Key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        { role: "system", content: "Sen Scatydeo için çalışan dikkatli bir video analistisin. Video dosyası geldiyse kareleri ve sesi önceliklendirirsin; başlık, açıklama ve yorumları yalnızca bağlam olarak kullanırsın. Kısa, doğru, somut ve Türkçe cevap verirsin. Uydurma yapmazsın." },
        {
          role: "user",
          content: mediaBlock
            ? [
                { type: "text", text: prompt },
                mediaBlock,
              ]
            : prompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return { ok: false as const, status: response.status, errorText };
  }

  const data = await response.json();
  return { ok: true as const, summary: data.choices?.[0]?.message?.content || "" };
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Public endpoint: video pages are viewable by guests; auth is optional.
    // Input length limits below prevent credit abuse.
    const { title, description, comments, video_url, language } = await req.json();

    if (!title) {
      return new Response(JSON.stringify({ error: "Title is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Input length limits to prevent credit draining
    const safeTitle = String(title).slice(0, 500);
    const safeDescription = description ? String(description).slice(0, 1000) : "";
    const safeComments = Array.isArray(comments) ? comments.slice(0, 5).map((c: any) => String(c).slice(0, 200)) : [];
    const safeLanguage = language === "en" ? "en" : "tr";
    const safeVideoUrl = typeof video_url === "string" && /^https?:\/\//i.test(video_url) ? video_url.slice(0, 1000) : "";

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const fallbackSummary = buildFallbackSummary(safeTitle, safeDescription, safeComments, safeLanguage);
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return jsonResponse({ summary: fallbackSummary, fallback: true, error: "AI is not configured." });
    }

    const isEn = safeLanguage === "en";
    const languageInstruction = isEn
      ? "Write the summary in English."
      : "Özeti KESİNLİKLE Türkçe yaz. Başka bir dil kullanma.";

    const prompt = `${languageInstruction}

GÖREV: Eklenen video dosyasını gerçekten izle/analiz et ve 5-7 cümlelik NET bir özet yaz.

ADIMLAR (sırayla uygula):
1. Önce video karelerini tara: sahne değişimleri, ekrandaki yazılar, karakterler/nesneler, hareketler, renkler ve ortam.
2. Sonra ses varsa dinle: konuşma, müzik, efekt, ton ve önemli kelimeler.
3. Başlık/açıklama/yorumları sadece bağlam olarak kullan; video kanıtıyla çelişirse videoya güven.
4. Ana konuyu ilk cümlede söyle. Devamında somut sahne/ses kanıtlarıyla ne olduğunu açıkla.
5. En sonda videonun sonucu/amacı/izleyicide bıraktığı ana fikri belirt.

KATI KURALLAR:
- Uydurma. Görmediğin şeyi yazma.
- Başlığa bakıp tahmin yürütme; görsel/ses kanıtı yoksa bunu kısa ve dürüstçe "video kanıtı sınırlı" diye belirt.
- "Anlayamadım", "yorum yapamam" gibi kaçamak cümleler yazma; gördüğün ve duyduğun somut şeyleri anlat.
- Aynı kalıp girişleri kullanma. Direkt konuya gir.
- Çıktı tek paragraf olsun; liste, madde, emoji ve reklam dili kullanma.
- ${isEn ? "Write in English." : "SADECE Türkçe yaz."}

VİDEO META:
Başlık: ${safeTitle}
Açıklama: ${safeDescription || "(yok)"}
${safeComments.length > 0 ? `İzleyici yorumları: ${safeComments.join(" | ")}` : ""}

Şimdi özeti yaz:`;

    const media = await createMediaBlock(safeVideoUrl);
    const mediaBlock = media.block;
    const firstAttempt = await callAiGateway(LOVABLE_API_KEY, prompt, mediaBlock, MODEL);

    if (firstAttempt.ok && firstAttempt.summary) {
      return jsonResponse({ summary: firstAttempt.summary, analyzedVideo: !!mediaBlock, mediaStatus: mediaBlock ? "video_attached" : media.skippedReason });
    }

    console.error("AI gateway error (pro):", firstAttempt.status, firstAttempt.errorText);

    // Retry with faster model, same media
    const flashAttempt = await callAiGateway(LOVABLE_API_KEY, prompt, mediaBlock, FALLBACK_MODEL);
    if (flashAttempt.ok && flashAttempt.summary) {
      return jsonResponse({ summary: flashAttempt.summary, analyzedVideo: !!mediaBlock, mediaStatus: mediaBlock ? "video_attached" : media.skippedReason });
    }
    console.error("AI gateway error (flash):", flashAttempt.status, flashAttempt.errorText);

    const finalAttempt = await callAiGateway(LOVABLE_API_KEY, prompt, mediaBlock, FINAL_FALLBACK_MODEL);
    if (finalAttempt.ok && finalAttempt.summary) {
      return jsonResponse({ summary: finalAttempt.summary, analyzedVideo: !!mediaBlock, mediaStatus: mediaBlock ? "video_attached" : media.skippedReason });
    }
    console.error("AI gateway error (final):", finalAttempt.status, finalAttempt.errorText);

    if (mediaBlock) {
      const retry = await callAiGateway(LOVABLE_API_KEY, prompt, null, FINAL_FALLBACK_MODEL);
      if (retry.ok && retry.summary) {
        return jsonResponse({ summary: retry.summary, analyzedVideo: false, fallback: true, mediaStatus: "text_retry" });
      }
      console.error("AI gateway text-only retry error:", retry.status, retry.errorText);
    }

    const warning = firstAttempt.status === 429
      ? "AI rate limit exceeded. Showing fallback summary."
      : firstAttempt.status === 402
        ? "AI credits exhausted. Showing fallback summary."
        : "AI gateway unavailable. Showing fallback summary.";

    return jsonResponse({ summary: fallbackSummary, fallback: true, analyzedVideo: false, mediaStatus: media.skippedReason || "gateway_failed", error: warning });
  } catch (e) {
    console.error("summarize error:", e);
    return jsonResponse({
      summary: "AI özeti şu anda oluşturulamadı. Lütfen daha sonra tekrar deneyin.",
      fallback: true,
      error: e instanceof Error ? e.message : "Unknown error",
    });
  }
});
