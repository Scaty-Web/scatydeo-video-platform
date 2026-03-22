import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Settings as SettingsIcon, Bell, Shield, LogOut, KeyRound, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Profile {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  banner_url: string;
  bio: string;
}

const Settings = () => {
  const { user, signOut } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchProfile();
  }, [user, navigate]);

  const fetchProfile = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (!error && data) {
      setProfile(data);
      setDisplayName(data.display_name || "");
      setUsername(data.username || "");
      setBio(data.bio || "");
      setAvatarUrl(data.avatar_url || "");
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName,
        username: username,
        bio: bio,
        avatar_url: avatarUrl,
      })
      .eq("id", user.id);

    if (error) {
      toast({
        title: t.common.error,
        description: error.message.includes("unique") 
          ? t.settings.usernameExists 
          : t.settings.updateError,
        variant: "destructive",
      });
    } else {
      toast({
        title: t.common.success,
        description: t.settings.profileUpdated,
      });
      fetchProfile();
    }

    setSaving(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8 flex items-center gap-2">
            <SettingsIcon className="w-8 h-8" />
            {t.settings.title}
          </h1>

          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="bg-muted/30">
              <TabsTrigger value="profile" className="gap-2">
                <User className="w-4 h-4" />
                {t.settings.profile}
              </TabsTrigger>
              <TabsTrigger value="notifications" className="gap-2">
                <Bell className="w-4 h-4" />
                {t.settings.notifications}
              </TabsTrigger>
              <TabsTrigger value="privacy" className="gap-2">
                <Shield className="w-4 h-4" />
                {t.settings.privacy}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile">
              <div className="glass-card p-6 rounded-xl space-y-6">
                {/* Avatar */}
                <div className="flex items-center gap-6">
                  <Avatar className="w-24 h-24 border-2 border-primary/30">
                    <AvatarImage src={avatarUrl || undefined} />
                    <AvatarFallback>
                      <User className="w-12 h-12" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-2 flex-1">
                    <Label htmlFor="avatar">{t.settings.avatarUrl}</Label>
                    <Input
                      id="avatar"
                      placeholder="https://example.com/avatar.jpg"
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      className="bg-background/50 border-primary/30"
                    />
                  </div>
                </div>

                {/* Display Name */}
                <div className="space-y-2">
                  <Label htmlFor="displayName">{t.settings.displayName}</Label>
                  <Input
                    id="displayName"
                    placeholder={t.settings.displayNamePlaceholder}
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="bg-background/50 border-primary/30"
                  />
                </div>

                {/* Username */}
                <div className="space-y-2">
                  <Label htmlFor="username">{t.auth.username}</Label>
                  <Input
                    id="username"
                    placeholder={t.settings.usernamePlaceholder}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="bg-background/50 border-primary/30"
                  />
                  <p className="text-sm text-muted-foreground">
                    {t.settings.channelUrl} scatydeo.com/channel/{username}
                  </p>
                </div>

                {/* Bio */}
                <div className="space-y-2">
                  <Label htmlFor="bio">{t.settings.about}</Label>
                  <Textarea
                    id="bio"
                    placeholder={t.settings.aboutPlaceholder}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="bg-background/50 border-primary/30 min-h-[100px]"
                  />
                </div>

                <Button
                  variant="hero"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? t.settings.saving : t.settings.saveChanges}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="notifications">
              <div className="glass-card p-6 rounded-xl">
                <h3 className="font-bold text-lg mb-4">{t.settings.notificationSettings}</h3>
                <p className="text-muted-foreground">
                  {t.settings.notificationComingSoon}
                </p>
              </div>
            </TabsContent>

            <TabsContent value="privacy">
              <PrivacyTab t={t} user={user} signOut={handleSignOut} />
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />
    </div>
  );
};

const PrivacyTab = ({ t, user, signOut }: { t: any; user: any; signOut: () => void }) => {
  const { toast } = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetting, setResetting] = useState(false);

  const handlePasswordReset = async () => {
    if (newPassword.length < 6) {
      toast({ title: t.common.error, description: t.settings.passwordTooShort, variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: t.common.error, description: t.settings.passwordMismatch, variant: "destructive" });
      return;
    }

    setResetting(true);

    // Verify current password by re-signing in
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: currentPassword,
    });

    if (signInError) {
      toast({ title: t.common.error, description: t.settings.currentPasswordWrong, variant: "destructive" });
      setResetting(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      toast({ title: t.common.error, description: error.message, variant: "destructive" });
    } else {
      toast({ title: t.common.success, description: t.settings.passwordUpdated });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }

    setResetting(false);
  };

  return (
    <div className="glass-card p-6 rounded-xl space-y-6">
      <h3 className="font-bold text-lg flex items-center gap-2">
        <Shield className="w-5 h-5" />
        {t.settings.privacySecurity}
      </h3>

      {/* Password Reset */}
      <div className="space-y-4">
        <h4 className="font-semibold flex items-center gap-2">
          <KeyRound className="w-4 h-4" />
          {t.settings.passwordReset}
        </h4>
        <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/30 border border-primary/10">
          <AlertTriangle className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-sm text-muted-foreground">{t.settings.passwordResetInfo}</p>
        </div>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">{t.settings.currentPassword}</Label>
            <Input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="bg-background/50 border-primary/30"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">{t.settings.newPassword}</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="bg-background/50 border-primary/30"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">{t.settings.confirmNewPassword}</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="bg-background/50 border-primary/30"
            />
          </div>
          <Button variant="hero" onClick={handlePasswordReset} disabled={resetting || !currentPassword || !newPassword || !confirmPassword}>
            <KeyRound className="w-4 h-4 mr-2" />
            {resetting ? t.settings.resettingPassword : t.settings.resetPassword}
          </Button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="pt-6 border-t border-primary/20">
        <h4 className="font-semibold text-destructive mb-2">{t.settings.dangerZone}</h4>
        <Button
          variant="outline"
          className="border-destructive/50 text-destructive hover:bg-destructive/10"
          onClick={signOut}
        >
          <LogOut className="w-4 h-4 mr-2" />
          {t.common.signOut}
        </Button>
      </div>
    </div>
  );
};

export default Settings;
