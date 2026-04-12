import { useState } from "react";
import { Navigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import BottomNav from "@/components/BottomNav";
import VideoGrid from "@/components/VideoGrid";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

const COOKIE_KEY = "scatydeo_v2_seen";

const Index = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const isMobile = useIsMobile();

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
          <VideoGrid />
        </div>
      </main>
      {isMobile && <BottomNav />}
    </div>
  );
};

export default Index;
