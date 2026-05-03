import { useState } from "react";
import { Navigate, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import BottomNav from "@/components/BottomNav";
import VideoGrid from "@/components/VideoGrid";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { Newspaper, ChevronRight } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";

const COOKIE_KEY = "scatydeo_v2_seen";

const Index = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const isMobile = useIsMobile();
  const { language } = useLanguage();
  const isTr = language === "tr";

  // First visit → redirect to /v2
  if (!localStorage.getItem(COOKIE_KEY)) {
    return <Navigate to="/v2" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)} />
      {!isMobile && <Sidebar collapsed={sidebarCollapsed} />}
      <main
        className={cn(
          "pt-14 transition-all duration-200 min-h-screen",
          isMobile ? "ml-0 pb-16" : sidebarCollapsed ? "ml-[72px]" : "ml-56"
        )}
      >
        <div className="p-4 md:p-6">
          <Link
            to="/news"
            className="flex items-center gap-3 p-4 mb-5 rounded-xl border border-primary/30 bg-gradient-to-r from-primary/15 to-purple-500/10 hover:from-primary/25 hover:to-purple-500/20 transition-colors"
          >
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
              <Newspaper className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">{isTr ? "Haberler" : "News"}</p>
              <p className="text-xs text-muted-foreground truncate">
                {isTr
                  ? "Scatydeo güncellemelerini ve duyuruları gör"
                  : "See Scatydeo updates and announcements"}
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </Link>
          <VideoGrid />
        </div>
      </main>
      {isMobile && <BottomNav />}
    </div>
  );
};

export default Index;
