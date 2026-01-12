import { Play, Heart } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-card border-t border-border">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-glow">
                <Play className="w-5 h-5 text-primary-foreground fill-current" />
              </div>
              <span className="font-display text-xl font-bold glow-text">Scatydeo</span>
            </div>
            <p className="text-muted-foreground max-w-sm">
              Scaty Web ORG tarafından geliştirilen yeni nesil video platformu.
              Sınırsız içerik, benzersiz deneyim.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-display font-semibold mb-4">Platform</h4>
            <ul className="space-y-2 text-muted-foreground">
              <li><a href="#" className="hover:text-primary transition-colors">Ana Sayfa</a></li>
              <li><a href="#videos" className="hover:text-primary transition-colors">Videolar</a></li>
              <li><a href="#about" className="hover:text-primary transition-colors">Hakkında</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">İletişim</a></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-display font-semibold mb-4">Yasal</h4>
            <ul className="space-y-2 text-muted-foreground">
              <li><a href="#" className="hover:text-primary transition-colors">Kullanım Şartları</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Gizlilik Politikası</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Çerez Politikası</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">KVKK</a></li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

        {/* Bottom */}
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-muted-foreground text-sm">
            ©2026 Scaty Web ORG. Tüm hakları saklıdır.
          </p>
          <p className="text-muted-foreground text-sm flex items-center gap-1">
            <Heart className="w-4 h-4 text-primary" /> ile yapılmıştır
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
