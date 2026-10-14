import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Search as SearchIcon, Loader2, ListVideo } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/useLanguage";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import VideoCard from "@/components/VideoCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAvatarUrl } from "@/lib/defaults";

// Smart search helpers: normalize Turkish chars, split into words, score by matches
const norm = (s: string) =>
  (s || "").toLocaleLowerCase("tr").replace(/ı/g, "i").replace(/ş/g, "s").replace(/ğ/g, "g")
    .replace(/ü/g, "u").replace(/ö/g, "o").replace(/ç/g, "c");
const clean = (w: string) => w.replace(/[%,()*]/g, "");
const score = (text: string, words: string[]) => {
  const t = norm(text);
  return words.reduce((a, w) => a + (t.includes(w) ? (t.startsWith(w) ? 3 : 2) : t.includes(w.slice(0, Math.max(3, w.length - 1))) ? 1 : 0), 0);
};
const orFilter = (cols: string[], words: string[]) =>
  cols.flatMap((c) => words.map((w) => `${c}.ilike.%${clean(w.slice(0, Math.max(3, w.length - 1)))}%`)).join(",");

const Search = () => {
  const { t, language } = useLanguage();
  const tr = language === "tr";
  const [searchParams, setSearchParams] = useSearchParams();
  const queryParam = searchParams.get("q") || "";
  const [searchQuery, setSearchQuery] = useState(queryParam);
  useEffect(() => setSearchQuery(queryParam), [queryParam]);

  const words = queryParam.split(/\s+/).map(norm).map(clean).filter((w) => w.length > 0);

  const { data, isLoading } = useQuery({
    queryKey: ["smart-search", queryParam],
    enabled: words.length > 0,
    queryFn: async () => {
      const raw = queryParam.split(/\s+/).map(clean).filter(Boolean);
      const [v, u, p] = await Promise.all([
        supabase.from("videos")
          .select("id, title, description, category, thumbnail_url, duration, views_count, profiles:user_id (username, display_name)")
          .eq("is_public", true).or(orFilter(["title", "description", "category"], raw)).limit(60),
        supabase.from("profiles").select("id, username, display_name, avatar_url, subscribers_count")
          .or(orFilter(["username", "display_name"], raw)).limit(20),
        supabase.from("playlists").select("id, title, description, user_id")
          .eq("is_public", true).or(orFilter(["title", "description"], raw)).limit(20),
      ]);
      const videos = (v.data ?? [])
        .map((x: any) => ({ ...x, s: score(x.title, words) * 3 + score(x.description ?? "", words) + score(x.category ?? "", words) }))
        .sort((a, b) => b.s - a.s || (b.views_count ?? 0) - (a.views_count ?? 0));
      const users = (u.data ?? []).map((x: any) => ({ ...x, s: score(`${x.username} ${x.display_name}`, words) })).sort((a, b) => b.s - a.s);
      const playlists = (p.data ?? []).map((x: any) => ({ ...x, s: score(`${x.title} ${x.description ?? ""}`, words) })).sort((a, b) => b.s - a.s);

      // Similar videos: same categories as top results
      const cats = Array.from(new Set(videos.slice(0, 5).map((x: any) => x.category).filter(Boolean)));
      let similar: any[] = [];
      if (cats.length) {
        const { data: sim } = await supabase.from("videos")
          .select("id, title, thumbnail_url, duration, views_count, profiles:user_id (username, display_name)")
          .eq("is_public", true).in("category", cats).order("views_count", { ascending: false }).limit(12);
        const ids = new Set(videos.map((x: any) => x.id));
        similar = (sim ?? []).filter((x: any) => !ids.has(x.id));
      }
      return { videos, users, playlists, similar };
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) setSearchParams({ q: searchQuery.trim() });
  };

  const fmt = (c: number | null) => (!c ? "0" : c >= 1e6 ? `${(c / 1e6).toFixed(1)}M` : c >= 1e3 ? `${(c / 1e3).toFixed(1)}K` : `${c}`);

  const VideoList = ({ list }: { list: any[] }) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {list.map((video, i) => (
        <VideoCard key={video.id} videoId={video.id} title={video.title} thumbnail={video.thumbnail_url || ""}
          duration={video.duration || "0:00"} views={fmt(video.views_count)}
          author={video.profiles?.display_name || video.profiles?.username || t.videoGrid.anonymous} delay={i * 0.03} />
      ))}
    </div>
  );

  const total = (data?.videos.length ?? 0) + (data?.users.length ?? 0) + (data?.playlists.length ?? 0);
  const empty = <p className="text-center py-12 text-muted-foreground">{t.search.noResults}</p>;

  return (
    <div className="md3-scope min-h-screen bg-background">
      <Navbar />
      <main className="pt-[calc(var(--nav-h,3.5rem)+2rem)] pb-16">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto mb-8">
            <h1 className="font-display text-3xl md:text-4xl font-bold text-center mb-6">
              <span className="glow-text">{t.search.title}</span>
            </h1>
            <form onSubmit={handleSearch} className="flex gap-3">
              <div className="relative flex-1">
                <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input placeholder={tr ? "Video, kullanıcı veya oynatma listesi ara" : "Search videos, users or playlists"}
                  value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-12 h-12 text-base" />
              </div>
              <Button type="submit" variant="hero" size="lg" className="h-12 px-6">{t.search.searchBtn}</Button>
            </form>
          </div>

          {isLoading && <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}

          {!isLoading && data && (
            <Tabs defaultValue="all">
              <p className="text-muted-foreground mb-3">
                {t.search.resultsFor} "<span className="text-foreground font-medium">{queryParam}</span>" ({total})
              </p>
              <TabsList className="mb-6">
                <TabsTrigger value="all">{tr ? "Tümü" : "All"}</TabsTrigger>
                <TabsTrigger value="videos">{tr ? "Videolar" : "Videos"} ({data.videos.length})</TabsTrigger>
                <TabsTrigger value="users">{tr ? "Kullanıcılar" : "Users"} ({data.users.length})</TabsTrigger>
                <TabsTrigger value="playlists">{tr ? "Listeler" : "Playlists"} ({data.playlists.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="space-y-8">
                {total === 0 && empty}
                {data.users.length > 0 && <UserRow users={data.users.slice(0, 6)} />}
                {data.playlists.length > 0 && <PlaylistGrid list={data.playlists.slice(0, 4)} />}
                {data.videos.length > 0 && <VideoList list={data.videos} />}
                {data.similar.length > 0 && (
                  <section>
                    <h2 className="text-lg font-bold mb-4">{tr ? "Benzer videolar" : "Similar videos"}</h2>
                    <VideoList list={data.similar} />
                  </section>
                )}
              </TabsContent>
              <TabsContent value="videos">{data.videos.length ? <VideoList list={data.videos} /> : empty}</TabsContent>
              <TabsContent value="users">{data.users.length ? <UserRow users={data.users} /> : empty}</TabsContent>
              <TabsContent value="playlists">{data.playlists.length ? <PlaylistGrid list={data.playlists} /> : empty}</TabsContent>
            </Tabs>
          )}

          {!queryParam && (
            <div className="flex flex-col items-center py-16 text-center">
              <SearchIcon className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="font-display text-xl font-semibold text-muted-foreground">{t.search.startSearch}</h3>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

const UserRow = ({ users }: { users: any[] }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
    {users.map((u) => (
      <Link key={u.id} to={`/channel/${u.username}`} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 hover:bg-muted/50">
        <Avatar className="w-12 h-12"><AvatarImage src={getAvatarUrl(u.avatar_url)} /><AvatarFallback>{(u.display_name || u.username || "?").charAt(0)}</AvatarFallback></Avatar>
        <div className="min-w-0">
          <p className="font-semibold truncate">{u.display_name || u.username}</p>
          <p className="text-xs text-muted-foreground truncate">@{u.username} · {u.subscribers_count ?? 0}</p>
        </div>
      </Link>
    ))}
  </div>
);

const PlaylistGrid = ({ list }: { list: any[] }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
    {list.map((p) => (
      <Link key={p.id} to={`/playlist/${p.id}`} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 hover:bg-muted/50">
        <ListVideo className="w-8 h-8 text-primary shrink-0" />
        <div className="min-w-0">
          <p className="font-semibold truncate">{p.title}</p>
          {p.description && <p className="text-xs text-muted-foreground truncate">{p.description}</p>}
        </div>
      </Link>
    ))}
  </div>
);

export default Search;
