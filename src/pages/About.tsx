import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Sprout, Heart, Shield, Globe, Zap, Users, Leaf, Eye, Mail } from "lucide-react";
import { motion } from "framer-motion";

const features = [
  { icon: Eye, title: "Smart Monitoring", desc: "Real-time soil moisture, fertility, and weather tracking" },
  { icon: Leaf, title: "Crop Intelligence", desc: "AI-powered pest detection and yield predictions" },
  { icon: Zap, title: "Automated Irrigation", desc: "Smart scheduling and pump control for optimal watering" },
  { icon: Globe, title: "Multilingual", desc: "Available in 10+ languages for farmers worldwide" },
  { icon: Shield, title: "Secure & Private", desc: "Row-level security protects your farm data" },
  { icon: Users, title: "Community", desc: "Leaderboards and achievements to gamify farming" },
];

const timeline = [
  { version: "2.0.0", date: "March 2026", highlights: "Native mobile app, AI chat assistant, farm mapping, disease history" },
  { version: "1.5.0", date: "January 2026", highlights: "Pest detection with AI, yield prediction, crop comparison tool" },
  { version: "1.2.0", date: "November 2025", highlights: "Smart irrigation engine, sensor integration, QR pairing" },
  { version: "1.0.0", date: "September 2025", highlights: "Initial release with moisture tracking, fertility monitoring, scheduling" },
];

const About = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 backdrop-blur-xl bg-background/80 border-b border-border/50 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Go back">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-bold text-foreground">About AgroEye</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-6 space-y-8 pb-20">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-4 py-4"
        >
          <div className="w-20 h-20 rounded-[24px] bg-primary/15 flex items-center justify-center mx-auto shadow-lg shadow-primary/10 border border-primary/10">
            <Sprout className="w-10 h-10 text-primary" strokeWidth={1.8} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">AgroEye</h2>
            <p className="text-sm text-muted-foreground mt-1">Smart Farming, Simplified</p>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
            AgroEye empowers farmers with AI-driven insights, real-time sensor data, and intelligent automation to maximize crop yields and conserve resources.
          </p>
        </motion.div>

        {/* Mission */}
        <Card className="glass-card overflow-hidden">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Our Mission</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              To democratize precision agriculture by making advanced farming technology accessible to every farmer — from smallholders to large operations. We believe that data-driven farming can feed the world sustainably while preserving our planet's resources.
            </p>
          </CardContent>
        </Card>

        {/* Features Grid */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground px-1">What AgroEye Does</h3>
          <div className="grid grid-cols-2 gap-3">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
              >
                <Card className="glass-card h-full">
                  <CardContent className="p-4 space-y-2">
                    <f.icon className="w-5 h-5 text-primary" />
                    <h4 className="text-xs font-semibold text-foreground">{f.title}</h4>
                    <p className="text-[11px] text-muted-foreground leading-snug">{f.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Version History */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground px-1">Version History</h3>
          <div className="space-y-1">
            {timeline.map((entry, i) => (
              <div key={entry.version} className="flex gap-3 p-3 rounded-xl hover:bg-accent/30 transition-colors">
                <div className="flex flex-col items-center">
                  <div className={`w-2.5 h-2.5 rounded-full ${i === 0 ? "bg-primary" : "bg-muted-foreground/30"}`} />
                  {i < timeline.length - 1 && <div className="w-px flex-1 bg-border/50 mt-1" />}
                </div>
                <div className="flex-1 min-w-0 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">v{entry.version}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground">{entry.date}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{entry.highlights}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tech Stack */}
        <Card className="glass-card">
          <CardContent className="p-5 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Built With</h3>
            <div className="flex flex-wrap gap-1.5">
              {["React", "TypeScript", "Vite", "Tailwind CSS", "Capacitor", "Framer Motion", "Recharts", "Leaflet", "i18next"].map((tech) => (
                <span key={tech} className="text-[11px] px-2 py-1 rounded-lg bg-muted text-muted-foreground font-medium">
                  {tech}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Contact */}
        <Card className="glass-card">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Get in Touch</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Have feedback, feature requests, or need support? We'd love to hear from you.
            </p>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" size="sm" className="text-xs" onClick={() => navigate("/terms")}>
                Terms
              </Button>
              <Button variant="outline" size="sm" className="text-xs" onClick={() => navigate("/privacy")}>
                Privacy
              </Button>
              <Button variant="outline" size="sm" className="text-xs" onClick={() => navigate("/licenses")}>
                Licenses
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-[11px] text-muted-foreground/60 pt-4">
          © 2025–2026 AgroEye. All rights reserved. Made with 💚 for farmers.
        </p>
      </main>
    </div>
  );
};

export default About;
