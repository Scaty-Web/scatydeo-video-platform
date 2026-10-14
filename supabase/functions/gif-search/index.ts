import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const json = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: { user } } = await sb.auth.getUser(auth.replace("Bearer ", ""));
    if (!user) return json({ error: "Unauthorized" }, 401);

    const { q } = await req.json().catch(() => ({ q: "" }));
    const query = String(q ?? "").trim().slice(0, 100);
    const params = new URLSearchParams({ customer_id: user.id, per_page: "24" });
    if (query) params.set("q", query);
    const res = await fetch(
      `https://connector-gateway.lovable.dev/klipy/gifs/${query ? "search" : "trending"}?${params}`,
      { headers: { Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`, "X-Connection-Api-Key": Deno.env.get("KLIPY_API_KEY")! } },
    );
    if (!res.ok) return json({ error: "GIF provider failed", status: res.status, details: await res.text() }, res.status);
    const data = await res.json();
    if (!data.result) return json({ error: "GIF provider failed", details: data }, 502);
    const gifs = (data.data?.data ?? []).map((g: any) => {
      const f = g.file ?? {};
      const url = f.md?.gif?.url ?? f.sm?.gif?.url ?? f.xs?.gif?.url ?? f.hd?.gif?.url;
      return { id: g.id, title: g.title, url };
    }).filter((g: any) => g.url);
    return json({ gifs });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
