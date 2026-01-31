import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  Shield, 
  AlertTriangle, 
  Trash2, 
  Ban, 
  CheckCircle,
  XCircle,
  Eye,
  User
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Report {
  id: string;
  reason: string;
  status: string;
  created_at: string;
  video_id: string;
  reporter_id: string;
  videos: {
    id: string;
    title: string;
    thumbnail_url: string;
    user_id: string;
    profiles: {
      username: string;
      display_name: string;
    };
  };
  reporter: {
    username: string;
    display_name: string;
  };
}

interface BannedUser {
  id: string;
  user_id: string;
  reason: string;
  created_at: string;
  profiles: {
    username: string;
    display_name: string;
    avatar_url: string;
  };
}

const ModeratorPanel = () => {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [isModerator, setIsModerator] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<Report[]>([]);
  const [bannedUsers, setBannedUsers] = useState<BannedUser[]>([]);
  
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [banReason, setBanReason] = useState("");
  const [userToBan, setUserToBan] = useState<{ id: string; username: string } | null>(null);

  useEffect(() => {
    if (user) {
      checkModeratorStatus();
    } else {
      setLoading(false);
    }
  }, [user]);

  const checkModeratorStatus = async () => {
    if (!user) return;
    
    // First check by role in user_roles table
    const { data: roleData } = await supabase
      .rpc('has_role', { _user_id: user.id, _role: 'moderator' });
    
    if (roleData) {
      setIsModerator(true);
      fetchReports();
      fetchBannedUsers();
    } else {
      // Check by username for initial moderator setup
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single();
      
      if (profile?.username === 'lattesiber') {
        // Add moderator role if not exists
        await supabase.from('user_roles').upsert({
          user_id: user.id,
          role: 'moderator'
        }, { onConflict: 'user_id,role' });
        
        setIsModerator(true);
        fetchReports();
        fetchBannedUsers();
      }
    }
    
    setLoading(false);
  };

  const fetchReports = async () => {
    const { data } = await supabase
      .from('video_reports')
      .select(`
        *,
        videos:video_id (
          id,
          title,
          thumbnail_url,
          user_id,
          profiles:user_id (
            username,
            display_name
          )
        ),
        reporter:reporter_id (
          username,
          display_name
        )
      `)
      .order('created_at', { ascending: false });

    if (data) {
      setReports(data as unknown as Report[]);
    }
  };

  const fetchBannedUsers = async () => {
    const { data } = await supabase
      .from('banned_users')
      .select(`
        *,
        profiles:user_id (
          username,
          display_name,
          avatar_url
        )
      `)
      .order('created_at', { ascending: false });

    if (data) {
      setBannedUsers(data as unknown as BannedUser[]);
    }
  };

  const handleDeleteVideo = async (videoId: string) => {
    const { error } = await supabase
      .from('videos')
      .delete()
      .eq('id', videoId);

    if (error) {
      toast({
        title: t.common.error,
        description: t.moderator.videoDeleteError,
        variant: "destructive",
      });
    } else {
      toast({
        title: t.moderator.videoDeleted,
        description: t.moderator.videoDeletedDesc,
      });
      fetchReports();
    }
  };

  const handleResolveReport = async (reportId: string, action: 'resolved' | 'dismissed') => {
    const { error } = await supabase
      .from('video_reports')
      .update({ 
        status: action,
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', reportId);

    if (!error) {
      toast({
        title: action === 'resolved' ? t.moderator.reportResolved : t.moderator.reportDismissed,
        description: action === 'resolved' 
          ? t.moderator.reportResolvedDesc
          : t.moderator.reportDismissed,
      });
      fetchReports();
    }
  };

  const openBanDialog = (userId: string, username: string) => {
    setUserToBan({ id: userId, username });
    setBanDialogOpen(true);
  };

  const handleBanUser = async () => {
    if (!userToBan || !banReason.trim() || !user) return;

    const { error } = await supabase
      .from('banned_users')
      .insert({
        user_id: userToBan.id,
        reason: banReason.trim(),
        banned_by: user.id
      });

    if (error) {
      if (error.code === '23505') {
        toast({
          title: t.moderator.userAlreadyBanned,
          description: t.moderator.userAlreadyBannedDesc,
          variant: "destructive",
        });
      } else {
        toast({
          title: t.common.error,
          description: t.moderator.banError,
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: t.moderator.userBanned,
        description: `${userToBan.username} ${t.moderator.userBannedDesc}`,
      });
      setBanDialogOpen(false);
      setBanReason("");
      setUserToBan(null);
      fetchBannedUsers();
    }
  };

  const handleUnbanUser = async (bannedUserId: string, username: string) => {
    const { error } = await supabase
      .from('banned_users')
      .delete()
      .eq('id', bannedUserId);

    if (!error) {
      toast({
        title: t.moderator.unbanSuccess,
        description: `${username} ${t.moderator.unbanSuccessDesc}`,
      });
      fetchBannedUsers();
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString(language === 'tr' ? "tr-TR" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
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

  if (!user || !isModerator) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <AlertTriangle className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">{t.moderator.accessDenied}</h1>
          <p className="text-muted-foreground mb-6">
            {t.moderator.accessDeniedDesc}
          </p>
          <Button variant="hero" onClick={() => navigate("/")}>
            {t.common.goHome}
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  const pendingReports = reports.filter(r => r.status === 'pending');

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-24">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-glow">
              <Shield className="w-8 h-8 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">{t.moderator.title}</h1>
              <p className="text-muted-foreground">
                {t.moderator.subtitle}
              </p>
            </div>
          </div>

          <Tabs defaultValue="reports" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 max-w-md">
              <TabsTrigger value="reports" className="gap-2">
                <AlertTriangle className="w-4 h-4" />
                {t.moderator.reports} {pendingReports.length > 0 && `(${pendingReports.length})`}
              </TabsTrigger>
              <TabsTrigger value="bans" className="gap-2">
                <Ban className="w-4 h-4" />
                {t.moderator.bannedUsers} ({bannedUsers.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="reports" className="space-y-4">
              {reports.length === 0 ? (
                <div className="text-center py-12 bg-muted/30 rounded-xl">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                  <p className="text-muted-foreground">{t.moderator.noReports}</p>
                </div>
              ) : (
                reports.map((report) => (
                  <div key={report.id} className="p-6 bg-muted/30 rounded-xl space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex gap-4">
                        {report.videos?.thumbnail_url && (
                          <img 
                            src={report.videos.thumbnail_url} 
                            alt="" 
                            className="w-32 h-20 object-cover rounded-lg"
                          />
                        )}
                        <div>
                          <h3 className="font-semibold">{report.videos?.title || t.moderator.videoDeletedLabel}</h3>
                          <p className="text-sm text-muted-foreground">
                            {t.moderator.uploadedBy} {report.videos?.profiles?.display_name || t.moderator.unknown}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {t.moderator.reportedBy} {report.reporter?.display_name}
                          </p>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm ${
                        report.status === 'pending' 
                          ? 'bg-yellow-500/20 text-yellow-500'
                          : report.status === 'resolved'
                          ? 'bg-green-500/20 text-green-500'
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {report.status === 'pending' ? t.moderator.pending : 
                         report.status === 'resolved' ? t.moderator.resolved : t.moderator.dismissed}
                      </span>
                    </div>
                    
                    <div className="p-4 bg-background/50 rounded-lg">
                      <p className="text-sm font-medium mb-1">{t.moderator.reportReason}</p>
                      <p>{report.reason}</p>
                    </div>
                    
                    <div className="text-sm text-muted-foreground">
                      {formatDate(report.created_at)}
                    </div>

                    {report.status === 'pending' && (
                      <div className="flex flex-wrap gap-2">
                        {report.videos && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/watch/${report.video_id}`)}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              {t.moderator.watchVideo}
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteVideo(report.video_id)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              {t.moderator.deleteVideo}
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => openBanDialog(
                                report.videos.user_id,
                                report.videos.profiles?.username || t.moderator.unknown
                              )}
                            >
                              <Ban className="w-4 h-4 mr-2" />
                              {t.moderator.banUser}
                            </Button>
                          </>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleResolveReport(report.id, 'resolved')}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          {t.moderator.markResolved}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleResolveReport(report.id, 'dismissed')}
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          {t.moderator.dismiss}
                        </Button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </TabsContent>

            <TabsContent value="bans" className="space-y-4">
              {bannedUsers.length === 0 ? (
                <div className="text-center py-12 bg-muted/30 rounded-xl">
                  <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">{t.moderator.noBannedUsers}</p>
                </div>
              ) : (
                bannedUsers.map((ban) => (
                  <div key={ban.id} className="p-6 bg-muted/30 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={ban.profiles?.avatar_url || undefined} />
                          <AvatarFallback>
                            <User className="w-6 h-6" />
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold">{ban.profiles?.display_name || t.moderator.unknown}</p>
                          <p className="text-sm text-muted-foreground">@{ban.profiles?.username}</p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUnbanUser(ban.id, ban.profiles?.username || t.moderator.unknown)}
                      >
                        {t.moderator.unban}
                      </Button>
                    </div>
                    <div className="mt-4 p-4 bg-background/50 rounded-lg">
                      <p className="text-sm font-medium mb-1">{t.moderator.banReason}</p>
                      <p>{ban.reason}</p>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      {t.moderator.banDate} {formatDate(ban.created_at)}
                    </p>
                  </div>
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Dialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.moderator.banDialogTitle}</DialogTitle>
            <DialogDescription>
              {t.moderator.banDialogDesc}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder={t.moderator.banReasonPlaceholder}
            value={banReason}
            onChange={(e) => setBanReason(e.target.value)}
            className="min-h-[100px]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setBanDialogOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleBanUser}
              disabled={!banReason.trim()}
            >
              {t.moderator.banConfirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default ModeratorPanel;
