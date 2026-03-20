import { Home, Flame, Flag, ListVideo, Settings, Info } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { cn } from "@/lib/utils";

const BottomNav = () => {
  const location = useLocation();
  const { user } = useAuth();
  const { language } = useLanguage();

  const items = [
    { icon: Home, label: language === "tr" ? "Ana Sayfa" : "Home", path: "/" },
    { icon: Flame, label: language === "tr" ? "Trendler" : "Trending", path: "/trending" },
    { icon: Flag, label: language === "tr" ? "Kurallar" : "Rules", path: "/rules" },
    ...(user
      ? [
          { icon: ListVideo, label: language === "tr" ? "Listeler" : "Playlists", path: "/playlists" },
          { icon: Settings, label: language === "tr" ? "Ayarlar" : "Settings", path: "/settings" },
        ]
      : []),
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border md:hidden">
      <div className="flex items-center justify-around h-14">
        {items.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-[10px] transition-colors",
                isActive
                  ? "text-foreground"
                  : "text-muted-foreground"
              )}
            >
              <Icon className={cn("w-5 h-5", isActive && "text-primary")} />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
