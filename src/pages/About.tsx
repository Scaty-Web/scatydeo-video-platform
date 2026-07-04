import { useLanguage } from "@/hooks/useLanguage";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import BottomNav from "@/components/BottomNav";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState } from "react";
import { Video, Shield, Globe, ListVideo, Users, Eye, ThumbsUp, MessageSquare, Bell, Upload } from "lucide-react";

const features = {
  tr: [
    { icon: Video, title: "Video Yükleme & İzleme", desc: "Videolarınızı yükleyin ve diğer kullanıcıların içeriklerini keşfedin." },
    { icon: Shield, title: "Güvenli Moderasyon", desc: "Moderatör ve admin rolleriyle içerik denetimi ve kullanıcı yönetimi." },
    { icon: Globe, title: "Çoklu Dil Desteği", desc: "Türkçe ve İngilizce dil seçenekleriyle kullanım kolaylığı." },
    { icon: ListVideo, title: "Oynatma Listeleri", desc: "Kendi oynatma listelerinizi oluşturun ve videolarınızı düzenleyin." },
    { icon: Users, title: "Kanal Aboneliği", desc: "Sevdiğiniz kanallara abone olun ve içeriklerini takip edin." },
    { icon: Eye, title: "Trendler", desc: "10+ izlenmeye ulaşan popüler videoları keşfedin." },
    { icon: ThumbsUp, title: "Beğeni Sistemi", desc: "Videoları beğenin ve beğeni sayılarını takip edin." },
    { icon: MessageSquare, title: "Yorumlar", desc: "Videolara yorum yapın ve diğer kullanıcılarla etkileşime geçin." },
    { icon: Bell, title: "Bildirimler", desc: "Beğeni, yorum ve abonelik bildirimlerini alın." },
    { icon: Upload, title: "Kolay Yükleme", desc: "Sürükle-bırak ile hızlı ve kolay video yükleme." },
  ],
  en: [
    { icon: Video, title: "Video Upload & Watch", desc: "Upload your videos and discover content from other users." },
    { icon: Shield, title: "Secure Moderation", desc: "Content moderation and user management with moderator and admin roles." },
    { icon: Globe, title: "Multi-Language Support", desc: "Easy to use with Turkish and English language options." },
    { icon: ListVideo, title: "Playlists", desc: "Create your own playlists and organize your videos." },
    { icon: Users, title: "Channel Subscriptions", desc: "Subscribe to your favorite channels and follow their content." },
    { icon: Eye, title: "Trending", desc: "Discover popular videos that have reached 10+ views." },
    { icon: ThumbsUp, title: "Like System", desc: "Like videos and track like counts." },
    { icon: MessageSquare, title: "Comments", desc: "Comment on videos and interact with other users." },
    { icon: Bell, title: "Notifications", desc: "Receive notifications for likes, comments, and subscriptions." },
    { icon: Upload, title: "Easy Upload", desc: "Quick and easy video upload with drag-and-drop." },
  ],
};

const About = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { language } = useLanguage();
  const isMobile = useIsMobile();
  const featureList = language === "tr" ? features.tr : features.en;

  return (
    <div className="min-h-screen bg-background">
      <Navbar onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)} />
      {!isMobile && <Sidebar collapsed={sidebarCollapsed} />}
      <main
        className={cn(
          "pt-[var(--nav-h,3.5rem)] transition-all duration-200 min-h-screen",
          isMobile ? "ml-0 pb-16" : sidebarCollapsed ? "ml-[72px]" : "ml-56"
        )}
      >
        <div className="p-4 md:p-8 max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-10">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              {language === "tr" ? "Scatydeo Hakkında" : "About Scatydeo"}
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              {language === "tr"
                ? "Scatydeo, 2026'da SWO (Scaty Web Organizasyon) tarafından yapılan bir Türk video platformudur. Lovable kullanılarak geliştirilmiştir."
                : "Scatydeo is a Turkish video platform made by SWO (Scaty Web Organization) in 2026. It is built using Lovable."}
            </p>
          </div>

          {/* Features */}
          <div className="mb-10">
            <h2 className="text-xl font-semibold text-foreground mb-6">
              {language === "tr" ? "Özellikler" : "Features"}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {featureList.map((feature, i) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={i}
                    className="flex gap-4 p-4 rounded-xl border border-border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground text-sm">{feature.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1">{feature.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer info */}
          <div className="text-center text-sm text-muted-foreground border-t border-border pt-6">
            <p>©2026 Scaty Web ORG. {language === "tr" ? "Tüm hakları saklıdır." : "All rights reserved."}</p>
          </div>
        </div>
      </main>
      {isMobile && <BottomNav />}
    </div>
  );
};

export default About;
