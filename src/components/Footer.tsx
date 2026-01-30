import { Play, Heart } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";

const Footer = () => {
  const { t } = useLanguage();

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
              {t.footer.description}
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-display font-semibold mb-4">{t.footer.platform}</h4>
            <ul className="space-y-2 text-muted-foreground">
              <li><a href="#" className="hover:text-primary transition-colors">{t.footer.home}</a></li>
              <li><a href="#videos" className="hover:text-primary transition-colors">{t.footer.videos}</a></li>
              <li><a href="#about" className="hover:text-primary transition-colors">{t.footer.about}</a></li>
              <li><a href="mailto:a8112146@gmail.com" className="hover:text-primary transition-colors">{t.footer.contact}</a></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-display font-semibold mb-4">{t.footer.legal}</h4>
            <ul className="space-y-2 text-muted-foreground">
              <li><a href="#" className="hover:text-primary transition-colors">{t.footer.terms}</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">{t.footer.privacy}</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">{t.footer.cookies}</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">{t.footer.kvkk}</a></li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

        {/* Bottom */}
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-muted-foreground text-sm">
            ©2026 Scaty Web ORG. {t.footer.copyright}
          </p>
          <p className="text-muted-foreground text-sm flex items-center gap-1">
            <Heart className="w-4 h-4 text-primary" /> {t.footer.madeWith}
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
