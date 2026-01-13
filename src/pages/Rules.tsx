import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Shield, AlertTriangle, CheckCircle, XCircle, Scale } from "lucide-react";

const Rules = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <Shield className="w-16 h-16 text-primary mx-auto mb-4" />
            <h1 className="text-4xl font-bold mb-4">
              <span className="glow-text">Topluluk</span> Kuralları
            </h1>
            <p className="text-muted-foreground text-lg">
              Scatydeo'yu herkes için güvenli ve keyifli bir platform haline getirmek için bu kurallara uyun.
            </p>
          </div>

          {/* Rules Sections */}
          <div className="space-y-8">
            {/* Allowed */}
            <div className="glass-card p-6 rounded-xl">
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle className="w-6 h-6 text-green-500" />
                <h2 className="text-2xl font-bold text-green-500">İzin Verilenler</h2>
              </div>
              <ul className="space-y-3 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  Orijinal ve yaratıcı içerikler paylaşmak
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  Yapıcı yorumlar ve geri bildirimler vermek
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  Eğitici ve bilgilendirici içerikler oluşturmak
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  Diğer kullanıcılarla saygılı bir şekilde etkileşime geçmek
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  Telif hakkı size ait olan içerikleri paylaşmak
                </li>
              </ul>
            </div>

            {/* Not Allowed */}
            <div className="glass-card p-6 rounded-xl">
              <div className="flex items-center gap-3 mb-4">
                <XCircle className="w-6 h-6 text-red-500" />
                <h2 className="text-2xl font-bold text-red-500">Yasak İçerikler</h2>
              </div>
              <ul className="space-y-3 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-1">✗</span>
                  Nefret söylemi, ayrımcılık veya taciz içeren içerikler
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-1">✗</span>
                  Şiddet, tehdit veya zararlı davranışları teşvik eden içerikler
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-1">✗</span>
                  Telif hakkı ihlali içeren içerikler
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-1">✗</span>
                  Spam, yanıltıcı veya aldatıcı içerikler
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-1">✗</span>
                  Kişisel bilgileri izinsiz paylaşmak
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-1">✗</span>
                  Yetişkin veya uygunsuz içerikler
                </li>
              </ul>
            </div>

            {/* Warnings */}
            <div className="glass-card p-6 rounded-xl border-yellow-500/30">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="w-6 h-6 text-yellow-500" />
                <h2 className="text-2xl font-bold text-yellow-500">Uyarılar ve Yaptırımlar</h2>
              </div>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  Kuralları ihlal eden kullanıcılar aşağıdaki yaptırımlarla karşılaşabilir:
                </p>
                <ul className="space-y-2">
                  <li>• <strong>1. İhlal:</strong> Uyarı</li>
                  <li>• <strong>2. İhlal:</strong> Geçici içerik yükleme yasağı (7 gün)</li>
                  <li>• <strong>3. İhlal:</strong> Geçici hesap askıya alma (30 gün)</li>
                  <li>• <strong>Ağır İhlaller:</strong> Kalıcı hesap kapatma</li>
                </ul>
              </div>
            </div>

            {/* Terms */}
            <div className="glass-card p-6 rounded-xl">
              <div className="flex items-center gap-3 mb-4">
                <Scale className="w-6 h-6 text-primary" />
                <h2 className="text-2xl font-bold">Kullanım Koşulları</h2>
              </div>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  Scatydeo'yu kullanarak aşağıdaki koşulları kabul etmiş olursunuz:
                </p>
                <ul className="space-y-2">
                  <li>• Hesabınızın güvenliğinden siz sorumlusunuz</li>
                  <li>• Yüklediğiniz tüm içeriklerden siz sorumlusunuz</li>
                  <li>• Platform kurallarına uymayı taahhüt edersiniz</li>
                  <li>• Scatydeo, herhangi bir içeriği kaldırma hakkını saklı tutar</li>
                </ul>
              </div>
            </div>

            {/* Contact */}
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                Sorularınız veya şikayetleriniz için{" "}
                <a href="mailto:destek@scatydeo.com" className="text-primary hover:underline">
                  destek@scatydeo.com
                </a>{" "}
                adresinden bize ulaşabilirsiniz.
              </p>
              <p className="text-sm text-muted-foreground/70 mt-4">
                Son güncelleme: Ocak 2026
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Rules;
