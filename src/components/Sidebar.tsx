import { Home, Flame, Clock, ThumbsUp, FolderOpen, Settings, Flag, Upload } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { cn } from "@/lib/utils";

interface SidebarProps {
  collapsed?: boolean;
}

const Sidebar = ({ collapsed = false }: SidebarProps) => {
  const location = useLocation();
  const { user } = useAuth();
  const { t } = useLanguage();

  const mainItems = [
    { icon: Home, label: t.nav.home, path: "/" },
    { icon: Flame, label: t.sidebar?.trending || "Trendler", path: "/#videos" },
  ];

  const userItems = user
    ? [
        { icon: Upload, label: t.nav.uploadVideo, path: "/upload" },
        { icon: Settings, label: t.nav.settings, path: "/settings" },
      ]
    : [];

  const otherItems = [
    { icon: Flag, label: t.nav.rules, path: "/rules" },
  ];

  const renderItem = (item: { icon: any; label: string; path: string }, index: number) => {
    const isActive = location.pathname === item.path;
    const Icon = item.icon;

    return (
      <Link
        key={index}
        to={item.path}
        className={cn(
          "flex items-center gap-5 px-3 py-2.5 rounded-lg transition-colors text-sm",
          isActive
            ? "bg-muted font-medium text-foreground"
            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
          collapsed && "justify-center px-2"
        )}
      >
        <Icon className="w-5 h-5 flex-shrink-0" />
        {!collapsed && <span className="truncate">{item.label}</span>}
      </Link>
    );
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-14 bottom-0 z-40 bg-background border-r border-border overflow-y-auto transition-all duration-200",
        collapsed ? "w-[72px]" : "w-56"
      )}
    >
      <div className="flex flex-col gap-1 p-2">
        {mainItems.map(renderItem)}

        {!collapsed && <div className="h-px bg-border my-2" />}

        {userItems.map(renderItem)}

        {userItems.length > 0 && !collapsed && <div className="h-px bg-border my-2" />}

        {otherItems.map(renderItem)}
      </div>
    </aside>
  );
};

export default Sidebar;
