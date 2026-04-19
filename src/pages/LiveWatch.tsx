import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { rtdb } from "@/integrations/firebase/client";
import { ref as fbRef, onValue, push as fbPush, query as fbQuery, limitToLast, off } from "firebase/database";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  Radio,
  Eye,
  MessageSquare,
  MessageSquareOff,
  Send,
  User,
  AlertTriangle,
} from "lucide-react";

interface StreamData {
  id: string;
  title: string;
  description: string | null;
  user_id: string;
  is_live: boolean;
  chat_enabled: boolean;
  viewer_count: number;
  playback_url: string | null;
  started_at: string | null;
}

interface ChatMessage {
  id: string;
  content: string;
  user_id: string;
  created_at: string | null;
  username?: string;
}

const LiveWatch = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [stream, setStream] = useState<StreamData | null>(null);
  const [streamerProfile, setStreamerProfile] = useState<{ username: string | null; avatar_url: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [chatVisible, setChatVisible] = useState(true);
  const [liveFrame, setLiveFrame] = useState<string | null>(null);
  const [frameStale, setFrameStale] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const usernameCache = useRef<Record<string, string>>({});

  useEffect(() => {
    if (!id) return;
    fetchStream();
    // Poll stream status every 5 seconds for live updates
    const interval = setInterval(fetchStream, 5000);
    return () => clearInterval(interval);
  }, [id]);

  // Firebase RTDB: live frame subscription
  useEffect(() => {
    if (!stream?.id) return;
    const frameRef = fbRef(rtdb, `streams/${stream.id}/frame`);
    const unsub = onValue(frameRef, (snap) => {
      const val = snap.val() as { data?: string; ts?: number } | null;
      if (val?.data) {
        setLiveFrame(val.data);
        setFrameStale(false);
      } else {
        setLiveFrame(null);
      }
    });
    // Mark frame stale if no update for >5s
    const staleCheck = setInterval(() => {
      // We rely on onValue updates; if none come, mark as stale via timestamp gap
    }, 3000);
    return () => {
      off(frameRef);
      clearInterval(staleCheck);
    };
  }, [stream?.id]);

  // Firebase RTDB: chat subscription (last 100 messages)
  useEffect(() => {
    if (!stream?.id || !stream.chat_enabled) {
      setChatMessages([]);
      return;
    }
    const chatRef = fbQuery(fbRef(rtdb, `streams/${stream.id}/chat`), limitToLast(100));
    const unsub = onValue(chatRef, async (snap) => {
      const val = snap.val() as Record<string, { content: string; user_id: string; created_at: number }> | null;
      if (!val) {
        setChatMessages([]);
        return;
      }
      const arr = Object.entries(val)
        .map(([id, m]) => ({ id, ...m, created_at: new Date(m.created_at).toISOString() }))
        .sort((a, b) => (a.created_at || "").localeCompare(b.created_at || ""));

      // Resolve usernames (cache)
      const missing = arr.map((m) => m.user_id).filter((uid) => !usernameCache.current[uid]);
      if (missing.length) {
        const { data: profiles } = await supabase
          .from("profiles").select("id, username").in("id", [...new Set(missing)]);
        profiles?.forEach((p) => { usernameCache.current[p.id] = p.username || ""; });
      }

      setChatMessages(
        arr.map((m) => ({
          ...m,
          username: usernameCache.current[m.user_id] || (language === "tr" ? "Anonim" : "Anonymous"),
        }))
      );
    });
    return () => { off(fbRef(rtdb, `streams/${stream.id}/chat`)); };
  }, [stream?.id, stream?.chat_enabled, language]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const fetchStream = async () => {
    const { data, error } = await supabase
      .from("streams_public")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) {
      if (!stream) setLoading(false);
      return;
    }

    setStream(data as unknown as StreamData);

    if (data.user_id && !streamerProfile) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("username, avatar_url")
        .eq("id", data.user_id)
        .single();
      if (profile) setStreamerProfile(profile);
    }
    setLoading(false);
  };



  const handleSendMessage = async () => {
    if (!user || !stream?.id || !newMessage.trim() || sending) return;
    setSending(true);
    try {
      const chatRef = fbRef(rtdb, `streams/${stream.id}/chat`);
      await fbPush(chatRef, {
        content: newMessage.trim().slice(0, 500),
        user_id: user.id,
        created_at: Date.now(),
      });
      // Mirror to Supabase for persistence (best-effort)
      supabase.from("stream_chat_messages").insert({
        stream_id: stream.id,
        user_id: user.id,
        content: newMessage.trim().slice(0, 500),
      }).then(() => {});
      setNewMessage("");
    } catch (err: any) {
      toast({ title: t.common.error, description: err.message, variant: "destructive" });
    }
    setSending(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center pt-32">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!stream) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <AlertTriangle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">
            {language === "tr" ? "Yayın bulunamadı" : "Stream not found"}
          </h1>
          <Button variant="outline" onClick={() => navigate("/lives")}>
            {language === "tr" ? "Canlı Yayınlara Dön" : "Back to Live Streams"}
          </Button>
        </div>
      </div>
    );
  }

  if (!stream.is_live) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <Radio className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">
            {language === "tr" ? "Bu yayın sona erdi" : "This stream has ended"}
          </h1>
          <Button variant="outline" onClick={() => navigate("/lives")}>
            {language === "tr" ? "Canlı Yayınlara Dön" : "Back to Live Streams"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-20 pb-8">
        <div className="flex flex-col lg:flex-row gap-4 max-w-7xl mx-auto">
          {/* Video area */}
          <div className="flex-1">
            <div className="relative bg-black rounded-xl overflow-hidden aspect-video mb-4">
              {stream.playback_url ? (
                <video
                  src={stream.playback_url}
                  className="w-full h-full object-contain"
                  autoPlay
                  playsInline
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center">
                    <Radio className="w-16 h-16 text-muted-foreground mx-auto mb-2 animate-pulse" />
                    <p className="text-muted-foreground text-sm">
                      {language === "tr" ? "Yayın devam ediyor..." : "Stream is live..."}
                    </p>
                  </div>
                </div>
              )}
              <Badge variant="destructive" className="absolute top-4 left-4 animate-pulse">
                🔴 {t.stream.live}
              </Badge>
              <div className="absolute top-4 right-4 bg-black/70 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                <Eye className="w-3 h-3" />
                {stream.viewer_count} {t.stream.viewers}
              </div>
            </div>

            {/* Stream info */}
            <h1 className="text-xl font-bold mb-2">{stream.title}</h1>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                {streamerProfile?.avatar_url ? (
                  <img src={streamerProfile.avatar_url} className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <User className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
              <span className="font-medium text-sm">
                {streamerProfile?.username || (language === "tr" ? "Anonim" : "Anonymous")}
              </span>
            </div>
            {stream.description && (
              <p className="text-sm text-muted-foreground">{stream.description}</p>
            )}
          </div>

          {/* Chat area */}
          {stream.chat_enabled && (
            <div className="w-full lg:w-80 border border-border rounded-xl flex flex-col h-[500px] lg:h-[600px]">
              <div className="flex items-center justify-between p-3 border-b border-border">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  {t.stream.chat}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setChatVisible(!chatVisible)}
                >
                  {chatVisible ? (
                    <MessageSquareOff className="w-4 h-4" />
                  ) : (
                    <MessageSquare className="w-4 h-4" />
                  )}
                </Button>
              </div>

              {chatVisible && (
                <>
                  <ScrollArea className="flex-1 p-3">
                    <div className="space-y-2">
                      {chatMessages.length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-4">
                          {language === "tr" ? "Henüz mesaj yok" : "No messages yet"}
                        </p>
                      )}
                      {chatMessages.map((msg) => (
                        <div key={msg.id} className="text-sm">
                          <span className="font-semibold text-primary text-xs">{msg.username}: </span>
                          <span className="text-foreground text-xs">{msg.content}</span>
                        </div>
                      ))}
                      <div ref={chatEndRef} />
                    </div>
                  </ScrollArea>

                  {user ? (
                    <div className="p-3 border-t border-border flex gap-2">
                      <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder={language === "tr" ? "Mesaj yaz..." : "Type a message..."}
                        className="text-xs h-8"
                        maxLength={500}
                        onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                      />
                      <Button size="sm" onClick={handleSendMessage} disabled={sending || !newMessage.trim()} className="h-8 px-2">
                        <Send className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="p-3 border-t border-border text-center">
                      <p className="text-xs text-muted-foreground">
                        {language === "tr"
                          ? "Sohbet etmek için giriş yapmalısınız."
                          : "Sign in to chat."}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default LiveWatch;
