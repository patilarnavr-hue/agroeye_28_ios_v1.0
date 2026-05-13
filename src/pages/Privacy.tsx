import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const Privacy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 backdrop-blur-xl bg-background/80 border-b border-border/50 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Go back">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-bold text-foreground">Privacy Policy</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-6 space-y-6 text-sm text-foreground/90 leading-relaxed">
        <p className="text-muted-foreground">Last updated: March 8, 2026</p>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">1. Information We Collect</h2>
          <p>We collect information you provide directly: name, email address, phone number, location, and farm-related data (soil readings, crop information, sensor data). We also collect usage data and device information to improve the App.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">2. How We Use Your Information</h2>
          <p>Your data is used to provide agricultural monitoring services, generate AI-powered recommendations, send notifications about your crops, and improve the App's features. We do not sell your personal data to third parties.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">3. Data Storage & Security</h2>
          <p>Your data is securely stored with encryption at rest and in transit. We use row-level security to ensure you can only access your own data. Biometric data used for authentication is processed locally on your device and never transmitted to our servers.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">4. Sensor & Location Data</h2>
          <p>If you connect sensors or share your location, this data is used solely for providing agricultural insights and is associated with your account. You can disconnect sensors and remove location data at any time.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">5. Image Data</h2>
          <p>Images uploaded for pest/disease detection are processed to provide diagnostic results. Images are stored securely in your account and are not shared with other users.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">6. Third-Party Services</h2>
          <p>We use weather data providers and AI services to enhance our recommendations. These services receive only the minimum data necessary (e.g., location for weather) and are bound by their own privacy policies.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">7. Your Rights</h2>
          <p>You have the right to access, export, correct, and delete your personal data. Use the Profile settings to export all your data or delete your account. Upon account deletion, all associated data will be permanently removed.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">8. Notifications</h2>
          <p>With your permission, we send push notifications about moisture alerts, watering schedules, and pest detections. You can customize or disable notifications in your Profile settings.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">9. Offline Data</h2>
          <p>The App may store data locally for offline use. This data is synced with our servers when connectivity is restored and follows the same security standards.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">10. Contact</h2>
          <p>For privacy-related questions or to exercise your data rights, please contact us through the App's support channels.</p>
        </section>
      </main>
    </div>
  );
};

export default Privacy;
