import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import VideoPlayer from "@/components/VideoPlayer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  ThumbsUp, 
  Share2, 
  MessageSquare, 
  Eye, 
  Calendar,
  User,
  AlertTriangle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ReportVideoDialog from "@/components/ReportVideoDialog";

interface Video {
  id: string;
  title: string;
  description: string;
  video_url: string;
  thumbnail_url: string;
  views_count: number;
  likes_count: number;
  created_at: string;
  user_id: string;
  profiles: {
    username: string;
    display_name: string;
    avatar_url: string;
    subscribers_count: number;
  };
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles: {
    username: string;
    display_name: string;
    avatar_url: string;
  };
}

const Watch = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const [video, setVideo] = useState<Video | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    if (id) {
      fetchVideo();
      fetchComments();
      if (user) {
        checkIfLiked();
      }
    }
  }, [id, user]);

  useEffect(() => {
    if (user && video) {
      checkIfSubscribed();
    }
  }, [user, video]);

  const fetchVideo = async () => {
    const { data, error } = await supabase
      .from("videos")
      .select(`
        *,
        profiles:user_id (
          username,
          display_name,
          avatar_url,
          subscribers_count
        )
      `)
      .eq("id", id)
      .maybeSingle();

    if (!error && data) {
      setVideo(data as unknown as Video);
      // Increment view count
      await supabase
        .from("videos")
        .update({ views_count: (data.views_count || 0) + 1 })
        .eq("id", id);
    }
    setLoading(false);
  };

  const fetchComments = async () => {
    const { data } = await supabase
      .from("comments")
      .select(`
        *,
        profiles:user_id (
          username,
          display_name,
          avatar_url
        )
      `)
      .eq("video_id", id)
      .order("created_at", { ascending: false });

    if (data) {
      setComments(data as unknown as Comment[]);
    }
  };

  const checkIfLiked = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("video_likes")
      .select("id")
      .eq("video_id", id)
      .eq("user_id", user.id)
      .maybeSingle();
    
    setLiked(!!data);
  };

  const checkIfSubscribed = async () => {
    if (!user || !video) return;
    const { data } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("channel_id", video.user_id)
      .eq("subscriber_id", user.id)
      .maybeSingle();
    
    setSubscribed(!!data);
  };

  const handleSubscribe = async () => {
    if (!user) {
      toast({
        title: t.common.signIn,
        description: t.watch.signInToSubscribe,
        variant: "destructive",
      });
      return;
    }

    if (!video) return;

    if (subscribed) {
      await supabase
        .from("subscriptions")
        .delete()
        .eq("channel_id", video.user_id)
        .eq("subscriber_id", user.id);
      setSubscribed(false);
      toast({
        title: t.watch.subscriptionCancelled,
        description: t.watch.notFollowingChannel,
      });
    } else {
      await supabase
        .from("subscriptions")
        .insert({ channel_id: video.user_id, subscriber_id: user.id });
      setSubscribed(true);
      toast({
        title: t.watch.subscribedSuccess,
        description: t.watch.followingChannel,
      });
    }
  };

  const handleLike = async () => {
    if (!user) {
      toast({
        title: t.common.signIn,
        description: t.watch.signInToLike,
        variant: "destructive",
      });
      return;
    }

    if (liked) {
      await supabase
        .from("video_likes")
        .delete()
        .eq("video_id", id)
        .eq("user_id", user.id);
      setLiked(false);
      if (video) {
        setVideo({ ...video, likes_count: video.likes_count - 1 });
      }
    } else {
      await supabase
        .from("video_likes")
        .insert({ video_id: id, user_id: user.id });
      setLiked(true);
      if (video) {
        setVideo({ ...video, likes_count: video.likes_count + 1 });
      }
    }
  };

  const handleComment = async () => {
    if (!user) {
      toast({
        title: t.common.signIn,
        description: t.watch.signInToComment,
        variant: "destructive",
      });
      return;
    }

    if (!newComment.trim()) return;

    const { error } = await supabase
      .from("comments")
      .insert({
        video_id: id,
        user_id: user.id,
        content: newComment.trim(),
      });

    if (!error) {
      setNewComment("");
      fetchComments();
      toast({
        title: t.watch.commentAdded,
        description: t.watch.commentAddedDesc,
      });
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString(language === 'tr' ? "tr-TR" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!video) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <AlertTriangle className="w-16 h-16 text-primary mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">{t.watch.videoNotFound}</h1>
          <p className="text-muted-foreground mb-6">
            {t.watch.videoNotFoundDesc}
          </p>
          <Link to="/">
            <Button variant="hero">{t.common.goHome}</Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Video Player */}
          <div className="lg:col-span-2 space-y-6">
            {/* Video */}
            <div className="aspect-video">
              {video.video_url ? (
                <VideoPlayer
                  src={video.video_url}
                  poster={video.thumbnail_url || undefined}
                  className="w-full h-full"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-muted rounded-xl">
                  <p className="text-muted-foreground">{t.watch.videoLoadFailed}</p>
                </div>
              )}
            </div>

            {/* Video Info */}
            <div className="space-y-4">
              <h1 className="text-2xl font-bold">{video.title}</h1>
              
              <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  {video.views_count.toLocaleString(language === 'tr' ? "tr-TR" : "en-US")} {t.common.views}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {formatDate(video.created_at)}
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-4">
                <Button
                  variant={liked ? "hero" : "outline"}
                  size="sm"
                  onClick={handleLike}
                  className="gap-2"
                >
                  <ThumbsUp className="w-4 h-4" />
                  {video.likes_count}
                </Button>
                <Button variant="outline" size="sm" className="gap-2">
                  <Share2 className="w-4 h-4" />
                  {t.common.share}
                </Button>
                <ReportVideoDialog videoId={video.id} videoTitle={video.title} />
              </div>

              {/* Channel Info */}
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl">
                <Link 
                  to={`/channel/${video.profiles.username}`}
                  className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                >
                  <Avatar className="w-12 h-12 border-2 border-primary/30">
                    <AvatarImage src={video.profiles.avatar_url || undefined} />
                    <AvatarFallback>
                      <User className="w-6 h-6" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{video.profiles.display_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {video.profiles.subscribers_count.toLocaleString(language === 'tr' ? "tr-TR" : "en-US")} {t.common.subscribers}
                    </p>
                  </div>
                </Link>
                {user?.id !== video.user_id && (
                  <Button 
                    variant={subscribed ? "outline" : "hero"} 
                    size="sm"
                    onClick={handleSubscribe}
                  >
                    {subscribed ? t.common.subscribed : t.common.subscribe}
                  </Button>
                )}
              </div>

              {/* Description */}
              {video.description && (
                <div className="p-4 bg-muted/30 rounded-xl">
                  <p className="whitespace-pre-wrap">{video.description}</p>
                </div>
              )}
            </div>

            {/* Comments Section */}
            <div className="space-y-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                {comments.length} {t.common.comments}
              </h2>

              {/* Add Comment */}
              <div className="space-y-3">
                <Textarea
                  placeholder={user ? t.watch.addComment : t.watch.addCommentSignIn}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  disabled={!user}
                  className="bg-muted/30 border-primary/30"
                />
                <div className="flex justify-end">
                  <Button
                    variant="hero"
                    size="sm"
                    onClick={handleComment}
                    disabled={!user || !newComment.trim()}
                  >
                    {t.watch.postComment}
                  </Button>
                </div>
              </div>

              {/* Comments List */}
              <div className="space-y-4">
                {comments.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    {t.watch.noComments}
                  </p>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={comment.profiles.avatar_url || undefined} />
                        <AvatarFallback>
                          <User className="w-4 h-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Link 
                            to={`/channel/${comment.profiles.username}`}
                            className="font-semibold hover:text-primary transition-colors"
                          >
                            {comment.profiles.display_name}
                          </Link>
                          <span className="text-sm text-muted-foreground">
                            {formatDate(comment.created_at)}
                          </span>
                        </div>
                        <p className="mt-1">{comment.content}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Sidebar - Related Videos */}
          <div className="space-y-4">
            <h3 className="font-bold text-lg">{t.watch.suggestedVideos}</h3>
            <div className="text-center py-8 text-muted-foreground">
              <p>{t.watch.comingSoon}</p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Watch;
