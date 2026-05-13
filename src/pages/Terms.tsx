import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const Terms = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 backdrop-blur-xl bg-background/80 border-b border-border/50 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Go back">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-bold text-foreground">Terms of Service</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-6 space-y-6 text-sm text-foreground/90 leading-relaxed">
        <p className="text-muted-foreground">Last updated: March 8, 2026</p>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">1. Acceptance of Terms</h2>
          <p>By accessing or using AgroEye ("the App"), you agree to be bound by these Terms of Service. If you do not agree, please do not use the App.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">2. Description of Service</h2>
          <p>AgroEye is a smart agricultural monitoring application that helps farmers track soil moisture, fertility levels, manage irrigation schedules, detect plant diseases, and optimize crop yields through data-driven insights.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">3. User Accounts</h2>
          <p>You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account. You must provide accurate information during registration.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">4. Acceptable Use</h2>
          <p>You agree not to misuse the App, interfere with its operation, attempt unauthorized access, or use it for any unlawful purpose.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">5. Data & Sensor Readings</h2>
          <p>The App provides data and recommendations for informational purposes only. Agricultural decisions should be made using professional judgment. AgroEye does not guarantee the accuracy of sensor data, AI predictions, or pest detection results.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">6. Intellectual Property</h2>
          <p>All content, features, and functionality of the App are owned by AgroEye and are protected by applicable intellectual property laws.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">7. Limitation of Liability</h2>
          <p>AgroEye shall not be liable for any indirect, incidental, or consequential damages arising from your use of the App, including crop losses based on recommendations or predictions.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">8. Termination</h2>
          <p>We may suspend or terminate your account if you violate these terms. You may delete your account at any time through the Profile settings.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">9. Changes to Terms</h2>
          <p>We reserve the right to modify these terms at any time. Continued use of the App after changes constitutes acceptance of the new terms.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">10. Contact</h2>
          <p>For questions about these Terms, please contact us through the App's support channels.</p>
        </section>
      </main>
    </div>
  );
};

export default Terms;
