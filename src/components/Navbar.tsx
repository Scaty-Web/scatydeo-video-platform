import { Button } from "@/components/ui/button";
import { Play, Search, Menu, X, Bell, User, Settings, LogOut, Upload, Shield } from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isModerator, setIsModerator] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      checkModeratorStatus();
    }
  }, [user]);

  const checkModeratorStatus = async () => {
    if (!user) return;
    const { data } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'moderator' });
    setIsModerator(!!data);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-glow">
              <Play className="w-5 h-5 text-primary-foreground fill-current" />
            </div>
            <span className="font-display text-xl font-bold glow-text">Scatydeo</span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">Ana Sayfa</Link>
            <a href="/#videos" className="text-muted-foreground hover:text-foreground transition-colors">Videolar</a>
            <Link to="/rules" className="text-muted-foreground hover:text-foreground transition-colors">Kurallar</Link>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type="text" placeholder="Video ara..." className="w-64 h-10 pl-10 pr-4 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
            </div>

            {user ? (
              <div className="flex items-center gap-2">
                <Link to="/upload">
                  <Button variant="ghost" size="icon" title="Video Yükle">
                    <Upload className="w-5 h-5" />
                  </Button>
                </Link>
                <Link to="/notifications">
                  <Button variant="ghost" size="icon"><Bell className="w-5 h-5" /></Button>
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={undefined} />
                        <AvatarFallback><User className="w-4 h-4" /></AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => navigate("/settings")}>
                      <User className="w-4 h-4 mr-2" />Profilim
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/settings")}>
                      <Settings className="w-4 h-4 mr-2" />Ayarlar
                    </DropdownMenuItem>
                    {isModerator && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => navigate("/moderator")}>
                          <Shield className="w-4 h-4 mr-2" />Moderatör Paneli
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut} className="text-red-400">
                      <LogOut className="w-4 h-4 mr-2" />Çıkış Yap
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <Link to="/auth"><Button variant="hero" size="sm">Giriş Yap</Button></Link>
            )}
          </div>

          <button className="md:hidden p-2 text-foreground" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-border animate-fade-in">
            <div className="flex flex-col gap-4">
              <Link to="/" className="text-foreground py-2">Ana Sayfa</Link>
              <Link to="/rules" className="text-muted-foreground py-2">Kurallar</Link>
              {user ? (
                <>
                  <Link to="/upload" className="text-muted-foreground py-2">Video Yükle</Link>
                  <Link to="/notifications" className="text-muted-foreground py-2">Bildirimler</Link>
                  <Link to="/settings" className="text-muted-foreground py-2">Ayarlar</Link>
                  {isModerator && (
                    <Link to="/moderator" className="text-primary py-2">Moderatör Paneli</Link>
                  )}
                  <Button variant="outline" onClick={handleSignOut}>Çıkış Yap</Button>
                </>
              ) : (
                <Link to="/auth"><Button variant="hero" className="w-full">Giriş Yap</Button></Link>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
