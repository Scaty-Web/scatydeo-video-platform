import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Heart,
  MessageCircle,
  Flag,
  Upload as UploadIcon,
  Volume2,
  VolumeX,
  Play,
  Pause,
  X,
  Send,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getAvatarUrl } from "@/lib/defaults";
import defaultCover from "@/assets/switch-default-cover.png";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import SwitchLogo from "@/components/SwitchLogo";

interface SwitchItem {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  video_url: string;
  cover_url: string | null;
  views_count: number;
  likes_count: number;
  comments_count: number;
  created_at: string;
  profiles?: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

interface SwitchComment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles?: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

const formatCount = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${n}`;
};

const SwitchFeed = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const { toast } = useToast();

  const [items, setItems] = useState<SwitchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIdx, setActiveIdx] = useState(0);
  const [muted, setMuted] = useState(true);
  const [playingMap, setPlayingMap] = useState<Record<string, boolean>>({});
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});
  const [subscribedMap, setSubscribedMap] = useState<Record<string, boolean>>({});

  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<SwitchComment[]>([]);
  const [commentInput, setCommentInput] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");

  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});

  const active = items[activeIdx];

  // Fetch switches
  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("switches")
        .select(`
          id, user_id, title, description, video_url, cover_url,
          views_count, likes_count, comments_count, created_at,
          profiles:user_id ( username, display_name, avatar_url )
        `)
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        console.error(error);
        setItems([]);
      } else {
        let list = (data ?? []) as unknown as SwitchItem[];
        // If route has a specific id, move it to the front
        if (id) {
          const idx = list.findIndex((i) => i.id === id);
          if (idx > 0) {
            const [picked] = list.splice(idx, 1);
            list = [picked, ...list];
          } else if (idx === -1) {
            // fetch the specific one and prepend
            const { data: one } = await supabase
              .from("switches")
              .select(`
                id, user_id, title, description, video_url, cover_url,
                views_count, likes_count, comments_count, created_at,
                profiles:user_id ( username, display_name, avatar_url )
              `)
              .eq("id", id)
              .maybeSingle();
            if (one) list = [one as unknown as SwitchItem, ...list];
          }
        }
        setItems(list);
      }
      setLoading(false);
    })();
  }, [id]);

  // Track active item via IntersectionObserver on each video container
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
            const idx = Number((entry.target as HTMLElement).dataset.idx);
            if (!Number.isNaN(idx)) setActiveIdx(idx);
          }
        });
      },
      { root: container, threshold: [0.6] }
    );
    container.querySelectorAll("[data-idx]").forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [items.length]);

  // Play active, pause others, increment views
  useEffect(() => {
    items.forEach((it, idx) => {
      const v = videoRefs.current[it.id];
      if (!v) return;
      if (idx === activeIdx) {
        v.muted = muted;
        v.play().catch(() => {});
        setPlayingMap((m) => ({ ...m, [it.id]: true }));
      } else {
        v.pause();
        v.currentTime = 0;
        setPlayingMap((m) => ({ ...m, [it.id]: false }));
      }
    });
    if (active) {
      const seenKey = `switch_seen_${active.id}`;
      if (!sessionStorage.getItem(seenKey)) {
        supabase.rpc("increment_switch_view_count", { target_switch_id: active.id });
        sessionStorage.setItem(seenKey, "1");
      }
    }
  }, [activeIdx, items, muted, active]);

  // Liked / subscribed status for active
  useEffect(() => {
    if (!user || !active) return;
    (async () => {
      const { data: liked } = await supabase.rpc("has_user_liked_switch", {
        target_switch_id: active.id,
      });
      setLikedMap((m) => ({ ...m, [active.id]: !!liked }));
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("id")
        .eq("subscriber_id", user.id)
        .eq("channel_id", active.user_id)
        .maybeSingle();
      setSubscribedMap((m) => ({ ...m, [active.user_id]: !!sub }));
    })();
  }, [user, active]);

  const togglePlay = (s: SwitchItem) => {
    const v = videoRefs.current[s.id];
    if (!v) return;
    if (v.paused) {
      v.play();
      setPlayingMap((m) => ({ ...m, [s.id]: true }));
    } else {
      v.pause();
      setPlayingMap((m) => ({ ...m, [s.id]: false }));
    }
  };

  const toggleLike = async (s: SwitchItem) => {
    if (!user) {
      navigate("/auth");
      return;
    }
    const isLiked = likedMap[s.id];
    if (isLiked) {
      await supabase.from("switch_likes").delete().eq("switch_id", s.id).eq("user_id", user.id);
      setLikedMap((m) => ({ ...m, [s.id]: false }));
      setItems((arr) =>
        arr.map((x) => (x.id === s.id ? { ...x, likes_count: Math.max(x.likes_count - 1, 0) } : x))
      );
    } else {
      await supabase.from("switch_likes").insert({ switch_id: s.id, user_id: user.id });
      setLikedMap((m) => ({ ...m, [s.id]: true }));
      setItems((arr) =>
        arr.map((x) => (x.id === s.id ? { ...x, likes_count: x.likes_count + 1 } : x))
      );
    }
  };

  const toggleSubscribe = async (channelId: string) => {
    if (!user) {
      navigate("/auth");
      return;
    }
    if (user.id === channelId) return;
    const subscribed = subscribedMap[channelId];
    if (subscribed) {
      await supabase
        .from("subscriptions")
        .delete()
        .eq("subscriber_id", user.id)
        .eq("channel_id", channelId);
      setSubscribedMap((m) => ({ ...m, [channelId]: false }));
    } else {
      await supabase
        .from("subscriptions")
        .insert({ subscriber_id: user.id, channel_id: channelId });
      setSubscribedMap((m) => ({ ...m, [channelId]: true }));
    }
  };

  const openComments = useCallback(async () => {
    if (!active) return;
    setCommentsOpen(true);
    const { data } = await supabase
      .from("switch_comments")
      .select("id, content, created_at, user_id")
      .eq("switch_id", active.id)
      .order("created_at", { ascending: false });

    const list = (data ?? []) as SwitchComment[];
    // hydrate profiles
    const ids = Array.from(new Set(list.map((c) => c.user_id)));
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .in("id", ids);
      const map = new Map((profs ?? []).map((p: any) => [p.id, p]));
      list.forEach((c) => (c.profiles = map.get(c.user_id) as any));
    }
    setComments(list);
  }, [active]);

  const sendComment = async () => {
    if (!user || !active || !commentInput.trim()) return;
    const { data, error } = await supabase
      .from("switch_comments")
      .insert({ switch_id: active.id, user_id: user.id, content: commentInput.trim() })
      .select()
      .single();
    if (error) {
      toast({ title: t.common.error, description: error.message, variant: "destructive" });
      return;
    }
    const { data: prof } = await supabase
      .from("profiles")
      .select("username, display_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle();
    setComments((c) => [{ ...(data as any), profiles: prof as any } as SwitchComment, ...c]);
    setItems((arr) =>
      arr.map((x) => (x.id === active.id ? { ...x, comments_count: x.comments_count + 1 } : x))
    );
    setCommentInput("");
  };

  const submitReport = async () => {
    if (!user || !active || !reportReason.trim()) return;
    const { error } = await supabase
      .from("switch_reports")
      .insert({ switch_id: active.id, reporter_id: user.id, reason: reportReason.trim() });
    if (error) {
      toast({ title: t.common.error, description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: t.switch.reportSent });
    setReportReason("");
    setReportOpen(false);
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString(language === "tr" ? "tr-TR" : "en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center text-white p-6 text-center">
        <SwitchLogo size={72} className="mb-4" />
        <h2 className="text-2xl font-bold mb-2">{t.switch.empty}</h2>
        <p className="text-white/70 mb-6">{t.switch.emptyDesc}</p>
        <div className="flex gap-3">
          <Button variant="hero" onClick={() => navigate("/upload/switch")}>
            <UploadIcon className="w-4 h-4 mr-2" />
            {t.switch.uploadBtn}
          </Button>
          <Button variant="outline" onClick={() => navigate("/")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t.common.goHome}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between p-3 bg-gradient-to-b from-black/70 to-transparent">
        <button
          onClick={() => navigate("/")}
          className="p-2 rounded-full bg-black/40 backdrop-blur text-white"
          aria-label="back"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <SwitchLogo size={28} />
          <span className="text-white font-bold tracking-wide">{t.switch.title}</span>
        </div>
        <button
          onClick={() => setMuted((m) => !m)}
          className="p-2 rounded-full bg-black/40 backdrop-blur text-white"
          aria-label="mute"
        >
          {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>
      </div>

      {/* Vertical snap feed */}
      <div
        ref={containerRef}
        className="h-full w-full overflow-y-scroll snap-y snap-mandatory"
        style={{ scrollSnapType: "y mandatory" }}
      >
        {items.map((s, idx) => {
          const author = s.profiles?.display_name || s.profiles?.username || "Anonim";
          const username = s.profiles?.username;
          const isLiked = !!likedMap[s.id];
          const isSubscribed = !!subscribedMap[s.user_id];
          const isPlaying = playingMap[s.id];
          return (
            <section
              key={s.id}
              data-idx={idx}
              className="relative h-full w-full snap-start flex items-center justify-center"
            >
              {/* Video */}
              <div className="relative h-full w-full max-w-[480px] mx-auto bg-black flex items-center justify-center">
                <video
                  ref={(el) => (videoRefs.current[s.id] = el)}
                  src={s.video_url}
                  poster={s.cover_url || defaultCover}
                  loop
                  playsInline
                  muted={muted}
                  className="h-full w-full object-contain"
                  onClick={() => togglePlay(s)}
                />
                {!isPlaying && idx === activeIdx && (
                  <button
                    onClick={() => togglePlay(s)}
                    className="absolute inset-0 flex items-center justify-center"
                    aria-label="play"
                  >
                    <div className="w-20 h-20 rounded-full bg-black/40 backdrop-blur flex items-center justify-center">
                      <Play className="w-10 h-10 text-white fill-current" />
                    </div>
                  </button>
                )}

                {/* Bottom info overlay */}
                <div className="absolute bottom-0 left-0 right-16 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent text-white space-y-2">
                  <Link
                    to={username ? `/channel/${username}` : "#"}
                    className="flex items-center gap-2"
                  >
                    <Avatar className="w-9 h-9 border-2 border-white">
                      <AvatarImage src={getAvatarUrl(s.profiles?.avatar_url)} />
                      <AvatarFallback>{author.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-bold text-sm leading-tight">@{username || author}</p>
                      <p className="text-xs text-white/70">{formatDate(s.created_at)}</p>
                    </div>
                    {user && user.id !== s.user_id && (
                      <Button
                        size="sm"
                        variant={isSubscribed ? "outline" : "hero"}
                        className="ml-2 h-7 px-3 text-xs"
                        onClick={(e) => {
                          e.preventDefault();
                          toggleSubscribe(s.user_id);
                        }}
                      >
                        {isSubscribed ? t.common.subscribed : t.common.subscribe}
                      </Button>
                    )}
                  </Link>
                  <h3 className="font-semibold text-base">{s.title}</h3>
                  {s.description && (
                    <p className="text-sm text-white/85 line-clamp-3 whitespace-pre-wrap">
                      {s.description}
                    </p>
                  )}
                  <p className="text-xs text-white/60">
                    {formatCount(s.views_count)} {t.common.views}
                  </p>
                </div>

                {/* Right action rail */}
                <div className="absolute right-2 bottom-24 flex flex-col items-center gap-5 text-white">
                  <button
                    onClick={() => toggleLike(s)}
                    className="flex flex-col items-center"
                    aria-label="like"
                  >
                    <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur flex items-center justify-center">
                      <Heart
                        className={`w-6 h-6 ${isLiked ? "text-red-500 fill-current" : "text-white"}`}
                      />
                    </div>
                    <span className="text-xs mt-1">{formatCount(s.likes_count)}</span>
                  </button>

                  <button
                    onClick={openComments}
                    className="flex flex-col items-center"
                    aria-label="comments"
                  >
                    <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur flex items-center justify-center">
                      <MessageCircle className="w-6 h-6" />
                    </div>
                    <span className="text-xs mt-1">{formatCount(s.comments_count)}</span>
                  </button>

                  <button
                    onClick={() => {
                      if (!user) {
                        navigate("/auth");
                        return;
                      }
                      setReportOpen(true);
                    }}
                    className="flex flex-col items-center"
                    aria-label="report"
                  >
                    <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur flex items-center justify-center">
                      <Flag className="w-6 h-6" />
                    </div>
                  </button>

                  <button
                    onClick={() => navigate("/upload/switch")}
                    className="flex flex-col items-center"
                    aria-label="upload"
                  >
                    <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-glow">
                      <UploadIcon className="w-6 h-6" />
                    </div>
                  </button>
                </div>
              </div>
            </section>
          );
        })}
      </div>

      {/* Comments dialog */}
      <Dialog open={commentsOpen} onOpenChange={setCommentsOpen}>
        <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{t.common.comments}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-3 py-2">
            {comments.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-8">
                {t.switch.noComments}
              </p>
            ) : (
              comments.map((c) => (
                <div key={c.id} className="flex gap-2">
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
                  </div>
                </div>
              ))
            )}
          </div>
          {user ? (
            <div className="flex gap-2 pt-2 border-t border-border">
              <Textarea
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                placeholder={t.switch.commentPh}
                className="min-h-[44px] max-h-32"
              />
              <Button onClick={sendComment} disabled={!commentInput.trim()} size="icon">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <Button onClick={() => navigate("/auth")} variant="hero">
              {t.common.signIn}
            </Button>
          )}
        </DialogContent>
      </Dialog>

      {/* Report dialog */}
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t.switch.reportTitle}</DialogTitle>
          </DialogHeader>
          <Textarea
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            placeholder={t.switch.reportPh}
            className="min-h-[100px]"
          />
          <Button onClick={submitReport} variant="destructive" disabled={!reportReason.trim()}>
            {t.switch.sendComment}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SwitchFeed;
