import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Calendar, Video as VideoIcon, Users, AlertTriangle } from "lucide-react";
import VideoCard from "@/components/VideoCard";
import { getAvatarUrl, getBannerUrl, getThumbnailUrl } from "@/lib/defaults";

interface Profile {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  banner_url: string;
  bio: string;
  subscribers_count: number;
  created_at: string;
}

interface Video {
  id: string;
  title: string;
  thumbnail_url: string;
  duration: string;
  views_count: number;
  created_at: string;
}

interface SwitchRow {
  id: string;
  title: string;
  cover_url: string | null;
  views_count: number;
  likes_count: number;
  created_at: string;
}

const Channel = () => {
  const { username } = useParams();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [switches, setSwitches] = useState<SwitchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [modBadge, setModBadge] = useState<"default" | "duo" | null>(null);

  useEffect(() => {
    if (username) {
      fetchProfile();
    }
  }, [username]);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const [{ data: isAdm }, { data: isDuo }] = await Promise.all([
        supabase.rpc("has_role", { _user_id: profile.id, _role: "admin" as any }),
        supabase.rpc("has_role", { _user_id: profile.id, _role: "duo_mod" as any }),
      ]);
      if (isAdm) setModBadge("default");
      else if (isDuo) setModBadge("duo");
      else setModBadge(null);
    })();
  }, [profile]);

  useEffect(() => {
    if (profile && user) {
      checkSubscription();
    }
  }, [profile, user]);

  const fetchProfile = async () => {
    const { data: profileData, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("username", username)
      .maybeSingle();

    if (!error && profileData) {
      setProfile(profileData);
      fetchVideos(profileData.id);
      fetchSwitches(profileData.id);
    }
    setLoading(false);
  };

  const fetchVideos = async (userId: string) => {
    const { data } = await supabase
      .from("videos")
      .select("id, title, thumbnail_url, duration, views_count, created_at")
      .eq("user_id", userId)
      .eq("is_public", true)
      .order("created_at", { ascending: false });

    if (data) {
      setVideos(data);
    }
  };

  const fetchSwitches = async (userId: string) => {
    const { data } = await supabase
      .from("switches")
      .select("id, title, cover_url, views_count, likes_count, created_at")
      .eq("user_id", userId)
      .eq("is_public", true)
      .order("created_at", { ascending: false });
    if (data) setSwitches(data);
  };

  const checkSubscription = async () => {
    if (!user || !profile) return;
    
    const { data } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("subscriber_id", user.id)
      .eq("channel_id", profile.id)
      .maybeSingle();

    setIsSubscribed(!!data);
  };

  const handleSubscribe = async () => {
    if (!user || !profile) return;

    if (isSubscribed) {
      await supabase
        .from("subscriptions")
        .delete()
        .eq("subscriber_id", user.id)
        .eq("channel_id", profile.id);
      setIsSubscribed(false);
      setProfile({ ...profile, subscribers_count: Math.max((profile.subscribers_count || 0) - 1, 0) });
    } else {
      await supabase
        .from("subscriptions")
        .insert({ subscriber_id: user.id, channel_id: profile.id });
      setIsSubscribed(true);
      setProfile({ ...profile, subscribers_count: (profile.subscribers_count || 0) + 1 });
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString(language === 'tr' ? "tr-TR" : "en-US", {
      year: "numeric",
      month: "long",
    });
  };

  const formatViews = (views: number) => {
    if (views >= 1000000) {
      return `${(views / 1000000).toFixed(1)}M`;
    } else if (views >= 1000) {
      return `${(views / 1000).toFixed(1)}K`;
    }
    return views.toString();
  };

  if (loading) {
    return (
      <div className="md3-scope min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="md3-scope min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <AlertTriangle className="w-16 h-16 text-primary mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">{t.channel.notFound}</h1>
          <p className="text-muted-foreground">
            {t.channel.notFoundDesc}
          </p>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="md3-scope min-h-screen bg-background">
      <Navbar />

      {/* Banner */}
      <div 
        className="h-48 md:h-64 bg-cover bg-center"
        style={{ backgroundImage: `url(${getBannerUrl(profile.banner_url)})` }}
      />

      {/* Profile Info */}
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center md:items-end gap-6 -mt-16 mb-8">
          <Avatar className="w-32 h-32 border-4 border-background shadow-xl">
            <AvatarImage src={getAvatarUrl(profile.avatar_url)} />
            <AvatarFallback className="text-4xl">
              <User className="w-16 h-16" />
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 text-center md:text-left">
            <h1 className="text-3xl font-bold flex items-center gap-2 flex-wrap justify-center md:justify-start">
              {profile.display_name}
              {modBadge === "default" && (
                <span className="text-sm font-bold px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/40">
                  Default Mod
                </span>
              )}
              {modBadge === "duo" && (
                <span className="text-sm font-bold px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/40">
                  Duo Mod
                </span>
              )}
            </h1>
            <p className="text-muted-foreground">@{profile.username}</p>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {profile.subscribers_count.toLocaleString(language === 'tr' ? "tr-TR" : "en-US")} {t.common.subscribers}
              </span>
              <span className="flex items-center gap-1">
                <VideoIcon className="w-4 h-4" />
                {videos.length} {language === 'tr' ? 'video' : 'videos'}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {formatDate(profile.created_at)} {t.channel.joinedAt}
              </span>
            </div>
          </div>

          {user && user.id !== profile.id && (
            <Button 
              variant={isSubscribed ? "outline" : "hero"}
              onClick={handleSubscribe}
            >
              {isSubscribed ? t.common.subscribed : t.common.subscribe}
            </Button>
          )}
        </div>

        {/* Bio */}
        {profile.bio && (
          <p className="text-muted-foreground mb-8 max-w-2xl">
            {profile.bio}
          </p>
        )}

        {/* Tabs */}
        <Tabs defaultValue="videos" className="mb-12">
          <TabsList className="bg-muted/30">
            <TabsTrigger value="videos">{t.channel.videos}</TabsTrigger>
            <TabsTrigger value="switches">{t.switch.switches}</TabsTrigger>
            <TabsTrigger value="about">{t.channel.aboutTab}</TabsTrigger>
          </TabsList>

          <TabsContent value="videos" className="mt-6">
            {videos.length === 0 ? (
              <div className="text-center py-16">
                <VideoIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">{t.channel.noVideos}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {videos.map((video, index) => (
                  <VideoCard
                    key={video.id}
                    title={video.title}
                    thumbnail={getThumbnailUrl(video.thumbnail_url)}
                    duration={video.duration || "0:00"}
                    views={formatViews(video.views_count)}
                    author={profile.display_name}
                    delay={index * 0.1}
                    videoId={video.id}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="switches" className="mt-6">
            {switches.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-muted-foreground">{t.switch.empty}</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {switches.map((s) => (
                  <a
                    key={s.id}
                    href={`/switch/${s.id}`}
                    className="block group"
                  >
                    <div className="relative aspect-[9/16] rounded-lg overflow-hidden bg-muted">
                      <img
                        src={s.cover_url || "/placeholder.svg"}
                        alt={s.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = "/placeholder.svg";
                        }}
                      />
                      <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent text-white">
                        <p className="text-xs line-clamp-2">{s.title}</p>
                        <p className="text-[10px] text-white/70">{formatViews(s.views_count)} {t.common.views}</p>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="about" className="mt-6">
            <div className="glass-card p-6 rounded-xl max-w-2xl">
              <h3 className="font-bold text-lg mb-4">{t.channel.channelAbout}</h3>
              <p className="text-muted-foreground">
                {profile.bio || t.channel.noDescription}
              </p>
              <div className="mt-6 pt-6 border-t border-primary/20">
                <p className="text-sm text-muted-foreground">
                  <strong>{t.channel.joinDate}</strong> {formatDate(profile.created_at)}
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Footer />
    </div>
  );
};

export default Channel;
