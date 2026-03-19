import { useState } from "react";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import VideoGrid from "@/components/VideoGrid";
import { cn } from "@/lib/utils";

const Index = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Navbar onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)} />
      <Sidebar collapsed={sidebarCollapsed} />
      <main
        className={cn(
          "pt-14 transition-all duration-200 min-h-screen",
          sidebarCollapsed ? "ml-[72px]" : "ml-56"
        )}
      >
        <div className="p-6">
          <VideoGrid />
        </div>
      </main>
    </div>
  );
};

export default Index;
