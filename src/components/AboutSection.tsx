import { Sparkles, Zap, Shield, Globe } from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "Ultra Hızlı",
    description: "Anında yüklenen videolar ile kesintisiz izleme deneyimi"
  },
  {
    icon: Shield,
    title: "Güvenli",
    description: "Verileriniz en üst düzey güvenlik protokolleri ile korunur"
  },
  {
    icon: Globe,
    title: "Küresel",
    description: "Dünyanın her yerinden erişilebilir içerik ağı"
  },
  {
    icon: Sparkles,
    title: "Yenilikçi",
    description: "En son teknolojiler ile benzersiz deneyim"
  },
];

const AboutSection = () => {
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
              <span className="glow-text">Scatydeo</span> Nedir?
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
              Scatydeo, <span className="text-primary font-semibold">Scaty Web ORG</span>'un 
              yaptığı resmi bir scaty video platformudur. Lovable'yi kullanmaktadır ve 
              <span className="text-primary font-semibold"> 2026</span>'da kurulmuştur.
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
                <p className="text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>

          {/* Mission Statement */}
          <div className="mt-16 p-8 rounded-2xl gradient-border">
            <div className="text-center">
              <h3 className="font-display text-2xl font-bold mb-4">Misyonumuz</h3>
              <p className="text-muted-foreground leading-relaxed">
                Kullanıcılarımıza en iyi video izleme deneyimini sunmak, 
                içerik üreticilerine güçlü araçlar sağlamak ve dijital 
                içerik dünyasında yenilikçi çözümler üretmek.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
