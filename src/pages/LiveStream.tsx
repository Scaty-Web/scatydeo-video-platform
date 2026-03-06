import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Send, Radio, MessageSquare, MessageSquareOff, Users } from "lucide-react";

interface StreamData {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  playback_url: string | null;
  is_live: boolean;
  chat_enabled: boolean;
  viewer_count: number;
  user_id: string;
  started_at: string | null;
}

interface ChatMessage {
  id: string;
  content: string;
  user_id: string;
  created_at: string | null;
  profile?: { username: string | null; avatar_url: string | null; display_name: string | null };
}

const LiveStream = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [stream, setStream] = useState<StreamData | null>(null);
  const [streamerProfile, setStreamerProfile] = useState<any>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (id) {
      fetchStream();
      fetchMessages();
      subscribeToUpdates();
    }
    return () => {
      supabase.removeAllChannels();
    };
  }, [id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchStream = async () => {
    const { data } = await supabase
      .from("streams")
      .select("*")
      .eq("id", id!)
      .single();

    if (data) {
      setStream(data);
      // Fetch streamer profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", data.user_id)
        .single();
      setStreamerProfile(profile);
    }
    setLoading(false);
  };

  const fetchMessages = async () => {
    const { data } = await supabase
      .from("stream_chat_messages")
      .select("*")
      .eq("stream_id", id!)
      .order("created_at", { ascending: true })
      .limit(100);

    if (data) {
      // Fetch profiles for messages
      const userIds = [...new Set(data.map(m => m.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, display_name")
        .in("id", userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      const messagesWithProfiles = data.map(m => ({
        ...m,
        profile: profileMap.get(m.user_id) || null,
      }));
      setMessages(messagesWithProfiles as ChatMessage[]);
    }
  };

  const subscribeToUpdates = () => {
    // Subscribe to chat messages
    supabase
      .channel(`stream-chat-${id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "stream_chat_messages",
        filter: `stream_id=eq.${id}`,
      }, async (payload) => {
        const newMsg = payload.new as any;
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, username, avatar_url, display_name")
          .eq("id", newMsg.user_id)
          .single();

        setMessages(prev => [...prev, { ...newMsg, profile }]);
      })
      .subscribe();

    // Subscribe to stream status changes
    supabase
      .channel(`stream-status-${id}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "streams",
        filter: `id=eq.${id}`,
      }, (payload) => {
        setStream(prev => prev ? { ...prev, ...payload.new } : null);
      })
      .subscribe();
  };

  const sendMessage = async () => {
    if (!user || !newMessage.trim() || !stream) return;

    await supabase.from("stream_chat_messages").insert({
      stream_id: stream.id,
      user_id: user.id,
      content: newMessage.trim(),
    });

    setNewMessage("");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!stream) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <p className="text-muted-foreground">{t.stream.streamNotFound}</p>
          <Link to="/"><Button variant="outline">{t.notFound.returnHome}</Button></Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8 pt-24">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video Player Area */}
          <div className="lg:col-span-2 space-y-4">
            <div className="relative aspect-video bg-black rounded-xl overflow-hidden">
              {stream.is_live && stream.playback_url ? (
                <video
                  src={stream.playback_url}
                  autoPlay
                  controls
                  className="w-full h-full object-contain"
                />
              ) : stream.thumbnail_url ? (
                <div className="relative w-full h-full">
                  <img src={stream.thumbnail_url} alt={stream.title} className="w-full h-full object-cover" />
                  {!stream.is_live && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                      <p className="text-white text-xl font-semibold">{t.stream.offline}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <p className="text-muted-foreground">{stream.is_live ? t.stream.noPlaybackUrl : t.stream.offline}</p>
                </div>
              )}

              {stream.is_live && (
                <div className="absolute top-4 left-4 flex items-center gap-2">
                  <span className="px-3 py-1 bg-red-600 text-white text-sm font-semibold rounded-full flex items-center gap-1.5 animate-pulse">
                    <Radio className="w-3.5 h-3.5" />
                    {t.stream.live}
                  </span>
                  <span className="px-3 py-1 bg-black/60 text-white text-sm rounded-full flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    {stream.viewer_count}
                  </span>
                </div>
              )}
            </div>

            {/* Stream Info */}
            <div className="space-y-3">
              <h1 className="text-2xl font-bold">{stream.title}</h1>
              {streamerProfile && (
                <Link to={`/channel/${streamerProfile.username}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={streamerProfile.avatar_url || undefined} />
                    <AvatarFallback><User className="w-5 h-5" /></AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{streamerProfile.display_name || streamerProfile.username}</p>
                    <p className="text-sm text-muted-foreground">@{streamerProfile.username}</p>
                  </div>
                </Link>
              )}
              {stream.description && (
                <p className="text-muted-foreground">{stream.description}</p>
              )}
            </div>
          </div>

          {/* Chat */}
          <div className="lg:col-span-1">
            <div className="glass-card rounded-xl flex flex-col h-[500px] lg:h-[calc(56.25vw*0.66+120px)] max-h-[700px]">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2">
                  {stream.chat_enabled ? (
                    <><MessageSquare className="w-4 h-4" /> {t.stream.chat}</>
                  ) : (
                    <><MessageSquareOff className="w-4 h-4" /> {t.stream.chatDisabled}</>
                  )}
                </h3>
              </div>

              {stream.chat_enabled ? (
                <>
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {messages.length === 0 && (
                      <p className="text-center text-muted-foreground text-sm">{t.stream.noChatMessages}</p>
                    )}
                    {messages.map((msg) => (
                      <div key={msg.id} className="flex items-start gap-2">
                        <Avatar className="w-6 h-6 flex-shrink-0">
                          <AvatarImage src={msg.profile?.avatar_url || undefined} />
                          <AvatarFallback><User className="w-3 h-3" /></AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <span className="text-xs font-semibold text-primary">
                            {msg.profile?.display_name || msg.profile?.username || t.videoGrid.anonymous}
                          </span>
                          <p className="text-sm break-words">{msg.content}</p>
                        </div>
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>

                  {user ? (
                    <div className="p-3 border-t border-border">
                      <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="flex gap-2">
                        <Input
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          placeholder={t.stream.chatPlaceholder}
                          className="bg-background/50 border-primary/30"
                          maxLength={500}
                        />
                        <Button type="submit" size="icon" disabled={!newMessage.trim()}>
                          <Send className="w-4 h-4" />
                        </Button>
                      </form>
                    </div>
                  ) : (
                    <div className="p-3 border-t border-border text-center">
                      <p className="text-sm text-muted-foreground">{t.stream.loginToChat}</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-muted-foreground">{t.stream.chatDisabledMessage}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default LiveStream;
