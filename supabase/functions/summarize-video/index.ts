import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash";
const MAX_INLINE_VIDEO_BYTES = 6 * 1024 * 1024;

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

const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
};

const createMediaBlock = async (url: string) => {
  if (!url) return null;

  try {
    const head = await fetch(url, { method: "HEAD" });
    if (!head.ok) return null;

    const contentLength = Number(head.headers.get("content-length") || "0");
    const contentType = (head.headers.get("content-type") || "").split(";")[0].toLowerCase();
    const mimeType = inferMimeType(url, contentType || undefined);

    if (["image/png", "image/jpeg", "image/webp", "image/gif"].includes(mimeType)) {
      return { type: "image_url", image_url: { url } };
    }

    if (!mimeType.startsWith("video/") || !contentLength || contentLength > MAX_INLINE_VIDEO_BYTES) {
      return null;
    }

    const mediaResponse = await fetch(url);
    if (!mediaResponse.ok) return null;

    const buffer = await mediaResponse.arrayBuffer();
    if (buffer.byteLength > MAX_INLINE_VIDEO_BYTES) return null;

    const responseMimeType = inferMimeType(url, (mediaResponse.headers.get("content-type") || mimeType).split(";")[0].toLowerCase());
    return {
      type: "image_url",
      image_url: { url: `data:${responseMimeType};base64,${arrayBufferToBase64(buffer)}` },
    };
  } catch (error) {
    console.warn("Skipping media attachment:", error);
    return null;
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

const callAiGateway = async (apiKey: string, prompt: string, mediaBlock: Record<string, unknown> | null) => {
  const response = await fetch(AI_GATEWAY_URL, {
    method: "POST",
    headers: {
      "Lovable-API-Key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: "You are a helpful video content summarizer. Keep summaries concise and informative." },
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
    // Auth guard
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    const prompt = `Summarize the following video content in a concise paragraph (3-5 sentences). Write the summary in the same language as the title. ${safeVideoUrl ? "If you can access the video URL, analyze the actual video content (visuals + audio) in addition to the metadata." : ""}

Video Title: ${safeTitle}
${safeDescription ? `Description: ${safeDescription}` : ""}
${safeComments.length > 0 ? `Top Comments: ${safeComments.join(", ")}` : ""}
${safeVideoUrl ? `Video URL: ${safeVideoUrl}` : ""}

Provide a helpful summary that tells viewers what this video is about.`;

    const mediaBlock = await createMediaBlock(safeVideoUrl);
    const firstAttempt = await callAiGateway(LOVABLE_API_KEY, prompt, mediaBlock);

    if (firstAttempt.ok && firstAttempt.summary) {
      return jsonResponse({ summary: firstAttempt.summary, analyzedVideo: !!mediaBlock });
    }

    console.error("AI gateway error:", firstAttempt.status, firstAttempt.errorText);

    if (mediaBlock) {
      const retry = await callAiGateway(LOVABLE_API_KEY, prompt, null);
      if (retry.ok && retry.summary) {
        return jsonResponse({ summary: retry.summary, analyzedVideo: false, fallback: true });
      }
      console.error("AI gateway text-only retry error:", retry.status, retry.errorText);
    }

    const warning = firstAttempt.status === 429
      ? "AI rate limit exceeded. Showing fallback summary."
      : firstAttempt.status === 402
        ? "AI credits exhausted. Showing fallback summary."
        : "AI gateway unavailable. Showing fallback summary.";

    return jsonResponse({ summary: fallbackSummary, fallback: true, analyzedVideo: false, error: warning });
  } catch (e) {
    console.error("summarize error:", e);
    return jsonResponse({
      summary: "AI özeti şu anda oluşturulamadı. Lütfen daha sonra tekrar deneyin.",
      fallback: true,
      error: e instanceof Error ? e.message : "Unknown error",
    });
  }
});
