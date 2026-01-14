import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { useBanCheck } from "@/hooks/useBanCheck";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Watch from "./pages/Watch";
import Channel from "./pages/Channel";
import Settings from "./pages/Settings";
import Notifications from "./pages/Notifications";
import Rules from "./pages/Rules";
import Upload from "./pages/Upload";
import ModeratorPanel from "./pages/ModeratorPanel";
import Banned from "./pages/Banned";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppRoutes = () => {
  const { isBanned, loading } = useBanCheck();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isBanned) {
    return <Banned />;
  }

  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/watch/:id" element={<Watch />} />
      <Route path="/channel/:username" element={<Channel />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/notifications" element={<Notifications />} />
      <Route path="/rules" element={<Rules />} />
      <Route path="/upload" element={<Upload />} />
      <Route path="/moderator" element={<ModeratorPanel />} />
      <Route path="/banned" element={<Banned />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
