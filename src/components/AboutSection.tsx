import { Sparkles, Zap, Shield, Globe, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";

const AboutSection = () => {
  const { t } = useLanguage();
  
  const features = [
    {
      icon: Zap,
      title: t.about.features.fast.title,
      description: t.about.features.fast.description,
    },
    {
      icon: Shield,
      title: t.about.features.secure.title,
      description: t.about.features.secure.description,
    },
    {
      icon: Globe,
      title: t.about.features.global.title,
      description: t.about.features.global.description,
    },
    {
      icon: Sparkles,
      title: t.about.features.innovative.title,
      description: t.about.features.innovative.description,
    },
  ];

  return (
    <section id="about" className="py-20 relative">
      {/* Glow Effects */}
      <div className="absolute top-1/2 left-0 w-64 h-64 bg-primary/10 rounded-full blur-[100px]" />
      <div className="absolute top-1/2 right-0 w-64 h-64 bg-accent/10 rounded-full blur-[100px]" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl md:text-5xl font-bold mb-6">
              <span className="glow-text">Scatydeo</span> {t.about.title}?
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
              {t.about.description}
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group p-6 rounded-2xl bg-card border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-glow animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-display text-xl font-semibold mb-2 group-hover:text-primary transition-colors">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>

          {/* Platform Box */}
          <div className="mt-16 p-8 rounded-2xl gradient-border">
            <div className="text-center">
              <h3 className="font-display text-2xl font-bold mb-4">{t.about.ourApp}</h3>
              <p className="text-muted-foreground leading-relaxed mb-6">{t.about.downloadApp}</p>
              <Button
                variant="glow"
                size="lg"
                className="gap-2"
                onClick={() => window.open('https://scaty-web.github.io/Scatydeo-App/', '_blank')}
              >
                <Smartphone className="w-5 h-5" />
                Scatydeo App
              </Button>
            </div>
          </div>

          {/* Mission Statement */}
          <div className="mt-8 p-8 rounded-2xl gradient-border">
            <div className="text-center">
              <h3 className="font-display text-2xl font-bold mb-4">{t.about.mission}</h3>
              <p className="text-muted-foreground leading-relaxed">{t.about.missionDesc}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
