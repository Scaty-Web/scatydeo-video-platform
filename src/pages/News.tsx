import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import BottomNav from "@/components/BottomNav";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Newspaper, MessageCircle, Loader2, Send, Trash2, CornerDownRight } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { getAvatarUrl } from "@/lib/defaults";

interface NewsItem {
  id: string;
  title: string;
  content: string;
  created_at: string;
}

interface NewsComment {
  id: string;
  news_id: string;
  user_id: string;
  content: string;
  created_at: string;
  parent_id: string | null;
  profiles?: { username: string | null; display_name: string | null; avatar_url: string | null } | null;
}

const News = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<Record<string, NewsComment[]>>({});
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [posting, setPosting] = useState<Record<string, boolean>>({});
  const [replyTo, setReplyTo] = useState<Record<string, string | null>>({});
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [replyBusy, setReplyBusy] = useState<Record<string, boolean>>({});

  const isMobile = useIsMobile();
  const { user } = useAuth();
  const { language } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  const isTr = language === "tr";

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("news")
        .select("id, title, content, created_at")
        .eq("is_published", true)
        .order("created_at", { ascending: false });
      setItems((data ?? []) as NewsItem[]);
      setLoading(false);
    })();
  }, []);

  const loadComments = async (newsId: string) => {
    const { data } = await supabase
      .from("news_comments")
      .select("id, news_id, user_id, content, created_at, parent_id")
      .eq("news_id", newsId)
      .order("created_at", { ascending: true });
    const list = (data ?? []) as NewsComment[];
    const ids = Array.from(new Set(list.map((c) => c.user_id)));
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .in("id", ids);
      const map = new Map((profs ?? []).map((p: any) => [p.id, p]));
      list.forEach((c) => (c.profiles = map.get(c.user_id) as any));
    }
    setComments((m) => ({ ...m, [newsId]: list }));
  };

  const toggleComments = async (id: string) => {
    const next = !openComments[id];
    setOpenComments((m) => ({ ...m, [id]: next }));
    if (next && !comments[id]) await loadComments(id);
  };

  const sendComment = async (newsId: string) => {
    if (!user) {
      navigate("/auth");
      return;
    }
    const content = (inputs[newsId] || "").trim();
    if (!content) return;
    setPosting((m) => ({ ...m, [newsId]: true }));
    const { data, error } = await supabase
      .from("news_comments")
      .insert({ news_id: newsId, user_id: user.id, content, parent_id: null })
      .select()
      .single();
    setPosting((m) => ({ ...m, [newsId]: false }));
    if (error) {
      toast({ title: isTr ? "Hata" : "Error", description: "İşlem başarısız oldu. Lütfen tekrar deneyin.", variant: "destructive" });
      return;
    }
    const { data: prof } = await supabase
      .from("profiles")
      .select("username, display_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle();
    setComments((m) => ({
      ...m,
      [newsId]: [...(m[newsId] ?? []), { ...(data as any), profiles: prof as any }],
    }));
    setInputs((m) => ({ ...m, [newsId]: "" }));
  };

  const sendReply = async (newsId: string, parentId: string) => {
    if (!user) { navigate("/auth"); return; }
    const content = (replyText[parentId] || "").trim();
    if (!content) return;
    setReplyBusy((m) => ({ ...m, [parentId]: true }));
    const { data, error } = await supabase
      .from("news_comments")
      .insert({ news_id: newsId, user_id: user.id, content, parent_id: parentId })
      .select()
      .single();
    setReplyBusy((m) => ({ ...m, [parentId]: false }));
    if (error) {
      toast({ title: isTr ? "Hata" : "Error", description: "İşlem başarısız oldu. Lütfen tekrar deneyin.", variant: "destructive" });
      return;
    }
    const { data: prof } = await supabase
      .from("profiles")
      .select("username, display_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle();
    setComments((m) => ({
      ...m,
      [newsId]: [...(m[newsId] ?? []), { ...(data as any), profiles: prof as any }],
    }));
    setReplyText((m) => ({ ...m, [parentId]: "" }));
    setReplyTo((m) => ({ ...m, [newsId]: null }));
  };

  const deleteComment = async (newsId: string, commentId: string) => {
    const { error } = await supabase.from("news_comments").delete().eq("id", commentId);
    if (error) {
      toast({ title: isTr ? "Hata" : "Error", description: "İşlem başarısız oldu. Lütfen tekrar deneyin.", variant: "destructive" });
      return;
    }
    setComments((m) => ({
      ...m,
      [newsId]: (m[newsId] ?? []).filter((c) => c.id !== commentId),
    }));
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString(isTr ? "tr-TR" : "en-US", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  return (
    <div className="md2-scope min-h-screen bg-background">
      <Navbar onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)} />
      {!isMobile && <Sidebar collapsed={sidebarCollapsed} />}
      <main
        className={cn(
          "pt-[var(--nav-h,3.5rem)] transition-all duration-200 min-h-screen",
          isMobile ? "ml-0 pb-16" : sidebarCollapsed ? "ml-[72px]" : "ml-56"
        )}
      >
        <div className="p-4 md:p-8 max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Newspaper className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{isTr ? "Haberler" : "News"}</h1>
              <p className="text-sm text-muted-foreground">
                {isTr ? "Scatydeo güncellemeleri ve duyurular" : "Scatydeo updates and announcements"}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              {isTr ? "Henüz haber yok." : "No news yet."}
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((n) => {
                const isOpen = !!openComments[n.id];
                const list = comments[n.id] ?? [];
                return (
                  <article
                    key={n.id}
                    className="rounded-xl border border-border bg-card p-5 shadow-sm"
                  >
                    <p className="text-xs text-muted-foreground mb-1">{formatDate(n.created_at)}</p>
                    <h2 className="text-lg font-bold mb-2">{n.title}</h2>
                    <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                      {n.content}
                    </p>

                    <div className="mt-4 flex items-center gap-3 border-t border-border pt-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-2"
                        onClick={() => toggleComments(n.id)}
                      >
                        <MessageCircle className="w-4 h-4" />
                        {isTr ? "Yorumlar" : "Comments"}
                      </Button>
                    </div>

                    {isOpen && (
                      <div className="mt-3 space-y-3">
                        {user ? (
                          <div className="flex gap-2">
                            <Textarea
                              value={inputs[n.id] || ""}
                              onChange={(e) => setInputs((m) => ({ ...m, [n.id]: e.target.value }))}
                              placeholder={isTr ? "Yorum yaz..." : "Write a comment..."}
                              className="min-h-[44px] max-h-32"
                            />
                            <Button
                              onClick={() => sendComment(n.id)}
                              disabled={!inputs[n.id]?.trim() || posting[n.id]}
                              size="icon"
                            >
                              {posting[n.id] ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Send className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        ) : (
                          <Button onClick={() => navigate("/auth")} variant="hero" size="sm">
                            {isTr ? "Yorum yapmak için giriş yap" : "Sign in to comment"}
                          </Button>
                        )}

                        {list.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            {isTr ? "Henüz yorum yok." : "No comments yet."}
                          </p>
                        ) : (
                          list
                            .filter((c) => !c.parent_id)
                            .map((c) => {
                              const replies = list.filter((r) => r.parent_id === c.id);
                              return (
                                <div key={c.id} className="space-y-2">
                                  <div className="flex gap-2 group">
                                    <Avatar className="w-8 h-8">
                                      <AvatarImage src={getAvatarUrl(c.profiles?.avatar_url)} />
                                      <AvatarFallback>
                                        {(c.profiles?.display_name || c.profiles?.username || "?").charAt(0)}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1">
                                      <p className="text-xs font-semibold">
                                        @{c.profiles?.username || c.profiles?.display_name || "user"}
                                      </p>
                                      <p className="text-sm">{c.content}</p>
                                      <button
                                        onClick={() => setReplyTo((m) => ({ ...m, [n.id]: m[n.id] === c.id ? null : c.id }))}
                                        className="text-xs text-muted-foreground hover:text-primary mt-1 inline-flex items-center gap-1"
                                      >
                                        <CornerDownRight className="w-3 h-3" />
                                        {isTr ? "Yanıtla" : "Reply"}
                                      </button>
                                    </div>
                                    {user?.id === c.user_id && (
                                      <button
                                        onClick={() => deleteComment(n.id, c.id)}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                                        aria-label="delete"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    )}
                                  </div>

                                  {replyTo[n.id] === c.id && user && (
                                    <div className="ml-10 flex gap-2">
                                      <Textarea
                                        value={replyText[c.id] || ""}
                                        onChange={(e) => setReplyText((m) => ({ ...m, [c.id]: e.target.value }))}
                                        placeholder={isTr ? "Yanıt yaz..." : "Write a reply..."}
                                        className="min-h-[40px] max-h-32"
                                      />
                                      <Button
                                        onClick={() => sendReply(n.id, c.id)}
                                        disabled={!replyText[c.id]?.trim() || replyBusy[c.id]}
                                        size="icon"
                                      >
                                        {replyBusy[c.id] ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                      </Button>
                                    </div>
                                  )}

                                  {replies.map((r) => (
                                    <div key={r.id} className="ml-10 flex gap-2 group border-l-2 border-primary/30 pl-3">
                                      <Avatar className="w-7 h-7">
                                        <AvatarImage src={getAvatarUrl(r.profiles?.avatar_url)} />
                                        <AvatarFallback>
                                          {(r.profiles?.display_name || r.profiles?.username || "?").charAt(0)}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div className="flex-1">
                                        <p className="text-xs font-semibold">
                                          @{r.profiles?.username || r.profiles?.display_name || "user"}
                                        </p>
                                        <p className="text-sm">{r.content}</p>
                                      </div>
                                      {user?.id === r.user_id && (
                                        <button
                                          onClick={() => deleteComment(n.id, r.id)}
                                          className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                                          aria-label="delete"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              );
                            })
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>
        <Footer />
      </main>
      {isMobile && <BottomNav />}
    </div>
  );
};

export default News;
