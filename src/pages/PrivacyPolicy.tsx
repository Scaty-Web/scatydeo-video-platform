import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useLanguage } from "@/hooks/useLanguage";
import { Shield, Lock, Eye, Database, UserCheck, Mail } from "lucide-react";

const PrivacyPolicy = () => {
  const { language } = useLanguage();

  const content = language === "tr" ? {
    title: "Gizlilik Politikası",
    lastUpdated: "Son güncelleme: Ocak 2026",
    intro: "Scatydeo olarak gizliliğinize önem veriyoruz. Bu politika, kişisel verilerinizi nasıl topladığımızı, kullandığımızı ve koruduğumuzu açıklar.",
    sections: [
      {
        icon: Database,
        title: "Toplanan Veriler",
        items: [
          "Hesap oluşturma sırasında e-posta adresi ve kullanıcı adı",
          "Profil bilgileri (görünen ad, avatar, biyografi)",
        ],
      },
      {
        icon: Eye,
        title: "Verilerin Kullanımı",
        items: [
          "Hesap yönetimi ve kimlik doğrulama",
          "Platform deneyimini kişiselleştirme",
          "İçerik önerileri sunma",
          "Platform güvenliğini sağlama",
          "Yasal yükümlülükleri yerine getirme",
        ],
      },
      {
        icon: Lock,
        title: "Veri Güvenliği",
        items: [
          "Toplanan veriler şifrelenir ve gizli/özel veritabanında saklanır ve bakılmaz",
          "Erişim kontrolleri ile verileriniz güvende",
          "Üçüncü taraflarla izinsiz veri paylaşımı yapılmaz",
        ],
      },
      {
        icon: UserCheck,
        title: "Haklarınız",
        items: [
          "Verilerinize erişim talep edebilirsiniz",
          "Verilerinizin düzeltilmesini isteyebilirsiniz",
          "Hesabınızı ve verilerinizi silebilirsiniz",
          "Veri işleme faaliyetlerine itiraz edebilirsiniz",
        ],
      },
    ],
    contact: "Gizlilik ile ilgili sorularınız için bize ulaşın:",
  } : {
    title: "Privacy Policy",
    lastUpdated: "Last updated: January 2026",
    intro: "At Scatydeo, we value your privacy. This policy explains how we collect, use, and protect your personal data.",
    sections: [
      {
        icon: Database,
        title: "Data Collected",
        items: [
          "Email address and username during account creation",
          "Profile information (display name, avatar, bio)",
        ],
      },
      {
        icon: Eye,
        title: "Use of Data",
        items: [
          "Account management and authentication",
          "Personalizing platform experience",
          "Providing content recommendations",
          "Ensuring platform security",
          "Fulfilling legal obligations",
        ],
      },
      {
        icon: Lock,
        title: "Data Security",
        items: [
          "Collected data is encrypted and stored in a private/secure database and is not accessed",
          "Your data is secured with access controls",
          "No unauthorized sharing of data with third parties",
        ],
      },
      {
        icon: UserCheck,
        title: "Your Rights",
        items: [
          "You can request access to your data",
          "You can request correction of your data",
          "You can delete your account and data",
          "You can object to data processing activities",
        ],
      },
    ],
    contact: "For privacy-related questions, contact us at:",
  };

  return (
    <div className="md2-scope min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <Shield className="w-16 h-16 text-primary mx-auto mb-4" />
            <h1 className="text-4xl font-bold mb-2">{content.title}</h1>
            <p className="text-muted-foreground">{content.lastUpdated}</p>
          </div>

          <div className="glass-card p-6 rounded-xl mb-8">
            <p className="text-muted-foreground text-lg">{content.intro}</p>
          </div>

          <div className="space-y-8">
            {content.sections.map((section, i) => {
              const Icon = section.icon;
              return (
                <div key={i} className="glass-card p-6 rounded-xl">
                  <div className="flex items-center gap-3 mb-4">
                    <Icon className="w-6 h-6 text-primary" />
                    <h2 className="text-2xl font-bold">{section.title}</h2>
                  </div>
                  <ul className="space-y-3 text-muted-foreground">
                    {section.items.map((item, j) => (
                      <li key={j} className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

          <div className="text-center py-8">
            <p className="text-muted-foreground">
              {content.contact}{" "}
              <a className="text-primary hover:underline" href="mailto:a8112146@gmail.com">
                a8112146@gmail.com
              </a>
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PrivacyPolicy;
