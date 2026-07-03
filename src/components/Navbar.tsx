import { Button } from "@/components/ui/button";
import { Play, Search, Menu, Bell, User, Settings, LogOut, Upload, Shield, SlidersHorizontal, Video, ChevronUp, ChevronDown } from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import LanguageSwitcher from "./LanguageSwitcher";
import { getAvatarUrl } from "@/lib/defaults";
import SwitchLogo from "./SwitchLogo";
import ModerationDialog from "./ModerationDialog";
import { cn } from "@/lib/utils";

interface NavbarProps {
  onToggleSidebar?: () => void;
}

const Navbar = ({ onToggleSidebar }: NavbarProps) => {
  const [isModerator, setIsModerator] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isDuoMod, setIsDuoMod] = useState(false);
  const [modOpen, setModOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("scatydeo_nav_collapsed") === "1";
  });
  const { user, signOut } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      checkModeratorStatus();
      fetchAvatar();
    } else {
      setAvatarUrl(null);
    }
  }, [user]);

  const checkModeratorStatus = async () => {
    if (!user) return;
    const [{ data: adm }, { data: duo }] = await Promise.all([
      supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' }),
      supabase.rpc('has_role', { _user_id: user.id, _role: 'duo_mod' as any }),
    ]);
    setIsModerator(!!adm);
    setIsAdmin(!!adm);
    setIsDuoMod(!!duo);
  };

  const fetchAvatar = async () => {
    if (!user) return;
    const { data } = await supabase.from("profiles").select("avatar_url").eq("id", user.id).maybeSingle();
    setAvatarUrl(data?.avatar_url ?? null);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("scatydeo_nav_collapsed", next ? "1" : "0");
  };

  return (
    <nav
      className={cn(
        "fixed top-0 left-0 right-0 z-50 bg-background border-b border-border transition-all duration-200",
        collapsed ? "h-6" : "h-14"
      )}
    >
      {collapsed ? (
        <button
          onClick={toggleCollapsed}
          className="w-full h-full flex items-center justify-center hover:bg-muted transition-colors"
          title="Menüyü göster"
          aria-label="Menüyü göster"
        >
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </button>
      ) : (
      <div className="flex items-center justify-between h-full px-4">
        {/* Left: Menu + Logo */}
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-full hover:bg-muted transition-colors"
          >
            <Menu className="w-5 h-5 text-foreground" />
          </button>
<Link to="/" className="flex items-center gap-1.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Play className="w-4 h-4 text-primary-foreground fill-current" />
            </div>
            <span className="font-display text-lg font-bold hidden sm:inline">Scatydeo</span>
          </Link>
        </div>

        {/* Center: Search */}
        <div className="flex-1 max-w-xl mx-4 hidden sm:flex items-center gap-2">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const input = e.currentTarget.querySelector("input");
              if (input?.value.trim())
                navigate(`/search?q=${encodeURIComponent(input.value.trim())}`);
            }}
            className="flex flex-1"
          >
            <input
              type="text"
              placeholder={t.nav.searchPlaceholder}
              className="flex-1 h-10 px-4 bg-background border border-border rounded-l-full focus:border-primary focus:outline-none text-sm"
            />
            <button
              type="submit"
              className="h-10 px-5 bg-muted border border-l-0 border-border rounded-r-full hover:bg-muted/80 transition-colors"
            >
              <Search className="w-5 h-5 text-muted-foreground" />
            </button>
          </form>
          <button
            type="button"
            onClick={toggleCollapsed}
            className="p-2 rounded-full hover:bg-muted transition-colors"
            title="Üst menüyü gizle"
            aria-label="Üst menüyü gizle"
          >
            <ChevronUp className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* FoCAM screen recorder shortcut */}
        <Link to="/focam" title="Scatydeo FoCAM" className="hidden sm:flex">
          <Button variant="ghost" size="icon" className="rounded-full">
            <Video className="w-5 h-5" />
          </Button>
        </Link>

        {/* Right: Actions */}
        <div className="flex items-center gap-1">
          {/* Mobile search */}
          <button
            className="sm:hidden p-2 rounded-full hover:bg-muted transition-colors"
            onClick={() => navigate("/search")}
          >
            <Search className="w-5 h-5" />
          </button>

          {/* MOD button: only for admins/moderators */}
          {user && (isModerator || isAdmin || isDuoMod) && (
            <button
              onClick={() => setModOpen(true)}
              className="m3-state-layer px-2.5 h-8 rounded-full text-xs font-bold tracking-wider bg-primary/20 text-primary border border-primary/40 hover:bg-primary/30"
              title="Moderation"
            >
              MOD
            </button>
          )}

          {/* Manage my videos */}
          {user && (
            <Link to="/manage/videos">
              <Button variant="ghost" size="icon" className="rounded-full" title={t.nav.uploadVideo}>
                <SlidersHorizontal className="w-5 h-5" />
              </Button>
            </Link>
          )}

          <LanguageSwitcher />

          {/* Switch shortcut (always visible) */}
          <Link to="/switch">
            <Button variant="ghost" size="icon" className="rounded-full" title={t.switch.title}>
              <SwitchLogo size={22} />
            </Button>
          </Link>

          {user ? (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full" title={t.nav.uploadVideo}>
                    <Upload className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem onClick={() => navigate("/upload")}>
                    <Upload className="w-4 h-4 mr-2" />
                    {t.nav.uploadVideo}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/upload/switch")}>
                    <SwitchLogo size={16} className="mr-2" />
                    {t.switch.uploadBtn}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Link to="/notifications">
                <Button variant="ghost" size="icon" className="rounded-full" title={t.nav.notifications}>
                  <Bell className="w-5 h-5" />
                </Button>
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={getAvatarUrl(avatarUrl)} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                        <User className="w-4 h-4" />
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => navigate("/settings")}>
                    <User className="w-4 h-4 mr-2" />{t.nav.myProfile}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/settings")}>
                    <Settings className="w-4 h-4 mr-2" />{t.nav.settings}
                  </DropdownMenuItem>
                  {isModerator && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => navigate("/moderator")}>
                        <Shield className="w-4 h-4 mr-2" />{t.nav.moderatorPanel}
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                    <LogOut className="w-4 h-4 mr-2" />{t.nav.logout}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Link to="/auth">
              <Button variant="outline" size="sm" className="gap-2 rounded-full border-primary/50 text-primary hover:bg-primary/10">
                <User className="w-4 h-4" />
                {t.nav.login}
              </Button>
            </Link>
          )}
        </div>
      </div>
      )}
      <ModerationDialog open={modOpen} onOpenChange={setModOpen} />
    </nav>
  );
};

export default Navbar;
