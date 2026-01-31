import { useLanguage } from "@/hooks/useLanguage";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Shield, AlertTriangle, CheckCircle, XCircle, Scale } from "lucide-react";

const Rules = () => {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <Shield className="w-16 h-16 text-primary mx-auto mb-4" />
            <h1 className="text-4xl font-bold mb-4">
              <span className="glow-text">{t.rules.title}</span> {t.rules.titleHighlight}
            </h1>
            <p className="text-muted-foreground text-lg">
              {t.rules.subtitle}
            </p>
          </div>

          {/* Rules Sections */}
          <div className="space-y-8">
            {/* Allowed */}
            <div className="glass-card p-6 rounded-xl">
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle className="w-6 h-6 text-green-500" />
                <h2 className="text-2xl font-bold text-green-500">{t.rules.allowed}</h2>
              </div>
              <ul className="space-y-3 text-muted-foreground">
                {t.rules.allowedItems.map((item, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-green-500 mt-1">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Not Allowed */}
            <div className="glass-card p-6 rounded-xl">
              <div className="flex items-center gap-3 mb-4">
                <XCircle className="w-6 h-6 text-red-500" />
                <h2 className="text-2xl font-bold text-red-500">{t.rules.notAllowed}</h2>
              </div>
              <ul className="space-y-3 text-muted-foreground">
                {t.rules.notAllowedItems.map((item, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-red-500 mt-1">✗</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Warnings */}
            <div className="glass-card p-6 rounded-xl border-yellow-500/30">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="w-6 h-6 text-yellow-500" />
                <h2 className="text-2xl font-bold text-yellow-500">{t.rules.warnings}</h2>
              </div>
              <div className="space-y-4 text-muted-foreground">
                <p>{t.rules.warningsDesc}</p>
                <ul className="space-y-2">
                  <li>• <strong>{t.rules.violation1}</strong> {t.rules.violation1Action}</li>
                  <li>• <strong>{t.rules.violation2}</strong> {t.rules.violation2Action}</li>
                  <li>• <strong>{t.rules.violation3}</strong> {t.rules.violation3Action}</li>
                  <li>• <strong>{t.rules.severeViolation}</strong> {t.rules.severeViolationAction}</li>
                </ul>
              </div>
            </div>

            {/* Terms */}
            <div className="glass-card p-6 rounded-xl">
              <div className="flex items-center gap-3 mb-4">
                <Scale className="w-6 h-6 text-primary" />
                <h2 className="text-2xl font-bold">{t.rules.terms}</h2>
              </div>
              <div className="space-y-4 text-muted-foreground">
                <p>{t.rules.termsDesc}</p>
                <ul className="space-y-2">
                  {t.rules.termsItems.map((item, index) => (
                    <li key={index}>• {item}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Contact */}
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {t.rules.contactText}{" "}
                <a className="text-primary hover:underline" href="mailto:a8112146@gmail.com">a8112146@gmail.com</a>{" "}
                {t.rules.contactEmail}
              </p>
              <p className="text-sm text-muted-foreground/70 mt-4">
                {t.rules.lastUpdated} January 2026
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
